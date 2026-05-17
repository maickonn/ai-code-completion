import { CompletionRequest } from '../models/requests/completionRequest'
import { CompletionResponse } from '../models/responses/completionResponse'
import { Config } from '../config'
import { Provider } from './types'

interface FIMResponse {
  choices: { text: string; finish_reason: string }[]
}

export class DeepSeekProvider implements Provider {
  readonly id = 'deepseek'
  readonly displayName = 'DeepSeek'

  hasValidConfig(config: Config): boolean {
    return !!config.deepSeekApiKey
  }

  async fetchCompletion(req: CompletionRequest): Promise<CompletionResponse> {
    const body: Record<string, unknown> = {
      model: req.model,
      prompt: req.prompt,
      max_tokens: req.maxTokens,
      temperature: req.temperature,
      stream: false,
      stop: req.stop,
    }

    if (req.suffix)
      body.suffix = req.suffix

    const res = await fetch('https://api.deepseek.com/beta/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${req.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: req.signal,
    })

    if (!res.ok) {
      if (res.status === 401)
        throw new Error('Invalid API key')

      if (res.status === 429)
        throw new Error('Rate limited. Wait and retry.')

      if (res.status === 422)
        throw new Error(`Bad request: ${await res.text()}`)

      throw new Error(`HTTP ${res.status}: ${res.statusText}`)
    }

    const json = await res.json() as FIMResponse

    if (!json.choices?.length)
      throw new Error('No completions returned')

    return {
      text: json.choices[0].text,
      finishReason: json.choices[0].finish_reason,
    }
  }
}
