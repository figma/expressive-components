import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@figma/expressive-components': fileURLToPath(new URL('../src/index.tsx', import.meta.url)),
    },
  },
  server: { port: 9234, strictPort: true, host: '127.0.0.1' },
  build: {
    outDir: fileURLToPath(new URL('../examples-dist', import.meta.url)),
    emptyOutDir: true,
  },
})
