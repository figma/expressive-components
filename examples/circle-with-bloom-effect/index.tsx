import { ShaderEffect } from '@figma/expressive-components'
import { setup as setup6004_4, render as render6004_4 } from './effect'

export default function CircleWithBloomEffect() {
  return (
    <ShaderEffect
      width={118}
      height={118}
      shaders={[
        {
          setup: setup6004_4,
          render: render6004_4,
          params: {
            glowColor: { r: 1, g: 0.4000000059604645, b: 1, a: 1 },
            threshold: 0.6000000238418579,
            intensity: 1.2000000476837158,
            radius: 20,
          },
        },
      ]}
    >
      <div className="relative size-full" data-name="CircleWithBloomEffect">
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          preserveAspectRatio="none"
          viewBox="0 0 118 118"
        >
          <circle cx="59" cy="59" fill="var(--fill-0, #D9D9D9)" id="CircleWithBloomEffect" r="59" />
        </svg>
      </div>
    </ShaderEffect>
  )
}
