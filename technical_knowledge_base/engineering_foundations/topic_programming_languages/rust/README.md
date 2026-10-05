# Rust: for Python programmers, Python extensions, services and CLIs

Notion: https://app.notion.com/p/3c65c17b0d0d8156bed9ead8a22f33b0 (child of Topic: programming-languages)

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). One page with a part bar (Start here, Part 1, Part 2, Part 3); each part has its own tabs, and each part's sources, real runs and checks live in its own `src/<part>/` folder (see its README).
- Part 1 "For Python programmers" (`src/ra/`, tabs Reading, Ownership animated, Borrow-checker lab, Python to Rust drill): Rust from zero with real rustc errors; the `tokstat` crate is the root's token counter in modules with tests.
- Part 2 "Speeding up Python" (`src/rb/`, tabs Reading, Optimisation ladder, Crossing the boundary): PyO3 0.29.3 and maturin, conversion costs, rust-numpy, the GIL and rayon, free-threaded 3.14t, abi3/abi3t wheels, alternatives measured; the `tokrs` extension is built step by step.
- Part 3 "Services and CLIs" (`src/rs/`, tabs Reading, Async replay, Service benchmark, CLI replay): clap, binaries and cross-compilation, tokio from zero, axum, testing, deployment (Dockerfiles shown but not built here), axum against FastAPI measured.
- Start here (`src/parts/20_tab_start.html`): the map, three routes, five measured findings.
All runs on an Apple M1 Pro, 2026-10-05; builds and big files stay in the scratchpad. Replaces the old written page "Rust: zero to expert" (this Notion page, retitled); its claims are checked in each part's `coverage.json`. No child pages, databases or video.
