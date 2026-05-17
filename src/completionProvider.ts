import * as vscode from 'vscode'
import { Logger } from './logger'
import { Config } from './config'
import { StatusBar } from './statusBar'
import { collectContext } from './contextCollector'
import { Provider } from './providers/types'
import { createProvider } from './providers'

export class CompletionProvider implements vscode.InlineCompletionItemProvider {
  private _provider: Provider | null = null
  private _prevProvider = ''
  private cache = new Map<string, { text: string; ts: number }>()
  private readonly CACHE_TTL = 5000
  private readonly CHARS_PER_TOKEN = 4
  private readonly ACCEPT_GUARD_MS = 500
  private readonly MAX_TOTAL_TOKENS = 4000
  private acceptedAt = 0

  constructor(
    private logger: Logger,
    private config: Config,
    private statusBar: StatusBar
  ) {}

  private get provider(): Provider {
    if (this._prevProvider !== this.config.provider) {
      this._provider = createProvider(this.config)
      this._prevProvider = this.config.provider
    }
    return this._provider!
  }

  private cacheKey(prefix: string, suffix: string, model: string): string {
    return `${model}|${prefix}|${suffix}`
  }

  async provideInlineCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    _context: vscode.InlineCompletionContext,
    token: vscode.CancellationToken
  ): Promise<vscode.InlineCompletionItem[] | undefined> {
    if (!this.config.enabled) {
      this.logger.log('skip: disabled')
      return undefined
    }

    if (!this.provider.hasValidConfig(this.config)) {
      this.logger.log('skip: provider not configured')
      return undefined
    }

    const prefix = document.getText(new vscode.Range(new vscode.Position(0, 0), position))
    const suffix = document.getText(new vscode.Range(position, document.positionAt(document.getText().length)))

    if (!prefix.trim()) {
      this.logger.log('skip: empty prefix')
      return undefined
    }

    if (Date.now() - this.acceptedAt < this.ACCEPT_GUARD_MS) {
      this.acceptedAt = 0
      return undefined
    }

    const cacheKey = this.cacheKey(prefix, suffix || '', this.config.model)
    const hit = this.cache.get(cacheKey)

    if (hit && Date.now() - hit.ts < this.CACHE_TTL) {
      this.logger.log('cache HIT (immediate)')
      const line = document.lineAt(position)
      const lineEnd = line.range.end
      const range = new vscode.Range(position, lineEnd)
      const coveredText = document.getText(range)
      const item = new vscode.InlineCompletionItem(hit.text + coveredText, range)
      item.command = { command: 'theAICodeCompletion._didAccept', title: '' }
      return [item]
    }

    const canProceed = await this.debounce(token)

    if (!canProceed)
      return undefined

    this.statusBar.setLoading()

    const ac = new AbortController()
    const cancelSub = token.onCancellationRequested(() => ac.abort())
    let timeout = setTimeout(() => ac.abort(), this.config.timeoutMs)

    this.logger.log(`debounce fired: ${document.uri}`)

    try {
      const contextText = await collectContext(document.uri, this.config, this.logger)
      let prompt = contextText ? `${contextText}\n${prefix}` : prefix

      clearTimeout(timeout)
      timeout = setTimeout(() => ac.abort(), this.config.timeoutMs)

      const totalEstimate = Math.ceil((prompt.length + (suffix || '').length) / this.CHARS_PER_TOKEN) + this.config.maxTokens

      if (totalEstimate > this.MAX_TOTAL_TOKENS) {
        const maxPromptChars = (this.MAX_TOTAL_TOKENS - this.config.maxTokens) * this.CHARS_PER_TOKEN
        const excess = prompt.length - maxPromptChars

        if (excess > 0) {
          prompt = prompt.slice(0, maxPromptChars)
          this.logger.log(`prompt truncated: removed ${excess} chars to fit token limit`)
        }
      }

      this.logger.log(
        `API req: model=${this.config.model} prefix=${prefix.length}ch suffix=${(suffix || '').length}ch context=${contextText.length}ch`
      )

      const result = await this.provider.fetchCompletion({
        prompt,
        suffix: suffix || undefined,
        signal: ac.signal,
        apiKey: this.config.deepSeekApiKey,
        model: this.config.model,
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
        stop: this.config.stop,
      })
      this.cache.set(cacheKey, { text: result.text, ts: Date.now() })
      this.cleanupCache()

      if (!result.text || token.isCancellationRequested) {
        this.logger.log('API ok: stale')
        return undefined
      }

      this.logger.log(`API ok: ${result.text.length} chars`)
      const line = document.lineAt(position)
      const lineEnd = line.range.end
      const range = new vscode.Range(position, lineEnd)
      const coveredText = document.getText(range)
      const item = new vscode.InlineCompletionItem(result.text + coveredText, range)
      item.command = { command: 'theAICodeCompletion._didAccept', title: '' }
      return [item]
    } catch (err) {
      this.logger.log(
        (err as Error)?.name === 'AbortError'
          ? 'API aborted'
          : `API error: ${(err as Error).message}`
      )
      return undefined
    } finally {
      cancelSub.dispose()
      clearTimeout(timeout)
      this.statusBar.setIdle()
    }
  }

  markAccepted(): void {
    this.acceptedAt = Date.now()
  }

  private debounce(token: vscode.CancellationToken): Promise<boolean> {
    if (this.config.debounceMs <= 0)
      return Promise.resolve(true)

    return new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(true), this.config.debounceMs)
      token.onCancellationRequested(() => {
        clearTimeout(timer)
        resolve(false)
      })
    })
  }

  private cleanupCache(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache) {
      if (now - entry.ts > this.CACHE_TTL)
        this.cache.delete(key)
    }
  }
}
