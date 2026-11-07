# Python: concurrency, asyncio and the GIL

Notion: https://app.notion.com/p/4055c17b0d0d81bdbee8c37d80b55a0e (child of Python: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/python/concurrency_asyncio_and_the_gil/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting the Python language page; rebuilt 2026-11-07 on the split layout with renderer v2 stages: a 3D hero (who runs Python bytecode on four cores, six ways: GIL, I/O, processes, subinterpreters, free-threaded, asyncio), threads against processes measured on both builds, asyncio from the event loop up (a 3D replay of the real a2 trace in four modes, debug mode, an HTTP fan-out with Semaphore, TaskGroup and timeout, cancellation, async generators), free-threading in practice (per-block thread lanes on four interpreters, one explained step each, scaling, lost updates, extensions that turn the GIL back on, the wheel survey), subinterpreters measured, and choosing. Tabs: Reading, Further reading. Reading: 21 min, plus 10 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs, CPython 3.14.8, 3.14.8t, 3.15.0rc3 and 3.15.0rc3t on an Apple M1 Pro, 2026-10-05.
