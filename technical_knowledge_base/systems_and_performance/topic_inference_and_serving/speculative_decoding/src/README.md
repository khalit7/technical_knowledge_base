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
  - `check_page.mjs`: puppeteer check of every control at 390 dark and 920 light (closed blocks opened), and (since 2026-11-12) that animations play when scrolled into view and nothing moves under reduced motion.
- `check_stages.mjs` (2026-11-12): the four 3D stages and the rule animation: autoplay on view, step lists, reduced motion, step-list numbers against the scenes, split layout.
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

2026-10-26 (final follow-up sweep): the MTP row of the drafter table adds GLM-5's acceptance length (2.76 against 2.55 for DeepSeek-V3.2) and GLM-5.2's 4.56 to 5.47, linking Zhipu: GLM. The Leviathan Table 4 recompute and the Gemma 4 drafter preset stay on the Google page, which this page links.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`, which closes `<head>`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` (autoplay on view), `99_js_tabs.js` (key `sd-tab`). `build.sh` now writes the em-dash detector's character as bytes. Removed: `23_js_sd_hero.js` (the static 2D hero) and `28_js_sd_tree.js` (the 2D chain-against-tree animation), replaced by Figs. 1 and 5. No new runs: the four scenes draw the page's own recorded data or its H100 cost model, and expose what they compute as `window.SD_STG`; `check_stages.mjs` checks every number quoted in the four step lists against it.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): one round on a real position (`dists.code_edit` 64 to 67), then time in target passes | yes, 6 |
| Reading | You need, terms | full width | none | no |
| Reading | 1 Idle chip | split | 2D pass-time chart (log axes) | no |
| Reading | 2 One step | split | 2D real step strip (widget, toggles) | no |
| Reading | 3 The rule, the proof | split | 2D animation (Fig. 2), two rules on the same 16 guesses, 6 grouped steps | yes, 6 + 6 (one per rule) |
| Reading | 3 The second rule | split | 2D widget: your own p and q | no |
| Reading | 3 Exactness test, temperature 0 | full width | table (bars in a closed block) | no |
| Reading | 4 Tokens per step | split | 2D slider chart | no |
| Reading | 4 Real acceptance | split | 2D alpha-coloured text (click a token) | no |
| Reading | 4 Formula against runs | split | 2D chart | no |
| Reading | 5 Cost and the crossover | split | **3D** `stg-xo` (Fig. 3): step time at B = 1, 16, 64, 256 and at long context, H100 cost model | yes, 6 |
| Reading | 5 Measured on the laptop, published results | split | 2D chart | no |
| Reading | 5 What moves the crossover | split | 2D cost-model widget | no |
| Reading | 6 Drafters | split | **3D** `stg-dr` (Fig. 4): where each drafter reads from, measured acceptance lengths | yes, 6 |
| Reading | 6 Drafter table, lossy rules, choosing | full width | table | no |
| Reading | 7 Trees | split | **3D** `stg-tree` (Fig. 5): chain against tree, tree attention mask, means over 171 positions; four examples | yes, 6 |
| Reading | 8 In production | full width | knob grid, tables in closed blocks | no |
| Drafters measured | notes and findings | split | 2D table and bars (right) | no |
| Further reading | | unchanged (times updated) | | |

Data behind the stages: Fig. 1, the recorded p and q at four positions of the code-edit answer (Qwen3-1.7B target, Qwen3-0.6B draft, MLX), read greedily (draft guess = top q, kept while it equals the top p); its time step uses `SD.h100t` (check of 5 = 1.00 pass, derived), an illustrative 0.1 per draft pass, and the measured `ratio5` and `cDraft`. Fig. 3, `SD.h100t`'s terms (memory, arithmetic, 2.5 ms) at alpha 0.8, k 4, c 0.05 (the cost model's H100 default), context 1,024 and then 8,192; the 256-user column is dropped at 8,192 because its KV cache (275 GB) exceeds one H100 (80 GB, Memory technology). Fig. 4, `drafters.res` acceptance lengths on "Code: rename" and "Story"; Medusa and MTP not run. Fig. 5, `tree.examples` and the facts `treeChain4` to `treeTree32`. Kept 2D and why: `viz_ideas.md` R7 to R9.

The rule animation was 17 one-guess frames with a per-step caption; under the long-replay rule it is now 6 explained steps (the position, four groups of four guesses, the tally) with one step list per rule, and the caption became a readout of the step's numbers (coins, ratios, replacements), which the step list does not repeat. Section 2's three-item list became one paragraph: Fig. 1 now shows the step on real tokens, and every ledger key of the list is kept.

### Length judgement
| | Before (2026-11-12, `audit_pages.mjs`) | After |
|---|---|---|
| Reading, core | 6,932 words, 30 min | 8,231 words, 36 min |
| Reading, closed details | 1,821 words, 8 min | 1,821 words, 8 min |
| Drafters measured | 1,221 words | 1,232 words |
| Visuals in Reading (audit count) | 9 | 12, four of them 3D stages |

The 1,299 extra words are the step lists the rollout requires (hero 6, rule 6 + 6 of which one is hidden at a time, crossover 6, drafters 6, trees 6) and their source notes; they replace the hero caption and the script-written captions of the rule and tree animations, which the audit did not count. Nothing was cut except section 2's list, which Fig. 1 now carries. If the page must shrink: the hidden second rule list (136 words) could fold into a sentence, and the crossover list could drop its millisecond detail.

### Knowledge ledger
340 units: core 252, depth 27, fat 52, volatile 9 (`ledger.py check`: problems 0). Seven units added for the stages (section "added 2026-11-12"); no key reworded. The root's ledger still finds its seven units keyed on this page (problems 0).

### Checks (2026-11-12)
`checkpage.sh` (fail=0, emdash 0, errbox 1, clipped 0), `scripts/check_page.mjs <shots> full` (bad=0; its 2026-10-23 never-autoplay check is inverted: things play when scrolled into view, nothing moves under reduced motion), `check_stages.mjs` (problems 0), `check_data.py`, `recompute.py`, `ledger.py check` (problems 0).
