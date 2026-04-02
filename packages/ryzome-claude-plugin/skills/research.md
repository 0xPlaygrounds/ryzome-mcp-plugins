---
name: research
description: Create a Ryzome research canvas organizing findings on a topic
args:
  - name: topic
    description: The research topic or question
    required: true
    type: string
---

The user wants to create a Ryzome research canvas. Use the `create_ryzome_research` tool.

**Topic:** {{topic}}

Follow these steps:
1. Organize the topic into a central question node and 3-6 finding/aspect nodes that branch from it.
2. Call `create_ryzome_research` with the topic, a summary, and the findings array.
3. Report the canvas URL back to the user.

Each finding should have a concise title and 1-3 sentence description covering the key insight.
