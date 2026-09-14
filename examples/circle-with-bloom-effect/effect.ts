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

@fragment fn fs_bright(@location(0) uv: vec2f) -> @location(0) vec4f {
  var color = textureSample(inputTex, samp, uv);
  let threshold = u.values.x;
  let lum = dot(color.rgb, vec3f(0.299, 0.587, 0.114));
  let keep = smoothstep(threshold, threshold + 0.1, lum);
  color = color * keep;
  return color;
}

@fragment fn fs_blur(@location(0) uv: vec2f) -> @location(0) vec4f {
  let radius = u.values.x;
  let sigma = max(u.values.y, 0.0001);
  let dir = vec2f(u.values.z, u.values.w);
  let dims = vec2f(textureDimensions(inputTex, 0));
  let texel = vec2f(1.0) / dims;

  var sum = vec4f(0.0);
  var weightSum = 0.0;
  let twoSigmaSq = 2.0 * sigma * sigma;
  for (var i = -16; i <= 16; i = i + 1) {
    let fi = f32(i);
    let w = exp(-(fi * fi) / twoSigmaSq);
    let offset = dir * texel * fi * (radius / 16.0);
    let sampleUv = clamp(uv + offset, vec2f(0.0), vec2f(1.0));
    sum = sum + textureSample(inputTex, samp, sampleUv) * w;
    weightSum = weightSum + w;
  }
  return sum / max(weightSum, 0.0001);
}
`

  const WGSL_COMPOSITE = `
struct Uniforms { values: vec4f };
@group(0) @binding(0) var<uniform> u: Uniforms;
@group(0) @binding(1) var samp: sampler;
@group(0) @binding(2) var originalTex: texture_2d<f32>;
@group(0) @binding(3) var bloomTex: texture_2d<f32>;

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
  let intensity = u.values.x;
  let glowR = u.values.y;
  let glowG = u.values.z;
  let glowB = u.values.w;
  let original = textureSample(originalTex, samp, uv);
  let bloom = textureSample(bloomTex, samp, uv);
  let bloom_lum = dot(bloom.rgb, vec3f(0.299, 0.587, 0.114));
  var neon = vec4f(
    glowR * bloom_lum * intensity,
    glowG * bloom_lum * intensity,
    glowB * bloom_lum * intensity,
    bloom_lum * intensity
  );
  var color = original + neon;
  return clamp(color, vec4f(0.0), vec4f(1.0));
}
`

  const module = device.createShaderModule({ code: WGSL })
  const compositeModule = device.createShaderModule({ code: WGSL_COMPOSITE })

  const vertexBuffers = [
    {
      arrayStride: 16,
      attributes: [
        { shaderLocation: 0, format: 'float32x2', offset: 0 },
        { shaderLocation: 1, format: 'float32x2', offset: 8 },
      ],
    },
  ]

  frame.state.brightPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: module, entryPoint: 'vs_main', buffers: vertexBuffers },
    fragment: {
      module: module,
      entryPoint: 'fs_bright',
      targets: [{ format: 'rgba8unorm' }],
    },
    primitive: { topology: 'triangle-list' },
  })

  frame.state.blurPipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: module, entryPoint: 'vs_main', buffers: vertexBuffers },
    fragment: {
      module: module,
      entryPoint: 'fs_blur',
      targets: [{ format: 'rgba8unorm' }],
    },
    primitive: { topology: 'triangle-list' },
  })

  frame.state.compositePipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module: compositeModule, entryPoint: 'vs_main', buffers: vertexBuffers },
    fragment: {
      module: compositeModule,
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

  frame.state.uniformBright = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  frame.state.uniformBlurH = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  frame.state.uniformBlurV = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
  frame.state.uniformComposite = device.createBuffer({
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })

  frame.state.sampler = device.createSampler({
    magFilter: 'linear',
    minFilter: 'linear',
    addressModeU: 'clamp-to-edge',
    addressModeV: 'clamp-to-edge',
  })

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

  frame.state.brightA = null
  frame.state.brightB = null
  frame.state.bufW = 0
  frame.state.bufH = 0
}

export function render(device, frame) {
  const threshold = Number(frame.params.threshold) || 0
  const intensity = Number(frame.params.intensity) || 0
  const radius = Number(frame.params.radius) || 0
  const sigma = Math.max(radius / 2, 0.5)
  const gc = frame.params.glowColor || { r: 1, g: 0.4, b: 1, a: 1 }
  const glowR = Number(gc.r) || 0
  const glowG = Number(gc.g) || 0
  const glowB = Number(gc.b) || 0

  device.queue.writeBuffer(frame.state.uniformBright, 0, new Float32Array([threshold, 0, 0, 0]))
  device.queue.writeBuffer(frame.state.uniformBlurH, 0, new Float32Array([radius, sigma, 1, 0]))
  device.queue.writeBuffer(frame.state.uniformBlurV, 0, new Float32Array([radius, sigma, 0, 1]))
  device.queue.writeBuffer(
    frame.state.uniformComposite,
    0,
    new Float32Array([intensity, glowR, glowG, glowB]),
  )

  const inputTex = frame.input != null ? frame.input : frame.state.placeholder
  const w = inputTex.width
  const h = inputTex.height

  if (frame.state.brightA == null || frame.state.bufW !== w || frame.state.bufH !== h) {
    if (frame.state.brightA != null) {
      frame.state.brightA.destroy()
    }
    if (frame.state.brightB != null) {
      frame.state.brightB.destroy()
    }
    const texDesc = {
      size: [w, h, 1],
      format: 'rgba8unorm',
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    }
    frame.state.brightA = device.createTexture(texDesc)
    frame.state.brightB = device.createTexture(texDesc)
    frame.state.bufW = w
    frame.state.bufH = h
  }

  const bindBright = device.createBindGroup({
    layout: frame.state.brightPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformBright } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: inputTex.createView() },
    ],
  })
  const bindBlurH = device.createBindGroup({
    layout: frame.state.blurPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformBlurH } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: frame.state.brightA.createView() },
    ],
  })
  const bindBlurV = device.createBindGroup({
    layout: frame.state.blurPipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformBlurV } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: frame.state.brightB.createView() },
    ],
  })
  const bindComposite = device.createBindGroup({
    layout: frame.state.compositePipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: frame.state.uniformComposite } },
      { binding: 1, resource: frame.state.sampler },
      { binding: 2, resource: inputTex.createView() },
      { binding: 3, resource: frame.state.brightA.createView() },
    ],
  })

  const encoder = device.createCommandEncoder()

  // Pass 1: bright-extract, input -> brightA.
  const p1 = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: frame.state.brightA.createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      },
    ],
  })
  p1.setPipeline(frame.state.brightPipeline)
  p1.setBindGroup(0, bindBright)
  p1.setVertexBuffer(0, frame.state.quad)
  p1.draw(6)
  p1.end()

  // Pass 2: horizontal blur, brightA -> brightB.
  const p2 = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: frame.state.brightB.createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      },
    ],
  })
  p2.setPipeline(frame.state.blurPipeline)
  p2.setBindGroup(0, bindBlurH)
  p2.setVertexBuffer(0, frame.state.quad)
  p2.draw(6)
  p2.end()

  // Pass 3: vertical blur, brightB -> brightA.
  const p3 = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: frame.state.brightA.createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      },
    ],
  })
  p3.setPipeline(frame.state.blurPipeline)
  p3.setBindGroup(0, bindBlurV)
  p3.setVertexBuffer(0, frame.state.quad)
  p3.draw(6)
  p3.end()

  // Pass 4: tinted neon composite, original + brightA -> output.
  const p4 = encoder.beginRenderPass({
    colorAttachments: [
      {
        view: frame.output.createView(),
        loadOp: 'clear',
        clearValue: { r: 0, g: 0, b: 0, a: 0 },
        storeOp: 'store',
      },
    ],
  })
  p4.setPipeline(frame.state.compositePipeline)
  p4.setBindGroup(0, bindComposite)
  p4.setVertexBuffer(0, frame.state.quad)
  p4.draw(6)
  p4.end()

  device.queue.submit([encoder.finish()])
}
