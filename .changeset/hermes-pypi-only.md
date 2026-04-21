---
"@ryzome-ai/hermes-ryzome": major
---

`@ryzome-ai/hermes-ryzome` is no longer published to npm. The Hermes plugin ships as a PyPI-only Python package (`hermes-ryzome-plugin`) whose wheel bundles the compiled Node runner (`ryzome_hermes_plugin/_runner.js`). The `npx -y @ryzome-ai/hermes-ryzome@<ver>` fallback and the `ryzome-hermes-runner` PATH lookup have been removed from `runtime.py`; the runner is now resolved from the bundled wheel asset, a local `dist/runner.js` dev build, or the `RYZOME_HERMES_RUNNER` env override.
