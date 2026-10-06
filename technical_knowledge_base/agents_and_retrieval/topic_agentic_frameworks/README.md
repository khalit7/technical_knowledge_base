# Topic: agentic-frameworks

Notion: https://app.notion.com/p/3c65c17b0d0d81ab8432c54d65b7f8c7

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). The building blocks an agent is assembled from when you do not take a finished harness, taught from zero: workflows versus agents, orchestration libraries, durable execution, structured output, multi-agent patterns, gateways, observability, memory, hosted runtimes, and how to choose. Tabs: Reading (`src/read/`), Same agent, six ways (`src/same/`), Orchestration lab (`src/orch/`), Production stack (`src/ops/`: LiteLLM gateway, OpenTelemetry traces, evals gate, three memory styles), Further reading.
Real runs: Claude Haiku and Sonnet through the owner's subscription (`claude -p`, Claude Agent SDK) and a local Qwen3-4B served by mlx-lm on an Apple M1 Pro, 2026-10-05 and 06; recordings are redacted before they enter the repository.
Seven child pages, each in its own folder: langchain_and_langgraph, claude_agent_sdk, multi_agent_patterns, llm_observability, typed_agent_libraries, gateways_and_routing, agent_memory_layers.
