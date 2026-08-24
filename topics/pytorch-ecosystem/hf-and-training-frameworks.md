# The layer above core: HF stack and training frameworks

Last verified: 2026-08-24. transformers 5.15, Axolotl 0.29+, torchtune discontinued.

## Best resources

- [Transformers v5 announcement](https://huggingface.co/blog/transformers-v5): what changed in the Jan 2026 major release and why.
- [The future of torchtune (issue #2883)](https://github.com/meta-pytorch/torchtune/issues/2883): the primary source on the wind-down and Meta's consolidation plan.
- [torchtitan repo](https://github.com/pytorch/torchtitan) and [tech report](https://arxiv.org/abs/2410.06511): PyTorch-native pretraining reference.
- [Axolotl docs](https://docs.axolotl.ai/): config-driven fine-tuning, the most complete recipe surface today.
- [TRL docs](https://huggingface.co/docs/trl): SFT/DPO/GRPO trainer APIs and their assumptions.

## The Hugging Face stack

- **transformers v5** (5.0 landed Jan 2026; 5.x monthly): now **PyTorch-only** (TF/Flax
  sunset). Model definitions were aggressively simplified ("modular transformers": each
  model is a small diff against a reference implementation); attention is pluggable
  (`attn_implementation=` sdpa | flash_attention_2/3 | flex_attention | kernels-hub
  entries); quantization is first-class across features (bitsandbytes, TorchAoConfig,
  GPTQ/AWQ, fp8 checkpoints load natively). The **kernels** library pulls prebuilt
  optimized kernels (Liger, FA variants, Helion kernels) from the Hub at runtime instead
  of compiling them locally. transformers also now serves as the model-definition source
  for vLLM/SGLang (one implementation, many runtimes), and pretraining-friendly init
  paths reduced its historical training overhead.
- **accelerate**: the thin launcher/abstraction under HF Trainer: `accelerate launch`,
  `Accelerator.prepare()`, mixed precision, and plugins for FSDP2 (`fsdp_version: 2`),
  DeepSpeed ZeRO, and Megatron-LM. `device_map="auto"` big-model inference lives here
  too. Use it when you want HF ergonomics but your own loop.
- **PEFT**: LoRA/QLoRA/DoRA and friends as adapter injection over any transformers
  model; composes with FSDP2 (per-parameter sharding made mixed frozen/trainable clean)
  and with TRL trainers.
- **TRL**: post-training trainers: `SFTTrainer` (packing, chat templates),
  `DPOTrainer` and the preference family (KTO, ORPO), `GRPOTrainer` and online RL
  (with vLLM rollout integration), `RewardTrainer`. Default choice for single-node
  RLHF-style work; scale-out RL increasingly goes to specialized stacks (verl, SkyRL,
  OpenRLHF) covered in [../rl/](../rl/).
- **datasets**: Arrow-backed map-style + `IterableDataset` streaming; for web-scale
  pretraining data people pair it with WebDataset/Mosaic StreamingDataset instead.

## PyTorch-native trainers: the 2025-26 shake-out

- **torchtitan** (meta-pytorch): **pretraining** reference and now the center of
  gravity for Meta's LLM training work. Minimal-abstraction Llama/DeepSeek/MoE model
  code plus n-D parallelism (FSDP2, TP/SP, PP, CP, EP), torch.compile, float8/MXFP8,
  DCP async checkpointing, torchft fault tolerance. Treat it as a fork-and-own codebase,
  not a pip framework. Its experiments tree hosts new-architecture bring-ups
  (MoE, VLM, diffusion) and post-training scale-out is being consolidated here.
- **torchtune**: PyTorch-native fine-tuning recipes. **Development discontinued in
  2025** (critical fixes only through 2025; effectively frozen now). Its ideas
  (recipe-per-file, QAT, per-param FSDP2 LoRA) live on elsewhere; do not start new
  projects on it.
- **torchforge** (meta-pytorch): announced late 2025 as the RL/post-training successor
  (built on Monarch single-controller infra + vLLM rollouts); development **paused** in
  2026 with the stated direction of consolidating LLM training into torchtitan. Watch,
  do not adopt.
- **Axolotl**: YAML-config fine-tuning over the HF stack (transformers/PEFT/TRL under
  the hood). Broadest recipe coverage in one tool: SFT, DPO/KTO, GRPO, reward models,
  QLoRA, multimodal, sequence packing, FSDP2 and DeepSpeed multi-node, MoE expert
  quantization, fast day-one support for new open models. The pragmatic default for
  "fine-tune model X on my data" without writing a loop.
- **Lightning (PyTorch Lightning / Fabric)**: general-purpose trainer, still actively
  maintained. `Trainer` for callback-structured engineering (logging, ckpt, early stop);
  **Fabric** for keeping your own loop with launch/precision/strategy handled. FSDP2 and
  DeepSpeed strategies exist, but cutting-edge LLM parallelism lands here later than in
  torchtitan/accelerate. Best fit: non-LLM research code and teams already invested.
- **Composer** (MosaicML/Databricks): trainer with speedup algorithms; effectively in
  maintenance since Databricks' focus shifted; mainly relevant for its StreamingDataset
  and legacy MPT-era recipes.
- Also in the space: **Unsloth** (single-GPU/LoRA speed via custom Triton kernels),
  **LLaMA-Factory** (GUI-flavored config fine-tuning), **NeMo/Megatron-LM** (NVIDIA
  scale-out pretraining, covered in [../llm-training-and-post-training/](../llm-training-and-post-training/)).

## When to use which

| Scenario | Reach for |
|---|---|
| Pretraining / continued pretraining at scale, want full control | torchtitan (fork it), or Megatron-LM/NeMo if NVIDIA-stack-committed |
| Standard SFT/DPO/GRPO on open models, minimal code | Axolotl (config) or TRL directly (Python) |
| Custom training loop + HF models + easy multi-GPU | accelerate (FSDP2 plugin), or Lightning Fabric |
| PEFT on a single node, VRAM-constrained | TRL/PEFT + QLoRA; Unsloth if single-GPU speed is the bottleneck |
| Non-LLM research (vision, science), team wants structure | Lightning |
| RL post-training at multi-node scale | verl/SkyRL/OpenRLHF today; watch torchtitan consolidation |

Rule of thumb: the HF stack optimizes for breadth and ergonomics, torchtitan for
transparency and peak MFU; frameworks in between mostly repackage the same
FSDP2/DeepSpeed/TRL primitives, so pick by how much of the loop you want to own.

## Current state summary (Aug 2026)

- transformers v5 completed the PyTorch-first consolidation; it is now the de facto
  model-definition hub for both training and serving runtimes.
- Meta's trainer strategy churned (tune -> forge -> titan); PyTorch-native training
  now means torchtitan plus core APIs, and its releases track PyTorch minors.
- FSDP2 is the shared substrate everywhere: accelerate, Axolotl, Lightning, TRL, and
  torchtitan all target it; DeepSpeed remains the main alternative engine (now a
  PyTorch Foundation hosted project).
- Fine-tuning competition (Axolotl vs Unsloth vs TRL vs LLaMA-Factory) is converging on
  the same TRL-derived trainers; differentiation is kernels, packing, and config UX.

Cross-refs: [distributed-pytorch.md](distributed-pytorch.md) for the primitives these
frameworks wrap; [../llm-training-and-post-training/](../llm-training-and-post-training/)
for alignment algorithms; [../rl/](../rl/) for RLVR/GRPO theory.
