# Diffusion lab (tab `t-diff`, parts `32_*`, prefix `df`)

Diffusion from zero on the running example, then the same experiments on Stable Diffusion v1.5. Everything on the tab comes from the scripts here and their recorded outputs in `out/`.

| file | what | runs on |
|---|---|---|
| `train_ddpm.py` | trains the tiny class-conditional DDPM (`--pred eps` or `--pred v`), 4,000 steps; per-timestep validation error; checkpoint to `GM_SCRATCH/ckpt/df_ddpm_<pred>_4000.pt` (weights, EMA weights, config) | MPS, bench lock |
| `samplers.py` | hand-written DDIM and DDPM (shown on the page), CFG in diffusers' convention, a wrapper for any diffusers scheduler | imported |
| `sample_tiny.py` | samplers x steps (1 to 1,000), guidance sweep, trajectories, timing, the DDIM-vs-diffusers check, the v-model and the prediction-type mismatch | MPS, bench lock |
| `sd_lab.py` | SD v1.5: piece timings, steps per sampler (DPM-Solver++, DDIM leading and trailing), guidance 0 to 20, a text prompt | MPS, bench lock |
| `rethumb_sd.py` | re-encodes the SD thumbnails at 160 px, WebP quality 50, for the page's size budget (full-size PNGs stay outside the repo; full resolution belongs on the child page) | CPU |
| `make_page_data.py` | builds `parts/32_js_df_0data.js` and `out/page_data.json` from `out/` (CPU; also scores 1,000 real validation images) | CPU |
| `notes.json` | sentences written after reading the results, inserted into the page with the data | |
| `check_data.py` | the page embeds exactly `out/page_data.json`; facts match the raw outputs; every fact key used exists | CPU |
| `check_page.mjs` | puppeteer: every control at 390 px dark and 920 px light; errors, NaN, sideways scroll, overflow; reading time | |

Size: the page shows every 2nd frame of the 20-step trajectory and every 5th of the 50-step one, three images per frame, at 16 grey levels (about 255 KB of data in all).

Run order (each GPU step in its own process under the bench lock): `train_ddpm.py --pred eps`, `train_ddpm.py --pred v`, `sample_tiny.py --pred eps`, `sd_lab.py`, `sample_tiny.py --pred v`, then `make_page_data.py`, `sh ../build.sh`, `python3 check_data.py`, `node check_page.mjs <dir>`.

Recipe shared with the Flow lab for its equal-step comparison: TinyUNet default (1,040,353 parameters), batch 128, AdamW lr 5e-4, 200 warm-up steps, clip 1.0, EMA 0.999, label dropout 10%, seed 0, float32, 4,000 steps; the DDPM uses linear betas 1e-4 to 0.02 over T = 1000.

Shape: a lab tab on the root, so it teaches the mechanism once with measured before/after visuals and links the derivations (Math page sections 12 to 17, DDPM paper page) instead of repeating them. Visual ideas built and rejected: `viz_ideas.md`.
