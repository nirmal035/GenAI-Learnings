import express from 'express'
import { JiraClient } from '../llm/jiraClient'
import { JiraConnectionRequestSchema } from '../schemas'

export const jiraRouter = express.Router()

// Connect and test Jira connection
jiraRouter.post('/connect', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('\n' + '='.repeat(60))
    console.log('📌 JIRA CONNECTION REQUEST')
    console.log('='.repeat(60))
    console.log('Received Jira connect request:', {
      baseUrl: req.body.baseUrl,
      email: req.body.email,
      apiKeyLength: req.body.apiKey?.length ? `${req.body.apiKey.length} chars` : 'MISSING'
    })

    const validationResult = JiraConnectionRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      console.log('❌ Validation failed:', validationResult.error.message)
      res.status(400).json({
        success: false,
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const credentials = validationResult.data
    console.log('✅ Validation passed')
    
    const jiraClient = new JiraClient(credentials)

    // Test connection
    console.log('\n🔄 Testing connection to Jira...')
    const isConnected = await jiraClient.testConnection()
    
    if (!isConnected) {
      console.log('❌ Connection test failed - authentication issue or invalid URL')
      console.log('\n📋 Troubleshooting tips:')
      console.log('   1. Verify the Base URL is correct: https://yourinstance.atlassian.net')
      console.log('   2. Make sure the email is the one associated with your Jira account')
      console.log('   3. Verify the API token is valid (generate new one if needed)')
      console.log('   4. Check that your Jira user has permission to access projects')
      
      res.status(401).json({
        success: false,
        error: 'Failed to authenticate with Jira. Check your credentials and try again. See server logs for details.'
      })
      return
    }

    console.log('✅ Connection successful!')
    
    // For now, return a generic project info - we'll get actual project key from stories request
    const genericProject = {
      key: 'AUTO',
      name: 'Jira Account'
    }

    console.log('\n✅ JIRA CONNECTION SUCCESSFUL')
    console.log('='.repeat(60) + '\n')

    res.json({
      success: true,
      message: 'Successfully connected to Jira',
      project: genericProject
    })
  } catch (error) {
    console.error('\n❌ JIRA CONNECTION ERROR')
    console.error(error)
    console.log('='.repeat(60) + '\n')
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to connect to Jira. Check your credentials.'
    })
  }
})

// Get all projects from Jira
jiraRouter.post('/projects', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('\n' + '='.repeat(60))
    console.log('📂 JIRA PROJECTS REQUEST')
    console.log('='.repeat(60))

    const validationResult = JiraConnectionRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const credentials = validationResult.data
    const jiraClient = new JiraClient(credentials)

    console.log('🔄 Fetching all projects...')
    const projects = await jiraClient.getAllProjects()
    
    console.log(`✅ Found ${projects.length} projects`)
    console.log('='.repeat(60) + '\n')

    res.json({
      success: true,
      projects,
      total: projects.length
    })
  } catch (error) {
    console.error('❌ Error fetching Jira projects:', error)
    console.log('='.repeat(60) + '\n')
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch projects from Jira'
    })
  }
})

// Get stories for selected projects
jiraRouter.post('/stories', async (req: express.Request, res: express.Response): Promise<void> => {
  try {
    console.log('\n' + '='.repeat(60))
    console.log('📖 JIRA STORIES REQUEST')
    console.log('='.repeat(60))

    const validationResult = JiraConnectionRequestSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      res.status(400).json({
        success: false,
        error: `Validation error: ${validationResult.error.message}`
      })
      return
    }

    const credentials = validationResult.data
    const projectKeys = (req.body as any).projectKeys || []
    
    if (!projectKeys || projectKeys.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Project keys are required'
      })
      return
    }

    const jiraClient = new JiraClient(credentials)

    console.log(`🔄 Fetching stories for projects: ${projectKeys.join(', ')}`)
    const stories = await jiraClient.getStoriesByProjects(projectKeys)
    
    console.log(`✅ Found ${stories.length} stories`)
    console.log('='.repeat(60) + '\n')

    res.json({
      success: true,
      stories,
      total: stories.length
    })
  } catch (error) {
    console.error('❌ Error fetching Jira stories:', error)
    console.log('='.repeat(60) + '\n')
    
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch stories from Jira'
    })
  }
})
