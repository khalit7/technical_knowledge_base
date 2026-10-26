# Python: CPython internals and performance

Notion: https://app.notion.com/p/4055c17b0d0d8111872ad7101b7e3c22 (child of Python: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/python/cpython_internals_and_performance/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting the Python language page: the core idea and hero (a million floats as a list of objects looped over by the interpreter against one NumPy buffer, 47.6 ms against 3.2 ms), bytecode and the specialising interpreter (a stepper over three real `dis` listings), what objects cost (layouts, reference counts, the cycle collector, the small-int cache), profiling (cProfile, py-spy, Scalene), moving the loop out of Python (NumPy at four sizes, when to go native), the experimental JIT measured on 3.13 to 3.15, what changed from 3.12 to 3.15 (release lines, UTF-8 by default) and lazy imports measured. Tabs: Reading, Version explorer, Further reading. Reading: 19 min, plus 6 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs, CPython 3.11.17 to 3.15.0rc3 on an Apple M1 Pro, 2026-10-05.
