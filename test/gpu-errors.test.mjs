import { test } from 'node:test'
import assert from 'node:assert/strict'
import { beginGpuErrorScope } from '../dist/gpuErrors.js'

test('pops every scope synchronously before another canvas can push scopes', async () => {
  const calls = []
  let resolveValidation
  const device = {
    pushErrorScope(filter) { calls.push(filter) },
    popErrorScope() {
      calls.push('pop')
      return calls.length === 4
        ? new Promise(resolve => { resolveValidation = resolve })
        : Promise.resolve(null)
    },
  }
  const errors = []
  beginGpuErrorScope(device, error => errors.push(error))()
  assert.deepEqual(calls, ['internal', 'out-of-memory', 'validation', 'pop', 'pop', 'pop'])
  resolveValidation({ message: 'Invalid texture' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(errors[0].message, 'Invalid texture')
})

test('reports scope rejection without an unhandled rejection', async () => {
  const errors = []
  const device = {
    pushErrorScope() {},
    popErrorScope() { return Promise.reject(new Error('Device unavailable')) },
  }
  beginGpuErrorScope(device, error => errors.push(error))()
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(errors.length, 1)
  assert.equal(errors[0].message, 'Device unavailable')
})

test('successful operations do not trigger fallback', async () => {
  const errors = []
  const device = { pushErrorScope() {}, popErrorScope() { return Promise.resolve(null) } }
  beginGpuErrorScope(device, error => errors.push(error))()
  await new Promise(resolve => setImmediate(resolve))
  assert.deepEqual(errors, [])
})
