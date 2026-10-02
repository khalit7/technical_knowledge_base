# Attention Is All You Need (Transformer)

Notion: https://app.notion.com/p/3c65c17b0d0d81999af7f16f8ed8ee9e (a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in the database)

`index.html` is the whole Notion page body (one interactive HTML block). It is built from `src/` with `sh src/build.sh` and published with the `sync-KB-github` skill.

Tabs: The paper (headline card, then Problem, Idea, Method, Results, Why it matters, each anchored into the arXiv HTML), Run a Transformer (a real toy encoder-decoder trained like the paper's, running in the browser), The paper's tables rebuilt, Then and now (the 2017 block morphing into a 2026 one), Further reading.

This is the first paper page and the template for the rest: `src/PAPER_METHOD.md` is the recipe, `src/README.md` lists the reusable files.
