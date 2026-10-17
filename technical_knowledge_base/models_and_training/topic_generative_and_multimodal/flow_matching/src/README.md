# Flow matching and rectified flow: sources and build

Child page 3 of Topic: generative-and-multimodal (prefix `fm`, scratch key `fm`). Built 2026-10-17. `sh build.sh` writes `../index.html` from `parts/`.

## Shape
Reading (14 sections: in one screen, the exact marginal field, the perfect model's few-step error, the perfect model copies, paths, couplings, reflow rounds, distillation, timestep sampling and shift, stochastic sampling, solvers and grids, production configs, mistakes, interview, sources), three labs (2-D flow playground, Steps ladder, Timestep explorer) and Further reading. It follows `.claude/skills/explainer-page/page-kinds/topic-child.md`. The root's Flow lab owns the first layer (the objective, Euler/Heun/midpoint, flow against diffusion, one reflow round, conventions, guidance) and is linked by name, not rebuilt; this page reuses its toy networks, image checkpoints and recordings and goes one layer down. The Math page (section 18) owns the derivations.

## Runs (all in `runs/`, outputs in `out/`)
| script | what | where |
|---|---|---|
| `fm_toy.py` | exact marginal field of the ring for three paths; DDIM = Euler check; loss floor; the root network against the exact field; SDE with exact score; reflow rounds 3 and 4; three one-step students; minibatch OT cost and OT-CFM at B = 4, 16, 64; six timestep schemes x 3 seeds x 2 budgets. Writes `out/toy.json` (with int8 weights of the new networks) | CPU, about 7 min |
| `fm_memo.py` | exact empirical field of the Fashion-MNIST training set (class-conditional), sampled from the root's noise; nearest-training-image distances against the root's trained model and held-out images. `out/memo.json`, `out/memo_strips.npz` | CPU, 30 s |
| `fm_ot_images.py` | coupling travel distance on Fashion-MNIST pixels: random, minibatch OT by B, the reflow pairs | CPU, 15 s |
| `fm_sched_demo.py` | diffusers 0.41.0 flow scheduler with FLUX.2 [klein]'s real config: grids, e^mu identity, the missing-mu error | CPU, 1 s |
| `fm_pairs.py` | 30,000 (noise, end point) pairs from a flow checkpoint, midpoint 25 steps (the root's `make_pairs.py` recipe) | MPS, bench lock |
| `fm_train.py` | `--mode reflow` (3-RF from 2-RF) or `--mode distill` (one-step student, t = 0, L2) | MPS, bench lock |
| `fm_score.py` | the root's scoring (FD, accuracy, diversity, 1,000 samples, seed 11) for the new models; re-score of the root's 2-RF; SDE sampling of the root's 1-RF | MPS, bench lock |

Large files (pairs, checkpoints) live in the shared scratch folder under `fm/` and are not committed. Run order: `fm_toy.py`, `fm_memo.py`, `fm_sched_demo.py`; GPU: `fm_pairs.py` (rf2), `fm_train.py` (rf3, rf2d), `fm_pairs.py` (rf1), `fm_train.py` (rf1d), `fm_score.py`; then `fm_ot_images.py` (reads the pairs), `make_page_data.py`, `sh build.sh`, `python3 check_data.py`, `node check_page.mjs`.

## Inputs
`inputs/published.md` (every published quote and number with its source), `inputs/sd3_tables.json` (SD3 Tables 1 and 2), `inputs/scheduler_configs.json` (six scheduler configs read from the Hub at pinned revisions).

## Checks
`check_data.py` (embedded data equals the recordings, facts used exist, code and scheduler output shown equal their sources, literal numbers checked), `check_page.mjs` (every control at 390 px dark and 920 px light). Notes: `viz_ideas.md`, `coverage.md`, `facts.md`.
