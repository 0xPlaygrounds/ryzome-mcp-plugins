# @ryzome-ai/ryzome-core

## 0.2.1

### Patch Changes

- 2e42f57: Fix canvas creation to send explicit Canvas content through the document API and reject non-canvas responses before returning a canvas URL.

## 0.2.0

### Minor Changes

- 2925ea2: Add document create, update, list, and save-to-library support across the plugin and MCP surfaces. Normalize canvas and document workspace URLs so clients open the correct views.

## 0.1.1

### Patch Changes

- 9e348db: Fix documentation drift in sub-package READMEs and remove stale upload_ryzome_image unavailability guard now that the backend supports API key auth on the file-upload route.
