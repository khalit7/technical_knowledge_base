# Code design: source

`sh build.sh` writes `../index.html` from `parts/` (same build as the root and building_a_backend_api: `{{text|url}}` links, one `<script>` per JS part, tab wiring last).

## Files
- `parts/`: `01_head.html` (the root's CSS), `10_header.html`, `20_read_a.html` to `20_read_j.html` (Reading, sections 1 to 14 and glossary), `32_tab_review.html` (Review lab), `39_tab_more.html` (Further reading); JS: `21_js_rd_common.js` (RD helpers and the animation controller, copied from the sibling), `30_js_data.js` (generated), `40_js_read.js` (numbers, code views, concerns, layers, LLM-call comparison, depth chart, benchmark bars, glossary), `41_js_refactor.js` (the step animation), `52_js_review.js` (Review lab), `99_js_tabs.js`.
- `refactor/`: `steps/step0.py` is building_a_backend_api's `service/app.py`; `make_steps.py` derives `step1.py` to `step10.py` by exact text edits (each must match), `make_bigbang.py` the one-shot rewrite; `tests/test_send_message.py` the characterization tests (module chosen by `STEP`); `run_steps.py` runs tests, radon and ruff on every step; `probe_crash.py` and `probe_untested.py` the two probes.
- `llmcall/`: `before.py` (tangled, written for the page), `after.py` (core, ports, adapters, shell), `test_after.py`, `measure.py`.
- `bench/bench_models.py`: dataclass vs attrs vs pydantic construction cost.
- `libdemo/`: the `chatsummary` package built from `after.py`, with `check_lib.py`.
- `review/proofs.py` then `proofs2.py` (in that order; the second appends): run each flagged Review lab diff.
- `gen_data.py`: builds `parts/30_js_data.js` from `inputs/*.json`. `recompute.py`: every derived number in Python; `check_page.mjs` (run from the repo root) clicks every control at 390 px dark and 920 px light and compares with it.
- `inputs/facts_checked.json`: the fact check of every sourced claim (quotes, URLs, dates). `coverage.json`: every fact of `live.md` and where it went. `live.md`: copy of building_a_backend_api's `handoff_code_design.md` (the verbatim code-design half of the old "API and Code Design" page, plus that builder's notes).

## Re-running (all from the folder named, with uv; about 2 minutes in total)
`refactor/`: `python3 make_steps.py; python3 make_bigbang.py; uv run --no-project --python 3.12 --with fastapi --with httpx --with pytest --with radon --with ruff python run_steps.py` and the two probes with `--with fastapi --with httpx`. `llmcall/`: `uv run --no-project --python 3.12 --with pydantic --with httpx --with pytest --with radon --with ruff --with mypy python measure.py`. `bench/`: `--with pydantic --with attrs python bench_models.py`. `libdemo/`: `--with pydantic --with httpx --with build --with mypy python check_lib.py`. `review/`: `--with fastapi --with httpx --with pydantic --with pytest python proofs.py`, then `--with mypy` added for `proofs2.py`. Then `python3 gen_data.py; sh build.sh`.

## Departures from the child-page method
- About 40 minutes of reading (9,500 words): the reader starts from zero on a wide subject. Sections stand alone after a one-screen summary.
- One standalone tab only (Review lab); the main animation stays inline in section 10 because it is the core of that section.
- Illustrative code is labelled: `before.py`, the rewrite and the review diffs were written for the page; everything shown about them (tests, metrics, failures, timings) was measured.
