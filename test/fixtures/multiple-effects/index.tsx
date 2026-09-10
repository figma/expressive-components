import { ShaderEffect } from '@figma/expressive-components'
import { setup as setupMonochrome, render as renderMonochrome } from './monochrome'
import { setup as setupColorizeRed, render as renderColorizeRed } from './colorize_red'

export default function MultipleEffects() {
  return (
    <div>
      <div id="monochrome-then-colorize-red">
        <h1>Monochrome then colorize red</h1>
        <ShaderEffect
          shaders={[
            {
              setup: setupMonochrome,
              render: renderMonochrome,
              params: {},
            },
            {
              setup: setupColorizeRed,
              render: renderColorizeRed,
              params: { intensity: 0.5 },
            },
          ]}
        >
          <div className="relative w-[100px] h-[100px] bg-green-500"></div>
        </ShaderEffect>
      </div>
      <div id="colorize-red-then-monochrome">
        <h1>Colorize red then monochrome</h1>
        <ShaderEffect
          shaders={[
            {
              setup: setupColorizeRed,
              render: renderColorizeRed,
              params: { intensity: 0.5 },
            },
            {
              setup: setupMonochrome,
              render: renderMonochrome,
              params: {},
            },
          ]}
        >
          <div className="relative w-[100px] h-[100px] bg-green-500"></div>
        </ShaderEffect>
      </div>
    </div>
  )
}
