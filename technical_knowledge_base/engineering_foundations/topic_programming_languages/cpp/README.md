# C++: the language, the machine underneath, and reading llama.cpp

Notion: https://app.notion.com/p/3cd5c17b0d0d81ceadcee44fe9c023a0 (child of Topic: programming-languages)

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). One page with a part bar (Start here, Part 1, Part 2, Part 3); each part has its own tabs, and each part's sources, real runs and checks live in its own `src/<part>/` folder (see its README).
- Part 1 "The language" (`src/ca/`, tabs Reading, Build pipeline, Object lifetimes, UB gallery, Predict the output): the build (preprocessor, translation units, linking, CMake), values, references and pointers, RAII, smart pointers, moves, classes and virtual calls (measured), templates and concepts, the standard library, lambdas, errors (exceptions against std::expected, measured), undefined behaviour at -O0 and -O2 with sanitizers, C++20/23/26 status. Generated from `src/ca/tpl/` by `src/ca/gen.py`.
- Part 2 "The machine underneath" (`src/cb/`, tabs Reading, Latency ladder, Cache simulator, SIMD lanes, Roofline): memory hierarchy, cache lines, layout, pages and mmap, assembly, SIMD, branches, atomics and the memory model, false sharing, roofline, profiling, ABI, the bridge to GPUs; all measured on an M1 Pro.
- Part 3 "Reading llama.cpp" (`src/cl/`, tabs Reading, Code tour, Quant blocks, Run it): llama.cpp pinned at commit 8e1642198dcd4e408f8776222d6ae31b74d01187, traced with SmolLM2-135M-Instruct Q8_0 (model and builds stay in the scratchpad; `src/cl/run_all.sh` reproduces).
- Start here (`src/parts/20_tab_start.html`): the map, three routes, six measured findings.
Replaces the old written pages "C++: zero to expert" (this Notion page, retitled) and "C++: modern practice and standards status" (marked TO DELETE); their claims are checked in each part's `coverage.json`. No child pages, databases or video.
