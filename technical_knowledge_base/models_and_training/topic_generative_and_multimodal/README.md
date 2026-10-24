# Topic: generative-and-multimodal

Notion: https://app.notion.com/p/3c65c17b0d0d817ab6ade318917bff55
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_generative_and_multimodal/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). The map of models that generate images, video and audio and models that see and read: the comparisons that only show across the nine children, the definitions they need, and child cards. Tabs: Reading (`src/read/`), Zero-shot lab (`src/vision/`: CLIP and SigLIP 2 zero-shot on Fashion-MNIST), VLM lab (`src/vlm/`: SmolVLM measured end to end), Model map (`src/map/`), Further reading. The Latent, Diffusion and Flow labs were retired on 2026-10-24 (their children teach them; parts in `src/retired/parts/`, recordings kept in `src/latent`, `src/diff`, `src/flow`). Shared data and code in `src/data/`.
Real runs on an Apple M1 Pro (MPS and CPU), 2026-10-17; published results kept apart and dated.
Nine child pages, each in its own folder: autoencoders_and_vaes, diffusion_from_zero, flow_matching, latent_diffusion_and_dits, vision_encoders, vision_language_models, native_multimodal_models, video_and_audio_generation, evaluating_generative_models. Each has its own Notion page (id in its README and in `pages.json`); the root links to all nine.
