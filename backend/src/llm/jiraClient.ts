import fetch from 'node-fetch'
import { JiraConnectionRequest } from '../schemas'

export interface JiraIssue {
  key: string
  fields: {
    summary: string
    description?: {
      content?: Array<{
        content?: Array<{
          text?: string
        }>
      }>
    }
    [key: string]: any
  }
}

export interface JiraProject {
  key: string
  name: string
}

export class JiraClient {
  private baseUrl: string
  private apiKey: string
  private email: string

  constructor(credentials: JiraConnectionRequest) {
    // Extract the base domain from the full URL
    try {
      const url = new URL(credentials.baseUrl)
      this.baseUrl = `${url.protocol}//${url.hostname}`
    } catch {
      this.baseUrl = credentials.baseUrl.split('/jira')[0].split('/browse')[0].split('/projects')[0].replace(/\/$/, '')
    }
    
    this.apiKey = credentials.apiKey
    this.email = credentials.email
    
    console.log(`🔧 JiraClient initialized`)
    console.log(`   Original URL: ${credentials.baseUrl}`)
    console.log(`   API Base URL: ${this.baseUrl}`)
    console.log(`   Email: ${this.email}`)
    console.log(`   Token length: ${this.apiKey.length} characters`)
  }

  private getAuthHeader(): string {
    const credentials = `${this.email}:${this.apiKey}`
    const encoded = Buffer.from(credentials).toString('base64')
    const header = `Basic ${encoded}`
    console.log(`   Auth header: ${header.substring(0, 30)}...`)
    return header
  }

  async testConnection(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/rest/api/3/myself`
      console.log(`\n🔍 Testing Jira connection...`)
      console.log(`   URL: ${url}`)
      console.log(`   Method: GET`)
      
      const authHeader = this.getAuthHeader()
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        }
      })

      const statusCode = response.status
      const statusText = response.statusText
      console.log(`   Status: ${statusCode} ${statusText}`)

      if (!response.ok) {
        let responseText = ''
        try {
          responseText = await response.text()
        } catch (e) {
          responseText = '(Could not read response body)'
        }
        console.error(`   ❌ Failed response:`)
        console.error(`   ${responseText}`)
        return false
      }

      const data = await response.json()
      console.log(`   ✅ Connected as: ${(data as any).displayName || data}`)
      return true
    } catch (error) {
      console.error('❌ Jira connection test error:', error)
      return false
    }
  }

  async getProjectInfo(projectKey?: string): Promise<JiraProject> {
    try {
      let endpoint: string
      
      if (projectKey) {
        endpoint = `${this.baseUrl}/rest/api/3/project/${projectKey}`
        console.log(`\n📋 Fetching specific project: ${projectKey}`)
      } else {
        // Try the newer /projects/search endpoint first
        endpoint = `${this.baseUrl}/rest/api/3/projects/search?maxResults=1`
        console.log(`\n📋 Fetching first available project...`)
      }

      console.log(`   Full URL: ${endpoint}`)
      console.log(`   Email: ${this.email}`)
      
      const authHeader = this.getAuthHeader()
      
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        }
      })

      console.log(`   Response Status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        let responseText = ''
        try {
          responseText = await response.text()
          console.error(`   Response Body: ${responseText.substring(0, 200)}...`)
        } catch (e) {
          console.error(`   Could not read response body: ${e}`)
        }
        console.error(`   ❌ Error: ${response.status}`)
        
        if (!projectKey) {
          console.log(`   ⚠️  Trying API v2 /projects endpoint...`)
          return await this.getProjectInfoV2()
        }
        
        throw new Error(`Jira API returned ${response.status}`)
      }

      const data = await response.json()

      let project: JiraProject

      if (projectKey) {
        project = {
          key: (data as any).key,
          name: (data as any).name
        }
      } else {
        if ((data as any).values && Array.isArray((data as any).values) && (data as any).values.length > 0) {
          project = {
            key: (data as any).values[0].key,
            name: (data as any).values[0].name
          }
        } else {
          throw new Error('No projects found')
        }
      }

      console.log(`   ✅ Found project: ${project.name} (${project.key})`)
      return project
    } catch (error) {
      console.error('❌ Failed to fetch project info:', error)
      throw error
    }
  }

  async getProjectInfoV2(): Promise<JiraProject> {
    try {
      // First try /rest/api/2/projects (plural)
      let endpoint = `${this.baseUrl}/rest/api/2/projects`
      console.log(`\n📋 Trying API v2...`)
      console.log(`   Full URL: ${endpoint}`)
      
      const authHeader = this.getAuthHeader()
      
      let response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        }
      })

      console.log(`   Response Status: ${response.status} ${response.statusText}`)

      if (!response.ok) {
        console.log(`   ❌ v2 /projects failed with 404`)
        console.log(`   ⚠️  Trying alternative: /rest/api/2/project...`)
        
        // Try /rest/api/2/project (singular) instead
        endpoint = `${this.baseUrl}/rest/api/2/project`
        console.log(`   Full URL: ${endpoint}`)
        
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Node.js/Jira-Client'
          }
        })

        console.log(`   Response Status: ${response.status} ${response.statusText}`)

        if (!response.ok) {
          let responseText = ''
          try {
            responseText = await response.text()
            console.error(`   Response Body: ${responseText.substring(0, 200)}...`)
          } catch (e) {
            console.error(`   Could not read response body: ${e}`)
          }
          throw new Error(`Jira API v2 endpoints not found (404)`)
        }
      }

      const data = await response.json()

      if (Array.isArray(data) && data.length > 0) {
        const project = {
          key: (data as any)[0].key,
          name: (data as any)[0].name
        }
        console.log(`   ✅ Found project (v2): ${project.name} (${project.key})`)
        return project
      }

      throw new Error('No projects found in response')
    } catch (error) {
      console.error('❌ Failed to fetch project info from v2:', error)
      throw error
    }
  }

  async getProjectIssues(projectKey: string): Promise<Array<{
    key: string
    summary: string
    description?: string
    acceptanceCriteria?: string
    projectKey: string
  }>> {
    try {
      const jql = `project = "${projectKey}" AND (type in (Story, Bug)) ORDER BY created DESC`
      const encodedJql = encodeURIComponent(jql)
      const endpoint = `${this.baseUrl}/rest/api/3/search?jql=${encodedJql}&maxResults=100&fields=summary,description,customfield_10016`
      
      console.log(`\n📖 Fetching issues for project: ${projectKey}`)
      console.log(`   URL: ${endpoint}`)

      const authHeader = this.getAuthHeader()

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        }
      })

      console.log(`   Status: ${response.status}`)

      if (!response.ok) {
        let responseText = ''
        try {
          responseText = await response.text()
        } catch (e) {
          responseText = '(Could not read response body)'
        }
        console.error(`   ❌ Error: ${response.status}`)
        console.error(`   Response: ${responseText}`)
        throw new Error(`Jira API error: ${response.status}`)
      }

      const data = await response.json()

      const issues = (data as any).issues || []
      console.log(`   ✅ Found ${issues.length} issues`)

      return issues.map((issue: JiraIssue) => ({
        key: issue.key,
        summary: issue.fields.summary,
        description: this.extractDescription(issue.fields.description),
        acceptanceCriteria: issue.fields.customfield_10016 || '',
        projectKey: projectKey
      }))
    } catch (error) {
      console.error('❌ Failed to fetch Jira issues:', error)
      throw error
    }
  }

  async getAllProjects(): Promise<JiraProject[]> {
    try {
      let endpoint = `${this.baseUrl}/rest/api/3/projects/search`
      
      console.log(`\n📂 Fetching all projects from Jira...`)
      console.log(`   Trying API v3: ${endpoint}`)

      const authHeader = this.getAuthHeader()

      let response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        }
      })

      console.log(`   Status: ${response.status}`)

      // If v3 fails, try v2 API
      if (!response.ok) {
        console.log(`   ❌ API v3 failed (${response.status}), trying API v2...`)
        endpoint = `${this.baseUrl}/rest/api/2/project`
        
        response = await fetch(endpoint, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Node.js/Jira-Client'
          }
        })
        
        console.log(`   API v2 Status: ${response.status}`)
        
        if (!response.ok) {
          let responseText = ''
          try {
            responseText = await response.text()
            console.error(`   Response: ${responseText.substring(0, 300)}...`)
          } catch (e) {
            console.error(`   Could not read response body`)
          }
          console.error(`   ❌ Both APIs failed`)
          throw new Error(`Jira API error: ${response.status}`)
        }
      }

      const data = await response.json()
      const projects = Array.isArray(data) ? data : ((data as any).values || [])
      
      console.log(`   ✅ Found ${projects.length} projects`)
      projects.forEach((proj: any) => {
        console.log(`      - ${proj.key}: ${proj.name}`)
      })

      return projects.map((proj: any) => ({
        key: proj.key,
        name: proj.name
      }))
    } catch (error) {
      console.error('❌ Failed to fetch Jira projects:', error)
      throw error
    }
  }

  async getStoriesByProject(projectKey: string): Promise<Array<{
    key: string
    summary: string
    description?: string
    acceptanceCriteria?: string
    projectKey: string
  }>> {
    try {
      let endpoint = `${this.baseUrl}/rest/api/3/search/jql`
      const jql = `project = "${projectKey}" AND type in (Story, Bug) ORDER BY created DESC`
      
      console.log(`\n📖 Fetching stories for project: ${projectKey}`)
      console.log(`   Trying API v3: ${endpoint}`)

      const authHeader = this.getAuthHeader()

      let response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'User-Agent': 'Node.js/Jira-Client'
        },
        body: JSON.stringify({
          jql: jql,
          maxResults: 100,
          fields: ['summary', 'description', 'customfield_10016', 'customfield_10085', 'customfield_10000', 'project']
        })
      })

      console.log(`   Status: ${response.status}`)

      // If v3 fails (404 or 410), try v2 API
      if (!response.ok && (response.status === 404 || response.status === 410)) {
        console.log(`   ❌ API v3 failed (${response.status}), trying API v2...`)
        endpoint = `${this.baseUrl}/rest/api/2/search`
        
        response = await fetch(`${endpoint}?jql=${encodeURIComponent(jql)}&maxResults=100&fields=summary,description,customfield_10016,customfield_10085,customfield_10000,project`, {
          method: 'GET',
          headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': 'Node.js/Jira-Client'
          }
        })
        
        console.log(`   API v2 Status: ${response.status}`)
      }

      if (!response.ok) {
        let responseText = ''
        try {
          responseText = await response.text()
          console.error(`   Response: ${responseText.substring(0, 300)}...`)
        } catch (e) {
          console.error(`   Could not read response body`)
        }
        console.error(`   ❌ Error: ${response.status}`)
        throw new Error(`Jira API error: ${response.status}`)
      }

      const data = await response.json()
      const issues = (data as any).issues || []
      console.log(`   ✅ Found ${issues.length} stories`)

      if (issues.length > 0) {
        console.log(`   📋 First issue fields:`, Object.keys(issues[0].fields))
      }

      return issues.map((issue: JiraIssue) => {
        const fields = issue.fields as any
        
        // Try different field names for acceptance criteria
        let acceptanceCriteria = ''
        if (fields.customfield_10016) {
          acceptanceCriteria = fields.customfield_10016
        } else if (fields.customfield_10085) {
          acceptanceCriteria = fields.customfield_10085
        } else if (fields.customfield_10000) {
          acceptanceCriteria = fields.customfield_10000
        }
        
        console.log(`   - ${issue.key}: ${fields.summary} (AC: ${acceptanceCriteria ? 'YES' : 'NO'})`)
        
        return {
          key: issue.key,
          summary: fields.summary,
          description: this.extractDescription(fields.description),
          acceptanceCriteria: acceptanceCriteria || '',
          projectKey: projectKey
        }
      })
    } catch (error) {
      console.error(`❌ Failed to fetch stories for project ${projectKey}:`, error)
      return []
    }
  }

  async getStoriesByProjects(projectKeys: string[]): Promise<Array<{
    key: string
    summary: string
    description?: string
    acceptanceCriteria?: string
    projectKey: string
  }>> {
    try {
      console.log(`\n📖 Fetching stories for projects: ${projectKeys.join(', ')}`)
      
      const allStories: Array<{
        key: string
        summary: string
        description?: string
        acceptanceCriteria?: string
        projectKey: string
      }> = []

      for (const projectKey of projectKeys) {
        const stories = await this.getStoriesByProject(projectKey)
        allStories.push(...stories)
      }

      console.log(`   ✅ Total stories found: ${allStories.length}`)
      return allStories
    } catch (error) {
      console.error('❌ Failed to fetch stories from projects:', error)
      throw error
    }
  }

  private extractDescription(description: any): string {
    if (!description) return ''
    if (typeof description === 'string') return description

    try {
      if (description.content && Array.isArray(description.content)) {
        const text = description.content
          .map((block: any) => {
            if (block.content && Array.isArray(block.content)) {
              return block.content
                .map((item: any) => item.text || '')
                .join('')
            }
            return ''
          })
          .join(' ')
        return text
      }
    } catch (e) {
      console.error('Error parsing description:', e)
    }

    return ''
  }
}
