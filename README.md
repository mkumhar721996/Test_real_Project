# Test_real_Project

## Tooling

Tests run with Node's built-in test runner (`node:test`) against the TypeScript sources
directly via Node's native type-stripping support — this is the canonical way to run tests
in this repo (`npm test`), not Vitest. `typescript` is kept as a devDependency solely for
type-checking (`npm run typecheck`); it is not used to transpile or run tests.