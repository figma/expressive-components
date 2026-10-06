import { useState } from 'react'
import { ShaderEffect, type Shader } from '@figma/expressive-components'
import { setup as setupMonochrome, render as renderMonochrome } from '../multiple-effects/monochrome'
import { setup as setupColorize, render as renderColorize } from '../multiple-effects/colorize_red'

const shaders: Shader[] = [
  { setup: setupMonochrome, render: renderMonochrome, params: {} },
  { setup: setupColorize, render: renderColorize, params: { intensity: 0.5 } },
]
const sizes = [
  { title: 'Large square · 5120 × 5120', width: 5120, height: 5120 },
  { title: 'Large landscape · 6144 × 4608', width: 6144, height: 4608 },
  { title: 'Small · 512 × 512', width: 512, height: 512 },
]

export default function LargeTexture() {
  const [sizeIndex, setSizeIndex] = useState(0)
  const size = sizes[sizeIndex]!
  return (
    <div className="w-full min-w-0 space-y-4">
      <label className="block text-sm font-medium text-zinc-700">
        Canvas size
        <select
          className="mt-2 block w-full rounded-lg border border-zinc-200 bg-white p-2 text-sm focus:outline-violet-500"
          value={sizeIndex}
          onChange={(event) => setSizeIndex(Number(event.target.value))}
        >
          {sizes.map((item, index) => <option key={item.title} value={index}>{item.title}</option>)}
        </select>
      </label>
      <p className="text-sm leading-6 text-zinc-500">
        Scroll to inspect all four corners. The green source becomes red through two effects.
        Switch sizes to test texture reallocation while keeping the canvas mounted.
      </p>
      <div className="h-96 overflow-auto rounded-lg border border-zinc-200" tabIndex={0} aria-label="Large texture preview">
        <ShaderEffect width={size.width} height={size.height} shaders={shaders}>
          <div
            className="relative size-full bg-green-500 text-white"
            style={{ backgroundImage: 'linear-gradient(135deg, transparent, #0008)' }}
          >
            <span className="absolute top-6 left-6 text-4xl">Top left</span>
            <span className="absolute top-6 right-6 text-4xl">Top right</span>
            <span className="absolute bottom-6 left-6 text-4xl">Bottom left</span>
            <span className="absolute right-6 bottom-6 text-4xl">Bottom right</span>
            <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-4xl">
              {size.width} × {size.height}
            </span>
          </div>
        </ShaderEffect>
      </div>
    </div>
  )
}
