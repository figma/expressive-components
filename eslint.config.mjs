import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  // Keep this exported shader fixture verbatim; browser screenshots validate it.
  { ignores: ['test/fixtures/pattern-grid/pattern_grid.ts', 'dist/**', 'demo-dist/**', 'src/source.generated.ts', 'test/e2e/.results/**', 'playwright-report/**', 'blob-report/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      curly: ['error', 'all'],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    },
  },
)
