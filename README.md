# The AI Code Completion

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

A VS Code extension that provides AI-powered inline code completions using the [DeepSeek FIM API](https://api.deepseek.com/beta/completions) (Fill-in-the-Middle).

## Features

- **Inline completions** — suggestions appear as ghost text as you type (using VS Code's `InlineCompletionItemProvider`)
- **Context-aware** — automatically includes other open tabs as surrounding context for better completions
- **Caching** — repeated suggestions for the same prefix/suffix are served instantly within a 5-second TTL
- **Debounced requests** — avoids excessive API calls while you're still typing (configurable delay)
- **Status bar indicator** — shows idle/loading/no-key states and provides quick access to settings/API key configuration
- **Token limit protection** — truncates prompts to stay within model limits

## Requirements

- VS Code ^1.86.0
- A [DeepSeek](https://platform.deepseek.com/) API key

## Installation

1. Install the extension from the VS Code Marketplace (or build from source — see below)
2. Open VS Code
3. Set your API key via the command palette: `The AI Code Completion: Set API Key`
4. Completions will start appearing automatically as you type

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `theAICodeCompletion.enabled` | `true` | Enable/disable completions |
| `theAICodeCompletion.model` | `deepseek-v4-flash` | Model ID for FIM completions |
| `theAICodeCompletion.maxTokens` | `256` | Maximum tokens per completion |
| `theAICodeCompletion.debounceMs` | `500` | Debounce delay in milliseconds |
| `theAICodeCompletion.maxContextFiles` | `5` | Number of open tabs to use as context (0 = disable) |
| `theAICodeCompletion.temperature` | `0.1` | Sampling temperature |
| `theAICodeCompletion.timeoutMs` | `10000` | Request timeout in milliseconds |
| `theAICodeCompletion.debug` | `true` | Enable debug output channel |
| `theAICodeCompletion.stop` | `["\\n\\n\\n"]` | Stop sequences |

## Commands

- **`The AI Code Completion: Set API Key`** — prompts for and stores your DeepSeek API key
- **`The AI Code Completion: Show Output`** — opens the debug output channel

## Development

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode
npm run watch
```

### Build from source

```bash
npm install
npm run compile
```

The compiled output goes to `out/extension.js`.

## How it works

1. As you type, the extension captures the text before and after the cursor (prefix and suffix)
2. Open editor tabs are collected as additional context (skipping binary files and files larger than 20 KB)
3. A request is sent to the DeepSeek FIM API with the prompt, suffix, and context
4. The returned completion is displayed as an inline ghost text suggestion
5. Accepting a suggestion triggers a short guard period to prevent immediate re-triggering

## License

[MIT](LICENSE)
