// @ts-nocheck
export function setup(device, frame) {
  var wgsl = `
diagnostic(off,derivative_uniformity);
struct Uniforms {
  frameData: vec4f,
  inputDimsAndPad: vec4f,
  shape: vec4f,
  gridLayout: vec4f,
  size: vec4f,
  transform: vec4f,
  strokeWidth: vec4f,
  shapeColor: vec4f,
  bgColor: vec4f,
  strokeColor: vec4f,
  zoom: vec4f,
  offset: vec4f,
};
@group(0) @binding(0) var<uniform> u: Uniforms;

struct VsIn {
  @location(0) pos: vec2f,
  @location(1) uv: vec2f,
};
struct VsOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

fn rot2(a: f32) -> mat2x2f {

  let c = cos(a);

  let s = sin(a);

  return mat2x2f(c, s, -s, c);

}

fn pmod(x: f32, m: f32) -> f32 {
  return ((x % m) + m) % m;
}

fn pmod2(x: vec2f, m: f32) -> vec2f {
  return ((x % m) + m) % m;
}

fn sdCircle(p: vec2f, r: f32) -> f32 {

  return length(p) - r;

}

fn sdBox(p: vec2f, r: f32) -> f32 {

  let d = abs(p) - vec2f(r);

  return length(max(d, vec2f(0.0))) + min(max(d.x, d.y), 0.0);

}

fn sdDiamond(p: vec2f, r: f32) -> f32 {

  let q = abs(p);

  return (q.x + q.y) - r;

}

fn sdTriangle(p_in: vec2f, r: f32) -> f32 {

  let k = sqrt(3.0);

  var p = p_in;

  p.x = abs(p.x) - r;

  p.y = p.y + r / k;

  if (p.x + k * p.y > 0.0) {

    p = vec2f(p.x - k * p.y, -k * p.x - p.y) / 2.0;

  }

  p.x = p.x - clamp(p.x, -2.0 * r, 0.0);

  return -length(p) * sign(p.y);

}

fn sdHexagon(p_in: vec2f, r: f32) -> f32 {

  let k = vec3f(-0.866025, 0.5, 0.577350);

  var p = abs(p_in);

  p = p - 2.0 * min(dot(k.xy, p), 0.0) * k.xy;

  p = p - vec2f(clamp(p.x, -k.z * r, k.z * r), r);

  return length(p) * sign(p.y);

}

fn sdCross(p: vec2f, r: f32) -> f32 {

  let arm = r * 0.35;

  let a = length(max(abs(p) - vec2f(arm, r), vec2f(0.0))) + min(max(abs(p.x) - arm, abs(p.y) - r), 0.0);

  let b = length(max(abs(p) - vec2f(r, arm), vec2f(0.0))) + min(max(abs(p.x) - r, abs(p.y) - arm), 0.0);

  return min(a, b);

}

fn sdRing(p: vec2f, r: f32) -> f32 {

  return abs(length(p) - r * 0.75) - r * 0.25;

}

fn cellUVAt(samplePx: vec2f, gridLayout: i32, spacing: f32) -> vec2f {
  var c = samplePx;
  let hS = spacing * 0.5;
  if (gridLayout == 1) {
    let row = floor(samplePx.y / spacing);
    c.x = c.x - pmod(row, 2.0) * hS;
  } else if (gridLayout == 2) {
    let row = floor(samplePx.y / (spacing * 0.866));
    c.x = c.x - pmod(row, 2.0) * hS;
  }
  var uv: vec2f;
  if (gridLayout == 2) {
    uv.x = pmod(c.x, spacing) - spacing * 0.5;
    uv.y = pmod(c.y, spacing * 0.866) - spacing * 0.866 * 0.5;
  } else {
    uv = pmod2(c, spacing) - spacing * 0.5;
  }
  return uv;
}

fn shapeSDF(p: vec2f, sh: i32, r: f32) -> f32 {

  if (sh == 0) { return sdDiamond(p, r * 1.4); }

  if (sh == 1) { return sdCircle(p, r); }

  if (sh == 2) { return sdBox(p, r); }

  if (sh == 3) { return sdTriangle(p, r); }

  if (sh == 4) { return sdHexagon(p, r); }

  if (sh == 5) { return sdCross(p, r); }

  if (sh == 6) { return sdRing(p, r); }

  return sdDiamond(p, r * 1.4);

}

@vertex fn vs_main(in: VsIn) -> VsOut {
  var out: VsOut;
  out.position = vec4f(in.pos, 0.0, 1.0);
  out.uv = in.uv;
  return out;
}

@fragment fn fs_main(@location(0) outputUv_in: vec2f) -> @location(0) vec4f {
  let time = u.frameData.x;
  let outputUv = outputUv_in;
  let dims = max(u.frameData.yz, vec2f(1.0));
  let outputPad = u.frameData.w;
  let inputDims = max(u.inputDimsAndPad.xy, vec2f(1.0));
  let inputPad = u.inputDimsAndPad.z;
  let inputTexel = vec2f(1.0) / inputDims;
  let fragPx = outputUv * dims;
  let contentOriginPx = vec2f(inputPad + outputPad);
  let uvRaw = (fragPx - contentOriginPx) / inputDims;
  // texel and aspect are input-relative to match uv; for unpadded effects and
  // all fills inputDims === dims so this is unchanged. Zoom fills rescale texel
  // alongside their uv redefinition below (see zoomLocal).
  let aspect = inputDims.x / max(inputDims.y, 1.0);
  // shape: 0=circle, 1=box, 2=triangle, 3=diamond, 4=hexagon, 5=cross, 6=ring
  let shape = i32(u.shape.x + 0.5);
  // gridLayout: 0=grid, 1=brick, 2=hex
  let gridLayout = i32(u.gridLayout.x + 0.5);
  let txRadius = u.transform.z;
  let spacing = txRadius;
  let txOffsetX = u.transform.x;
  let txOffsetY = u.transform.y;
  let rotation = u.transform.w;
  let size = u.size.x;
  let r = size * 0.5;
  let strokeWidth = u.strokeWidth.x;
  let shapeColor = u.shapeColor;
  let bgColor = u.bgColor;
  let strokeColor = u.strokeColor;
  let zoom = u.zoom.x;
  let uv = (uvRaw - vec2f(0.5)) / zoom + vec2f(0.5);
  let texel = inputTexel / zoom;
  // Seamless scroll offset: shift pixel coords then wrap with fract so the
  // pattern tiles with no seam. offset is in percent (0..100 = one full tile).
  let scrollOffset = u.offset.xy * 0.01;
  // Convert uv to pixel coordinates
  var px = uv * dims;
  px = px - vec2f(txOffsetX, txOffsetY) * dims * 0.01;
  // Apply scroll offset in pixel-space, wrapped per-cell via pmod below.
  // We shift px by offset * spacing so 0→1 in offset = one full tile scroll.
  var scrollDelta: vec2f;
  if (gridLayout == 1) { // brick: Y period = 2 * spacing
    scrollDelta = vec2f(scrollOffset.x * spacing, scrollOffset.y * spacing * 2.0);
  } else if (gridLayout == 2) { // hex: Y period = 2 * spacing * 0.866
    scrollDelta = vec2f(scrollOffset.x * spacing, scrollOffset.y * spacing * 0.866 * 2.0);
  } else { // grid: Y period = spacing
    scrollDelta = scrollOffset * spacing;
  }
  px = px - scrollDelta;
  var cell = px;
  let hSpacing = spacing * 0.5;
  if (gridLayout == 1) {
    let row = floor(px.y / spacing);
    cell.x = cell.x - pmod(row, 2.0) * hSpacing;
  } else if (gridLayout == 2) {
    let row = floor(px.y / (spacing * 0.866));
    cell.x = cell.x - pmod(row, 2.0) * hSpacing;
  }
  var cellUV: vec2f;
  if (gridLayout == 2) {
    let uSpacing = spacing;
    cellUV.x = pmod(cell.x, uSpacing) - uSpacing * 0.5;
    cellUV.y = pmod(cell.y, uSpacing * 0.866) - uSpacing * 0.866 * 0.5;
  } else {
    cellUV = pmod2(cell, spacing) - spacing * 0.5;
  }
  // For shapes with tips/corners that may extend into neighboring cells (triangle, diamond),
  // evaluate the SDF from all 9 neighbor offsets and take the minimum distance.
  // This ensures tips crossing cell boundaries are rendered correctly.
  let rotMat = rot2(-rotation * 3.14159265 / 180.0);
  let cellUV_pre_rot = cellUV;
  cellUV = rotMat * cellUV;

  var d = shapeSDF(cellUV, shape, r);
  // Only do neighbor sampling for shapes that have pointy tips extending beyond cell extents.
  // Triangle (sh==3) and Diamond (sh==0) are most affected; check all shapes for correctness.
  let clipCell = u.zoom.z > 0.5;
  let needsNeighbor = !clipCell || (shape == 3 || shape == 0);
  if (needsNeighbor) {
    let rowSpacingY = select(spacing, spacing * 0.866, gridLayout == 2);
    for (var ny = -1; ny <= 1; ny++) {
      for (var nx = -1; nx <= 1; nx++) {
        if (nx == 0 && ny == 0) { continue; }
        var neighborOffset: vec2f;
        let hS = spacing * 0.5;
        if (gridLayout == 1) { // brick
          let brickRow = floor(px.y / spacing);
          let brickXAdj = (pmod(brickRow + f32(ny), 2.0) - pmod(brickRow, 2.0)) * hS;
          neighborOffset = vec2f(f32(nx) * spacing + brickXAdj, f32(ny) * spacing);
        } else if (gridLayout == 2) { // hex
          let hexRow = floor(px.y / (spacing * 0.866));
          let hexXAdj = (pmod(hexRow + f32(ny), 2.0) - pmod(hexRow, 2.0)) * hS;
          neighborOffset = vec2f(f32(nx) * spacing + hexXAdj, f32(ny) * spacing * 0.866);
        } else { // regular grid
          neighborOffset = vec2f(f32(nx) * spacing, f32(ny) * spacing);
        }
        let ncUV = rotMat * (cellUV_pre_rot - neighborOffset);
        let nd = shapeSDF(ncUV, shape, r);
        d = min(d, nd);
      }
    }
  }
  let aa = clamp(fwidth(d), 0.0, 1.5);
  let soft = max(aa, u.zoom.y);
  let fillAmt = 1.0 - smoothstep(-soft, soft, d);
  var strokeAmt = 0.0;
  if (strokeWidth > 0.0) {
    let sw = strokeWidth * 0.5;
    strokeAmt = 1.0 - smoothstep(-soft, soft, abs(d) - sw);
  }
  // Composite using straight alpha blending, then output premultiplied alpha.
  // Start with background (straight alpha).
  var outRgb = bgColor.rgb * bgColor.a;
  var outA = bgColor.a;
  // Blend shape color over background.
  let shapeBlend = fillAmt * shapeColor.a;
  outRgb = outRgb * (1.0 - shapeBlend) + shapeColor.rgb * shapeBlend;
  outA = outA * (1.0 - shapeBlend) + shapeBlend;
  // Blend stroke color over current result.
  let strokeBlend = strokeAmt * strokeColor.a;
  outRgb = outRgb * (1.0 - strokeBlend) + strokeColor.rgb * strokeBlend;
  outA = outA * (1.0 - strokeBlend) + strokeBlend;
  // Output premultiplied alpha.
  return vec4f(outRgb * outA, outA);
}
`
  frame.state.module = device.createShaderModule({ code: wgsl })
  frame.state.pipeline = null
  frame.state.pipelineFormat = null
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
    size: 192,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  })
}
export function render(device, frame) {
  var params = frame.params || {}
  function finiteNumber(value, fallback) {
    var num = Number(value)
    return Number.isFinite(num) ? num : fallback
  }
  function numberParam(name, fallback) {
    return finiteNumber(params[name], fallback)
  }
  function boolParam(name, fallback) {
    if (typeof params[name] === 'boolean') return params[name] ? 1 : 0
    return fallback ? 1 : 0
  }
  function selectParam(name, values, fallbackIndex) {
    var raw = params[name]
    var value = raw != null && typeof raw === 'object' ? raw.characters : raw
    var index = values.indexOf(value)
    return index >= 0 ? index : fallbackIndex
  }
  function colorParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.r, fallback[0]),
      finiteNumber(value.g, fallback[1]),
      finiteNumber(value.b, fallback[2]),
      finiteNumber(value.a, fallback[3]),
    ]
  }
  function pointParam(name, fallback) {
    var value = params[name] || {}
    return [finiteNumber(value.x, fallback[0]), finiteNumber(value.y, fallback[1])]
  }
  function pointRadiusParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.radius, fallback[2]),
    ]
  }
  function pointPointLineParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.x2, fallback[2]),
      finiteNumber(value.y2, fallback[3]),
    ]
  }
  function pointAngleRadiusParam(name, fallback) {
    var value = params[name] || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      finiteNumber(value.radius, fallback[2]),
      finiteNumber(value.angle, fallback[3]),
    ]
  }
  function colorPointParam(name, fallback) {
    var value = params[name] || {}
    var color = value.color || {}
    return [
      finiteNumber(value.x, fallback[0]),
      finiteNumber(value.y, fallback[1]),
      0,
      0,
      finiteNumber(color.r, fallback[2]),
      finiteNumber(color.g, fallback[3]),
      finiteNumber(color.b, fallback[4]),
      finiteNumber(color.a, fallback[5]),
    ]
  }
  function gradientParam(name, fallback) {
    var value = params[name] || {}
    var stops = Array.isArray(value.stops) && value.stops.length > 0 ? value.stops : fallback
    // Layout: 8 stop colors (rgba), then 8 positions packed 4-per-vec4, then the live count.
    var out = new Array(44).fill(0)
    var count = Math.min(stops.length, 8)
    for (var i = 0; i < count; i++) {
      var stop = stops[i] || {}
      var color = stop.color || {}
      out[i * 4] = finiteNumber(color.r, 0)
      out[i * 4 + 1] = finiteNumber(color.g, 0)
      out[i * 4 + 2] = finiteNumber(color.b, 0)
      out[i * 4 + 3] = finiteNumber(color.a, 1)
      out[32 + i] = finiteNumber(stop.position, 0)
    }
    out[40] = count
    return out
  }
  var output = frame.output || {}
  var width = Math.max(1, finiteNumber(output.width, 1))
  var height = Math.max(1, finiteNumber(output.height, 1))
  var time = 0
  var outputPad = 0
  var inputPad = 0
  var inputWidth = Math.max(1, width - 2 * outputPad)
  var inputHeight = Math.max(1, height - 2 * outputPad)
  device.queue.writeBuffer(
    frame.state.uniformBuf,
    0,
    new Float32Array([
      time,
      width,
      height,
      outputPad,
      inputWidth,
      inputHeight,
      inputPad,
      0,
      selectParam('shape', ['diamond', 'circle', 'box', 'triangle', 'hexagon', 'cross', 'ring'], 0),
      0,
      0,
      0,
      selectParam('gridLayout', ['grid', 'brick', 'hex'], 0),
      0,
      0,
      0,
      numberParam('size', 32),
      0,
      0,
      0,
      ...pointAngleRadiusParam('transform', [50, 50, 100, 0]),
      numberParam('strokeWidth', 0),
      0,
      0,
      0,
      ...colorParam('shapeColor', [1, 1, 1, 1]),
      ...colorParam('bgColor', [0.102, 0.102, 0.18, 1]),
      ...colorParam('strokeColor', [0.533, 0.533, 0.533, 1]),
      numberParam('zoom', 1),
      numberParam('softness', 0),
      boolParam('clipToCell', true),
      0,
      ...pointParam('offset', [0, 0]),
      0,
      0,
    ]),
  )
  var outputFormat = frame.output.format
  if (frame.state.pipeline == null || frame.state.pipelineFormat !== outputFormat) {
    frame.state.pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: {
        module: frame.state.module,
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
        module: frame.state.module,
        entryPoint: 'fs_main',
        targets: [{ format: outputFormat }],
      },
      primitive: { topology: 'triangle-list' },
    })
    frame.state.pipelineFormat = outputFormat
  }
  var bindGroup = device.createBindGroup({
    layout: frame.state.pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: frame.state.uniformBuf } }],
  })
  var encoder = device.createCommandEncoder()
  var pass = encoder.beginRenderPass({
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

export const manifest = {
  version: 2,
  name: 'Pattern Grid',
  isAnimated: false,
  usesMouse: false,
}
