# Rust: zero to expert

⏱ 21 min read · +40h resources

*Restructured 2026-08-31 into a zero-to-expert path.* The previous framing assumed a C++ background; that mapping is now an optional appendix at the end, useful once you have C++ but not required to start.

## Best resources (2 min)

- [The Rust Book](https://doc.rust-lang.org/book/) (~10h): the canonical intro, and unusually good. Chapter 4 (ownership) is the one that matters; do not skim it.
- [Rustlings](https://github.com/rust-lang/rustlings) (exercises, ~8h to work through): small compiler-guided exercises, fast feedback.
- [Rust by Example](https://doc.rust-lang.org/rust-by-example/) (~4h) alongside the Book when you want code rather than prose.
- [cheats.rs](https://cheats.rs/) (~45 min): the whole language on one dense page; read it end to end once at Stage 2.
- [Rust for Rustaceans](https://rust-for-rustaceans.com/) (book, ~6h 15m): Gjengset; the intermediate-to-advanced book, and the only one. His [YouTube streams](https://www.youtube.com/@jonhoo) (video, ~3h per stream, browse as needed) build real crates live.
- [The Rustonomicon](https://doc.rust-lang.org/nomicon/) (~3h) for `unsafe`, and [Learn Rust With Entirely Too Many Linked Lists](https://rust-unofficial.github.io/too-many-lists/) (~4h): the best possible cure for fighting the borrow checker.
- [The Rust API guidelines](https://rust-lang.github.io/api-guidelines/) (reference, ~1h) and [PyO3 user guide](https://pyo3.rs/) (docs, ~2h for the core pages) plus [maturin](https://www.maturin.rs/) (docs, ~30 min).
- [Rust blog / releases](https://blog.rust-lang.org/) (blog, ~20 min per release post): 6-week release train; 1.98.0 current as of 2026-08-20.

## Why bother (2026-08) (1 min)

Rust keeps showing up exactly where an AI engineer works: the Python toolchain (uv, ruff, ty, pyx are all Rust), HF's data plumbing (tokenizers, safetensors, hf_transfer), polars, pydantic-core, tantivy/qdrant/lance in retrieval, and increasingly inference servers. The pitch versus C++: the same zero-cost-abstraction performance with ownership rules enforced at compile time (no data races, no use-after-free), a real package manager, and first-class Python interop. Free-threaded CPython makes Rust extensions more attractive, not less: PyO3 extensions can actually use all cores.

## Stage 0: setup and mental model (1 min)

- `rustup` for toolchains, `cargo new` for projects, rust-analyzer in your editor. Nothing else to configure.
- The mental model: **every value has exactly one owner, and the compiler tracks it**. Memory safety is not a runtime check here, it is a type-system property proved before the program runs.
- Corollary that saves months: **the borrow checker rejecting your code usually means the design is wrong**, not that the language is in your way. The instinct to reach for `clone()` or `Rc<RefCell<T>>` to make an error go away is the single biggest thing that stalls learners.

**Gate**: you can create a project, add a dependency with `cargo add`, and run tests.

## Package management (read now, revisit at Stage 2) (3 min)

Rust is the language where this section is shortest, because **cargo** is the build system, test runner, documentation generator, and package manager in one, and there has never been a competitor. Coming from Python or JavaScript, the absence of an ecosystem argument about tooling is itself notable.

- [**crates.io**](https://crates.io/) is the registry; a package is a **crate**. `cargo add serde` edits `Cargo.toml` for you; `cargo build`, `cargo test`, `cargo run --release`, `cargo doc --open`.
- **`Cargo.toml`** declares dependencies with semver ranges; **`Cargo.lock`** pins the exact resolved tree. Commit the lock file for binaries always, and for libraries too these days (it only affects your own builds and CI, not consumers).
- **Semver with the 0.x rule**: for `0.y.z`, cargo treats the *minor* as the breaking position, so `0.14.1` and `0.15.0` are incompatible while `0.14.1` and `0.14.9` are not. Most of the ecosystem lives at 0.x, so this rule matters constantly.
- **Multiple major versions coexist.** Cargo will happily link `rand 0.8` and `rand 0.9` into the same binary. This solves diamond-dependency deadlock, but produces the confusing error class where two crates' types with the same name are genuinely different types.
- **Features** are optional compile-time flags (`serde = { version = "1", features = ["derive"] }`). **Feature unification** means that if any crate in your graph enables a feature, everyone gets it, which is occasionally surprising and is why `default-features = false` exists.
- **Workspaces** share one `Cargo.lock` and one `target/` directory across many crates in a repo, with `[workspace.dependencies]` for version consistency.
- **`cargo install`** puts a binary crate on your PATH (the equivalent of pipx or a global npm install), built from source.
- [**docs.rs**](https://docs.rs/) automatically builds and hosts documentation for every published crate, which is why Rust library documentation is uniformly good and uniformly findable.
- **Supply chain and hygiene**: `cargo audit` for known vulnerabilities, `cargo deny` for licence and duplicate-dependency policy, `cargo vendor` for offline or air-gapped builds. Build scripts (`build.rs`) and procedural macros run arbitrary code at build time, so the same caution as npm `postinstall` applies.
- **MSRV** (minimum supported Rust version) is declared with `rust-version` in `Cargo.toml`; raising it is a semver-visible decision for a library.

## Stage 1: foundations (2 min)

- Values, `let` bindings, immutability by default, `mut`, shadowing.
- Scalar and compound types; `String` versus `&str` (owned versus borrowed view) and why the distinction exists.
- **Ownership**: move on assignment, `Copy` for small scalars, `clone()` as the explicit deep copy, drop at end of scope.
- **Borrowing**: `&T` shared, `&mut T` exclusive, and the aliasing-XOR-mutability rule (any number of shared borrows, or exactly one mutable borrow, never both).
- Structs, enums, and `match`. Enums with data are the workhorse of the language; exhaustive matching is a design tool, not a chore.
- `Option<T>` instead of null, `Result<T, E>` instead of exceptions, the `?` operator.
- Collections: `Vec`, `String`, `HashMap`, slices.
- Modules, `pub`, crates, `Cargo.toml`.

What to build: a CLI that parses a file and reports statistics, using only the standard library, then again with `clap` and `serde`.

**Gate**: you can explain why this fails to compile: `let mut v = vec![1]; let first = &v[0]; v.push(2); println!("{first}");`

## Stage 2: working proficiency (2 min)

- **Traits**: define shared behaviour, `impl Trait for Type`, default methods, associated types, trait bounds. Generics monomorphise; `dyn Trait` is the opt-in dynamic dispatch with a fat pointer. There is no inheritance and you will not miss it.
- Derives that carry real weight: `Debug`, `Clone`, `PartialEq`, `Hash`, `Default`, `serde::{Serialize, Deserialize}`.
- **Lifetimes**: what `'a` means, elision rules, why struct fields holding references need annotations, and why "just add a lifetime" often means "store an owned value instead".
- Closures and the `Fn`/`FnMut`/`FnOnce` distinction; iterators and the adapter chain (`map`, `filter`, `fold`, `collect`), which is where Rust starts feeling pleasant.
- **Error handling in practice**: `thiserror` for library error enums, `anyhow` for applications, `.context()` for messages, and the rule that libraries return typed errors while binaries return boxed ones.
- Smart pointers: `Box<T>` for heap and recursion, `Rc<T>`/`Arc<T>` for shared ownership, `RefCell<T>`/`Mutex<T>` for interior mutability (borrow checking moved to runtime). Know the cost of each and reach for them last.
- Testing (`#[test]`, `cargo test`, integration tests in `tests/`), documentation tests, and `cargo doc`.
- **clippy is a teacher**: run `cargo clippy -- -W clippy::pedantic` and read every suggestion. It is the fastest idiom trainer in any language.

What to build: a real crate with a clean API, documented public items, tests, and a published version on [crates.io](https://crates.io/).

**Gate**: you can design a type so that an invalid state is unrepresentable, and explain why that is preferable to validating at runtime.

## Stage 3: advanced (3 min)

- **Concurrency**: threads, `Send` and `Sync` as the auto-traits that make data races a compile error, `Arc<Mutex<T>>`, channels (`std::sync::mpsc`, `crossbeam`), scoped threads, and `rayon` for data parallelism (often a one-line `par_iter()` change).
- **Async**: `async fn` produces a lazy future; nothing runs without an executor. `tokio` as the de-facto runtime, `.await` points as yield points, cancellation by dropping a future, `Pin` and why self-referential futures need it, and the classic mistake of blocking inside an async task (`spawn_blocking`).
- Advanced traits: blanket impls, the orphan rule and the newtype pattern around it, `From`/`Into`/`TryFrom`, `Deref` and its limits, operator overloading, generic associated types.
- **Interior mutability and shared state** done deliberately: `Cell` versus `RefCell` versus `Mutex` versus `RwLock` versus atomics, and how to pick.
- Macros: `macro_rules!` for declarative macros, then procedural macros (derive, attribute, function-like) with `syn` and `quote`.
- **Performance**: `cargo build --release` is not optional for measurement, `criterion` for benchmarks, `cargo flamegraph`, avoiding allocation in hot paths, `SmallVec`-style tricks, and knowing that bounds checks are usually elided but sometimes not.
- **PyO3 and maturin**: the Python-extension path. PyO3 0.28 supports free-threaded CPython (since 0.23) and the abi3/abi3t stable ABIs; `maturin new --bindings pyo3`, `maturin develop`, wheels via maturin-action. This is how pydantic-core, tokenizers, and polars ship.

What to build: a PyO3 extension that replaces a genuinely hot Python loop of yours, benchmarked against the Python version, shipped as a wheel.

**Gate**: you can explain why `Rc<RefCell<T>>` compiles but can still panic at runtime, and what design would avoid it.

## Stage 4: expert (2 min)

- **`unsafe` properly**: read the Rustonomicon. Raw pointers, `unsafe fn` contracts, what "undefined behaviour" means here, aliasing rules under Stacked/Tree Borrows, and running your unsafe code under [Miri](https://github.com/rust-lang/miri) (repo, ~30 min for the README and usage guide). The expert skill is writing a safe abstraction over unsafe internals and being able to state its invariant precisely.
- **FFI both directions**: `extern "C"`, `#[repr(C)]`, `bindgen`/`cbindgen`, and the ownership handoff rules at the boundary.
- **Compiler and runtime model**: monomorphisation and its compile-time cost, MIR, how `Drop` glue is generated, niche optimisation (why `Option<&T>` is pointer-sized), zero-sized types, and where `dyn` dispatch actually costs you.
- **Type-system depth**: variance, higher-ranked trait bounds (`for<'a>`), object safety, and why some designs need GATs.
- Build and ship at scale: workspaces, feature flags and their unification hazards, `cargo-deny`, cross-compilation, binary size, and `no_std` if you touch embedded.
- **Contribute**: a PR to a crate you use, or a Rust issue. Read the RFC repository for the feature arguments; that is where the language's reasoning lives.

**Gate**: you can write a small `unsafe` data structure, state its safety invariant, and prove to a reviewer that the safe API cannot violate it.

## Toolchain (2026-08) (1 min)

- **rustup** installs/pins toolchains (stable 1.98 as of 2026-08-20; new stable every 6 weeks; Edition 2024 is current, editions are opt-in per crate and interoperate).
- **cargo** is build + deps + test + bench + doc + publish in one: `cargo new`, `cargo add tokio`, `cargo test`, `cargo run --release`. [Crates.io](https://crates.io/) is the registry; `Cargo.lock` behaves like uv.lock.
- **clippy** (`cargo clippy`): the lint canon. **rustfmt** (`cargo fmt`): non-negotiable formatting. **rust-analyzer**: the LSP.
- Ecosystem defaults: `serde`/`serde_json` for serialisation, `tokio` for async, `axum` for HTTP services, `reqwest` for clients, `clap` for CLIs, `tracing` for structured logs, `criterion` for benchmarks.

## ML/AI ecosystem (status 2026-08-24) (2 min)

- **candle** (Hugging Face): minimalist PyTorch-like tensor library; CUDA + Metal backends, quantized GGUF inference, serverless-friendly small binaries. The default for "run an LLM from Rust"; sibling crates candle-transformers, candle-nn.
- **burn** (Tracel): framework-scale: pluggable backends via its Backend trait (CubeCL, wgpu, tch, candle, ndarray), kernel fusion, autodiff, ONNX import, full training story. More ambitious, heavier abstractions; watch CubeCL (its GPU-kernel-in-Rust compiler targeting CUDA/ROCm/wgpu).
- **HF's Rust core**: **tokenizers** (the BPE library under transformers), **safetensors** (the weight format, replaced pickle), hf_transfer (fast downloads). You already depend on these from Python daily.
- **polars**: DataFrames (Rust core, lazy engine); usable natively from Rust.
- Also notable: **ort** (ONNX Runtime bindings), tract, mistral.rs (candle-based inference server), lance/lancedb and qdrant (vector storage), tch (libtorch bindings). Training at scale remains PyTorch's; Rust owns data pipelines, tokenizers, serving glue, and edge inference.
- Reading target once you are past Stage 2: candle-transformers' llama.rs, a readable and complete LLM implementation.

## Appendix: the C++ translation (optional, useful once you have C++) (2 min)

Ownership in Rust is C++ RAII plus move semantics, with the compiler enforcing what the Core Guidelines only recommend.

- **Moves are the default.** `let b = a;` on a non-Copy type moves; using `a` afterwards is a compile error, where C++ leaves a valid-but-unspecified object and a silent footgun. `Drop` is the destructor and drop order is deterministic.
- **Borrowing is the const-ref discipline, checked.** `&T` is `const T&`, `&mut T` is `T&`, with aliasing XOR mutability enforced. This is what makes iterator invalidation and data races impossible in safe code.
- **Lifetimes** state what C++ leaves implicit: returning a `string_view` into a temporary is UB in C++ and a compile error in Rust.
- **Traits** are concepts and vtables in one mechanism. Generics monomorphise like templates; `dyn Trait` is the opt-in virtual, without inheritance. No overloading, no implicit conversions.
- **Smart pointers map directly**: `Box<T>` is `unique_ptr`, `Rc`/`Arc` are non-atomic/atomic `shared_ptr`, `RefCell`/`Mutex` move borrow checking to runtime. `unsafe` blocks are where C++ semantics live, and the point is that they are grep-able.
- Prefer indices and arenas over pointer graphs; self-referential structs are the design Rust refuses, and it is usually right.

## Cross-links (1 min)

- The C++ side of the comparison: [cpp.md](cpp.md), [cpp-staying-current.md](cpp-staying-current.md)
- Building the Python extension: [python.md](python.md), [python-staying-current.md](python-staying-current.md)
- Rust in the inference stack: ../inference-and-serving/
