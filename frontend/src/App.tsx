import { useState } from 'react'
import { generateTests, connectToJira, getJiraProjects, getJiraStoriesByProjects, exportTestResults } from './api'
import { GenerateRequest, GenerateResponse, TestCase, JiraConnectionRequest, JiraStory } from './types'

function App() {
  // Test Generation State
  const [formData, setFormData] = useState<GenerateRequest>({
    storyTitle: '',
    acceptanceCriteria: '',
    description: '',
    additionalInfo: ''
  })
  const [results, setResults] = useState<GenerateResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedTestCases, setExpandedTestCases] = useState<Set<string>>(new Set())

  // Jira State
  const [showJiraModal, setShowJiraModal] = useState<boolean>(false)
  const [jiraConnected, setJiraConnected] = useState<boolean>(false)
  const [jiraStories, setJiraStories] = useState<JiraStory[]>([])
  const [jiraProjects, setJiraProjects] = useState<Array<{ key: string; name: string }>>([])
  const [connectedProject, setConnectedProject] = useState<{ name: string; key: string } | null>(null)
  const [selectedStory, setSelectedStory] = useState<JiraStory | null>(null)
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  const [jiraFormData, setJiraFormData] = useState<JiraConnectionRequest>({
    baseUrl: '',
    apiKey: '',
    email: ''
  })
  const [jiraLoading, setJiraLoading] = useState<boolean>(false)
  const [jiraError, setJiraError] = useState<string | null>(null)

  // Export State
  const [exportingFormat, setExportingFormat] = useState<string | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)

  // Filter stories based on selected projects
  const filteredStories = selectedProjects.size === 0 
    ? jiraStories 
    : jiraStories.filter(story => selectedProjects.has(story.projectKey))

  const toggleTestCaseExpansion = (testCaseId: string) => {
    const newExpanded = new Set(expandedTestCases)
    if (newExpanded.has(testCaseId)) {
      newExpanded.delete(testCaseId)
    } else {
      newExpanded.add(testCaseId)
    }
    setExpandedTestCases(newExpanded)
  }

  const handleInputChange = (field: keyof GenerateRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleJiraInputChange = (field: keyof JiraConnectionRequest, value: string) => {
    setJiraFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleProjectToggle = (projectKey: string) => {
    const newSet = new Set(selectedProjects)
    if (newSet.has(projectKey)) {
      newSet.delete(projectKey)
    } else {
      newSet.add(projectKey)
    }
    handleProjectsChange(Array.from(newSet))
  }

  const handleProjectsChange = async (projectKeys: string[]) => {
    setSelectedProjects(new Set(projectKeys))
    setSelectedStory(null)
    
    if (projectKeys.length > 0) {
      try {
        const storiesResponse = await getJiraStoriesByProjects(jiraFormData, projectKeys)
        setJiraStories(storiesResponse.stories || [])
      } catch (err) {
        setJiraError(err instanceof Error ? err.message : 'Failed to fetch stories')
      }
    } else {
      setJiraStories([])
    }
  }

  const handleJiraConnect = async (e: React.FormEvent) => {
    e.preventDefault()
    setJiraLoading(true)
    setJiraError(null)

    try {
      if (!jiraFormData.baseUrl.trim() || !jiraFormData.apiKey.trim() || !jiraFormData.email.trim()) {
        throw new Error('All fields are required')
      }

      const connectionResponse = await connectToJira(jiraFormData)
      
      if (!connectionResponse.success) {
        throw new Error(connectionResponse.message)
      }

      // Get projects
      const projectsResponse = await getJiraProjects(jiraFormData)
      
      setJiraConnected(true)
      setConnectedProject(connectionResponse.project || null)
      setJiraProjects(projectsResponse.projects)
      setShowJiraModal(false)
    } catch (err) {
      setJiraError(err instanceof Error ? err.message : 'Failed to connect to Jira')
    } finally {
      setJiraLoading(false)
    }
  }

  const handleSelectStory = (story: JiraStory) => {
    setSelectedStory(story)
  }

  const handleLinkStory = () => {
    if (!selectedStory) {
      setJiraError('Please select a story first')
      return
    }
    
    setFormData({
      storyTitle: selectedStory.summary,
      acceptanceCriteria: selectedStory.acceptanceCriteria || '',
      description: selectedStory.description || '',
      additionalInfo: `Jira ID: ${selectedStory.key}`
    })
    setJiraError(null)
  }

  const handleDisconnect = () => {
    setJiraConnected(false)
    setJiraStories([])
    setJiraProjects([])
    setConnectedProject(null)
    setSelectedStory(null)
    setSelectedProjects(new Set())
    setFormData({
      storyTitle: '',
      acceptanceCriteria: '',
      description: '',
      additionalInfo: ''
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.storyTitle.trim() || !formData.acceptanceCriteria.trim()) {
      setError('Story Title and Acceptance Criteria are required')
      return
    }

    setIsLoading(true)
    setError(null)
    
    try {
      const response = await generateTests(formData)
      setResults(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tests')
    } finally {
      setIsLoading(false)
    }
  }

  const handleExport = async (format: 'csv' | 'xlsx' | 'pdf') => {
    if (!results) {
      setExportError('No test cases to export')
      return
    }

    setExportingFormat(format)
    setExportError(null)

    try {
      await exportTestResults(
        formData.storyTitle,
        formData.acceptanceCriteria,
        formData.description || undefined,
        results.cases,
        format
      )
    } catch (err) {
      setExportError(err instanceof Error ? err.message : `Failed to export as ${format.toUpperCase()}`)
    } finally {
      setExportingFormat(null)
    }
  }

  return (
    <div>
      <style>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
        
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
          background-color: #f5f5f5;
          color: #333;
          line-height: 1.6;
        }
        
        .container {
          max-width: 95%;
          width: 100%;
          margin: 0 auto;
          padding: 20px;
          min-height: 100vh;
        }
        
        @media (min-width: 768px) {
          .container {
            max-width: 90%;
            padding: 30px;
          }
        }
        
        @media (min-width: 1024px) {
          .container {
            max-width: 85%;
            padding: 40px;
          }
        }
        
        @media (min-width: 1440px) {
          .container {
            max-width: 1800px;
            padding: 50px;
          }
        }
        
        .header {
          text-align: center;
          margin-bottom: 40px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        
        .header-title-section {
          flex: 1;
        }
        
        .title {
          font-size: 2.5rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .subtitle {
          color: #666;
          font-size: 1.1rem;
        }
        
        .header-actions {
          display: flex;
          gap: 10px;
          align-items: center;
        }
        
        .jira-btn {
          background: #0052cc;
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .jira-btn:hover {
          background: #003fa3;
        }
        
        .disconnect-btn {
          background: #e74c3c;
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .disconnect-btn:hover {
          background: #c0392b;
        }
        
        .connected-status {
          background: #d5f4e6;
          border: 1px solid #27ae60;
          padding: 10px 15px;
          border-radius: 6px;
          font-size: 14px;
          color: #27ae60;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .status-dot {
          width: 8px;
          height: 8px;
          background: #27ae60;
          border-radius: 50%;
        }
        
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }
        
        .modal {
          background: white;
          border-radius: 8px;
          padding: 30px;
          max-width: 500px;
          width: 90%;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
        }
        
        .modal-header {
          font-size: 1.5rem;
          color: #2c3e50;
          margin-bottom: 20px;
          font-weight: 600;
        }
        
        .modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 20px;
        }
        
        .modal-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .modal-btn-primary {
          background: #0052cc;
          color: white;
        }
        
        .modal-btn-primary:hover:not(:disabled) {
          background: #003fa3;
        }
        
        .modal-btn-primary:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .modal-btn-secondary {
          background: #e1e8ed;
          color: #2c3e50;
        }
        
        .modal-btn-secondary:hover {
          background: #d0dce5;
        }
        
        .form-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: block;
          font-weight: 600;
          margin-bottom: 8px;
          color: #2c3e50;
        }
        
        .form-input, .form-textarea {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          transition: border-color 0.2s;
        }
        
        .form-input:focus, .form-textarea:focus {
          outline: none;
          border-color: #3498db;
        }
        
        .form-textarea {
          resize: vertical;
          min-height: 100px;
        }
        
        .submit-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .submit-btn:hover:not(:disabled) {
          background: #2980b9;
        }
        
        .submit-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }
        
        .error-banner {
          background: #e74c3c;
          color: white;
          padding: 15px;
          border-radius: 6px;
          margin-bottom: 20px;
        }
        
        .jira-stories-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 30px;
        }
        
        .stories-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .stories-title {
          font-size: 1.5rem;
          color: #2c3e50;
          margin-bottom: 5px;
        }
        
        .stories-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        
        .story-item {
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          cursor: pointer;
          transition: all 0.2s;
          background: white;
        }
        
        .story-item:hover {
          border-color: #3498db;
          background: #f8f9fa;
        }
        
        .story-item.selected {
          border-color: #27ae60;
          background: #d5f4e6;
        }
        
        .story-key {
          font-weight: 600;
          color: #0052cc;
          font-size: 12px;
          margin-bottom: 5px;
        }
        
        .story-summary {
          color: #2c3e50;
          font-weight: 500;
        }
        
        .loading {
          text-align: center;
          padding: 40px;
          color: #666;
          font-size: 18px;
        }
        
        .results-container {
          background: white;
          border-radius: 8px;
          padding: 30px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .results-header {
          margin-bottom: 20px;
          padding-bottom: 15px;
          border-bottom: 2px solid #e1e8ed;
        }
        
        .results-title {
          font-size: 1.8rem;
          color: #2c3e50;
          margin-bottom: 10px;
        }
        
        .results-meta {
          color: #666;
          font-size: 14px;
        }
        
        .table-container {
          overflow-x: auto;
        }
        
        .results-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 20px;
        }
        
        .results-table th,
        .results-table td {
          padding: 12px;
          text-align: left;
          border-bottom: 1px solid #e1e8ed;
        }
        
        .results-table th {
          background: #f8f9fa;
          font-weight: 600;
          color: #2c3e50;
        }
        
        .results-table tr:hover {
          background: #f8f9fa;
        }
        
        .category-positive { color: #27ae60; font-weight: 600; }
        .category-negative { color: #e74c3c; font-weight: 600; }
        .category-edge { color: #f39c12; font-weight: 600; }
        .category-authorization { color: #9b59b6; font-weight: 600; }
        .category-non-functional { color: #34495e; font-weight: 600; }
        
        .test-case-id {
          cursor: pointer;
          color: #3498db;
          font-weight: 600;
          padding: 8px 12px;
          border-radius: 4px;
          transition: background-color 0.2s;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }
        
        .test-case-id:hover {
          background: #f8f9fa;
        }
        
        .test-case-id.expanded {
          background: #e3f2fd;
          color: #1976d2;
        }
        
        .expand-icon {
          font-size: 10px;
          transition: transform 0.2s;
        }
        
        .expand-icon.expanded {
          transform: rotate(90deg);
        }
        
        .expanded-details {
          margin-top: 15px;
          background: #fafbfc;
          border: 1px solid #e1e8ed;
          border-radius: 8px;
          padding: 20px;
        }
        
        .step-item {
          background: white;
          border: 1px solid #e1e8ed;
          border-radius: 6px;
          padding: 15px;
          margin-bottom: 12px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .step-header {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          align-items: start;
        }
        
        .step-id {
          font-weight: 600;
          color: #2c3e50;
          background: #f8f9fa;
          padding: 4px 8px;
          border-radius: 4px;
          text-align: center;
          font-size: 12px;
        }
        
        .step-description {
          color: #2c3e50;
          line-height: 1.5;
        }
        
        .step-test-data {
          color: #666;
          font-style: italic;
          font-size: 14px;
        }
        
        .step-expected {
          color: #27ae60;
          font-weight: 500;
          font-size: 14px;
        }
        
        .step-labels {
          display: grid;
          grid-template-columns: 80px 1fr 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
          font-weight: 600;
          color: #666;
          font-size: 12px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .jira-filters {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          margin-bottom: 20px;
        }

        .filters-title {
          font-size: 1.2rem;
          color: #2c3e50;
          margin-bottom: 15px;
          font-weight: 600;
        }

        .project-filter {
          margin-bottom: 25px;
        }

        .filter-label {
          display: block;
          font-weight: 600;
          margin-bottom: 12px;
          color: #2c3e50;
          font-size: 14px;
        }

        .project-list {
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          max-height: 250px;
          overflow-y: auto;
          background-color: white;
        }

        .project-list-item {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 1px solid #e1e8ed;
          transition: background-color 0.2s;
        }

        .project-list-item:last-child {
          border-bottom: none;
        }

        .project-list-item:hover {
          background-color: #f8f9fa;
        }

        .project-list-item input[type="checkbox"] {
          margin-right: 12px;
          width: 18px;
          height: 18px;
          cursor: pointer;
          accent-color: #0052cc;
        }

        .project-list-item label {
          flex: 1;
          cursor: pointer;
          margin: 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .project-list-item-text {
          font-weight: 500;
          color: #2c3e50;
        }

        .project-list-item-count {
          color: #999;
          font-size: 12px;
          background: #f0f0f0;
          padding: 2px 8px;
          border-radius: 12px;
        }

        .stories-dropdown-section {
          margin-bottom: 20px;
        }

        .stories-dropdown-label {
          display: block;
          font-weight: 600;
          margin-bottom: 10px;
          color: #2c3e50;
          font-size: 14px;
        }

        .stories-dropdown {
          width: 100%;
          padding: 12px;
          border: 2px solid #e1e8ed;
          border-radius: 6px;
          font-size: 14px;
          background-color: white;
          cursor: pointer;
          transition: border-color 0.2s;
        }

        .stories-dropdown:focus {
          outline: none;
          border-color: #3498db;
        }

        .stories-dropdown:hover {
          border-color: #3498db;
        }

        .story-option {
          padding: 8px;
          color: #2c3e50;
        }

        .no-stories-message {
          padding: 15px;
          background: #fff3cd;
          border: 1px solid #ffc107;
          border-radius: 6px;
          color: #856404;
          text-align: center;
          font-weight: 500;
        }

        .story-actions {
          display: flex;
          gap: 10px;
          margin-top: 15px;
        }

        .link-story-btn {
          flex: 1;
          background: #27ae60;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: background-color 0.2s;
        }

        .link-story-btn:hover:not(:disabled) {
          background: #229954;
        }

        .link-story-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
        }

        .selected-story-preview {
          margin-top: 15px;
          padding: 15px;
          background: #f0f7ff;
          border-left: 4px solid #0052cc;
          border-radius: 4px;
        }

        .selected-story-preview h4 {
          color: #0052cc;
          font-size: 14px;
          margin-bottom: 8px;
          margin-top: 0;
        }

        .selected-story-preview p {
          color: #2c3e50;
          margin: 0 0 8px 0;
          font-size: 14px;
          line-height: 1.5;
        }

        .selected-story-preview .story-id {
          font-weight: 600;
          color: #0052cc;
        }

        .download-section {
          position: sticky;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          border-top: 2px solid #e1e8ed;
          padding: 20px;
          display: flex;
          justify-content: center;
          gap: 15px;
          align-items: center;
          box-shadow: 0 -2px 10px rgba(0, 0, 0, 0.1);
          margin: 30px -50px -50px -50px;
          flex-wrap: wrap;
        }

        .download-label {
          font-weight: 600;
          color: #2c3e50;
          font-size: 14px;
          margin-right: 10px;
          white-space: nowrap;
        }

        .download-buttons {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }

        .export-btn {
          background: #3498db;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          min-width: 100px;
          justify-content: center;
        }

        .export-btn:hover:not(:disabled) {
          background: #2980b9;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
        }

        .export-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .export-btn:disabled {
          background: #bdc3c7;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .export-btn.csv {
          background: #27ae60;
        }

        .export-btn.csv:hover:not(:disabled) {
          background: #229954;
          box-shadow: 0 2px 8px rgba(39, 174, 96, 0.3);
        }

        .export-btn.xlsx {
          background: #16a34a;
        }

        .export-btn.xlsx:hover:not(:disabled) {
          background: #15803d;
          box-shadow: 0 2px 8px rgba(22, 163, 74, 0.3);
        }

        .export-btn.pdf {
          background: #e74c3c;
        }

        .export-btn.pdf:hover:not(:disabled) {
          background: #c0392b;
          box-shadow: 0 2px 8px rgba(231, 76, 60, 0.3);
        }

        .export-loading {
          display: inline-block;
          width: 12px;
          height: 12px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top: 2px solid white;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .export-error-msg {
          color: #e74c3c;
          font-size: 13px;
          padding: 8px 15px;
          background: #fadbd8;
          border: 1px solid #f5b7b1;
          border-radius: 4px;
          text-align: center;
        }
      `}</style>
      
      <div className="container">
        <div className="header">
          <div className="header-title-section">
            <h1 className="title">User Story to Tests</h1>
            <p className="subtitle">Generate comprehensive test cases from your user stories</p>
          </div>
          <div className="header-actions">
            {jiraConnected && connectedProject ? (
              <>
                <div className="connected-status">
                  <div className="status-dot"></div>
                  {connectedProject.name}
                </div>
                <button className="disconnect-btn" onClick={handleDisconnect}>
                  Disconnect
                </button>
              </>
            ) : (
              <button className="jira-btn" onClick={() => setShowJiraModal(true)}>
                Connect to Jira
              </button>
            )}
          </div>
        </div>

        {/* Jira Connection Modal */}
        {showJiraModal && (
          <div className="modal-overlay" onClick={() => setShowJiraModal(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h2 className="modal-header">Connect to Jira</h2>
              
              {jiraError && (
                <div className="error-banner" style={{ marginBottom: '20px' }}>
                  {jiraError}
                </div>
              )}
              
              <form onSubmit={handleJiraConnect}>
                <div className="form-group">
                  <label htmlFor="baseUrl" className="form-label">Jira Base URL *</label>
                  <input
                    type="text"
                    id="baseUrl"
                    className="form-input"
                    placeholder="https://mycompany.atlassian.net"
                    value={jiraFormData.baseUrl}
                    onChange={(e) => handleJiraInputChange('baseUrl', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="email" className="form-label">Email Address *</label>
                  <input
                    type="email"
                    id="email"
                    className="form-input"
                    placeholder="your@email.com"
                    value={jiraFormData.email}
                    onChange={(e) => handleJiraInputChange('email', e.target.value)}
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label htmlFor="apiKey" className="form-label">API Token *</label>
                  <input
                    type="password"
                    id="apiKey"
                    className="form-input"
                    placeholder="Enter your Jira API token"
                    value={jiraFormData.apiKey}
                    onChange={(e) => handleJiraInputChange('apiKey', e.target.value)}
                    required
                  />
                </div>
                
                <div className="modal-actions">
                  <button
                    type="button"
                    className="modal-btn modal-btn-secondary"
                    onClick={() => setShowJiraModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="modal-btn modal-btn-primary"
                    disabled={jiraLoading}
                  >
                    {jiraLoading ? 'Connecting...' : 'Connect'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Jira Stories Filter and Dropdown */}
        {jiraConnected && jiraProjects.length > 0 && (
          <div className="jira-filters">
            <div className="filters-title">Filters</div>
            
            {/* Project List with Checkboxes */}
            <div className="project-filter">
              <span className="filter-label">
                Projects ({selectedProjects.size} selected)
              </span>
              <div className="project-list">
                {jiraProjects.length > 0 ? (
                  jiraProjects.map((project) => {
                    const storyCount = jiraStories.filter(s => s.projectKey === project.key).length
                    return (
                      <div key={project.key} className="project-list-item">
                        <input
                          type="checkbox"
                          id={`project-${project.key}`}
                          checked={selectedProjects.has(project.key)}
                          onChange={() => handleProjectToggle(project.key)}
                        />
                        <label htmlFor={`project-${project.key}`}>
                          <span className="project-list-item-text">{project.key}: {project.name}</span>
                          <span className="project-list-item-count">{storyCount} stories</span>
                        </label>
                      </div>
                    )
                  })
                ) : (
                  <div style={{ padding: '15px', textAlign: 'center', color: '#999' }}>
                    No projects found
                  </div>
                )}
              </div>
            </div>

            {/* Stories Dropdown and Link Button */}
            {filteredStories.length > 0 ? (
              <div className="stories-dropdown-section">
                <label htmlFor="storySelect" className="stories-dropdown-label">
                  Select a Story ({filteredStories.length} available)
                </label>
                <select
                  id="storySelect"
                  className="stories-dropdown"
                  value={selectedStory?.key || ''}
                  onChange={(e) => {
                    const story = filteredStories.find(s => s.key === e.target.value)
                    if (story) {
                      handleSelectStory(story)
                    }
                  }}
                >
                  <option value="">-- Choose a story --</option>
                  {filteredStories.map((story) => (
                    <option key={story.key} value={story.key} className="story-option">
                      {story.key}: {story.summary}
                    </option>
                  ))}
                </select>
                
                <div className="story-actions">
                  <button
                    className="link-story-btn"
                    onClick={handleLinkStory}
                    disabled={!selectedStory}
                    type="button"
                  >
                    Link Story
                  </button>
                </div>

                {selectedStory && (
                  <div className="selected-story-preview">
                    <h4>Selected Story</h4>
                    <p><span className="story-id">{selectedStory.key}</span>: {selectedStory.summary}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="no-stories-message">
                No stories found. Please select at least one project.
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-group">
            <label htmlFor="storyTitle" className="form-label">
              Story Title *
            </label>
            <input
              type="text"
              id="storyTitle"
              className="form-input"
              value={formData.storyTitle}
              onChange={(e) => handleInputChange('storyTitle', e.target.value)}
              placeholder="Enter the user story title..."
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description
            </label>
            <textarea
              id="description"
              className="form-textarea"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Additional description (optional)..."
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="acceptanceCriteria" className="form-label">
              Acceptance Criteria *
            </label>
            <textarea
              id="acceptanceCriteria"
              className="form-textarea"
              value={formData.acceptanceCriteria}
              onChange={(e) => handleInputChange('acceptanceCriteria', e.target.value)}
              placeholder="Enter the acceptance criteria..."
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="additionalInfo" className="form-label">
              Additional Info
            </label>
            <textarea
              id="additionalInfo"
              className="form-textarea"
              value={formData.additionalInfo}
              onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
              placeholder="Any additional information (optional)..."
            />
          </div>
          
          <button
            type="submit"
            className="submit-btn"
            disabled={isLoading}
          >
            {isLoading ? 'Generating...' : 'Generate'}
          </button>
        </form>

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {isLoading && (
          <div className="loading">
            Generating test cases...
          </div>
        )}

        {results && (
          <div className="results-container">
            <div className="results-header">
              <h2 className="results-title">Generated Test Cases</h2>
              <div className="results-meta">
                {results.cases.length} test case(s) generated
                {results.model && ` • Model: ${results.model}`}
                {results.promptTokens > 0 && ` • Tokens: ${results.promptTokens + results.completionTokens}`}
              </div>
            </div>
            
            <div className="table-container">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>Test Case ID</th>
                    <th>Title</th>
                    <th>Category</th>
                    <th>Expected Result</th>
                  </tr>
                </thead>
                <tbody>
                  {results.cases.map((testCase: TestCase) => (
                    <>
                      <tr key={testCase.id}>
                        <td>
                          <div 
                            className={`test-case-id ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}
                            onClick={() => toggleTestCaseExpansion(testCase.id)}
                          >
                            <span className={`expand-icon ${expandedTestCases.has(testCase.id) ? 'expanded' : ''}`}>
                              ▶
                            </span>
                            {testCase.id}
                          </div>
                        </td>
                        <td>{testCase.title}</td>
                        <td>
                          <span className={`category-${testCase.category.toLowerCase()}`}>
                            {testCase.category}
                          </span>
                        </td>
                        <td>{testCase.expectedResult}</td>
                      </tr>
                      {expandedTestCases.has(testCase.id) && (
                        <tr key={`${testCase.id}-details`}>
                          <td colSpan={4}>
                            <div className="expanded-details">
                              <h4 style={{marginBottom: '15px', color: '#2c3e50'}}>Test Steps for {testCase.id}</h4>
                              <div className="step-labels">
                                <div>Step ID</div>
                                <div>Step Description</div>
                                <div>Test Data</div>
                                <div>Expected Result</div>
                              </div>
                              {testCase.steps.map((step, index) => (
                                <div key={index} className="step-item">
                                  <div className="step-header">
                                    <div className="step-id">S{String(index + 1).padStart(2, '0')}</div>
                                    <div className="step-description">{step}</div>
                                    <div className="step-test-data">{testCase.testData || 'N/A'}</div>
                                    <div className="step-expected">
                                      {index === testCase.steps.length - 1 ? testCase.expectedResult : 'Step completed successfully'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Download Section */}
            <div className="download-section">
              <span className="download-label">📥 Download Results:</span>
              <div className="download-buttons">
                <button
                  className="export-btn csv"
                  onClick={() => handleExport('csv')}
                  disabled={exportingFormat !== null}
                  type="button"
                >
                  {exportingFormat === 'csv' && <span className="export-loading"></span>}
                  CSV
                </button>
                <button
                  className="export-btn xlsx"
                  onClick={() => handleExport('xlsx')}
                  disabled={exportingFormat !== null}
                  type="button"
                >
                  {exportingFormat === 'xlsx' && <span className="export-loading"></span>}
                  XLSX
                </button>
                <button
                  className="export-btn pdf"
                  onClick={() => handleExport('pdf')}
                  disabled={exportingFormat !== null}
                  type="button"
                >
                  {exportingFormat === 'pdf' && <span className="export-loading"></span>}
                  PDF
                </button>
              </div>
            </div>
            {exportError && (
              <div className="export-error-msg">
                {exportError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default App