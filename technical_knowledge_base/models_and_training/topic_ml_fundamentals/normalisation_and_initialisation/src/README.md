Source of the interactive HTML on the Notion page "Normalisation and initialisation" (child of Topic: ml-fundamentals).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 10 header, 20_read_a to e, 35 Depth and placement tab, 39 Further reading, then every JS part in order, 99 tabs last).

Generated part: `parts/30_js_data.js` (`python3 gen_data.py`, after the three scripts below).

Data scripts (run from src/):
- `OMP_NUM_THREADS=2 uv run --with scikit-learn --with pandas python scaling.py`: Wine numbers, `data/wine.json`.
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with accelerate python real/real_streams.py`: six released models' streams and logits, `real/real_streams.json` (weights from the Hugging Face cache; OLMo 2 1B downloads several GB).
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with safetensors python recompute.py`: init variances against torch.nn.init, deep-MLP factors, GPT-2's residual init, Qwen3 QK-norm ceilings, `recompute_output.json`.

Checks (run from src/ unless noted):
- `node checks/run_norms.mjs && OMP_NUM_THREADS=2 uv run --with torch python checks/norms_ref.py`: the five norms and BatchNorm's running statistics against torch.nn (worst 1e-14).
- `node checks/run_toy.mjs && OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/toy_ref.py`: the placement toy against autograd (3e-15) and Xiong et al.'s Lemma 2.
- From the repo root: `node <page>/src/checks/page_check.mjs 920` (and 390): every control exercised; errors, NaN text and overflow reported. `sh html_utils/checkpage.sh <page>`.

Shape: Part B of html_utils/methods/topic_pages.md (child page). Reading follows the subject's order (inputs once, norms every step, init at step zero): in one screen, feature scaling, which axes, BatchNorm, LayerNorm and RMSNorm, placement, QK-norm, initialisation, depth-aware init and muP, production, mistakes. One standalone tab (Depth and placement: the Theorem 1 sweep and six released models). Departure: none of substance. The parent root's five-networks animation, variance thread, Training lab, Defaults tab and loss-spike debugger are linked, not rebuilt. The placement toy (`parts/21_js_toy.js`, `checks/toy_*`) and `real/real_streams.py` were started by an earlier agent on this page and reused after checking. `live.md` is the old Notion text; `coverage.json` maps every fact in it; `inputs/extracts.txt` holds verbatim source quotes; `viz_ideas.md` the scored choices.
