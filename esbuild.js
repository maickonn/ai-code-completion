const esbuild = require('esbuild')

async function main() {
  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    outfile: 'out/extension.js',
    external: ['vscode'],
    format: 'cjs',
    platform: 'node',
    sourcemap: false,
    minify: false,
  })

  if (process.argv.includes('--watch')) {
    await ctx.watch()
    console.log('[watch] build finished, watching...')
  } else {
    await ctx.rebuild()
    await ctx.dispose()
  }
}

main().catch(() => process.exit(1))
