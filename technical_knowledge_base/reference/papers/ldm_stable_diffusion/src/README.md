# Latent Diffusion Models (Stable Diffusion) paper page: source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81bb98adc0daf8462cb6, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Then `sh html_utils/checkpage.sh <folder>` and `node <folder>/src/check_page.mjs` from the repo root, and `python3 mk_coverage.py` here.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card, then Problem, Idea (the two-chain animation, predict 1), Stage 1 (autoencoder explorer, latent rescaling), Stage 2, Conditioning (Figure 3 redrawn, predict 2), How much compression (Tables 8, 13, 14 chart), Results (predict 3), Limitations, How much to believe, Why it matters, Connections. |
| Generate in latent space | `t-run` | The two toy models live: prompt, guidance, steps, samples, seed; graded samples; cross-attention maps; measured results, training curves, honesty box. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 to 11 and 18 as printed (sortable, bold kept, derived columns) and 18 checks of the paper's numbers. |
| Then and now | `t-then` | The recipe card from LDM to SD v1, SD 2, DiT, SDXL, SVD, Sora, SD3, FLUX.1. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Files
- `live.md`: the Notion row page as fetched 2026-09-20 (`save_live.py`). `inputs/`: arXiv HTML v2 text and tables (`extract_paper.py`), `tables_parsed.json` (`parse_tables.py`, with bold flags), `code/` (CompVis configs, the beta schedule, the SD README extract, licences), `later_extracts.txt` (GLIDE, DiT, SDXL, SD3, FLUX, Sora and abstracts), `recompute.json`.
- `paper.json`, `tables.json` (`mk_tables.py`), `recompute.py` (every derived number and the 18 checks), `mk_paper.py` (card, Further reading, data; `where_label` extended for appendix anchors).
- Toy: `toy.py` (data, checker, autoencoder, UNet with cross-attention, τθ, schedule, DDIM), `train.py` (`ae <f>`, `dm <name>`, `eval`), `run_all.sh` (the whole training queue), `export.py` (per-row quantised weights to `parts/20_model_data.js`, quantisation report), `check_forward.py` + `check_forward.mjs` (JS against PyTorch on the shipped weights). Logs, reports and checkpoints in `model/` (`model/old_c16/`: the first, too narrow autoencoder, kept for the record).
  Rerun, in the background: `AES=4 DMS="f4 pix" AE_STEPS=5000 DM_STEPS=7000 sh run_all.sh` (about 12 minutes for the autoencoder, 4 for the latent model, 15 for the pixel model at 2 threads), then `sh run_long.sh` (the f = 4 model again for 28,000 steps, about the pixel model's training time, 14 minutes; then `train.py eval`, about 10 minutes), then `SHIP_AE=4 ... export.py 8`, `SHIP_AE=4 ... check_forward.py 8` (writes `model/check_ref.json`, 1.2 MB, not kept), `node check_forward.mjs`, `python3 recompute.py`, `sh build.sh`. Prefix each Python step with `OMP_NUM_THREADS=2 uv run --with torch --with numpy python`.
  `model/` keeps the four float checkpoints (`ae4`, `dm_f4`, `dm_pix`, `dm_f4long`: export, check and eval load them), their logs, `eval_report.json`, `quant_report8.json` and `quant_report6.json`, `check_forward.json`; about 1 MB.
- `parts/`: `13_js_read.js` (shared image helpers, the animation, explorer, Figure 3, f sweep, predict reveals), `22_js_model.js` (the toy in JS and the checker), `23_js_run.js`, `24_js_tables.js`, `25_js_then.js`; the rest copied from the DDPM page.

## Departures from html_utils/methods/papers.md
- The live ingredient is a **two-stage toy**: an autoencoder trained first, then diffusion models in its latent and in pixel space with matched parameters and steps, because the paper's claim is a comparison of spaces, not a component ablation. DDPM's own mechanism is not rebuilt; the DDPM page runs it and is linked.
- Samples are graded by a **deterministic checker** on a synthetic domain (shape, colour, position read from the pixels), in place of FID, which a toy cannot compute meaningfully.
- No "What it takes to use this": the recipe is the standard one of every open image model; Then and now and a short note in "How much to believe" (code, licences) cover adoption.
- Figures 6 and 7 are not rebuilt (images only); the f sweep uses the printed Tables 8, 13 and 14.
- Weights are 8-bit, not the reference's 6-bit: at 6 bits the latent model's held-out score fell from 52% to 42% (`model/quant_report6.json`), at 8 bits it moved from 52% to 54% (`quant_report8.json`). The page is therefore about 381 KB, over the 300 KB guideline: the three shipped networks have 130,639 weights (197 KB as 8-bit base64); 6-bit would save 44 KB at that quality cost.
- The fixed-compute row (`dm_f4long`, 28,000 steps in about the pixel model's training time, as the paper's Figure 17 compares at fixed V100-days) is measured and shown in the Generate tab's results table and curve, but not shipped, to keep the page size down.

## Toy results (model/eval_report.json; 50 DDIM steps, held-out = the 12 prompt combinations never trained on, 8 samples each)

| Model | Steps | Held-out, s = 1 | Held-out, s = 3 | Seen, s = 3 | Python s/image (s = 3) |
|---|---|---|---|---|---|
| Latent, f = 4 | 7,000 | 22% | 46% | 46% | 0.011 |
| Pixel space | 7,000 | 3% | 8% | 3% | 0.041 |
| Latent, f = 4, fixed compute | 28,000 | 80% | 90% | 90% | 0.011 |

The checker scores 99.7% on 1,000 real images; the f = 4 autoencoder reconstructs at 31.6 dB PSNR and keeps the checker's verdict on 91.8% of test images. JS against PyTorch on the shipped weights: every network output within 3.1e-5, the 20-step guided chains end within 3.1e-5 with the same checker verdict. Single run, one seed per model.

## Checks (3 October 2026)
`sh html_utils/checkpage.sh <folder>`: 5 tabs, 381 KB, emdash 0, errbox 1, clipped 0, fail=0. `node <folder>/src/check_page.mjs`: 306 actions, 0 problems. `python3 mk_coverage.py`: 58 of 58 items verified. `recompute.py`: 18 checks of the paper's numbers, 9 hold, 9 flagged (the inconsistencies the page reports). `check_forward.mjs`: PASS within 3.1e-5.
