# Part 1 of the C++ page: "The language" (part key `ca`)

Owned files in `../parts/`: `11_tabs_ca.html` (tab buttons), `30_tab_ca_read_a..g.html` (Reading), `31_tab_ca_build.html`,
`32_tab_ca_life.html`, `33_tab_ca_ub.html`, `34_tab_ca_drill.html` (generated from `tpl/`), and the scripts
`32_js_ca_data.js` (generated), `33_js_ca_util.js`, `34_js_ca_life.js`, `35_js_ca_read.js`, `36_js_ca_lifetab.js`,
`37_js_ca_build.js`, `38_js_ca_ub.js`, `39_js_ca_drill.js` (hand-written).

Tab ids (stable, for links from other parts): `t-ca-read` (Reading), `t-ca-build` (Build pipeline), `t-ca-life`
(Object lifetimes), `t-ca-ub` (UB gallery), `t-ca-drill` (Predict the output). Reading section anchors: `ca-one`,
`ca-build`, `ca-val`, `ca-mem`, `ca-raii`, `ca-own`, `ca-move`, `ca-class`, `ca-tmpl`, `ca-std`, `ca-lam`, `ca-err`,
`ca-ub`, `ca-libs`, `ca-ver`, `ca-mist`, `ca-path`.

## Pipeline

1. `sh src/ca/run_all.sh` compiles and runs every example in `code/` (copied to the scratch folder `pl/ca/work`, never
   built in the repo) and records each command and its combined output in `out/NAME.txt`. Steps live in `steps/`:
   `10_build.sh` (preprocess, compile, nm, link errors, ODR, CMake), `20_lang.sh` (language examples, lifetime traces,
   feature macros), `30_timing.sh` (virtual-call and exception timings with the load average), `40_ub.sh` (the UB
   gallery at -O0, -O2 and under sanitizers). About a minute.
2. `python3 src/ca/gen.py` turns `tpl/*.html` into the parts files, replacing `[[code:...]]`, `[[out:...]]`,
   `[[pr:...]]` (predict, then reveal) and `[[g:...]]` (a number taken from an output) with the real files, and writes
   `parts/32_js_ca_data.js` (lifetime logs, gallery and pipeline data). Never edit the generated parts by hand.
3. `sh src/build.sh`, then `node src/ca/check.mjs` (every control of the five tabs at 390 dark and 920 light; no
   errors, NaN, undefined or sideways scroll; each drill has exactly one right choice; every embedded output equals its
   file) and `sh html_utils/checkpage.sh <page folder>`.

Timings, addresses, process ids and the data-race count change from run to run; the prose takes such numbers from the
outputs through `[[g:...]]`, so a rerun keeps text and outputs consistent.

## Toolchains
See `versions.txt`. `clang++` is a wrapper for Apple clang 17.0.0 (Command Line Tools) with `-isysroot` the macOS 26
SDK (it has C++23 `<expected>` and `<print>`); `clang++-23` is LLVM clang 23.1.2 from the scratch folder, used for the
gallery and every sanitizer run because Apple's ASan does not start on macOS 27. `lib.sh` writes both wrappers.

## Departures from the method
One Notion page per language, so this "child page" is one part of a page with a part bar; Further reading for this
part is section 16 of its Reading (resources from the old page, timed) rather than its own tab, since a page-wide
Further reading may be added at integration.
