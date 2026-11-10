Source of the interactive HTML on the Notion page "Normalisation and initialisation" (child of Topic: ml-fundamentals; page prefix none, storage key `norminit-tab`).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 02_split (template), 10 header, 20_read_a to e (Reading), 39 Further reading, then every JS part in file-name order, 99 tabs last). Templates copied unchanged from the explainer-page skill: `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2), `99_js_tabs.js` (key `norminit-tab`). The 3D scenes are `60_js_sc_hero.js`, `61_js_sc_bowl.js` and `62_js_sc_axes.js` (numbered after the data part so file-name order loads them last).

Generated part: `parts/30_js_data.js` (`python3 gen_data.py`, after the scripts below).

Data scripts (run from src/):
- `OMP_NUM_THREADS=2 uv run --with scikit-learn --with pandas python scaling.py`: Wine numbers, `data/wine.json`.
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with accelerate python real/real_streams.py`: six released models' streams and logits, `real/real_streams.json` (weights from the Hugging Face cache; OLMo 2 1B downloads several GB).
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with safetensors python recompute.py`: init variances against torch.nn.init, deep-MLP factors, GPT-2's residual init, Qwen3 QK-norm ceilings, `recompute_output.json`.
- `OMP_NUM_THREADS=2 uv run --with torch python signal_prop.py` (new 2026-10-24, seconds on CPU): the orthogonal, LayerNorm and (2026-11-10) twice-He lines on recompute.py's network (same seed and input), and singular values of a 20-layer linear product, Gaussian against orthogonal, `signal_output.json`. Rerun 2026-11-10 with the cached CPU wheel (`uv run --offline --no-project --index https://download.pytorch.org/whl/cpu --index-strategy unsafe-best-match --with torch==2.14.1+cpu`): every earlier number reproduced exactly except the Gaussian product's smallest singular value (4.5e-18 before, 1.6e-18 now, float64 round-off at that size; the page does not print it).

Checks (run from src/ unless noted):
- `node checks/run_norms.mjs && OMP_NUM_THREADS=2 uv run --with torch python checks/norms_ref.py`: the five norms and BatchNorm's running statistics against torch.nn (worst 9.9e-15).
- `node checks/run_toy.mjs && OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/toy_ref.py`: the placement toy against autograd and Xiong et al.'s Lemma 2.
- From the repo root: `node <page>/src/checks/page_check.mjs 920` (and 390): the two step animations play once in view and the placement widget does not (inverted 2026-11-10 from the old never-autoplay check), every closed block opened, every control exercised; errors, NaN text and overflow reported.
- From the repo root: `node <page>/src/check_stages.mjs [shots dir]` (about 4 minutes): the rollout checks, see the 2026-11-10 section. `sh html_utils/checkpage.sh <page>`; `python3 html_utils/ledger.py check <page>`.

## 2026-11-10: the split layout and three 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Every Reading section with a visual is a split (text left, visual right, sticky); sections without one stay full width.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, you need, terms, tool table) | split | **3D** `stg-hr`, Fig. 1 (new hero) | yes, 6 |
| Reading | 1 Feature scaling (kNN, methods table) | split | 2D animation, Fig. 2 (kNN on the wines) | yes, 5 (both scalers) |
| Reading | 1 Gradient descent and the ravine | split | **3D** `stg-bw`, Fig. 3 (new) | yes, 4 |
| Reading | 1 Correction (scikit-learn's PCA) | full width | none | no |
| Reading | 2 Initialisation (factor, formula) | split | 2D log chart, Fig. 4 (the old hero, plus twice He) | no |
| Reading | 2 Compounding and PyTorch's default | split | calculator widget | no |
| Reading | 2 Orthogonal initialisation | full width | none (numbers) | no |
| Reading | 3 Which axes | split | **3D** `stg-ax`, Fig. 5 (new; the 2D widget moved to a closed block) | yes, 7 |
| Reading | 4 BatchNorm | split | 2D animation, Fig. 6 | yes, 5 per mode (three modes) |
| Reading | 4 Costs, correction, small batches | full width | none | no |
| Reading | 5 LayerNorm and RMSNorm | full width | formula; QK-norm bars and tables closed | no |
| Reading | 6 Depth and muP | full width | placement toy, sweep and six models, all closed | no (the toy is a widget) |
| Further reading | | unchanged | | |

**The stages and their data.** Fig. 1 (`60_js_sc_hero.js`): the measured mean square after each of 20 ReLU layers of width 512 (`NID.hero`, from `recompute.py` and `signal_prop.py`), one initialisation per step, each layer a glass plate whose side is the root mean square, flows along the tube; the per-layer factors are the recorded `per_layer` values (`NID.heroF`). New run: twice He's variance (Var 4/n_in), the exploding case, labelled illustrative scale, measured run. Fig. 3 (`61_js_sc_bowl.js`): hue = w · proline + b on the 124 training wines of section 1, the loss surface over (w, b) with both axes at the same scale in raw units (a plateau with a crack: the ravine is about one pixel wide, drawn as its floor line), min-max scaled and standardised, condition numbers 4.4 × 10^6, 23 and 1.0, and 30 gradient steps at 1.2/λmax from w = b = 0, all computed in the browser. Fig. 5 (`62_js_sc_axes.js`): the page's own tensor `NI.makeImage(3)` (4 × 6 × 2 × 2) as a block of cubes coloured by value, each norm's set lit, its numbers streaming into μ and σ (from `NI.normalise`, checked against torch.nn), and the batch test (72 outputs change under BatchNorm, none under the others). The step lists' numbers are static spans (`data-hr`, `data-bw`, `data-ax`) that `check_stages.mjs` compares with the scenes and recomputes independently (the hero against the JSON outputs, the bowl from `data/wine.json`, the axes with its own BatchNorm and LayerNorm).
**2D animations:** Fig. 2 (kNN) and Fig. 6 (BatchNorm) use the template `RD.anim` with step lists; their caption carousels (`sc-cap`, `bn-cap`) were removed, the captions became the lists. Fig. 6 now shows two batches before the 200-batch summary (was five, whose captions were identical), so each mode has 5 steps. A mode switch replays from step 1. The placement toy in its closed block (up to 51 frames) is a widget (`auto:false`, opens on its last frame, live caption kept), by the long-replay rule.
**Kept 2D:** Fig. 4 (six lines on a log axis read best flat), the init calculator (a table), the kNN scatter (a 2D scatter is the honest picture of two features), BatchNorm's grids of numbers (the numbers are the point), the QK-norm bars and the depth sweep (log axes), the six released models (curves by depth). Section 6 has no 3D: residual growth and placement are owned by Normalisation, residuals and stability, and this page's measurements of them sit in closed blocks.
**Text.** The hero caption's measured factors moved to Fig. 4's caption (with twice He added); the hero's explanation is Fig. 1's step list. References to "the hero", "the figure above" and "the animation above" now name figures. Section 1 gained the gradient-descent paragraph with Fig. 3 (the old one-sentence "narrow ravine" claim now has its picture); the 13-feature condition numbers stay beside it.
**Corrected:** `nn.Linear`'s default multiplies the mean square by 0.162 per layer (recorded 0.16250 in `recompute_output.json`); the page printed 0.163, a rounding of the 4-digit rounded value. Fixed in the step list, Fig. 4's caption and the calculator note.
**Checks:** `check_stages.mjs` (new), `checks/page_check.mjs` (never-autoplay inverted), `checks/run_norms.mjs` and `checks/run_toy.mjs` unchanged and passing.

### Length judgement
| | Before (2026-10-24) | After (2026-11-10) |
|---|---|---|
| Reading, core (230 words a minute) | 18.9 min (4,338 words) | 23.8 min (5,477 words) |
| Reading, closed details | 12.2 min (2,804 words) | 13.8 min (3,179 words) |
| Further reading | 2.7 min | unchanged |
| Visuals counted in Reading (audit) | 5 | 8 |
About 1,000 of the new core words are step lists. The kNN and BatchNorm lists are the old caption carousels, drawn by script before and so never counted (about 600 words, of which the BatchNorm 2 and LayerNorm lists, about 280, are alternative modes a reader sees one at a time). Genuinely new: Fig. 1's six steps (which replace the hero caption, now Fig. 4's), Fig. 3 with its paragraph (the ravine had no picture), and Fig. 5's seven steps (the axes figure was a click-to-explore grid). The closed details grew by the old 2D axes widget's text, now a closed block. The length is right: the new words explain the three mechanisms the page owns (signal scale through depth, scaling and conditioning, which axes) step by step beside their pictures; nothing was cut that the ledger keeps.

### Ledger
237 units: core 143, depth 75, owned 4, fat 15, problems 0. Eight units added for the stages' findings (twice He, the LayerNorm reset, the plate encoding, the raw-units crack and its condition numbers, the 30 raw steps, the round bowl, the 72 changed outputs, the sets per norm). No key was re-keyed; none contains a reading time.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to `.claude/skills/explainer-page/teaching/teaching-contract.md`. Ownership (OWNERS.md): this page owns normalisation and initialisation in general; transformer placement, QK-norm, residual scaling and loss spikes are owned by Normalisation, residuals and stability (Topic: llm-architecture), which is linked, not re-taught.
- **Top**: the core sentence and a new **static hero** measured in PyTorch: the mean square after each of 20 ReLU layers (width 512) under PyTorch's default, N(0, 0.02), Xavier, He, orthogonal, and default plus a LayerNorm before every ReLU, labelled on the lines. "You need" and five new terms. The two "In one screen" tables are a closed reference block.
- **Order follows the subject and the hero**: 1 feature scaling (inputs, once), 2 initialisation (step zero; was section 7), 3 which axes, 4 BatchNorm, 5 LayerNorm and RMSNorm, 6 depth (residual stacks, Fixup, sigma 0.02, muP). Init now comes before norms so the hero reads top to bottom.
- **Added** (OWNERS.md gaps): orthogonal initialisation with a measured singular-value contrast (`signal_prop.py`) and Saxe et al. 2013; weight standardisation (Qiao et al. 2019) beside GroupNorm; a three-line worked factor on the hero's network before the formula.
- **Moved to closed blocks** (depth): the old placement section 5 (Xiong et al.'s theorem, the exact toy), the Depth and placement tab (Theorem 1 sweep, six released models; the tab is removed because placement belongs to the owner page, and both cards now draw when their block opens), the QK-norm section 6 (Qwen3 ceilings), the production table, DyT, BatchNorm framework details, muP's Table 3, the mistakes (one line each), provenance.
- **Fixed**: the owner page's removed "Residual stream" tab is no longer named (it now points to its sections 2 and 6 and its Stability explorer tab); the LLM Architecture Gallery is no longer credited with an RMSNorm against LayerNorm demo; sibling and owner reading times updated in Further reading.
- **No autoplay**: `parts/21_js_rd_common.js` and `parts/99_js_tabs.js` are the skill templates (the old `20_js_common.js` started each animation when it scrolled into view). `page_check.mjs` checks nothing plays.
- **Deleted as fat**: wind-ups, restated headings, the old tab's introduction, the "On this page" card for the removed tab.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 28 min | 19 min |
| Reading, closed details | 1 min | 12 min |
| Other tabs (Depth and placement 3, Further reading 3) | 6 min | 3 min (Further reading) |
| Visuals open in Reading / in closed blocks / in other tabs | 6 / 0 / 2 (audit counted 2 inline) | 5 / 4 / 0 |

Why 19 minutes is right: the core now carries what this page owns (scaling, the variance argument and every init scheme, the five norms' axes, BatchNorm's batch dependence and its fixes, LayerNorm and RMSNorm, depth and muP in brief), each with its number and picture; the transformer-specific material that made the old core long is the owner page's, and the measurements that page cites stay here in closed blocks, so nothing is lost.

## Knowledge ledger (`ledger.json`, labels set by `ledger_labels.py`; `python3 html_utils/ledger.py check`: problems 0)
229 units: core 135, depth 75, owned 4 (placement, logit controls, qk-clip and the "RMSNorm everywhere" trend, all carried by Normalisation, residuals and stability), fat 15. 220 were drafted by `ledger.py init` from the 2026-10-19 page; 9 record content added in this rebuild.

## Older history
Overlap fix (19 October 2026): the transformer side moved to "Normalisation, residuals and stability" (3fd5c17b0d0d8163b50dc5e9d9240e89). The placement toy (`parts/21_js_toy.js`, `checks/toy_*`) and `real/real_streams.py` were started by an earlier agent and reused after checking. `live.md` is the old Notion text; `coverage.json` maps every fact in it (it predates the ledger); `inputs/extracts.txt` holds verbatim source quotes; `viz_ideas.md` the scored choices.

- 2026-10-24, topic close: Further reading times set to headers (root 23 min, plus 1; Classical ML, Kimi).
