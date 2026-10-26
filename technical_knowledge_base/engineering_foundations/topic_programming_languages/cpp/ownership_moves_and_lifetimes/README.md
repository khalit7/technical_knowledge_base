# C++: ownership, moves and object lifetimes

Notion: https://app.notion.com/p/4055c17b0d0d81819d74fa010e68ac2a (child of "C++: the essentials")
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/cpp/ownership_moves_and_lifetimes/

Interactive page: `index.html`, built from `src/` (`python3 src/ca/gen.py`, then `sh src/build.sh`). Tabs: Reading, Further reading. When each C++ object dies and who decides: values, references and pointers; the stack, the heap and static storage; destructors, RAII, temporaries and stack unwinding; unique_ptr, shared_ptr and weak_ptr (with a cycle that leaks and its weak_ptr fix, and the measured cost of copying a shared_ptr); moves, moved-from objects and copy elision; noexcept and vector growth; the rule of zero and the rule of five. Every trace is the real output of a traced class on an Apple M1 Pro, replayed step by step beside the section it proves. Split out of Part 1 (sections 2 to 6 and the Object lifetimes tab) of the C++ page on 2026-10-26.
