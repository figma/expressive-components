import { test, expect } from '@playwright/test'

// The `animated-fill` fixture has a shader fill whose output is a solid red
// fill while time < 100ms and is solid blue afterwards. This allows us to
// assert on an animated snapshot without flakiness.
const FIXTURE = 'animated-fill'
const CANVAS = `[data-fixture="${FIXTURE}"] canvas`

test('animated-fill advances the clock and settles on blue', async ({ page }) => {
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

  // Wait past the 100ms red->blue threshold. time only increases and the clock
  // keeps running once animated, so the canvas settles on blue and stays there.
  await page.waitForTimeout(200)

  await expect(canvas).toHaveScreenshot(`${FIXTURE}.png`, { timeout: 20_000 })
})
