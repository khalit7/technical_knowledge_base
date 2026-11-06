# Source of Running Postgres in production

Child of Topic: databases. `sh build.sh` runs `build_data.py` (inputs/*.json to `parts/22_js_data.js`) and writes `../index.html`.

Shape (rebuilt 2026-10-24 to the teaching contract): Reading opens with the core idea, a hero diagram, You need, new terms, the failure table and five rules; then 12 sections (server, memory, WAL and checkpoints; backups and PITR; replication; failover; vacuum; wraparound; connections and pooling; safe schema changes; monitoring; upgrades; security; managed). 12 drawn visuals inline plus 6 bar and stat panels; every real transcript sits in a closed "Real run" block beside the claim it proves. Tabs: Incident lab, Lab notebook, Production checklist (tools used across the page), Further reading. Follows `.claude/skills/explainer-page/page-kinds/topic-child.md`; the evidence on an operations page is command output, so instead of recomputing published figures the page shows what real servers printed; every transcript is captured by a script and rendered from JSON (`parts/23_js_tr.js`), and numbers in prose are either bound to the JSON (`data-v`) or checked by `recompute.py`.

## Files
- `lab/`: the measured runs, each under 5 minutes, all servers in a scratch folder (`RP_DATA`): `pitr.py` (dump, base backup, archiving, the bad DELETE, both recoveries, pg_waldump), `replication.py` (replica, lag, replay pause, synchronous levels, stopped sync standby, slot retention and cap, promote, split brain, pg_rewind), `vacuum.py` (HOT, autovacuum sawtooth, forgotten transaction, VACUUM vs VACUUM FULL with a lock_timeout reader), `wraparound.py` (pg_resetwal to just short of the stop limit, a forgotten prepared transaction, warning, refusal, fix), `connections.py` (backend memory, connection setup, pgbench -C, max_connections, PgBouncer with 1,000 clients, SET leak, prepared statements), `upgrade.py` (pg_upgrade check/copy/link 16 to 17, logical replication upgrade with the sequence trap), `monitor.py` (runaway query, timeouts, idle in transaction, lock queue, dashboard views); helpers in `pgc.py`.
- `inputs/`: one JSON per run; `research.json`: 83 dated facts (versions, defaults, prices, incidents) read from primary sources on 2026-10-04.
- `parts/27_js_rd_new.js` (2026-10-24): hero, work_mem calculator (`window.RPG_MEM`), replication pipeline, failover stepper, XID-age slider (`window.RPG_XID`), SET-leak stepper, lock-queue diagram parsed from the monitor run (`window.RPG_LOCKQ`). `parts/21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `rpg-tab`); since 2026-11-06 animations and stages play when scrolled into view (see below).
- `ledger.json`: the knowledge ledger (`python3 ../../../../../html_utils/ledger.py check` from the repo root).
- `build_data.py`, `recompute.py` (checks 35 claims against the runs and writes `recompute_out.json`), `check_page.mjs` (clicks every control at 390 dark and 920 light, every incident-lab step, every notebook run, the checklist; compares the page's JavaScript with recompute; screenshots each visual into `../.shots/`).
- `coverage.json`: root mentions and old-child facts this page owns, what is left to siblings, corrections shown.
- `viz_ideas.md`: visuals built and rejected.

## Reproduce (from a scratch directory; never `uv run` inside the repo without --no-project)
```
# PostgreSQL 17 for upgrade.py (conda-forge, via a standalone micromamba binary) and PgBouncer for connections.py (built from source; needs libevent)
curl -Ls https://micro.mamba.pm/api/micromamba/osx-arm64/latest | tar -xj bin/micromamba
MAMBA_ROOT_PREFIX=$PWD/mroot ./bin/micromamba create -y -p ./cenv -c conda-forge "postgresql=17"
curl -sL https://www.pgbouncer.org/downloads/files/1.24.1/pgbouncer-1.24.1.tar.gz | tar xz && (cd pgbouncer-1.24.1 && ./configure --prefix=$PWD/../pgbi --with-libevent=/opt/homebrew/opt/libevent --without-openssl && make && make install)
export RP_DATA=$PWD/rp_data PG17_BIN=$PWD/cenv/bin PGBOUNCER=$PWD/pgbi/bin/pgbouncer
for s in pitr replication vacuum wraparound connections upgrade monitor; do
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <src>/lab/$s.py; done
sh build.sh && python3 recompute.py && node check_page.mjs
```
`connections.py` waits 35 s after each `pgbench -C` run so closed connections leave TIME_WAIT (macOS has about 16k ephemeral ports). `upgrade.py` puts pg_upgrade's socket in `~/.rpg_sock` (the scratch path is longer than the 103-byte socket limit) and removes it.

Measured on 2026-10-04/05, Apple M1 Pro, 16 GB, macOS. macOS fsync does not flush the drive cache, so commit rates are higher than on a server; the page says so.

## The 2026-10-24 rebuild (teaching contract)
What changed and why:
- **Top**: the core idea in one sentence (ship the WAL, clean up what it leaves, never let anything pin either), a static hero of the server with section numbers and the two pins, You need (MVCC and WAL internals on the siblings), nine new terms, the failure table (moved up from the old section 2; it replaces the old card grid, which restated it) and the five rules. Provenance of the measurements is a closed block.
- **Sections renumbered** (old 2 became the top table; old 13 Common mistakes deleted: every item restated a section; the one new fact, `recovery_min_apply_delay`, moved to section 2). New section 8 **Safe schema changes: the lock queue** (owned here: diagnosis with `pg_blocking_pids`, `lock_timeout` and retry; which ALTER takes which lock stays on SQL and data modelling's "ALTER TABLE, measured" tab, linked). Section 1 gained **memory settings** (shared_buffers, work_mem with hash_mem_multiplier, maintenance_work_mem, effective_cache_size) and **checkpoints in operational terms** (checkpoint_timeout 5 min, max_wal_size 1 GB, why pg_wal/ grows), both owned here; full-page writes and recovery time are linked to Storage engines and indexes.
- **Visuals**: 6 drawn inline before, 12 after (audit count); new: hero, work_mem calculator, replication pipeline, failover before/after stepper, XID-age slider, SET-leak stepper, lock-queue diagram (see `viz_ideas.md`). The server diagram was replaced by the hero. Kept: PITR before/after, lag chart, slot bars, sync bars, threshold calculator, vacuum replay, VACUUM FULL bars, connection bars, support windows, upgrade timings; the managed cost tiles moved into the closed price block.
- **Depth into closed blocks**: all 22 real transcripts (about 2,700 words), configurations (pgBackRest, autovacuum tuning, pg_hba and roles), dated versions and prices, and the incident cases (GitLab 2017, GitHub 2018, Sentry, Mandrill, Notion). The line each section relies on is quoted in the prose, so the core reads without opening them.
- **No autoplay**: the template controller waits on step 1; the PITR mode switch no longer starts playback; the vacuum replay opens on its last frame (the whole run, still).
- **Checks**: `check_page.mjs` now screenshots the new cards, moves the two new sliders, and compares `RPG_MEM`, `RPG_XID` and the parsed lock queue with `recompute.py`, which gained checks for the memory example, the XID zones, the run's distance from 2^31 and the reconnect ratios quoted in the connection chart's title.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 53.9 min | 37.4 min |
| Reading, closed details | 1.1 min | 17.1 min |
| Other tabs | 9 min | 9 min (unchanged) |
| Visuals inline (audit) | 6 | 12 |

Why 37 minutes is right: the page owns twelve operational subjects (process model and pooling, memory, WAL and checkpoints, backups and PITR, replication and slots, failover, vacuum, wraparound, timeouts, safe schema changes, monitoring, upgrades, plus security and managed trade-offs), and the ledger labels almost all of its prose core. What was cut is restatement (the card grid, the mistakes list, wind-ups) and what moved is evidence: the transcripts that made the old page long are one click away beside their claims, with the line that matters quoted. Splitting the page would break the one running incident thread (the same chat database through backup, replication, vacuum and upgrade), so the length stays.

Ledger: 378 units; core 292 (including 62 from the unchanged lab, notebook, checklist and further-reading tabs), depth 15, volatile 15 (versions and prices, kept in dated closed blocks on this page), fat 56, owned 0; `ledger.py check`: problems 0.

## The 2026-11-06 pass: split layout, six 3D stages (renderer v2), explained and autoplaying animations
- **Templates**: `02_split.html` (added to `build.sh` after `01_head.html`), `21_js_rd_common.js`, `99_js_tabs.js` (key `rpg-tab`), `05z_errbox.js.html`; the renderer `25_js_s3.js` copied unchanged as `28_js_s3.js` (after the data and 2D parts, before the scenes `29a` to `29f`). The template's eased-step CSS (`rd-fwd`) was added to `01_head.html`. The literal em-dashes in `build.sh` and `build_data.py` were replaced by escapes.
- **Split layout** (Reading): top (Fig. 1 beside the core sentence, its step list, You need and terms; the failure table, five rules and provenance full width); 1 memory (calculator right; process model and WAL/checkpoints full width); 2 PITR (Fig. 2; RPO/RTO, the logical/physical table, tools and tested restores full width); 3 four splits (Fig. 3; lag chart; slot bars; sync bars; logical replication full width); 4 failover stepper (Patroni full width); 5 four splits (threshold calculator; Fig. 5; the measured run chart; VACUUM FULL bars); 6 Fig. 6; 7 three splits (backend tiles and connection bars; Fig. 7; SET-leak stepper; max_connections, poolers, timeouts full width); 8 lock-queue diagram; 10 support windows. Full width: 9 monitoring (tables), the rest of 10, 11, 12. Other tabs (Incident lab, Lab notebook, Production checklist) are transcripts, text and a checklist with no visual: full width, unchanged.
- **Six 3D stages**, one scene each, driven by `window.RPG` (the measured runs):
  - Fig. 1 hero (`29a`, 6 steps): clients, backends, shared buffers (glass), table files and WAL; WAL shipped to archive and replica; dead rows and VACUUM; the two pins (open transaction, inactive slot with pg_wal/ growing); the blue additions. Replaces the static 2D hero.
  - Fig. 2 PITR (`29b`, 8 steps, two lists swapped by the toggle): the dump or base backup at midnight, the archived segments recovery actually replayed (`...14` to `...22`, parsed from its log), the DELETE's commit (transaction 738), restore and replay, 12,000 lost against 0 with the measured 2.18 s and 1.64 s. Replaces the 2D RD.anim; its generated captions became the two step lists.
  - Fig. 3 replication (`29c`, 5 steps): commit, write, flush, replay with the run's write_lag 0.247 ms, flush_lag 0.248 ms, replay median 1.27 ms; then the pause, 9.36 s and 79 MB behind. Replaces the 2D pipeline diagram.
  - Fig. 5 vacuum (`29d`, 6 steps, new): chat_state's pages (879, 1,552, 1,615 parsed from the autovacuum and VACUUM logs; one tile = 50 pages), HOT, full updates and the index, the sawtooth at 20,050, the pinned snapshot (xmin 180862, 82,363 not removable), the final VACUUM (89,743 removed), and the visibility map. The four-phase bullet list became its step list.
  - Fig. 6 XID circle (`29e`, 7 steps): the counter to scale, age arc coloured by the PostgreSQL 18 thresholds, the wraparound point half a turn from the oldest unfrozen XID; steps 5 to 7 use the run's warning (3,000,299 left), refused age 2,144,483,647 and fixed age 288. Replaces the linear XID-age slider; `RPG_XID` moved into the scene file (checked against `recompute.py`). Ages in steps 1 to 4 are illustrative.
  - Fig. 7 pooler (`29f`, 4 steps, new): max_connections 100 with 97 opened and 3 reserved; 1,000 clients onto 20 server connections; one connection lent per transaction; SHOW POOLS (cl_active 832, cl_waiting 168, sv_active 20).
- **2D animations**: failover (two step lists swapped by the toggle) and SET leak now use `RD.anim({list})`; their per-step captions were removed (the lists carry them). The per-second vacuum replay (184 frames, opened on its last frame) was retired under the long-replay rule: it is one static chart with labelled phase bands beside a short paragraph; Fig. 5 walks the phases.
- **Kept 2D, and why**: see `viz_ideas.md` (calculators, curves, bars, timelines and two flat steppers read best flat).
- **Checks**: `check_stages.mjs` new (from Analytics: columnar engines): autoplay in view, step lists one item per step in every mode, flows stop off screen, nothing moves under reduced motion, two columns at 1400 px, at 1400 light, 920 light and 390 dark. `check_page.mjs` no longer drives the retired PITR animation and XID slider; it checks the PITR summary tiles instead.

## Length judgement, 2026-11-06
| | Before (audit 2026-11-06) | After |
|---|---|---|
| Reading core (230 words a minute) | 8,626 words, 37.5 min | 10,211 words, 44.4 min (header 44) |
| Reading in closed blocks | 17.1 min | 17.1 min |
| Other tabs | 8.7 min | 8.7 min (unchanged) |
| Visuals inline (audit count) | 12 | 14 (six stages; the 2D hero, PITR animation, pipeline and XID slider replaced) |

The core grew by about seven minutes, almost all of it step lists: the PITR and failover captions were drawn by script before (invisible to the audit) and are now four static lists, of which a reader sees one per figure (the two alternate lists are about 340 words, 1.5 minutes, read only after the toggle); Fig. 1, Fig. 3 and Fig. 7 carry new step-by-step explanations; Fig. 5's list replaced the old bullet list with about 200 more words of the run's numbers. Two duplicated passages were removed (the wraparound run retold after its steps, the lag numbers repeated after Fig. 3). Nothing was cut that the ledger keeps.

## Ledger, 2026-11-06
378 units: core 286, depth 15, volatile 15, fat 62; `python3 html_utils/ledger.py check` problems 0. Five keys re-pointed to the reworded step lists (units 13, 186, 189, 190, 239); unit 352 (a sibling's quoted reading time) relabelled fat.
