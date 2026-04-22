# @ryzome-ai/hermes-ryzome

## 1.0.0

### Major Changes

- b2c6167: `@ryzome-ai/hermes-ryzome` is no longer published to npm. The Hermes plugin ships as a PyPI-only Python package (`hermes-ryzome-plugin`) whose wheel bundles the compiled Node runner (`ryzome_hermes_plugin/_runner.js`). The `npx -y @ryzome-ai/hermes-ryzome@<ver>` fallback and the `ryzome-hermes-runner` PATH lookup have been removed from `runtime.py`; the runner is now resolved from the bundled wheel asset, a local `dist/runner.js` dev build, or the `RYZOME_HERMES_RUNNER` env override.

## 0.1.2

### Patch Changes

- @ryzome-ai/ryzome-core@0.2.4

## 0.1.1

### Patch Changes

- Updated dependencies [ba13c7d]
- Updated dependencies [d0c8867]
  - @ryzome-ai/ryzome-core@0.2.3

## 0.1.0

### Minor Changes

- d296080: Add a native Hermes plugin package that registers the full Ryzome tool surface through a Python plugin wrapper backed by the existing TypeScript `toolRegistry`.

  The new package includes a Node runner, generated Hermes tool schemas, setup and status CLI commands, parity tests, and version-sync wiring for the Python metadata.

### Patch Changes

- Updated dependencies [2c39852]
  - @ryzome-ai/ryzome-core@0.2.2
