# Source of "Agentic retrieval, long context and memory"

Child of Topic: rag-and-retrieval (Notion 3c65c17b0d0d8105a68cfb504ed4b0e8; reuses the old page "Advanced and agentic RAG", whose GraphRAG part moved to the GraphRAG and structured retrieval child). Shape: a child page (`explainer-page/page-kinds/topic-child.md`), rebuilt to the teaching contract on 2026-10-24; prefix `ar`, storage key `ar-tab`.

## Build

```sh
export RAG_SCRATCH=<the shared rag setup folder>
P="$RAG_SCRATCH/venv/bin/python -I -B"
# deterministic, CPU, no lock (minutes):
$P scripts/s_hops.py; $P scripts/s_outcomes.py; $P scripts/s_router.py; $P scripts/s_traj.py
$P scripts/s_longctx.py; $P scripts/s_tool.py; $P scripts/s_post.py
python3 build_data.py && sh build.sh && $P check_data.py
node check_page.mjs ../index.html <screenshot folder>     # every control at 390 dark and 920 light, figure screenshots, no autoplay
# from the repo root: sh html_utils/checkpage.sh <this page folder>
```

## Layout

- `scripts/arlib.py`: shared helpers (reads the root's `src/data/load.py` and the root Agentic lab's recorded runs; bge-small search on the CPU with its own query-vector cache).
- `scripts/s_*.py`: one script per measurement; outputs in `data/*.json` (small, committed). Large caches in `$RAG_SCRATCH/ar/`.
- `scripts/ar_gen.py`, `scripts/s_pending.py`, `scripts/run_pending.sh`: the generator runs still to make (bench lock; ports 8360 and 8361), with time estimates; `s_post.py` turns them into `data/pending.json`, which the page reads (nulls render as dashed pending boxes).
- `build_data.py`: makes `parts/22_ar_data.js` (window.AR) and `facts.json` (prose numbers written `@@key@@` in the parts).
- `check_data.py`: data embedded exactly, every prose number from facts, cross-checks against the root's outputs and the production child's timing, pending list, privacy.
- `coverage.md`: the old page claim by claim. `viz_ideas.md`: visuals built and rejected. `live.md`: the old page verbatim.
- `inputs/`: none needed (sources are the root's runs and the shared data).

## Sources read at pinned versions

open_deep_research main 1b7d2e80, gpt-researcher v3.7.0 (0957c301), dzhng/deep-research main 1f8f3e28 (clones in the shared folder, recorded in SETUP.md); Qwen3-1.7B and 4B config.json and GGUF headers; llama-server build 11146 `--help`. Papers: arXiv PDFs of IRCoT v2, Self-Ask v3, FLARE v2, Self-RAG v1, CRAG v3, Adaptive-RAG v2, Search-R1 v5, RULER v3, BrowseComp v1, Lost in the Middle v3, Ferrazzi et al. v2, Mem0 v1, Zep v1; vendor pages read 2026-10-14.

## What changed on 2026-10-24, and why
- **Top of the page.** The core idea in one sentence, a hero figure (F1 against billed tokens for twelve strategies, coloured by who decides what is read), "You need" (the retrieval pipeline, building a harness), new terms, the running example and the one-screen comparison table. The five-findings list was cut: each finding restated a section that now carries it with its figure.
- **Visuals inline: 0 to 13** (audit count of SVGs in Reading). New: hero; loop staircase with a slider on n (formula against recorded billed and prefilled tokens); result-format bars; second-hop bars (SVG); search budgets 1 to 6 against tokens; nine methods at 1.7B and 4B (dumbbell); evaluator AUROC dots; the deep-research shape read from open_deep_research's source; accuracy against tokens read; lost in the middle at 5, 10, 40 and 80 paragraphs; memory curation (both hops kept against tokens). Moved in: the Router lab (section 5; its tab is gone) and the prefill validation scatter (from the Long-context calculator tab). Kept: the second-hop stepper and the failure-bin stepper. Removed from the calculator tab: the accuracy bars (they repeated Reading section 8).
- **Ownership.** Native tool calling down to tokens links to Building a harness (the Qwen3 template excerpt became one sentence in a closed block); memory layers (Mem0, Graphiti, write-time against read-time) link to Context engineering, which carries the numbers; KV sizing and effective context link to Long context (Qwen3 KV and RULER/NoLiMa details kept closed); deep-research products are one compact dated table, with source files, lines, prices and scores closed. The Agent memory layers link was replaced: its id is now an alias of Context engineering in `pages.json`.
- **Corrections.** The Ferrazzi et al. FEVER note became a visible correction box in section 5. The second-hop count was stated as "18 of 55" although 18 is out of the 50 second queries whose first search had not already found hop 2; `build_data.py` now writes `h_agent_n2` (50) and the text says both (before, `h_agent_n` was written twice and the second write silently won).
- **Never autoplay.** `21_js_rd_common.js` and `99_js_tabs.js` are the skill's templates (key `ar-tab`); `check_page.mjs` loads the page fresh, scrolls to both steppers, waits, and fails if either moved.
- **Deleted as fat (42 units)**: the five-findings summary, section lead-ins ("The problem.", "How it works, from zero."), the Common mistakes section (each mistake restated a measured result now in its section; the one unique item, Ferrazzi's FEVER reading, is the correction box), interview answers that restated the core (five design questions stay, closed), the Router lab's "Try" line and stale pending notes.
- `build_data.py` also embeds `tool.s_mean`, `tool.r_mean` and `f4` (the root's 4B F1 per strategy) for the new figures; `25_ar_vis.js` draws every new figure from `window.AR`, no typed numbers.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading core | 10,278 words, 45 min | 7,034 words, 31 min |
| Reading in closed blocks | 836 words, 4 min | 2,745 words, 12 min |
| Other tabs (core) | Trajectory comparer 1,066, Router lab 408, Long-context calculator 577, Further reading 524: 11 min | Trajectory comparer 1,066, calculator 444, Further reading 522: 9 min |
| Visuals inline in Reading | 0 | 13 |
(`html_utils/audit_pages.mjs`, 230 words a minute.)

The core fell by 14 minutes while gaining 13 figures. It stays at 31 minutes because the ledger is almost all core (292 core against 54 depth units): the page owns nine distinct mechanisms (the loop's cost, the second-hop query, five iterative methods, evaluators, routers, trajectory evaluation, deep research, long context against retrieval, retrieval over an agent's own reads) and each carries measured evidence from this topic's runs that no other page has. What could still go: the one-screen table repeats the hero's numbers (kept for "who decides" and "pays off when"), and the method cards could lose their "Here" numbers to the dumbbell figure.

## Ledger
`src/ledger.json`: 391 units from the page as built on 2026-10-19: core 292, depth 54, owned 3 (Mem0 and Graphiti numbers at Context engineering; the KV cache definition at Long context), fat 42, problems 0 (`python3 html_utils/ledger.py check`).

## Topic close (2026-10-24)
New closed block at the end of Reading ("The root page's agentic runs in detail"): the root's retired Agentic lab units this page did not carry (run provenance, the second-hop examples, the 4B strategies' tokens and seconds, tokens per step, lost in the middle on 20 paragraphs, the router on a mixed set, published tables, mistakes and a design). References to the root's Agentic lab, its section 7 and its replay now name its shared runs and section 5. Header remeasured: 31 min, plus 20 in closed details. Every quoted sibling time now matches its header (`html_utils/check_times.py`); the ledger keys that quoted old times or tab names were re-pointed to the current text (problems 0).
