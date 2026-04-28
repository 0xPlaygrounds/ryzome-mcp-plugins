---
"@ryzome-ai/ryzome-core": patch
"@ryzome-ai/ryzome-mcp": patch
---

Fix canvas/document namespace drift by reading canvases from document-backed endpoints first, accepting the canonical document list response shape, and falling back to the legacy canvas read endpoint during rollout.
