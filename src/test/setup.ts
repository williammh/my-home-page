import '@testing-library/jest-dom/vitest'
import * as axeMatchers from 'vitest-axe/matchers'
import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

expect.extend(axeMatchers)

afterEach(cleanup)

// jsdom implements neither of these, and both are used at module scope or in
// effects that run on every render — without stubs the whole suite fails on
// import rather than on anything it means to assert.
if (!window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    }),
  })
}

if (!window.ResizeObserver) {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}

// axe probes canvas while checking color-contrast, which jsdom cannot do —
// it logs a "not implemented" error per element and floods the output. The
// contrast rules are unusable in jsdom regardless (no layout, no painting), so
// the stub just quiets them; real contrast checking belongs in a browser.
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() => null) as never
}

// `motion` animates via the Web Animations API, which jsdom only partly has.
if (!Element.prototype.animate) {
  Element.prototype.animate = (() => ({
    finished: Promise.resolve(),
    cancel() {},
    play() {},
    pause() {},
    finish() {},
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof Element.prototype.animate
}
