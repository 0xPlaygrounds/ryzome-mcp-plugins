---
"@ryzome-ai/hermes-ryzome": patch
---

Add a proper `README.md` for the PyPI landing page (install, configure, tool table, env vars, troubleshooting) and point `pyproject.toml` at it so the sdist/wheel embed it. Also fix the Hermes publish workflow to build workspace dependencies (`pnpm --filter @ryzome-ai/hermes-ryzome... build`) so `@ryzome-ai/ryzome-core` is built before hermes' `tsc` runs.
