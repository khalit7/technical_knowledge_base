# Attention Is All You Need (Transformer)

Notion: https://app.notion.com/p/3c65c17b0d0d81999af7f16f8ed8ee9e (a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in the database)
Site: https://khalit7.github.io/technical_knowledge_base/reference/papers/attention_is_all_you_need_transformer/

`index.html` is the whole page (read it on the site) (one interactive HTML block). It is built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill.

Tabs: The paper (the idea in one sentence with a verdict, the base model's layout as the hero figure, then Problem, Idea, Method, Results with the Table 2 chart, Why it matters, each anchored into the arXiv HTML), Run a Transformer (a real toy encoder-decoder trained like the paper's, running in the browser), The paper's tables rebuilt (Table 1 calculator, Table 3, the parameter recount, Table 4), Then and now (the 2017 block morphing into a 2026 one), Further reading. Rebuilt to the teaching contract on 2026-10-24 (light pass for papers); `src/README.md` says what changed.

This was the first paper page; the recipe now lives in `.claude/skills/explainer-page/page-kinds/paper.md`.
