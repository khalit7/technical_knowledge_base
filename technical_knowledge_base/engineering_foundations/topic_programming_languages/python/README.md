# Python: the essentials

Notion: https://app.notion.com/p/3cd5c17b0d0d81b28acdea39e7a4d998 (child of Topic: programming-languages)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/python/

Interactive page: `index.html`, built from `src/` (`python3 src/es/gen.py && sh src/build.sh`; see `src/README.md`). Tabs: Reading, Further reading. Reading: 12 min, plus 1 in closed details.
The essentials page of the Python language (rebuilt 2026-10-26, when the old two-part page "Python: the language in depth and the 2026 toolchain" was split into four children; split layout and a 3D hero on 2026-11-07): the core idea and Fig. 1, one program from install to run with each child's concept pinned where it acts and linked (the five facts behind almost every surprise are its steps), five measured findings, names, objects and references beside Fig. 2 (three lines from a real run: names, the object with its reference count, the method looked up on the type), the traps that cut across the language, choosing a tool for a job, and the child cards.

Child pages (each folder here):
- `data_model_and_protocols/`: Python: the data model and protocols
- `concurrency_asyncio_and_the_gil/`: Python: concurrency, asyncio and the GIL
- `cpython_internals_and_performance/`: Python: CPython internals and performance
- `typing_packaging_and_toolchain/`: Python: typing, uv, packaging and the toolchain

Replaces the old written pages "Python: zero to expert" (this Notion page, retitled) and "Python: staying current (3.12 to 3.15)"; their claims were checked in `src/old_pages/coverage_part1.json` and `coverage_part2.json`, and the corrections now sit on the child that owns each subject. No databases or video.
