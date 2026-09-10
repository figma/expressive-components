import { test, expect } from '@playwright/test'

const FIXTURE = 'multiple-effects'

// The fixture stacks two multi-shader ShaderEffects over the same green square:
// monochrome→colorize-red and colorize-red→monochrome.
//
// This test verifies that shader effect order is respected correctly.
const CASES = ['monochrome-then-colorize-red', 'colorize-red-then-monochrome'] as const

for (const id of CASES) {
  test(`${FIXTURE}: ${id} renders and matches snapshot`, async ({ page }) => {
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
    const canvas = page.locator(`#${id} canvas`)
    await expect(
      canvas,
      `expected a live WebGPU canvas; runtime may have fallen back to DOM.\n${pageErrors.join('\n')}`,
    ).toBeVisible()

    // toHaveScreenshot re-captures the composited canvas until it matches the
    // baseline (or times out), which absorbs the async device/first-paint warm-up
    // without relying on a flaky WebGPU canvas pixel readback.
    await expect(canvas).toHaveScreenshot(`${FIXTURE}-${id}.png`, { timeout: 20_000 })
  })
}
