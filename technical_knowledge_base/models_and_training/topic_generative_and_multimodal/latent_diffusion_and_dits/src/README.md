# Latent diffusion and diffusion transformers: source

`sh build.sh` writes `../index.html` (one self-contained page; child 4 of Topic: generative-and-multimodal). Then, from the repo root, `sh html_utils/checkpage.sh <page folder>`; here, `node check_page.mjs <shots dir>` (every control at 390 px dark and 920 px light) and `python3 -I check_data.py` (the page embeds exactly the recorded data, prose numbers match it, every line-anchored code link matches `inputs/source_lines.json`).

## Tabs

| Tab | id | What |
|---|---|---|
| Reading | `t-read` | 0 one screen; 1 why latents (counted latent vs pixel pass); 2 the U-Net from SD 1.5's config (U-Net vs DiT animation on the same latent; parameters vs FLOPs vs measured time); 3 text conditioning (real tokens, truncation warning, encoder checks, cross-attention maps, seven pipelines' text sides); 4 DiT (adaLN-Zero code, Table 4 conditioning and scaling with the Gflops column reproduced, the tiny DiT vs U-Net runs, adaLN-single, linear attention); 5 MMDiT (attention patterns, the SD3 position-table finding); 6 double and single stream (parameter shares of eleven denoisers, guidance embedder); 7 positions (sin-cos, cropped table, 2-D/3-D RoPE ids); 8 resolution (SD 1.5 at four sizes; bucketing, micro-conditioning, shift); 9 cost (table at 1024, measured time vs FLOPs, profile); mistakes; interview; what transfers |
| Architecture explorer | `t-ldarch` | two denoisers side by side, all eleven in a table at 512 / 1024 / 2048 |
| Cross-attention viewer | `t-ldxa` | SD 1.5 cross-attention, four prompts, every token, seven steps over the predicted image; mass per token; red vs blue |
| Tokens and FLOPs calculator | `t-ldcalc` | any model, size, text length, steps, passes; chart of all eleven |
| Further reading | `t-more` | |

Prefix `ld` (ids, classes `ldp`, `ld-*`, data attributes `data-ld`); tab storage key `ld-tab`.

## Files

- `parts/`: `01_head.html`, `05z_errbox.js.html` (from the root), `21_js_rd_common.js` (the sibling Autoencoders and VAEs page's generalised copy of the root's helpers), `99_js_tabs.js` (key `ld-tab`); `10_header.html`; Reading `20_read_a.html` (CSS) to `20_read_h.html`, `20_read_z.html` (closes the tab); tabs `31_*`, `32_*`, `33_*`, `39_tab_more.html`; JS `22_js_ld_0data.js` (generated), `23_js_ld_util.js` (formatting, the FLOPs formula, data-ld filling, predict cards, map overlay), `24_` to `26_js_ld_read*.js` (Reading widgets), `31_`, `32_`, `33_js_*.js` (tabs).
- `make_data.py`: builds `parts/22_js_ld_0data.js` from `out/` and `inputs/` (run with the shared venv's Python: it reads the `.npz` maps with numpy).
- `arch/`: `configs.py` (where each config comes from; FLUX.1 from BFL's public util.py, SD3 from the paper's depth rule, both checked against the Hub API's public totals), `params.py` (parameters by kind of layer on the meta device: `out/arch.json`), `params_build.py`, `fwd_meta.py` (one pass on meta tensors under FlopCounterMode), `flops_all.py` (grid of sizes and text lengths, exact quadratic fit: `out/flops.json`), `extras.py` (per-stage FLOPs of SD 1.5 and DiT-XL/2, DiT Table 4 recount, FLUX.1 [schnell], pipeline defaults: `out/extras.json`), `demo_meta.py` (the code shown in section 2; output `out/demo_meta.txt`). CPU only, seconds each: `GM_SCRATCH=... DIT_SRC=$GM_SCRATCH/src/DiT nice -n 15 $GM_SCRATCH/venv/bin/python -I params.py` (and the others).
- `sd/`: `text_enc.py` (CPU: tokens, truncation warning, causal-encoder checks: `out/text_enc.json`), `sd_ld.py` (GPU, one process: profile, size sweep, cross-attention recording, sizes 256 to 1024: `out/sd_ld.json`, `out/xattn_*.npz`, thumbnails `out/sd/`), `run_sd.sh` (bench lock, guard).
- `tiny/`: `flops.py` (`out_flops.json`: FLOPs per pass of TinyUNet and TinyDiT at patch 8, 4, 2), `train_dit.py` (the Flow lab's recipe with TinyDiT; checkpoints `GM_SCRATCH/ckpt/ld_dit_*.pt`; `out/train_dit_*.json`), `sample_dit.py` (the Flow lab's Euler sampler and scoring: `out/tiny_scores.json`, `out/tiny_strips.npz`), `run_tiny.sh` (the queue under the bench lock).
- `sources/find_lines.py`: locates every quoted source line by pattern (asserts one match) into `inputs/source_lines.json`.
- `inputs/`: `published.json` (paper numbers used: DiT Table 4, PixArt, SD3, SDXL, cards), `source_lines.json`, `cfg_flux2_klein_4b_transformer.json`, `cfg_dit_xl2_256_transformer.json`, `dit_size_error.txt` (the real error quoted in Mistakes). Other configs are read from the root's `src/map/inputs/`.
- `check_page.mjs`, `check_data.py`; `facts.md` (verified facts, also in the topic's shared FACTS file under "ld"); `sources.md`; `viz_ideas.md`; `coverage.md`.

## Runs (measured on Apple M1 Pro, 2026-10-17)

- Tiny models (MPS, float32, under the bench lock): TinyDiT p4 6,473 steps (checkpoint at 4,000), p8 and p2 4,000, p4 without zero init 4,000; the TinyUNet is the Flow lab's `fw_fm_4000` (rescored here, identical to its recorded FD 48.86 and 23.75).
- SD 1.5 float16 with attention slicing (one process): profile, size sweep 256 to 1024, four 25-step generations with cross-attention recorded, the puppy prompt at 256, 512, 768, 1024.
- Everything else (parameters, FLOPs, text encoder) on CPU, no weights for anything but SD 1.5.
- Memory: the SD 1.5 run peaked at 9,633 MiB of MPS driver memory during the 768 and 1024 generations (sliced attention at 128 x 128 latent plus tiled VAE decode); its in-script guard read memory after freeing the cache and missed it. TinyDiT p2 peaked at 6,357 MiB. Both runs predate the lead's PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 rule; the run scripts now set it, release the bench lock between runs, and check memory before freeing the cache.

## Departures from the method

- No old page to cover (new page; Notion disconnected): `coverage.md` lists the brief's requirements and where each is.
- Many counts for gated or very large models (SD3, FLUX.1, Qwen-Image 20B) come from instantiating configs on the meta device instead of running them; each count is checked against a public total, and the page says so.
- Page size about 0.7 MB (images of the cross-attention runs as WebP data URIs and 8-bit maps), over the 300 KB guideline of the time (retired 2026-10-17) and under the topic's 1 MB limit.
