---
name: sync-kb-github
description: Publish the Technical knowledge base from this repository (the source of truth). A changed page is checked, committed and pushed; GitHub Actions rebuilds the public reading site (GitHub Pages) from main. Notion is a thin index with the same tree, where each page is one link to its page on the site (plus its video and child pages); this skill creates, renames and moves those link pages. Use when Khalid asks to sync, publish or push the knowledge base, or after building or changing pages.
---

# sync-kb-github

**This repository is the source of truth. The reading site shows it; Notion links to it.**
- **The site**: https://khalit7.github.io/technical_knowledge_base/ is built from `main` by `.github/workflows/site.yml` on every push that touches a page (`html_utils/build_site.py` plus Pagefind search). Its landing page opens with What's new (`html_utils/whats_new.py`), then the learning map built from each topic page's `"prereqs"` in `pages.json` by `html_utils/learning_map.py`; an unknown prerequisite id or a cycle fails the build, so run `python3 html_utils/learning_map.py check` before every push. Public to read; only Khalid can push. Details: [site.md](site.md).
- **Notion**: the same tree of pages under "Technical knowledge base" (`3c65c17b-0d0d-81c7-b646-e548e65d9446`). Each knowledge-base page holds exactly one link line to its site page, then its video (if it has one) and its child pages. Nothing else. Notion never holds knowledge.

## The link line
Every Notion page's body starts with this one paragraph, and has nothing else except its `<video>` block (with its "# Video" heading if it had one) and its `<page>` / `<database>` tags:
```
**[Open this page →](https://khalit7.github.io/technical_knowledge_base/p/<notion id without dashes>/)**
```
The `p/<id>/` address is a redirect the site build writes for every page in `pages.json`, so the link survives a page moving or being renamed in the repo.

## Steps: publishing changed pages
1. `git pull`; check the working tree.
2. `python3 html_utils/sync_status.py` (rebuilds every page; use `--no-build` while agents are editing pages). Fix every `PROBLEM`.
3. A new page needs its Notion link page first (next section): its id goes in its `pages.json` entry.
4. For each `UNCOMMITTED` page: `sh html_utils/checkpage.sh <path>` ends `fail=0, emdash 0, errbox 1, buddy 1, clipped 0` (read the exit status; never pipe it into a commit); `python3 html_utils/ledger.py check <path>` prints problems 0 where the page has `src/ledger.json`; the page's own checks in `src/` pass; privacy grep (`engineering_foundations/topic_protocols/src/.private_patterns`; in a cloud sandbox with a neutral `USER`/`HOME`) is clean. When a header changed, `python3 html_utils/check_times.py --fix` updates the times other pages quote; rebuild and commit the pages it lists, and report its AMBIGUOUS lines.
5. Commit each page's own files with explicit paths (never `git add -A`, never the whole topic folder: a root's folder holds its children):
   ```
   git add <page>/index.html <page>/README.md <page>/src <page>/img technical_knowledge_base/pages.json && git commit
   ```
   (leave out `<page>/img` when the page has none; add `technical_knowledge_base/OWNERS.md` or a section README such as `whats_new/tech_news/README.md` when the change touched them). This is the one publishing command; every other doc points here.
6. `git push`, but only when no `site` run is in progress (`gh run list --limit 1`; a push cancels the running deploy). Check the deploy: the run for your commit is `success` and the changed page loads on the site. A timed-out deploy is fixed by the next push or `gh run rerun`.
7. `python3 html_utils/sync_status.py --no-build` ends with "Published: ...".

## Notion link pages
Use the Notion connector (load its tools with ToolSearch). Space id `13e79c56-ebab-4528-83aa-967a204b1f04`.
- **Fetch the page first.** If it holds any text that is not the link line, a video or child pages (someone wrote knowledge in Notion), stop and show Khalid: it belongs in the repository first (in an unattended run, leave that page untouched, carry on, and name it in the report). An old video from before the migration may still sit in a Notion page; leave it unless Khalid asks.
- **A new page** (a new topic, child, paper, article or tech-news issue): `create-pages` under its parent (a Papers row under data source `collection://d440058d-ec1c-4b72-b141-046d5d969389` with its properties) with the link line as content; add its `pages.json` entry (path, exact title, id, parent or section, `status` `html_only`), then commit and push so the redirect exists. A topic page (not a paper or tech-news issue) also gets `"prereqs"`: the ids of its strict prerequisites (see the teaching contract's "You need"); `[]` for a foundation.
- **Editing a page body**: `replace_content` only on a page without child pages or databases; on one with them (every topic root, Papers, Tech news, Articles) only small `update_content` edits that leave every `<page>`, `<database>` and `<video>` tag untouched. Fetch again and confirm only the link line, video and child tags remain.
- **A renamed page**: `update_properties` with the new title; update `pages.json`. **A moved page**: move it in Notion under its new parent; update the path in `pages.json`. The link line does not change.
- **An old page with no equivalent**: never delete it; retitle "TO DELETE: <title>" and tell Khalid.
- **A page merged into another** (its content moved, its folder removed): add its id to the survivor's `"aliases"` list in `pages.json`, so `p/<old id>/` keeps redirecting to the survivor; remove its own `pages.json` entry; rewrite any `"prereqs"` that name its id to the survivor's id (an alias still resolves but `learning_map.py check` warns); retitle its Notion page "TO DELETE: <title> (merged into <survivor>)", keeping its link line; tell Khalid.

## pages.json
One entry per page: `path`, `title`, `id`, `parent` or `section`, `status`, and `prereqs` for topic pages (optional `aliases`, `reader` on every paper page (`{"arxiv": "<id>v<n>"}`, the paper reader), and `video` once its Notion page has one). `status` is `html_only` for every page; `not_migrated` now marks only the two container entries, Papers and Tech news, which have no page of their own: the site shows them as cards of their children (`html_utils/whats_new.py`) and their Notion pages hold the database or child pages.

## Videos
MP4s are never committed (`.gitignore` blocks them). A page's HyperFrames project lives in `<page>/video/`; the rendered MP4 is uploaded to the page's Notion page by the `explainer-video` skill, under the link line, and exists only there.

## Report
Pages committed and pushed, the deploy run's result, Notion pages created, renamed or moved, anything found in Notion that was not in the repository.
