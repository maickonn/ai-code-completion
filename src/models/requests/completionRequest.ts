export interface CompletionRequest {
  prompt: string
  suffix?: string
  signal: AbortSignal
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
  stop: string[]
}
