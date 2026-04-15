---
name: ryzome-status
description: Check Ryzome connection status and list recent canvases and documents
---

Check the Ryzome integration status:

1. Call `list_ryzome_canvases` and `list_ryzome_documents` to verify the API connection is working and the full MCP surface is reachable.
2. If both succeed, report:
   - Connection status: connected
   - Number of canvases found
   - Number of library documents found
   - List the 5 most recent canvases (name, description snippet, URL)
   - List the 5 most recent documents (title, content type, URL)
3. If either call fails, report the error and suggest checking the API key configuration.

Format the output as a concise status report.
