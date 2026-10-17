# Latent diffusion and diffusion transformers: visualisation ideas (2026-10-17)

Method: `.claude/skills/explainer-page/visuals/choosing.md`. Scored 1 to 5 on: teaches the mechanism (T), real data (R), cost to build (C, 5 = cheap), not already on the root, siblings or paper pages (N).

## Built

| Idea | T | R | C | N | Where | Data |
|---|---|---|---|---|---|---|
| One latent through SD 1.5's U-Net, then through DiT-XL/2 (before/after on the same 64 x 64 x 4 input), boxes to scale, running parameter and FLOP counters | 5 | 5 | 3 | 5 | Reading section 2 | `out/extras.json` (per-stage FLOPs and parameters on meta tensors) |
| Where parameters vs FLOPs vs time go in SD 1.5 (three views of the same network) | 5 | 5 | 4 | 5 | Reading section 2 | `out/arch.json`, `out/extras.json`, `out/sd_ld.json` (hooked profile) |
| Same U-Net on latents and on pixels (log bars) | 4 | 5 | 5 | 4 | Reading section 1 | the counted quadratic for SD 1.5 |
| Real tokens of a prompt (start, words, end, padding) and the real truncation warning | 4 | 5 | 5 | 5 | Reading section 3 | `out/text_enc.json` |
| Cross-attention maps per word over the output, four prompts | 5 | 5 | 3 | 4 | Reading section 3 (mini) and the Cross-attention viewer tab | `out/sd_ld.json`, `out/xattn_*.npz` |
| DiT conditioning variants as bars (Table 4) | 3 | 4 | 5 | 5 | Reading section 4 | `inputs/published.json` |
| DiT's 12 models, Gflops vs FID, with the Gflops column reproduced by counting the authors' code | 5 | 5 | 4 | 5 | Reading section 4 | `inputs/published.json`, `out/extras.json` |
| Tiny DiT vs tiny U-Net at equal compute, patch-size sweep, init ablation; same noise through every denoiser (strip) | 5 | 5 | 3 | 5 | Reading section 4 | `out/tiny_scores.json`, `out/tiny_strips.npz` |
| Who attends to whom: cross-attention, concatenation, MMDiT, single stream as attention matrices with counters | 5 | 3 | 4 | 5 | Reading section 5 | drawn; entry counts by formula |
| Parameter shares by kind of layer for eleven denoisers (stacked bars) | 5 | 5 | 4 | 5 | Reading section 6 | `out/arch.json` |
| FLUX position ids for a small latent, head-dimension split | 3 | 4 | 5 | 5 | Reading section 7 | the pipeline's `_prepare_latent_image_ids` logic |
| One prompt, one seed at 256 / 512 / 768 / 1024 (SD 1.5) | 5 | 5 | 4 | 5 | Reading section 8 | `out/sd/res_g04_*.webp` |
| Cost of one 1024 image for every pipeline at its defaults | 4 | 5 | 5 | 4 | Reading section 9 | `out/flops.json`, pipeline defaults (`out/extras.json`) |
| Measured U-Net time vs size against counted FLOPs (achieved TFLOP/s) | 4 | 5 | 4 | 5 | Reading section 9 | `out/sd_ld.json` |
| Architecture explorer (two models side by side, all eleven in a table) | 4 | 5 | 3 | 4 | tab | `out/arch.json`, `out/flops.json` |
| Tokens and FLOPs calculator with a chart of all eleven against size | 4 | 5 | 4 | 4 | tab | `out/flops.json` (exact fitted formula) |

## Rejected or left to others

- Rebuilding the Model map's six-pipeline stack animation (text encoder sizes, tokens at 1024): the root owns it; linked by name.
- SD 1.5 sampler, step and guidance strips: the root's Diffusion lab owns them (and its timings are reused, not remeasured).
- Latent vs pixel diffusion toy at fixed compute: the LDM paper page owns a live one; linked.
- Self-attention maps of the U-Net (4,096 x 4,096 per head): large data, little extra lesson over cross-attention; not built.
- A 2-D RoPE rotation animation: the Positional Encodings page owns RoPE; only the 2-D/3-D id layout is new here, shown statically with inputs.
- Running SDXL, SD3 or FLUX here: would teach little beyond the counts (and SDXL fp16 NaN, FLUX size, gated SD3); expensive and against "cheap runs over expensive". Counts are exact without weights.
- Training the TinyDiT on latents: the LDM paper page already compares latent and pixel training on a toy; pixels kept the comparison with the Flow lab's U-Net exact.

## What the methodology lacked for this page

- A rule for **counting without weights**: meta-device instantiation plus FlopCounterMode gives exact parameters and FLOPs for gated or 20B models at no cost; worth adding as a standard move for architecture pages, with the check against public totals (it found three discrepancies: SD3's stored position table, diffusers' DiT port duplicating embedders, DiT's frozen position parameter).
- A note that papers' "Gflops" are often multiply-accumulates (DiT), so a FLOP counter disagrees by exactly 2x.
