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
2. **Do not skip step 0: sweep the Blog entries database for unprocessed KB requests.**
   Khalid files requests by writing a row in the `entries` database under his **Blog**
   page (`collection://0fbbc243-d165-40e0-aeee-eea032f950e9`). Query for
   `processed = '__NO__'`, fetch each row's body (the title is never enough), and act
   only on rows that explicitly ask for a KB addition. Tick `processed` to `__YES__`
   only on rows you actually finished, and name any you could not do, with the reason,
   in the digest. The 2026-08-31 run missed five of these, some nine days old, because
   nothing told it to look.
3. When finished in Notion, run `/kb-sync-from-notion` to bring this repo up to date.

Never perform the weekly update by editing repo files first: the repo is the mirror.
