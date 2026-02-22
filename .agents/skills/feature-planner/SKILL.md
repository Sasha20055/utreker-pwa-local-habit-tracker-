---
name: feature-planner
description: |
  Maintain a project PLAN.md with current "Doing" items and completed "Done" items.
  Trigger this skill whenever you start working on a feature or finish implementing it.
  Use it to quickly report current work-in-progress and completed features for fast status checks.
---

Feature Planner Skill
======================

When to use
- Use this skill at the moment you start a feature: it will record the feature under "Doing".
- Use this skill when you finish a feature: it will move the feature from "Doing" to "Done" with a timestamp.

What it does
- Keeps a single `PLAN.md` at the project root.
- `Doing` section: list of in-progress features with start timestamps.
- `Done` section: list of completed features with completion timestamps.

Quick CLI
---------
The skill provides a small script `scripts/update_plan.py` with commands:

- Start a feature (mark in-progress):

  python3 .agents/skills/feature-planner/scripts/update_plan.py --start "Implement login flow"

- Finish a feature (move to done):

  python3 .agents/skills/feature-planner/scripts/update_plan.py --finish "Implement login flow"

- Show status (prints PLAN.md contents):

  python3 .agents/skills/feature-planner/scripts/update_plan.py --status

Integration
-----------
- You can wire this script into your feature workflow or git hooks (e.g., pre-commit or custom commands) to automatically update `PLAN.md` when you begin or complete work.

Notes for the agent
-------------------
- This skill is triggered when the user states they start or finish a feature. When triggered, run the script above with the feature title.
