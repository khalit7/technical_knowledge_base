# Topic: jax-and-tpu

Notion: https://app.notion.com/p/3c65c17b0d0d81ecbc04eea6aa45ea1a
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_jax_and_tpu/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). JAX, the XLA compiler under it and the TPUs it was built for, taught from zero for a PyTorch user on one running example (a tiny character-level GPT on TinyShakespeare, 826,368 parameters, written three times: PyTorch, Flax NNX and plain JAX, from identical weights). Tabs: Reading (`src/read/`), Transforms lab (`src/xf/`: tracing, recompiles, PRNG, pytrees, grad, vmap, interpreters), Compiler lab (`src/xla/`: jaxpr to StableHLO to HLO, fusion, passes, donation, remat, scan, compile cache), Training lab (`src/train/`: NNX, Linen, Equinox, Haiku, optax, orbax, grain, the port and its pitfalls), Sharding lab (`src/shard/`: Mesh, PartitionSpec, propagation, collectives, six train-step layouts), TPU and Pallas lab (`src/tpu/`: MXU padding, rooflines, mesh on the torus, Pallas kernels in interpret mode), Tool map (`src/map/`), Further reading. Shared running example and equivalence checks in `src/data/`.
Real runs on an Apple M1 Pro (CPU only, with 8 simulated devices for sharding), 2026-10-15; TPU figures are Google's published ones, kept apart and dated, and TPU results are calculations, labelled.
Eight child pages, each in its own folder: jax_core, xla_and_compilation, training_stack, pytorch_to_jax, sharding_and_scale, tpu_programming_and_performance, pallas_kernels, jax_llm_codebases.
