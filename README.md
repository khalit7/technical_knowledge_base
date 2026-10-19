# Technical knowledge base

Khalid's Technical knowledge base. This repository is the source of truth; the Notion workspace displays it. Every migrated page is one self-contained interactive HTML file (a Reading tab with inline visualisations and animations, standalone visualisation tabs, and Further reading), built from the sources in its folder and uploaded to Notion as that page's only content.

```
technical_knowledge_base/      the pages, in the same tree as Notion
  models_and_training/
    topic_llm_landscape/       index.html + src/, and one folder per child page
    ...
  systems_and_performance/  agents_and_retrieval/  measurement/
  engineering_foundations/  reference/
  pages.json                   every page: path, Notion title and id, status, published hash
html_utils/                    build checks and publish status (runtime only)
.claude/skills/                explainer-page, explainer-video (HyperFrames vendored inside), sync-KB-github, update-KB
```

Every page is migrated: 24 topic roots with their child pages, 63 paper pages and the tech-news issues (292 interactive pages). The Papers and Tech news parents are not HTML pages: in Notion each is a one-line description plus its database or child pages. The knowledge base is kept current by the `update-KB` skill (a periodic pass from the date recorded in Notion) and published by `sync-KB-github`.

Setup: `uv sync`; `cd html_utils && npm ci`; for videos see `.claude/skills/explainer-video/narration/install.md`.
