# Putting the video in Notion

The MP4 exists only in Notion. The repository holds the project that makes it and a `video` entry in `pages.json`. Use the Notion MCP connector (fetch, create-file-upload, update-page).

## Upload
1. `create-file-upload` with the filename (snake_case, for example `topic_llms_two_bets.mp4`) and `content_type` **`video/mp4`**. The type inferred from the extension, `application/mp4`, is rejected on POST.
2. Send the file with a multipart POST to the upload URL it returns, with the same `video/mp4` type. Keep the file-upload id.

## Place it under the embed
- A migrated page holds, in order: the HTML embed (this repo's `index.html`, always first), the one-line source note, then the video, then child pages. The video goes **directly below the HTML embed** (after the source line when there is one), as
  `<video src="file-upload://<file upload id>">Video: <PAGE TITLE></video>`
- Insert it with a small `update_content` edit anchored on the text just before it. Never `replace_content` on a page with child pages or databases; on such a page leave every `<page>`, `<database>` and other tag untouched.
- **Replacing this page's own earlier video** (a remake or re-voice): replace that `<video>` tag, matched by its stable `file://` form, not the signed S3 URL a fetch shows (that URL changes on every fetch and never matches). The stable form is `src="file://` followed by the URL-encoded JSON `{"source":"attachment:<id>:<filename>","permissionRecord":{"table":"block","id":"<block id>","spaceId":"<space id>"}}` (the space id is in `CLAUDE.md`), where `<id>` is the S3 folder just before the filename and the block id comes from the `#notion_record=block.<block id>.<space id>` fragment of the fetched URL. The `sync-kb-github` skill documents the same form for embeds.
- **Old videos from before the migration** (a "# Video" heading, a blurb, an MP4 and an italic note on many topic roots) belong to Khalid: leave them in place and tell him; he deletes them himself. Remove one only when he says so.
- Fetch the page afterwards and confirm: the embed is first, the source line is intact, the new video sits under it and plays, child pages and databases are all still there.

## Record it in the repository
- In `technical_knowledge_base/pages.json`, on the page's entry set `"has_video": true` and
  `"video": {"title": "<video title>", "filename": "<file>.mp4", "source": "video/"}`
  (the worked example: `"title": "Topic: llms: the two bets that separate the labs"`, `"filename": "topic_llms_two_bets.mp4"`).
- Commit the `video/` project and `pages.json` (renders, snapshots, `.hyperframes/` and every MP4 are gitignored; check `git status` shows no `.mp4` before committing), `git pull` first, then push to main. No em-dashes in the commit message.
- Publishing the page HTML itself stays with `sync-kb-github`; it keeps the `<video>` tag when it updates the embed.

## Sources distilled
(History: the files named here were removed on 2026-10-17 when this skill replaced them; they remain in git history before commit 1d6d9d18, and the per-topic briefs were in a folder outside the repo. Do not look for them; this skill is the current source.)

`.claude/skills/create-explainer-video/SKILL.md` (Putting it in Notion); `CLAUDE.md` (Notion facts, video uploads, git rules); `.claude/skills/sync-kb-github/SKILL.md` (Videos, stable `file://` form, update_content rules); `technical_knowledge_base/pages.json` (the topic_llm_landscape video entry); memory notes on old root videos left for Khalid to delete.
