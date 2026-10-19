---
name: sync-kb-github
description: Sync the Technical knowledge base from this repository (the source of truth) to Notion and GitHub. Rebuild every HTML-only page, upload each one whose index.html differs from what Notion holds, then commit and push. Videos are never stored in the repository. Use when Khalid asks to sync, publish or push the knowledge base.
---

# sync-kb-github

**This repository is the source of truth; Notion only displays it.** A migrated page in Notion holds exactly: one HTML block (this repo's `index.html`), one line naming its source folder here, and, where it has them, its video and its child pages. The sync makes Notion match the repository and pushes the repository to GitHub. It never copies anything from Notion into the repository.

## Use when
Khalid asks to sync, publish, push, or "update Notion". Run it after building or changing pages. Nothing runs it automatically.

## State-derived
`technical_knowledge_base/pages.json` lists every Notion page of the knowledge base (path, title, Notion id, status). For each page with `"status": "html_only"`, `published_sha256` is the hash of the `index.html` Notion holds now. `html_utils/sync_status.py` rebuilds every page and lists those whose hash differs: that list is the whole job. Every `build.sh` pins the repo's Python (`.venv`, 3.12, from `uv sync`) and the locale (`en_US.UTF-8`, which sets the order of globbed parts), so a rebuild gives the same bytes whichever shell runs it. It does not depend on what changed since the last run, so a missed run is caught by the next one.

## Steps
1. `git pull`; check the working tree. Uncommitted changes to a page are fine if they are what is being published; anything unexpected, ask Khalid.
2. `python3 html_utils/sync_status.py`. Fix every `PROBLEM` line first (a failed build, a folder missing from `pages.json`).
3. For each `PUBLISH` page:
   1. `sh html_utils/checkpage.sh <path>` must end `fail=0`, `emdash 0`, `errbox 1`, `clipped 0`. Do not publish a failing page.
   2. **Upload:** Notion `create-file-upload` with `filename` `<folder name>.html` (content type inferred, `text/html`), then one multipart POST of `<path>/index.html` to the returned `upload_url` with every returned header: `curl -s -X POST "<upload_url>" -H "authorization: <value>" -F "file=@<path>/index.html;type=text/html;filename=<folder name>.html"`. Note the `file-upload://<id>`.
   3. **Fetch the Notion page** and compare it with what it should hold (embed, source line, video, child pages). If it has anything else (text someone added in Notion), stop and show Khalid: that is knowledge that belongs in the repository first.
   4. **Write it:**
      - No child pages or databases on the page: one `replace_content` with
        `<embed src="file-upload://<id>">Interactive: <title></embed>` then a new line:
        ``The interactive page above is this page: read its Reading tab first. Its source is in the technical_knowledge_base repository at `<path>/`.``
        (keep a `<video>` tag after the line if the page has one, in its stable `file://` form below).
      - With child pages or databases: never `replace_content`. Use `update_content` to swap only the embed tag (matched by its stable form) and, if needed, the source line; leave every `<page>`, `<database>` and `<video>` tag untouched. A root still holding old written text: `insert_content` the embed and source line at the start, then delete the old text in small chunks, keeping "# Video", its paragraph, the `<video>` tag, italic notes and every `<page>` tag.
      - A reused old Notion page whose title changed: `update_properties` with the new title from `pages.json`.
      - An old page with no new equivalent: never delete it yourself. Check coverage, report, and on Khalid's choice retitle it "TO DELETE: <title>"; he deletes it.
      - **Stable form for matching an existing embed or video:** a fetched tag shows a signed S3 address that changes on every fetch and never matches. Match `src="file://` followed by the URL-encoded JSON `{"source":"attachment:<id>:<filename>","permissionRecord":{"table":"block","id":"<block id>","spaceId":"13e79c56-ebab-4528-83aa-967a204b1f04"}}`, where `<id>` is the S3 folder just before the filename and the block id comes from the `#notion_record=block.<block id>.<space id>` fragment. Since October 2026 a fetch shows the tag as `notion-file-block://<block id>/<attachment id>?space_id=<space>&name=<filename>` instead; that form does not match either, but it carries both ids, so the stable form can be built from it directly (2026-10-19: the first id is the block, the second the attachment).
   5. Fetch again and confirm: the embed is first, the source line is right, children and video are intact.
   6. `python3 html_utils/page_finalize.py <path>` (papers: `paper_finalize.py <slug>`): marks it `html_only`, records the published hash and commits the folder with `pages.json`. It commits the whole folder, so a root sweeps in its children's files: commit or stash unrelated work in progress first.
4. `python3 html_utils/sync_status.py --no-build`: it must say Notion is up to date.
5. `git push`.

## Videos
MP4s are never committed (`.gitignore` blocks them). A page's HyperFrames project (script, storyboard, compositions, narration audio) lives in `<page>/video/`; the rendered MP4 is uploaded to Notion by the `explainer-video` skill and exists only there.

## Pages not migrated yet
Folders whose `pages.json` status is `not_migrated` hold only a README: their content is still the old written page in Notion and the sync leaves them alone. Converting one is the `explainer-page` skill (`page-kinds/migrate-or-fold.md`).

## Report
Pages published (with file-upload ids), pages skipped and why, anything found in Notion that was not in the repository, and the commit pushed.
