# Sources of Rust: the essentials (prefix `ra`)

The trimmed Part 1 folder of the old three-part Rust page: what this page shows and nothing else. The children hold their own copies (`cp -R`) of what they show.

Generated parts in `../parts/`: `20_read_a.html` to `20_read_d.html` and `20_read_z.html` (the Reading tab, from `tpl/`), `34_js_ra_data.js` (the hero's two runs, the borrow timeline's three programs, the Borrow-checker lab's fifteen scenarios with `content.py`'s notes). Never edit them by hand.
Hand-written scripts in `../parts/`: `35_js_ra_util.js` (highlighting, output blocks, run verdicts), `36_js_ra_read.js` (borrow timeline, prediction prompts), `37_js_ra_own.js` (the hero), `38_js_ra_bc.js` (the lab).

Reading section anchors: `ra-top`, `ra-one`, `ra-cargo`, `ra-num`, `ra-own`, `ra-borrow`, `ra-mod`, `ra-mist`, `ra-cpp`, `ra-kids`.

## Pipeline
1. `sh src/ra/run_all.sh` copies `code/` (and the root's `src/rosetta/data/chat.jsonl`) to the scratch folder `pl/ra_es/work`, compiles and runs every example there, and records each command and its combined output in `out/NAME.txt` (paths shortened). Steps: `steps/10_basics.sh` (cargo, variables, numbers), `20_lang.sh` (ownership, borrowing, modules, the tokstat run), `40_bc.sh` (the 15 borrow-checker scenarios, their fixes, the Polonius run, and the three drill items d02, d03, d12 with three candidates each). About two minutes; `sh src/ra/run_all.sh 40` reruns one step.
2. `python3 src/ra/gen.py` expands `tpl/*.html` (directives `[[code:]]`, `[[out:]]`, `[[pr:]]`, `[[g:]]`, `[[drill:]]`) and writes the data script.
3. `sh src/build.sh`, then `node src/ra/check.mjs` (every control at 390 dark and 920 light with reduced motion; nothing changes without input; every embedded output and every JS data string equals its file; each lab scenario's stated kind matches its recording and every fix runs; each prediction has exactly one candidate printing what Python prints, and it is the marked answer) and `sh html_utils/checkpage.sh <page folder>`.

`coverage.json` is the check of the old written page "Rust: zero to expert" made for the old Part 1 (kept as provenance; the PyO3 and async children keep the Part 2 and Part 3 ones). `versions.txt` lists the toolchains (recorded 2026-10-05).
