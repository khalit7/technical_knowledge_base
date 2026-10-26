# C++: the machine underneath: caches, layout, SIMD and the memory model

Notion: https://app.notion.com/p/4055c17b0d0d811fa947ee576a97a516 (child of "C++: the essentials")
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/cpp/the_machine_underneath/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Tabs: Reading, Further reading. What the processor and memory do with compiled C++: the cache ladder (measured pointer chase), cache lines and data layout (AoS against SoA, padding, values against pointers), pages and mmap as a program meets them, reading ARM64 assembly, SIMD and dependency chains, branch prediction, atomics, memory order and false sharing, the CPU's measured roofline (`roof.cpp`), counters, and the ABI; all measured on an Apple M1 Pro. Split out of Part 2 of the C++ page on 2026-10-26.
