# Expressive Components

React components for WebGPU shader fills and effects on DOM content. Run shader
modules exported from Figma or write your own `setup` and `render` functions.

- **`ShaderFill`** renders a procedural shader into a canvas, with optional masking.
- **`ShaderEffect`** applies an ordered shader chain to a DOM subtree or renders
  shaders without children.

This is experimental browser technology. Fills require WebGPU in a secure context
(HTTPS or localhost). Effects on DOM content also require
[HTML-in-Canvas](https://github.com/WICG/html-in-canvas), currently available in
recent Chromium builds with experimental web platform features enabled. When
initialization fails, `ShaderEffect` renders its children as ordinary DOM and
`ShaderFill` renders nothing. React 18.3 and 19 are supported.

## Get started

Use Node.js 22.12 or newer. This repository builds independently with npm and public
registry dependencies.

```sh
git clone https://github.com/figma/expressive-components.git
cd expressive-components
npm ci
npm run build
npm run dev
```

Open <http://127.0.0.1:9234> to explore the examples. For DOM effects, enable
`chrome://flags/#enable-experimental-web-platform-features` and restart Chrome.

The package is named `@figma/expressive-components`. To use it in another project
before a registry release, run `npm pack` here and install the resulting `.tgz`
file in that project. React is a peer dependency and must be installed by the
consuming application. This package exports ES modules and TypeScript declarations.
For shader authoring in TypeScript, install `@webgpu/types`, include it in your
`compilerOptions.types`, and enable `skipLibCheck` (its declarations overlap with
the WebGPU types in newer TypeScript DOM libraries).

## Procedural fills

A shader contains `setup`, `render`, `params`, and an optional `manifest`.
Give the canvas a size with `width` and `height`, or size its parent and let it fill
the available space. `mask` accepts a CSS mask such as `url("/star.svg")`.

```tsx
import { ShaderFill, type Shader } from '@figma/expressive-components'
import { setup, render } from './my-shader'

const shader: Shader = {
  setup,
  render,
  params: { intensity: 1.2 },
}

export function Fill() {
  return <ShaderFill shader={shader} width={320} height={240} />
}
```

See the complete [pattern grid example](examples/pattern-grid/index.tsx) for a
procedural shader and its parameters.

## Effects on DOM content

Pass an ordered `shaders` array. The first shader receives the rasterized children;
each subsequent shader receives the previous shader's output. The last shader
renders into the canvas. Pass `width` and `height` to size the canvas.

```tsx
import { ShaderEffect, type Shader } from '@figma/expressive-components'
import { setup, render } from './bloom'

const shaders: Shader[] = [{
  setup,
  render,
  params: {
    glowColor: { r: 1, g: 0.4, b: 1, a: 1 },
    threshold: 0.6,
    intensity: 1.2,
    radius: 20,
  },
}]

export function GlowingCircle() {
  return (
    <ShaderEffect shaders={shaders} width={118} height={118}>
      <svg viewBox="0 0 118 118" width="118" height="118">
        <circle cx="59" cy="59" r="59" fill="#D9D9D9" />
      </svg>
    </ShaderEffect>
  )
}
```

The [bloom example](examples/circle-with-bloom-effect) and
[effect ordering example](examples/multiple-effects) contain runnable examples.
`CustomEffect` remains an alias for `ShaderEffect`; it takes the same `shaders` prop.

## Large canvases

The runtime downsamples canvas backing stores and its input/intermediate textures
when either device-pixel dimension exceeds 4096 (or the GPU device limit, if lower).
CSS dimensions and shader-facing logical dimensions stay unchanged; large canvases
trade pixel sharpness for bounded allocations. The same limit applies at mount and
on resize, including Retina displays.

Shader-owned textures are outside this cap. Shaders allocating scratch textures
should use the input texture's `physicalWidth` / `physicalHeight` metadata rather
than its logical `width` / `height` if they need to match the bounded backing store.

Try the [large texture example](examples/large-texture/index.tsx) to test downsampling
and resizing with DOM content and a two-effect chain.

## Shader contract

```ts
import type { CustomEffectState, Manifest } from '@figma/expressive-components'

export function setup(device: GPUDevice, frame: CustomEffectState): void {
  // Create reusable pipelines, buffers, and textures. Store them in frame.state.
}

export function render(device: GPUDevice, frame: CustomEffectState): void {
  // Encode commands that render into frame.output, then submit them to device.queue.
}

export const manifest: Manifest = {
  version: 2,
  name: 'My shader',
  isAnimated: false,
  usesMouse: false,
}
```

Both functions are synchronous. `setup` runs before rendering and again when the
shader array changes. Keep shader objects and arrays stable (at module scope or
with `useMemo`) to avoid restarting effects on unrelated React renders. Supply a
new shader object/array when parameters change.

| Frame field | Meaning |
| --- | --- |
| `gpu` | Shared device, canvas context, and `rgba8unorm` texture format |
| `input` | Rasterized DOM or preceding shader output; fills receive a zeroed scratch texture |
| `output` | Current render target; may be `null` during setup |
| `time`, `deltaTime`, `frame` | Elapsed milliseconds, frame delta, and frame counter |
| `mousePosition` | Pointer coordinates in CSS pixels relative to the canvas; `down` is currently always `false` |
| `renderScale` | Currently `1` |
| `params` | The shader's parameter object |
| `state` | Per-shader scratch state shared between setup and render |

Check that `frame.output` is non-null before rendering. Values in `state` are
`unknown`; narrow or cast them to your shader's resource types. Texture `width`
and `height` are logical dimensions; the runtime handles device-pixel sizing.

Set `manifest.isAnimated` to advance the clock and render continuously. Set
`manifest.usesMouse` to track pointer movement and repaint on movement. Include the
manifest on the shader object (`{ setup, render, params, manifest }`). Omitting it
uses `DEFAULT_MANIFEST`, which disables both behaviors.

The runtime shares one GPU device across the page, manages canvas/input/intermediate
textures, and observes resizing. GPU validation, allocation failures, and device loss
show the component fallback (children for `ShaderEffect`, nothing for `ShaderFill`).
After device loss, remounting acquires a fresh shared device. Shader resources stored
in `frame.state` are not explicitly disposed by the runtime.

Fragment positions are texture pixels. For pointer comparisons in CSS pixels, divide
fragment coordinates by the actual backing-to-logical size ratio on each axis
(`physicalWidth / width`, `physicalHeight / height`). This also handles downsampling;
see the mouse fill example.

## Component props

| Component | Props |
| --- | --- |
| `ShaderFill` | `shader`, optional `width`, `height`, `className`, `style`, `mask` |
| `ShaderEffect` | `shaders`, optional `width`, `height`, `children`, `className`, `mask` |

Both components expose TypeScript prop types. `Shader`, `CustomEffectState`,
`Manifest`, the HTML-in-Canvas types, `DEFAULT_MANIFEST`, and `useWebGPUDevice`
are also exported.

Tools that embed editable runtime code can import the source map:

```ts
import { SOURCES } from '@figma/expressive-components/source'
// Record<string, string>, keyed by paths such as "components/ShaderFill.tsx".
```

## Development

```sh
npm ci
npm run check                         # TypeScript, ESLint, library build, and unit tests
npm run build:examples                # Build the example browser
npm run dev                          # Run examples for manual testing
npm pack --dry-run                    # Inspect the publishable package
```

The runtime is type-checked. Use the example browser to manually verify rendering,
animation, pointer input, and shader ordering after making changes.

See [the examples guide](examples/README.md) and [contributing guide](CONTRIBUTING.md).
GitHub Actions runs these checks on pull requests and pushes to `main`.

## License

[MIT](LICENSE), copyright Figma, Inc.
