# C++: modern practice and standards status

⏱ 9 min read · +5h 20m resources

### Best resources

- [cppreference compiler support tables](https://en.cppreference.com/cpp/compiler_support) (reference, ~20 min): the single source of truth for "can I use X on GCC/Clang/MSVC".
- [Herb Sutter's trip reports](https://herbsutter.com/2026/03/29/c26-is-done-trip-report-march-2026-iso-c-standards-meeting-london-croydon-uk/) (~25 min): "C++26 is done" (March 2026, London) explains exactly what landed.
- [InfoQ: C++26 reflection, memory safety, contracts, async model](https://www.infoq.com/news/2026/04/cpp-26-reflection-safety-async/) (~15 min)
- [GCC C++ status](https://gcc.gnu.org/projects/cxx-status.html) (reference, ~10 min) and [Clang C++ status](https://clang.llvm.org/cxx_status.html) (reference, ~10 min)
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) (reference, ~3h for a full read): the hygiene canon (RAII, ownership, spans).
- [nanobind docs](https://nanobind.readthedocs.io/) (docs, ~1h for the core pages): the modern pybind11 successor for Python bindings.

### The one-paragraph state of C++

C++20 is the production baseline nearly everywhere; C++23 is safely usable on current GCC/Clang and (as of the VS 2026 wave) MSVC; C++26 was finalized in March 2026 with the three biggest additions in a decade: static reflection, contracts, and std::execution (senders/receivers). Modules remain the perpetually-almost-there feature: `import std;` works on all three compilers now, but build-system and ecosystem support still makes header-based builds the pragmatic default. In ML, C++ is the substrate: inference engines, CUDA kernels, and the binding layer under every Python API.

### C++20: what you should actually be using (the baseline)

- **Concepts**: constrain templates (`template <std::integral T>`, `requires` clauses). Kills SFINAE; error messages become readable; use for any generic library code.
- **Ranges**: `std::views::filter/transform/take` compose lazily; `std::ranges::sort(v)` over `std::sort(v.begin(), v.end())`. C++23 fills the gaps (`views::zip`, `views::enumerate`, `ranges::to<std::vector>()`).
- **Coroutines**: language machinery only (`co_await/co_yield/co_return`); the standard library types arrive with C++23 `std::generator` and C++26 std::execution. In practice people use cppcoro-style libraries, ASIO, or folly::coro.
- **Modules**: `import std;` supported by GCC 15 (experimental libstdc++ std module), Clang 17+/libc++, MSVC (most complete). CMake 3.28+ has real module support. Fine for greenfield; mixed header/module codebases are still painful.
- Also: `std::span`, `std::format`, three-way comparison `<=>`, designated initializers, `constinit/consteval`, `std::jthread`, `std::atomic::wait`.

### C++23: usable today

Compiler reality: GCC 14/15 and Clang 19-21 cover nearly all language features; MSVC completes `/std:c++23` with Build Tools 14.52 in the Visual Studio 2026 wave. libstdc++ 15 and libc++ cover most of the library.

Worth adopting now:

- **`std::expected<T, E>`**: error handling without exceptions; monadic `and_then/or_else/transform`. The vocabulary type for fallible APIs (mirrors Rust's `Result`).
- **`std::mdspan`**: non-owning multidimensional view with compile-time or runtime extents and configurable layouts (row/column-major, strided). This is the standard way to pass tensors across library boundaries; Kokkos reference implementation works on C++17 if your toolchain lags. C++26 adds `std::submdspan` (slicing).
- **Deducing this** (`auto&& self` explicit object parameter): removes const/ref-qualified overload quadruplication; enables CRTP without the template.
- **`std::print/println`**: format-based, faster and safer than iostreams.
- **`std::generator`**: the first standard coroutine type; lazy sequences.
- **`std::flat_map/flat_set`**: sorted-vector containers; cache-friendly, the right default for small read-heavy maps (competitive-programming instincts apply).
- `std::stacktrace`, `std::byteswap`, `if consteval`, `std::unreachable()`, `import std;` (the std module is formally C++23).

### C++26: finalized March 2026

Finalized at the London (Croydon) meeting, 2026-03; expect publication as ISO/IEC 14882:2026 and compiler support to roll out through 2026-2028.

- **Static reflection (P2996)**: compile-time introspection (`^^T` reflects a type, `[:r:]` splices back into code) plus token injection. Zero runtime overhead. Endgame: serialization, ORM-free bindings, enum-to-string, Python-binding generation without macro/codegen hacks. The single biggest C++ change since templates.
- **Contracts (P2900)**: `pre`, `post`, `contract_assert` with configurable enforcement (ignore/observe/enforce). Defensive programming in the language.
- **`std::execution`**** (P2300, senders/receivers)**: the standard async/parallelism model: schedulers produce senders, algorithms (`then`, `when_all`, `bulk`) compose them, `sync_wait` runs them. Composes with C++20 coroutines; structured concurrency, data-race-free by construction. NVIDIA's stdexec is the working implementation today (and targets CUDA: this is the future interface to GPU async work). Adoption will be slow but this replaces the executor-model vacuum that ASIO/TBB filled.
- Also in 26: `std::simd` (data-parallel types), pattern matching did NOT make it, `std::hive`, hazard pointers/RCU for concurrent memory reclamation, erroneous behavior for uninitialized reads (memory-safety hardening), profiles work continues outside the standard.

### Where C++ sits in ML infra

- **Inference engines**: llama.cpp (pure C/C++ + hand-written kernels, GGUF/ggml), TensorRT-LLM (C++ runtime), ONNX Runtime, vLLM and SGLang (Python orchestration over C++/CUDA kernels), PyTorch's core (ATen/c10 are C++; torch.compile emits Triton but custom ops are C++/CUDA).
- **Kernels**: CUDA C++, CUTLASS 3.x/4.x (CuTe layouts, heavy modern C++ templates), Thrust/CUB. Reading CUTLASS is the best advanced-template workout in ML. C++ is no longer the only first-party way in: Nvidia shipped two Rust kernel-authoring tracks in September 2026, `cutile-rs` at tile level and `cuda-oxide` at thread level, which is the first time a memory-safe language has had first-party support for writing CUDA kernels. See [Rust: zero to expert](rust.md).
- **Bindings**: pybind11 is the incumbent; **nanobind** (same author) is the modern choice: ~4x faster compile, smaller binaries, faster calls, C++17+, free-threaded CPython support. New projects should default to nanobind; PyTorch extensions still use pybind11 via `torch/extension.h`.
- Practical skill: write a custom op (C++/CUDA), bind with nanobind, package with scikit-build-core + cibuildwheel.

### Modern hygiene checklist (stable advice)

- RAII everywhere; destructors are the resource-management model. No naked new/delete.
- Ownership: `unique_ptr` by default, `shared_ptr` only for genuinely shared lifetime, raw pointers/references for non-owning observation; `std::move` is a cast, moved-from objects are valid-but-unspecified.
- Parameters: `std::string_view` for read-only strings, `std::span<const T>` for read-only buffers (both non-owning: never store them beyond the call without care).
- `constexpr` aggressively: most pure functions can be; `consteval` to force it; compile-time tables beat runtime init.
- `auto` for iterators/lambdas/verbose types; concrete types at API boundaries.
- Rule of zero: write no special members; if you must, define/delete all five.
- Build with `-Wall -Wextra -Werror`, sanitizers in CI (ASan/UBSan/TSan), clang-tidy + clang-format; prefer CMake presets; package with vcpkg or Conan.
