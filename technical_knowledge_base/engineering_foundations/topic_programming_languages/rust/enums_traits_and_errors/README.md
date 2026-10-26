# Rust: enums, traits, errors and iterators

Notion: https://app.notion.com/p/4055c17b0d0d8129b199c18b4bd56935 (child of Rust: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/enums_traits_and_errors/

Interactive page: `index.html`, built from `src/` (`python3 src/ra/gen.py`, then `sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting sections 7 to 12 and 14 of Part 1 ("For Python programmers") and the Python to Rust drill out of the Rust language page: the core idea and hero (four mistakes Rust reports before running and Python while running), `String` against `&str` and UTF-8 byte offsets (a slice slider), enums with data and exhaustive `match` (32 writable states against 4 variants), `Option`, `Result` and `?` (a stepper over a recorded program), `thiserror` and `anyhow`, traits and generics against trait objects, iterators and closures with the measured zero-cost bars, the collections and `HashMap`'s random order, and cargo's unit, integration and doc tests; nine Python to Rust prediction prompts sit inline. Tabs: Reading, Further reading. Reading: 33 min, plus 13 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs (rustc 1.99.0, CPython 3.14.8, thiserror 2.0.21, anyhow 1.0.104) on an Apple M1 Pro, 2026-10-05.
