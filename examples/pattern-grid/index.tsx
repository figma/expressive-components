import { ShaderFill } from '@figma/expressive-components'
import { setup as setupPatternGrid, render as renderPatternGrid } from './pattern_grid'

export default function PatternGrid() {
  return (
    <div>
      <ShaderFill
        shader={{
          setup: setupPatternGrid,
          render: renderPatternGrid,
          params: {
            strokeColor: { r: 0.533, g: 0.533, b: 0.533, a: 1 },
            offset: { x: 0, y: 0 },
            softness: 0,
            transform: { x: 50, y: 50, radius: 100, angle: 0 },
            gridLayout: 'grid',
            zoom: 1,
            clipToCell: 'false',
            bgColor: { r: 0.102, g: 0.102, b: 0.18, a: 1 },
            strokeWidth: 0,
            shapeColor: { r: 1, g: 1, b: 1, a: 1 },
            shape: 'diamond',
            size: 32,
          },
        }}
        width={250}
        height={250}
      />
    </div>
  )
}
