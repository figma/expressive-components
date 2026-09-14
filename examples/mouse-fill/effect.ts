// Draws a red disc centered on the pointer over a white field.
export function setup(device: GPUDevice, frame: unknown) {
  const WGSL = `
// xy = mouse position in px, z = disc radius in px.
struct Uniforms { values: vec4f };
@group(0) @binding(0) var<uniform> u: Uniforms;

@vertex fn vs_main(@location(0) pos: vec2f) -> @builtin(position) vec4f {
  return vec4f(pos, 0.0, 1.0);
}

@fragment fn fs_main(@builtin(position) fragPos: vec4f) -> @location(0) vec4f {
  if (distance(fragPos.xy, u.values.xy) < u.values.z) {
    return vec4f(1.0, 0.0, 0.0, 1.0);
  }
  return vec4f(1.0, 1.0, 1.0, 1.0);
}
`

  const module = device.createShaderModule({ code: WGSL })

  frame.state.pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: {
      module: module,
      entryPoint: 'vs_main',
      buffers: [
        {
          arrayStride: 8,
          attributes: [{ shaderLocation: 0, format: 'float32x2', offset: 0 }],
        },
      ],
    },
    fragment: {
      module: module,
      entryPoint: 'fs_main',
      targets: [{ format: 'rgba8unorm' }],
    },
    primitive: { topology: 'triangle-list' },
  })

  frame.state.quad = device.createBuffer({
    size: 6 * 2 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  })
  new Float32Array(frame.state.quad.getMappedRange()).set([
    -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
  ])
  frame.state.quad.unmap()

  frame.state.uniformBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
}

export function render(device, frame) {
  const radius = 40
  device.queue.writeBuffer(
    frame.state.uniformBuf,
    0,
    new Float32Array([frame.mousePosition.x, frame.mousePosition.y, radius, 0]),
  )

  const bindGroup = device.createBindGroup({
    layout: frame.state.pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: frame.state.uniformBuf } }],
  })

  const encoder = device.createCommandEncoder()
  const pass = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: frame.output.createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      },
    ],
  })
  pass.setPipeline(frame.state.pipeline)
  pass.setBindGroup(0, bindGroup)
  pass.setVertexBuffer(0, frame.state.quad)
  pass.draw(6)
  pass.end()
  device.queue.submit([encoder.finish()])
}
