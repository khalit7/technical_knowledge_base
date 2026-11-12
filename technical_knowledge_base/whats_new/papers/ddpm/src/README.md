# DDPM paper page: source

`sh build.sh` writes `../index.html` (runs `recompute.py` and `mk_paper.py` first). Then `sh html_utils/checkpage.sh <folder>` and `node src/check_page.mjs` from the repo root, and `python3 mk_coverage.py` (53 of 53 facts of `live.md` verified).

## Files
- `live.md`: the Notion row page as fetched 2026-09-20 (save_live.py). `inputs/`: arXiv HTML v2 text and tables (extract_paper.py), later papers' abstracts and table extracts, `recompute.json`.
- `paper.json`, `tables.json` (Tables 1 to 4 as printed), `recompute.py` (every derived number, 10 of 10 checks), `mk_paper.py` (card, Further reading, data).
- Toy models: `toy.py` (data, schedule, MLP, Eq. 4, 7, 11, 13, bound), `train.py` (four Table 2 variants; `eval`; `export`), `export.py` (8-bit weights to `parts/20_model_data.js`, quantisation cost), `rd.py` (rate and distortion as Figure 5), `check_forward.py` + `check_forward.mjs` (JS against NumPy float64 and PyTorch). Logs and reports in `model/`.
  Rerun: `OMP_NUM_THREADS=2 STEPS=300000 uv run --with torch --with numpy python train.py <variant>` (one variant per run, in the background; about 20 to 40 minutes each), then `train.py eval`, `export.py 8`, `rd.py`, `check_forward.py`, `node check_forward.mjs`, `python3 recompute.py`.
- `parts/`: HTML and JS parts; `13_js_read.js` (background sampler, forward process, the forward/reverse animation, predict reveals), `22_js_model.js` (the DDPM in JS), `23_js_run.js` (Sample tab), `24_js_tables.js`, `25_js_then.js`; since 2026-11-12 `02_split.html` and `25_js_s3.js` (templates, unchanged), `31_js_sc_hero.js` and `32_js_sc_score.js` (the two 3D scenes), `11_js_ui.js` (makeAnim with the 2026-11-06 motion rules, as on Chinchilla) and the template `99_js_tabs.js` (storage key `ddpm-tab`). `16_js_hero.js` was removed.
- Checks: `check_page.mjs` (every control), `check_stages.mjs` (stages and animations at three widths and under reduced motion).

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

## The 2026-11-12 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`): every section with a visual is text left, visual right (sticky); sections without one stay full width. Reading: the hero (stage), Idea (the forward/reverse animation card right, its step lists left), the forward process (the schedule and q(x_t | x_0) widget right), Why this is score matching (stage), then the 2-D score widget in a second split. Problem, the reverse process, L_simple (its chart is inside a predict reveal), training and sampling, Results, the ablation and progressive coding (charts inside predict reveals), How much to believe, Why it matters and Connections stay full width. Sample tab: notes left, the sampler card right; the measured table full width. Tables tab: Table 4 beside its Figure 5 chart; the other tables full width. Then and now: the recipe card right, its step list left.
- **Two 3D stages** (renderer v2, `25_js_s3.js` unchanged):
  - `31_js_sc_hero.js`, Fig. 1, replacing the static 2-D hero: the paper's Figure 2 as two stacks of plates along t (0, 100, 250, 500, 1,000). Front stack q: 300 roll points (DM.roll(300, 42)) noised by Eq. 4 with one seeded draw each, exact; streams follow six points through the plates; orange arcs show training's one-jump Eq. 4. Back stack p_theta: the trained eps (L_simple) model's own Algorithm 2 chain (300 points, seed 42, the job the Idea animation shares), with -eps_theta at six points per plate as arrows. Each plate zooms with the noise (the dashed square is [-1, 1]^2). The camera moves close for the data plate and the start of the reverse chain. The last step fills the on-the-roll shares of samples and data from the computed chain.
  - `32_js_sc_score.js`, Fig. 2: q(x_t) for 600 roll points (DM.roll(600, 5)) as a surface on a 57 x 57 grid over [-1.6, 1.6]^2, exact for those points, rescaled per t to one peak height (the absolute peak falls 9-fold from t = 25 to 1,000, written into the step list by the scene); the eps-network's -eps_theta on an 11 x 11 grid lying on the surface (computed live at each t, length capped at |eps| = 2.5); the same reverse chain's points riding the surface as t falls from 1,000 to 25.
- **Kept 2D**: the forward/reverse animation (`dfx`: it compares three chains on one flat plane with counters; a scatter reads best flat), the schedule and q widget, the 2-D score widget (all four models at any t), the weighting chart, the ablation scatters and Figure 5 (curves and scatters inside predict reveals), the Sample tab (a widget whose outcome is the point: no autoplay, no step list), every table and the training curves, and the Then and now recipe card (text).
- **Motion**: `11_js_ui.js` copied from Chinchilla (makeAnim with the RD.anim rules: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, an `ol.sx` per mode). The forward/reverse animation's caption carousel became three eight-item step lists (the reverse chains went from nine frames to eight; the t = 10 caption merged into the last step); Then and now's 13 one-paper frames became seven explained stretches of one or two papers each (the long-replay rule), its captions moved into the list. `check_page.mjs` now asserts both animations play when scrolled into view (it used to forbid it) and still that the Sampler never starts by itself; `check_stages.mjs` (after Chinchilla's, plus animations without a mode toggle) checks every stage and animation at 1400 light, 920 light and 390 dark and under reduced motion.

## Length judgement (2026-11-12)
| | Before | After |
|---|---|---|
| The paper, core | 20.9 min (4,802 words) | 25.9 min (5,949) |
| The paper, closed | 3.4 min | 3.4 min |
| Sample from a toy DDPM | 3.2 + 1.0 closed | 3.5 + 1.0 closed |
| Tables (core + closed) | 3.0 + 0.9 | 3.0 + 0.9 |
| Then and now | 1.3 | 2.7 |
| Visuals in Reading (audit) | 5 | 6 |

The growth is the step lists: the two stages' twelve steps (about 600 words) are new explanation; the Idea animation's 24 items and Then and now's seven stretches are the captions the scripts used to draw, now in the page where the counter sees them (only one of the Idea animation's three lists shows at a time, so a reader of one chain reads about 300 fewer words than the count). Nothing was cut. Header: "Reading: 26 min, plus 3 in closed details." Pages quoting the old 21 minutes need `check_times.py --fix` by the lead.

Ledger: 277 units (core 244, depth 25, owned 6, fat 2). 46 added (the two stages' steps and provenance lines, the three Idea lists, the seven Then and now stretches, the Sample widget note); the hero unit (223) rewritten for the stage; units 20, 33, 198, 200 and 201 re-keyed for reworded sentences (201 now keys on What survived, since its old key was the removed "Play, or step with the arrows" line). `ledger.py check` problems 0.
