# Distributed systems fundamentals: source

`sh build.sh` writes `../index.html` from `parts/` (Reading `20_read_a..j`, tabs `31_tab_raft`, `32_tab_hist`, `39_tab_more`; JS parts each in their own script, `99_js_tabs.js` last).

- Old page: `live.md` (verbatim, reused from the root's fetch), mapped fact by fact in `coverage.json`. Queue and delivery facts are handed to Queues, streams and async work in `handoff_queues.md`; retries and idempotency to Reliability engineering and Building a backend API in `handoff_reliability.md`, verbatim with corrections.
- Measurement: `measure_replication.py` (real Postgres 16.2 primary and streaming replica via the pgserver wheel; run with `uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python measure_replication.py`, about a minute) -> `inputs/replication_local.json`.
- Checks: `python3 recompute.py && node check_recompute.mjs` (ring, clocks and history verdicts in JS against Python; measured table against the JSON); `node check_raft.mjs` (fuzzes the Raft model); `node check_page.mjs` (clicks every control at 390 dark and 920 light); `node shot_el.mjs <w> <dark|light> <tab> <id[:clicks]>` for element screenshots.
- Shape: Part B child page. Departure: longer than most children (about 45 minutes) because the reader starts from zero and the page owns twelve mechanisms; the Reading is sectioned so each part stands alone, with a one-screen table first.
