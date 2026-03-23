import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import postcss from 'postcss'
import PrefixWrap from 'postcss-prefixwrap'

const outputDir = process.argv[2]

if (!outputDir) {
  console.error('Usage: node scripts/build-theme-css.mjs <output-dir>')
  process.exit(1)
}

const rootDir = process.cwd()

const themes = [
  {
    name: 'light_theme',
    prefix: '.metrics-chart-light',
    source: path.join(
      rootDir,
      'node_modules/@elastic/charts/dist/theme_only_light.css'
    ),
  },
  {
    name: 'dark_theme',
    prefix: '.metrics-chart-dark',
    source: path.join(
      rootDir,
      'node_modules/@elastic/charts/dist/theme_only_dark.css'
    ),
  },
]

const resetCssPath = path.join(rootDir, 'src/reset.css')
const resetCss = await readFile(resetCssPath, 'utf8')

await mkdir(path.resolve(rootDir, outputDir), { recursive: true })

for (const theme of themes) {
  const themeCss = await readFile(theme.source, 'utf8')
  const result = await postcss([PrefixWrap(theme.prefix)]).process(
    `${themeCss}\n${resetCss}\n`,
    {
      from: theme.source,
      to: path.join(rootDir, outputDir, `${theme.name}.css`),
      map: {
        inline: false,
      },
    }
  )

  const outputPath = path.join(rootDir, outputDir, `${theme.name}.css`)
  await writeFile(outputPath, result.css)

  if (result.map) {
    await writeFile(`${outputPath}.map`, result.map.toString())
  }
}

if (path.resolve(rootDir, outputDir) === path.join(rootDir, '.css')) {
  await writeFile(path.join(rootDir, '.css/reset.css'), resetCss)
}
