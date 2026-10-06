import { ShaderEffect, DEFAULT_MANIFEST } from '@figma/expressive-components'
import { setup, render } from './effect'

export default function AnimatedFill() {
  return (
    <ShaderEffect
      width={256}
      height={256}
      shaders={[
        {
          setup,
          render,
          params: {},
          manifest: { ...DEFAULT_MANIFEST, isAnimated: true, name: 'animated-fill' },
        },
      ]}
    />
  )
}
