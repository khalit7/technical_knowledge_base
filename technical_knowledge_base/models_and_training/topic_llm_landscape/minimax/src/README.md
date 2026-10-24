# MiniMax, interactive page (v4, rebuilt 2026-10-24 to the teaching contract)

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
