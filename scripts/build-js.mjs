import { mkdir } from 'node:fs/promises'
import path from 'node:path'

import { build } from 'esbuild'

const rootDir = process.cwd()
const themeOnly = process.argv.includes('--theme-only')

const shared = {
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  sourcemap: true,
  target: ['es2018'],
  logLevel: 'info',
  external: [
    'react',
    'react-dom',
    'react/jsx-runtime',
    '@elastic/charts',
    'ahooks',
  ],
}

const builds = themeOnly
  ? [
      {
        entryPoints: [path.join(rootDir, 'src/theme/index.tsx')],
        outfile: path.join(rootDir, 'dist/theme/index.js'),
      },
    ]
  : [
      {
        entryPoints: [path.join(rootDir, 'src/index.ts')],
        outfile: path.join(rootDir, 'dist/index.js'),
      },
      {
        entryPoints: [path.join(rootDir, 'src/theme/index.tsx')],
        outfile: path.join(rootDir, 'dist/theme/index.js'),
      },
    ]

for (const config of builds) {
  await mkdir(path.dirname(config.outfile), { recursive: true })
  await build({
    ...shared,
    ...config,
  })
}
