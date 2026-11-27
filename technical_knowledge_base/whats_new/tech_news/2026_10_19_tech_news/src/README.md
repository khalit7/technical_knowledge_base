# 2026-10-19: tech news, source

`../index.html` is the whole page "2026-10-19: tech news" (child of Tech news). Build with `sh build.sh`, which runs `html_utils/issue_page.py` on this folder.

- **`issue.md`**: the issue in the design of 2026-11-27 (one Monday-morning tab, then Further reading): the intro line, the brief for the three weeks, the top stories as cards, New in the knowledge base, and Further reading with every other item of the window in one line. The format is in `html_utils/issue_page.py` and `page-kinds/tech-news.md`.
- **`issue_original.md`**: the issue as first published on 2026-10-19 by the `update-kb` run (window 2026-09-28 to 2026-10-19 from the Notion Source freshness row "Technical KB"; seven sections, every item in full). The new issue was rewritten from it on 2026-11-27, with the notes then kept in `data/annotations.json` (now in git history) folded into the text; nothing new was added.
- **`inputs/`**: the source extracts read for that run.
