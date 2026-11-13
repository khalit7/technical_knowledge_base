# DSec page: source

`sh build.sh` writes `../index.html` (runs `recompute.py`, `mk_paper.py`, `mk_figdata.py`, then assembles `parts/`).

| File | What it does |
|---|---|
| `live.md` | The Notion row page before migration, saved verbatim by `save_live.py` from the session transcript. |
| `extract_paper.py` | arXiv HTML v1 to `inputs/paper_v1.txt` (section ids marked). |
| `decode_figs.py` | Decodes every figure from the vector PDFs in the arXiv e-print (`uv run --with pymupdf`; usage in the docstring), each axis calibrated on its tick marks; writes `inputs/figs.json`. PDFs are not kept. |
| `recompute.py` | Every derived number and every text-against-figure check (`inputs/recompute.json`, shown in the figures tab). |
| `mk_figdata.py` | Thins the decoded curves (RDP, kept points are decoded vertices) into `parts/_gen_figs.js`. |
| `mk_paper.py`, `paper.json`, `tables.json` | Headline card (with the verdict), Further reading, `window.PAPER`. |
| `mk_coverage.py` → `coverage.json` | Every fact of `live.md` and where the page carries it (27 of 27 verified). |
| `mk_hero.py` | The hero figure (`parts/03_hero.svg.html`), run by `build.sh`. |
| `reading.json` | The header's reading minutes, measured with `html_utils/audit_pages.mjs` after a build. |
| `ledger.json`, `label_ledger.py` | The knowledge ledger and its labeller. |
| `check_page.mjs` | Every control in both themes and widths, every animation mode stepped end to end, mid-play screenshots, text size, overflow; each 2D step animation plays once scrolled into view. |
| `check_stages.mjs` | The 2026-11-06 layout and motion checks (after DPO's): both 3D stages and both 2D step animations at 1400 light, 920 light and 390 dark, autoplay on view, one list item per step in every mode, flows stopping off screen, reduced motion, splits two columns at 1400 px, and 34 numbers the step lists state against `placeSim` and the request scene. |
| `inputs/` | Paper text, decoded figures, the AgentENV README head, the Hacker News item (API, 3 October 2026). |

## Departures from `.claude/skills/explainer-page/page-kinds/paper.md`

- **Live ingredient: the paper's placement algorithm, simulated** ("Place a burst"), rather than a cost-model before/after. DSec is a systems paper, but its evaluated mechanisms (lazy loading, page-cache sharing, core scheduling) are kernel features whose cost models the paper does not give; the only algorithm it states exactly is power-of-k placement with a per-engine overlay and edge admission (§3.2, §7). The simulation runs that algorithm and three alternatives on the same burst, with the published scale (160 nodes, 32K bursts, 5,000 a second, 3,200 per node) and labelled illustrative inputs (k, engine count, refresh interval, starting load). It finds what the text does not say: small k already makes staleness harmless, and the overlay matters mainly at large k, less as engine instances grow.
- **"Tables rebuilt" became "figures rebuilt"**: the paper has three small tables and thirteen figures, all shipped as vector PDFs, so the evidence lives in the figures. They are decoded, not read by eye, and every text claim is checked against them.
- **No Then and now tab**: a 2026 infrastructure report has no later work yet; Why it matters places it (AgentENV, related work).
- **Reading tab is long (about 26 minutes)** because the paper page owns every mechanism; the per-component architecture list is folded into a details block.
- **Animations in Reading**: the request path (container or VM against FnCall), composable layers against monolithic images (to scale with Table 2), and a rollout through a preemption (V4.1 design against the earlier one). The last is an illustrative scenario built only from §6.2 and §6.3, since the paper measures none of it.

## What reproduces and what does not

All numbers come from `recompute.py`. Reproduces from the decoded figures: 45.2% and 17.3% QoS inflation, SCHED_IDLE's at most 3.4% (inside error bars at all five loads), pmem's 40.2% peak memory cut (40.3%), free-page reporting's 21.2% (21.3% over 0 to 46 min), 57% fewer writes (57.3%), 5.5× and 3.4× tar against EROFS (5.6×, 3.5×), the Figure 2, 7, 8 percentiles, the Figure 6 peaks (1,048 and 524), about 90% under 5% CPU (92%, 91%). Partly: 1.71× (curves end at 34.2 and 57.0 min, 1.67×; cold pulling ends before the 60-minute edge, not after), tar 79 against 45 min (figure about 47 for EROFS), pmem CPU 26.5% to 41.4% (27.4% to 39.4%, second burst only). Not testable: every production scale figure and the whole RL co-design (outside the paper's evaluation).

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py`): five rows from workload pressure (§1, §4) to mechanism (§5, §6) to the effect measured on the test cluster (§8: about 35 against over 60 minutes and 57% fewer writes; 5.5× and 3.4× tar writes; −40.2% peak and −21.2% time-integrated memory; 45.2% down to 17.3% latency rise), the RL co-design row dashed as not evaluated, the self-reported production scale beneath. The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; no licensed photo of DSec hardware exists. Then "You need" (Harnesses for training) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: RL environments in general (Harnesses for training); reward hacking and the sandbox as a reward-hacking defence (Reward hacking, which already cites DSec's XFS episode).
- **Closed**: the libdsec code listing, the microVM storage path (OverlayBD over ublk) with the 3FS server hardware, GPU FnCall details, the test hardware, the text-figure mismatch readings (an open pointer stays), and the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: one dated closed block, "Since the paper (dated: checked 26 October 2026)": AgentENV's README claims (read 3 October), the press and Hacker News readings, arXiv still v1.
- **No autoplay**: `makeAnim` patched as on Dream-RSI (request path, layers, preemption wait for a click); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `dsec-tab`), keeping `data-to`. `check_page.mjs` fails if any animation draws a frame before a click, audits every closed block opened, and no longer clicks Play after a mode switch (which used to pause an autoplaying animation).
- **Lab tab kept**: Place a burst is a simulator with several controls across the placement algorithm, not one mechanism's illustration.
- **Takeaway scoped** (`paper.json` with a new `takeaway_note`, the card, `live.md` and `mk_coverage.py`): the database Takeaway called this the first publication with production numbers and stated the scale and the preemption co-design as results. The new one says the scale is self-reported without a method, that four mechanisms are measured on a 10-node test cluster, and that the co-design is described, not evaluated. The Notion property needs the same edit.
- `inputs/paper_v1.txt`: the authors' contact email replaced with "[email removed]"; it had no em-dashes. `extract_paper.py` now writes `--` and redacts emails.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 25.5 min (5,864 words) | 24.7 min (5,680) |
| The paper, closed | 2.3 min (527) | 5.7 min (1,307) |
| Place a burst; Figures; Further reading | 3.6; 6.1; 2.6 min | unchanged |
| Visuals in Reading (audit) | 3 | 4 (the hero added) |

Why about 25 minutes is right: the top added about 350 words, and about 780 words of code, storage-path, hardware, mismatch and adoption detail closed. What stays open is the seven workload properties, the four backends, the request path, the measured workload, the four mechanisms with their animations and predict questions, the RL co-design, the misbehaviour catalogue and an evidence section whose points change the reading (self-reported scale, unevaluated co-design, single runs, weak baselines). The page owns every mechanism of the paper, so shorter would mean closing mechanisms the hero points to.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
268 units: core 223, depth 38, owned 2, volatile 4, fat 1 (the old reading-time header). 256 drafted by `ledger.py init` from the page before the pass; 12 added. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 214 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 438 actions, no problems (no frame before a click). `mk_coverage.py`: 27 of 27.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after the page CSS). The paper tab: the top (core sentence, You need, New terms) beside the hero; Architecture beside the stage Fig. 1; Mechanism 1 (composable layers) beside the layers animation; the RL co-design beside the preemption animation. Full width (tables or no visual): Problem, Idea (Table 1 and its picker), the workload, mechanisms 2 to 4 (their visuals are predict reveals), misbehaviour, Results, Why it matters, Connections, How much to believe, What it takes. Place a burst: the intro, Try, policy toggle, step list, counters, sliders and note on the left, the stage Fig. 2 on the right; the four-policy table and "What this shows" full width. The figures tab: a figure picker and tables, full width (`verify_layout.mjs` lists its charts as outside a split; deliberate).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_req.js`, Fig. 1, one request through DSec (replaces the 2D request-path animation): the GPU server with libdsec, IAM, three placement-engine instances, the watcher, the apiserver, four CPU nodes each with its edge and running sandboxes, and 3FS behind them; flows for the request, the fleet snapshot, the image blocks read on demand and commands and output; the camera moves in close on the node for admission, image loading and stop. A FnCall mode with its own list. Components and order are the paper's (§3.1 to §3.3); the four nodes, their loads (5, 2, 6, 3) and the k = 2 sample are illustrative and labelled so. On a phone each step frames the part it is about.
  - `32_js_sc_burst.js`, Fig. 2 on Place a burst (replaces the 2D bar animation): every node as a bar on a grid (grey: running before the burst; colour: added), a red glass plane at 3,200 a node, the placement engines at the front with flows to the nodes that gained most in each stretch. Driven by the page's own `placeSim` (30_js_place.js, now engine only, plus `rejAt`, refusals per stretch) on the sliders' inputs; the burst plays in its 8 stretches plus "before", one generated list item per step for each of the four policies, with each stretch's fullest and emptiest node and refusals. A slider or new draw is a reader control: it reruns and stops autoplay.
- **Kept 2D**: the hero (a pressure, mechanism, effect table: reads best flat; replacing it with a 3D scene would hide that the placement and co-design are not what the paper measures); the layers animation (a count of 102 squares plus a four-layer stack; a 3D stack was considered, but the message is the count of rebuilt images); the preemption animation (two pools side by side and a memory bar, illustrative; flat reads as well); the predict reveals, Figure 13, every figure in the figures tab and every table (curves, bars and tables).
- **Motion**: `makeAnim` in `11_js_ui.js` replaced by DeepSeek-V3's copy (the 2026-11-06 rules: plays once half in view, stops for good on a control, step lists per mode, `data-playing`); the layers and preemption captions moved into `ol.sx` lists (the per-step caption boxes removed). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `dsec-tab`). `check_page.mjs` now asserts autoplay instead of forbidding it.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 24.7 min (5,680 words) | 28.0 min (6,440) |
| The paper, closed | 5.7 min (1,307) | unchanged |
| Place a burst | 3.6 min (820) | 7.8 min (1,800) |
| The paper's figures, rebuilt; Further reading | 6.1; 2.6 min | unchanged |

The growth is the step lists: the old captions, drawn by script and invisible to the audit, are now written out, and the audit counts hidden second-mode lists too (Fig. 1's FnCall list, the layers and preemption second modes: about 1.5 minutes; Place a burst's three hidden policies: about 3 minutes). A reader following one mode reads about 26 and 4.5 minutes. Nothing was cut. Header: "Reading: 28 min, plus 6 in closed details."

Ledger: 273 units (core 228, depth 38, owned 2, volatile 4, fat 1); 5 added for the step lists and Fig. 2; keys re-pointed on units 39, 40, 71 and 266 (wording around the old request animation) and 261 (owned by Harnesses for training; its key had gone stale with that page's rewording: now "a task store, a sandbox fleet, the harness"). `ledger.py check`: problems 0.
