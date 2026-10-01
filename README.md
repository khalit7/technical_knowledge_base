# Technical knowledge base

Khalid's Technical knowledge base. This repository is the source of truth; the Notion workspace displays it. Every migrated page is one self-contained interactive HTML file (a Reading tab with inline visualisations and animations, standalone visualisation tabs, and Further reading), built from the sources in its folder and uploaded to Notion as that page's only content.

```
technical_knowledge_base/      the pages, in the same tree as Notion
  models_and_training/
    topic_llms/                index.html + src/ + video/, and one folder per child page
    topic_llm_training_and_post_training/   (not migrated yet)
    ...
  systems_and_performance/  agents_and_retrieval/  measurement/
  engineering_foundations/  reference/
  pages.json                   every page: path, Notion title and id, status, published hash
html_utils/                    build checks, publish status, templates, ideas and methodology
video_utils/                   Chatterbox Turbo narration for HyperFrames videos
.claude/skills/                create-interactive-html, create-explainer-video, sync-KB-github, HyperFrames
```

Migrated so far: Topic: llms and its 17 child pages. The other folders are placeholders until their pages are converted.

Setup: `uv sync`; `cd html_utils && npm ci`; for videos see `video_utils/README.md`.
