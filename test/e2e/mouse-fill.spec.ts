import { test, expect } from '@playwright/test'

// The `mouse-fill` fixture draws a red disc centered on the cursor.
const FIXTURE = 'mouse-fill'
const CANVAS = `[data-fixture="${FIXTURE}"] canvas`

test('mouse-fill draws the disc at the programmatic cursor position', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      pageErrors.push(`console: ${msg.text()}`)
    }
  })
  page.on('pageerror', (err) => pageErrors.push(`pageerror: ${err.message}`))

  await page.goto(`/?fixture=${FIXTURE}`)

  // A <canvas> only exists while the WebGPU + HTML-in-Canvas path is live; on
  // init failure the runtime swaps in a plain-DOM fallback (no canvas).
  const canvas = page.locator(CANVAS)
  await expect(
    canvas,
    `expected a live WebGPU canvas; runtime may have fallen back to DOM.\n${pageErrors.join('\n')}`,
  ).toBeVisible()

  // Place the cursor at a fixed point in the canvas.
  await page.mouse.move(150, 200, { steps: 5 })
  await page.waitForTimeout(100)

  await expect(canvas).toHaveScreenshot(`${FIXTURE}.png`, { timeout: 20_000 })
})
