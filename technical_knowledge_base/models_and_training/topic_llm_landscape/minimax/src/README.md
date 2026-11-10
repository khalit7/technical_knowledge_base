# MiniMax, interactive page (v4, rebuilt 2026-10-24 to the teaching contract; 2026-11-10 split layout and three 3D stages, the section at the end, which supersedes the build notes where they differ)

Child page of Topic: llm-landscape (storage key `mm-tab`). Rebuilt by editing only: no new runs, no new numbers except derived ones shown with their formula (expert widths per token, kernel tile loads on an illustrative selection).

## Build and checks
- `sh build.sh` writes `../index.html`: HTML parts `01_head` (CSS, header, tab bar), `02_read_a` (core idea, hero, you need, new terms, one-screen table, lineage timeline with closed release notes), `03_read_b` (lightning, 7:1 hybrid, M2's reversal), `04_read_c` (MSA with the three-way animation, kernel, and "what each route stores, reads and computes"), `05_read_d` (CISPO and RL, MoE, licences and money, dated volatile table, closed depth blocks), `07_more`; then the error box and one script per JS part: `10_js_common`, `21_js_rd_common` (skill template), `10b_js_model` (shared attention model from the configs), `11_js_read` (lightning stepper, SWA chart, recomputed claims), `12_js_read2` (kernel diagram and intensity widget), `13_js_anim` (one token, three ways; never autoplays), `14_js_cost` (store/read/compute chart), `15_js_line` (timeline), `16_js_figs` (hero, MoE to scale), `99_js_tabs` (skill template).
- Header reading time comes from `rt.json`: after editing text run `node html_utils/audit_pages.mjs <out.jsonl> <page>` and update it.
- `node <page>/src/check_controls.mjs <page>/index.html` (from the repo root): every button, slider, select, checkbox and timeline dot, 390 px dark, 920 px light and reduced motion; fails if the animation moves before play or after a mode switch.
- `recompute.py` / `recompute.out`: every reproduced default (unchanged). `python3 html_utils/ledger.py check <page>`: the knowledge ledger.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence; a new static hero (one square per layer for 01, M2 and M3, coloured by attention type, with the per-token cache each pays); "You need" (Attention variants, Beyond attention, Long context, RL for LLMs); five new terms; the generations table.
- **Lineage tab moved into Reading** ("How the design got here"): the order is the argument (linear, full, sparse). Redrawn at the measured width; the per-model cards became a static, closed release-notes table that a dot click opens.
- **Cost by context tab moved into Reading** as the synthesis section ("What each route stores, reads and computes"), absorbing "The arc"; its reproduce bullets merged into the MSA claims table.
- **Lightning**: "The bill being attacked" condensed to two sentences (Long context owns sizing; Beyond attention owns the recurrence); the toy worked example now lives in the stepper with one caption; formula after the picture.
- **M2's reversal**: before/after quotes moved above the reasons; SWA chart kept inline.
- **MSA**: steps condensed; KL loss, eq. 12 and ablations closed; the neighbour table closed (one core sentence kept: coarser than DSA, finer than MoBA). New static kernel diagram (same 12 query/block pairs: 12 tile loads Q-outer against 4 KV-outer) beside the intensity widget.
- **CISPO**: RL for LLMs owns the objective and draws it (its one-rare-token toy), so the CISPO weight widget and the long formula were removed; MiniMax's evidence, the $534,700 run, the FLOPs against R1, the FP32 head fix and M2's lower bound 0 stay.
- **MoE**: new to-scale expert figure (32 x 9,216, 256 x 1,536, 128 x 3,072 + 1 shared) above the rebuild table.
- **Models today**: one compact dated volatile table; the request-cost widget was removed (prices stay in the table, the 512K rule in a sentence). The M3.1 Flash harness story and the cross-provider index comparison are a closed block. Trade-offs section deleted as restatement; misreadings closed, keeping only those the core does not show.
- **No autoplay**: the three-way animation no longer starts on scroll or on a mode switch. Templates `21_js_rd_common.js` and `99_js_tabs.js` replace `90_js_tabs.js`.
- **No real image**: the subject has no physical object, and the MiniMax papers on arXiv carry only the non-exclusive distribution licence, so no paper figure was embedded.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 28.4 min (6,539 words) | 21.5 min (4,945 words) |
| Reading, closed details | 1.0 min | 4.8 min |
| Other tabs | 6.8 min (Cost by context 2.1, Lineage 2.5, Further reading 2.3) | 2.2 min (Further reading) |
| Visuals inline in Reading (audit count) | 3 | 7 (hero, timeline, SWA chart, animation, kernel diagram, store/read/compute chart, MoE to scale), plus the lightning stepper and kernel widget |

Why about 22 minutes is right: the page owns three of MiniMax's own designs (lightning's block split, the 7:1 hybrid, MSA with its kernel) and the evidence for the reversal between them, each with numbers recomputed from configs; what other pages own (linear attention, sparse attention in general, KV sizing, CISPO's objective, MoE) is now one sentence and a link. The two former tabs now sit beside the claims they prove, and detail is closed.

## Knowledge ledger
230 units: core 141, depth 20, volatile 17, owned 2 (CISPO's formula and toy, by RL for LLMs), fat 50 (`ledger.py check`: problems 0). 220 drafted by `ledger.py init`; 10 added by hand for script-rendered content (the old lineage cards, the removed request-cost and CISPO widgets).

---
Earlier notes (v3): the page replaced all text of the Notion page; `recompute.py` holds every reproduced default; `inputs/` holds the configs, cards, papers and web pages fetched on 1 October 2026.

## 2026-11-10: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `mm-tab`). `build.sh` keeps its explicit lists (new: `02_split.html`, `25_js_s3.js`, `41_js_sc_lt.js`, `42_js_sc_ax.js`, `43_js_sc_arc.js`; removed: `13_js_anim.js`, deleted) and writes its em-dash test as bytes.
- **Data**: the stages use the page's own model (`stored`, `readB`, `compB`, `KB`, `KSEL`, `SELT` in `10b_js_model.js`, from the configs; the same numbers as `recompute.out`) and the lightning toy (q, k, v in the text). Each scene exposes what it draws (`window.MM_LT`, `MM_AX`, `MM_ARC`); `check_stages.mjs` checks every number in the step lists against them.
- **Fig. 3 `stg-lt`** (6 steps, `41_js_sc_lt.js`), lightning on four tokens: k·v bars on plinths; token by token, the running sum handed along a chain (4 dependent steps); the sequence cut into two block trays; block 1's masked product as a flat 2 x 2 glass plate (rows queries, columns keys, upper cell masked) streaming into both outputs at once; the state S1 = 3 as a teal plate carried to block 2; block 2's outputs stacked intra (purple) plus inter (teal) = 5 and 24. Replaces the table stepper (`lt` in `11_js_read.js`, removed); its captions became the step list.
- **Fig. 5 `stg-ax`** (6, 4 and 4 steps, `42_js_sc_ax.js`), one decoded token through one layer, with the route chooser and the context select (32K, 128K, 1M) in the left column: MSA as 4 grey KV-head plates and the gold index-key plate (append, the index sweep, the 40 highest block scores as bars, each group's 16 blocks lit in its own colour, those blocks streaming to the token); full GQA as 8 orange plates read whole (keys, then values in purple); lightning as 64 green 128 x 128 state plates, then the softmax layer's 8 plates. Replaces the 2D canvas animation and its never-autoplay controller (`13_js_anim.js`); its step captions became three step lists (`sx-ax-msa`, `-full`, `-lin`, one shown per route), with context-dependent numbers in spans the script fills (the 128K values are written statically). The old 5-item MSA mechanism list is now the MSA step list. Block scores and selections stay illustrative (the same seeded generator), said on the page. Its "Compare, to scale" step was dropped: Fig. 6 now carries the comparison.
- **Fig. 6 `stg-arc`** (5 steps, `43_js_sc_arc.js`): stored (glass), read (solid, streaming to the token) and compute, one group each, one column per route (MiniMax-01 green, M2 orange, M3 blue, M3's index share gold), each group on its own scale; the camera moves to the group a step is about; at 1M M2 is a cut, dashed ghost; the last step shows M3 all-sparse against M3 as built (the "1/20" accounting). The 2D log-scale chart (`cc`) stays beside it in its own split as the any-context explorer.
- **2D kept, each in a split** (text left, card right): hero layer strips, lineage timeline, SWA ablation bars, kernel tile diagram and intensity widget, store/read/compute curves, MoE widths to scale. They are strips, a timeline, bars on a signed axis, a loop-order diagram with sliders, log curves and exact width proportions, which read best flat. Full width: the generations table, release notes (closed), the 7:1 hybrid (the hero carries its picture), the claims table, "Where MSA sits", CISPO and RL, licences, Models today (volatile, unchanged), Depth and Further reading.
- **Checks**: `check_stages.mjs` (new; from the repo root, with a shots directory outside the repo): every stage plays when scrolled into view, steps to its end with one list item per step (all three routes and the 1M context of Fig. 5), stops off screen, never moves under reduced motion; splits two columns at 1400 px and one below 1100; step-list numbers against the model. `check_controls.mjs`: 1400 px added; its never-autoplay assertions on the old animation were removed (inverted in `check_stages.mjs`).
- No real image: still no physical object, and the papers' figures carry only arXiv's non-exclusive licence.

### Length judgement (2026-11-10)
| | Before this pass | After |
|---|---|---|
| Reading, core | 5,000 words, 21.7 min | 6,082 words, 26.4 min |
| Reading, closed details | 1,113 words, 4.8 min | unchanged |
| Further reading | 2.4 min | unchanged |
| Visuals inline in Reading (audit count) | 7 | 9 |

The added words are the step lists (21 items): the old animation's 17 captions were script text the audit could not count (now static, two of the three route lists hidden until chosen), and Fig. 6's list adds the 128K and 1M comparisons with M3's index share that the page did not state before. Nothing was cut; a reader following one route of Fig. 5 reads about 2 minutes less than the measured total.

### Knowledge ledger (2026-11-10; problems 0)
234 units: core 143, depth 21, volatile 18, owned 2, fat 50 (unchanged counts). Re-keyed to the new wording: 26 ("is all block 1 hands on"), 80 ("2,048 selected keys of their own KV head"), 115 ("in blocks of 128 earlier tokens"). No key contains a reading time.
