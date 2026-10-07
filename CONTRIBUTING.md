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

## Changelog and releases

Add user-facing changes to `CHANGELOG.md` under `# Unreleased`, using populated
`## Added`, `## Changed`, `## Fixed`, `## Breaking changes`, `## Deprecated`, or
`## Removed` sections as appropriate. Describe the effect on package users.

Before a release, move its notes under `# Expressive Components vX.Y.Z (D Month YYYY)`
and leave a fresh `# Unreleased` section. The initial `0.1.0` notes are prepared
without a date; add the release date before staging. The version must match
`package.json` and `package-lock.json`. Prerelease headings use the complete version,
for example `# Expressive Components v0.2.0-beta.1 (7 October 2026)`.
Validate the notes with:

```sh
bash scripts/changelog-section.sh CHANGELOG.md 0.1.0
```

Export the release snapshot from the private source repository. The changelog,
release-note helpers, and finalize workflow travel with the distribution snapshot;
they are not included in the npm tarball. The export and Release workflows require
nonempty notes for the exact version before proceeding.

In the distribution repository, dispatch Release on `main` with `dry_run: false`
to stage with provenance. Use a distribution tag such as `beta` or `next` for a
prerelease; staging a prerelease under `latest` is rejected. After reviewing and
approving the staged package on npm, dispatch Finalize Release on `main` with its
exact published version. Finalization tags npm's recorded `gitHead` and uses the
changelog at that commit for the GitHub release, marking prereleases accordingly.

By contributing, you agree that your contributions are licensed under this
repository's MIT license.
