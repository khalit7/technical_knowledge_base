---
name: kb-weekly-update-manual
description: Manual fallback for the weekly knowledge-base update, which normally runs as a scheduled cloud task against Notion (Mondays 07:00 UTC, Opus). Use only when Khalid explicitly asks to run the weekly update by hand or the scheduled run failed.
---

# Weekly update (manual fallback)

The weekly update normally runs in the cloud, directly against Notion (the source of
truth). Routine: "Weekly tech KB update" at https://claude.ai/code/routines (Mondays
07:00 UTC, model Opus, Notion connector attached). Do not duplicate a run that already
happened this week; check the Updates page first.

To run it manually:

1. Open the Notion root page (`3c65c17b-0d0d-81c7-b646-e548e65d9446`) and its child
   **Operating guide (for Claude)**. Follow the guide's "weekly update procedure"
   exactly, working in Notion, not in this repo.
2. When finished in Notion, run `/kb-sync-from-notion` to bring this repo up to date.
   The repo sync is the last step of the procedure, not an optional extra.

Never perform the weekly update by editing repo files first: the repo is the mirror.
