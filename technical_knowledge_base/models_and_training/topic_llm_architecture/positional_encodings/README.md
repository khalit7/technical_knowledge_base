# Positional Encodings

Notion: https://app.notion.com/p/3c65c17b0d0d81a5b7c9e578fcdfac00
Site: https://khalit7.github.io/technical_knowledge_base/models_and_training/topic_llm_architecture/positional_encodings/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). A child of Topic: llm-architecture (moved from Topic: llm-training-and-post-training on 2026-10-18 and rebuilt the same day). It teaches position from zero: why attention needs it (a permutation test and a position probe on the topic's tiny GPT), learned and sinusoidal tables, the relative family (Shaw, T5, ALiBi, DeBERTa), RoPE derived as a rotation with transformers 5.20.1 code at file:line, the base and variants read from 74 real configs (partial, decoupled, multimodal, proportional, NoPE layers, hybrids with no positions), five schemes trained here on equal budgets, what breaks past the trained length, and the scalings (PI, NTK, dynamic NTK, YaRN, Llama 3, LongRoPE) measured on the tiny GPT and drawn per pair on real configs.

Tabs: Reading; Past the trained length (the running sequence moved to 8 offsets, plain RoPE against each method, animated from recorded measurements, and every scheme's loss to 2,048 tokens); Stretch the spectrum (every method's per-pair slowdown on 12 configs or your own, the configs side by side, the census of all configs); Further reading. No child pages, databases or video.
