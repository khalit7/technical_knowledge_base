# Distillation and Small Language Models

Notion: https://app.notion.com/p/3c65c17b0d0d81efa2a8c3b3b623eb09
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/distillation_and_small_language_models/

Child page of Topic: llm-training-and-post-training (page prefix `dsl`, storage key `dsl-tab`). Built 2026-10-03; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs); 2026-11-10 the split layout and four 3D stages (see the last section).

## Build and checks
`python3 recompute.py` (writes `parts/20_js_data.js` and `inputs/recompute.txt`; rerun only when inputs change), then `sh build.sh` (writes `../index.html`). The header's reading time ("Reading: N min, plus M in closed details.") is written by hand in `parts/10_header.html` from `node html_utils/audit_pages.mjs` (230 words a minute); `rtime.py` was removed. Checks from the repo root: `sh html_utils/checkpage.sh <page folder>`, `node <page folder>/src/check_page.mjs` (every control in light 920 px and dark 390 px with reduced motion, card screenshots in `.shots/`, then a normal-motion pass: a Reading stage plays once in view, the two tab replays never do), `node <page folder>/src/check_stages.mjs [shots dir]` (the four stages: autoplay, step lists, last steps, off-screen and reduced-motion stillness, splits, and the step lists' static numbers against the data), `python3 html_utils/ledger.py check <page folder>`.

Data scripts (outputs committed in `inputs/`; big inputs and checkpoints never):
- `real_logits.py`: `HF_HUB_OFFLINE=1 uv run --no-project --with torch --with transformers python real_logits.py` (needs Qwen/Qwen2.5-0.5B-Instruct and openai-community/gpt2 in the Hugging Face cache) writes `inputs/real_logits.json`.
- `aa_small.py`: first `curl -sL -A "Mozilla/5.0" https://artificialanalysis.ai/models/qwen3-8b-instruct-reasoning -o <scratch>/aa.html`, then `python3 aa_small.py <scratch>/aa.html` writes `inputs/aa_small.json`.
- `toy/`: the toy experiment. `world.py` (task: routes in a fixed 32-node graph; exact data policy), `train.py` (teacher, then seven student methods x three seeds, about 40 minutes on CPU), `mk_toy.py` (writes `inputs/toy.json`). Curves in `toy/runs/*.json`; checkpoints not committed.
- `inputs/source_extracts.txt`: quotes behind every constant typed into `recompute.py`, with URLs. `live.md` is the old Notion page (fetched 2026-10-03); `coverage.json` maps every fact in it (2026-10-03); `ledger.json` is the knowledge ledger of the 2026-10-23 rebuild.

## Tabs and parts
| Tab | Parts |
|---|---|
| Reading `t-read` | `20_read_a` (nav; the idea in one screen: core sentence, hero, you need, new terms, levers in a closed block, the three flavours), `20_read_b` (soft targets, forward or reverse KL), `20_read_c` (whose text, toy summary, the teacher as reward model, distil or RL), `20_read_d` (prune then distil, what makes a good small model), `20_read_e` (practical notes, whose terms), `20_read_z`. JS: `21_js_pf.js` (page helpers PF), `21_js_rd_common.js` (template), `22_js_hero.js`, `23_js_pred.js` (predict then reveal), `24_js_toyg.js` (the 2D toy graph, for the Toy tab), `25_js_s3.js` (renderer v2, template), `25_js_ts.js`, `26_js_rl.js`, `27_js_bd.js`, scenes `28_js_sc_dk.js`, `28_js_sc_fl.js`, `28_js_sc_kl.js`, `28_js_sc_pr.js` |
| Distil a toy student `t-toy` | `30_tab_toy.html`, `30_js_toy.js` |
| Small models compared `t-small` | `31_tab_small.html`, `31_js_small.js` |
| Further reading `t-more` | `39_tab_more.html` |

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence (two choices, whose text and how much of the teacher's opinion per token, plus where the student starts), a new hero figure (`22_js_hero.js`): one real position of the toy under the three signals (the teacher sampled J but put 58% on E; the logit target keeps all four continuations; the student's own Q gets 6.18 nats of reverse KL in a state off-policy training never visits), "You need" and new terms. The four-levers cards became one sentence plus a closed comparison table; Ternary Bonsai's numbers are owned by Quantization and Precision and only summarised there.
- **New visual for a mechanism that had none**: pruning (`27_js_pr.js`), Llama 3.1 8B against Llama-3.1-Minitron-4B-Width and -Depth drawn to scale from the shapes in arXiv 2408.11796, with derived parameter counts (8.03B, 4.51B, 4.54B; formula on the card) and a prediction prompt (width won, Table 1).
- **New "What makes a good small model" section** in place of "The small tier in 2026": the three moves of the recipe (overtrain, distil or prune, run the big models' post-training), a recipe table for eight models, the MoE-on-device point (Gemma 4 26B A4B), links to Pretraining and Local and On-Device Inference. The per-lab cards (volatile, dated) are kept in a closed block.
- **No autoplay**: `21_js_common.js` (which started each animation when it scrolled into view) was replaced by the template `21_js_rd_common.js` plus `21_js_pf.js` (the page's PF helpers, unchanged); the KL and whose-text animations no longer start on a mode switch. `99_js_tabs.js` is the template with key `dsl-tab`.
- **Into closed blocks (depth)**: Hinton's ensemble and MNIST results and small-student temperatures, the per-paper ratio arithmetic and what does not reproduce, R1's distillation data, Thinking Machines' distil-back test, the corrections, the toy's limits and the controlled study's secondary findings, cross-tokenizer OPD, when distillation does not pay, the September 2026 accusations, the per-model cards, and in the toy tab its scope list.
- **Prediction prompts** before the temperature slider, the KL animation, the whose-text stepper and the pruning toggle.
- **Deleted as fat** (14 ledger units): the old header provenance line, tab and section navigation text, pointers, instructions replaced by prediction prompts, wind-ups, a restated toy-limits sentence.
- The old "In one screen" flavours table is kept (it is the comparison in one screen); the Toy and Small models tabs stay as tabs (a seven-method lab used across the page, and a chart across all small models).

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core | 6,227 words, 27 min | 4,722 words, 20.5 min |
| Reading, closed details | 0 | 1,726 words, 7.5 min |
| Distil a toy student | 4.8 min | 4.0 min core, 0.8 closed |
| Small models compared | 2.3 min | 2.3 min |
| Further reading | 2.8 min | 2.8 min |
| Visuals drawn in Reading | 4 | 8 (hero 3 panels, pruning added) |

Why about 20 minutes is right: the page teaches six mechanisms (soft targets and temperature, the KL direction, off- against on-policy, the teacher as an implicit reward, distil against RL, pruning then healing) plus what makes a good small model, each with its picture and its numbers; about a quarter of the core words are captions, counters and prediction prompts of the visuals. What made it long before (per-paper arithmetic, per-model cards, news, corrections, secondary findings) is now closed and optional.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
263 units: core 185, depth 63, fat 14, owned 1 (Ternary Bonsai 2 27B's date and figures, owned by `quantization_and_precision`). 257 drafted by `ledger.py init`; 6 added by hand for script-drawn visuals and new units (hero, pruning shapes and result, recipe table, the 187x derivation, the on-device link). Fat units carry a `note`. Keys for the automatic pass were picked by a script as the first distinctive span of each unit found in the new page, then the weak ones (a bare year or model name) were replaced by hand.

## Departures from the page-kind shape
- Two tabs kept: the toy lab compares seven methods over three seeds and is referenced from four Reading sections; the small-models chart answers "across all small models". Neither explains a single mechanism.
- No interview block (the old page had none).

2026-10-26 (final follow-up sweep): Whose text adds NeoHorse-1's coarsened reverse KL (student's top-K candidates plus a remainder bin) as a published on-policy variant.

## 2026-11-10: the split layout and four 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (added to `build.sh` after `02_css.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `dsl-tab`). `build.sh` already wrote the em-dash test as `ED=$(printf ...)`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D static (three panels) | no |
| Reading | The three flavours | full width | table | no |
| Reading | Soft targets | split | **3D** `stg-dk` (Fig. 1) | yes, 5 |
| Reading | Forward or reverse KL | split | **3D** `stg-kl` (Fig. 2) | yes, 5 |
| Reading | Whose text | split | **3D** `stg-fl` (Fig. 3) | yes, 5 |
| Reading | Divergence first | split | toy results table with bars, 2D | no |
| Reading | The teacher is a reward model | full width | none | no |
| Reading | Distil or RL? | split | R1 Table 16 / Qwen3 Table 21 bars, 2D | no |
| Reading | Prune, then distil | split | **3D** `stg-pr` (Fig. 4) | yes, 5 |
| Reading | Token budgets | split | log-axis bars, 2D | no |
| Reading | What makes a good small model | full width | table | no |
| Reading | Practical notes | full width | tokenization table | no |
| Distil a toy student | all | full width | reader-driven lab; the checkpoint replay is a widget (`auto:false`) | no |
| Small models compared | all | full width | reader-driven chart; the quarter replay is a widget (`auto:false`) | no |

**Stages and their data.** `stg-dk`: `DS.logits` (real Qwen2.5-0.5B-Instruct logits, `real_logits.py`), the same log-sum-exp as before; steps T = 1, hard label, T = 2, T = 4; the chips switch prompt and replay, the slider takes any T. `stg-kl`: the same exact-KL gradient descent as the 2026-10-23 widget, computed in the scene; each fit's 40 steps play inside one step (the long-replay rule); the sliders rerun and replay. `stg-fl`: `DS.toy.anim` (the toy's teacher route, a student route from checkpoint "sft, seed 1, step 300", the teacher's distributions and per-position reverse KL). `stg-pr`: the Minitron shapes and the derived parameter counts. The scenes write their numbers into the step lists from the data; the static HTML carries the defaults, and `check_stages.mjs` fails if the two differ.

**Removed**: `22_js_dk.js` (2D bars; its "tokens shown" slider went with it), `23_js_kl.js` (41 frames, one step each; its Forward / Reverse / Both switch is unnecessary now that both rows are drawn), `24_js_fl.js`'s stepper (its SFT / logit KD / on-policy switch became steps 2 to 5; the per-position counters went), `27_js_pr.js` (toggle). The predict-then-reveal code moved to `23_js_pred.js`, the 2D toy graph to `24_js_toyg.js`.

**Kept 2D**: the hero (three short distributions side by side), the toy results table, the R1 and Qwen3 grouped bars, the token budgets (a log axis) and the tables.

**Length**: Reading core 5,050 words (22.0 min) before, 5,561 (24.2 min) after; closed 1,749 (7.6 min) unchanged; other tabs unchanged. The growth is the step lists: the old cards wrote their step captions by script (invisible to the audit); they are now static text on the left, and no per-step caption repeats them.

**Ledger**: 272 units, core 194, depth 63, fat 14, owned 1, problems 0 (5 units added for the stages' numbers; 10 Further-reading keys that contained a reading time re-keyed to their description words).
