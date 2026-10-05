# Facts checked 2026-10-05 (primary sources)

1. tokio 1.53.2 (crates.io, 2026-10-03). Builder::worker_threads "The default value is the number of cores available to the system."; max_blocking_threads "The default value is 512." https://docs.rs/tokio/latest/tokio/runtime/struct.Builder.html
2. Alice Ryhl, "Async: What is blocking?": "a good rule of thumb is no more than 10 to 100 microseconds between each .await." https://ryhl.io/blog/async-what-is-blocking/
3. select!: "By default, select! randomly picks a branch to check first."; biased; polls top to bottom. https://docs.rs/tokio/latest/tokio/macro.select.html
4. axum 0.8.9 (2026-04-14). DefaultBodyLimit: "Bytes will, by default, not accept bodies larger than 2MB." https://docs.rs/axum/latest/axum/extract/struct.DefaultBodyLimit.html
5. Cargo profiles: release defaults lto = false, codegen-units = 16, strip = "none" in the table; Cargo strips debuginfo from release builds when debug is off (Cargo 1.77 behaviour; the profiles page states "strip = none" as the default, so the page says only what we measured). https://doc.rust-lang.org/cargo/reference/profiles.html
6. Apple QA1118: "Apple does not support statically linked binaries on Mac OS X." https://developer.apple.com/library/archive/qa/qa1118/_index.html
7. distroless README: "static-debian13 is around 2 MiB"; cc = base + libgcc1. Registry (arm64 compressed layers): static-debian12 715,728 B; cc-debian12 8,979,565 B; cc-debian13 10,972,830 B. Docker Hub python:3.14-slim linux/arm64 47,093,003 B compressed. https://github.com/GoogleContainerTools/distroless ; https://hub.docker.com/v2/repositories/library/python/tags/3.14-slim
8. TGI: Python 4,087,757 B, Rust 844,240 B; router uses axum 0.7; README: "text-generation-inference is now in maintenance mode." TEI: Rust 1,003,986 B, Python 128,057 B. GitHub languages API.
9. asyncio: "When a task is cancelled, asyncio.CancelledError will be raised in the task at the next opportunity." https://docs.python.org/3/library/asyncio-task.html
10. clap USAGE_CODE = 2. https://github.com/clap-rs/clap/blob/master/clap_builder/src/util/mod.rs
11. Rust 1.75.0 (2023-12-28) async fn in traits; 1.85.0 (2025-02-20) async closures; 1.99.0 (2026-10-01). RELEASES.md
12. async-std: "async-std has been discontinued; use smol instead". https://github.com/async-rs/async-std
13. libuv threadpool default size 4 (UV_THREADPOOL_SIZE). https://docs.libuv.org/en/v1.x/threadpool.html
14. FastAPI: plain def "is run in an external threadpool that is then awaited". https://fastapi.tiangolo.com/async/
15. Kubernetes: SIGTERM, then KILL after grace period, default 30 s. docker stop: SIGTERM then SIGKILL after 10 s. https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/ ; https://docs.docker.com/reference/cli/docker/container/stop/
16. clap 4.6.7 (2026-09-14), tracing 0.1.44, tower-http 0.7.1 latest (this part pins 0.6, resolved 0.6.11).
17. rust-lld as the musl linker from macOS: no official statement found; measured here (cross.sh). cargo-zigbuild, cross-rs READMEs.
18. spawn_blocking docs: "Specialized CPU-bound executors, such as rayon, may also be a good fit." https://docs.rs/tokio/latest/tokio/task/fn.spawn_blocking.html
