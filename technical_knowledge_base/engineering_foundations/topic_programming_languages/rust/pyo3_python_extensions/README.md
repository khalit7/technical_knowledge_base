# Rust: speeding up Python with PyO3 and maturin

Notion: https://app.notion.com/p/4055c17b0d0d81048311c87e9b76a78a (child of Rust: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/pyo3_python_extensions/

Interactive page: `index.html`, built from `src/` (`python3 src/rb/gen.py`, then `sh src/build.sh`; see `src/README.md`). Built 2026-10-26 by splitting Part 2 ("Speeding up Python") out of the Rust language page: the core idea and hero (the root's token counter, phase by phase, as the loop and then the parsing move into Rust), profiling and Amdahl, a first PyO3 extension built with maturin, functions and argument checks, conversion costs with the crossing stepper (copy against view), rust-numpy, errors and panics, `#[pyclass]`, releasing the GIL (the four-thread timeline) and rayon, what an extension must declare and protect on free-threaded 3.14t, the optimisation ladder explorer, stubs and tests, abi3 and abi3t wheels and CI, and the alternatives measured on the same loop. Tabs: Reading, Further reading. Reading: 34 min, plus 13 in closed details. No child pages, databases or video.
Real runs: the language page's recorded outputs (CPython 3.14.8 and 3.14.8t, 3.15.0rc3, Rust 1.99.0, PyO3 0.29.3, maturin 1.15.0) on an Apple M1 Pro, 2026-10-05.
