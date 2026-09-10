import {
  StrictMode,
  Suspense,
  lazy,
  useEffect,
  useState,
  type ComponentType,
  type CSSProperties,
} from 'react'
import { createRoot } from 'react-dom/client'
import { fixtures } from './fixtures'
import './index.css'

// Tailwind's preflight (loaded via index.css) resets <button>/<a> back to
// unstyled text, so the harness chrome needs explicit styles to read as
// buttons again.
const controlButton: CSSProperties = {
  font: 'inherit',
  fontSize: 13,
  lineHeight: 1.2,
  padding: '6px 12px',
  border: '1px solid #d4d4d4',
  borderRadius: 6,
  background: '#fff',
  color: '#111',
  textDecoration: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
}

// Primary action (the capture button), tinted Figma blue.
const primaryButton: CSSProperties = {
  ...controlButton,
  background: '#0d99ff',
  borderColor: '#0d99ff',
  color: '#fff',
}

// Vite-native dynamic import map. Keyed by ./fixtures/<name>/index.tsx,
// each value is a () => Promise<Module> loader.
const loaders = import.meta.glob<{ default: ComponentType }>('./fixtures/*/index.tsx')

function loaderFor(name: string) {
  const key = `./fixtures/${name}/index.tsx`
  const loader = loaders[key]
  if (!loader) {
    throw new Error(`Unknown fixture: ${name}`)
  }
  return loader
}

function Index() {
  return (
    <main style={{ padding: 24 }}>
      <h1>Expressive Components fixtures</h1>
      <p>
        Open a fixture to view it in isolation, or open <a href="/?compare">/?compare</a> to review
        captured snapshots.
      </p>
      <ul>
        {fixtures.map((f) => (
          <li key={f.name}>
            <a href={`/?fixture=${f.name}`}>{f.name}</a>
            <span style={{ color: '#666' }}>
              {' '}
              — {f.title} <em>[{f.snapshot}]</em>
            </span>
          </li>
        ))}
      </ul>
    </main>
  )
}

async function captureCanvasToActual(name: string): Promise<string> {
  const canvas = document.querySelector(
    `[data-fixture="${name}"] canvas`,
  ) as HTMLCanvasElement | null
  if (!canvas) {throw new Error('no canvas in fixture stage')}
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) {throw new Error('canvas.toBlob returned null')}
  const r = await fetch(`/__capture?fixture=${encodeURIComponent(name)}`, {
    method: 'POST',
    body: blob,
  })
  if (!r.ok) {throw new Error(await r.text())}
  return 'ok'
}

function Stage({ name }: { name: string }) {
  const Fixture = lazy(loaderFor(name))
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  async function capture() {
    setBusy(true)
    setStatus(null)
    try {
      await captureCanvasToActual(name)
      setStatus(`Wrote test/fixtures/${name}/actual.png`)
    } catch (e) {
      setStatus(`Capture failed: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setBusy(false)
    }
  }

  // Fixed 2048x2048 stage keeps snapshots comparable across machines.
  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <h1 style={{ margin: 0, flex: 1 }}>{name}</h1>
        <a href="/?compare" style={controlButton}>
          compare
        </a>
        <button
          type="button"
          onClick={capture}
          disabled={busy}
          style={{ ...primaryButton, ...(busy ? { opacity: 0.6, cursor: 'default' } : null) }}
        >
          {busy ? 'Capturing…' : 'Capture → actual.png'}
        </button>
      </header>
      {status && <p style={{ color: '#666' }}>{status}</p>}
      <div
        data-fixture={name}
        data-fixture-ready=""
        style={{
          width: 2048,
          height: 2048,
          margin: '24px 0',
          boxShadow: '0 0 0 1px #ddd',
        }}
      >
        <Suspense fallback={<div>Loading {name}…</div>}>
          <Fixture />
        </Suspense>
      </div>
    </main>
  )
}

type FixtureState = { name: string; hasExpected: boolean; hasActual: boolean }

function Compare() {
  const [state, setState] = useState<FixtureState[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [cacheKey, setCacheKey] = useState(0)

  useEffect(() => {
    fetch('/__fixture-state')
      .then((r) => r.json())
      .then(setState)
  }, [cacheKey])

  async function promote(name: string) {
    setBusy(name)
    try {
      const r = await fetch(`/__promote?fixture=${encodeURIComponent(name)}`, {
        method: 'POST',
      })
      if (!r.ok) {
        const msg = await r.text()
        alert(`Promote failed: ${msg}`)
      } else {
        setCacheKey((k) => k + 1)
      }
    } finally {
      setBusy(null)
    }
  }

  if (state == null) {
    return <main style={{ padding: 24 }}>Loading…</main>
  }

  // Stable cache-buster forces <img> reload after promote/capture.
  const v = `?v=${cacheKey}`

  return (
    <main style={{ padding: 24, fontFamily: 'system-ui, sans-serif' }}>
      <h1>Snapshot compare</h1>
      <p>
        <a href="/">← back to index</a> · Open a fixture and click "Capture" to write{' '}
        <code>actual.png</code>. Promote overwrites <code>expected.png</code> with the current{' '}
        <code>actual.png</code> on disk.
      </p>
      {state.map((f) => (
        <section
          key={f.name}
          style={{
            margin: '24px 0',
            padding: 16,
            border: '1px solid #ddd',
            borderRadius: 4,
          }}
        >
          <header style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h2 style={{ margin: 0, flex: 1 }}>
              <a href={`/?fixture=${f.name}`}>{f.name}</a>
            </h2>
            <button
              type="button"
              disabled={!f.hasActual || busy === f.name}
              onClick={() => promote(f.name)}
              title={f.hasActual ? 'Copy actual.png → expected.png' : 'No actual.png yet'}
            >
              {busy === f.name ? 'Promoting…' : 'Promote actual → expected'}
            </button>
          </header>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 16,
              marginTop: 12,
            }}
          >
            <SnapshotCell
              label="expected.png"
              src={f.hasExpected ? `/fixtures/${f.name}/expected.png${v}` : null}
            />
            <SnapshotCell
              label="actual.png"
              src={f.hasActual ? `/fixtures/${f.name}/actual.png${v}` : null}
            />
          </div>
        </section>
      ))}
    </main>
  )
}

function SnapshotCell({ label, src }: { label: string; src: string | null }) {
  return (
    <div>
      <div style={{ fontSize: 12, color: '#666', marginBottom: 4 }}>{label}</div>
      {src ? (
        <img
          src={src}
          alt={label}
          style={{
            display: 'block',
            maxWidth: '100%',
            background: 'repeating-conic-gradient(#eee 0% 25%, #fff 0% 50%) 0/16px 16px',
            boxShadow: '0 0 0 1px #ddd',
          }}
        />
      ) : (
        <div
          style={{
            padding: 24,
            color: '#999',
            border: '1px dashed #ccc',
            textAlign: 'center',
          }}
        >
          (missing)
        </div>
      )}
    </div>
  )
}

const params = new URLSearchParams(window.location.search)
const fixture = params.get('fixture')
const isCompare = params.has('compare')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isCompare ? <Compare /> : fixture ? <Stage name={fixture} /> : <Index />}
  </StrictMode>,
)
