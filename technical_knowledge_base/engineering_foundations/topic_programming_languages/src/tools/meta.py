"""Languages, jobs, timeline and notes for the Toolchain atlas. Every dated fact carries its URL."""

LANGS = [
    {"id": "py", "name": "Python", "col": "c1"},
    {"id": "cpp", "name": "C++", "col": "c2"},
    {"id": "rs", "name": "Rust", "col": "c3"},
    {"id": "ts", "name": "TypeScript", "sub": "and JavaScript", "col": "c4"},
]

# Jobs in the order a project meets them. q is the plain question the job answers.
JOBS = [
    {"id": "install", "g": "Set up", "label": "Install the language", "q": "How do I get the compiler or interpreter, in the version I want, without breaking the system one?"},
    {"id": "project", "g": "Set up", "label": "Project and dependencies", "q": "How do I start a project and add a library to it?"},
    {"id": "lock", "g": "Set up", "label": "Lockfile", "q": "Which file pins the exact versions, so my laptop and CI build the same thing?"},
    {"id": "registry", "g": "Set up", "label": "Package registry", "q": "Where do libraries come from?"},
    {"id": "fmt", "g": "Write", "label": "Formatter", "q": "What rewrites my code into the one house style?"},
    {"id": "lint", "g": "Write", "label": "Linter", "q": "What warns about code that is legal but probably wrong?"},
    {"id": "types", "g": "Write", "label": "Type checker", "q": "What checks types before the program runs?"},
    {"id": "test", "g": "Check and run", "label": "Test runner", "q": "How do I write and run tests?"},
    {"id": "build", "g": "Check and run", "label": "Build system", "q": "What turns source files into something that runs or installs?"},
    {"id": "debug", "g": "Check and run", "label": "Debugger and profiler", "q": "How do I stop the program and look inside, and find where the time goes?"},
    {"id": "san", "g": "Check and run", "label": "Sanitizers and memory checkers", "q": "What catches memory bugs and undefined behaviour while the program runs?"},
    {"id": "docs", "g": "Share", "label": "Documentation", "q": "How do comments in the code become a documentation site?"},
    {"id": "publish", "g": "Share", "label": "Publishing a package", "q": "How do I put my library where others can install it?"},
    {"id": "ffi", "g": "Share", "label": "Calling the other languages", "q": "How does this language call, or get called by, the other three?"},
    {"id": "repl", "g": "Share", "label": "Notebooks and REPL", "q": "Where do I try one line interactively?"},
]

NOTES = {
    "method": "Each version is the newest stable release on the official registry or release page, read on 2026-10-05 by research/fetch_versions.py (PyPI JSON API, crates.io API, npm registry, GitHub release feeds) or from the page linked. 'Ships with' means the tool has no version of its own: it comes inside the toolchain named. Commands are the ones a beginner types; the walkthroughs below ran them for real.",
    "machine": "Walkthroughs ran on 2026-10-05 on an Apple-silicon Mac (macOS 27): uv 0.12.23 with CPython 3.14.8; Apple clang 14.0.0 with CMake 4.4.4 and Ninja 1.13.2 (installed from PyPI with uv tool install); rustup 1.29.1 with Rust 1.99.0; Node 22.22.2 with npm 10.9.7, TypeScript 7.0.2 and Vitest 5.0.3; Bun 1.4.2. Everything was installed inside a scratch folder, nothing system-wide.",
}

# Timeline lanes. kind: rel (a release), std (a standard or edition), plan (scheduled, not yet happened), event.
TIMELINE = [
    {"lane": "py", "name": "Python", "src": "https://devguide.python.org/versions/", "items": [
        {"d": "2023-10-02", "k": "rel", "t": "3.12", "n": "f-string grammar (PEP 701), type statement and generic syntax (PEP 695), per-interpreter GIL in the C API (PEP 684). Security fixes only as of 2026-10-05; end of life 2028-10.", "u": "https://peps.python.org/pep-0693/"},
        {"d": "2024-10-07", "k": "rel", "t": "3.13", "n": "New interactive REPL, experimental free-threaded build (PEP 703) and experimental JIT (PEP 744). Security fixes only as of 2026-10-05 (devguide); end of life 2029-10.", "u": "https://peps.python.org/pep-0719/"},
        {"d": "2025-10-07", "k": "rel", "t": "3.14", "n": "Free-threaded build officially supported (PEP 779), template strings (PEP 750), deferred annotations (PEP 649/749), subinterpreters in the stdlib (PEP 734). Current bugfix line: 3.14.8 on 2026-09-30; end of life 2030-10.", "u": "https://peps.python.org/pep-0745/"},
        {"d": "2026-10-02", "k": "rel", "t": "3.15.0rc3", "n": "Third release candidate, added to the schedule after rc2 (PEP 790 lists it under 'Actual').", "u": "https://peps.python.org/pep-0790/"},
        {"d": "2026-10-09", "k": "plan", "t": "3.15.0", "n": "Expected final (PEP 790). Headline PEPs in What's New: explicit lazy imports (810), frozendict (814), sentinel (661), a profiling package with the Tachyon sampling profiler (799), frame pointers on by default (831), stable ABI for free-threaded builds (803), UTF-8 default encoding (686). End of life about 2031-10.", "u": "https://docs.python.org/3.15/whatsnew/3.15.html"},
        {"d": "2027-10-06", "k": "plan", "t": "3.16", "n": "First release date listed for 3.16 on the devguide (PEP 826).", "u": "https://devguide.python.org/versions/"},
    ]},
    {"lane": "cpp", "name": "C++", "src": "https://en.cppreference.com/w/cpp/language/history.html", "items": [
        {"d": "2017-12-01", "k": "std", "t": "C++17", "dp": "2017", "n": "ISO/IEC 14882:2017 (cppreference lists the year; the month is not shown there, so only the year is claimed). Structured bindings, std::optional, std::variant, if constexpr.", "u": "https://en.cppreference.com/w/cpp/17.html"},
        {"d": "2020-12-01", "k": "std", "t": "C++20", "dp": "2020", "n": "Concepts, ranges, coroutines, modules, three-way comparison, std::span, std::format.", "u": "https://en.cppreference.com/w/cpp/20.html"},
        {"d": "2021-04-27", "k": "event", "t": "GCC 11 defaults to C++17", "n": "GCC 11.1: 'The default mode for C++ is now -std=gnu++17 instead of -std=gnu++14.'", "u": "https://gcc.gnu.org/gcc-11/changes.html"},
        {"d": "2023-03-17", "k": "event", "t": "Clang 16 defaults to C++17", "n": "Clang 16 release notes: 'Clang's default C++/ObjC++ standard is now gnu++17 instead of gnu++14.' Apple's Xcode clang is a separate fork: measured here, Apple clang 14.0.0 reports __cplusplus 199711L and the Command Line Tools' Apple clang 17.0.0 reports 201402L when no -std flag is given.", "u": "https://releases.llvm.org/16.0.0/tools/clang/docs/ReleaseNotes.html"},
        {"d": "2024-10-01", "k": "std", "t": "C++23", "dp": "2024-10", "n": "Published by ISO as ISO/IEC 14882:2024 in October 2024 (ISO page, archived capture). std::expected, std::print, std::mdspan, deducing this, import std. MSVC still exposes it as /std:c++23preview (MSVC Build Tools preview notes, September 2026).", "u": "https://web.archive.org/web/2026/https://www.iso.org/standard/83626.html"},
        {"d": "2026-03-28", "k": "std", "t": "C++26 technically complete", "n": "Herb Sutter, 2026-03-29: 'C++26 is done!' at the London Croydon meeting: static reflection, contracts, std::execution, the hardened standard library and no undefined behaviour for reading uninitialised locals. Then the DIS ballot; cppreference lists final draft N5050 dated 2026-06-01. ISO publication was not confirmed on 2026-10-05.", "u": "https://herbsutter.com/2026/03/29/c26-is-done-trip-report-march-2026-iso-c-standards-meeting-london-croydon-uk/"},
        {"d": "2026-04-30", "k": "event", "t": "GCC 16 defaults to C++20", "n": "GCC 16.1: 'GCC 16 changes the default language version for C++ compilation from -std=gnu++17 to -std=gnu++20.' C++20 modules still need -fmodules. Latest: GCC 16.2 on 2026-08-07.", "u": "https://gcc.gnu.org/gcc-16/changes.html"},
        {"d": "2026-06-13", "k": "event", "t": "First C++29 meeting", "n": "Brno: adopted a catalogue of all undefined behaviour in C++ (P3596) as a step toward addressing it in C++29, plus work on safety profiles.", "u": "https://herbsutter.com/2026/06/13/brno-trip-report/"},
    ]},
    {"lane": "rs", "name": "Rust", "src": "https://github.com/rust-lang/rust/blob/master/RELEASES.md", "items": [
        {"d": "2018-12-06", "k": "std", "t": "Edition 2018", "n": "Shipped with Rust 1.31.0 (RFC 2052, which also created editions): the module-system changes, async becomes a keyword.", "u": "https://doc.rust-lang.org/edition-guide/rust-2018/index.html"},
        {"d": "2021-10-21", "k": "std", "t": "Edition 2021", "n": "Shipped with Rust 1.56.0 (RFC 3085): disjoint closure captures, IntoIterator for arrays, resolver 2 by default.", "u": "https://doc.rust-lang.org/edition-guide/rust-2021/index.html"},
        {"d": "2025-02-20", "k": "std", "t": "Edition 2024", "n": "Shipped with Rust 1.85.0 (RFC 3501). cargo new on Rust 1.99 writes edition = \"2024\" (measured). No later edition had been announced on the Rust blog index on 2026-10-05.", "u": "https://doc.rust-lang.org/edition-guide/rust-2024/index.html"},
        {"d": "2026-10-01", "k": "rel", "t": "Rust 1.99.0", "n": "Current stable. A new stable every six weeks: 1.97.0 on 2026-07-09, 1.98.0 on 2026-08-20, 1.99.0 on 2026-10-01 (RELEASES.md). Editions are chosen per crate and crates of different editions link together.", "u": "https://github.com/rust-lang/rust/blob/master/RELEASES.md"},
    ]},
    {"lane": "es", "name": "ECMAScript", "src": "https://ecma-international.org/publications-and-standards/standards/ecma-262/", "items": [
        {"d": "2015-06-01", "k": "std", "t": "ES2015 (6th)", "dp": "June 2015", "n": "Classes, modules, let/const, arrow functions, promises: the big one. Every edition since is yearly, each June.", "u": "https://ecma-international.org/publications-and-standards/standards/ecma-262/"},
        {"d": "2017-06-01", "k": "std", "t": "ES2017", "dp": "June 2017", "n": "async functions, shared memory and atomics, Object.values/entries.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
        {"d": "2020-06-01", "k": "std", "t": "ES2020", "dp": "June 2020", "n": "Optional chaining (?.), nullish coalescing (??), BigInt, dynamic import(), globalThis.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
        {"d": "2022-06-01", "k": "std", "t": "ES2022", "dp": "June 2022", "n": "Top-level await, class fields and private #fields, .at(), Error cause.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
        {"d": "2024-06-01", "k": "std", "t": "ES2024", "dp": "June 2024", "n": "Object.groupBy / Map.groupBy, Promise.withResolvers, resizable ArrayBuffers, RegExp v flag.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
        {"d": "2025-06-01", "k": "std", "t": "ES2025", "dp": "June 2025", "n": "Iterator helpers, new Set methods, JSON modules and import attributes, Promise.try, RegExp.escape, Float16.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
        {"d": "2026-06-01", "k": "std", "t": "ES2026 (17th)", "dp": "June 2026", "n": "Array.fromAsync, Error.isError, Math.sumPrecise, Uint8Array to and from Base64, upsert (Map getOrInsert), iterator sequencing, JSON.parse source text access.", "u": "https://ecma-international.org/publications-and-standards/standards/ecma-262/"},
        {"d": "2027-06-01", "k": "plan", "t": "ES2027", "dp": "June 2027", "n": "Already at Stage 4 for 2027: Temporal, explicit resource management (using), joint iteration, iterator chunking and join. Node 26 already enables Temporal by default.", "u": "https://github.com/tc39/proposals/blob/main/finished-proposals.md"},
    ]},
    {"lane": "ts", "name": "TypeScript and Node", "src": "https://www.npmjs.com/package/typescript", "items": [
        {"d": "2023-03-16", "k": "rel", "t": "TS 5.0", "n": "Standard decorators, const type parameters. First stable 5.0.x on npm.", "u": "https://www.npmjs.com/package/typescript/v/5.0.2"},
        {"d": "2024-10-29", "k": "event", "t": "Node 22 LTS", "n": "Node 22 (Jod) enters LTS; it later gains type stripping on by default in 22.18.0. Maintenance since 2025-10-21, end of life 2027-04-30.", "u": "https://github.com/nodejs/Release/blob/main/schedule.json"},
        {"d": "2025-07-31", "k": "rel", "t": "TS 5.9", "n": "Last 5.x minor (5.9.2 on npm).", "u": "https://www.npmjs.com/package/typescript/v/5.9.2"},
        {"d": "2025-10-28", "k": "event", "t": "Node 24 LTS", "n": "Node 24 (Krypton) Active LTS; type stripping marked stable in 24.12.0. Maintenance from 2026-10-20, end of life 2028-04-30.", "u": "https://github.com/nodejs/Release/blob/main/schedule.json"},
        {"d": "2026-03-23", "k": "rel", "t": "TS 6.0", "n": "The last compiler written in TypeScript: new defaults (strict on, module esnext, types []) and deprecations, to prepare for 7.0. 6.0.3 on 2026-04-16 is the latest 6.x.", "u": "https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/"},
        {"d": "2026-05-05", "k": "rel", "t": "Node 26", "n": "Current line, V8 14.6, Temporal on by default. Planned LTS 2026-10-28. From Node 27 the cycle is annual and every major becomes LTS.", "u": "https://nodejs.org/en/blog/release/v26.0.0"},
        {"d": "2026-07-08", "k": "rel", "t": "TS 7.0", "n": "The Go port (formerly tsgo, Project Corsa) becomes the typescript package and its tsc: Microsoft reports 8x to 12x faster full builds (VS Code 125.7 s to 10.6 s). No programmatic API until 7.1, so tools like typescript-eslint, Vue, Svelte and Astro tooling keep TypeScript 6 alongside (@typescript/typescript6, binary tsc6). Latest 7.0.2.", "u": "https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/"},
        {"d": "2026-10-28", "k": "plan", "t": "Node 26 LTS", "n": "Scheduled start of LTS for Node 26.", "u": "https://github.com/nodejs/Release/blob/main/schedule.json"},
    ]},
]
