# src: Testing and quality

Child page of Topic: swe-and-system-design (page prefix `tq`, storage key `tq-tab`). Built 2026-10-04 (all experiments run that day on an Apple M1 Pro); rebuilt 2026-10-24 to the teaching contract (editing and new figures only, no new runs).

Build: `sh build.sh` (the explainer-page skill template) writes `../index.html` from `parts/`. Data: `python3 gen_data.py` writes `parts/30_js_data.js` (window.TQ) from `inputs/` and `experiments/`. Checks, from the repo root: `node <page>/src/check_page.mjs` (every control at 390 dark and 920 light, page numbers against `recompute.py`, prose numbers, and that the property animation does not move by itself), `node <page>/src/shot_figs.mjs <page> <out dir>` (each figure in both themes), `sh html_utils/checkpage.sh <page>`, `python3 html_utils/ledger.py check <page>`.

## Parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, the idea in one screen, section 1) to `20_read_j` (section 13 and the closed Reference block), `20_read_z` closes the tab. JS: `21_js_rd_common.js` and `99_js_tabs.js` (skill templates; nothing autoplays), `22_js_tq_svg.js` (SVG helpers, card layout), `30_js_data.js` (generated), `40_js_read.js` (derived numbers, code highlighter, measured terminal blocks, glossary), `41_js_prop.js` (examples against property animation), `42_js_layers.js` (pyramid and trophy, click a band), `43_js_figs.js` (static figures and the shrink plot), `52_js_mut.js` (the mutation lab, now inline in section 10) |
| Further reading `t-more` | `39_tab_more.html` |

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence, a hero figure (every bug found on this page drawn at the lowest layer that caught it, with the "testing the nets" numbers under it), "You need" with the owners of neighbouring concepts, and new terms. The old one-screen table and "habits" box are carried by the hero and the core sentence.
- **A visual beside every core idea** (13 SVG figures, all drawn at the measured width from `window.TQ`): hero, pyramid and trophy (clickable, replaces the button stack), behaviour against implementation (2 x 2: a brittle test fails a correct refactor and passes the real `backoff_delay #2` mutant), test doubles (real, fake, mock behind one seam), Pact in four steps, two engines on one query with the measured cost per test, a shrink plot under the property animation, the LLM feature with a check per piece (the seam highlighted), code, data and model, smoke-test losses, flaky-test causes (Luo et al.), coverage against mutation score as tests are added (new; its curve is checked against `recompute.py`), the CI job graph.
- **The Mutation lab tab moved into Reading section 10** (it explains one mechanism), with a predict-then-reveal question before it; the mutant list is a closed block inside the lab. Two tabs remain: Reading and Further reading.
- **Restructured by ownership** (OWNERS brief): snapshot and golden tests moved into section 7 "Testing code that calls an LLM" (record and replay, golden outputs, deterministic seams: new paragraph), async testing moved into section 9 under its top flakiness cause, test data into a closed block in section 8. **New section 12**, static analysis, types and review as quality gates, placing them in the pipeline and linking Code design sections 6 and 11 for the craft (no re-teaching).
- **Depth into closed blocks**: pytest in one screen (commands, fixtures, parametrisation, markers, config), the 100x claim check, the three ways to get a real PostgreSQL, the stateful test's code, the NumPy example check, VCR and snapshot code and runs, the transform tests, the pandera schema and Great Expectations, the smoke test code, async code and the pytest 8.4 trap, the coverage and mutmut terminal output, mutmut configuration, the full CI workflow and version pins, the GPU-runner options table, what pros run, the glossary.
- **No autoplay**: template `21_js_rd_common.js`; the property animation no longer starts on a mode switch; `check_page.mjs` checks it stays on step 0 with normal motion.
- **Deleted as fat**: the common-mistakes list (every item restated a core section), the one-screen table's questions, the old tab bar and lab pointers, wind-ups.
- **Images**: none. The page teaches practices and mechanisms, not physical objects; no openly licensed figure is the canonical reference (the pyramid is redrawn as a diagram).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `audit_pages.mjs`) | 52.6 min (12,105 words) | 39.5 min (9,083 words) |
| Reading, closed details | 1.2 min | 18.1 min |
| Other tabs, core | Mutation lab 4.0 + Further reading 2.7 | Further reading 2.6 |
| Visuals in Reading (audit: svg, canvas, img) | 0 (three HTML widgets: layer buttons, property animation, flaky strip) | 13 SVG, plus the property animation, flaky strip and mutation lab |

Why about 40 minutes is right: the page owns thirteen practices (layers, unit design, doubles and contracts, integration, property-based and stateful tests, LLM-calling code, data and ML tests, flakiness, coverage and mutation, CI, static checks and review, large changes), each with real code that ran and its measured result; about a seventh of the core words are figure text and captions, and a fifth are code the reader needs to see the point (the chunker, the property, the fake model server, the flaky pairs). What made the old page long without teaching more (the pytest tutorial, reference tables, terminal output, configs, the mistakes list) is closed or deleted.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
471 units: core 347, depth 84, fat 40. 459 drafted by `ledger.py init` from the 2026-10-19 page; keys matched automatically (longest phrase of each unit found on the rebuilt page, at least four words) and the 55 unmatched reviewed by hand; 12 added for the script-drawn figures and the new section and seams paragraph (keys in static captions). Fat units carry a `note`.

## Experiments (all run 2026-10-04, Apple M1 Pro, Python 3.12.11, in a scratch venv; never `uv run` inside the repo without `--no-project`)
Install: `uv venv --python 3.12 .venv && uv pip install pytest==9.1.1 hypothesis==6.168.3 mutmut==3.8.0 coverage==7.16.2 pytest-asyncio==1.4.0 syrupy==6.1.1 pandera==0.33.1 pandas numpy pgserver==0.1.4 'psycopg[binary]' pytest-randomly==5.0.0 pytest-repeat pydantic httpx vcrpy==8.3.0 pytest-recording==0.14.0 pyyaml`.
- `experiments/hyp/`: chunker, example and property tests, traces (`trace.py`, `trace_one.py 6`, `trace_fixed.py`), LRU stateful test. Outputs: `inputs/trace_seeds.json`, `trace_6.json`, `trace_6_fixed.json`, `chunk_*_out.txt`, `lru_out.txt`.
- `experiments/mut/`: retry policy, weak and strong suites, mutmut config; `experiments/killmatrix.py` (run from the parent of `mut/` after `mutmut run`). Outputs: `inputs/killmatrix.json`, `coverage_per_test.json`, `cov_weak.txt`, `run_*_tail.log`. The strong-suite mutmut run used a copy with `tests/test_strong.py` selected.
- `experiments/flaky/`: random and order flakes and fixes. Outputs: `random_batches.txt`, `flaky_seq.json` (JUnit XML parsed), `order_results.txt`.
- `experiments/integ/`: SQLite vs PostgreSQL search (`chats_repo_bug.py`, `chats_repo_fixed.py` copied to `chats_repo.py` to run). Outputs: `out_bug.txt`, `timing.json`, `pg_start_runs.txt` (first-ever cold start 1.80 s noted in gen_data.py).
- `experiments/mlt/`: normalize property (old page example), pandera, float order, smoke test, transform tests. `experiments/llm/`: contract tests with a fake server, VCR record/replay (`inputs/cassette.yaml`). `experiments/asy/`, `experiments/snap/`, `experiments/ci/ci.yml` (parsed as YAML, not run on GitHub).
- `inputs/facts_checked.json`: 52 checked facts with quotes and URLs (50 verified, 2 corrected).

## Shape
Topic-child page: the core idea and hero first, then the practices in the order a change meets them (what a test buys, layers, unit, doubles, integration, property, LLM code, data and ML, flaky, suite quality, CI, static checks and review, large changes). Departure: no comparison grid (a craft page, not a family of things); the running example is the chat product's own code, each section testing a different piece.
