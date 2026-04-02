---
name: plan
description: Create a Ryzome plan canvas from a description of what you want to accomplish
args:
  - name: goal
    description: What you want to plan
    required: true
    type: string
---

The user wants to create a Ryzome plan canvas. Use the `create_ryzome_plan` tool to create it.

**Goal:** {{goal}}

Follow these steps:
1. Break the goal down into 3-8 sequential steps. Each step should have a clear title and a 1-2 sentence description.
2. Call `create_ryzome_plan` with a descriptive title and the steps array.
3. Report the canvas URL back to the user.

Keep step descriptions concise — the canvas is for visual reference, not documentation.
