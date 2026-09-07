import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    // CSS is not processed: every assertion is about semantics (roles, names,
    // attributes) or about class strings, neither of which needs the compiled
    // stylesheet. Loading Tailwind here would cost seconds per run for nothing.
    css: false,
  },
})
