import { z } from 'zod'

export const GenerateRequestSchema = z.object({
  storyTitle: z.string().min(1, 'Story title is required'),
  acceptanceCriteria: z.string().min(1, 'Acceptance criteria is required'),
  description: z.string().optional(),
  additionalInfo: z.string().optional()
})

export const TestCaseSchema = z.object({
  id: z.string(),
  title: z.string(),
  steps: z.array(z.string()),
  testData: z.string().optional(),
  expectedResult: z.string(),
  category: z.string()
})

export const GenerateResponseSchema = z.object({
  cases: z.array(TestCaseSchema),
  model: z.string().optional(),
  promptTokens: z.number(),
  completionTokens: z.number()
})

// Jira Schemas
export const JiraConnectionRequestSchema = z.object({
  baseUrl: z.string().url('Invalid base URL'),
  apiKey: z.string().min(1, 'API key is required'),
  email: z.string().email('Invalid email')
})

export const JiraStorySchema = z.object({
  key: z.string(),
  summary: z.string(),
  description: z.string().optional(),
  acceptanceCriteria: z.string().optional(),
  projectKey: z.string()
})

export const JiraStoriesResponseSchema = z.object({
  stories: z.array(JiraStorySchema),
  projectName: z.string(),
  projectKey: z.string(),
  total: z.number()
})

export const JiraConnectionResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  project: z.object({
    name: z.string(),
    key: z.string()
  }).optional()
})

// Type exports
export type GenerateRequest = z.infer<typeof GenerateRequestSchema>
export type TestCase = z.infer<typeof TestCaseSchema>
export type GenerateResponse = z.infer<typeof GenerateResponseSchema>
export type JiraConnectionRequest = z.infer<typeof JiraConnectionRequestSchema>
export type JiraStory = z.infer<typeof JiraStorySchema>
export type JiraStoriesResponse = z.infer<typeof JiraStoriesResponseSchema>
export type JiraConnectionResponse = z.infer<typeof JiraConnectionResponseSchema>