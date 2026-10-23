# XLA and compilation: jaxprs, StableHLO, fusion and recompiles

Notion: https://app.notion.com/p/3fa5c17b0d0d8135adcedefac9e1bb48 (child of Topic: jax-and-tpu)
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/xla_and_compilation/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; see `src/README.md`). What happens between `jax.jit(f)(x)` and machine code, read in the pinned JAX (jax-v0.11.2) and XLA (91888df6) sources and measured on the running example's train step on an Apple M1 Pro CPU: lowering rules and StableHLO, PJRT, XLA's CPU and GPU pass pipelines pass by pass, fusion kinds and XLA's own refusal reasons, layouts and TPU tiling, buffer assignment reconstructed from the dump, rematerialisation, the in-memory and persistent caches, AOT and `jax.export`, recompiles with JAX's explanations, profiling, XLA flags, and torch.compile for comparison. Tabs: Reading (core idea and hero figure first, depth in closed blocks; rebuilt to the teaching contract 2026-10-23), Pass diff viewer, Fusion explorer, Recompile detective, Profile reader, Further reading. A new page: no old text, child pages, databases or video.
