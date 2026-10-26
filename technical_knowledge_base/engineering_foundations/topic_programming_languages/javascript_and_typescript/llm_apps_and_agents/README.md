# TypeScript: LLM apps and agents

Notion: https://app.notion.com/p/4055c17b0d0d8109aad6e69a87b3bd6f (child of JavaScript and TypeScript: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/javascript_and_typescript/llm_apps_and_agents/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Built 2026-10-26 from Part 3 of the JavaScript and TypeScript page: the core idea and a hero of an LLM app's parts (zod at every boundary where model JSON enters), one SDK call read as data, the SDK's retries and timeouts (a retry timeline), streaming events in two wire formats (stream inspector), the agent loop's guards in TypeScript with four recorded runs, the tool runner, structured output with zod (and what the API does not enforce), conversation state, the Vercel AI SDK and Claude Agent SDK, an MCP server and client in TypeScript, a server that cancels the model call and respects backpressure (cancellation before/after, backpressure bars), and logging with a tiny eval. Tabs: Reading, Further reading. Reading: 23 min, plus 25 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs (Node 24.21.0 on an Apple M1 Pro, 2026-10-05) against a local mock model; no paid calls. The recordings other pages cite live in `src/tl/outputs/`.
