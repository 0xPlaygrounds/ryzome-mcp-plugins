# @ryzome-ai/openclaw-ryzome

## 0.4.2

### Patch Changes

- 2c39852: Internal cleanup and code quality pass across the plugin monorepo.

  - `ryzome-core`: tighten `RyzomeClient.getCanvas` / `listCanvases` return types and drop redundant `try/catch` wrappers in tool executors so `RyzomeApiError` propagates directly.
  - `ryzome-mcp`: advertise the server version from `package.json` (no more hardcoded `0.2.0`), share a `resourceIdToString` helper, and clean up stale inline comments.
  - `openclaw-ryzome`: move `@sinclair/typebox` to `devDependencies` (it is only used for type generation at build time) and sync README tool/command tables with the current tool surface.

- Updated dependencies [2c39852]
  - @ryzome-ai/ryzome-core@0.2.2

## 0.4.1

### Patch Changes

- Updated dependencies [2e42f57]
  - @ryzome-ai/ryzome-core@0.2.1

## 0.4.0

### Minor Changes

- 2925ea2: Add document create, update, list, and save-to-library support across the plugin and MCP surfaces. Normalize canvas and document workspace URLs so clients open the correct views.

### Patch Changes

- Updated dependencies [2925ea2]
  - @ryzome-ai/ryzome-core@0.2.0

## 0.3.2

### Patch Changes

- 9e348db: Fix documentation drift in sub-package READMEs and remove stale upload_ryzome_image unavailability guard now that the backend supports API key auth on the file-upload route.
- Updated dependencies [9e348db]
  - @ryzome-ai/ryzome-core@0.1.1
