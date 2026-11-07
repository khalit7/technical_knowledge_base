# Rust: the essentials

Notion: https://app.notion.com/p/3c65c17b0d0d8156bed9ead8a22f33b0 (child of Topic: programming-languages)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/

Interactive page: `index.html`, built from `src/` (`python3 src/ra/gen.py && sh src/build.sh`; see `src/README.md`). Tabs: Reading, Further reading. Reading: 32 min, plus 11 in closed details.
The essentials page of the Rust language (rebuilt 2026-10-26, when the old three-part page "Rust: for Python programmers, Python extensions, services and CLIs" was split into four children): the core idea and a 3D map (Fig. 1: one program from cargo to Python, each child's subject pinned where it acts and linked to that child's figure), Rust in one screen with five measured findings, cargo, variables and numbers as they differ from Python, ownership and moves with one `Vec` stepped at its real stack and heap addresses (Python's model beside it), borrowing with the borrow timeline and the Borrow-checker lab (15 real errors), modules, the traps that cut across the language, a C++ map, and the child cards. Three Python to Rust predictions sit inline. Split layout with explained, autoplaying steps since 2026-11-07.

Child pages (each folder here):
- `enums_traits_and_errors/`: Rust: enums, traits, errors and iterators
- `lifetimes_smart_pointers_and_unsafe/`: Rust: lifetimes, smart pointers, threads and unsafe
- `pyo3_python_extensions/`: Rust: speeding up Python with PyO3 and maturin
- `async_services_and_clis/`: Rust: async with tokio, services with axum, and CLIs

All runs on an Apple M1 Pro, 2026-10-05 (rustc 1.99.0). Replaces the old written page "Rust: zero to expert" (this Notion page, retitled); its claims were checked (`src/ra/coverage.json` and the children's copies) and the corrections sit on the page that owns each subject. No databases or video.
