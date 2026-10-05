# JavaScript and TypeScript: the runtime, the type system, LLM apps and agents

Notion: https://app.notion.com/p/3cd5c17b0d0d81dbac7be3b8686be023 (child of Topic: programming-languages)

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). One page with a part bar (Start here, Part 1, Part 2, Part 3); each part has its own tabs, and each part's sources, real runs and checks live in its own `src/<part>/` folder (see its README).
- Part 1 "JavaScript and its runtime" (`src/ja/`, tabs Reading, Event-loop stepper, JS playground): JavaScript from zero, the event loop, promises, SSE streams, Node, packages, Bun and Deno, V8; the playground runs code live in a Web Worker where the host allows.
- Part 2 "TypeScript" (`src/tb/`, tabs Reading, Narrowing stepper, Will it type-check?, LLM JSON lab): every error from tsc 7.0.2; zod for model output; the root's count_tokens typed.
- Part 3 "LLM apps and agents" (`src/tl/`, tabs Reading, Agent loop stepper, MCP message flow): Anthropic and OpenAI SDKs, agent loops, structured output, Vercel AI SDK, Claude Agent SDK, MCP server and client, serving. No API key used: model answers come from a local mock (`src/tl/code/mock_model.ts`), labelled synthetic.
- Start here (`src/parts/20_tab_start.html`): the map, three routes, five measured findings.
All runs on an Apple M1 Pro, 2026-10-05. npm runs with an empty npmrc in the scratchpad. Replaces the old written pages "JavaScript: zero to expert" (this Notion page, retitled) and "TypeScript: zero to expert" (marked TO DELETE); their claims are checked in each part's `coverage.json`. No child pages, databases or video.
