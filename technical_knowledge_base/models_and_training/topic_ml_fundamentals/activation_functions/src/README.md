Source of the interactive HTML on the Notion page "Activation functions" (child of Topic: ml-fundamentals).

Build: `python3 mk_data.py` (only when `inputs/` change), then `sh build.sh` writes `../index.html`.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page). Reading follows the subject's history and logic: in one screen (family table), why a nonlinearity, sigmoid and tanh (saturation, zero-centring), the ReLU family, dead units measured (animation and sweep on a real trained network), smooth rectifiers (GELU forms, SiLU correction), gated units (real-token before/after animation, Shazeer's results), the 2/3 rule (recomputed against configs), inside real models (summary), the output layer (softmax facts, projection-cost correction), common mistakes. Tabs: Activation atlas, Inside real models, Further reading. The parent's five-network variance animation, Training lab and Defaults tab are linked by tab name, not rebuilt.

Files:
- `parts/`: HTML and one JS part per visual; `21_js_core.js` holds every formula and derivative (pure functions); `20_js_data.js` is generated.
- `inputs/`: `real_models.json` (from `real_models.py`), `dead_relu_toy.json` (from `dead_relu_toy.py`), `configs.json` (fields of released config.json files), `source_extracts.txt` (verbatim extracts used on the page).
- `real_models.py`: OPT-125m, GPT-2, SmolLM2-135M on WikiText-2 test; per-layer statistics and two token records. `OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers --with pandas --with pyarrow python real_models.py` (about 25 min on CPU).
- `dead_relu_toy.py`: the digits MLP, 100 runs. `OMP_NUM_THREADS=2 uv run --with torch --with scikit-learn python dead_relu_toy.py` (about 2 min).
- `check_core.mjs` + `recompute.py`: runs the page's JS core, then recomputes everything with PyTorch, autograd and SciPy. `node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py` (129 checks, 0 failures; results in `check/`).
- `check_page.mjs`: drives every control and animation step in headless Chrome, light 920 px and dark 390 px, fails on script errors, NaN, undefined or Infinity, and saves close-ups to `../.shots/x-*.png`.
- `coverage.json`: every fact of `live.md` and where the page carries it. `viz_ideas.md`: ranked ideas.
