# Latent diffusion and diffusion transformers: source

`sh build.sh` writes `../index.html` (one self-contained page; child 4 of Topic: generative-and-multimodal). Then, from the repo root, `sh html_utils/checkpage.sh <page folder>`; here, `node check_page.mjs <shots dir>` (every control at 390 px dark and 920 px light) and `python3 -I check_data.py` (the page embeds exactly the recorded data, prose numbers match it, every line-anchored code link matches `inputs/source_lines.json`).

## Tabs (rebuilt 2026-10-24 to the teaching contract)

| Tab | id | What |
|---|---|---|
| Reading | `t-read` | top: core sentence, hero (SD 1.5's three networks, 50 denoiser passes, time split), You need, new terms, the six designs on one screen; 1 why latents; 2 the U-Net from SD 1.5's config (U-Net vs DiT stepper on the same latent; parameters vs FLOPs vs time); 3 text in (tokens, encoder checks, the cross-attention viewer moved here from its tab, encoders table); 4 DiT (the paper's Figure 3, adaLN-Zero code, Table 4 bars, Gflops vs FID, tiny runs closed); 5 MMDiT; 6 double and single stream; 7 positions; 8 resolution; 9 cost; 10 few steps: distillation (new: teacher vs student passes toggle, methods, closed table of seven methods); Depth: mistakes, rehearsal, what transfers (all closed) |
| Architecture explorer | `t-ldarch` | two denoisers side by side, all eleven in a table at 512 / 1024 / 2048 |
| Tokens and FLOPs calculator | `t-ldcalc` | any model, size, text length, steps, passes; chart of all eleven |
| Further reading | `t-more` | |

Prefix `ld` (ids, classes `ldp`, `ld-*`, data attributes `data-ld`); tab storage key `ld-tab`. Image: `../img/dit_block_fig3.webp` (DiT Figure 3, CC BY 4.0, `img/CREDITS.md`).

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (price = FLOPs per pass x passes per image; every design changes one factor or how text reaches the image), a new static hero (`23_js_ld_zhero.js`), You need (Diffusion from zero sections 4 to 6, Flow matching, Autoencoders and VAEs section 11 for the scaling factor, instead of redrawing it), new terms. The long "Where this page starts" box and the running-example paragraph became one link paragraph and a closed provenance block.
- **Cross-attention viewer tab moved inline** into section 3 (`24_js_ld_xa.js`, was `32_js_ldxa.js` + `32_tab_ldxa.html`): it explains one mechanism, so it sits beside the claim; the small four-prompt map grid it duplicated was removed.
- **New section 10, few-step distillation** (this page owns it per the brief): a toggle of passes per image, teacher vs student, for SD 1.5 / LCM-LoRA, SDXL / SDXL-Turbo, SD3 / SD3-Turbo, FLUX.1 [dev] / [schnell] (`27_js_ld_distil.js`, sources: model cards and LADD read 2026-10-24); the method families; the seven-method table absorbed from Diffusion from zero section 7 in a closed block. Its measured LCM-LoRA run stays there and is quoted and linked.
- **Real image**: DiT's Figure 3 (CC BY 4.0, from the arXiv source) beside adaLN-Zero.
- **Closed**: the tiny DiT experiment (one-paragraph result stays core), DiT's two critical-reading results, the SD3 position-table finding, the drop-rate discrepancy, PixArt's 27% reconciliation, pooled-vector and padding checks, the code blocks, mistakes (one block), interview rehearsal (one block), what transfers.
- **No autoplay**: `21_js_rd_common.js` lost its play-on-first-view code (it keeps the per-tab `onRender`/`onResize` this page uses), the U-Net/DiT mode switch no longer calls `play()`; `99_js_tabs.js` is the skill template (key `ld-tab`). Checked with normal and reduced motion: nothing plays until pressed.
- `check_page.mjs` no longer visits `t-ldxa`.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading core (230 wpm, `audit_pages.mjs`) | 35 min | 32 min |
| Reading closed details | 6 min | 15 min |
| Other tabs (excluding Further reading) | 11 min (explorer 2.9, viewer 1.7, calculator 1.9, further reading 4.1) | explorer 2.9, calculator 1.9 |
| Visuals drawn in Reading | 6 | 15 |

Why 32 minutes is right: the page owns ten mechanisms (latents, U-Net, text encoders, cross-attention, DiT and adaLN-Zero, MMDiT, double/single stream, image positions, resolution handling, distillation), and it absorbed two units of work: the cross-attention viewer (its own tab before) and few-step distillation (new section). Measured evidence, reconciliations, code, mistakes and rehearsal moved to closed blocks, which is why closed time grew. About a fifth of the core words are captions and notes of the 15 visuals.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
347 units: core 245, depth 94, fat 8 (wind-ups, a removed-tab pointer, the old reading-time line). 329 drafted by `ledger.py init`, keys chosen automatically as the longest unique word run still on the page and reviewed by hand; 18 added by hand (script-rendered tables, the hero and figure, units absorbed from Diffusion from zero section 7, the new distillation sources).

## Files

- `parts/`: `01_head.html`, `05z_errbox.js.html` (from the root), `21_js_rd_common.js` (the generalised copy with per-tab `onRender`, autoplay removed 2026-10-24), `99_js_tabs.js` (skill template, key `ld-tab`); `10_header.html`; Reading `20_read_a.html` (CSS) to `20_read_h.html`, `20_read_z.html` (closes the tab); tabs `31_*`, `33_*`, `39_tab_more.html`; JS `22_js_ld_0data.js` (generated), `23_js_ld_util.js` (formatting, the FLOPs formula, data-ld filling, predict cards, map overlay), `23_js_ld_zhero.js` (hero), `24_` to `26_js_ld_read*.js` and `24_js_ld_xa.js` (Reading widgets, the cross-attention viewer), `27_js_ld_distil.js` (section 10), `31_`, `33_js_*.js` (tabs).
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
