# Speculative decoding: sources and how to rebuild

Child page of Topic: inference-and-serving. A new page (no old Notion text). Built 2026-10-08.

## Shape (since the 2026-10-23 rebuild)
Teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`). Tabs: Reading, Drafters measured, Further reading.
Reading: the idea in one screen (core sentence, static hero of one step against plain decoding, You need, new terms), then
1 idle chip, 2 one step, 3 the rule, 4 tokens per step, 5 cost and the batch-size crossover, 6 drafters, 7 trees,
8 in production (knobs; engine matrix and dated developments in closed blocks).

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
  - `check_page.mjs`: puppeteer check of every control at 390 dark and 920 light (closed blocks opened), and that nothing autoplays.
- `results/`: compact copies of the raw results (`compact.py <raw dir>`; per-sample data reduced to test statistics;
  local paths removed).
- `build_data.py` (+ `build_drafters.py`): writes `data.json` and `parts/15_js_sd_data.js` (window.SD_DATA). Every
  number in the prose is a fact in data.json, filled into `<span data-f>`.
- `recompute.py`: recomputes the derived numbers independently and checks them against data.json;
  `check_data.py`: the page embeds data.json unchanged and every placeholder has a fact.
- `coverage.md`: what was carried from the parent and what was corrected. `viz_ideas.md`: visuals built and rejected.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence and a new static hero (`23_js_sd_hero.js`: four tokens as four target passes against one draft-and-verify step, time to scale under stated illustrative costs). The four "in one screen" cards were restatements and are gone; "You need" and a new-terms list replace the prerequisites line.
- **Lab tabs moved inline** (each explained one mechanism): the Acceptance rule lab's p-and-q widget into section 3, its alpha-coloured text into section 4, its exactness test into a closed block in section 3 (`31_js_rule.js`, now hooked to the Reading tab); the Batch crossover lab's cost model into section 5 and its measured-run table into a closed block (`32_js_x.js`). Drafters measured stays a tab (a dataset view across all drafters).
- **New**: the worked example (alpha 0.8, k 4: 1 + 0.8 + 0.64 + 0.512 + 0.4096 = 3.36 tokens per pass) and an alpha slider over tokens per pass for k = 1 to 8 with the cap (`26_js_sd_ytk.js`, derived). Section 3 now goes concrete (real p and q animation), then formula, then proof.
- **Bug fixed**: Reading 3's summary table `sd-ex-tbl` was never filled on the old page (empty table); `31_js_rule.js` now fills it.
- **Closed** (depth): the Metal kernel explanation, the exactness method, floating point at near-ties, Speedbumps, long-context drafters, the lossy-acceptance 2026 result, the engine support matrix, dated developments (volatile).
- **Deleted as fat**: the in-one-screen cards, interview answers (each restated a section; the "how to choose" answer became a Choosing paragraph in section 6, the near-tie check moved into the floating-point block), mistakes that restated the core (the two that teach, acceptance rate against length and the tokenizer requirement, are now in sections 4 and 6), pointers to removed tabs.
- **Links**: MTP training is owned by Families and objectives and linked (top and section 6, Further reading).
- **Templates**: `21_js_rd_common.js` and `99_js_tabs.js` from the skill (nothing autoplays; storage key `sd-tab`). `fill_static.py` (run by `build.sh`) writes the data.json facts into the `data-f` spans and the drafter findings into the page as static text, so the prose reads without scripts and the ledger can see the numbers. `build_data.py`: xText now points to the cost model in section 5 instead of the removed lab tab.
- **Checks**: `scripts/check_page.mjs` opens closed blocks before clicking and adds a normal-motion no-autoplay check; `shot_el.mjs` screenshots Reading elements in both themes.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading core (230 words a minute, `html_utils/audit_pages.mjs`) | 28.9 min | 28.3 min |
| Reading closed details | 2.9 min | 7.5 min |
| Acceptance rule lab + Batch crossover lab, core | 3.5 + 2.4 min | (absorbed into Reading) |
| Drafters measured | 5.3 min | 5.3 min |
| Core total excluding Further reading | 40.1 min | 33.6 min |
| Visuals drawn in Reading | 4 | 9 (hero, pass-time curve, rule animation, tokens-per-pass slider, measured yield, server crossover, cost model, tree animation, plus the exactness bars in a closed block) |

Why about 28 minutes is right: the Reading tab now carries what three tabs did (every mechanism with its picture beside the claim), and the ledger's core units are each needed for one of the page's five questions (why checking is cheap, why the output is unchanged, how many tokens, when it pays, which drafter). Most core words are numbers with their source and the measured-against-published distinction, which this page cannot drop without misleading. What was long and optional is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
325 units: core 241, depth 27, volatile 7 (the dated developments, kept in a closed block here; they belong in tech news), fat 50 (each with a note). 312 drafted by `ledger.py init`; 13 added by hand for table cells and the worked example.

## Rebuild
`python3 -I compact.py <raw runs>`, `python3 -I build_data.py`, `python3 -I recompute.py`, `sh build.sh`,
`python3 -I check_data.py`, then from the repo root `sh html_utils/checkpage.sh <this page folder>`, `node <page>/src/scripts/check_page.mjs <shots dir> full` and `python3 html_utils/ledger.py check <page>`.
