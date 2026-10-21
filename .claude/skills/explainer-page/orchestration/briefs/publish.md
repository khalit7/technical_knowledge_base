# Brief template: publishing a topic (children, then the root) to Notion

Purpose: the fill-in prompt for the agent (or the lead) that publishes a finished topic to Notion one page at a time: upload each `index.html`, write each child page, retitle reused pages, update the root without touching its video or child tags, record and commit each page, then confirm Notion is up to date.

## How to fill it
- The general procedure is the `sync-kb-github` skill; this template is that procedure specialised for a whole topic. Run it after the link-wiring pass is committed and `git status` is clean apart from what is being published.
- List the reused old pages that need retitling, and the exact old sections of the root to delete and to keep (fetch the root first and copy its headings). An old child with no new equivalent is not deleted by this pass: it was decided with Khalid earlier (rebuilt, folded or retitled "TO DELETE: ...").
- Placeholders as in [common.md](common.md); `{{IDS_SOURCE}}` lists slug, exact title and id per child; `{{REUSED}}` is the slugs of reused pages; `{{OLD_SECTIONS}}` and `{{KEEP}}` describe the root.

---

## Template

Publish the knowledge-base topic "{{TOPIC_TITLE}}" and its {{N}} child pages to Notion. Read CLAUDE.md ("Notion facts worth knowing") and `.claude/skills/sync-kb-github/SKILL.md` for the procedure; never write the scratchpad path into the repo, and never write the upload token anywhere. Child folders, exact titles and ids: {{IDS_SOURCE}}. Load the Notion tools with ToolSearch `select:mcp__notion__notion-fetch,mcp__notion__notion-create-file-upload,mcp__notion__notion-update-page`. Work strictly one page at a time: git operations must never overlap.

For EACH child (folder `{{ROOT_FOLDER}}<slug>`):
1. `sh html_utils/checkpage.sh <folder>` ends fail=0, emdash 0, errbox 1, clipped 0; otherwise stop for that page and report.
2. `notion-fetch` the page id. If it contains `<page>` or `<database>` tags (it has children), STOP for that page and report instead of replacing. If it holds text that is not the old version of this page or the "Being built" placeholder (someone added knowledge in Notion), stop and report: it belongs in the repo first.
3. `notion-create-file-upload` with filename `<slug>.html`; then upload with curl: `curl -s -X POST "<upload_url>" -H "authorization: Bearer <token from upload_headers>" -F "file=@<folder>/index.html;type=text/html;filename=<slug>.html"`, and confirm `"status":"uploaded"`.
4. `notion-update-page` with `replace_content`, `allow_async` false, `new_str` exactly two lines:
   `<embed src="file-upload://<file_upload_id>">Interactive: <exact title></embed>`
   ``The interactive page above is this page: read its Reading tab first. Its source is in the technical_knowledge_base repository at `<folder path>/`.``
5. If the fetched title differs from the exact title (reused old pages: {{REUSED}}), `notion-update-page` `update_properties` `{"title": "<exact title>"}`.
6. Fetch again: the embed is first, the source line is right.
7. `git add <folder> && python3 html_utils/page_finalize.py <folder>` (it marks the page `html_only`, records its hash and commits), then `git push`.

After all children, the ROOT (Notion {{ROOT_ID}}, folder `{{ROOT_FOLDER}}`). It has child pages and often a video, so NEVER `replace_content`.
1. Check it with `checkpage.sh` as above. Fetch it.
2. Create an upload `<root slug>.html` and curl the root `index.html` as above.
3. If the root already has an embed from an earlier publish: `update_content` swapping only the embed tag, matched by its stable `file://` form (see the sync-kb-github skill; a fetched signed S3 URL never matches). Otherwise `insert_content` at position start with the same two-line block (title "{{TOPIC_TITLE}}").
4. Delete the OLD written content with `update_content` operations whose `new_str` is "" (empty), in several chunks, re-fetching between batches: {{OLD_SECTIONS}} (for example the reading-time line and intro, the mermaid taxonomy, "## Deep dives" table, "## Related papers", "## Best starting resources"). KEEP exactly: the new embed and its paragraph, {{KEEP}} (typically "# Video", the paragraph under it, the `<video>` block, any italic note directly under the video) and every `<page ...>` tag, including old children kept for Khalid to decide on. Never use `allow_deleting_content`.
5. Fetch again and verify the structure (headings and tags only).
6. `python3 html_utils/page_finalize.py {{ROOT_FOLDER}}` (note: it stages the whole root folder, which contains the children: they are committed already, so `git status` should show nothing else; check first), `git push`, then `python3 html_utils/sync_status.py --no-build` (it should report nothing left for this topic).

Report (once): each page published (title, upload ok, retitled or not, commit), the root's final structure (headings and tags only), the sync_status output, and anything that failed or was skipped and why.

---

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

The lead's prompts "Publish ML infra to Notion" and "Publish generative to Notion" (2026-10-17); the sync-kb-github skill (upload, stable `file://` form, root-with-children rule); the JAX and RAG root publishes (insert embed, helper deleting old text keeping video and page tags, 2026-10-15); html_utils/page_finalize.py.
