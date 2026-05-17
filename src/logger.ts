import * as vscode from 'vscode'

export class Logger {
  private channel: vscode.OutputChannel
  private _debugEnabled = true

  constructor() {
    this.channel = vscode.window.createOutputChannel('The AI Code Completion')
  }

  set debugEnabled(val: boolean) {
    this._debugEnabled = val
  }

  log(msg: string): void {
    if (!this._debugEnabled)
      return

    const now = new Date()
    const time = now.toISOString().slice(11, 23)
    this.channel.appendLine(`[${time}] ${msg}`)
  }

  show(): void {
    this.channel.show()
  }

  dispose(): void {
    this.channel.dispose()
  }
}
