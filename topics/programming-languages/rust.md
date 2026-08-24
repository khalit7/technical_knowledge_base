# Rust: from-zero orientation for a C++ programmer

## Best resources
- [The Rust Book](https://doc.rust-lang.org/book/): the canonical intro; chapters 4 (ownership), 10 (generics/lifetimes), 15 (smart pointers) are the C++-programmer chapters.
- [Rustlings](https://github.com/rust-lang/rustlings): small compiler-guided exercises; ideal for a competitive programmer (fast feedback loop).
- [Rust for C++ programmers comparisons: cheats.rs](https://cheats.rs/) and the [Rust API guidelines](https://rust-lang.github.io/api-guidelines/).
- [PyO3 user guide](https://pyo3.rs/): writing Python extensions in Rust; pairs with [maturin](https://www.maturin.rs/).
- [candle](https://github.com/huggingface/candle) and [burn](https://github.com/tracel-ai/burn): the two ML frameworks worth tracking.
- [Rust blog / releases](https://blog.rust-lang.org/): 6-week release train; 1.98.0 current as of 2026-08-20.

## Why bother (2026-08)

Rust keeps showing up exactly where an AI engineer works: the Python toolchain (uv,
ruff, ty, pyx are all Rust), HF's data plumbing (tokenizers, safetensors, hf_transfer),
polars, pydantic-core, tantivy/qdrant/lance in retrieval, and increasingly inference
servers. The pitch versus C++: the same zero-cost-abstraction performance with
ownership rules enforced at compile time (no data races, no use-after-free), a real
package manager, and first-class Python interop. Free-threaded CPython makes Rust
extensions more attractive, not less: PyO3 extensions can actually use all cores.

## Core model, translated from C++ (stable, written 2026-08-24)

You already know 80% of this: Rust ownership is C++ RAII + move semantics with the
compiler enforcing what the C++ Core Guidelines only recommend.

- **Ownership = RAII, but moves are the default.** `let b = a;` on a non-Copy type
  *moves*; using `a` afterwards is a compile error (in C++ a moved-from object is
  valid-but-unspecified and using it is a silent footgun). `Drop` is the destructor;
  drop order is deterministic like C++. Small scalar types are `Copy` (like trivially
  copyable). Explicit deep copy is `.clone()`.
- **Borrowing = the const-ref/non-const-ref discipline, enforced.** `&T` is
  `const T&`, `&mut T` is `T&`, with the aliasing XOR mutability rule: any number of
  shared borrows OR exactly one mutable borrow, checked at compile time. This is what
  makes iterator invalidation, data races, and aliasing UB impossible in safe code.
- **Lifetimes = dangling-reference prevention made explicit.** A lifetime parameter
  `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str` just states "the return borrows
  from the arguments". C++ has the same constraint (returning string_view into a
  temporary is UB); Rust makes it a checked type-system fact. Mostly elided; you write
  them in structs holding references and in tricky APIs.
- **No null, no exceptions.** `Option<T>` replaces nullable pointers (niche-optimized:
  `Option<&T>` is pointer-sized); `Result<T, E>` replaces exceptions (see below).
  Pattern matching (`match`, `if let`) is exhaustive: the compiler forces you to
  handle every case.
- **Traits = concepts + vtables in one mechanism.** `impl Trait for Type`; generics
  monomorphize like templates (`fn f<T: Display>`), `dyn Trait` is the opt-in vtable
  (like virtual, but fat pointers, no inheritance). No function overloading, no
  implicit conversions.
- **Smart pointers map directly**: `Box<T>` = `unique_ptr`, `Rc<T>`/`Arc<T>` =
  non-atomic/atomic `shared_ptr`, `RefCell<T>`/`Mutex<T>` move borrow checking to
  runtime (interior mutability). `unsafe` blocks are where C++ semantics live
  (raw pointers, FFI); the point is that they are grep-able.
- Mindset shift: fights with the borrow checker are almost always designs that would
  be latent bugs in C++ (self-referential structs, shared mutable state). Prefer
  indices/arenas over pointer graphs (competitive-programming habits transfer well).

## Toolchain (2026-08)

- **rustup** installs/pins toolchains (stable 1.98 as of 2026-08-20; new stable every
  6 weeks; Edition 2024 is current, editions are opt-in per crate and interoperate).
- **cargo** is build + deps + test + bench + doc + publish in one: `cargo new`,
  `cargo add tokio`, `cargo test`, `cargo run --release`. Crates.io is the registry;
  `Cargo.lock` behaves like uv.lock.
- **clippy** (`cargo clippy`): the lint canon, teaches idiomatic Rust while you learn.
  **rustfmt** (`cargo fmt`): non-negotiable formatting. **rust-analyzer**: the LSP.
- Error handling in practice: libraries define error enums with **thiserror**
  (derive `Error`, typed variants); applications use **anyhow** (`anyhow::Result<T>`,
  context via `.context("...")`). The `?` operator propagates errors (like a checked,
  zero-cost `co_await` for Results); works with Option too.
- Async: language provides `async fn`/`.await` (lazy futures, no runtime built in);
  **tokio** is the de-facto runtime (executor + IO + timers + channels). `axum` for
  HTTP services, `reqwest` for clients, `serde`/`serde_json` for (de)serialization.
  Rough C++ mapping: futures are like sender/receiver graphs, compiled to state
  machines; `Send`/`Sync` auto-traits are what make "data-race-free by construction"
  actually checked.

## ML/AI ecosystem (status 2026-08-24)

- **candle** (Hugging Face): minimalist PyTorch-like tensor library; CUDA + Metal
  backends, quantized GGUF inference, serverless-friendly small binaries. The default
  for "run an LLM from Rust"; sibling crates candle-transformers, candle-nn.
- **burn** (Tracel): framework-scale: pluggable backends via its Backend trait
  (CubeCL, wgpu, tch, candle, ndarray), kernel fusion, autodiff, ONNX import, full
  training story. More ambitious, heavier abstractions; watch CubeCL (its
  GPU-kernel-in-Rust compiler targeting CUDA/ROCm/wgpu).
- **HF's Rust core**: **tokenizers** (the BPE library under transformers),
  **safetensors** (the weight format, replaced pickle), hf_transfer (fast downloads).
  You already depend on these from Python daily.
- **polars**: DataFrames (Rust core, lazy engine); usable natively from Rust.
- **PyO3 + maturin**: the Python-extension path. PyO3 0.28 supports free-threaded
  CPython (since 0.23) and the abi3/abi3t stable ABIs; maturin builds/publishes wheels
  (`maturin new --bindings pyo3`, `maturin develop`, CI via cibuildwheel or
  maturin-action). This is how pydantic-core, tokenizers, polars ship.
- Also notable: **ort** (ONNX Runtime bindings), tract, mistral.rs (candle-based
  inference server), lance/lancedb and qdrant (vector storage), tch (libtorch
  bindings). Training at scale remains PyTorch's; Rust owns data pipelines, tokenizers,
  serving glue, and edge inference.

## Learning path (start here)

1. **Week 1-2**: Rust Book ch. 1-11 + Rustlings in parallel. Do not skim ch. 4;
   re-implement a few Codeforces problems in Rust to internalize borrows vs indices.
2. **Week 3**: Book ch. 13 (iterators/closures), 15 (smart pointers), 16
   (concurrency); read cheats.rs end to end once.
3. **Week 4**: ship a real thing: a PyO3 extension via maturin that speeds up one of
   your actual Python hot loops (e.g. a tokenizer-adjacent string algorithm), release
   wheel, benchmark against the Python version.
4. **Then**: read candle-transformers' llama.rs top to bottom (it is a readable,
   complete LLM implementation); optionally the tokio tutorial if you need services.
