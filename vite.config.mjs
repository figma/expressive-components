import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'

const here = path.dirname(fileURLToPath(import.meta.url))
const FIXTURES_DIR = path.join(here, 'test', 'fixtures')

// Dev-only middleware backing the in-browser snapshot workflow.
// Mounted with apply: 'serve' so none of these endpoints land in a built bundle.
//   POST /__capture?fixture=<name>  body is PNG bytes; written to actual.png
//   POST /__promote?fixture=<name>  copies actual.png over expected.png
//   GET  /__fixture-state           lists which fixtures have expected/actual on disk
function snapshotDevPlugin() {
  return {
    name: 'expressive-components:snapshot-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__capture', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST required')
          return
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const name = url.searchParams.get('fixture')
        if (!name || !/^[a-z0-9-]+$/i.test(name)) {
          res.statusCode = 400
          res.end('invalid fixture name')
          return
        }
        const dir = path.join(FIXTURES_DIR, name)
        if (!fs.existsSync(dir)) {
          res.statusCode = 404
          res.end('unknown fixture')
          return
        }
        const chunks = []
        req.on('data', (c) => chunks.push(c))
        req.on('end', () => {
          fs.writeFileSync(path.join(dir, 'actual.png'), Buffer.concat(chunks))
          res.statusCode = 200
          res.setHeader('content-type', 'application/json')
          res.end(JSON.stringify({ ok: true }))
        })
      })

      server.middlewares.use('/__promote', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end('POST required')
          return
        }
        const url = new URL(req.url ?? '', 'http://localhost')
        const name = url.searchParams.get('fixture')
        if (!name || !/^[a-z0-9-]+$/i.test(name)) {
          res.statusCode = 400
          res.end('invalid fixture name')
          return
        }
        const dir = path.join(FIXTURES_DIR, name)
        const actual = path.join(dir, 'actual.png')
        const expected = path.join(dir, 'expected.png')
        if (!fs.existsSync(actual)) {
          res.statusCode = 404
          res.end('actual.png not found; capture one first')
          return
        }
        fs.copyFileSync(actual, expected)
        res.statusCode = 200
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify({ ok: true, expected }))
      })

      server.middlewares.use('/__fixture-state', (_req, res) => {
        const entries = fs.readdirSync(FIXTURES_DIR, { withFileTypes: true })
        const state = entries
          .filter((e) => e.isDirectory())
          .map((e) => ({
            name: e.name,
            hasExpected: fs.existsSync(path.join(FIXTURES_DIR, e.name, 'expected.png')),
            hasActual: fs.existsSync(path.join(FIXTURES_DIR, e.name, 'actual.png')),
          }))
        res.setHeader('content-type', 'application/json')
        res.end(JSON.stringify(state))
      })
    },
  }
}

export default defineConfig({
  root: path.join(here, 'test'),
  // tailwindcss() compiles the utility classes used by the fixtures (much of
  // the fixture markup is Figma "copy as code" output, which is Tailwind).
  // test/index.css imports Tailwind and scopes the content scan to test/.
  plugins: [react(), tailwindcss(), snapshotDevPlugin()],
  resolve: {
    alias: {
      // Resolve package imports to local source for hot module replacement.
      '@figma/expressive-components': path.join(here, 'src/index.tsx'),
    },
  },
  server: {
    port: 9234,
    strictPort: true,
    host: '127.0.0.1',
  },
  build: { outDir: path.join(here, 'demo-dist'), emptyOutDir: true },
})
