# Cluster anatomy page: sources and scripts

- `build.sh`: assembles `../index.html` from `parts/` (`01_head.html`, `02_split.html` the split layout (skill template), `10_header.html`, Reading parts `20_read_a..g.html` and `20_read_z.html`; JS in file-name order: `21_js_rd_common.js` (skill template, autoplay on view), `22_js_ca_data.js`, `25_js_ca_rd.js` (ladder, node schematic, designs table), `25_js_s3.js` (the 3D renderer v2, skill template, unchanged), `27_js_ca_mp.js` (the message path, a widget), tabs `30_*` Cluster explorer, `32_*` Sizing calculator, `39_tab_more.html`, then the scenes `40_js_sc_geo.js` (shared tray and rack geometry), `41_js_sc_hero.js`, `42_js_sc_job.js`, `43_js_sc_place.js`, `44_js_sc_sto.js`; `99_js_tabs.js` is the skill template, storage key `ca-tab`). Photos in `../img/`, credited in `../img/CREDITS.md`.
- `recompute.py` (stdlib; `python3 -I recompute.py`): every sourced number (node parts, scale-up domains, nine designs, storage tiers, explorer levels, link bandwidths and latencies), the measured toy-cluster values read from `meas/out/`, the sizing model `size()` and its presets (with residuals against published switch counts), the placement figures; writes `out/expected.json` (plus 27 sizing test cases) and `parts/22_js_ca_data.js` (`window.CA`).
- `meas/probe.sh`: read-only probe of the toy Slurm nodes (lscpu, nproc, cgroup limits, sysfs, interfaces, `scontrol show node`, `sinfo`, topology); `meas/pingpong.py` and `meas/run_ping.sh`: TCP ping-pong and bulk transfer c1 to c2 (Docker bridge) and c1 loopback, 3 repeats. Both ran under the shared slurm lock on 2026-10-16; scrubbed output in `meas/out/` (`probe.txt`, `ping.jsonl`, `nproc.txt`).
- `check/check_ui.mjs` (from the repo root: `node <this> <page folder> [shots dir]`): puppeteer, every tab and control at 390 px dark and 920 px light, every explorer design and level, all 25 route pairs and every hop of the message path, every step of the job stage; no errors, NaN, undefined, null or sideways scroll; the page's sizing JS equals Python on 27 cases.
- `check/check_stages.mjs` (from the repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
- `check/check_embed.py` (from `src/`): the page embeds exactly `out/expected.json`, 28 prose numbers agree with the data, privacy grep over the folder.
- `facts.md`: the verified facts and sources (copy of what was appended to the topic's shared FACTS file). `viz_ideas.md`: visuals built and rejected. `coverage.md`: no old page.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md`, organised by the cluster's own levels (node, scale-up domain, networks and control nodes, rack to cluster, storage, power) rather than by mechanisms; departures: no old page to cover, and no measured bandwidths (the toy clusters have no GPUs or RDMA: section 8 says what transfers). Numbers reused from Interconnects and scaling (NVLink 450, NIC 50, PCIe 63 GB/s; DeepSeek Table 5 latencies) and Power, cooling and reliability (10.2, 14.3, about 120 kW) so the pages agree.

## The 2026-10-24 rebuild to the teaching contract
Editing only, no new runs. What changed and why:
- **Top**: the core idea in one sentence (the staircase), the Llama 3 levels ladder as the hero, "You need" (distributed training for TP and DP; the owners of links and power), a New terms list, one line of labels. The old lead, scope paragraph and "two words" paragraph went (ledger: fat, or folded into the terms).
- **New core content this page owns** (OWNERS.md: head and login nodes, schedulers on top, how a job maps onto the cluster): section 3 now describes the control nodes (login nodes, controller or head node, service nodes, UFM, quoted from the SuperPOD architecture page) and a new **job stepper** (`26_js_ca_job.js`): one 16-GPU job through submit, place, pull and stage, launch, bootstrap, train, read and checkpoint, watch and recover, lighting the machines and the network of each step. It replaces the "which network does this traffic ride" chips (all nine traffic kinds are steps) and absorbs the NCCL bootstrap box. A process, so a stepper; it never plays by itself.
- **Moved inline**: the Message path tab explained one mechanism (a message's hops), so it now sits in section 4 beside the levels it walks (`27_js_ca_mp.js`), with a prediction prompt; the tab is gone.
- **Photos** (four, `../img/CREDITS.md`): the HGX B200 8-GPU board (section 1; no openly licensed DGX H100 photo exists on Commons), the GB200 NVL72 rack (section 2, its caption carries the scheduling, power and failure consequences), a data hall of rack rows (section 4), a DGX-1 and storage demonstration rack (section 5: shared storage is a box on the network).
- **Static tables**: the scale-up and storage-tier tables are written in HTML (same values as `CA.scaleup` and `CA.tiers`), so the ledger check sees them.
- **Closed depth** (section 8 and blocks in sections 3 and 7): the toy cluster's measured answers and one-hop timing (the core keeps the declared-against-real point), the nine published clusters, how Meta, DeepSeek and NVIDIA split the networks, common mistakes, five interview questions.
- **Deleted as fat**: wind-ups, the Go deeper recap, two mistakes and seven interview lines that restated sections 1 to 5, pointers to the removed tab.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; mode switches reset an animation to step 0 without playing it. SVG labels raised to the 11 px floor (10.5 on the narrow message path).

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 25.7 min | 21.5 min |
| Reading, closed details | 4.3 min | 10.0 min |
| Other tabs, core | explorer 1.5 + message path 1.3 + sizing 2.1 + further reading 2.4 = 7.3 min | explorer 1.5 + sizing 2.1 + further reading 2.4 = 6.0 min |
| Visuals in Reading (audit count) | 2 | 8 |

Why about 22 minutes is right: the page covers six physical levels plus the control plane and a job's path, each with its numbers and a picture beside the claim. The core gained the control nodes, the job stepper's nine captions and the absorbed message path (about 4 minutes together) and still shrank by 4, because the toy-cluster evidence, the design survey, the mistakes and the interview answers are now optional. Every remaining core unit in the ledger is needed to picture a cluster or place a job on it.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
279 units: core 164, depth 78, fat 36 (each with a `note`), owned 1 (the running example's 112,577-parameter GPT, carried by the parent root). 275 drafted from the old page by `ledger.py init`; 4 added by hand for script-drawn visuals (ladder, node schematic, designs table, placement counters), each keyed to static text.

2026-10-24 topic close: section 3 links Kubernetes for ML section 5 for the RDMA card in a pod and Launching sections 6 and 8 for bootstrap and hangs; section 5 links Storage and data movement's opening figure and sections 2 and 4 instead of re-teaching striping and metadata (tier table kept); Further reading times fixed (Topic: hardware 37 to 28, training root 27 to 22); ledger keys 85, 263, 268 updated.

2026-10-26 (final follow-up sweep): the login-node definition links SSH section 13 (cluster workflows: bastion, keys, multiplexing, tunnels).

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `ca-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`. No new runs and no change to `recompute.py` or `out/expected.json`: every scene draws from `window.CA`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): the staircase on the Llama 3 cluster, GPU to hall | yes, 5 |
| Reading | You need, terms, labels | split | 2D levels ladder (log bars) | no |
| Reading | 1 Parts list, predict | split | photo (HGX B200 board) | no |
| Reading | 1 PCIe tree and NUMA | split | 2D DGX H100 schematic (clickable parts) | no |
| Reading | 2 Scale-up domain | split | photo (GB200 NVL72); the three consequences moved from its caption into the text | no |
| Reading | 3 Networks, control nodes, a job | split | **3D** `stg-job` (Fig. 2): one job, four networks | yes, 9 |
| Reading | 4 Rack, pod, cluster, fat tree | split | photo (data hall) | no |
| Reading | 4 One message hop by hop | split | 2D message path, a widget (case b: never plays by itself, opens on the last hop, explained by the paragraph on its left) | no |
| Reading | 4 Placement | split | **3D** `stg-place` (Fig. 3): one ring, packed or spread (mode chips swap the list) | yes, 5 + 5 |
| Reading | 5 Storage tiers | split | **3D** `stg-sto` (Fig. 4): the tiers of one SuperPOD scalable unit | yes, 6 |
| Reading | 5 Per node against the cluster, predict | split | photo (DGX-1 and storage rack) | no |
| Reading | 6 Power, 7 Checking, 8 Depth | full width | tables, details closed | no |
| Cluster explorer, Sizing calculator | | full width (tools) | unchanged | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1 (`41_js_sc_hero.js`): `CA.levels.llama3` (3,350, 450, 50, 50, 7.14 GB/s; 1, 8, 16, 3,072, 24,576 GPUs; 0, 1, 3, 5 switches); 12 racks per pod and 8 pods drawn small, illustrative. Fig. 2 (`42_js_sc_job.js`): the machines and networks lit at each step are read from the list items' `data-on` and `data-net`, so text and drawing cannot disagree; positions schematic. Fig. 3 (`43_js_sc_place.js`): the old placement model, unchanged (ring order, edge levels, 0/1/3/5 switches), times from `CA.place` (37.5 and 262.5 ms); which GPUs other jobs hold on the busy cluster is illustrative. Fig. 4 (`44_js_sc_sto.js`): `CA.tiers` (640 GB, 3.35 TB/s, 2 TB, 63 GB/s, 30.72 TB), the SuperPOD standard tier (40 GB/s read per 32 nodes, so 1.25 GB/s each when all read; write half of read, 20 GB/s, derived) and Tectonic (240 PB, 2 TB/s sustained, 7 TB/s peak, a different cluster, labelled). Box sizes not to scale. `40_js_sc_geo.js` holds the shared tray and rack.

**Kept 2D** and why: the ladder is a ranked quantity on a log axis; the node schematic is a labelled clickable diagram, and a 3D server would redraw Interconnects and scaling's Fig. 2, which owns it; the message path is a widget whose outcome (slowest hop, 1 GB time) is the point; the explorer and the calculator are tools; the power and checking tables read best flat.

**Removed**: `26_js_ca_job.js` (the 2D job stepper, now Fig. 2) and the 2D placement animation in `25_js_ca_rd.js` (now Fig. 3, its counters moved into the step lists); the job and placement caption carousels (their text is in the lists).

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: the four stages play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; Fig. 3's chips swap the list and replay; the message path never plays by itself and opens on its last hop; 11 Reading splits are two columns at 1400 px and one below 1100 px; canvas labels do not overlap or leave the card; the step lists' numbers equal `CA` and the scenes' derived values. `check/check_ui.mjs` updated for the job stage (its scrubber walks the 9 list items).

**Length judgement.** Reading core 21.9 min before (5,044 words), 25.9 min after (5,959, `audit_pages.mjs`); closed details 10.0 min both times; other tabs unchanged (explorer 1.5, sizing 2.1, further reading 2.4). The added words are the step lists that explain the hero, storage and placement stages (the placement's second list is the spread mode), as the rollout requires; the job list was already on the page (hidden), and the caption carousels and placement counters were folded into the lists. Nothing the ledger holds was cut.

**Ledger**: 282 units (core 167, depth 78, fat 36, owned 1); three added for new numbers (1.25 GB/s per node, 20 GB/s write per 32 nodes, "about a seventh of memory speed"); key 107 reworded. `ledger.py check` problems 0 here and on the root.
