# Source of "Alignment: SFT, RLHF, DPO Family, RLVR"

Child page of Topic: llm-training-and-post-training (storage key `align-tab`). Built 3 October 2026; rebuilt 23 October 2026 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`), editing only, no new runs.

## Build and checks
`python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/derived.json`), then `sh build.sh` (writes `../index.html`; `fill.py` writes the SFT sample statistics into the prose as static text). The header's reading time is written by hand from `html_utils/audit_pages.mjs`. Checks: `sh html_utils/checkpage.sh <page folder>`, `node src/check_pair.mjs` (every control and figure toggle in both themes and widths, the pair toy's JS against `recompute.py`, and a normal-motion check that no animation moves before the reader acts), `python3 html_utils/ledger.py check <page folder>`.

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
