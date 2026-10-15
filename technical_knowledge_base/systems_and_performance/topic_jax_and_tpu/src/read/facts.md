# Facts verified for the Reading tab (key "rd")

All checked 2026-10-15 unless dated. The same text goes into the topic's shared FACTS.md under "rd".

## Versions (PyPI JSON, latest release and upload date)
- jax and jaxlib 0.11.2, 2026-09-17, requires Python >= 3.12. flax 0.12.10, 2026-09-24. optax 0.2.8, 2026-03-20. orbax-checkpoint 0.12.7, 2026-10-06. grain 0.2.18, 2026-06-17. equinox 0.13.8, 2026-05-05. dm-haiku 0.0.17, 2026-07-27. chex 0.1.92, 2026-06-12. torch 2.14.1, 2026-09-30.

## API status (JAX changelog, https://docs.jax.dev/en/latest/changelog.html)
- 0.4.26 (2024-04-03): jax.experimental.maps and xmap deprecated. 0.4.31 (2024-07-29): "xmap has been deleted. Please use shard_map() as the replacement."
- 0.7.0 (2025-07-22): jax.experimental.shard deleted, APIs moved to jax.sharding; minimum Python 3.11; pjit_p renamed jit_p.
- 0.7.1 (2025-08-20): jax.set_mesh exposed; jax.sharding.use_mesh removed.
- 0.8.0 (2025-10-15): default jax.pmap reimplemented "in terms of jax.jit and jax.shard_map"; "jax.pmap is in maintenance mode"; jax.experimental.shard_map.shard_map deprecated in favour of jax.shard_map; jax.experimental.pjit.pjit deprecated in favour of jax.jit.
- 0.9.0 (2026-01-20): jax_pmap_shmap_merge config deprecated. 0.10.0 (2026-04-16): it is removed; pmap always wraps jax.jit(jax.shard_map); C++ pmap removed.
- 0.10.1 (2026-05-20): `with mesh:` deprecated, use `with jax.set_mesh(mesh):`.
- 0.11.0 (2026-07-16): Python 3.11 dropped. 0.11.2 (2026-09-17): shard_alike removed, "Use explicit sharding mode instead."

## Library status
- Flax docs landing page: "Flax NNX is an evolution of the previous Flax Linen API"; "Flax Linen API is not going to be deprecated in the near future as most of Flax users still rely on this API"; "new users are encouraged to use Flax NNX". Linen docs: flax-linen.readthedocs.io.
- Haiku README: "As of July 2023 Google DeepMind recommends that new projects adopt Flax instead of Haiku"; best-effort maintenance, bug fixes and JAX compatibility, no new features.
- Tunix README: SFT (full, PEFT), DPO, ORPO; RL: PPO, GRPO, GSPO-Token, DAPO, Dr.GRPO; agentic multi-turn RL; "V2 Release"; "under active development"; repo has tunix/distillation. Apache-2.0.
- levanter README: built "with JAX, Equinox, and Haliax"; "bitwise deterministic ... even in the face of preemption and resumption" (TPU; host-count change breaks it); "Levanter has been merged into Marin" (November 2025).
- MaxText README: "a high performance, highly scalable, open-source LLM library and reference implementation"; news 2026-06-29 "MaxText has migrated to Flax NNX from Linen"; news 2025-10-10 "Post-Training (SFT, RL) via Tunix is now available". No MFU table in the README.
- vLLM tpu-inference README: "unifying JAX and PyTorch under a single lowering path"; recommended v7x, v5e, v6e.
- GitHub last push (API, 2026-10-15): maxtext 2026-10-15, tunix 2026-10-15, marin 2026-10-15, flax 2026-10-12, pytorch/xla 2026-10-13, torchax 2026-10-11, axlearn 2026-07-08, t5x 2026-08-03, paxml 2026-10-15, big_vision 2025-05-19, EasyLM 2024-08-13, JetStream 2026-01-05.

## Who uses JAX
- Gemini 1 report (arXiv 2312.11805) section 3: "We trained Gemini models using TPUv5e and TPUv4"; "the 'single controller' programming model of Jax and Pathways allows a single Python process to orchestrate the entire training run".
- Apple AFM (arXiv 2407.21075) section 3.3: "pre-trained on v4 and v5p Cloud TPU clusters with the AXLearn framework", "a JAX based deep learning library designed for the public cloud"; AFM-server on 8,192 TPUv4 chips; AFM-on-device on one slice of 2,048 TPUv5p chips.
- Grok-1 README: "JAX example code for loading and running the Grok-1 open-weights model"; 314B parameters.
- Hugging Face Hub library filter, 2026-10-15: pytorch 255,916 models, jax 12,404 (numTotalItems on huggingface.co/models?library=...).

## TPU (vendor; as verified on the Hardware topic's TPU page, which owns them)
- v5e 197 TF bf16, 16 GB, 819 GB/s, 256 chips 2D torus. v5p 459 TF, 95 GiB, 2,765 GB/s, 8,960 chips 3D torus. v6e 918 TF, 32 GB, 1,638 GB/s, 256 chips 2D. TPU7x Ironwood 2,307 TF bf16, 4,614 fp8, 192 GiB, 7,380 GB/s, 9,216 chips 3D. Ironwood GA date unconfirmed (Google 2025-11-06: "in the coming weeks").
- Ridge points derived (peak / bandwidth): v5e 240.5, v5p 166.0, v6e 560.4, Ironwood 312.6 FLOP/byte.

## Scaling book part 6 (Training LLaMA 3 on TPUs, 2025-02-04)
- LLaMA 3-70B about 70.4e9 parameters, 15T tokens, 6.3e24 FLOPs; v5p 4.59e14 FLOP/s, 96 GB (book's figure); pod 16x20x28 = 8,960.
- Batch 1,024 x 4,096. Memory: params 140 GB bf16, optimizer 560 GB fp32, checkpoints 10.5 TB, total about 11.2 TB; about 117 chips minimum by memory.
- 40% MFU on 8,960 chips: about 44 days. Recommendation: "roughly 2048-way FSDP and 4-way tensor parallelism"; takeaway lists 1,024-way DP, 2-way sequence, 4-way TP.

## Free access (not confirmed; TPU lab owns)
- Kaggle TPU quota not on a readable Kaggle page (JS-rendered); third-party: 20 h/week, 9 h/session.
