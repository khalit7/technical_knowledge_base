Source of the interactive HTML on the Notion page "Normalisation and initialisation" (child of Topic: ml-fundamentals; page prefix none, storage key `norminit-tab`).

Build: `sh build.sh` writes `../index.html` from `parts/` (01 head, 02 css, 10 header, 20_read_a to e (Reading), 39 Further reading, then every JS part in order, 99 tabs last).

Generated part: `parts/30_js_data.js` (`python3 gen_data.py`, after the scripts below).

Data scripts (run from src/):
- `OMP_NUM_THREADS=2 uv run --with scikit-learn --with pandas python scaling.py`: Wine numbers, `data/wine.json`.
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with accelerate python real/real_streams.py`: six released models' streams and logits, `real/real_streams.json` (weights from the Hugging Face cache; OLMo 2 1B downloads several GB).
- `OMP_NUM_THREADS=2 uv run --with torch --with transformers --with safetensors python recompute.py`: init variances against torch.nn.init, deep-MLP factors, GPT-2's residual init, Qwen3 QK-norm ceilings, `recompute_output.json`.
- `OMP_NUM_THREADS=2 uv run --with torch python signal_prop.py` (new 2026-10-24, seconds on CPU): the hero's orthogonal and LayerNorm lines on recompute.py's network (same seed and input), and singular values of a 20-layer linear product, Gaussian against orthogonal, `signal_output.json`.

Checks (run from src/ unless noted):
- `node checks/run_norms.mjs && OMP_NUM_THREADS=2 uv run --with torch python checks/norms_ref.py`: the five norms and BatchNorm's running statistics against torch.nn (worst 9.9e-15).
- `node checks/run_toy.mjs && OMP_NUM_THREADS=2 uv run --with torch --with numpy python checks/toy_ref.py`: the placement toy against autograd and Xiong et al.'s Lemma 2.
- From the repo root: `node <page>/src/checks/page_check.mjs 920` (and 390): no animation playing after scrolling the whole page, every closed block opened, every control exercised; errors, NaN text and overflow reported. `sh html_utils/checkpage.sh <page>`; `python3 html_utils/ledger.py check <page>`.

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
