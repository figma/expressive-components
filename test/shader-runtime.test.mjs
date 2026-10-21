import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'
import ts from 'typescript'
import { beginGpuErrorScope } from '../dist/gpuErrors.js'
import { getRenderSize } from '../dist/renderSize.js'

// Exercise the hook's effects and event handlers without a browser or GPU driver.
const source = ts.transpileModule(
  readFileSync(new URL('../src/useShaderRuntime.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText

function mountRuntime({ dpi = 2, width = 256, height = 128, hasChildren = true, queue = {} } = {}) {
  const slots = []
  const listeners = new Map()
  const frames = []
  const setups = []
  const textures = []
  const warnings = []
  let cursor = 0
  let dirty = false
  let paintRequested = false
  let pending = []
  let resize
  let bounds = { left: 20, top: 30, width: width * 2, height: height * 2 }
  const texture = (width, height) => ({ width, height, destroy() { this.destroyed = true } })
  const device = {
    queue,
    limits: { maxTextureDimension2D: 8192 },
    pushErrorScope() {},
    popErrorScope() { return Promise.resolve(null) },
    createTexture({ size, usage }) {
      const result = { ...texture(size[0], size[1]), usage }
      textures.push(result)
      return result
    },
  }
  const canvas = {
    clientWidth: width,
    clientHeight: height,
    width: 300,
    height: 150,
    getBoundingClientRect: () => bounds,
    requestPaint() { paintRequested = true },
    getContext: () => ({
      configure() {},
      getCurrentTexture: () => texture(canvas.width, canvas.height),
    }),
  }
  const snapshot = (frame) => ({ ...frame, mousePosition: { ...frame.mousePosition } })
  const shaders = Array.from({ length: 2 }, () => ({
    setup(_device, frame) { setups.push(snapshot(frame)) },
    render(_device, frame) { frames.push(snapshot(frame)) },
    params: {},
    manifest: { version: 2, name: '', isAnimated: false, usesMouse: true },
  }))
  const react = {
    useRef(initial) {
      const index = cursor++
      return slots[index] ??= { current: initial }
    },
    useState(initial) {
      const index = cursor++
      slots[index] ??= { value: initial }
      return [slots[index].value, (value) => {
        if (slots[index].value !== value) {
          slots[index].value = value
          dirty = true
        }
      }]
    },
    useEffect(fn, deps) {
      const index = cursor++
      const previous = slots[index]
      if (!deps || !previous || deps.some((value, i) => value !== previous.deps[i])) {
        pending.push(() => {
          previous?.cleanup?.()
          slots[index] = { deps, cleanup: fn() }
        })
      }
    },
  }
  const exports = {}
  vm.runInNewContext(source, {
    exports,
    require(name) {
      if (name === 'react') { return react }
      if (name === './webgpu.js') { return { useWebGPUDevice: () => ({ device, error: null }) } }
      if (name === './gpuErrors.js') { return { beginGpuErrorScope } }
      if (name === './renderSize.js') { return { getRenderSize } }
      throw new Error(`Unexpected import: ${name}`)
    },
    console: { warn(...args) { warnings.push(args) } },
    GPUTextureUsage: { TEXTURE_BINDING: 1, COPY_DST: 2, RENDER_ATTACHMENT: 4 },
    window: {
      devicePixelRatio: dpi,
      addEventListener(name, fn) { listeners.set(name, fn) },
      removeEventListener(name) { listeners.delete(name) },
    },
    ResizeObserver: class {
      constructor(fn) { resize = fn }
      observe() {}
      disconnect() {}
    },
  })
  const content = {}
  let result
  const flush = () => {
    do {
      dirty = false
      cursor = 0
      result = exports.useShaderRuntime({ canvas, shaders, hasChildren, contentRef: { current: content } })
      const effects = pending
      pending = []
      effects.forEach((run) => run())
    } while (dirty)
    if (paintRequested) {
      paintRequested = false
      canvas.onpaint?.({ changedElements: [] })
    }
  }
  flush()
  return {
    canvas, content, frames, setups, textures, warnings,
    get error() { return result.error },
    setBounds(value) { bounds = value },
    dispatch(name, event = {}) {
      listeners.get(name)?.({ clientX: 276, clientY: 158, button: 0, ...event })
      flush()
    },
    resize(width, height) {
      resize([{ contentRect: { width, height } }])
      flush()
    },
    unmount() { slots.forEach((slot) => slot?.cleanup?.()) },
    listeners,
  }
}

for (const dpi of [1, 1.5, 2]) {
  test(`native textures, scaled pointer input, and button state at DPR ${dpi}`, () => {
    const runtime = mountRuntime({ dpi, hasChildren: false })
    assert.equal(runtime.error, null)
    assert.equal(runtime.setups[0].input.width, 256 * dpi)
    assert.equal(runtime.setups[0].input.height, 128 * dpi)
    assert.equal(runtime.setups[0].renderScale, dpi)
    const [first, second] = runtime.frames
    assert.equal(first.output, second.input)
    assert.equal(second.output.width, 256 * dpi)
    assert.equal('physicalWidth' in second.output, false)

    runtime.dispatch('pointermove')
    assert.equal(runtime.frames.at(-1).mousePosition.x, 128 * dpi)
    assert.equal(runtime.frames.at(-1).mousePosition.y, 64 * dpi)
    runtime.dispatch('pointerdown', { button: 2 })
    assert.equal(runtime.frames.at(-1).mousePosition.down, false)
    runtime.dispatch('pointerdown')
    assert.equal(runtime.frames.at(-1).mousePosition.down, true)
    runtime.dispatch('pointerup', { button: 2 })
    assert.equal(runtime.frames.at(-1).mousePosition.down, true)
    runtime.dispatch('pointerup')
    assert.equal(runtime.frames.at(-1).mousePosition.down, false)
    runtime.dispatch('pointerdown')
    runtime.dispatch('pointercancel')
    assert.equal(runtime.frames.at(-1).mousePosition.down, false)

    runtime.resize(600, 400)
    assert.equal(runtime.frames.at(-1).output.width, 600 * dpi)
    assert.equal(runtime.frames.at(-1).output.height, 400 * dpi)
    runtime.setBounds({ left: 20, top: 30, width: 1200, height: 800 })
    runtime.dispatch('pointermove', { clientX: 620, clientY: 430 })
    assert.equal(runtime.frames.at(-1).mousePosition.x, 300 * dpi)
    assert.equal(runtime.frames.at(-1).mousePosition.y, 200 * dpi)
    runtime.unmount()
    assert.equal(runtime.listeners.size, 0)
    assert.ok(runtime.textures.every((texture) => texture.destroyed))
    assert.deepEqual(runtime.warnings, [])
  })
}

for (const mode of ['draw', 'copy', 'legacy', 'draw-fallback']) {
  test(`DOM capture supports the ${mode} API with native texture sizes`, () => {
    const calls = []
    const queue = {}
    if (mode.startsWith('draw')) {
      queue.drawElementImageToTexture = (...args) => {
        if (mode === 'draw-fallback') { throw new Error('Use copy API') }
        calls.push(args)
      }
    }
    if (mode !== 'draw') {
      queue.copyElementImageToTexture = (...args) => {
        if (mode === 'legacy' && args.length !== 4) { throw new Error('Legacy signature required') }
        calls.push(args)
      }
    }
    const runtime = mountRuntime({ queue })
    assert.equal(runtime.error, null)
    assert.equal(runtime.frames.length, 2)
    assert.equal(calls.length, 1)
    const input = runtime.frames[0].input
    if (mode === 'draw') {
      assert.equal(calls[0][0].source, runtime.content)
      assert.equal(calls[0][1].texture, input)
      assert.equal(calls[0][1].size.width, 512)
      assert.equal(calls[0][1].size.height, 256)
    } else if (mode === 'legacy') {
      assert.equal(calls[0][0], runtime.content)
      assert.equal(calls[0][1], 512)
      assert.equal(calls[0][2], 256)
      assert.equal(calls[0][3].texture, input)
    } else {
      assert.equal(calls[0][0].source, runtime.content)
      assert.equal(calls[0][1].destination.texture, input)
      assert.equal(calls[0][1].width, 512)
      assert.equal(calls[0][1].height, 256)
    }
    assert.ok(input.usage & 4, 'DOM capture requires RENDER_ATTACHMENT usage')
    assert.deepEqual(runtime.warnings, [])
    runtime.unmount()
  })
}

test('capped textures keep shader scale and pointer coordinates consistent after resizing', () => {
  let captures = 0
  const runtime = mountRuntime({
    width: 5120,
    height: 5120,
    queue: { drawElementImageToTexture() { captures++ } },
  })
  assert.equal(runtime.canvas.width, 4096)
  assert.equal(runtime.frames.at(-1).renderScale, 0.8)
  runtime.dispatch('pointermove', { clientX: 5140, clientY: 5150 })
  assert.equal(runtime.frames.at(-1).mousePosition.x, 2048)
  assert.equal(runtime.frames.at(-1).mousePosition.y, 2048)
  const allocations = runtime.textures.length
  assert.equal(captures, 1)
  runtime.resize(6144, 6144)
  assert.equal(runtime.textures.length, allocations)
  assert.equal(captures, 2)
  assert.equal(runtime.frames.at(-1).renderScale, 4096 / 6144)
  runtime.resize(256, 128)
  assert.equal(runtime.frames.at(-1).output.width, 512)
  assert.equal(runtime.frames.at(-1).output.height, 256)
  assert.equal(runtime.frames.at(-1).renderScale, 2)
  runtime.unmount()
})
