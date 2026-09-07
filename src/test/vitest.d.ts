/**
 * `vitest-axe` extends `expect` at runtime via `expect.extend` in setup.ts,
 * but ships its matcher types separately — this wires them into the project's
 * `Assertion` interface so `toHaveNoViolations()` typechecks.
 */
import 'vitest'
import type { AxeMatchers } from 'vitest-axe/matchers'

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface Assertion extends AxeMatchers {}
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
