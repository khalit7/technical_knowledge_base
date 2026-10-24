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
- `check_page.mjs`: drives every control and animation step (now also the slope figure, and a normal-motion check that nothing autoplays) in headless Chrome, light 920 px and dark 390 px, fails on script errors, NaN, undefined or Infinity, and saves close-ups to `../.shots/x-*.png`.
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
