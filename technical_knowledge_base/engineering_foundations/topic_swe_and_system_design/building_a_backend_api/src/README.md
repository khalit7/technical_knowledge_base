# Building a backend API: source

`sh build.sh` writes `../index.html` from `parts/` (same build as the root: `{{text|url}}` links, one `<script>` per JS part, tab wiring last).

## Files
- `parts/`: `01_head.html` (the root's CSS), `10_header.html` (title and tabs), `20_read_a.html` to `20_read_i.html` (Reading, sections 1 to 20 and glossary), `31_tab_wire.html` (Wire lab), `32_tab_break.html` (Breaking or not?), `39_tab_more.html` (Further reading); JS: `21_js_rd_common.js` (RD helpers and the animation controller, copied from the root), `30_js_data.js` (generated), `40_js_fill.js` (numbers, code excerpts, raw HTTP rendering with line explanations), `41` anatomy, `42` pagination bars and drift, `43` idempotency animation, `44` SHA-256/HMAC, JWT and webhook verifier, `45` SSE replay and dated versions, `50` Wire lab, `51` quiz, `99_js_tabs.js`.
- `service/app.py`: the demo chat API (FastAPI). `service/capture.py`: starts it three times (normal, default errors, slow) and records every exchange over a raw socket into `inputs/exchanges.json`, plus a latency measurement (about 1 minute). `service/measure_pagination.py`: offset vs keyset on Postgres 16.2 from the pgserver wheel, 1M rows, into `inputs/pagination_pg.json` (about 2 minutes). Run both from `service/` with `uv run --no-project --python 3.12 --with fastapi --with uvicorn python capture.py` and `uv run --no-project --python 3.12 --with pgserver python measure_pagination.py`.
- `gen_data.py`: builds `parts/30_js_data.js` from the two inputs and `app.py` (and makes the demo JWT). Run after any capture.
- `recompute.py`: every derived number recomputed in Python; `check_page.mjs` (run from the repo root) clicks every control at 390 px dark and 920 px light and compares the page with it.
- `coverage.json`: every fact of the old page (`live.md`) and where it went; `handoff_code_design.md`: the code-design half, verbatim, for the code_design builder.
- `viz_ideas.md`: visuals built and rejected.

## Departures from the child-page method
- Longer than most children (about 45 minutes, 10,000 words): the reader has never built an API, and the brief asked for the whole surface from HTTP to gRPC. Sections stand alone, with a one-screen summary first.
- Real captures over illustrative data wherever possible; the only illustrative visuals (drift rows, dated versions, timings in the idempotency animation) are labelled.
