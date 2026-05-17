import * as vscode from 'vscode'
import { Logger } from './logger'

export class StatusBar {
  private static readonly IDLE_TEXT = '$(zap) The AI Code Completion'
  private static readonly LOADING_TEXT = '$(sync~spin) The AI Code Completion'

  private item: vscode.StatusBarItem
  private _visible = true

  constructor(private logger: Logger) {
    this.item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    )
    this.item.command = 'theAICodeCompletion.statusBarClick'
    this.setIdle()
    this.item.show()
  }

  setIdle(): void {
    if (!this._visible)
      return

    this.item.text = StatusBar.IDLE_TEXT
    this.item.tooltip = 'The AI Code Completion \u2014 Idle'
    this.item.backgroundColor = undefined
  }

  setNoKey(): void {
    if (!this._visible)
      return

    this.item.text = StatusBar.IDLE_TEXT
    this.item.tooltip = 'The AI Code Completion \u2014 No API key'
    this.item.backgroundColor = new vscode.ThemeColor('statusBarItem.errorBackground')
  }

  setLoading(): void {
    if (!this._visible)
      return

    this.item.text = StatusBar.LOADING_TEXT
    this.item.tooltip = 'The AI Code Completion \u2014 Generating...'
    this.item.backgroundColor = undefined
  }

  show(): void {
    this._visible = true
    this.setIdle()
    this.item.show()
  }

  hide(): void {
    this._visible = false
    this.item.hide()
  }

  dispose(): void {
    this.item.dispose()
  }
}
