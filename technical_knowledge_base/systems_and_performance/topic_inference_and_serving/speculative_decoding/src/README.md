# Speculative decoding: sources and how to rebuild

Child page of Topic: inference-and-serving. A new page (no old Notion text). Built 2026-10-08.

## Shape
Child-page method (`.claude/skills/explainer-page/page-kinds/topic-child.md`), taught from zero. Tabs: Reading (sections 0 to 9,
mistakes, interview questions), Acceptance rule lab, Batch crossover lab, Drafters measured, Further reading.
Departures: no "in production now" configs section of its own; engine knobs sit with the support matrix in Reading 8,
because the knobs are what differ between engines.

## Evidence
All runs on an Apple M1 Pro (16-core GPU, 16 GB), shared with other agents, between 2026-10-08 and 2026-10-11 (the machine rebooted on the evening of 10-08; model files were rebuilt by the same pinned commands). Load average, and for the drafter runs free memory, recorded with every run; drafter requests slower than 5 tokens/s (the machine swapping) are excluded from timings and marked stalled.
- MLX 0.32.3, mlx-lm 0.32.0: target `Qwen3-1.7B-4bit` (mlx-community @ 3b1b1768), draft `Qwen3-0.6B-4bit`
  (converted from Qwen/Qwen3-0.6B @ c1899de2, group 64). Speculative decoding written from scratch
  (`scripts/accept.py`, `scripts/exact.py`), so every distribution and decision is visible.
- llama.cpp b11146 (Homebrew 0.5.0, commit 7fe450e19, Metal): target `Qwen3-4B-Q4_K_M.gguf` (Qwen/Qwen3-4B-GGUF @
  bc640142); drafts `Qwen3-0.6B-Q4_K_M.gguf` (quantized from unsloth BF16 @ 50968a44), EAGLE-3
  `AngelSlim/Qwen3-4B_eagle3` @ fd331e59, DFlash `z-lab/Qwen3-4B-DFlash-b16` @ b74e3a32, DSpark
  `deepseek-ai/dspark_qwen3_4b_block7` @ 3457dff1, each converted to F16 GGUF with b11146's
  `convert_hf_to_gguf.py --target-model-dir Qwen/Qwen3-4B` (@ 1cfa9a72).
- Engine source read at vLLM v0.31.0, SGLang v0.5.21, llama.cpp b11146, mlx-lm 0.32.0 (installed package);
  TensorRT-LLM v1.2.1 from GitHub at the tag. Published numbers (papers, vendor blogs, model cards) labelled by who
  measured them; extracts in a scratch research folder, every fact on the page linked to its source.

## Files
- `scripts/` (all paths come from the environment: `INF` = the scratch folder holding lock.sh, models/ and mlxenv/;
  `OUT` = a raw-results folder outside the repository):
  - MLX, from scratch: `common.py` (prompts, cached distributions), `exact.py` + `stats.py` (exactness test),
    `accept.py` (speculative decoding with KV caches; tokens per step), `floatcav.py`, `floatcav2.py` (temperature 0
    and batched verification), `dists.py` (p and q at every position), `tree.py` (chain against tree);
    `runmlx.sh` runs one of them under the shared bench lock.
  - llama.cpp: `lbench.sh` (pass-time curves), `lrun.py` + `xclient.py` (llama-server sessions under the lock, one
    at a time, pausing between sessions), `make_jobs.py` (writes `pool16.json`, `xjobs.json`, `drjobs.json`),
    `ngram_prompts.py` + `weather_module.py` (the code-editing and WikiText prompts), `dl_drafts.py` and
    `convert.sh` (draft downloads at pinned revisions and GGUF conversion).
  - `check_page.mjs`: puppeteer check of every control at 390 dark and 920 light.
- `results/`: compact copies of the raw results (`compact.py <raw dir>`; per-sample data reduced to test statistics;
  local paths removed).
- `build_data.py` (+ `build_drafters.py`): writes `data.json` and `parts/15_js_sd_data.js` (window.SD_DATA). Every
  number in the prose is a fact in data.json, filled into `<span data-f>`.
- `recompute.py`: recomputes the derived numbers independently and checks them against data.json;
  `check_data.py`: the page embeds data.json unchanged and every placeholder has a fact.
- `coverage.md`: what was carried from the parent and what was corrected. `viz_ideas.md`: visuals built and rejected.

## Rebuild
`python3 -I compact.py <raw runs>`, `python3 -I build_data.py`, `python3 -I recompute.py`, `sh build.sh`,
`python3 -I check_data.py`, then from the repo root `sh html_utils/checkpage.sh <this page folder>`.
