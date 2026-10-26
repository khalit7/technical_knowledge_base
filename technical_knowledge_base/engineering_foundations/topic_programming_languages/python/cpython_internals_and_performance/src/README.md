# Source of "Python: CPython internals and performance"

Child page 3 of Python: the essentials (page prefix `ci`, storage key `ci-tab`), section 1 child 3 of the language split plan. Built 2026-10-26 by splitting the language page; no new measurements were run.

## Build
`sh build.sh` writes `../index.html` from `parts/` (the skill template build: single-level tabs, Reading `t-read`, Version explorer `t-ver`, Further reading `t-more`).
Generated parts, never edited by hand:
- `pa/gen.py` expands `pa/tpl/` into `parts/20_read_b.html` (sections 1 and 2), `parts/20_read_c.html` (sections 3 and 4) and `parts/22_js_ci_0pa.js` (`window.PA`: the three `dis` listings, the NumPy timings, the profile totals), inlining the real code and recorded outputs (`[[run:]]`, `[[code:]]`, `[[out:]]`, `[[predict:]]`, `[[drill:TITLE]]`).
- `pb/build_data.py` writes `parts/22_js_ci_0pb.js` (`window.PB`: the 21 version snippets and their runs, the JIT runs, the lazy-import runs) from `pb/out/` and `pb/versions/`.
Hand-written parts: `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js` (skill templates; storage key `ci-tab`), `10_header.html`, `20_read_a.html` (styles, nav, the idea in one screen), `20_read_d.html` (the JIT), `20_read_e.html` (3.12 to 3.15), `20_read_f.html` (lazy imports), `20_read_z.html`, `23_js_ci_util.js` (terminal blocks, prediction prompts, bars; from the concurrency sibling), `24_js_ci_hero.js` (hero, ladder, object layouts), `25_js_ci_perf.js` (bytecode stepper, predictions, profile and NumPy bars), `26_js_ci_jit.js`, `27_js_ci_ver.js` (Version explorer, release lines, the UTF-8 run), `28_js_ci_lazy.js`, `30_tab_ver.html`, `39_tab_more.html`.
Order after a rerun: `sh pa/run_all.sh`, `sh pb/run_all.sh` (it ends with the build and `check_embed.py`), `python3 pa/check_numbers.py`, `python3 pa/gen.py`, `sh build.sh`, `node check_controls.mjs`.

## Provenance (copied with `cp -R` from the language page's `src/`, which was left unchanged)
| Here | From the language page | What |
|---|---|---|
| `pa/code`, `pa/outputs` | `src/pa/` | `i1_dis`, `i2_refcount`, `i3_sizes`, `p1_slow`, `p1_fast`, `p1_profile`, `p2_numpy`, the py-spy and Scalene outputs, and `q_drills` trimmed to its two "internals" drills |
| `pa/gen.py`, `pa/run_all.sh`, `pa/check_numbers.py`, `pa/versions.txt` | `src/pa/` | trimmed to this page; `gen.py` from the concurrency sibling's copy, class names with the `ci-` prefix |
| `pa/tpl/20_read_b.html`, `20_read_c.html` | `src/pa/tpl/30_tab_pa_read_i.html`, `_j.html`, the containers table of `_k.html` | Part 1 sections 11 and 12 and the containers table of 13, rewritten to the teaching contract |
| `pb/versions`, `pb/features.py`, `pb/jit`, `pb/lazy`, `pb/out` (`versions.json`, `jit.json`, `jit_earlier_run.txt`, `lazy.json`), `pb/env.sh`, `pb/versions.txt` | `src/pb/` | the version snippets, the JIT and lazy-import runs |
| `pb/build_data.py`, `pb/run_all.sh`, `pb/check_embed.py` | `src/pb/` | trimmed; `run_all.sh` walks up to `topic_programming_languages` for the root's shared data generator (`src/rosetta/data/gen_chat.py`, read-only); `check_embed.py` also checks the JIT ratios quoted in the prose |
| `parts/20_read_d.html`, `20_read_e.html`, `20_read_f.html` | `40_tab_pb_read_g.html` (section 10), `40_tab_pb_read_f.html` (sections 7 and 8), the JIT rows of `40_tab_pb_read_z.html`, `42_tab_pb_lab.html` part 3 | |
| `parts/25_js_ci_perf.js`, `26_js_ci_jit.js`, `27_js_ci_ver.js`, `28_js_ci_lazy.js`, `30_tab_ver.html` | `35_js_pa_read.js`, `42_js_pb_read_d.js`, `44_js_pb_lab.js`, `43_js_pb_ver.js`, `42_js_pb_read_c.js`, `41_tab_pb_ver.html` | |

## Departures from the topic-child shape, and why
- **One tab kept, one dissolved.** The Version explorer stays a tab: it is a lookup tool (minimum version, kind filter, 105 cells, a drill) that sections 6 and 7 both send the reader to, not the explanation of one mechanism. Its release-lines chart explains the support schedule, so it moved inline into section 6. The Runtime lab's part 3 (every JIT time) is a closed block beside the JIT table.
- **Predictions inline.** The old Predict tab's two "internals" drills (integer caching, float arithmetic) are reveals in section 2; four choice prompts were added (specialisation after floats arrive, cProfile's overhead, NumPy at 10 elements, the 3.15 JIT), each placed before the visual that answers it.
- **Code in closed blocks** except `i2_refcount`, whose code is the prediction.
- **Nothing moves before the reader acts.** The lazy-import stepper used to play on a mode switch; it now resets to step 1.
- **New figures from recorded data only**: the hero (from `p2_numpy`), the ladder, the object layouts (from `i3_sizes`), the profile bars (from `p1_profile`), the UTF-8 terminal (from `versions.json`).

## Length judgement
| | Language page (2026-10-26, these sections) | This page |
|---|---|---|
| Core reading (230 words a minute, `html_utils/audit_pages.mjs`) | not measured section by section (Part 1 s11 and s12 and Part 2 s7, s8 and s10 had their code inline; the Version explorer and Runtime lab part 3 were tabs) | 18.9 min Reading (plus 3.4 in the Version explorer tab) |
| Closed details | none | 6.4 min (scripts, every size and every JIT time, the old pages' corrections, the containers table) |
The plan estimated 14 min. The core is longer because the real outputs that carry the evidence stay in it (the cProfile report, the `i2_refcount` script as a prediction, the 21-row `dis` listing in the stepper, the 3.12 to 3.15 table): an engineer who knows Python well can skim them, but cutting them would leave the claims without their proof. On familiar ground (what a profiler is, what NumPy is) the page skips straight to what was measured.

## Ledger
`ledger.json`: 148 units of this page (core 126, depth 20, fat 2), labelled by `label_ledger.py` (depth when the unit sits in a closed block); `ledger.py check` problems 0. `from_master.json`: 104 units of the language page's master ledger covered here (100 owned by this page, including unit 361 "encoding=" and the JIT row 573 handed over by the siblings; 4 fat: two self-check questions, the "Part 1: In depth" pointer and the release-lines marker date).

## Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/check_controls.mjs`: every button, mode, step, range, select and closed block at 390 dark and 920 light, plus reduced motion (nothing moves): clean. `python3 src/pb/check_embed.py`: ALL OK. `python3 src/pa/check_numbers.py`: 8 numbers, none stale.
