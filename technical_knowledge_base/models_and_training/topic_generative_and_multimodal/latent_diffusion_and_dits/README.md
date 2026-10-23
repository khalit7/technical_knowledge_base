# Latent diffusion and diffusion transformers

Notion: https://app.notion.com/p/3fc5c17b0d0d814fbcb5e0c8df5289f3 (child of Topic: generative-and-multimodal; a new page).
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_generative_and_multimodal/latent_diffusion_and_dits/

Status: HTML-only page built 2026-10-17, published. `index.html` is the whole page, built from `src/` with `sh src/build.sh`; `src/README.md` lists the tabs, scripts, runs and checks.

Child 4 of the topic: how the denoiser of a text-to-image model is built (why latents, the U-Net read from SD 1.5's config, text conditioning, DiT and adaLN-Zero, MMDiT, double and single stream blocks, positions for images, resolution, cost), with parameter and FLOP counts of eleven real denoisers counted from their configs, SD 1.5 profiled and its cross-attention recorded, and tiny DiTs trained against the topic's U-Net, measured on an Apple M1 Pro. Tabs: Reading, Architecture explorer, Cross-attention viewer, Tokens and FLOPs calculator, Further reading.
