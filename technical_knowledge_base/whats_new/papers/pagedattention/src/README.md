# Efficient Memory Management for Large Language Model Serving with PagedAttention: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81bf8b90ca93fee19f5f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built on the paper-page method (`.claude/skills/explainer-page/page-kinds/paper.md`), copying the reference folder's shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict, the core sentence and the hero (the paper's Figures 3 and 7, before and after), You need and new terms, then Problem (Figure 1 redrawn, predict question on Orca (Oracle)'s waste), Background, The idea (Eq. 4), Block tables (the Figures 6 to 9 animation on the paper's own block numbers), Sharing (predict question on parallel-sampling savings), Preemption, Distributed, Implementation, Results, Ablations (predict question on block size), Limits, How much of this to believe, What it takes to use this, Why it matters, Connections. |
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
