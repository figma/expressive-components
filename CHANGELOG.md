# Changelog

# Unreleased

# Expressive Components v0.2.0 (21 October 2026)

## Added
- Support for the current HTML-in-Canvas draw API with fallbacks to older copy APIs.
- Primary-button tracking and pointer coordinates that account for scaled canvas bounds.

## Changed
- Updated the mouse-fill example and shader contract documentation for device-pixel rendering, including bounded large canvases.

## Breaking changes
- Shader textures now expose native backing-texture pixel dimensions through `width` and `height`. The previous `physicalWidth`, `physicalHeight`, and `dpi` texture metadata is removed. Use native dimensions for texture allocations and multiply CSS-space lengths by `frame.renderScale` for shader calculations.
- `frame.mousePosition` now uses backing-texture pixels instead of CSS pixels, matching shader fragment coordinates. Remove any previous CSS-space pointer conversion when comparing these coordinates.

# Expressive Components v0.1.0

## Added
- Initial release of React components for WebGPU shader fills and effects on DOM content.
- `ShaderFill` for procedural fills and `ShaderEffect` for ordered shader effects.
- TypeScript declarations and the `@figma/expressive-components/source` export for tools that embed editable runtime code.
