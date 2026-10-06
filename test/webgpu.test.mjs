import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

test('mounted consumers see device loss and a later mount acquires a fresh device', async () => {
  let effect
  let states
  let index
  const devices = []
  const module = { exports: {} }
  const source = ts.transpileModule(readFileSync(new URL('../src/webgpu.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText
  vm.runInNewContext(source, {
    exports: module.exports,
    require: () => ({
      useEffect(fn) { effect = fn },
      useState(initial) {
        const slot = index++
        const target = states
        target[slot] = initial
        return [initial, value => { target[slot] = value }]
      },
    }),
    console,
    navigator: { gpu: { async requestAdapter() {
      return { async requestDevice() {
        let lose
        const device = { lost: new Promise(resolve => { lose = resolve }) }
        devices.push({ device, lose })
        return device
      } }
    } } },
  })
  const mount = () => {
    states = []
    index = 0
    module.exports.useWebGPUDevice()
    const cleanup = effect()
    return { states, cleanup }
  }
  const flush = () => new Promise(resolve => setImmediate(resolve))
  const first = mount()
  const second = mount()
  await flush()
  assert.equal(devices.length, 1)
  assert.equal(first.states[0], second.states[0])
  devices[0].lose({ message: 'Test loss', reason: 'destroyed' })
  await flush()
  assert.equal(first.states[0], null)
  assert.match(first.states[1].message, /Test loss/)
  assert.equal(second.states[0], null)
  first.cleanup()
  second.cleanup()
  const replacement = mount()
  await flush()
  assert.equal(devices.length, 2)
  assert.equal(replacement.states[0], devices[1].device)
  assert.equal(replacement.states[1], null)
  replacement.cleanup()
})
