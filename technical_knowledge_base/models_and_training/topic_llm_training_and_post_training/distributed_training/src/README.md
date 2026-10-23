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
| `21_js_rd_common.js`, `99_js_tabs.js` | the skill templates (nothing plays before the reader acts) |
| `22_js_anim.js` | `window.ANIM` (the numbers) and `mount()`: every `.dt-an` card becomes a step-through; `data-modes` lists its splits, `data-init` the first, `data-cmp` the counters' baseline |
| `23_js_hero.js`, `24_js_coll.js`, `25_js_zero.js` (`window.DTZ`, and the predict blocks), `25_js_tp.js`, `26_js_bubble.js`, `27_js_cp.js`, `28_js_mesh.js` (reads `window.LAY`) | the Reading figures, drawn at the measured width |
| `30_*`, `31_*` | Layout calculator (`window.LAY`) |

## Checks
- `recompute.py` -> `recompute.json`: every number the page shows, now including a `reading` block (memory bar, checkpointing bars, the DP hiding threshold, the mesh captions).
- `node check_calc.mjs` (from `src/`): the calculator, the step-through numbers and the ZeRO slider against `recompute.json`.
- `python3 check_prose.py` (from `src/`): 30 numbers written into the Reading tab's static text and figure widths against `recompute.json`.
- `node .../src/check_controls.mjs` (from the repo root): every step of every step-through in both batches, the slider, toggles and predict blocks, in 920 light and 390 dark with reduced motion; fails on NaN, undefined, errors or any animation that started by itself.
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
