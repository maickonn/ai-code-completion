import * as vscode from 'vscode'
import { Logger } from './logger'
import { StatusBar } from './statusBar'
import { Config } from './config'
import { CompletionProvider } from './completionProvider'

async function promptAndStoreApiKey(
  secrets: vscode.SecretStorage,
  config: Config,
  statusBar: StatusBar,
  logger: Logger
): Promise<void> {
  const key = await vscode.window.showInputBox({
    prompt: 'Enter DeepSeek API key',
    password: true,
    placeHolder: 'sk-...',
    ignoreFocusOut: true,
  })

  if (key) {
    await secrets.store('theAICodeCompletion.deepSeekApiKey', key)
    config.deepSeekApiKey = key
    statusBar.setIdle()
    logger.log('API key configured')
  }
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const logger = new Logger()
  const statusBar = new StatusBar(logger)
  const config = new Config(logger)

  await config.loadSecrets(context.secrets)

  if (!config.deepSeekApiKey)
    statusBar.setNoKey()

  const provider = new CompletionProvider(logger, config, statusBar)

  logger.log('extension activated')

  context.subscriptions.push(
    vscode.commands.registerCommand('theAICodeCompletion.statusBarClick', async () => {
      if (!config.deepSeekApiKey)
        await promptAndStoreApiKey(context.secrets, config, statusBar, logger)
      else
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:maickonn-castro.the-ai-code-completion')

      logger.show()
    }),
    vscode.commands.registerCommand('theAICodeCompletion.setApiKey', async () => {
      await promptAndStoreApiKey(context.secrets, config, statusBar, logger)
    }),
    vscode.commands.registerCommand('theAICodeCompletion.showOutput', () => {
      logger.show()
    }),
    vscode.commands.registerCommand('theAICodeCompletion._didAccept', () => {
      provider.markAccepted()
    }),
    vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, provider),
    {
      dispose: () => {
        logger.dispose()
        statusBar.dispose()
        config.dispose()
      },
    }
  )
}

export function deactivate(): void {}
