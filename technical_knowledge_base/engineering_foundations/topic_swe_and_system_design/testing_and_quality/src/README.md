# src: Testing and quality

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembler as code_design). Data: `python3 gen_data.py` writes `parts/30_js_data.js` (window.TQ) from `inputs/` and `experiments/`. Checks: `python3 recompute.py`; from the repo root `node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/testing_and_quality/src/check_page.mjs` (clicks every control at 390 dark and 920 light, compares TQ.calc with recompute.py) and `sh html_utils/checkpage.sh <folder>`.

## Parts
- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js` (RD helpers and the step-animation controller), `99_js_tabs.js`: copied from code_design.
- `10_header.html`; Reading `20_read_a` (styles, one screen) to `20_read_l` (AI changes, pros, mistakes, glossary), `20_read_z` closes the tab.
- `32_tab_mut.html` + `52_js_mut.js`: Mutation lab. `39_tab_more.html`: Further reading.
- `40_js_read.js` (calc, highlighter, measured blocks, glossary), `41_js_prop.js` (examples vs property animation), `42_js_layers.js` (pyramid and trophy).

## Experiments (all run 2026-10-04, Apple M1 Pro, Python 3.12.11, in a scratch venv; never `uv run` inside the repo without `--no-project`)
Install: `uv venv --python 3.12 .venv && uv pip install pytest==9.1.1 hypothesis==6.168.3 mutmut==3.8.0 coverage==7.16.2 pytest-asyncio==1.4.0 syrupy==6.1.1 pandera==0.33.1 pandas numpy pgserver==0.1.4 'psycopg[binary]' pytest-randomly==5.0.0 pytest-repeat pydantic httpx vcrpy==8.3.0 pytest-recording==0.14.0 pyyaml`.
- `experiments/hyp/`: chunker, example and property tests, traces (`trace.py`, `trace_one.py 6`, `trace_fixed.py`), LRU stateful test. Outputs: `inputs/trace_seeds.json`, `trace_6.json`, `trace_6_fixed.json`, `chunk_*_out.txt`, `lru_out.txt`.
- `experiments/mut/`: retry policy, weak and strong suites, mutmut config; `experiments/killmatrix.py` (run from the parent of `mut/` after `mutmut run`). Outputs: `inputs/killmatrix.json`, `coverage_per_test.json`, `cov_weak.txt`, `run_*_tail.log`. The strong-suite mutmut run used a copy with `tests/test_strong.py` selected.
- `experiments/flaky/`: random and order flakes and fixes. Outputs: `random_batches.txt`, `flaky_seq.json` (JUnit XML parsed), `order_results.txt`.
- `experiments/integ/`: SQLite vs PostgreSQL search (`chats_repo_bug.py`, `chats_repo_fixed.py` copied to `chats_repo.py` to run). Outputs: `out_bug.txt`, `timing.json`, `pg_start_runs.txt` (first-ever cold start 1.80 s noted in gen_data.py).
- `experiments/mlt/`: normalize property (old page example), pandera, float order, smoke test, transform tests. `experiments/llm/`: contract tests with a fake server, VCR record/replay (`inputs/cassette.yaml`). `experiments/asy/`, `experiments/snap/`, `experiments/ci/ci.yml` (parsed as YAML, not run on GitHub).
- `inputs/facts_checked.json`: 52 checked facts with quotes and URLs (50 verified, 2 corrected).

## Shape
Part B child method: one-screen table first, then sections in learning order (why, layers, pytest, design, doubles, integration, property, snapshot, async, test data, ML, LLM, flaky, coverage and mutation, CI, big changes, pros, mistakes, glossary). Departure: no comparison grid (this is a craft page, not a family of things); the running example is the chat product's own code, each section testing a different piece.
