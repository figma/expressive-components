// Bundle runtime sources for tools that embed editable components in generated projects.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const srcDir = join(import.meta.dirname, 'src')
const output = join(srcDir, 'source.generated.ts')

function collectSources(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      return collectSources(path)
    }
    return /\.tsx?$/.test(entry.name) && !/\.(test|spec)\.tsx?$/.test(entry.name) && path !== output
      ? [path]
      : []
  })
}

const sources = Object.fromEntries(
  collectSources(srcDir).sort().map((path) => [
    relative(srcDir, path).split(sep).join('/'),
    readFileSync(path, 'utf8'),
  ]),
)
writeFileSync(output,
  '// @generated from runtime sources. DO NOT EDIT.\n' +
  `export const SOURCES: Record<string, string> = ${JSON.stringify(sources, null, 2)}\n`,
)
