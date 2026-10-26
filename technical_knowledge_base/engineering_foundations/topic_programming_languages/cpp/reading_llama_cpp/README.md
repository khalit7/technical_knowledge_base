# C++: reading llama.cpp, one token through the code

Notion: https://app.notion.com/p/4055c17b0d0d8150a5effbb5a667dd9d (child of "C++: the essentials")
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/cpp/reading_llama_cpp/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Tabs: Reading, Further reading. A guided reading of llama.cpp at one pinned commit: the repository map, the build and its backends, the C API and `simple.cpp`, GGUF as code, mmap loading and the repack copy, ggml tensors and strides, the model as a lazy graph, graph reuse and memory planning, the scheduler and splits, the CPU thread pool (barriers, chunks, a cache-line mismatch), quantised blocks and the SIMD kernel that really runs (counted), the KV cache, samplers and the server as code, and one token end to end, timed. Everything measured on an Apple M1 Pro with SmolLM2-135M in Q8_0. Split out of Part 3 of the C++ page on 2026-10-26.
