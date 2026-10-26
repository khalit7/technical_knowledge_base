Source of the interactive HTML on the Notion page "Loss functions" (child of Topic: ml-fundamentals).

Build: `python3 mk_data.py` (only when `inputs/` change), then `sh build.sh` writes `../index.html`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (a child page), rebuilt 2026-10-24 to the teaching contract (below). Reading: the core idea and a static hero (each loss's pull against the error and the margin), you need, new terms; in one screen; reduction; regression (noise models, loss / pull / second-derivative chart, which number each loss picks, the outlier animation, leverage, MAPE and quantiles); cross entropy (likelihood, entropy + KL, the gradient p - y, four losses on the same logits); the cross-entropy family; margins (loss and pull chart, what the score estimates); ranking losses (RankNet against LambdaRank on one list, triplet in a closed block); the logit level (z-loss and soft-capping linked to their owner, the real-logits demo closed); between distributions; the adversarial loss; mistakes (closed). Tabs: Fit a line, Further reading. The parent's loss explorer, entropy + KL bars, Training lab and imbalance runs are linked by tab name, not rebuilt.

Files:
- `parts/`: HTML and one JS part per visual; `21_js_core.js` holds every formula, fit, minimiser, logit gradient and ranking lambda (pure functions); `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (nothing moves before the reader acts).
- `inputs/`: `anscombe.csv`, `starsCYG.csv`, `rivers.csv` (Rdatasets mirrors of R's datasets and robustbase), `real_logits.json` (from `real_logits.py`), `torch_docstrings.txt` (PyTorch 2.14 loss docstrings), `source_extracts.txt` (verbatim quotes used on the page).
- `real_logits.py`: float32 logits of GPT-2, SmolLM2-135M and Qwen2.5-0.5B on one sentence; log Z, cross entropy, and bf16 damage at shifts of the logit level. `OMP_NUM_THREADS=2 HF_HUB_OFFLINE=1 uv run --with torch --with transformers python real_logits.py`.
- `check_core.mjs` + `recompute.py`: runs the page's JS on the page's data, then recomputes everything with PyTorch losses and autograd and SciPy (linprog, BFGS, bounded search). `node check_core.mjs && OMP_NUM_THREADS=2 uv run --with torch --with scipy --with numpy python recompute.py` (104 checks, 0 failures; results in `check/`).
- `check_page.mjs`: drives every control and animation step in headless Chrome and fails on script errors, NaN, undefined or Infinity, or on the animation moving before the reader acts.
- `ledger.json`: the knowledge ledger of the 2026-10-24 rebuild (`python3 html_utils/ledger.py check`). `coverage.json`: every fact of `live.md` and where the page carries it (2026-10-03). `viz_ideas.md`: ranked ideas.

## The 2026-10-24 rebuild to the teaching contract
What changed and why:
- **Top**: the core idea in one sentence and a static hero (`28_js_hero.js`): the pull of MSE, Huber and MAE against the error beside the pull of exponential, hinge, cross entropy and focal against the margin, labels on the curves. "You need" (Probability, Information theory, the parent's step 3) and new terms.
- **New core visual, cross entropy** (`28_js_lg.js`): the gradient on every logit of one five-class prediction under cross entropy beside label smoothing, focal loss or MSE on probabilities, on an easy and a confidently wrong example (illustrative logits). It shows the page's central claim, how a loss shapes the gradient: MSE on probabilities pushes the wrong example 38 times less than cross entropy, focal silences the easy one 5.6 times, smoothing lifts the tail. Cross entropy as likelihood and as entropy + KL is stated with the formula and linked to Information theory, which owns the derivation.
- **New section, ranking losses** (`29_js_rk.js`): pairwise (MarginRankingLoss, RankNet), listwise (ListNet; InfoNCE as its one-positive case, linked to the Contrastive sibling) and LambdaRank, with a before/after on one list of ten documents (RankNet's lambdas against LambdaRank's, one slider) and the pairwise-errors-versus-NDCG example of Burges's Figure 1. Triplet loss in a closed block (FaceNet, PyTorch defaults). Sources: Burges 2010 (MSR-TR-2010-82), Cao et al. 2007, Schroff et al. 2015, PyTorch 2.14.1 docstrings, all saved in `inputs/source_extracts.txt`.
- **Loss shapes tab removed**: its three cards (regression loss / pull / second derivative, classification loss and pull, the score minimum) explain mechanisms the Reading text describes, so they moved inline beside those claims. `31_js_shape.js` now registers with `RD.onRender`.
- **Logit level**: z-loss and soft-capping are owned by Normalisation, residuals and stability (OWNERS.md); the core keeps the one idea this page owns (the cross-entropy gradient sums to zero, so the level is free) and links the owner; PaLM's quote, Wortsman et al., the bf16 arithmetic and the real-logits demo are in a closed block.
- **Closed depth**: the log-cosh check, Poisson and Gaussian NLL, focal's α / prior bias / ablations, Mukhoti et al., the real-logits demo, triplet loss, the mistakes.
- **No autoplay**: the template `21_js_rd_common.js` replaced the old RD in `22_js_common.js`; the outlier animation no longer starts when its scenario or loss is switched. `check_page.mjs` scrolls to it, waits 3.5 s and fails if it moved.
- **Deleted as fat** (37 ledger units, each with a note): the old header and nav, wind-ups and pointer sentences, the Loss shapes tab intro, old try prompts (replaced by predict prompts), and five mistakes whose body restated a section.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 21.9 min | 26.8 min |
| Reading, closed details | 1.2 min | 5.3 min |
| Other tabs, core (Fit a line + Loss shapes) | 1.4 + 2.2 = 3.6 min | 1.3 min (Fit a line) |
| Core total, excluding Further reading | 25.5 min | 28.0 min |
| Visuals drawn in Reading | 5 | 14 inline, plus 1 in a closed block |

Why about 27 minutes is right: the core grew by 2.5 minutes overall while the page absorbed the Loss shapes tab (its tables are now counted in Reading) and gained the two things the brief named as missing for its ownership: how a loss shapes the gradient on the logits (the cross-entropy section) and ranking losses (new). About 1,500 core words are captions, counters and script-written tables of the visuals. The rest is the subject's own facts, each sourced; what is not needed on first read is closed.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
256 units: core 184, depth 35, fat 37. 205 drafted from the old page by `ledger.py init`; 51 added by hand (the three tables split into rows, the script-rendered Loss-shapes tables, and the new content: hero, cross-entropy gradient, ranking, logit level). Fat units carry a `note`.

- 2026-10-24, topic close: the triplet block in the ranking section shrunk to one sentence (PyTorch default kept) and a link to Contrastive's "Pairs and triplets: the margin losses", which owns FaceNet's margin, semi-hard mining and collapse (ledger unit 254 now owned there; one unit added).

## 2026-10-26: owner of each loss and of what the logit gradient means
Khalid's decision: Probability owns maximum likelihood as the recipe; this page owns each loss and its behaviour, including what prediction minus target in the logit means; Calculus owns the derivation steps. Absorbed from Calculus section 2: the table of canonical pairings and their logit gradients (identity, sigmoid, softmax with hard and soft targets, Poisson), the generalised-linear-model statement (mean minus target), and squared error on a sigmoid going silent (203 times smaller at z = -6). The regression section's Gaussian NLL derivation is now one sentence and a link to Probability section 7 (ledger unit 17 relabelled owned:). Ledger: 4 units added. Reading 27 to 28 min core.
