# 2026-09-21: tech news, source

`../index.html` is the whole page "2026-09-21: tech news" (child of Tech news). Build with `sh build.sh`, which runs `html_utils/issue_page.py` on this folder.

- **`issue.md`**: the issue in the design of 2026-11-27 (one Monday-morning tab, then Further reading): the intro line, the week in brief, the top stories as cards, New in the knowledge base, and Further reading with every other item of the week in one line. The format is in `html_utils/issue_page.py` and `page-kinds/tech-news.md`.
- **`live.md`**: the issue as first published on 2026-09-21 (a saved Notion fetch of 2026-09-23: top stories, then Models, Research, Industry, Compute, Dev tools and Talk of the town, every item in full). The new issue was rewritten from it on 2026-11-27, with the checks, corrections and follow-ups recorded on 2026-10-02 (then in `data/annotations.json`, now in git history) folded into the text; nothing new was added.
- **`inputs/`**: the source extracts read for those checks on 2026-10-02.
