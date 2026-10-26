"""Tool map: JAX API changes that break old tutorials (A) and the 'which library for which job' picker (P).
A rows are read from the JAX CHANGELOG (main branch, read 2026-10-15); each cites the release that made the change.
P is a judgement (labelled as such on the page), built from the atlas entries it links."""
JC = "https://github.com/jax-ml/jax/blob/main/CHANGELOG.md"
# [old, new, what happened, jax version, release date, note]
A = [
 ["jax.experimental.maps.xmap", "jax.shard_map, or jax.vmap with spmd_axis_name", "deprecated 0.4.26; deleted", "0.4.31", "2024-07-29", "Named-axis programming moved to shard_map."],
 ["jax.experimental.export", "jax.export", "removed", "0.4.36", "2024-12-05", "Deprecated in 0.4.30 when jax.export appeared."],
 ["jax2tf.convert(native_serialization=False) or enable_xla=False", "jax2tf with native (StableHLO) serialization, or jax.export", "removed", "0.4.36", "2024-12-05", "Deprecated since 0.4.31 (July 2024)."],
 ["GSPMD as the sharding propagator", "Shardy", "default switching", "0.7.0", "2025-07-22", "'JAX is migrating from GSPMD to Shardy by default' (migration guide linked in the changelog). Same annotations; different propagation engine."],
 ["jax.sharding.use_mesh", "jax.set_mesh (global setter and context manager)", "removed", "0.7.1", "2025-08-20", ""],
 ["jax.experimental.pjit.pjit", "jax.jit (in_shardings, out_shardings)", "deprecated", "0.8.0", "2025-10-15", "jit and pjit had been the same function for a long time; the primitive was renamed pjit_p to jit_p in 0.7.0."],
 ["jax.experimental.shard_map.shard_map", "jax.shard_map", "deprecated", "0.8.0", "2025-10-15", ""],
 ["jax.pmap", "jax.shard_map (inside jax.jit)", "maintenance mode; reimplemented on jit(shard_map)", "0.8.0", "2025-10-15", "'jax.pmap is in maintenance mode and we encourage all new code to use jax.shard_map directly.' Since 0.10.0 pmap always wraps jit(shard_map) and the C++ pmap path is gone."],
 ["jax.device_put_sharded, jax.device_put_replicated", "jax.device_put with a NamedSharding", "removed (AttributeError)", "0.10.0", "2026-04-16", "Drop-in replacements in the pmap migration guide."],
 ["jax.sharding.PmapSharding", "NamedSharding", "deprecated 0.8.1; removed", "0.10.0", "2026-04-16", ""],
 ["with mesh: (Mesh as a context manager)", "with jax.set_mesh(mesh):", "deprecated", "0.10.1", "2026-05-20", ""],
 ["Python 3.11", "Python 3.12 or newer", "support dropped", "0.11.0", "2026-07-16", "Per JAX's deprecation policy; 3.13t free-threaded builds also dropped in favour of 3.14t."],
 ["jax.experimental.shard_alike", "explicit sharding mode (AxisType.Explicit)", "removed", "0.11.2", "2026-09-17", ""],
]

HW = [["tpu", "Google TPU"], ["nvidia", "NVIDIA GPU"], ["amd", "AMD GPU"], ["cpu", "Laptop or CPU only"]]
# job: label, stack (tool ids, in order), why, hw notes (shown when that hardware is chosen), avoid (tool ids to steer away from)
P = [
 dict(id="learn", label="Learn JAX from zero", stack=["jax", "nnx", "optax", "treescope"],
      why="Start with jax.numpy, jit, grad and vmap on plain functions, then Flax NNX for modules (closest to torch.nn.Module) and optax for the update. Read stax.py once to see a library built from pure functions.",
      hw={"cpu": "Everything in this topic ran on a CPU with 8 simulated devices; that is enough to learn sharding too.", "tpu": "A free Colab or Kaggle TPU shows a real profile once the basics work."},
      avoid=["haiku", "metal"]),
 dict(id="pretrain", label="Pretrain an LLM at scale", stack=["maxtext", "nnx", "optax", "orbax", "grain", "tokamax"],
      why="MaxText already shards every parallelism over mesh axes, ships tuned kernels, and its repository tags MLPerf submission versions; read it before writing your own.",
      hw={"tpu": "Provision with GKE (Cluster Toolkit, not XPK) or plain TPU VMs for small slices.", "nvidia": "MaxText also targets GPUs; check its GPU docs for the supported recipes.", "amd": "Possible through the ROCm plugin; expect to do more of the tuning yourself.", "cpu": "Only for reading the code and running tiny configs."},
      avoid=["t5x", "paxml", "easylm", "xpk"]),
 dict(id="research", label="Research model, custom architecture", stack=["nnx", "optax", "orbax", "grain", "jaxtyping"],
      why="Write the model in Flax NNX (or Equinox if you prefer models as pytrees), keep the train step one jitted function, add sharding annotations later.",
      hw={"cpu": "Develop on CPU with simulated devices, then move to accelerators unchanged."},
      avoid=["haiku", "penzai"]),
 dict(id="scientific", label="Scientific ML, differentiable simulation", stack=["equinox", "optax", "jaxtyping"],
      why="Equinox and its family (diffrax for ODEs, optimistix, lineax) treat everything as pytrees, which suits solvers and physics code.",
      hw={}, avoid=[]),
 dict(id="posttrain", label="Post-train (SFT, RL) an LLM", stack=["tunix", "maxtext", "tpuinf", "sglangjax"],
      why="Tunix provides SFT, GRPO-style RL and agentic RL on Flax NNX, with vLLM TPU or SGLang-JAX for rollouts; MaxText runs post-training through Tunix.",
      hw={"nvidia": "On GPUs most teams use PyTorch tools (TRL, verl, OpenRLHF); Tunix is TPU-first."},
      avoid=[]),
 dict(id="serve", label="Serve an LLM", stack=["tpuinf", "sglangjax"],
      why="vLLM TPU (tpu-inference) serves JAX and unchanged PyTorch model code behind the usual vLLM API; SGLang-JAX is the second engine.",
      hw={"nvidia": "On NVIDIA GPUs, serve with vLLM or SGLang on PyTorch; JAX serving engines are TPU-first.", "amd": "Same: the JAX engines target TPUs."},
      avoid=["jetstream"]),
 dict(id="pytpu", label="Run existing PyTorch code on TPU", stack=["torchtpu", "tpuinf", "torchax"],
      why="TorchTPU runs PyTorch natively on TPU (open-sourced 20 October 2026), and vLLM and SGLang TPU engines are built on it; torchax still runs torch code through JAX, the route vLLM TPU took first.",
      hw={"nvidia": "Not needed: PyTorch runs natively on NVIDIA GPUs.", "amd": "Not needed: PyTorch runs on ROCm.", "cpu": "torchax runs on the JAX CPU backend for testing."},
      avoid=["torchxla"]),
 dict(id="port", label="Port a PyTorch model to JAX", stack=["nnx", "optax", "torchax", "orbax"],
      why="Rewrite modules in Flax NNX line by line (the Training lab's translation table), copy weights, check activations layer by layer; torchax helps run the torch original next to the JAX version for comparison.",
      hw={}, avoid=[]),
 dict(id="kernel", label="Write a custom kernel", stack=["jax", "tokamax"],
      why="Pallas (jax.experimental.pallas) is the kernel language for TPU (Mosaic) and GPU (Triton or Mosaic GPU); check Tokamax first, it may already have the kernel.",
      hw={"cpu": "Pallas interpret=True runs on CPU: correctness and indexing, not speed.", "nvidia": "Pallas on GPU lowers through Triton or Mosaic GPU; plain Triton or CUDA are alternatives."},
      avoid=[]),
 dict(id="quant", label="Quantise for serving", stack=["qwix", "tpuinf"],
      why="Qwix does PTQ and QAT on Flax models for XLA targets; serve the result with vLLM TPU.",
      hw={}, avoid=["jmp"]),
 dict(id="highlevel", label="High-level training, Keras style", stack=["keras", "optax"],
      why="Keras 3 with KERAS_BACKEND=jax gives fit() on TPUs and a distribution API over a JAX mesh; KerasHub has pretrained models.",
      hw={}, avoid=[]),
 dict(id="export", label="Export a model to another runtime", stack=["jax2tf", "stablehlo"],
      why="jax.export serialises to versioned StableHLO; jax2tf wraps it in a SavedModel when the consumer is TensorFlow tooling.",
      hw={}, avoid=[]),
]

# Before/after animation: the same jobs in October 2023 and October 2026. S0 = what you would have used in Oct 2023.
# EV = [date, slot, new label, tool id (or None), text]; every event is backed by a lineage row or a changelog row above.
SLOTS = [
 ["nn", "Network library", "Flax Linen or Haiku", "linen"],
 ["gtrain", "Google's LLM trainer", "T5X or Pax", "t5x"],
 ["otrain", "Open LLM trainer", "Levanter or EasyLM", "levanter"],
 ["post", "LLM post-training in JAX", "(nothing standard)", None],
 ["serve", "Serving on TPU", "(JetStream from 2024)", None],
 ["torch", "PyTorch on TPU", "PyTorch/XLA", "torchxla"],
 ["multi", "Multi-device API", "pmap and pjit", None],
 ["prop", "Sharding propagation", "GSPMD", None],
 ["view", "Model viewer", "(print statements)", None],
 ["cluster", "TPU cluster tool", "XPK", "xpk"],
]
EV = [
 ["2024-03", "serve", "JetStream", "jetstream", "JetStream's first PyPI release (2024-03-01)."],
 ["2024-07", "view", "Treescope", "treescope", "Treescope 0.1.0 split out of Penzai (2024-07-25)."],
 ["2024", "nn", "Flax NNX", "nnx", "Flax NNX released; Linen kept but new users pointed to NNX."],
 ["2024-04", "gtrain", "MaxText", "maxtext", "Last Pax release (2024-04-09); MaxText is where Google's open LLM training continues (our reading)."],
 ["2025-07", "prop", "Shardy", None, "JAX 0.7.0: migrating from GSPMD to Shardy by default."],
 ["2025-10", "multi", "jax.jit + jax.shard_map", None, "JAX 0.8.0: pjit deprecated, pmap in maintenance mode."],
 ["2025-10", "post", "Tunix", "tunix", "MaxText post-training via Tunix (README news, October 2025)."],
 ["2025-10", "torch", "torchax (bridge)", "torchax", "torchax moves to its own repository (google/torchax, 2025-10-03)."],
 ["2025-11", "otrain", "Marin (Levanter inside)", "marin", "Levanter merged into the Marin monorepo."],
 ["2026-01", "serve", "vLLM TPU (tpu-inference)", "tpuinf", "JetStream's archival notice: functionality moved to tpu-inference."],
 ["2026-04", "torch", "TorchTPU (native PyTorch)", "torchtpu", "TorchTPU announced in April and open-sourced on 20 October 2026, replacing PyTorch/XLA."],
 ["2026-08", "cluster", "Cluster Toolkit", "clustertk", "XPK deprecated in favour of Cluster Toolkit."],
]
