Source of the interactive HTML on the Notion page "Activation functions" (child of Topic: ml-fundamentals).

Build: `python3 mk_data.py` (only when `inputs/` change), then `sh build.sh` writes `../index.html`. Page prefix `af`, storage key `af-tab`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page). Reading follows the subject's history and logic: in one screen (family table), why a nonlinearity, sigmoid and tanh (saturation, zero-centring), the ReLU family, dead units measured (animation and sweep on a real trained network), smooth rectifiers (GELU forms, SiLU correction), gated units (real-token before/after animation, Shazeer's results), the 2/3 rule (recomputed against configs), inside real models (summary), the output layer (softmax facts, projection-cost correction), common mistakes. Tabs: Activation atlas, Inside real models, Further reading. The parent's five-network variance animation, Training lab and Defaults tab are linked by tab name, not rebuilt.

Files:
- `parts/`: HTML and one JS part per visual; `21_js_core.js` holds every formula and derivative (pure functions); `20_js_data.js` is generated.
- `inputs/`: `real_models.json` (from `real_models.py`), `dead_relu_toy.json` (from `dead_relu_toy.py`), `configs.json` (fields of released config.json files), `source_extracts.txt` (verbatim extracts used on the page).
- `real_models.py`: OPT-125m, GPT-2, SmolLM2-135M on WikiText-2 test; per-layer statistics and two token records. `OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers --with pandas --with pyarrow python real_models.py` (about 25 min on CPU).
- `dead_relu_toy.py`: the digits MLP, 100 runs. `OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn python dead_relu_toy.py` (about 2 min).
- `check_core.mjs` + `recompute.py`: runs the page's JS core, then recomputes everything with PyTorch, autograd and SciPy. `node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py` (129 checks, 0 failures; results in `check/`).
- `slope_numbers.mjs`: prints the counters quoted beside the Reading tab's slope figure (`node src/slope_numbers.mjs`).
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check <page>`).
- `check_page.mjs [shots dir]`: drives every control (the gate menu, Shazeer toggles, slope figure, atlas, real-model tab) in headless Chrome, light 920 px and dark 390 px, fails on script errors, NaN, undefined or Infinity, and saves close-ups to `../.shots/x-*.png`. The stages and the motion rules are checked by `check_stages.mjs`.
- `check_stages.mjs [shots dir]` (from the repository root, about 5 minutes): the three 3D stages in every mode at 1400 and 920 px light and 390 px dark: autoplay on view, replay on a mode switch, one step-list item per step, last steps, stillness off screen and under reduced motion, splits two columns only from 1100 px, the 52 numbers written in the step lists (`data-fd`, `data-dr`, `data-gf` spans) against what the scenes compute, and four independent recomputes; writes mid-step screenshots.
- `mk_fold.py`: the points and fits of Fig. 1 (`inputs/fold.json`, `parts/20_js_fold.js`; under a second, `python3 src/mk_fold.py`).
- `coverage.json`: every fact of `live.md` and where the page carries it. `viz_ideas.md`: ranked ideas.

## The 2026-10-24 rebuild to the teaching contract
Editing only, no new runs (`.claude/skills/explainer-page/teaching/teaching-contract.md`).
- **Top**: the core idea in one sentence (the slope decides training; gating sets the slope per token), a static hero (`25_js_hero.js`: sigmoid, tanh, ReLU, GELU, SiLU with their slopes on the same axes, dead and saturated regions marked, plus the SwiGLU block), "You need" (root step 2, The transformer from zero, Normalisation and initialisation) and five new terms.
- **New visual inline** (`26_js_slope.js`, the brief's gradient-flow before/after): GPT-2's 3,072 recorded pre-activations of one token through each activation's derivative, as recorded or scaled by 3, with a predict prompt and a closed answer table (`slope_numbers.mjs`). It shows what the prose only said: ReLU passes the least gradient on a real token (88.8% exactly 0) and does not change with scale; tanh and GELU saturate when inputs grow; sigmoid caps every unit at 0.25.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (the old controller in `22_js_common.js` started animations on scroll; it is removed and `22_js_common.js` keeps only `PF`); the two mode switches no longer call `play()`.
- **Predict prompts** on the dead-unit animation and the gated-block animation (with a closed answer: 5.5% near zero in GPT-2's GELU block against 24.2% in SmolLM2's SwiGLU block).
- **Moved to closed blocks**: Leshno et al.'s quote, ReLU's origins, SELU's reproduced fixed point, who found SiLU and Swish's search result, PaLM's and Llama's adoption quotes (a one-paragraph "why gating won" stays in the core), the vocabulary-projection correction (its title stays visible), and the nine common mistakes (one closed block).
- **Deleted as fat**: the "this page owns the details" wind-up, the three-things sentence the core sentence now carries, the "history below" sentence; the root-links paragraph cut to one sentence.
- **Tabs kept**: Activation atlas (a tool the whole page points to) and Inside real models (a dataset view across three models and every layer, summarised in the Reading tab). Their content is unchanged.
- **Images**: none. This is a mechanism page with no physical object; hand-built SVG carries every idea, and no paper figure is the canonical reference that a redraw would not serve better.
- `rtime.py` was removed: the header's reading time is written by hand in `10_header.html` from `html_utils/audit_pages.mjs`.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 21.4 min (4,917 words) | 22.2 min (5,104 words) |
| Reading, closed details | 1.9 min | 4.5 min |
| Activation atlas / Inside real models / Further reading | 3.0 / 2.1 / 2.5 min | unchanged (2.6 min Further reading) |
| Visuals drawn in Reading | 4 | 11 (hero panels counted one each) |

Why about 22 minutes is right: the core grew by under a minute although about 600 words moved into closed blocks, because the page gained what the contract asks for and lacked: the core sentence, a hero, new terms and a visual for saturation, the one core mechanism that had none (about 450 words, a third of them captions and counters). Every remaining core unit in the ledger is needed to understand one of the page's seven ideas (why a nonlinearity, saturation, the ReLU family, dead units, smooth rectifiers, gating and the 2/3 width, the output layer), each with its numbers and sources.

## Knowledge ledger (`ledger.json`, check: problems 0)
206 units: core 162, depth 34, fat 10. 201 drafted by `ledger.py init`, 5 added by hand for the new visuals and terms. Fat units carry a `note`.

- 2026-10-24, topic close: Further reading times set to headers (root 23 min, plus 1); root card's mention of "activations and normalisation compared" updated to the rebuilt root.

## 2026-11-10: the split layout and three 3D stages (renderer v2)
The 2026-11-06 rollout (briefs `rebuild-page.md` and `layout-rollout.md`). Templates copied unchanged: `02_split.html` (after `02_css.html` in `build.sh`), `25_js_s3.js` (after the data and engine parts, before the scenes), `21_js_rd_common.js`, `99_js_tabs.js` (key `af-tab`). The page no longer has any `RD.anim` animation: both 2D animations became 3D stages.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea (core, you need, terms) | split | hero, 2D static (five activations and slopes, SwiGLU block) | no |
| Reading | In one screen | full width | table | no |
| Reading | Why a nonlinearity | split | **3D** `stg-fd` (Fig. 1, new) | yes, 6 |
| Reading | Saturation (table), then the slope figure | full width, then split | slope widget, 2D (reader-driven) | no |
| Reading | The ReLU family | full width | table | no |
| Reading | Dead units, measured | split | **3D** `stg-dr` (Fig. 2, replaces the 2D epoch animation) | yes, 3 / 6 / 4 (three runs) |
| Reading | Across seeds and rates, what to do, OPT | split | learning-rate sweep, 2D | no |
| Reading | Smooth rectifiers | full width | tables, correction | no |
| Reading | Gated units | split | **3D** `stg-gf` (Fig. 3, replaces the 2D strips) | yes, 4 / 6 (two blocks) |
| Reading | Shazeer's results, why gating won | split | Shazeer bars, 2D | no |
| Reading | The 2/3 rule, Inside real models, Output, mistakes | full width | tables | no |
| Activation atlas, Inside real models | | full width (reader-driven tools) | 2D plots | no |
| Further reading | | unchanged | | |

**The stages and their data.** Fig. 1 (`33_js_sc_fold.js`): 60 seeded points in an XOR layout from `mk_fold.py` (illustrative), the least-squares plane (53% right), the hand-set ReLU layer h1 = ReLU(x1 + x2), h2 = ReLU(x1 + x2 - 1), y = h1 - 2h2 as creased sheets, and the cut at 0.5 (100%); without the ReLUs the same weights give a plane (75%). Fig. 2 (`34_js_sc_dead.js`): the three seed-0 runs of `dead_relu_toy.py`, 384 units as columns (height the share of images on, dead flat red), three layers in depth, flows as dense as the live share of the layer they leave; the 31 epochs of each run are grouped into 3, 6 and 4 explained stretches (the long-replay rule). Fig. 3 (`35_js_sc_glu.js`): the recorded " cat" vectors of GPT-2 small layer 6 and SmolLM2-135M layer 15 (first 24 numbers of x and y, first 32 hidden units), weight matrices as glass plates on the floor sized d deep and hidden-width wide from the models' real widths (two of 768 x 3,072 against three of 576 x 1,536, the same 8d² area), the gate applied in place, flows along each projection; the gate menu stays.
**Kept 2D:** the hero and the atlas (curves read best flat), the slope figure (a sorted bar profile, reader-driven), the learning-rate sweep (a scatter on a square-root axis), Shazeer's bars, every table, and the Inside real models tab (per-layer shares are a bar chart). "Inside real models" in Reading stays text: a 3D of per-layer shares would be a bar chart in perspective (viz_ideas AF18).
**Text.** The dead-unit and gated-block captions (script-written before) are now the step lists, with their numbers as static spans checked against the data; the predict prompts say "watch" (the stages play by themselves); "Non-linear" became the opening sentence of Fig. 1's section.

### Length judgement
| | Before (2026-10-24) | After (2026-11-10) |
|---|---|---|
| Reading, core (230 words a minute) | 22.2 min (5,104 words) | 26.7 min (6,134 words) |
| Reading, closed details | 4.5 min (1,036 words) | 4.5 min (1,036 words) |
| Atlas / Inside real models / Further reading | 3.0 / 2.1 / 2.6 min | unchanged |
| Visuals counted in Reading (audit) | 11 | 12 |
About 1,000 of the new words are the six step lists, and most of them are not new: the dead-unit and gated-block captions were drawn by script before, so the audit never counted them. Three of the lists (two more dead-unit runs, the SwiGLU block) are alternative modes, of which a reader sees one at a time (about 540 words), so a reader of one mode per stage reads about 24 minutes. Genuinely new: Fig. 1's six steps (266 words), which give the "why a nonlinearity" bullet the picture it lacked. The length is right: every remaining core unit is needed for one of the page's seven ideas.

### Ledger
212 units: core 167, depth 34, fat 11, problems 0. Re-keyed two units whose sentences changed ("a flat red tile is dead", "both blocks cost 8"); the old strips' colour legend became fat (the stage carries it); six units added for the stages' findings (the folding steps, dead units coming back, the silent and the loud failure).
