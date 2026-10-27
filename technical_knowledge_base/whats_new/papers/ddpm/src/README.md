# DDPM paper page: source

`sh build.sh` writes `../index.html` (runs `recompute.py` and `mk_paper.py` first). Then `sh html_utils/checkpage.sh <folder>` and `node src/check_page.mjs` from the repo root, and `python3 mk_coverage.py` (53 of 53 facts of `live.md` verified).

## Files
- `live.md`: the Notion row page as fetched 2026-09-20 (save_live.py). `inputs/`: arXiv HTML v2 text and tables (extract_paper.py), later papers' abstracts and table extracts, `recompute.json`.
- `paper.json`, `tables.json` (Tables 1 to 4 as printed), `recompute.py` (every derived number, 10 of 10 checks), `mk_paper.py` (card, Further reading, data).
- Toy models: `toy.py` (data, schedule, MLP, Eq. 4, 7, 11, 13, bound), `train.py` (four Table 2 variants; `eval`; `export`), `export.py` (8-bit weights to `parts/20_model_data.js`, quantisation cost), `rd.py` (rate and distortion as Figure 5), `check_forward.py` + `check_forward.mjs` (JS against NumPy float64 and PyTorch). Logs and reports in `model/`.
  Rerun: `OMP_NUM_THREADS=2 STEPS=300000 uv run --with torch --with numpy python train.py <variant>` (one variant per run, in the background; about 20 to 40 minutes each), then `train.py eval`, `export.py 8`, `rd.py`, `check_forward.py`, `node check_forward.mjs`, `python3 recompute.py`.
- `parts/`: HTML and JS parts; `13_js_read.js` (background sampler, forward process, the forward/reverse animation, predict reveals), `22_js_model.js` (the DDPM in JS), `23_js_run.js` (Sample tab), `24_js_tables.js`, `25_js_then.js`.

## Departures from .claude/skills/explainer-page/page-kinds/paper.md
- No "What it takes to use this": a 2020 classic whose recipe is standard; Then and now covers what replaced each part.
- The live ingredient is a training-recipe ablation more than an architecture: four toy models that differ only in parameterisation and objective (Table 2), not a model with a component removed. All four run live (1,000 real network evaluations per sample) because the sampling chain itself is the mechanism.
- Weights are 8-bit, not 6-bit: at 6 bits the mu-predicting models broke down entirely (bound 7.9 to 16.9 bits/dim); 8-bit costs the eps model 0.005 bits/dim. Weights take 90 KB.
- Then and now is a recipe card that changes line by line (13 steps), not an architecture morph.
- Reading time is 18 minutes by the build's count (old page: 9); equations inflate the word count, and the network/recipe/cost list, progressive generation, autoregression, interpolation and NCSN comparison are folded into details blocks.

## The 2026-10-24 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence and a hero: the paper's Figure 2 (forward q, reverse p_theta) redrawn on the toy's Swiss roll, five panels (x_T, x_500, x_250, x_100, x_0) on one scale, computed from Eq. 4 with one seeded noise draw (`16_js_hero.js`, static). The paper is not CC BY (arXiv non-exclusive licence), so no figure of it is embedded; no openly licensed image teaches more than the live samples. Then "You need" (the ELBO, on the variational inference maths page) and the new terms.
- **The score field moved inline** into "Why this is score matching", the claim it proves. The Sample tab stays a tab: it is a lab with four variants that the Idea, ablation, progressive coding and evidence sections all use.
- **No autoplay**: `11_js_ui.js` is the patched copy (as on ZeRO, Megatron-LM and T5), so the forward/reverse animation and the Then and now card wait on their first step; the Sample tab no longer starts sampling when it opens (the reader presses Sample). `90_js_tabs.js` replaced by the template `99_js_tabs.js` (storage key `ddpm-tab`). `check_page.mjs` now fails if `dfx` or `thx` moves before a click or the sampler starts by itself, and opens every closed block.
- **Owned elsewhere, linked with a sentence kept**: schedules and SNR, prediction targets and loss weighting, samplers and guidance (Diffusion from zero); the ELBO derivation (variational inference maths page); FID (Evaluating generative models); the U-Net and DiT (Latent diffusion and DiTs); flow matching and rectified flow (Flow matching). The paper's own equations, ablation and weighting chart stay here.
- **Closed**: in the Sample tab, the training curves and the JS-against-PyTorch check; in the tables tab, the check table. The existing closed blocks (L_T recomputed, network and recipe, progressive generation and NCSN) keep their content. No volatile follow-up news was found to move.
- Header: "Reading: 21 min, plus 3 in closed details.", read by `build.sh` from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 18.7 min | 20.8 min |
| The paper, closed | 3.3 min | 3.4 min |
| Sample from a toy DDPM | 4.9 min | 3.2 min, plus 1.0 closed |
| The paper's tables, rebuilt | 3.8 min | 3.0 min, plus 0.9 closed |
| Then and now, Further reading | 2.8 min | 2.8 min |
| Visuals in Reading (audit) | 3 | 5 |

Why about 21 minutes is right: the two added minutes are the core sentence, the hero, the new terms and the score field with its caption, which a reader needs before the equations; everything else open is the paper's argument in its order (forward process, bound, ε-parameterisation, L_simple, algorithms, results, the ablation, progressive coding, evidence, what followed). Derivations, recipe and provenance were already closed; the equations inflate the word count.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
231 units: core 200, depth 23, owned 6, fat 2. 221 drafted by `ledger.py init`; 10 added (core sentence, hero, new terms, six owner links, the script-drawn check table). `ledger.py check`: problems 0.

## Checks (24 October 2026)
`checkpage.sh`: tabs 5, 278 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 288 actions, 0 problems (including no movement before a click). `check_forward.mjs`: JS against NumPy within 7e-16, Gaussian stream identical. `mk_coverage.py`: 53 of 53 (the reading-time key updated).
