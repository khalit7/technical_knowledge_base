# Rust: async with tokio, services with axum, and CLIs

Notion: https://app.notion.com/p/4055c17b0d0d8148b863faa050cf5456 (child of Rust: the essentials)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_programming_languages/rust/async_services_and_clis/

Interactive page: `index.html`, built from `src/` (`python3 src/rs/gen.py`, then `sh src/build.sh`). Async Rust from the poll up (lazy futures, the tokio runtime, join/spawn/JoinSet, cancellation by dropping, blocking the runtime, Send + 'static errors), an axum service (extractors, errors, state, tower layers, tracing, graceful shutdown, tests) measured against its FastAPI twin, and a clap CLI shipped as one binary (profiles, musl static builds, cross-compilation, container images). Tabs: Reading, Further reading. Every output recorded on an Apple M1 Pro on 2026-10-05. Split out of the Rust page's Part 3 on 2026-10-26. Owns tokio and async Rust.
