# Python: the language in depth and the 2026 toolchain

Notion: https://app.notion.com/p/3cd5c17b0d0d81b28acdea39e7a4d998 (child of Topic: programming-languages)

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). One page with a part bar (Start here, Part 1, Part 2); each part has its own tabs, and each part's sources, real runs and checks live in its own `src/<part>/` folder (see its README).
- Part 1 "In depth" (`src/pa/`, tabs Reading, Event loop, Data model, Predict the output): names and objects, the data model, iterators and generators, closures and decorators, classes and descriptors, typing (mypy and ty errors), exceptions, context managers, threads and the GIL, asyncio from the event loop up, CPython internals (dis, refcounts, the specialising interpreter), performance. Generated from `src/pa/tpl/` by `src/pa/gen.py`.
- Part 2 "Python in 2026" (`src/pb/`, tabs Reading, Version explorer, Runtime lab): packaging layers, uv, ruff, ty against mypy and pyright, pytest, wheels and trusted publishing, 3.12 to 3.15 changes, lazy imports, free-threading, the JIT and subinterpreters, all measured on an M1 Pro on 2026-10-05.
- Start here (`src/parts/20_tab_start.html`): the map, three routes through, five measured findings.
Replaces the old written pages "Python: zero to expert" (this Notion page, retitled) and "Python: staying current (3.12 to 3.15)" (marked TO DELETE); their claims are checked in `src/pa/coverage.json` and `src/pb/coverage.json`. No child pages, databases or video.
