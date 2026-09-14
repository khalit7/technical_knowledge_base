# C++: zero to expert

⏱ 18 min read · +84h resources

*Created 2026-08-31.* A zero-to-expert path. Companion page [cpp-staying-current.md](cpp-staying-current.md) tracks C++20/23/26 status, compiler support, and the ML-infra role; this page is the ladder.

**If you already write C++**, jump to the Stage 3 gate. C++ is the language where self-assessment is least reliable, because it is possible to be productive for years while holding a wrong model of object lifetime. If any of the Stage 2 lifetime questions are uncomfortable, do Stage 2 properly.

## Best resources (2 min)

- [learncpp.com](https://www.learncpp.com/) (course, ~40h for the full sequence; individual lessons ~10 min each): the best free structured course, and it teaches modern C++ rather than C-with-classes.
- **A Tour of C++** (Stroustrup) (book, ~7h 30m): the short, authoritative overview once you know the basics.
- **Effective Modern C++** (Meyers) (book, ~8h): still the clearest explanation of move semantics, forwarding references, and `auto` deduction, even though it stops at C++14.
- [cppreference.com](https://en.cppreference.com/) (reference, ~1h to learn to navigate it, then lookup): the reference. Learn to read it; it is precise where tutorials are vague.
- [C++ Core Guidelines](https://isocpp.github.io/CppCoreGuidelines/CppCoreGuidelines) (reference, ~3h for a full read): the hygiene canon.
- [CppCon talks](https://www.youtube.com/@CppCon) (video, ~1h per talk; ~10h for the series named here): particularly Sean Parent's *Better Code* series, Chandler Carruth on performance and optimisation, Herb Sutter's *Back to Basics* sessions.
- [Compiler Explorer (godbolt.org)](https://godbolt.org/) (tool, no reading time): the single best learning tool in the language. See the assembly your abstraction produced.
- **Optimized C++** (Guntheroth) (book, ~9h 30m) and Agner Fog's [optimization manuals](https://www.agner.org/optimize/) (manuals, ~5h for the C++ optimisation manual) for Stage 3.

## Stage 0: setup and mental model (1 min)

- Toolchain: a recent GCC or Clang, CMake with presets, and `-Wall -Wextra -Werror` from your very first program. Add AddressSanitizer and UndefinedBehaviorSanitizer to your debug build immediately; they will teach you more than any book.
- The mental model that separates C++ from everything else: **you are responsible for object lifetime, and the compiler assumes you never invoke undefined behaviour**. Optimisations are legal precisely because UB is assumed absent. A program with UB has no meaning, not merely a wrong answer.
- Compilation model: preprocess, compile each translation unit separately, link. This explains headers, the ODR, include guards, and most link errors.

What to build: a hello-world with a CMakeLists, built in both debug (sanitizers on) and release, inspected once in Compiler Explorer.

**Gate**: you can explain what the linker complains about when you define a non-inline function in a header included twice.

## Package management (read now, revisit at Stage 2) (4 min)

C++ has **no official package manager**, and understanding why explains the whole ecosystem. A compiled C++ library is only usable by your program if it was built with a compatible compiler, standard library, and flags: mismatched ABI produces link errors or, worse, silent corruption. That makes shipping prebuilt binaries far harder than in Python or JavaScript, so the community's historical answer was "build it yourself" or "copy the source in".

**The approaches, oldest to newest:**

- **System packages** (`apt install libfoo-dev`, `brew install foo`) with `pkg-config` or CMake's `find_package` to locate them. Simple, but you get whatever version the distribution ships, and it is not reproducible across machines.
- **Vendoring**: copy the source into your repo, or add it as a **git submodule**. Total control, no tooling, and painful updates. Still extremely common.
- **Header-only libraries**: distribute the whole library as headers so there is nothing to build or link (nlohmann/json, Catch2, spdlog optionally). This is a workaround for the packaging problem, paid for in compile time.
- **CMake `FetchContent`**: declare a dependency by git URL and tag; CMake downloads and builds it as part of your build. Zero extra tooling, good for a handful of dependencies, no lock file and no binary caching.
- **vcpkg** (Microsoft): manifest mode with a `vcpkg.json` in your repo, a curated port collection, builds from source by default with binary caching available, and a CMake toolchain file that makes `find_package` just work. The easiest path for a new CMake project.
- **Conan** (JFrog): a genuine binary package manager, with profiles describing compiler, standard library, architecture, and build type, so it can distribute prebuilt artefacts that actually match your ABI. Heavier, and the choice in most enterprises and in CI-heavy setups.

**What to know regardless of tool:**

- **Build system is separate from package manager.** CMake builds; vcpkg or Conan supplies. Learn CMake targets properly (`target_link_libraries`, `target_include_directories` with `PUBLIC`/`PRIVATE`, presets) because bad CMake causes more pain than bad dependency choice.
- **Static versus dynamic linking**: static means one big binary and no runtime lookup, dynamic means smaller binaries and a deployment requirement. This is a real decision, unlike in most languages.
- **ODR and transitive headers**: two translation units seeing different definitions of the same thing is undefined behaviour, and inconsistent compile flags across dependencies is a common cause.
- There is no lock file culture comparable to `uv.lock` or `package-lock.json`; pin versions explicitly and record the toolchain.

**What to actually do**: CMake with presets plus vcpkg manifest mode for a new project; expect Conan in larger organisations; expect submodules and vendored source in older codebases.

## Stage 1: foundations (2 min)

- Value semantics, the built-in types, integer promotion and the signed/unsigned trap, `int` overflow being UB while unsigned wraps.
- References versus pointers; `const` on both sides of the star; `constexpr` basics.
- Functions, overloading, default arguments; pass by value, by const reference, by reference.
- **Objects and lifetime**: automatic storage (the stack), dynamic (`new`, but do not use it yet), static, and thread-local. Scope determines destruction, deterministically.
- Classes: constructors, destructors, member initialiser lists (and why order follows declaration order), `explicit`, `const` member functions.
- **RAII, immediately**: every resource is owned by an object whose destructor releases it. This is the whole language in one sentence.
- The standard containers you will actually use: `vector` (the default, always), `array`, `string`, `map`/`unordered_map`, `span` for views. Know that `vector` is contiguous and that this is why it beats `list` almost always.
- Algorithms: `<algorithm>` before hand-written loops; `sort`, `find_if`, `accumulate`, `transform`.

What to build: a small text-indexing tool. No raw `new`, no C arrays, no `char*`.

**Gate**: you can say exactly when each object in a 20-line function is destroyed, and in what order.

## Stage 2: working proficiency (3 min)

The theme is **ownership and the rules of five and zero**.

- **Copy and move semantics**: copy constructor, copy assignment, move constructor, move assignment, destructor. `std::move` is a cast to rvalue, nothing more. Moved-from objects are valid but unspecified. Rule of zero: write none of these; let members manage themselves. Rule of five: if you write one, handle all.
- **Smart pointers**: `unique_ptr` as the default owner, `make_unique`, `shared_ptr` only for genuinely shared lifetime (and know the control-block cost), `weak_ptr` for breaking cycles, raw pointers and references as non-owning observers only.
- **Dangling**: the defining C++ failure mode. Returning a reference to a local, storing a `string_view` past the lifetime of its string, a `span` into a resized `vector`, an iterator invalidated by insertion. Learn every invalidation rule for `vector` and `unordered_map`.
- Templates as a working tool: function and class templates, type deduction, `auto` rules, `decltype`, template argument deduction failure messages.
- **Concepts** (C++20) to constrain templates; they replace SFINAE and make errors legible.
- Error handling: exceptions and the strong/basic guarantees, `noexcept` and when it matters (move constructors, `vector` growth), and `std::expected` for fallible APIs that should not throw.
- Namespaces, ADL (and why it surprises you), and the `using` rules.
- **Ranges and views** (C++20/23): lazy composition; understand that a view does not own and can dangle.
- Lambdas: captures by value versus reference, capture lifetime, generic lambdas, `mutable`.
- Build hygiene: CMake targets and properties rather than global flags, `find_package`, a package manager (vcpkg or Conan), clang-format and clang-tidy in CI.

What to build: a library with a clean header API, unit tests (Catch2 or GoogleTest), sanitizers in CI, and no memory errors under ASan across the whole test suite.

**Gate**: given a class holding a `unique_ptr` and a `vector`, you can state which of the five special members the compiler generates, which it deletes, and why.

## Stage 3: advanced (3 min)

- **The memory model and concurrency**: `std::thread`/`jthread`, `mutex`, `lock_guard`/`scoped_lock`, `condition_variable`, `atomic` and memory orders (relaxed, acquire, release, seq_cst). Understand data races as UB, not as "sometimes wrong". False sharing and cache-line padding.
- **Performance as a discipline**: the machine model (caches, branch prediction, prefetching, SIMD), data-oriented design, why array-of-structs versus struct-of-arrays changes throughput by an order of magnitude, allocation as the usual hidden cost, `reserve`, small-buffer optimisation, and move-only types to avoid copies.
- **Measure properly**: perf, Compiler Explorer for codegen, Google Benchmark for microbenchmarks, and awareness that microbenchmarks lie about cache behaviour.
- **Template metaprogramming**: variadic templates and parameter packs, fold expressions, `if constexpr`, CRTP (and its C++23 replacement, deducing this), type traits, tag dispatch. Enough to read library code such as CUTLASS.
- **`constexpr` and compile-time computation**: `consteval`, `constinit`, compile-time tables, and how much of the standard library is now usable at compile time.
- **Coroutines**: what `co_await` actually compiles to (a state machine and a promise type), why the standard shipped machinery without types, `std::generator`, and when a coroutine allocates.
- **Undefined behaviour in practice**: strict aliasing, signed overflow, uninitialised reads, out-of-bounds, use-after-move as a logic bug, and how each one gets exploited by the optimiser. Read a few examples where removing a null check was legal.
- The C++/ML boundary: writing a custom op, binding it with nanobind, and understanding what `mdspan` is for.

What to build: take a hot loop, make it 5x faster, and justify every improvement with a profile and the emitted assembly.

**Gate**: you can explain why `std::vector<bool>` is a mistake, what `noexcept` on a move constructor buys, and what the optimiser is allowed to assume about a signed loop counter.

## Stage 4: expert (2 min)

- **Read the standard library implementation**: libstdc++ or libc++ for `vector`, `shared_ptr`, `function`, `optional`. Then read a serious template library end to end (CUTLASS if you work in ML, Abseil or Boost.Hana otherwise).
- **Read the standard itself**, or at least the working draft, for one area you care about. Learn what "the standard says" actually looks like: value categories, sequencing, the object model, initialisation rules.
- **Value categories properly**: lvalue, xvalue, prvalue, glvalue, rvalue; guaranteed copy elision; why `return std::move(x)` is usually wrong.
- **ABI**: name mangling, the Itanium ABI, why the standard library cannot fix certain designs, and what breaks when you mix compilers or flags.
- **Codegen intuition**: predict what the compiler does to an abstraction before checking on Compiler Explorer, and be right most of the time. Know when inlining, devirtualisation, and vectorisation happen and what blocks them.
- **Follow the committee**: papers on [wg21.link](https://wg21.link/) (index, browse as needed), Herb Sutter's trip reports, and the current arguments (safety profiles, contracts, reflection). Understanding why a feature was rejected is expert-level knowledge.
- **Teach and review**: catching a lifetime bug in someone else's pull request from reading it is the real test.

**Gate**: you can take an ill-specified performance or lifetime bug in unfamiliar code and reason to the cause from the language rules rather than by experiment.

## Traps that catch experienced people (1 min)

- `string_view` and `span` outliving their owner; range-for over a temporary container (fixed for some cases in C++23, not all).
- Iterator invalidation after `push_back`; references into a `vector` after growth.
- Object slicing when a derived object is copied into a base.
- A base class with a public non-virtual destructor deleted through a base pointer.
- Static initialisation order across translation units.
- Shadowed variables, integer promotion in comparisons, and `size_t` underflow in `for (size_t i = v.size() - 1; i >= 0; --i)`.
- Assuming a data race is merely a wrong value rather than undefined behaviour.
- `shared_ptr` cycles; `shared_ptr` used where `unique_ptr` was correct, adding atomics to a single-threaded path.

## Cross-links (1 min)

- Standards status, compiler support, C++ in ML infra: [cpp-staying-current.md](cpp-staying-current.md)
- CUDA C++ and kernel work: ../cuda-and-gpu-programming/
- The language that made these rules compile-time checked: [rust.md](rust.md)
