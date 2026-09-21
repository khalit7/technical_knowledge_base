# 2026-08-31: programming languages restructured to zero-to-expert

Requested by Khalid: treat Python and C++ as unknown too, and cover Python, C++, Rust, JavaScript, and TypeScript as complete zero-to-expert paths. His stated reason for the two he does know: comprehensiveness, to stay fresh.

### Structural change

The topic previously ran two "stay current" tracks (Python, C++) and one learning track (Rust), all written assuming existing fluency. It now runs **five zero-to-expert tracks** on a shared five-stage ladder, with the currency material split into companion pages so it can go stale without invalidating the curriculum.

**The shared ladder** (identical on every page, so progress is comparable): Stage 0 setup and mental model, Stage 1 foundations, Stage 2 working proficiency, Stage 3 advanced, Stage 4 expert. Each stage carries what to learn, one thing to build, and a **gate**: a question to answer cold before moving on. Each page ends with a traps list.

Design note for reuse as a refresher rather than a course: read the Stage 3 gate first, and drop back only where it fails. That keeps the pages useful for the two languages already known without diluting them for the three that are not.

### programming-languages

- **[new] Python: zero to expert.** Object model and dunder protocols, iterators and generators, descriptors and the attribute lookup chain, refcounting plus cycle GC, the GIL stated precisely, the three concurrency models, profiling discipline, then CPython internals (the specialising adaptive interpreter, PEP 659; the tier-2 JIT) and writing extensions.
- **[new] C++: zero to expert.** Organised around object lifetime, since that is the language's actual demand. Rule of zero and five, dangling as the defining failure mode, the memory model and atomics, UB as a thing the optimiser assumes absent, template metaprogramming to the level of reading CUTLASS, value categories, ABI, codegen intuition via Compiler Explorer.
- **[new] JavaScript: zero to expert.** Closures, `this` binding rules, prototypes, and the event loop with the task/microtask distinction; then V8 hidden classes and deoptimisation, workers and SharedArrayBuffer, streams and backpressure, Proxy/Reflect, and reading the ECMA-262 spec. Includes the runtime landscape (Node 24 Active LTS, Node 26 Current with Temporal on by default, Bun, Deno 2).
- **[new] TypeScript: zero to expert.** Framed as a compile-time type language over JavaScript: narrowing and discriminated unions, generics, then conditional and mapped types, template literal types, variance, and the deliberate unsoundness. Records that **TypeScript 7.0 shipped 2026-07-08** as a Go-native port (8-12x faster builds, VS Code codebase 125.7s to 10.6s), with no stable programmatic API until 7.1 and hardened strict defaults, so API-consuming tooling gates the upgrade.
- **[update] Rust: restructured** from "from-zero orientation for a C++ programmer" into the same five-stage shape, since the C++ premise no longer holds. The C++ translation survives as an optional appendix; the toolchain and ML-ecosystem sections are unchanged. New material at the top end: `unsafe` with Miri, FFI both ways, monomorphisation and niche optimisation, variance and HRTBs.
- **[update] Topic page rewritten**: new taxonomy, the shared-ladder table, per-track summaries, and a seven-row file map.
- Companion pages kept as-is and renamed in the file map: [python-staying-current.md](http://python-staying-current.md/), [cpp-staying-current.md](http://cpp-staying-current.md/).

### Notes

- Placement rule respected: no new topic. Five deep dives under the existing `programming-languages` topic.
- Tracker: boxes added for all five curricula plus the two companion pages; no existing tick touched.
- JS/TS currency claims (Node LTS state, TS 7.0 dates and benchmarks, runtime landscape) were checked against sources this session rather than recalled, since both post-date the training cutoff. The Bun acquisition detail is reported by secondary sources only and is marked as such on the page.

### Package management added (2026-08-31, same day)

Follow-up request: cover package managers explicitly on every language page. Each zero-to-expert page now carries a **Package management** section placed after Stage 0, written to explain what each tool is and which problem it was built for, not just which to use.

- **Python**: the four layers (interpreter versions, isolation, resolve-and-install, build backend) and why splitting them is what makes Python packaging confusing. pip and the unactivated-venv disaster, venv, pipx, **Poetry** (the 2018 all-in-one that normalised lock files and a single `pyproject.toml`, its slow resolver and its pre-PEP-621 divergence, and why you must be able to read `poetry.lock` even though new work starts elsewhere), PDM and Hatch, **conda/mamba** as a separate ecosystem shipping CUDA and MKL rather than Python packages, and **uv** as the current default. Closes with lock files versus ranges, applications versus libraries, editable installs, extras, wheels versus sdists.
- **JavaScript**: **npm as two separate things**, the registry and the bundled CLI. The shared `package.json` and semver model. **Yarn**'s origin (npm installs in 2016 were slow and non-deterministic), the split between frozen Yarn 1 classic and Yarn 2+ Berry with Plug'n'Play and no `node_modules`, **pnpm**'s content-addressable store and strictness about phantom dependencies, Bun, and Deno's URL/`npm:` approach. Plus `npm ci` versus `npm install`, npx, workspaces, `overrides`/`resolutions`, and `postinstall` supply-chain risk.
- **TypeScript**: only the deltas, since it reuses the JS managers. `typescript` as a devDependency never global, pinning tightly because a TS minor can break a build that compiled before, `@types/*` and DefinitelyTyped, `skipLibCheck`, publishing declaration files through `exports`, and the `peerDependencies` mechanism that made TS 7.0's missing programmatic API break tooling.
- **C++**: why there is no official manager at all, with ABI compatibility as the root cause. System packages and pkg-config, vendoring and submodules, header-only as a workaround, CMake `FetchContent`, **vcpkg** manifest mode, **Conan** with its ABI-aware profiles. Plus build system versus package manager, static versus dynamic linking, ODR hazards, and the absence of a lock-file culture.
- **Rust**: the shortest section, because cargo is uncontested. [crates.io](http://crates.io/), `Cargo.toml` versus `Cargo.lock`, the 0.x semver rule where minor is the breaking position, multiple major versions coexisting in one binary, feature unification, workspaces, `cargo install`, [docs.rs](http://docs.rs/), and `cargo audit`/`deny`/`vendor` plus the build-script equivalent of npm `postinstall` risk.
