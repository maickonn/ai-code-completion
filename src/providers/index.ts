import { Provider } from './types'
import { DeepSeekProvider } from './deepseek'
import { Config } from '../config'

export function createProvider(config: Config): Provider {
  switch (config.provider) {
    case 'deepseek':
      return new DeepSeekProvider()
    default:
      throw new Error(`Unknown LLM provider: ${config.provider}`)
  }
}
