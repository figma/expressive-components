# Contributing

Open an issue to discuss a bug or substantial API change, or submit a pull request
with a focused change and a description of the behavior it addresses.

Use Node.js 22.12 or newer and npm. Run `npm ci`, then `npm run dev` to explore the
examples. Before submitting a change, run:

```sh
npm run check
npm run build:examples
npm pack --dry-run
```

Include or update a runnable example for rendering changes. Start `npm run dev`
and manually verify the affected examples in a browser with the required features
enabled; see [the examples guide](examples/README.md).

Keep library code under `src/` and runnable examples under `examples/`.
Pass explicit `width` and `height` props to every `ShaderEffect` and `ShaderFill`
in an example. Generated files, dependencies, and build output
are ignored. Commit `package-lock.json` when changing dependencies so fresh clones
and CI resolve the same versions.

The package is ESM, uses explicit `.js` extensions for imports within library
source, and keeps React as a peer dependency. Run `npm pack --dry-run` to check the
release contents; only `dist/`, package metadata, the README, and license should
ship. Publishing to npm is a separate maintainer action.

By contributing, you agree that your contributions are licensed under this
repository's MIT license.
