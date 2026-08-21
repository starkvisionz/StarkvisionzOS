import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // The Worker is a plain fetch handler, so the suite drives `app.fetch`
    // directly with typed doubles for the Hyperdrive and R2 bindings. That keeps
    // the tests hermetic — no workerd process, no database, no bucket — which is
    // what lets them run unchanged in CI. See DECISIONS.md.
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globals: false,
  },
})
