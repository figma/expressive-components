# Contributing

Open an issue to discuss a bug or substantial API change, or submit a pull request
with a focused change and a description of the behavior it addresses.

Use Node.js 22.12 or newer and npm. Run `npm ci`, then `npm run dev` to explore the
fixtures. Before submitting a change, run:

```sh
npm run check
npm run build:demo
npx playwright install --with-deps chromium
npm test
npm pack --dry-run
```

Include a fixture or regression test for rendering changes. Update screenshots
only when the intended visual output changes, using Linux x86-64 and the pinned
Playwright Chromium version. Review and commit the changed baseline images.

Keep library code under `src/`, browser fixtures under `test/fixtures/`, and
Playwright specs under `test/e2e/`. Generated files, dependencies, and build output
are ignored. Commit `package-lock.json` when changing dependencies so fresh clones
and CI resolve the same versions.

The package is ESM, uses explicit `.js` extensions for imports within library
source, and keeps React as a peer dependency. Run `npm pack --dry-run` to check the
release contents; only `dist/`, package metadata, the README, and license should
ship. Publishing to npm is a separate maintainer action.

By contributing, you agree that your contributions are licensed under this
repository's MIT license.
