---
name: ryzome-status
description: Check Ryzome connection status and list recent canvases
---

Check the Ryzome integration status:

1. Call `list_ryzome_canvases` to verify the API connection is working.
2. If successful, report:
   - Connection status: connected
   - Number of canvases found
   - List the 5 most recent canvases (name, description snippet, URL)
3. If it fails, report the error and suggest checking the API key configuration.

Format the output as a concise status report.
