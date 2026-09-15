import { StrictMode, Suspense, lazy, type ComponentType } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

const examples = [
  {
    name: 'large-texture',
    title: 'Large texture',
    description: 'Oversized DOM content, downsampled to a bounded render texture.',
    category: 'DOM effect',
  },
  {
    name: 'circle-with-bloom-effect',
    title: 'Circle with bloom',
    description: 'A soft glow applied to an SVG circle.',
    category: 'DOM effect',
  },
  {
    name: 'pattern-grid',
    title: 'Pattern grid',
    description: 'A procedural grid of repeating diamonds.',
    category: 'Fill',
  },
  {
    name: 'multiple-effects',
    title: 'Effect ordering',
    description: 'Two shader chains, with their order reversed.',
    category: 'DOM effect',
  },
  {
    name: 'animated-fill',
    title: 'Animated fill',
    description: 'A time-driven fill that changes from red to blue.',
    category: 'Animation',
  },
  {
    name: 'mouse-fill',
    title: 'Mouse fill',
    description: 'Move your pointer across the canvas to guide the fill.',
    category: 'Interaction',
  },
] as const

const loaders = import.meta.glob<{ default: ComponentType }>('./*/index.tsx')
const name = new URLSearchParams(window.location.search).get('example')
const selected = examples.find((example) => example.name === name)
const loader = selected && loaders[`./${selected.name}/index.tsx`]
const Example = loader ? lazy(loader) : null

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <main className="mx-auto max-w-3xl px-6 py-12 sm:px-10 sm:py-20">
      <header className="mb-12 flex items-center gap-2 text-xs font-medium tracking-wide text-zinc-500">
        <span aria-hidden="true" className="size-2 rounded-full bg-violet-500" />
        Expressive Components
      </header>
      {selected && Example ? (
        <>
          <a
            href="/"
            className="rounded-sm text-sm text-zinc-500 transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-500"
          >
            ← All examples
          </a>
          <div className="mt-8 mb-8">
            <p className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-400">
              {selected.category}
            </p>
            <h1 className="text-3xl font-medium tracking-tight text-zinc-950">{selected.title}</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">{selected.description}</p>
          </div>
          <div
            data-example={selected.name}
            className="flex min-h-96 items-center justify-center overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-6 sm:p-12"
          >
            <Suspense fallback={<p className="text-sm text-zinc-400">Loading…</p>}>
              <Example />
            </Suspense>
          </div>
        </>
      ) : (
        <>
          <h1 className="text-4xl font-medium tracking-tight text-zinc-950">Examples</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-zinc-500">
            Small experiments in shader fills, motion, and effects. Open one to explore it in isolation.
          </p>
          {name && (
            <p role="status" className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Unknown example: {name}. Choose an example below.
            </p>
          )}
          <ul className="mt-10 divide-y divide-zinc-200 border-y border-zinc-200">
            {examples.map((example, index) => (
              <li key={example.name}>
                <a
                  href={`/?example=${example.name}`}
                  className="group -mx-3 flex items-center gap-4 rounded-lg px-3 py-6 transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-violet-500 sm:gap-6"
                >
                  <span className="self-start pt-0.5 font-mono text-xs text-zinc-400">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-medium text-zinc-900">{example.title}</h2>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{example.description}</p>
                  </div>
                  <span className="hidden text-xs text-zinc-400 sm:block">{example.category}</span>
                  <span aria-hidden="true" className="text-zinc-400 transition-transform group-hover:translate-x-1 group-hover:text-zinc-900">
                    ↗
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </>
      )}
      <footer className="mt-8 text-xs leading-5 text-zinc-400">
        Requires WebGPU. DOM effects also require HTML-in-Canvas.
      </footer>
    </main>
  </StrictMode>,
)
