# Examples

Run these examples from the repository root:

```sh
npm ci
npm run dev
```

Open <http://127.0.0.1:9234> and select an example, or navigate directly to
`/?example=pattern-grid`. Vite resolves the package to local `src/` code, so runtime
and example changes reload during development. No library build is required.

Procedural fills require WebGPU. For DOM effects, use a recent Chromium browser,
enable `chrome://flags/#enable-experimental-web-platform-features`, and restart it.

## Manual testing

- `large-texture`: test 5120 × 5120 and 6144 × 4608 DOM content through two shaders.
  Scroll to all four labeled corners and switch between large and small sizes.
  The source should turn red; green indicates the DOM fallback. The canvas CSS size
  remains unchanged while its backing texture stays at or below 4096 per side
  (or the device limit if lower). On Retina, the small size returns to full DPI.

- `pattern-grid`: check that the diamond grid renders at 250 × 250 pixels.
- `circle-with-bloom-effect`: check the 118 × 118 circle and its bloom effect.
- `multiple-effects`: compare both 100 × 100 shader chains; changing their order
  should produce different colors.
- `animated-fill`: check that the 256 × 256 fill changes from red to blue.
- `mouse-fill`: move the pointer over the 256 × 256 fill and check its response. Hold the primary button to turn the disc blue.

Inspect browser warnings if rendering fails. On initialization failure,
`ShaderEffect` falls back to its DOM children and `ShaderFill` renders nothing;
confirm a live canvas exists when testing shader output.

Build the browser with `npm run build:examples`; output goes to `examples-dist/`.
Examples and their development server are excluded from the published package.

## Add an example

1. Create `examples/<name>/index.tsx` with a default-exported React component and
   put its shader files alongside it.
2. Register its name and title in `examples/main.tsx`.
3. Pass explicit numeric `width` and `height` props to each `ShaderEffect` and
   `ShaderFill` component.
4. Run `npm run check` and `npm run build:examples`, then verify it in the browser.

Tailwind utility classes are scanned within `examples/` by `index.css`.
