import { test, expect } from '@playwright/test'

// Reuses the `circle-with-bloom-effect` fixture: an SVG circle with a four-pass
// WebGPU bloom composited over it via HTML-in-Canvas. The effect is static
// (reads no time/frame), so once the first frame paints the canvas is stable.
const FIXTURE = 'circle-with-bloom-effect'
const CANVAS = `[data-fixture="${FIXTURE}"] canvas`

test('circle-with-bloom-effect renders and matches snapshot', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`console: ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`))

  await page.goto(`/?fixture=${FIXTURE}`)

  // A <canvas> only exists while the WebGPU + HTML-in-Canvas path is live; on
  // init failure the runtime swaps in a plain-DOM fallback (no canvas). So this
  // also asserts the GPU/HiC path was actually exercised, not silently skipped.
  const canvas = page.locator(CANVAS)
  await expect(
    canvas,
    `expected a live WebGPU canvas; runtime may have fallen back to DOM.\n${pageErrors.join('\n')}`,
  ).toBeVisible()

  // toHaveScreenshot re-captures the composited canvas until it matches the
  // baseline (or times out), which absorbs the async device/first-paint warm-up
  // without relying on a flaky WebGPU canvas pixel readback.
  await expect(canvas).toHaveScreenshot(`${FIXTURE}.png`, { timeout: 20_000 })
})
