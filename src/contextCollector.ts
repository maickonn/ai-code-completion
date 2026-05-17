import * as path from 'path'
import * as vscode from 'vscode'
import { Logger } from './logger'
import { Config } from './config'

const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svgz',
  '.exe', '.dll', '.so', '.dylib', '.bin', '.o', '.obj', '.lib', '.a', '.class', '.jar',
  '.pyc', '.pyd', '.pyo', '.whl',
  '.zip', '.tar', '.gz', '.bz2', '.xz', '.7z', '.rar',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
  '.mp3', '.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv',
  '.woff', '.woff2', '.ttf', '.eot',
])

export async function collectContext(
  activeUri: vscode.Uri,
  config: Config,
  logger: Logger
): Promise<string> {
  const maxFiles = config.maxContextFiles

  if (maxFiles <= 0)
    return ''

  const MAX_FILE_SIZE = 20 * 1024
  const parts: string[] = []
  let skippedLarge = 0
  let skippedError = 0

  const tabs = collectTabs(activeUri)

  for (const tab of tabs.slice(0, maxFiles)) {
    if (!(tab.input instanceof vscode.TabInputText))
      continue

    const uri = tab.input.uri

    if (uri.scheme !== 'untitled') {
      const ext = path.extname(uri.fsPath).toLowerCase()
      if (BINARY_EXTENSIONS.has(ext)) {
        logger.log(`context skipped binary: ${vscode.workspace.asRelativePath(uri)}`)
        continue
      }

      try {
        const stat = await vscode.workspace.fs.stat(uri)

        if (stat.size > MAX_FILE_SIZE) {
          skippedLarge++
          continue
        }
      } catch {
        skippedError++
        continue
      }
    }

    try {
      const doc = await vscode.workspace.openTextDocument(uri)
      const content = doc.getText()
      const relPath = vscode.workspace.asRelativePath(uri)
      parts.push(`// ${relPath}\n${content}\n`)
    } catch {
      skippedError++
    }
  }

  const totalChars = parts.reduce((sum, p) => sum + p.length, 0)
  logger.log(`context: ${parts.length} files (${totalChars} chars) | skipped: ${skippedLarge} >20KB, ${skippedError} error`)

  return parts.join('\n')
}

function collectTabs(activeUri: vscode.Uri): vscode.Tab[] {
  const result: vscode.Tab[] = []
  const seen = new Set<string>()

  for (const group of vscode.window.tabGroups.all) {
    for (const tab of group.tabs) {
      if (!(tab.input instanceof vscode.TabInputText))
        continue

      const uri = tab.input.uri

      if (uri.toString() === activeUri.toString())
        continue

      const key = uri.toString()

      if (seen.has(key))
        continue

      seen.add(key)
      result.push(tab)
    }
  }

  return result
}
