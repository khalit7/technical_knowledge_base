# Flow lab (tab `t-flow`, parts `33_*`, prefix `fw`)

Flow matching and rectified flow from zero: a 2-D toy the page runs live, then the Diffusion lab's tiny U-Net trained with the flow-matching objective under the same recipe, compared with the Diffusion lab's DDPM at equal network evaluations. Everything on the tab comes from the scripts here and their recorded outputs in `out/`.

| file | what | runs on |
|---|---|---|
| `toy2d.py` | four 2-D MLP fields (random-pair flow matching, minibatch-OT pairs, reflow, a DDPM sampled by DDIM) on a ring of 8 Gaussians; int8 weights for the page; scores every model x solver x steps with the dequantised weights | CPU, about 4 minutes |
| `toy_extra.py` | the toy with Heun whose last step is Euler (EDM's rule); checks the stored networks reproduce a stored score | CPU, seconds |
| `train_fm.py` | trains the flow-matching TinyUNet (4,000 steps), or `--reflow` (2,000 steps from it on the reflow pairs); per-t validation loss; checkpoints to `GM_SCRATCH/ckpt/fw_*.pt` | MPS, bench lock |
| `fm_samplers.py` | hand-written Euler, Heun, midpoint and Heun-with-last-step-Euler (shown on the page), time shift, CFG in diffusers' convention | imported |
| `sample_fm.py` | solvers x steps, integration error, straightness, trajectories (and the Diffusion lab's DDIM on the same noise), guidance, time shift, two convention bugs | MPS, bench lock |
| `make_pairs.py` | 30,000 (noise, sample) pairs for reflow (`GM_SCRATCH/flow/reflow_pairs.npz`, not committed) | MPS, bench lock |
| `sample_extra.py` | follow-up: Heun with the last step as Euler; integration error against a midpoint reference; what the net returns at t = 1 | MPS, bench lock |
| `make_page_data.py` | builds `parts/33_js_fw_0data.js` and `out/page_data.json` (sprite sheet, tables, facts used in the prose, code shown) and `out/read_numbers.json` for the Reading tab | CPU |
| `check_data.py` | the page embeds exactly `out/page_data.json`; every fact used in the HTML exists; code shown equals the source; key numbers match the raw outputs | CPU |
| `check_page.mjs` | puppeteer: every control at 390 px dark and 920 px light; errors, NaN, undefined, sideways scroll; reading time | |

Run order (each GPU step its own process under the bench lock): `toy2d.py`, `toy_extra.py` (CPU); `train_fm.py --steps 4000`, `sample_fm.py --name fm_4000`, `make_pairs.py`, `train_fm.py --reflow --steps 2000`, `sample_fm.py --name reflow_2000`, `sample_extra.py`; then `make_page_data.py`, `sh ../build.sh`, `python3 check_data.py`, `node check_page.mjs <dir>`.

Recipe (shared with the Diffusion lab): TinyUNet default (1,040,353 parameters), batch 128, AdamW 5e-4, 200 warm-up steps, clip 1.0, EMA 0.999, label dropout 10%, seed 0, float32, 4,000 steps; only the objective differs (`objectives.cfm_loss`, t = 0 noise, t = 1 data). Scores: `fid.fd_fmnist` on 1,000 samples (100 per class) from noise seed 11, the Diffusion lab's.

Shape: a lab tab on the root, like the Diffusion lab: the mechanism taught once with measured before/after visuals, derivations linked to the Math page (section 18 owns the flow-matching maths). Visual ideas built and rejected: `viz_ideas.md`. Verified facts: `facts.md`.
