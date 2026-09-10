import { test, expect } from '@playwright/test'

// The `pattern-grid` fixture renders a static diamond grid with ShaderFill.
const FIXTURE = 'pattern-grid'
const CANVAS = `[data-fixture="${FIXTURE}"] canvas`

test('pattern-grid renders and matches snapshot', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`console: ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`))

  await page.goto(`/?fixture=${FIXTURE}`)

  // A <canvas> only exists while the WebGPU path is live; on init failure the
  // runtime swaps in a plain-DOM fallback (no canvas).
  const canvas = page.locator(CANVAS)
  await expect(
    canvas,
    `expected a live WebGPU canvas; runtime may have fallen back to DOM.\n${pageErrors.join('\n')}`,
  ).toBeVisible()

  await expect(canvas).toHaveScreenshot(`${FIXTURE}.png`, { timeout: 20_000 })
})
