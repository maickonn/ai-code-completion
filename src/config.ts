import * as vscode from 'vscode'
import { Logger } from './logger'

export class Config {
  enabled = true
  provider = 'deepseek'
  timeoutMs = 10000
  deepSeekApiKey = ''
  model = 'deepseek-v4-flash'
  maxTokens = 256
  debounceMs = 500
  maxContextFiles = 5
  temperature = 0.1
  stop = ['\n\n\n']
  debug = true

  private disposables: vscode.Disposable[] = []

  constructor(private logger: Logger) {
    this.read()
    this.disposables.push(
      vscode.workspace.onDidChangeConfiguration((e) => {
        if (e.affectsConfiguration('theAICodeCompletion'))
          this.read()
      })
    )
  }

  private read(): void {
    const cfg = vscode.workspace.getConfiguration('theAICodeCompletion')
    this.enabled = !!cfg.get<boolean>('enabled', true)
    this.provider = cfg.get<string>('provider', 'deepseek')
    this.timeoutMs = clamp(cfg.get<number>('timeoutMs', 10000), 1000, 60000)
    this.model = cfg.get<string>('model', 'deepseek-v4-flash')
    this.maxTokens = clamp(cfg.get<number>('maxTokens', 256), 1, 4096)
    this.debounceMs = clamp(cfg.get<number>('debounceMs', 500), 0, 10000)
    this.maxContextFiles = clamp(cfg.get<number>('maxContextFiles', 5), 0, 50)
    this.temperature = clamp(cfg.get<number>('temperature', 0.1), 0, 2)
    this.stop = cfg.get<string[]>('stop') || ['\n\n\n']
    this.debug = !!cfg.get<boolean>('debug', true)

    this.logger.debugEnabled = this.debug
    this.logger.log(`config: provider=${this.provider} timeoutMs=${this.timeoutMs} enabled=${this.enabled} model=${this.model} maxTokens=${this.maxTokens} debounceMs=${this.debounceMs} maxContextFiles=${this.maxContextFiles} temperature=${this.temperature} debug=${this.debug}`)
  }

  async loadSecrets(secrets: vscode.SecretStorage): Promise<void> {
    this.deepSeekApiKey = await secrets.get('theAICodeCompletion.deepSeekApiKey') || ''
  }

  dispose(): void {
    for (const d of this.disposables) d.dispose()
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}
