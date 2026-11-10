Build: `sh build.sh` writes `../index.html` from `parts/` (same slot scheme as the parent's build: 20_read*.html, 3x_tab_*.html, every *.js in its own script, 99_js_tabs.js last; links as {{text|url}}, n:<notion id> or #t-<tab>). The header's reading time is written by hand from `html_utils/audit_pages.mjs` (the build no longer computes it, because a fifth of the Reading text is drawn by script).

Tabs: Reading (the idea in one screen with a hero, then 12 numbered sections, each split with its visual inline), Layout calculator, Further reading. Page prefix for storage: `dist-tab`.

## Parts (rebuilt 2026-10-23 to the teaching contract)
| Part | What |
|---|---|
| `20_read.html` | styles, nav, the idea in one screen: core sentence, hero (six panels), "You need", new terms, the six-split reference table (closed) |
| `20_read_a.html` | 1 memory (Llama 3 8B bar), 2 collectives (five before/after panels) |
| `20_read_b.html` | 3 data parallel (step-through), 4 ZeRO and FSDP (predict, ZeRO slider, step-through over ZeRO-1/2/3 and HSDP, depth block) |
| `20_read_c.html` | 5 tensor and sequence parallel (TP / TP + SP before/after, step-through), 6 pipeline (step-through, schedules, predict, bubble widget) |
| `20_read_d.html` | 7 expert (step-through, depth block), 8 context (step-through, three traffic patterns) |
| `20_read_e.html` | 9 composing (nested layout with seconds per axis, table, rules), 10 activation checkpointing (bars), 11 frameworks, 12 depth (mistakes, provenance) |
| `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js`, `99_js_tabs.js` | the skill templates, copied unchanged (key `dist-tab`); the split layout, renderer v2 and autoplay on view |
| `22_js_anim.js` | `window.ANIM` (the numbers) and `window.DTSTEP` (the steps of each split, pure data; `node mk_lists.mjs` writes them into the step lists) |
| `32_js_sc_gpu.js` | 3D scenes: Fig. 2 memory, and Figs. 4, 6, 8, 9, 11, 12, one step under each split (one scene, six stages) |
| `33_js_sc_coll.js`, `34_js_sc_tpb.js`, `35_js_sc_mesh.js` | 3D scenes: Fig. 3 collectives, Fig. 7 the TP block, Fig. 14 the mesh (reads `window.LAY`) |
| `23_js_hero.js`, `25_js_zero.js` (`window.DTZ`, and the predict blocks), `26_js_bubble.js`, `27_js_cp.js` | the 2D Reading figures, drawn at the measured width |
| `30_*`, `31_*` | Layout calculator (`window.LAY`) |

## Checks
- `recompute.py` -> `recompute.json`: every number the page shows, now including a `reading` block (memory bar, checkpointing bars, the DP hiding threshold, the mesh captions).
- `node check_calc.mjs` (from `src/`): the calculator, the step-through numbers and the ZeRO slider against `recompute.json`.
- `python3 check_prose.py` (from `src/`): 30 numbers written into the Reading tab's static text and figure widths against `recompute.json`.
- `node .../src/check_controls.mjs` (from the repo root): the slider, toggles, predict blocks and calculator in 920 light and 390 dark with reduced motion; fails on NaN, undefined, errors or a stage that plays by itself under reduced motion.
- `node .../src/check_stages.mjs [shots dir]` (from the repo root): the ten stages play when scrolled into view, stop off screen, never move under reduced motion, step to the end with one list item per step, swap lists on mode switches; splits are two columns at 1400 px; canvas labels do not overlap at 1400 px; the step lists equal `DTSTEP`, and their numbers equal `ANIM` and `LAY`.
- `python3 html_utils/ledger.py check <page>`: problems 0.

## The 2026-10-23 rebuild: what changed and why
This page is now the single owner of the parallelism forms for training (OWNERS.md). The rebuild applied the teaching contract:
- **Top**: the core sentence ("a training step can be cut along six dimensions ... the chattiest cut on the fastest wire") and a new **hero**: six panels showing which GPU holds which part of the batch and of the model under DP, ZeRO-3, TP, PP, EP and CP, with the bytes each sends for the same step. "You need" and six new terms; the old comparison table moved into a closed reference block.
- **One step-through per split, inline**: the old single "one training step, nine ways" animation (one card, nine modes, in its own section) is now mounted six times, each inside the section it proves (DP; ZeRO-1/2/3 and HSDP against DP; TP; PP with its 1F1B timeline; EP; CP). It no longer plays on scroll.
- **Mechanisms that had no visual got one**: Llama 3 8B's memory against 80 GB (static bar); the five collectives before and after (static panels; all-reduce = reduce-scatter + all-gather is now seen); the ZeRO stages against the data-parallel degree (one slider, defaults reproduce ZeRO Table 1 independently) with a prediction prompt; TP against TP + sequence parallelism on one feed-forward block (before/after toggle); context parallelism's three traffic patterns (ring, all-gather, Ulysses); the two published layouts as nested groups with seconds per axis from the calculator's core; activation checkpointing (store all, selective, full) for one 8K sequence. The pipeline bubble widget gained a prediction prompt.
- **Absorbed** (ledger section "absorbed"): TP degree must divide the (KV) heads, measured 1.33 times the bytes otherwise, and FSDP's keep-or-regather choice (`reshard_after_forward`) from Sharding and scale (JAX) and Distributed PyTorch; the LayerNorm-gradient all-reduce under sequence parallelism and the V-shaped schedules from Distributed PyTorch; ring attention's log-sum-exp merge, its causal imbalance and the 123 against 273 MB measurement from the JAX page; the data-parallel hiding threshold (about 5,300 tokens per replica) and TP's batch-independent ratio (141% of compute for 70B at TP 8 over a 400 Gb/s card) from Interconnects and scaling section 9.
- **Moved to closed blocks**: the 14/18/20 bytes-per-parameter conventions, ZeRO-Offload and Infinity, FSDP2's quoted benefits, GShard/Switch lineage and Qwen3's practice, torchtitan's feature list and speed-ups, four mistakes that the core does not already show, and the step-through provenance. Three mistakes ("1F1B shrinks the bubble", "ZeRO-3 is free memory", "DP can always use more GPUs") were folded into the core (the pipeline prediction, the ZeRO paragraph, the DP paragraph).
- **Deleted as fat** (8 units, each with a note in the ledger): the old reading-time line, tab and nav labels, the definition of a training step, the intro to the single animation, a "then raise v" instruction, control labels.
- British spelling (optimiser) throughout, including the calculator tab.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute, `audit_pages.mjs`) | 22.3 min | 27.2 min |
| Reading, closed details | 1.1 min | 5.3 min |
| Layout calculator | 4.3 min | 4.3 min |
| Further reading | 3.7 min | 3.7 min |
| Visuals drawn in Reading | 1 | 22 |

Why 27 minutes is right: the static prose of the core is about the same length as before (4,968 words against about 4,880), although it now carries ten absorbed units and nine new figure captions; the 5 extra minutes are the captions and counters of the six step-throughs (about 1,300 words), which are the explanation of each split read beside the picture rather than extra prose. Every core unit in the ledger is needed to understand one of the six splits or how they compose; what is optional (conventions, offload, lineage, framework details, mistakes the core already shows, provenance) is closed.

## Knowledge ledger (`ledger.json`)
256 units: core 223, depth 25, fat 8. 237 were drafted by `ledger.py init` from the old page; 10 record what was absorbed from other pages (section "absorbed", `where` empty: they live here); 9 record the new figures (section "new figure").

## Files kept from the earlier build
- `live.md`: the old Notion text, verbatim (fetched 2026-10-03). `coverage.json`, `mk_coverage.py`: where every fact in it went (the 2026-10-03 accounting; `ledger.json` is the current one).
- `inputs/extracts.txt`: quoted lines from the sources fetched for this page.
- `viz_ideas.md`: candidates scored, chosen and rejected.

Overlap fix (19 October 2026, still in force): every section ends with an "Implemented in" line linking Distributed PyTorch, Sharding and scale (JAX), Interconnects and scaling, Launching distributed training, Fault tolerance at scale and Mixture of experts. The collective-cost calculator stays removed (Interconnects' Collective simulator owns collectives on the wire). The DeepSeek-V3 expert-parallel layout points to Mixture of experts section 7.

2026-10-26 (final follow-up sweep): links to retired paper tabs now name sections (ZeRO's Communication #s-comm, Megatron-LM's f and g operators #s-mlp); the DeepSeek card and the pipeline note name its Training systems and Serving sections; ZeRO, Megatron-LM and DeepSeek card times set to their headers; ledger units 205 and 206 re-keyed.

## 2026-11-10: the split layout and ten 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `dist-tab`). `build.sh` writes the em-dash test as `ED=$(printf ...)`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D static (Fig. 1) | no |
| Reading | 1 Memory | split | **3D** `stg-mem` (Fig. 2) | yes, 4 |
| Reading | 2 Collectives | split | **3D** `stg-coll` (Fig. 3) | yes, 5 |
| Reading | 3 Data parallel | split | **3D** `stg-dp` (Fig. 4) | yes, 5 |
| Reading | 4 ZeRO, the stages | split | ZeRO slider, 2D (Fig. 5), predict | no |
| Reading | 4 ZeRO and HSDP, the step | split | **3D** `stg-zero` (Fig. 6), ZeRO-1, 2, 3, HSDP | yes, 6, 5, 4, 5 |
| Reading | 4 FSDP, HSDP prose | full width | none | no |
| Reading | 5 TP block | split | **3D** `stg-tpb` (Fig. 7), TP and TP + SP | yes, 4 and 5 |
| Reading | 5 TP step | split | **3D** `stg-tp` (Fig. 8) | yes, 6 |
| Reading | 6 Pipeline step | split | **3D** `stg-pp` (Fig. 9), 1F1B timeline on the floor | yes, 5 |
| Reading | 6 Schedules | split | bubble widget, 2D (Fig. 10), predict | no |
| Reading | 7 Expert | split | **3D** `stg-ep` (Fig. 11) | yes, 8 |
| Reading | 8 Context step | split | **3D** `stg-cp` (Fig. 12) | yes, 7 |
| Reading | 8 Traffic patterns | split | ring, all-gather, Ulysses, 2D static (Fig. 13) | no |
| Reading | 9 Composing | split | **3D** `stg-mesh` (Fig. 14), Llama 3 405B and DeepSeek-V3 | yes, 4 and 4 |
| Reading | 9 Table, rules | full width | table | no |
| Reading | 10 Checkpointing | split | bars, 2D static (Fig. 15) | no |
| Reading | 11, 12 | full width | none | no |
| Layout calculator | | full width | reader-driven tool | no |

**Stages and their data.** The six step stages are one scene: four GPU boards, each with its memory as slabs to scale (weights, gradients, optimiser state, activations, from `ANIM.numbers`), the 80 GB as a dashed ring, its share of the model as 8 rows of 4 layers cut in quarters (front half attention, back half feed-forward; experts orange in EP), its data on the floor (four sequences of eight chunks), and dots flowing for each collective (ring, all pairs, neighbours, InfiniBand pairs). ZeRO-3 and HSDP show the just-in-time gathered layer climbing the stack; PP draws the 1F1B schedule on the floor, filling step by step. The step texts are `DTSTEP.steps(mode)`, written into the lists by `mk_lists.mjs`; a readout under each list gives the running counters (states, bytes so far, collectives) against DP, replacing the old counter cards and the compare menu. `stg-mem` stacks the four blocks of section 1; `stg-coll` moves chunks between four GPUs (who ends with what; the ring factors stay in the text); `stg-tpb` is the old TP / TP + SP toggle as two lanes in depth with matrices as glass plates (schematic shapes); `stg-mesh` draws the two calculator presets as GPU cubes and ends with seconds per axis as columns from `LAY.layout`.

**Removed:** the 2D step-through engine (`mount()` in `22_js_anim.js`), `24_js_coll.js`, `25_js_tp.js`, `28_js_mesh.js` (each replaced by a stage), and the step-throughs' batch toggle (four sequences or one 32K sequence): the one-sequence results are now sentences (section 3, section 7's hot spot, 20.1 GB against 13.6 GB, and the provenance block). Per-step captions were moved into the step lists, not kept beside them.

**Kept 2D:** the hero (six small multiples), the ZeRO slider and the bubble widget (one parameter each), the three traffic patterns (small diagrams compared side by side), the checkpointing bars (three numbers spanning a hundredfold), and the calculator tab.

**Length**: Reading core 6,335 words (27.5 min) before, 8,152 (35.4 min) after; closed 1,215 (5.3 min) unchanged. The growth is the step lists: the old step-throughs wrote about 1,300 words of captions by script (invisible to the audit, as the October note says) and those are now static text beside their stages, with the mesh captions and the TP block's two captions; no prose was added beyond the stage intros, so the page reads in about the same time as before, now with every step stated.

**Ledger**: 263 units, core 230, depth 25, fat 8, problems 0 (7 units added for the stages; units 23, 26, 249, 250 and 252 re-keyed after their figures became stages).
