import { ShaderEffect, DEFAULT_MANIFEST } from '@figma/expressive-components'
import { setup, render } from './effect'

export default function MouseFill() {
  return (
    <ShaderEffect
      className="size-[256px]"
      shaders={[
        {
          setup,
          render,
          params: {},
          manifest: { ...DEFAULT_MANIFEST, usesMouse: true, name: 'mouse-fill' },
        },
      ]}
    />
  )
}
