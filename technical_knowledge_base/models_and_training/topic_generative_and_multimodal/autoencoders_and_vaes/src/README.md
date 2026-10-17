# Autoencoders and VAEs: latents and image tokenizers (child page, prefix `av`)

Child 1 of Topic: generative-and-multimodal. `build.sh` writes `../index.html` from `parts/`; the data part `parts/22_js_av_0data.js` is generated and committed, so the page rebuilds without the scratch folder.

## Tabs and parts
| tab | id | parts |
|---|---|---|
| Reading | `t-read` | `20_read_a.html` (style and wrapper) to `20_read_h.html`; `23_js_av_read.js` fills every measured number from `AVD` |
| Tokenizer comparator | `t-avtok` | `31_tab_avtok.html`, `31_js_avtok.js` |
| Quantizer playground | `t-avq` | `32_tab_avq.html`, `32_js_avq_1toy.js` (2-D toy, computed in the page), `32_js_avq_2main.js` |
| Posterior collapse | `t-avpc` | `33_tab_avpc.html`, `33_js_avpc.js` |
| Further reading | `t-more` | `39_tab_more.html` |

`21_js_rd_common.js`, `01_head.html`, `05z_errbox.js.html` and `99_js_tabs.js` are copied from the root page (`RD.anim`, `RD.onRender` and `RD.onResize` take a tab id here; storage key `av-tab`). All CSS is scoped under `.avp` (every tab carries the class).

## Pipeline (shared venv and data of the root page: root `src/data/README.md`)
Python is `$GM_SCRATCH/venv/bin/python -I` under `nice -n 15`, 4 threads; GPU (MPS) steps only while holding the shared bench lock.

| script | device | writes |
|---|---|---|
| `train_av.py <runs>` | MPS | `runs/<run>.json(l)`; checkpoints in `$GM_SCRATCH/av/ckpt/` |
| `quant/quantizers.py` | | VQ (plain, restart, EMA, L2), FSQ (ported from the paper's appendix A.1), LFQ (MAGVIT-v2 eq. 3 to 5), on the topic's `ConvAE` |
| `quant/eval_quant.py` | CPU | `out/quant.json` (also re-scores the root Latent lab's `vq_plain` and `vq_restart`) |
| `elbo/eval_elbo.py` | CPU | `out/elbo.json` (the loss-units runs `e_*`) |
| `collapse/pixelvae.py`, `collapse/eval_collapse.py` | CPU | `out/collapse.json` (PixelCNN-decoder VAE: plain, annealed, free bits, no code) |
| `tok/roundtrip.py <key> [dtype]` | MPS | `out/tok/<key>_<dtype>.json`, reconstructions in `$GM_SCRATCH/av/tok/` |
| `tok/metrics.py` | CPU | `out/tok/metrics.json` (PSNR, SSIM, LPIPS) |
| `make_data.py` | CPU | `parts/22_js_av_0data.js` |
| `check_data.py`, `check_page.mjs` | | data match and every control at 390 px dark and 920 px light |

Departure from the child-page method: the Reading tab's numbers are bound to the recorded data by `data-av` attributes rather than typed, so the prose cannot drift from the runs; `check_data.py` confirms the embedding. Sources and file:line references: `sources.md`; visual ideas: `viz_ideas.md`; old page comparison: `coverage.md`.
