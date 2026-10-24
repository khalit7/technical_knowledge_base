# Context engineering: window budgets, caching, compaction, memory files, subagents

Notion: https://app.notion.com/p/3f15c17b0d0d811292cee46514370431 (child of Topic: agentic-harnesses, https://app.notion.com/p/3c65c17b0d0d81d881a8fe98b4cff7bb)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/context_engineering/

`index.html` is the whole page (read it on the site) (one interactive HTML block), built from `src/` with `sh src/build.sh` and published with the `sync-kb-github` skill. A new page: there was no old Notion text.

Tabs: Reading (the core idea and hero, sections 1 to 10, depth in closed blocks) and Further reading; rebuilt to the teaching contract on 24 October 2026, when the three lab tabs moved inline and the Agent memory layers page (Mem0, Graphiti, Letta) was folded in as section 8. Evidence: real Claude Code 2.1.290 sessions recorded on 6 October 2026 on a Claude subscription (redacted copies in `src/recordings/`), needle-test calls to Claude Haiku 4.5 and to a local Qwen3-4B on Apple M1 Pro, a tool-output policy measurement on the parent page's 491 KB log, and the memory-layer runs of 6 October 2026 (in `src/memory_layers/`). See `src/README.md`.
