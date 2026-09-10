// Per-fixture metadata. `snapshot` chooses what the e2e suite does:
//   pixel — capture the fixture's canvas into test/fixtures/<name>/actual.png.
//           Compare against test/fixtures/<name>/expected.png in the dev UI
//           (`pnpm dev` → /?compare).
//   smoke — assert the runtime mounted without uncaught errors; no capture.
export type SnapshotMode = 'pixel' | 'smoke'

export type FixtureSpec = {
  name: string
  title: string
  snapshot: SnapshotMode
}

export const fixtures: readonly FixtureSpec[] = [
  {
    name: 'circle-with-bloom-effect',
    title: 'Circle with bloom effect (HTML-in-Canvas)',
    snapshot: 'pixel',
  },
  {
    name: 'custom-fills',
    title: 'Custom Fills',
    snapshot: 'pixel',
  },
  {
    name: 'multiple-effects',
    title: 'Multiple Effects',
    snapshot: 'pixel',
  },
  {
    name: 'animated-fill',
    title: 'Animated fill',
    snapshot: 'pixel',
  },
  {
    name: 'mouse-fill',
    title: 'Mouse fill',
    snapshot: 'pixel',
  },
]
