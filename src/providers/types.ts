import { CompletionRequest } from '../models/requests/completionRequest'
import { CompletionResponse } from '../models/responses/completionResponse'
import { Config } from '../config'

export interface Provider {
  readonly id: string
  readonly displayName: string
  fetchCompletion(req: CompletionRequest): Promise<CompletionResponse>
  hasValidConfig(config: Config): boolean
}
