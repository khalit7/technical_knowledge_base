# Part 1 of the Rust page: "For Python programmers" (part key `ra`)

Owned files in `../parts/`: `11_tabs_ra.html` (tab buttons), `30_tab_ra_read_a..f,z.html` (Reading), `31_tab_ra_own.html`,
`32_tab_ra_bc.html`, `33_tab_ra_drill.html` (all generated from `tpl/`), `34_js_ra_data.js` (generated), and the
hand-written scripts `35_js_ra_util.js`, `36_js_ra_read.js`, `37_js_ra_own.js`, `38_js_ra_bc.js`, `39_js_ra_drill.js`.

Tab ids (stable, for links from other parts): `t-ra-read` (Reading), `t-ra-own` (Ownership, animated), `t-ra-bc`
(Borrow-checker lab), `t-ra-drill` (Python to Rust drill). Reading section anchors: `ra-one`, `ra-cargo`, `ra-vars`,
`ra-num`, `ra-own`, `ra-borrow`, `ra-life`, `ra-str`, `ra-enum`, `ra-err`, `ra-trait`, `ra-iter`, `ra-coll`, `ra-mod`,
`ra-test`, `ra-smart`, `ra-conc`, `ra-unsafe`, `ra-cpp`, `ra-mist`, `ra-path`.

## Pipeline

1. `sh src/ra/run_all.sh` copies `code/` (and the root's `src/rosetta/data/chat.jsonl`) to the scratch folder
   `pl/ra/work`, compiles and runs every example there, and records each command and its combined output in
   `out/NAME.txt` (paths shortened). Steps: `steps/10_basics.sh` (cargo, variables, numbers), `20_lang.sh` (sections 4 to
   17, the tokstat crate and its tests, Miri), `30_timing.sh` (the iterator benchmark, with the load average before and
   after), `40_bc.sh` (the 15 borrow-checker scenarios, their fixes, the Polonius run, and the 12 drill items with three
   candidates each). About three minutes; `sh src/ra/run_all.sh 40` reruns one step.
2. `python3 src/ra/gen.py` turns `tpl/*.html` into the parts files, replacing `[[code:...]]`, `[[out:...]]`, `[[pr:...]]`
   (predict, then reveal) and `[[g:...]]` (a value taken from an output), and writes `parts/34_js_ra_data.js` from the
   outputs, sources and `content.py` (the hand-written notes for the lab and the drill). Never edit generated parts by hand.
3. `sh src/build.sh`, then `node src/ra/check.mjs` (every control of the four tabs at 390 dark and 920 light; no errors,
   NaN, undefined or sideways scroll; every embedded output and every JS data string equals its file; each lab scenario's
   stated kind matches its recording and every fix runs; each drill item has exactly one candidate printing what Python
   prints, and it is the marked answer) and `sh html_utils/checkpage.sh <page folder>`.

Process ids in panic messages, addresses, HashMap orders and timings change from run to run; the prose takes such values
from the outputs through `[[g:...]]` or the JS reads them from the data, so a rerun keeps text and outputs consistent.
One exception to watch: drill item 9 needs the HashMap candidate's random order to differ from insertion order (6 keys,
1 chance in 720 per run); `check.mjs` fails if it ever coincides, and a rerun fixes it.

## Departures from the method
One Notion page per language, so this "child page" is one part of a page with a part bar. Further reading is section 20
of the Reading (the old page's resources, checked and timed) rather than its own tab, as the C++ and Python parts did.
