export interface GenerateRequest {
  storyTitle: string
  acceptanceCriteria: string
  description?: string
  additionalInfo?: string
}

export interface TestCase {
  id: string
  title: string
  steps: string[]
  testData?: string
  expectedResult: string
  category: string
}

export interface GenerateResponse {
  cases: TestCase[]
  model?: string
  promptTokens: number
  completionTokens: number
}

// Jira Connection Types
export interface JiraConnectionRequest {
  baseUrl: string
  apiKey: string
  email: string
}

export interface JiraStory {
  key: string
  summary: string
  description?: string
  acceptanceCriteria?: string
  projectKey: string
}

export interface JiraStoriesResponse {
  stories: JiraStory[]
  projectName: string
  projectKey: string
  total: number
}

export interface JiraConnectionResponse {
  success: boolean
  message: string
  project?: {
    name: string
    key: string
  }
}

