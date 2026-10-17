# Latent lab (tab `t-latent`, prefix `lt`)

Parts: `src/parts/31_tab_latent_{a..e}.html` (text, CSS scoped under `#t-latent`) and `src/parts/31_js_lt_*.js` (`0data` generated, `1core` helpers and the step animation, `2walk` section 2, `3space` sections 3 to 5, `4beta` sections 6 and 7, `6sd` sections 8 and 9, `9init` inline numbers and predict buttons).

Pipeline (all scripts take `GM_SCRATCH`, the shared setup folder; Python is the shared venv's, run with `-I` under `nice -n 15`; GPU scripts only while holding the bench lock):

| script | device | what it writes |
|---|---|---|
| `train_lt.py <runs>` | MPS | `runs/<run>.json` and `.jsonl` (summary and loss log), checkpoints in `GM_SCRATCH/ckpt/lt_*.pt` |
| `vq.py` | | the tiny VQ-VAE (shared ConvAE plus a 128-entry codebook) and its loss, with optional dead-code restart |
| `eval_lt.py` | CPU | `out/tiny.json` (reconstruction, KL, active units, random-code FD, codebook usage, codes of the 16 test images), images to `GM_SCRATCH/lt/tiny.npz` |
| `sd_vae.py` | MPS | `out/sd_vae.json`: the 16 colour test images through the SD 1.5 VAE (fp32 and fp16), latent statistics, decode-side mistakes, forward noising in scaled and raw units |
| `sd_scale.py` | MPS | `out/sd_scale.json`: img2img with three scaling factors, one text-to-image latent decoded three ways |
| `perc_demo.py` | CPU | `out/perc.json`: PSNR-matched blur against the SD reconstruction (SSIM, Inception feature distance) |
| `make_data.py` | CPU | `assets/` (every embedded image, small) and `../parts/31_js_lt_0data.js` |
| `check_latent.mjs` | | puppeteer check of every control at 390 px dark and 920 px light |
| `check_data.py` | | confirms the data part embeds exactly the recorded outputs |

The data part is committed, so `src/build.sh` rebuilds the page without the scratch folder; rerunning the pipeline needs the shared setup (root `src/data/README.md`).

Departures from the topic-page method: this is a lab tab on a root page, so it goes deeper than the root's Reading tab (which links here) but leaves derivations to the Math page and the child page Autoencoders and VAEs (being built). Sources and file:line references: `sources.md`. Visual ideas built and rejected: `viz_ideas.md`.
