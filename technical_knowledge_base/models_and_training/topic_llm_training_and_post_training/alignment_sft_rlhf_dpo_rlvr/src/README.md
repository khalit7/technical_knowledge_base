# Source of "Alignment: SFT, RLHF, DPO Family, RLVR"

Child page of Topic: llm-training-and-post-training (storage key `align-tab`). Built 3 October 2026; rebuilt 23 October 2026 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and checks
`python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/derived.json`), then `sh build.sh` (writes `../index.html`; `fill.py` writes the SFT sample statistics into the prose as static text). The header's reading time is written by hand from `html_utils/audit_pages.mjs`. Checks: `sh html_utils/checkpage.sh <page folder>`, `node src/check_stages.mjs` (the five 3D stages and the 2D push animation: autoplay on view, one step-list item per step, mode switches replay, nothing moves off screen or under reduced motion, splits two columns at 1400 px, and every number in the step lists recomputed in JavaScript from the page's data), `node src/check_pair.mjs` (the pair toy's JS against `recompute.py`, the loss-mask rules, every loss of the pair stage, the static figures, the tree), `python3 html_utils/ledger.py check <page folder>`.

Data: `mk_lengths.py` (network; `uv run --no-project --with tokenizers python mk_lengths.py`) samples the Tulu 3 SFT mixture and tokenizes the example conversation; outputs in `inputs/`. `inputs/research_*.md` are the verified source notes. `live.md` is the old Notion page; `coverage.json` maps every fact in it (historical; `ledger.json` now governs).

## Parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (styles, nav, core idea, hero, you need, new terms, the stage table), `_b` (1 SFT, 2 batching), `_c` (3 reward models, 4 RL), `_d` (5 DPO family), `_e` (6 online or offline, 7 RLVR, 8 recipes), `_z` (foot); JS `21_js_rd_common.js` (skill template, never autoplays), `23_js_mask.js`, `24_js_pack.js`, `25_js_pair.js`, `26_js_figs.js` (hero, sum or mean, reward model, RL loop twice, online or offline, recipes) |
| Method family tree `t-tree` | `30_tab_tree.html`, `30_js_tree.js` |
| Further reading `t-more` | `39_tab_more.html` |

## What changed on 23 October 2026, and why
- **Top**: the core idea in one sentence; a hero (Tulu 3 8B stage by stage: what each stage rewards, its data, what it learns from, models in memory, the resulting behaviour); "You need"; ten new terms; the stage table kept as the one-screen comparison.
- **Visuals inline, one per core mechanism** (before: 3 HTML widgets, 0 counted by the audit; after: 10, 7 counted as SVG by the audit):
  kept: loss-mask chips, padding against packing, one pair through eight losses;
  new: hero (static annotated), sum against mean per token drawn to scale (toggle; area is share of the gradient, 50% against 1.7%), reward-model ranking to pairs plus InstructGPT's agreement ceiling, the RL loop with PPO's critic against GRPO's group baseline (toggle), the same loop with the reward model swapped for a verifier (toggle, Tulu 3's RLVR), online against offline evidence to scale (OAIF verdict, Tulu 3 node-hours), five open recipes as stage strips.
- **New section 8, how recipes combine the stages** (this page owns it): Tulu 3, Llama 3.1, DeepSeek-R1, Qwen3, Olmo 3 Think; numbers and sources from the parent's `src/data/recipes.json` cells, read only.
- **Common mistakes removed as a section**: each mistake now sits in the section that shows it (TRL's `assistant_only_loss`, sum against mean, boundaries, template, β units, rising margin, "DPO is RLHF without the downsides", "RLAIF means no people", verifier gaming, pass@1 against pass@k).
- **Into closed blocks**: InstructGPT's 16 epochs, NeoHorse-1, padding and cross-document evidence, GRPO fixes in one line each and where each algorithm runs live (RL for LLMs owns the maths), TRL loss types, the pair toy's construction, the packing drawing's simplifications, RLVR lineage and open problems in detail. Corrections boxes stay visible.
- **No autoplay**: the page's old controller played on first view; replaced by the template. The packing mode switch no longer starts playing.
- **Static numbers**: the sample statistics were filled by script (`22_js_fill.js`, removed); `fill.py` now writes them at build time so the ledger, search and readers without JS see them. `rtime.py` removed (header format changed).

## Length judgement
| | Before | After |
|---|---|---|
| Reading, core (230 words a minute) | 5,697 words, 25 min | 5,698 words, 25 min |
| Reading, closed details | 346 words, 2 min | 881 words, 4 min |
| Other tabs | tree 234 + further reading 540 words, 3 min | tree 237 + further reading 540, 3 min |
| Visuals in Reading (audit count of SVG) | 0 | 7 (10 including HTML-drawn widgets) |

Why 25 minutes is right: the brief judged the page thin for a central subject. The core now carries more (a hero, terms, a recipes section, seven new figures and their captions) in the same words, because restatements (the mistakes list, the "what lives where" box, wind-ups) were cut and provenance moved into closed blocks. Every remaining core unit explains a stage: which tokens SFT grades, how batches weight them, what a reward model can know, what RL adds, what DPO derives and its family changes, why online wins, what a verifier changes, how recipes chain them.

## Knowledge ledger (`ledger.json`; `ledger.py check`: problems 0)
216 units: core 184, depth 25, fat 7. 201 drafted by `ledger.py init`; 4 added by hand for script-rendered content (tree nodes, mask captions, packing steps, pair notes); 11 record what the rebuild added (section "added 2026-10-23"). Fat units carry a `note`.

## Proposals not run here
A real before/after of one prompt across stages (OLMo 2 1B base, SFT, DPO and Instruct checkpoints, greedy, a few prompts): about 12 GB of downloads and several minutes of CPU, beyond this rebuild's budget. It would replace the parent's illustrative Axis 1 outputs with real ones.

## 2026-10-26: the loss-family push animation moved here from the DPO paper page
Khalid's decision: the DPO-family animation lives on this page. The DPO paper page's Then-and-now card (the push -dL/dh on one pair against its margin, for unlikelihood, DPO, the SLiC hinge, IPO, cDPO and SimPO, with each loss's outcome on that page's toy after 4,000 steps) now sits inline in section 5, after the pair animation and before the family table: the claim it proves is why DPO never stops pushing while a target (IPO) or a hinge does. Ported to this page's RD.anim stepper (`parts/27_js_lfx.js`, no autoplay, a push or loss view), with a prediction prompt and its answer. Data: `mk_lfx_data.py` copies the six long runs' outcomes from the DPO page's generated `_gen_toy.js` into `parts/26z_js_lfx_data.js` (the DPO page still owns and checks that toy). `check_pair.mjs` now steps both views, checks the counters against the data, and includes the card in the autoplay check. Ledger: 4 units added. Reading 25 to 26 min core.

## 2026-11-10: the split layout and five 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (added to `build.sh` after `02_css.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `align-tab`). `build.sh` writes the em-dash test as `ED=$(printf ...)`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D static | no |
| Reading | (stage table) | full width | table | no |
| Reading | 1 SFT | split | loss-mask widget, 2D (reader toggles, real tokens) | no |
| Reading | 2 Batching | split | **3D** `stg-pack` (31) | yes, 7 |
| Reading | 3 Reward models | split | **3D** `stg-rm` (32) | yes, 5 |
| Reading | 3, the ceiling | split | agreement bars, 2D static | no |
| Reading | 3, RLAIF and CAI | full width | none | no |
| Reading | 4 RL | split | **3D** `stg-rl` (33), PPO and GRPO lists | yes, 5 + 5 |
| Reading | 5 DPO family | split | **3D** `stg-pr` (34), eight losses | yes, 6 |
| Reading | 5, why some stop | split | push against margin, 2D `RD.anim` (27) | yes, 6 |
| Reading | 5, family table | full width | table | no |
| Reading | 6 Online or offline | split | evidence to scale, 2D static | no |
| Reading | 7 RLVR | split | **3D** `stg-rv` (33) | yes, 5 |
| Reading | 8 Recipes | split | stage strips, 2D static | no |
| Method family tree | | full width | reader-driven tree | no |

**Stages and their data.** `stg-pack`: the eight real conversations of `AL_DATA.sft.batch`, padded, packed best-fit decreasing, the plain-mask leak and the boundaries as streams, then height as the gradient weight of one graded token (mean per conversation, then sum); replaces the padding/packing card (`24_js_pack.js`, removed) and the sum-or-mean figure. `stg-rm`: a Bradley-Terry fit of one illustrative ranking of four (six pairs, 200 steps from 0) computed in `recompute.py`; the ranking-to-pairs drawing moved here, the agreement bars stay 2D. `stg-rl`: policy, reference, reward model and critic as glass plates, PPO (illustrative heights) against GRPO (illustrative scores, advantages computed). `stg-pr`: the existing pair toy (`AL_PAIR`, checked against Python) drawn as token columns, reference as glass, the per-token push as streams, training read from the recorded run at every step; the old HTML token bars, loss-curve and training-curve plots were dropped (the push-against-margin card draws the loss shapes; the stage's labels give log p start and end). `stg-rv`: eight illustrative answers to the page's pens question, a verifier scoring 10 or 0 (Tulu 3), GRPO advantages, and a no-spread group. New numbers: `recompute.py` section 3 writes `derived.json["stage"]` (also in `AL_DATA.stage`), `fill.py` writes them into the step lists as static text.

**Kept 2D**: the hero (words per stage; depth would lose them), the loss-mask chips (a reader-driven toggle over real tokens; Post-training data's Fig. 2 already draws a row becoming a masked sequence in 3D), the agreement bars, the online/offline bars and the recipe strips (numbers on an axis), the push-against-margin curves, and the tree tab.

**Recompute note**: `recompute.py` under this machine's Python 3.12 changes last digits of the stored `sft` and `pair` floats (they were made on the Mac); the committed `derived.json` and `20_js_data.js` keep those values and only gained the `stage` block.

**Length**: Reading core 6,116 words (27 min) before, 7,666 (33 min) after; closed 881 (4 min) unchanged. The growth is the step lists: the old cards wrote their step explanations by script (invisible to the audit), and the lfx captions and the pair, packing and RL explanations are now static text on the left; per-step captions that repeated them were removed. The page is the same length to read in practice, now with every step stated beside its visual.

**Ledger**: 227 units, core 195, depth 25, fat 7, problems 0 (7 units added for the stages' numbers; one key re-keyed after "Below, the push" became "The figure draws the push").
