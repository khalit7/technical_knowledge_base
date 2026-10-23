# Positional Encodings

Notion: https://app.notion.com/p/3c65c17b0d0d81a5b7c9e578fcdfac00
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/positional_encodings/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). A child of Topic: llm-architecture (moved from Topic: llm-training-and-post-training on 2026-10-18 and rebuilt the same day). It teaches position from zero: why attention needs it (a permutation test and a position probe on the topic's tiny GPT), learned and sinusoidal tables, the relative family (Shaw, T5, ALiBi, DeBERTa), RoPE derived as a rotation with transformers 5.20.1 code at file:line, the base and variants read from 74 real configs (partial, decoupled, multimodal, proportional, NoPE layers, hybrids with no positions), five schemes trained here on equal budgets, what breaks past the trained length, and the scalings (PI, NTK, dynamic NTK, YaRN, Llama 3, LongRoPE) measured on the tiny GPT and drawn per pair on real configs.

Tabs (rebuilt 2026-10-23 to the teaching contract): Reading (core idea and hero, eleven sections with their visuals inline, including the measured run past the trained length and the per-pair spectrum of every scaling, both moved from former lab tabs; depth in closed blocks); Every config (twelve scaled configs side by side and the census of all 74); Further reading. No child pages, databases or video.
