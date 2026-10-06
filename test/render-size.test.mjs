import assert from 'node:assert/strict'
import test from 'node:test'
import { getRenderSize } from '../dist/renderSize.js'

test('preserves normal device-pixel resolution', () => {
  const size = getRenderSize(320, 240, 2, 8192)
  assert.equal(size.width, 640)
  assert.equal(size.height, 480)
  assert.equal(size.dpi, 2)
})

test('downsamples large Retina content without changing logical dimensions', () => {
  const size = getRenderSize(5120, 5120, 2, 8192)
  assert.deepEqual(size, { width: 4096, height: 4096, logicalWidth: 5120, logicalHeight: 5120, dpi: 0.8 })
})

test('preserves landscape and portrait aspect ratios', () => {
  const landscape = getRenderSize(6144, 4608, 2, 8192)
  assert.equal(landscape.width, 4096)
  assert.equal(landscape.height, 3072)
  const portrait = getRenderSize(4608, 6144, 2, 8192)
  assert.equal(portrait.width, 3072)
  assert.equal(portrait.height, 4096)
})

test('respects device limits below the memory cap', () => {
  const size = getRenderSize(5120, 2560, 2, 2048)
  assert.equal(size.width, 2048)
  assert.equal(size.height, 1024)
})

test('hidden and degenerate content produces valid nonzero allocations', () => {
  for (const [width, height] of [[0, 0], [NaN, Infinity], [-1, -2], [1e8, 1]]) {
    const size = getRenderSize(width, height, 2, 8192)
    assert.ok(Number.isInteger(size.width) && size.width >= 1 && size.width <= 4096)
    assert.ok(Number.isInteger(size.height) && size.height >= 1 && size.height <= 4096)
    assert.ok(Number.isFinite(size.dpi) && size.dpi > 0)
  }
})

test('fractional layout sizes round safely at the cap', () => {
  assert.equal(getRenderSize(4096.25, 2048.125, 2, 8192).width, 4096)
  assert.equal(getRenderSize(4096.25, 2048.125, 2, 8192).height, 2048)
})
