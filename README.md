# Technical knowledge base

Khalid's Technical knowledge base. This repository is the source of truth. Every page is one self-contained interactive HTML file (a Reading tab with the explanation and its visuals inline, tool tabs where a tool earns its own room, and Further reading), built from the sources in its folder.

**Read it at https://khalit7.github.io/technical_knowledge_base/** (built from `main` by `.github/workflows/site.yml`, with full-text search). Notion keeps the same tree as an index: each Notion page is a link to its page on the site, plus its video and child pages.

```
technical_knowledge_base/      the pages, in the same tree as Notion
  models_and_training/
    topic_llm_landscape/       index.html + src/, and one folder per child page
    ...
  systems_and_performance/  agents_and_retrieval/  measurement/
  engineering_foundations/  whats_new/
  pages.json                   every page: path, Notion title and id, status, Notion link state, video
  OWNERS.md                    which page owns each concept
html_utils/                    build checks, audit, ledger, site build, publish status
audit/                         dated measurements of every page
.claude/skills/                explainer-page, explainer-video (HyperFrames vendored inside), sync-kb-github, update-kb
```

How pages are written is the `explainer-page` skill, starting from its teaching contract: the deepest understanding in the least time, a visual beside every core idea, length judged per page with a knowledge ledger so condensing never loses knowledge. The knowledge base is kept current by the `update-kb` skill and published by `sync-kb-github` (commit and push).

Setup: `uv sync`; `cd html_utils && NPM_CONFIG_USERCONFIG= npm ci`; for videos see `.claude/skills/explainer-video/narration/install.md`.
