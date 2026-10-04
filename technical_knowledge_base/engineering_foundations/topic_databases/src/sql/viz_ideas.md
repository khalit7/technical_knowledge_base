# SQL playground (t-sql): ideas built and rejected

Question the tab answers: "what does SQL do to the chat product's data, and where do engines disagree?" The reader is new to SQL, so the tab teaches by running real queries, from zero.

## Built
1. **A real engine in the page** (score: highest; computable, no other KB page has one). sql.js 1.14.2 (SQLite 3.49.1 in WebAssembly, MIT; SQLite public domain), 658 KB wasm inlined as base64 and started with `initSqlJs({wasmBinary})`. Starts in about 50 to 75 ms in headless Chrome, works inside `<iframe sandbox="allow-scripts">` (checked). Engine part about 926 KB; the whole tab about 1.1 MB of the page.
2. **Twelve guided lessons, 45 menu choices**, each with goal, why it matters (problem solved and cost), hint, editable query, result, explanation. Every choice was run offline on PostgreSQL 16.2 (pgserver), on Python's SQLite 3.47.1 and on the page's own sql.js in node; results stored in `results.json` and shown next to the live run.
3. **SQLite vs Postgres differences as lessons** (8 of 45 choices): bare columns in GROUP BY, foreign keys off by default (x3 counting DELETE FROM chats), flexible typing ('lots' in an INTEGER column), statement-level vs transaction-level abort (credits from nowhere after COMMIT), NULL sort order.
4. **JOIN animation** (before/after: INNER vs LEFT on the same four users), drawn from the real rows, sized from measured width, RD.anim controls (play, pause, step, scrub, speed; paused under reduced motion; only animates on screen).
5. **Fallback** when WebAssembly is blocked (CSP without wasm-unsafe-eval): menus still work and Run shows the recorded sql.js and Postgres results (checked with a CSP copy of the page).
6. **Free play**: persistent copy of the data, starters (catalogue, busiest chats, NOT EXISTS anti-join, messages per month, an index changing SCAN to SEARCH in EXPLAIN QUERY PLAN, switching SQLite foreign keys on).

## Rejected
- Precomputed-only playground (option b alone): the engine works in a sandboxed iframe, so live editing wins; precomputed results kept as the fallback and as the Postgres comparison.
- sql-asm.js (pure JS, no wasm, 1.36 MB): would dodge a wasm-blocking CSP but costs 0.4 MB more; the recorded fallback covers that case.
- PGlite (Postgres in wasm): several MB of wasm and data files (size not measured here), over the page budget; and it would hide the SQLite/Postgres differences that teach the most.
- A dedicated EXPLAIN visual here: belongs to the Query plans tab (t-plan); the free-play starter only shows SCAN vs SEARCH and links there.
- An ACID or isolation-level animation: owned by the Reading tab's transactions section; the transaction lesson links it.

## Reproduce
```
python3 gen_data.py                       # seeded data -> data.json, schema_*.sql
python3 gen_engine.py                     # vendors sql.js -> parts/31_js_sql_a_engine.js (needs npm)
uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python recompute.py   # Postgres + Python SQLite
python3 gen_js.py && node run_sqljs.mjs   # page engine in node
python3 recompute.py --check              # compares all three, asserts the 19 facts the lesson text quotes
python3 gen_js.py && sh ../build.sh
node check_ui.mjs                         # every lesson, choice and control at 390 dark / 920 light, sandbox iframe, no-wasm fallback
```
