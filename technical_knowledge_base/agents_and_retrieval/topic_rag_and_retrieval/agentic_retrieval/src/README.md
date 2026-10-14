# Source of "Agentic retrieval, long context and memory"

Child of Topic: rag-and-retrieval (Notion 3c65c17b0d0d8105a68cfb504ed4b0e8; reuses the old page "Advanced and agentic RAG", whose GraphRAG part moved to the GraphRAG and structured retrieval child). Shape: topic_pages.md Part B (a child page), with three labs as tabs.

## Build

```sh
export RAG_SCRATCH=<the shared rag setup folder>
P="$RAG_SCRATCH/venv/bin/python -I -B"
# deterministic, CPU, no lock (minutes):
$P scripts/s_hops.py; $P scripts/s_outcomes.py; $P scripts/s_router.py; $P scripts/s_traj.py
$P scripts/s_longctx.py; $P scripts/s_tool.py; $P scripts/s_post.py
python3 build_data.py && sh build.sh && $P check_data.py
node check_page.mjs ../index.html <screenshot folder>     # every control at 390 dark and 920 light
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
