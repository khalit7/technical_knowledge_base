# t-harness: Same model, many harnesses

- `repro_mmlu_knobs.py`: the offline reproduction (Qwen/Qwen2.5-0.5B-Instruct, fp32 CPU, 2 threads, greedy; first 8 test items of each MMLU subject in alphabetical order; the published run stopped after 25 subjects, 200 items; ten settings). Run with `uv run --with torch --with transformers --with pandas --with pyarrow python repro_mmlu_knobs.py <dir holding mmlu_test.parquet and mmlu_dev.parquet> data/repro_raw.json` (`MODEL_DIR` may point at a local snapshot). About 12 s per item on 2 CPU threads (90 minutes for all 456).
- `recompute.py`: checks every published number against the saved extracts in `inputs/` (20 assertions), aggregates the reproduction, picks the animation items by rule, and writes `../parts/32_js_harness_0data.js`. Pass the path of `mmlu_test.parquet` to also check the micro averages.
- `inputs/`: extracts of every source the tab uses (HF posts, harness code at the cited commits, HELM policy, run spec and MMLU table, Open LLM Leaderboard result fields, Llama 3.1 card, Inspect evals MMLU README, LLaMA Table 9).
- `data/`: `repro_raw.json` (per-item outputs) and `published_check.json`.
- `viz_ideas.md`: built and rejected visuals.
