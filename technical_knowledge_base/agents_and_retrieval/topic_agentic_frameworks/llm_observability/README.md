# LLM observability: traces, OpenTelemetry GenAI, Langfuse and peers, evals in the loop

Notion: https://app.notion.com/p/3c65c17b0d0d81fe82c0c6e9360afec4 (child of Topic: agentic-frameworks, 3c65c17b0d0d81ab8432c54d65b7f8c7)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_agentic_frameworks/llm_observability/

HTML-only page: `index.html` is the whole page, built by `src/build.sh`. Tabs: Reading (core idea and hero, sections 1 to 9, closed depth blocks including the tail-sampling simulator, per-call cost table and collector configurations), Eight instrumentations, Further reading. Rebuilt to the teaching contract 2026-10-24. Built and measured 6 October 2026: OpenTelemetry GenAI conventions at commit cb10b70, self-hosted Langfuse 4.53.0, otelcol-contrib 0.162.0, two Claude Code 2.1.291 runs (Haiku 4.5) and one local-model run replayed through eight instrumentations. See `src/README.md`.
