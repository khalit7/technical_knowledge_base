# Efficient Memory Management for Large Language Model Serving with PagedAttention: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81bf8b90ca93fee19f5f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`), copying the reference folder's shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict, the core sentence and the hero (since 2026-11-13 the 3D stage `stg-hero`, the paper's measured waste to scale; the paper's Figures 3 and 7 moved beside the diagnosis in Problem), You need and new terms, then Problem (Figure 1 redrawn, predict question on Orca (Oracle)'s waste), Background, The idea (Eq. 4), Block tables (the Figures 6 to 9 animation on the paper's own block numbers), Sharing (predict question on parallel-sampling savings), Preemption, Distributed, Implementation, Results, Ablations (predict question on block size), Limits, How much of this to believe, What it takes to use this, Why it matters, Connections. |
| Simulate the KV cache | `t-run` | The live ingredient: eight illustrative requests on 64 slots, animated for Orca (Max), Orca (Pow2), Orca (Oracle) and vLLM on the same memory; then the same simulator at the paper's OPT-13B scale (15,728 slots, Figure 11 length distributions) with trace, block size, samples per request and seed controls, against Figure 2 and Figure 13. |
| The paper's figures, rebuilt | `t-tables` | Throughput curves (Figures 12, 14, 16, 17) with a latency threshold slider and the ratios they give; Table 1 recomputed; the bar charts (Figures 2, 13, 15); the ablations (Figures 18a, 19); the Figure 11 workloads; every number in the text checked. |
| Then and now | `t-then` | Orca (2022), vLLM's release, the paper, everyone paging the KV cache, what paging left open, V1, the 2026 removal of swap space; a survived/changed table. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Tables tab renamed "The paper's figures, rebuilt".** The paper has one table; its evidence is in figures. The arXiv HTML ships them as matplotlib SVGs, so every line and bar is read from the vector paths, calibrated on each panel's own ticks (`extract_figs.py`), not by eye.
- **The live ingredient is a simulator, not a toy model** (the method's "systems" row). A trained model would teach nothing here; the claim is about memory allocation, which can be simulated exactly from the paper's rules (§6.1) and its own length distributions.
- **The block-table animation sits inline in Reading**, not on its own tab, because it is the explanation of §4.3 and §4.4 and uses the paper's own figures' numbers.
- **"Then and now" kept** (the method treats it as optional): the paged KV cache became the standard layout, and the paper's swap path has since been removed from vLLM, which a reader of the paper should know.
- **Reading is long (about 25 minutes against the old page's 11; 24 core plus 6 closed after the 2026-10-25 pass)**: the paper page owns every detail of the paper plus the evidence section; the old summary's facts are all carried (`coverage.json`).

## Files

- `build.sh`: as the reference (runs `recompute.py`, `sim.py` if `inputs/sim_check.json` is missing, `mk_paper.py`; assembles parts; expands macros; fails on em-dashes and unexpanded macros).
- `paper.json` (metadata, takeaway, verdict, headline numbers, resources, KB links), `tables.json` (Table 1 and the printed bar labels), `mk_paper.py` (card, Further reading, `window.PAPER`).
- `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/table_S5_T1.txt`), `extract_figs.py` (SVG figures to `inputs/figs.json`; the SVGs themselves are not kept, the usage line says where to download them).
- `recompute.py`: KV bytes per token from the OPT configurations, Table 1 slots, Figure 1 slopes, every curve crossing at every threshold (checked against the page's JS), the bar ratios, the ablation overheads, Figure 11 means. Writes `inputs/recompute.json`.
- `sim.py`: the KV cache simulator (rules in its docstring); `parts/12_js_sim.js` is a line-for-line port, and `inputs/sim_check.json` holds the default runs the check compares (270 numbers, identical).
- `check_stages.mjs` (from the repo root, 2026-11-13): the 3D stage and the two 2D animations at 1400 light, 920 light and 390 dark (autoplay once in view, one list item per step in every mode, a mode switch replays, a reader control stops autoplay for good, flows stop off screen, last step reached), every split two columns at 1400, reduced motion, and 174 numbers and events: the hero's step list against Table 1, Figure 2, Figure 13a and the simulator's averages, and every admission, finish and preemption the toy's stretch lists name against the simulator's trace.
- `check_page.mjs` (from the repo root: `node technical_knowledge_base/whats_new/papers/pagedattention/src/check_page.mjs`): simulator and curve crossings against Python, then every control at 920 light and 390 dark, both animations stepped end to end with mid-animation screenshots to `../.shots/x-*.png`, text under 11 px, NaN/undefined, errors, sideways scroll.
- `mk_coverage.py`: 61 facts of `live.md` with where the page carries each, verified against the built page; writes `coverage.json`.
- `save_live.py`: copied the Notion fetch verbatim into `live.md`.
- `inputs/later_extracts.txt`: the quoted lines from later sources (blogs, READMEs, release notes, TGI, TensorRT-LLM, SGLang, vAttention, Sarathi-Serve, llm-d), fetched 2026-10-03.

## Corrections to the old summary

- "2 to 4x over Orca (Oracle)": the abstract says over FasterTransformer and Orca; read off Figure 12 at 0.5 s/token the gain over Orca (Oracle) on ShareGPT is 1.5 to 2.3x (175B at 1.47x, below the text's "1.7x to 2.7x" at every threshold from 0.2 to 0.9 s/token).
- "Recompute overhead never exceeds 20% of swap latency": fails as written (117% at block size 256); holds as "never more than 20% slower".
- "Paged kernel 20 to 26% slower": true at batch 32 only; 25 to 44% at batch 8.
- "Gains grow with larger models": not monotone (largest at 66B, smallest at 175B on ShareGPT).
- The paper's "prompt and decode tokens in one step" matched the released code at v0.1.0 but not v0.1.3 to v0.1.7.
- Dates of V1 (default v0.8.0, only engine v0.11.0) and llm-d's founders completed; swap space removed in v0.18.0 (March 2026).

## Checks (3 October 2026)

`sh html_utils/checkpage.sh technical_knowledge_base/whats_new/papers/pagedattention`: tabs 5, emdash 0, errbox 1, clipped 0, fail=0. `check_page.mjs`: simulator 270 numbers and curve crossings 558 numbers identical to Python; 614 actions, 0 problems. `mk_coverage.py`: 61 of 61 verified. Page about 227 KB.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence (blocks through a block table, waste at most one block, copy-on-write sharing, bigger batches, and the paper's 2 to 4× beside what its own Figure 12 gives against the ideal contiguous baseline). The hero is a before/after in the paper's own drawings (CC BY 4.0, `img/`, `img/CREDITS.md`): Figure 3 (two requests in contiguous chunks, the three wastes labelled) above Figure 7 (the same kind of two requests in 4-token blocks), each in a sideways scroll box at phone width. Then "You need" (KV cache, its size per token, memory-bound decode, with owners) and the new terms.
- **Visuals inline**: Figure 2, Figure 15 and Figure 18b (each against the simulator) left their predict reveals; each sits in its own titled card right after its question. The Figure 18b card's labels no longer overlap the simulator panel's title.
- **No autoplay**: `makeAnim` in `11_js_ui.js` replaced by the patched copy (as on DPO, ReAct, CLIP), so the block-table and toy-memory animations wait on their first step; `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `pagedattention-tab`). `check_page.mjs` now fails if `bt` or `kv` moves before a click, and opens every closed block.
- **Owned elsewhere, linked with this paper's sentence kept**: why a KV cache exists (The transformer from zero), bytes per token (Long context), memory-bound decode (Performance math), iteration-level batching, prefix caching, chunked prefill and preemption today (Batching, KV cache and scheduling in depth), tensor parallelism at serve time (Distributed and disaggregated serving), vLLM as it is now (vLLM: inside the default engine).
- **Closed**: §2 in full; footnote 1 (block per layer and head); the Figure 6 walk-through in words (the animation's captions carry it); Figure 9 block by block; the three kernels; the full §6.1 setup; related work; the version-by-version paper-against-code diff; the Alpaca batch check.
- **Volatile**: vLLM's later features, the V1 dates, PyTorch Foundation, llm-d, RL rollout engines, today's hardware backends, stars and the latest release moved into one dated closed block ("sources read 3 October 2026"); Why it matters keeps one durable sentence and the owner link.
- Header: "Reading: 24 min, plus 6 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 24.7 min (5,688 words) | 24.0 min (5,516) |
| The paper, closed | 0 | 5.7 min (1,304) |
| Simulate the KV cache | 3.6 min | unchanged |
| The paper's figures, rebuilt | 5.8 min | unchanged |
| Then and now | 3.2 min | unchanged |

Why about 24 minutes is right: the paper has more distinct method pieces than most (block tables, sharing in three forms, preemption by swap or recompute, distributed execution, kernels) and four result families plus two ablations, each with numbers this page checks. The added top (about 2.5 minutes) was paid for by closing background the owner pages teach, appendix-level detail and the dated vLLM history. What stays open is the paper's argument in order and the evidence section; cutting further would drop results or the corrections, not repetition.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
283 units: core 243, depth 27, owned 6, volatile 5, fat 2. 271 drafted by `ledger.py init` from the page before the pass; 12 added (core sentence, hero, terms, three moved charts, six owner links). Fat: the two old animation-manners lines. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 5, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: simulator and curve crossings identical to Python; 0 problems (including no movement before a click and every closed block opened). `mk_coverage.py`: 61 of 61 (the reading-time item's keys and the batching key updated).

## The 2026-11-13 layout rollout (split layout, a renderer v2 stage, autoplay)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (after `01_css.html`), `25_js_s3.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `pagedattention-tab`). `21_js_rd_common.js` is not used: the page's own `makeAnim` (`11_js_ui.js`) is the rollout copy from Latent Context LMs (step lists per mode, autoplay on view, stops for good on a control, `data-playing`), plus two additions: a per-step duration (`durOf`) and the step's raw progress passed to `draw`, so a step can play a stretch of frames. `12_js_sim.js` gained one option, `snapAt` (record one iteration's layout for the stage; no count changes, `check_page.mjs` still finds all 270 numbers identical to `sim.py`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| The paper | Core sentence, You need, New terms | split | **3D** `stg-hero` (Fig. 1) | yes, 6 |
| The paper | Problem: memory-bound, the cache is large | split | 2D Figure 1 (right) redrawn | no |
| The paper | Problem: the diagnosis, three wastes | split | image: the paper's Figures 3 and 7 (the old hero) | no |
| The paper | Problem: even the oracle wastes most | split | 2D Figure 2 against the simulator | no |
| The paper | Problem: sharing, scheduling; Background; The idea | full width | none (Eq. 4 is a formula box) | no |
| The paper | Block tables (§4.2 to §4.3) | split | 2D animation `bt`, four modes (Figures 6 to 9) | yes, 4 / 5 / 3 / 3 |
| The paper | Sharing | split | 2D Figure 15 against the simulator | no |
| The paper | Preemption, Distributed, Implementation, Results | full width | none | no |
| The paper | Ablations: kernel overhead, block size | split | 2D Figure 18b and the simulator by block size | no |
| The paper | Recompute against swap, Limits, Believe, Using it, Why it matters, Connections | full width | none | no |
| Simulate | The toy KV cache | split | 2D animation `kv`, four modes, grouped by the long-replay rule | yes, 5 / 5 / 5 / 6 |
| Simulate | At the paper's scale | split | 2D tool: notes left; controls, Figure 2 bars and table right | no |
| Figures, rebuilt | Throughput curves; ablations; workloads | split | 2D tools and charts (notes left) | no |
| Figures, rebuilt | Table 1, bar charts, every number checked | full width | tables | no |
| Then and now, Further reading | all | full width | none | no |

**The stage and its data.** `31_js_sc_hero.js`, Fig. 1, *the paper's measured waste, drawn to scale*: Table 1's 12 GB of KV cache for OPT-13B on one A100-40GB (15,728 slots of 800 KiB) four times, one floor per system of the evaluation (Orca Max, Pow2, Oracle; vLLM), one row per 2,048 slots (OPT's longest sequence). On each floor stands one iteration of this page's simulator (`SIM.run`, ShareGPT lengths from Figure 11, seed 1, iteration 3,000, after the warm-up), classified slot by slot: raised green slots hold a token, pale raised ones are reserved for tokens to come, the red floor is reserved past the real end (internal fragmentation), grey is the buddy allocator's rounding; vLLM's floor is 983 blocks of 16 with one request's blocks in blue. A glass plate (the model) streams one dot flow per running sequence to the slot it writes this iteration. The camera moves in close on each system in turn, then pulls back for the bill: Figure 13a's requests per batch as bars on white plinths. The step list quotes Figure 2 as printed and the simulator's averages (`inputs/sim_check.json`); a live line under the list gives the drawn iteration's own shares. Every number is checked by `check_stages.mjs`. The block-table mechanism on a pool (in 3D) is the owner's, Batching, KV cache and scheduling in depth (Fig. 3); this page links to it and keeps the paper's own Figures 6 to 9 in 2D with their block numbers.

**Kept 2D, and why.** The block-table animation: the paper's own Figures 6 to 9, words and block numbers in small tables, which read best flat, and the 3D pool stage is the owner's. The toy KV cache on Simulate: 64 slots as squares with a request strip and counters, a flat picture whose change over time is the point (grouped into 5 or 6 explained stretches per system, each playing its iterations). Figure 1, Figures 2 and 15 (stacked and plain bars), Figure 18b (log axis), the throughput curves, the ablation and length charts (curves and histograms) and the tables.

**Moved.** The paper's Figures 3 and 7 (before and after) from the top into Problem, beside the three wastes they draw. The Oracle predict question became a paragraph ("Even the oracle wastes most of its memory"): the stage now answers it at the top. The per-step captions of both animations became the step lists (`sx-bt1` to `sx-bt4`, `sx-kv1` to `sx-kv4`); the toy keeps a one-line live readout of the iteration drawn. The closed "Figure 6 walk-through in words" kept only what the list does not say ("What one iteration does"); its one extra fact (prefill uses ordinary attention) moved into the list.

**Motion.** The stage and both animations play once at least half in view, pause off screen, stop for good on any control or at the last step, never move under reduced motion; a mode switch shows that mode's list and replays. `check_page.mjs` now asserts that each animation plays once in view (it asserted the opposite since 2026-10-25) and creates its screenshot folder.

## Length judgement (2026-11-13)
| | Before (2026-10-25) | After |
|---|---|---|
| The paper, core | 24.1 min (5,533 words) | 28.9 min (6,654) |
| The paper, closed | 5.7 min (1,304) | 5.3 min (1,210) |
| Simulate the KV cache | 3.6 min (822) | 6.8 min (1,573) |
| Figures rebuilt; Then and now; Further reading | 5.8; 3.2; 2.2 | unchanged |
| Visuals drawn in The paper (audit) | 9 | 10 |

The growth is the step lists. On The paper, the hero's list (about 350 words, plus its provenance line) is new, and the block-table lists (about 660 words, three of the four modes hidden by default) replace captions that were drawn by script and invisible to the audit; on Simulate, the four stretch lists (about 750 words, three hidden by default) replace per-iteration captions. A reader following the default modes reads about 27 minutes on The paper and 4 on Simulate. Nothing was cut. Header: "Reading: 29 min, plus 5 in closed details."

Ledger: 293 units (core 253, depth 27, owned 6, volatile 5, fat 2); 10 added (the stage, its provenance and bill, two block-table list facts, four toy stretch facts); keys re-pointed on 33, 34, 35 (the Oracle question, now a paragraph), 62 (the block-table intro), 69 (the Figure 6 walk-through, now the list), 194, 197, 198, 200 (the Simulate intro and Try line). `ledger.py check`: problems 0.

Checks (13 November 2026): `checkpage.sh` tabs 5, fail=0, emdash 0, errbox 1, clipped 0; `check_page.mjs` 0 problems (simulator 270 and crossings 558 numbers identical to Python); `check_stages.mjs` 0 problems; `mk_coverage.py` 61 of 61; `verify_layout.mjs` problems 0.
