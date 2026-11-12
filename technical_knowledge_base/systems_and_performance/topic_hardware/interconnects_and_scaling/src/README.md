# Interconnects and scaling page: sources and scripts

Child of Topic: hardware (page prefix `ic`, storage key `ic-tab`). Built 2026-10-05; rebuilt 2026-10-23 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`): editing, new visuals, absorbed units and three images, no new runs.

## Build and checks
- `build.sh`: assembles `../index.html` from `parts/` (`02_split.html` after `01_head.html`; Reading `20_read_a..f.html`; tabs `31_*` Collective simulator and `39_tab_more.html`; every JS part in its own script, `99_js_tabs.js` last; error box from `.claude/skills/explainer-page/build/templates/`).
- `run_all.sh`: reproduces everything: three runs of `meas/coll_bench.py` (needs a Python with torch outside the repo: `TORCHPY=...`; `SKIP_MEASURE=1` skips), then `recompute.py`, `build.sh`, `check_embed.py`.
- `meas/coll_bench.py`: ring and recursive-doubling all-reduce written with send/recv, plus Gloo's own all-reduce and a ping-pong, at 2, 4 and 8 CPU ranks over loopback, 4 B to 16 MiB; every result checked against the exact sum. Raw: `meas/out/` (PyTorch 2.14.1, Apple M1 Pro, 2026-10-05, load average 5.5 to 7.2: the machine was shared).
- `collsim.py`: the reference collective simulator (steps, chunk states, alpha-beta time); self-test: step simulation equals the closed forms. `fabric.py`: the reference fabric load model.
- `recompute.py` (stdlib, imports the parent's `../../src/calc/model.py` so the TP and model numbers are the Performance calculator's): fits, link presets, published points against the model, parallelism thresholds, the 84 simulator and 216 fabric test cases; writes `out/expected.json` and `parts/22_js_ic_data.js` (window.IC, without the test cases).
- `check_embed.py`: the page embeds exactly `out/expected.json`, 34 hand-written prose numbers agree with the data (six added on 2026-10-23: the torus times, 48 optical switches, fat-tree endpoint counts), no private patterns.
- `check/check_page.mjs`: puppeteer, every tab and control at 390 px dark and 920 px light; no errors, NaN, undefined or sideways scroll; the page's JS simulator and fabric model equal the Python cases; screenshots of every Reading card (each topology mode, RDMA stepper first and last step, the three photos) to `../.shots/own/`; a fresh page scrolled to each 2D animation confirms it plays by itself (inverted on 2026-11-12 from the old never-autoplay check).
- `check/check_stages.mjs` (from the repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
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
| `21_js_rd_common.js`, `99_js_tabs.js` | the skill templates, unchanged since 2026-11-12 (autoplay on view; key `ic-tab`); the simulator tab registers its own redraw and passes `auto:false` |
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

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `ic-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`. No new runs and no change to `recompute.py` or `out/expected.json`: every scene draws from `window.IC` and the numbers sections 2, 3 and 5 already state.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): the ladder on two HGX H100 servers, rails and spine, pipe area proportional to bandwidth | yes, 5 |
| Reading | Running example, you need, terms, labels | split | 2D ladder bars (log scale) with the hero's sources | no |
| Reading | 1 Latency and bandwidth | split | 2D alpha-beta curves with a size slider | no (a widget) |
| Reading | 1 n&frac12; table, per direction, correction | full width | table | no |
| Reading | 2 PCIe | full width | table | no |
| Reading | 3 NVLink and NVSwitch | split | **3D** `stg-srv` (Fig. 2): one server, switch against mesh, NVLS | yes, 5 |
| Reading | 3 Generations table | full width | table | no |
| Reading | 3 NVL72 rack, other fabrics | split | photo | no |
| Reading | 4 RDMA | split | 2D RDMA stepper against TCP (Fig. 3) | yes, 5 |
| Reading | 4 Three fabrics, credits against PFC | split | 2D two-panel diagram | no |
| Reading | 4 SHARP | split | photo | no |
| Reading | 4 Meta's RoCE, NICs and switches | full width | details closed | no |
| Reading | 5 Fat trees, dragonflies | split | 2D topology toggle (fat tree, torus, dragonfly) | no |
| Reading | 5 Rails, predict, real clusters | split | 2D Fabric explorer (a widget) | no |
| Reading | 6 TPU pods | split | the TPU v4 paper's Figure 1 | no |
| Reading | 7 Collectives | split | 2D all-reduce schedules (Fig. 4), four algorithms | yes, 4 + 4 + 4 + 3 |
| Reading | 7 Cost table | full width | table | no |
| Reading | 7 On a torus | split | 2D torus calculator (a widget) | no |
| Reading | 7 What real clusters measure, NCCL's choice | full width | details closed | no |
| Reading | 7 Measured here | split | 2D laptop chart (log axes) | no |
| Reading | 7 Corrections, go deeper; 8 All-to-all | full width | none | no |
| Reading | 9 Parallelism | split | **3D** `stg-par` (Fig. 5): each parallelism's traffic on the cluster, compute against communication bars | yes, 6 |
| Reading | 9 Table, assumptions | full width | table | no |
| Reading | 9 Reading the table, two runs, corrections | split | 2D link-intensity widget | no |
| Reading | 10 Checking it yourself | full width | details closed | no |
| Collective simulator | intro and notes / controls and drawing | split | 2D simulator (a widget: never plays by itself, `auto:false`; its per-frame caption stays) | no |
| Collective simulator | every algorithm, time against size | split | 2D bars and curve | no |
| Further reading | | unchanged | | |

**Stages and their data.** All three share `39_js_sc_geo.js`: an HGX server as section 2 describes it (8 GPUs, 4 NVSwitch chips, a NIC per GPU under a PCIe switch, two CPUs; the number of PCIe switches and of spine switches is illustrative), and a pipe whose cross-section area is proportional to its bandwidth per GPU, each direction (diameter 0.012 &times; &radic;GB/s). Fig. 1: `IC.ladder` (HBM 3,350, NVLink 4 450, PCIe 5.0 63, 400 Gb/s NIC 50), the H100's 5 used stacks (670 GB/s each, derived), Meta's 1:7 for the spine (50 / 7 per GPU, derived). Fig. 2: NVLink 4 450 GB/s and 18 links, 4 NVSwitch chips, MI300X 7 links of 128 both ways (64 each way, 448 all seven), PCIe 63, the numbers section 3 cites; the mesh is drawn on the same 8 positions, not an MI300X board layout. Fig. 5: `IC.par` (link intensity 880 and 7,916; TP 8 on Llama 3.1 70B 16% over NVLink, 141% over the NIC with 59% waiting; pipeline 0.34%; data-parallel break-even 5,277 tokens against 2^24 / 128 = 131,072 tokens per replica, about 4%, derived), DeepSeek-V3's stated 1:1 for expert parallelism and `IC.fab.cross_frac` (83%).

**2D animations.** The all-reduce schedules became explained stretches (the long-replay rule): the ring's 14 transfers are 4 list steps, each stepping forward plays its frames one by one (`IC_ARSTR` in `25_js_rd.js`); the algorithm buttons swap the step list and replay; the per-step caption moved into the lists. The RDMA stepper's old `ol.steps` became `ol.sx#sx-rd`, driven by `RD.anim`. Both play once in view.

**Removed**: the 2D hero drawing (now Fig. 1) and the 2D switch-against-mesh toggle (now Fig. 2), from `26_js_rd_vis.js`; the all-reduce caption box. **Kept 2D** and why: the ladder bars, the alpha-beta and torus curves and the laptop chart are log axes; the topology toggle compares three flat graphs (and carries a sibling's ledger key); the Fabric explorer and link-intensity widget are tools with many controls; the RDMA stepper is a sequence of stacked boxes with arrows, and depth adds nothing to it; the credit diagram is two panels.

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: every stage and both 2D animations play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; the algorithm switch replays; the simulator never plays by itself; 16 Reading splits and 2 simulator splits are two columns at 1400 px and one below 1100 px; canvas labels do not overlap or leave the card; every number in the step lists equals `window.IC`. Problems 0.

**Length judgement.** Reading core 30.0 min before (6,900 words), 34.9 min after (8,017, `audit_pages.mjs`); closed details 13.9 min both times; Collective simulator 1.6 to 1.9 min (a sentence on how to read a frame); Further reading 2.6 unchanged. The five minutes are the step lists that now explain the three stages and two animations, as the rollout requires; the hero's old numbered legend and the all-reduce caption carousel were folded into them, and the note under the all-reduce card no longer repeats the lists' byte counts. Nothing the ledger holds was cut.

**Ledger**: 367 units (core 238, depth 99, fat 30); four units added (the 670 GB/s per stack, the spine's 50 / 7, data parallelism's 4%, the pipe-area rule); one key updated after rewording (unit 94). `ledger.py check` problems 0 here and on the root.
