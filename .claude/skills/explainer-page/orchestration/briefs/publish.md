# Publishing a topic

Since 2026-10-23 publishing is the lead's job and needs no agent: the procedure is the `sync-kb-github` skill. For a finished topic:
1. Each page: `sh html_utils/checkpage.sh <page>` ends `fail=0, emdash 0, errbox 1, clipped 0`; its own checks pass; privacy grep clean.
2. `python3 html_utils/page_finalize.py <child> ... <root>` commits each page's own files with `pages.json`; `git push`; confirm the site's deploy run succeeded and a page loads.
3. Notion: every page of the topic has its link page (new children created under the root with the link line; reused old pages retitled; the root's body is the link line plus its child pages). Record `"notion": "link"` in `pages.json`.
4. New concept owners go into `technical_knowledge_base/OWNERS.md`.
5. `python3 html_utils/sync_status.py --no-build` ends "Published".

(Before 2026-10-23 a publish agent uploaded each page's HTML into a Notion embed, one page at a time; that flow is retired with the embeds.)
