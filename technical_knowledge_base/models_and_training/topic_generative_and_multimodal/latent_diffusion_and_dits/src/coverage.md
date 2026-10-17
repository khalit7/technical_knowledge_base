# Coverage against the old Notion page

Old page not yet compared (Notion disconnected). This is a new child page of Topic: generative-and-multimodal; when the connection is back, fetch any older Notion text on latent diffusion or DiTs, save it verbatim to `live.md`, and list every fact with where this page carries it or why it was dropped.

What the page was required to carry (the brief for child 4) and where it is:

| Required | Where |
|---|---|
| Why latent diffusion: compute arithmetic from pixels to latents | Reading section 1 (counted, latent vs pixel pass) |
| The U-Net read from SD 1.5's config and code (down/up blocks, skips, cross-attention, time embedding) | Reading section 2, animation, Architecture explorer |
| Text conditioning: CLIP, T5, LLM encoders; pooled vs sequence | Reading section 3 (measured on SD 1.5's encoder; table of seven pipelines) |
| DiT: patchify, adaLN-Zero, scaling results (published) | Reading section 4 (Table 4 reproduced by counting) |
| MMDiT (SD3 joint attention) | Reading section 5 |
| Flux-style double/single stream blocks (published) | Reading section 6 |
| Resolution and aspect-ratio bucketing | Reading section 8 (SD 1.5 at four sizes, measured) |
| Positional encodings for images (2-D RoPE) | Reading section 7 |
| Inference cost (tokens vs resolution; published numbers labelled) | Reading section 9, calculator tab |
| Run: SD 1.5's U-Net inspected and profiled (parameter breakdown, cross-attention maps) | sections 2, 3, 9; Cross-attention viewer |
| Run: TinyDiT vs TinyUNet at equal compute | section 4 |
| Labs: U-Net vs DiT architecture explorer with real parameter counts; cross-attention map viewer; token-count and FLOPs calculator | the three tabs |
