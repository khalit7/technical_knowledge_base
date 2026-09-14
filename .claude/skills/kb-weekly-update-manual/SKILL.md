---
name: kb-weekly-update-manual
description: Run the weekly knowledge-base update by hand, Notion first (the source of truth) then a repo sync. Since 2026-09-14 this is the only way the weekly update runs; there is no scheduled cloud task. Use when Khalid asks to run the weekly update.
---

# Weekly update (manual)

The weekly update runs only when Khalid asks for it (decision 2026-09-14: the scheduled
cloud routine "Weekly tech KB update" is stopped; do not recreate it or any other
schedule unless he asks). It works directly against Notion, the source of truth, and
ends with a sync of this repo.

Do not duplicate a run: check the Notion Updates page first; the newest digest's date
starts the window.

To run it:

1. Open the Notion root page (`3c65c17b-0d0d-81c7-b646-e548e65d9446`) and its child
   **Operating guide (for Claude)**. Follow the guide's "weekly update procedure"
   exactly, working in Notion, not in this repo: window, per-topic research, dedupe,
   digest under Updates, topic patches, papers, the Tech news issue (with the
   named-source checklist and the homeless-release check), Tracker boxes, root-page
   date. Keep every touched page's `⏱` estimate line true.
2. When finished in Notion, run `/kb-sync-from-notion` to bring this repo up to date
   and push. The repo sync is the last step of the procedure, not an optional extra.

Never perform the weekly update by editing repo files first: the repo is the mirror.
