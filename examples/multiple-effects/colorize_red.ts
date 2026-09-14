export function setup(device: GPUDevice, frame: unknown) {
  const WGSL = `
struct Uniforms { values: vec4f };
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var inputTex: texture_2d<f32>;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) uv: vec2f) -> @location(0) vec4f {
  let intensity = clamp(u.values.x, 0.0, 1.0);
  let color = textureSample(inputTex, samp, uv);
  let lum = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
  let red = vec3f(lum, 0.0, 0.0);
  let tinted = mix(color.rgb, red, intensity);
  return vec4f(tinted * color.a, color.a);
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
          arrayStride: 16,
          attributes: [
            { shaderLocation: 0, format: 'float32x2', offset: 0 },
            { shaderLocation: 1, format: 'float32x2', offset: 8 },
          ],
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
    size: 6 * 4 * 4,
    usage: GPUBufferUsage.VERTEX,
    mappedAtCreation: true,
  })
  new Float32Array(frame.state.quad.getMappedRange()).set([
    -1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, -1, 1, 0, 0, 1, -1, 1, 1, 1, 1, 1, 0,
  ])
  frame.state.quad.unmap()

  frame.state.uniformBuf = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  frame.state.sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

  // Stand-in when no input texture is bound, so the bind group is always valid.
  frame.state.placeholder = device.createTexture({
    size: [1, 1, 1],
    format: 'rgba8unorm',
    usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
  })
  device.queue.writeTexture(
    { texture: frame.state.placeholder },
    new Uint8Array([0, 0, 0, 0]),
    { bytesPerRow: 4 },
    { width: 1, height: 1, depthOrArrayLayers: 1 },
  )
}

export function render(device, frame) {
  const intensity = Number(frame.params.intensity)
  const safeIntensity = Number.isFinite(intensity) ? intensity : 1

  device.queue.writeBuffer(frame.state.uniformBuf, 0, new Float32Array([safeIntensity, 0, 0, 0]))

  const inputTex = frame.input != null ? frame.input : frame.state.placeholder

  const bindGroup = device.createBindGroup({
    layout: frame.state.pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformBuf } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: inputTex.createView() },
    ],
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
