# Test harness

The fixture browser exercises procedural fills, bloom on DOM content, animation,
pointer input, and shader ordering. Start it with `npm run dev` and open
<http://127.0.0.1:9234>. Select a fixture or use `/?fixture=pattern-grid`.

## Automated screenshots

```sh
npx playwright install --with-deps chromium
npm test
npm run test:e2e:update  # Deliberately regenerate baselines; review the changes
```

Playwright starts Vite automatically and launches Chromium with WebGPU,
HTML-in-Canvas, and SwiftShader enabled. Tests require a live canvas and compare
its rendered pixels against the committed `test/e2e/*-snapshots/` images. Baselines
are Linux x86-64 output tied to the pinned Playwright version; other platforms may
render differently. Failures write actual images, diffs, and traces to
`test/e2e/.results/`, which is ignored by Git.

## Manual capture

DOM effects require a recent Chromium browser with experimental web platform
features enabled. Procedural fills only require WebGPU.

1. Open a fixture and click **Capture → actual.png**.
2. Open `/?compare` to inspect captured images.
3. Use **Promote actual → expected** to save a manual baseline alongside the fixture.

Manual `test/fixtures/<name>/expected.png` images are separate from Playwright
baselines. Promoting an image in the browser does not update the automated tests.

The local-only Vite middleware provides:

- `POST /__capture?fixture=<name>` to write PNG bytes to a fixture's `actual.png`.
- `POST /__promote?fixture=<name>` to copy that image to `expected.png`.
- `GET /__fixture-state` to list available captures and manual baselines.

The dev server binds to loopback. These endpoints write local files and should
only be used on a trusted development machine. They are absent from built demos.

## Add a fixture

1. Add a default-exported React component at `test/fixtures/<name>/index.tsx`.
2. Register it in `test/fixtures.ts` with snapshot mode `pixel` or `smoke`.
3. Add a test under `test/e2e/` and capture a baseline on Linux x86-64.
4. Review the screenshot and run `npm test` to compare against it.

Tailwind is used by the fixtures, not the runtime. `test/index.css` scopes class
scanning to this directory. New fixtures are discovered by its existing glob.

## Troubleshooting

- **Missing canvas:** inspect browser warnings for WebGPU or HTML-in-Canvas
  initialization failures. The components remove their canvas on failure.
- **Blank DOM input:** ensure the experimental browser features are enabled.
  HTML-in-Canvas copies also require `RENDER_ATTACHMENT` on the destination
  texture, as configured in `src/useShaderRuntime.ts`.
- **No captured image:** the fixture stage must contain a live canvas.
