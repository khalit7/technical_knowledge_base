# JavaScript: the event loop, promises and streams

Notion: https://app.notion.com/p/4055c17b0d0d81fe857de8b34db109ea (child of JavaScript and TypeScript: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/javascript_and_typescript/event_loop_promises_and_streams/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting the JavaScript and TypeScript page: the core idea and a hero of the queues around one thread, what differs from Python's asyncio, callbacks to promises to await (a promise is eager), the two queues with the event-loop stepper inline (six real programs, Node's phases, CommonJS against ES modules), concurrency on one thread to scale (the same three jobs as the Python child), the async toolbox (combinators, AbortSignal, unhandled rejections, `forEach`, a concurrency limit) and LLM token streams (async generators, the SSE chunk trap replayed on real chunks). Tabs: Reading, Further reading. Reading: 14 min, plus 9 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs, Node 24.21.0 on an Apple M1 Pro, 2026-10-05.
