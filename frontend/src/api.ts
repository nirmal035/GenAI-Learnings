import { GenerateRequest, GenerateResponse, JiraConnectionRequest, JiraStoriesResponse, JiraConnectionResponse } from './types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081/api'

export async function generateTests(request: GenerateRequest): Promise<GenerateResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/generate-tests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: GenerateResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error generating tests:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function connectToJira(credentials: JiraConnectionRequest): Promise<JiraConnectionResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/connect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraConnectionResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error connecting to Jira:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function getJiraStories(credentials: JiraConnectionRequest): Promise<JiraStoriesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraStoriesResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira stories:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function getJiraProjects(credentials: JiraConnectionRequest): Promise<{ success: boolean; projects: Array<{ key: string; name: string }>; total: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira projects:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function getJiraStoriesByProjects(credentials: JiraConnectionRequest, projectKeys: string[]): Promise<JiraStoriesResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/jira/stories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...credentials, projectKeys }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    const data: JiraStoriesResponse = await response.json()
    return data
  } catch (error) {
    console.error('Error fetching Jira stories by projects:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred')
  }
}

export async function exportTestResults(
  storyTitle: string,
  acceptanceCriteria: string,
  description: string | undefined,
  testCases: Array<{ id: string; title: string; category: string; expectedResult: string; steps: string[]; testData?: string }>,
  format: 'csv' | 'xlsx' | 'pdf'
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        format,
        data: {
          storyTitle,
          description,
          acceptanceCriteria,
          cases: testCases
        }
      }),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
    }

    // Get the blob from response
    const blob = await response.blob()
    
    // Create download link
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    
    // Set filename
    const timestamp = new Date().toISOString().split('T')[0]
    link.download = `test-cases-${timestamp}.${format}`
    
    // Trigger download
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error exporting test results:', error)
    throw error instanceof Error ? error : new Error('Failed to export test results')
  }
}