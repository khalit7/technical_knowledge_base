# Sources (read 2026-10-17)

Papers read as arXiv HTML (fetched 2026-10-17, converted to text in the scratch folder, not committed). Every quotation on the page, with where it is.

| Source | Used for | Location |
|---|---|---|
| Peebles and Xie, Scalable Diffusion Models with Transformers, arXiv 2212.09748 | patchify; adaLN-Zero definition; "Cross-attention adds the most Gflops ... roughly a 15% overhead"; conditioning ablation; Table 4 (all 12 models, the four conditioning variants, long runs); "parameter counts do not uniquely determine the quality"; L/2 1000 steps 80.7 Tflops FID-10K 25.9 vs XL/2 128 steps 15.2 Tflops 23.7; three-channel guidance (scale 1.5 gives 2.27; four-channel 1.375 gives 2.20) | sections 3.2, 4, 5, Appendix A, Table 4 |
| Esser et al., Scaling Rectified Flow Transformers, arXiv 2403.03206 | "two separate sets of weights for the two modalities ... equivalent to having two independent transformers"; depth rule 64 d; "Our MM-DiT variant significantly outperforms the cross-attention and vanilla variants"; QK-normalisation "enables efficient training at bf16-mixed precision"; extended and interpolated position grids; T5 removal win rates 50/46/38%; drop rate 46.3% (5.3.3) vs 46.4% (B.3); 4.7B T5-XXL | sections 4, 5.2.3, 5.3.2, 5.3.3, B.3 |
| Podell et al., SDXL, arXiv 2307.01952 | "we omit the transformer block at the highest feature level, use 2 and 10 blocks at the lower levels, and remove the lowest level"; 2.6B U-Net, 817M text encoders; penultimate layers; size and crop conditioning; 39% discarded; buckets "as close to 1024^2 pixels as possibly ... multiples of 64"; NovelAI citation; training stages | sections 2.1, 2.2, 2.3, 2.5, Table 1 |
| Chen et al., PixArt-alpha, arXiv 2310.00426 | adaLN "a substantial proportion (27%) of the parameters"; adaLN 833M vs adaLN-single 611M, 26% | sections 2.3, 3.3 (ablation) |
| Labs et al., FLUX.1 Kontext, arXiv 2506.15742 | "built from a mix of double stream and single stream blocks ... apply 38 single stream blocks ... discard the text tokens"; fused blocks halve modulation; 3-D RoPE (t, h, w) | section 2 |
| Qwen-Image technical report, arXiv 2508.02324 | standard double-stream MMDiT; MSRoPE, text "along the diagonal" | sections 2.1, 2.4 |
| Rombach et al., LDM, arXiv 2112.10752 | perceptual vs semantic compression | section 3 (Figure 2 text) |
| Xie et al., Sana, arXiv 2410.10629 | linear attention, DC-AE (counts come from the config) | abstract, section 2 |
| Ronneberger et al., U-Net, arXiv 1505.04597; Saharia et al., Imagen, arXiv 2205.11487; Hertz et al., Prompt-to-Prompt, arXiv 2208.01626 | cited by name only | |
| Black Forest Labs flux, src/flux/util.py @802fb4713906 | FLUX.1 configs (depth 19, depth_single_blocks 38, hidden 3,072, 24 heads, axes [16, 56, 56], guidance_embed dev True / schnell False) | lines 299 to 378 |
| Hub model cards (2026-10-17) | FLUX.2 [klein] 4B: 4 steps, guidance 1.0; Z-Image-Turbo: 9 steps ("8 DiT forwards"), guidance 0; FLUX.1 [schnell]: "1 to 4 steps", latent adversarial diffusion distillation (root FACTS) | README examples |
| Hub API (https://huggingface.co/api/models/<repo>, 2026-10-17) | public safetensors totals: FLUX.1-dev 11,901,408,320; FLUX.1-schnell 11,891,178,560; SD3.5 Large 8,146,280,768; SD3 Medium diffusers 2,084,951,104; FLUX.2-klein-4B 3,875,544,576 | `arch/configs.py` HUB_TOTAL |
| NVIDIA H100 product page | dense BF16 peak, as an upper bound in the calculator note | https://www.nvidia.com/en-us/data-center/h100/ |

Code lines: `inputs/source_lines.json`, made by `sources/find_lines.py` from the pinned clones (diffusers v0.41.0 @086bf9578c0f, facebookresearch/DiT @ed81ce222909, CompVis/latent-diffusion @a506df575647) and BFL flux @802fb4713906; `check_data.py` checks every line-anchored link on the page against it.
