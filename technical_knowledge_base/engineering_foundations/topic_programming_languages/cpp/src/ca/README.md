# The source folder of "C++: the essentials" (key `ca`, the old Part 1 folder, trimmed)

Generated parts in `../parts/`: `20_read_a.html` to `20_read_e.html` (from `tpl/`) and `32_js_ca_data.js` (the gallery's
and the pipeline's data). Never edit them by hand. Hand-written scripts beside them: `33_js_ca_util.js` (escaping and
C++ colouring), `37_js_ca_build.js` (the Build pipeline stepper, section 1), `38_js_ca_ub.js` (the UB gallery, section 2).

Section anchors (stable, for links from other pages): `es-idea`, `es-one`, `es-build`, `es-ub`, `es-ub-gallery`, `es-libs`,
`es-std` (the dated status block is `es-std-2026`), `es-hyg`, `es-kids`. One gallery case: `es-ub-<case>`, with `overflow`,
`uninit`, `index-oob`, `table`, `dangling-vec`, `string-view`, `lambda`, `double-free`, `no-return`, `race`; the script
selects the case named in the URL (for example `.../cpp/#es-ub-double-free`).

## Pipeline

1. `PL=<scratch folder> sh src/ca/run_all.sh` compiles and runs every example in `code/` (copied to `$PL/ca/work`, never
   built in the repo) and records each command and its combined output in `out/NAME.txt`. Steps in `steps/`:
   `05_hero.sh` (the hero: `code/hero/vector.cpp` and `vector.py`), `10_build.sh` (preprocess, compile, nm, link errors,
   ODR, CMake), `20_lang.sh` (the standards section: default `__cplusplus`, feature macros), `40_ub.sh` (the gallery at
   -O0, -O2 and under sanitizers). `ONLY=hero` runs only the matching step files. `lib.sh` expects LLVM clang 23 in
   `$PL/llvm`, CMake and Ninja in `$PL/uvtools/bin` and `python3.14` in `$PL/dsbin`; on 2026-10-26 only the hero step was
   rerun (no LLVM 23 in this session), the rest are the 2026-10-05 recordings.
2. `python3 src/ca/gen.py` turns `tpl/*.html` into the parts, replacing `[[code:PATH(:A-B)]]`, `[[out:NAME]]`,
   `[[pr:NAME|QUESTION]]` (predict, then reveal) and `[[g:NAME|REGEX]]` (a number taken from an output) with the real
   files, and writes `parts/32_js_ca_data.js`.
3. `sh src/build.sh`, then `node src/ca/check.mjs [shots dir]` (every control at 390 dark and 920 light; the stepper does
   not move by itself; `#es-ub-string-view` opens that case; every embedded output equals its file) and
   `sh html_utils/checkpage.sh <page folder>`.

## Toolchains
See `versions.txt`. `clang++` is a wrapper for Apple clang 17.0.0 (Command Line Tools) with `-isysroot` the macOS 26
SDK; `clang++-23` is LLVM clang 23.1.2 from the scratch folder, used for the gallery and every sanitizer run because
Apple's ASan does not start on macOS 27. `lib.sh` writes both wrappers.

## What moved out (2026-10-26)
The language examples (`code/lang/` except `features.cpp`, their `l_*` outputs, the lifetime traces `lt_*`, the timings
`t_*`, `steps/30_timing.sh`) are on the ownership and classes children, each with its own trimmed copy of this folder.
`coverage.json` (the old pages' claims, checked) and `viz_ideas.md` stay as provenance.
