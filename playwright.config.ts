import { defineConfig, devices } from '@playwright/test'

// Playwright screenshot (snapshot) tests for the WebGPU + HTML-in-Canvas runtime.
// Fixtures are rendered through the same Vite harness used for manual capture
// (test/main.tsx, served by `npm run dev`), then the rendered <canvas> is pixel-compared.
const PORT = 9234

export default defineConfig({
  testDir: './test/e2e',
  // Keep transient run artifacts (traces, diffs) out of the package root.
  outputDir: './test/e2e/.results',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? 'line' : 'list',
  expect: {
    toHaveScreenshot: { maxDiffPixelRatio: 0.01 },
  },
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // New headless Chromium (full browser, not headless-shell) so WebGPU works.
        channel: 'chromium',
        launchOptions: {
          args: [
            // Flags needed for HTML-in-Canvas
            '--enable-experimental-web-platform-features',
            '--enable-blink-features=HTMLInCanvas,CanvasDrawElementImage',
            // Drive WebGPU through SwiftShader on hosts with no real GPU (CI).
            '--enable-unsafe-webgpu',
            '--enable-features=Vulkan',
            '--use-angle=swiftshader',
            '--use-webgpu-adapter=swiftshader',
            '--use-vulkan=swiftshader',
            '--disable-gpu-sandbox',
            '--no-sandbox',
          ],
        },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
