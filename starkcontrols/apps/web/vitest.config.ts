import { defineConfig } from 'vitest/config'

export default defineConfig({
  // The unit suite never renders CSS; overriding postcss here stops Vite from
  // loading postcss.config.mjs, which only Next's build needs.
  css: { postcss: { plugins: [] } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
})
