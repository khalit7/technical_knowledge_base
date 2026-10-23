# Interconnects and scaling page: sources and scripts

Child of Topic: hardware (page prefix `ic`, storage key `ic-tab`). Built 2026-10-05; rebuilt 2026-10-23 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`): editing, new visuals, absorbed units and three images, no new runs.

## Build and checks
- `build.sh`: assembles `../index.html` from `parts/` (Reading `20_read_a..f.html`; tabs `31_*` Collective simulator and `39_tab_more.html`; every JS part in its own script, `99_js_tabs.js` last; error box from `.claude/skills/explainer-page/build/templates/`).
- `run_all.sh`: reproduces everything: three runs of `meas/coll_bench.py` (needs a Python with torch outside the repo: `TORCHPY=...`; `SKIP_MEASURE=1` skips), then `recompute.py`, `build.sh`, `check_embed.py`.
- `meas/coll_bench.py`: ring and recursive-doubling all-reduce written with send/recv, plus Gloo's own all-reduce and a ping-pong, at 2, 4 and 8 CPU ranks over loopback, 4 B to 16 MiB; every result checked against the exact sum. Raw: `meas/out/` (PyTorch 2.14.1, Apple M1 Pro, 2026-10-05, load average 5.5 to 7.2: the machine was shared).
- `collsim.py`: the reference collective simulator (steps, chunk states, alpha-beta time); self-test: step simulation equals the closed forms. `fabric.py`: the reference fabric load model.
- `recompute.py` (stdlib, imports the parent's `../../src/calc/model.py` so the TP and model numbers are the Performance calculator's): fits, link presets, published points against the model, parallelism thresholds, the 84 simulator and 216 fabric test cases; writes `out/expected.json` and `parts/22_js_ic_data.js` (window.IC, without the test cases).
- `check_embed.py`: the page embeds exactly `out/expected.json`, 34 hand-written prose numbers agree with the data (six added on 2026-10-23: the torus times, 48 optical switches, fat-tree endpoint counts), no private patterns.
- `check/check_page.mjs`: puppeteer, every tab and control at 390 px dark and 920 px light; no errors, NaN, undefined or sideways scroll; the page's JS simulator and fabric model equal the Python cases; screenshots of every Reading card (each topology and mesh mode, RDMA stepper first and last step, both figures) to `../.shots/own/`; a fresh page scrolled to each animation confirms nothing moves before the reader acts.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).
- `live.md`, `coverage.json`: the old Notion page verbatim and its 46-fact coverage (2026-10-05; historical, superseded by the ledger).
- Images: `../img/` (three WebP files, credits in `../img/CREDITS.md`).

## Parts (2026-10-23)
| Part | What |
|---|---|
| `20_read_a.html` | styles, nav, the idea in one screen: core sentence, hero (cluster drawing with five numbered rungs plus the bandwidth ladder), running example, you need, new terms, labels |
| `20_read_b.html` | 1 latency and bandwidth (predict, formula, alpha-beta curves with a size slider, n-half table, per direction, correction); 2 PCIe (table; encodings and provenance closed) |
| `20_read_c.html` | 3 NVLink and NVSwitch (switch against mesh toggle, generations table, NVL72 photo, NVLS; sources and other fabrics closed); 4 RDMA (stepper against TCP), credits against pause (diagram), SHARP, InfiniBand photo; Meta's RoCE and NIC/switch tables closed |
| `20_read_d.html` | 5 topology (fat tree / torus / dragonfly toggle, rails, predict, Fabric explorer moved inline, dragonflies; real clusters closed); 6 TPU pods (ICI, torus, optical switches with the TPU v4 paper's Figure 1, DCN) |
| `20_read_e.html` | 7 collectives (all-reduce animation, cost table, the torus forms and calculator absorbed from Sharding and scale, NCCL's choice, laptop measurement; sources, scaling-book statements, busbw and the published table, protocols and measurement details closed) |
| `20_read_f.html` | 8 all-to-all and MoE (DeepSeek box; the 1:1 check closed); 9 link intensity (widget, table, two runs, corrections; assumptions closed); 10 checking it yourself (steps, common mistakes, interview rehearsal closed) |
| `21_js_rd_common.js`, `99_js_tabs.js` | the skill templates (never autoplay); one change in the first: `onRender`, `onResize` and `anim` take an optional tab id, used by the simulator tab |
| `25_js_rd.js` | ladder, n-half table, all-reduce animation, published table, laptop chart, link-intensity widget, predict-then-reveal |
| `26_js_rd_vis.js` | new: hero, alpha-beta curves, switch against mesh, RDMA stepper (its captions are the static list items), credits against pause, topology shapes, torus calculator |
| `32_js_fab.js` | the Fabric explorer, now drawn in Reading section 5 |

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core sentence ("each kind of parallelism belongs on the slowest rung whose bandwidth its traffic per FLOP can afford") and a hero that draws the whole ladder on one cluster (HBM, NVLink through NVSwitch, PCIe to the NIC, rail leaves, spine) with the bandwidth bars below it. The old one-screen Q&A table was a recap of the sections and is gone (fat).
- **Every core mechanism has a visual beside it**, chosen by kind: alpha-beta (a parameter: a size slider over effective-bandwidth curves, defaults reproduce the 1.18 of the prediction at 64 KB), switch against mesh (structure: a toggle), RDMA (a process: a stepper against the TCP path), credits against PFC (structure: a two-panel diagram), topologies (structure: fat tree, torus, dragonfly), the Fabric explorer (was its own tab; it explains one mechanism, so it moved inline), all-reduce algorithms (before/after animation, unchanged), torus collectives (a parameter: the absorbed calculator), measured crossover (real data), link intensity (widget).
- **Real images** (the page is about physical things): the GB200 NVL72 rack (count the switch trays), InfiniBand cabling, and the TPU v4 paper's Figure 1 (cube faces to optical switches).
- **Absorbed**: from Sharding and scale's closed block, the ring / 2-D torus / tree forms, the scaling book's statements and the calculator ("flat while latency dominates"); from TPUs and other accelerators section 4, ICI, the torus, optical circuit switches, Ironwood's pod and DCN. New: dragonflies (Kim et al. 2008; Frontier's Slingshot), the double binary tree row in the cost table.
- **Closed**: provenance (PCIe, NVLink 6's two figures), part tables (NICs and switches), Meta's RoCE story, real-cluster table, the busbw definition with the published table, protocols, measurement details, the DeepSeek 1:1 arithmetic, the table's assumptions, the check steps, mistakes, interview rehearsal.
- **No autoplay**: `21_js_rd_common.js` is the template; `check_page.mjs` confirms both Reading animations stay on step 0 when scrolled into view.
- SVG labels raised to 11 px (some were 9 and 10).

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 33.3 min (7,659 words) | 29.9 min (6,876) |
| Reading, closed details | 1.5 min | 13.4 min |
| Other tabs, core | simulator 1.6 + fabric 1.4 + further reading 2.3 | simulator 1.6 + further reading 2.5 |
| Visuals drawn in Reading | 2 (plus bars and tables) | 13 (plus 3 images) |

Why about 30 minutes is right: the page now owns four subjects other pages used to split (links and NVLink domains, RDMA fabrics, topologies including TPU tori and optical switches, collective algorithms with their cost models) and the rule that ties them to parallelism; every core unit in the ledger is needed for one of them, and roughly a sixth of the core words are figure labels, legends and counters (the audit counts SVG text). Without the absorbed TPU and torus material the core would be about 27 minutes. What made the old page long without teaching (a recap table, provenance in the flow, real-cluster tables, measurement method, mistakes that restated sections) is now closed or cut.

## Knowledge ledger (`ledger.json`)
363 units: core 234, depth 99, fat 30 (each fat unit has a `note`: recap rows of the old one-screen table, run-in headings, instructions now carried by controls, the removed Fabric explorer tab card). 337 were drafted by `ledger.py init` from the old page; 10 were added for script-rendered visuals and tables; 13 record what was absorbed (section "from sharding_and_scale" or "from tpus_and_other_accelerators"); 3 record new content (dragonfly, Frontier, the NVL72 tray count). `python3 html_utils/ledger.py check`: problems 0.

## Departures from the page-kind shape
- One lab tab (Collective simulator) stays: it is a tool across collectives, algorithms, sizes and links, used by sections 1, 7 and 8. The Fabric explorer, which explains one mechanism, moved into section 5.
- No GPU cluster was available: cluster numbers are vendor or independent figures, kept apart; the laptop measurement validates the model's shape (step counts, crossover), not cluster bandwidths.
