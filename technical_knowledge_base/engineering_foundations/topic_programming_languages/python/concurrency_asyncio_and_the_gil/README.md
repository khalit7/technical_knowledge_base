# Python: concurrency, asyncio and the GIL

Notion: https://app.notion.com/p/4055c17b0d0d81bdbee8c37d80b55a0e (child of Python: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/python/concurrency_asyncio_and_the_gil/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting the Python language page: the core idea and hero (who runs Python bytecode at each instant under the GIL, the free-threaded build, an asyncio loop and processes), threads against processes measured on both builds, asyncio from the event loop up (the event-loop stepper on a real trace, debug mode, an HTTP fan-out with Semaphore, TaskGroup and timeout, cancellation, async generators), free-threading in practice (per-block thread lanes on four interpreters, scaling, lost updates, extensions that turn the GIL back on, the wheel survey), subinterpreters measured, and choosing. Tabs: Reading, Further reading. Reading: 17 min, plus 10 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs, CPython 3.14.8, 3.14.8t, 3.15.0rc3 and 3.15.0rc3t on an Apple M1 Pro, 2026-10-05.
