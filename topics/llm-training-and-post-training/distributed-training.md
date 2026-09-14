# Distributed Training

⏱ 6 min read · +9h 40m resources

## Best resources

- [HuggingFace Ultra-Scale Playbook](https://huggingface.co/spaces/nanotron/ultrascale-playbook) (~8h): the canonical walk from single-GPU memory anatomy through DP, ZeRO, TP, PP, CP, EP and how to combine them; includes 4000+ real benchmark runs.
- [PyTorch FSDP2 docs](https://docs.pytorch.org/docs/stable/distributed.fsdp.fully_shard.html) (docs, ~30 min) and [torchtitan paper](https://arxiv.org/abs/2410.06511) (45 min): FSDP2 (per-parameter DTensor sharding) and how PyTorch composes 4D parallelism natively.
- [Framework survey: FSDP2 vs Megatron-Core vs DeepSpeed vs torchtitan](https://megacpp.com/blog/framework-survey-fsdp-vs-megatron-vs-deepspeed/) (~25 min): current (2026) practical comparison.
- Papers: [ZeRO](../../papers/2019-10_zero/summary.md), [Megatron-LM](../../papers/2019-09_megatron-lm/summary.md), [Switch Transformer](../../papers/2021-01_switch-transformer/summary.md).

## Data parallelism (DP/DDP)

Replicate the model on every GPU; each replica gets a different micro-batch; after
backward, **all-reduce** averages gradients before the optimizer step:

1. Copy model to X GPUs; 2. shard the batch; 3. parallel forward; 4. parallel
backward; 5. all-reduce gradients (overlapped with backward, bucketed); 6. identical
optimizer step everywhere.

Old `DataParallel` was single-process, single-node; **DDP** is one process per GPU
and multi-node, and is the baseline everything else builds on. Pros: simple, near
linear scaling. Cons: full model + grads + optimizer states on every GPU; that
memory ceiling is what ZeRO/FSDP remove.

## ZeRO and FSDP: sharded data parallelism

Memory per parameter in mixed-precision Adam: 2 (bf16 weights) + 2 (bf16 grads)
+ 12 (fp32 master weight, momentum, variance) = ~16 bytes, before activations.
ZeRO ([paper](../../papers/2019-10_zero/summary.md)) shards these across the DP
group instead of replicating:

- **ZeRO-1**: shard optimizer states.
- **ZeRO-2**: + shard gradients.
- **ZeRO-3**: + shard parameters; all-gather each layer's weights just-in-time in
  forward/backward, then free them. Communication ~1.5x DDP, memory scales as 1/N.
- ZeRO-Offload / ZeRO-Infinity push shards to CPU RAM / NVMe.

**FSDP** is the PyTorch-native equivalent of ZeRO-3. **FSDP2** (`fully_shard`)
replaced FSDP1's FlatParameter with **per-parameter DTensor sharding** (dim-0
sharding of each parameter). Consequences: composability with TP/PP/EP via device
meshes, sane `state_dict` handling through DCP, partial freezing works
(LoRA-friendly), ~7% lower memory and slightly better throughput than FSDP1.
2026 default: if you are on PyTorch and don't need NVMe offload, use FSDP2 over
DeepSpeed; the math is identical, the composition is cleaner.

**Hybrid sharding (HSDP)**: 2D mesh, FSDP-shard within a node (or a small group),
DDP-replicate across groups. Keeps the heavy all-gather traffic on NVLink and only
gradient all-reduce crosses nodes; also bounds the blast radius of a failing node.
Use when the model fits in one node's aggregate memory.

## Model parallelism

- **Pipeline parallelism (PP)**: split the model "vertically" into stages of
  consecutive layers, one stage per GPU (or group). Naive PP idles GPUs (the
  bubble); **microbatching** plus a schedule (GPipe, 1F1B, interleaved 1F1B,
  zero-bubble/ZB-H1, DualPipe in DeepSeek-V3) hides most of it. Bubble fraction
  ~ (stages-1)/microbatches. Cheap on bandwidth (only activations cross stage
  boundaries), so PP is the preferred cross-node model split.
- **Tensor parallelism (TP)**: split individual weight matrices "horizontally"
  ([Megatron-LM](../../papers/2019-09_megatron-lm/summary.md)): column-parallel
  then row-parallel pairs in MLP and attention heads across GPUs, with all-reduces
  inside every layer. Needs NVLink-class bandwidth, so keep TP within a node
  (TP <= 8 typically). **Sequence parallelism** (Megatron-style) extends TP by
  sharding the activations of LayerNorm/dropout regions along the sequence
  dimension, removing duplicated activation memory.
- **Expert parallelism (EP)**: for MoE, distribute experts across GPUs; tokens are
  routed via all-to-all. Attention/dense parts stay replicated or sharded by other
  means. Origin: [Switch Transformer](../../papers/2021-01_switch-transformer/summary.md);
  modern practice: DeepSeek-V3 (fine-grained experts, node-limited routing to cap
  all-to-all cost), Qwen3-MoE.
- **Context/sequence parallelism (CP)**: shard the **sequence dimension** of
  activations across GPUs for long-context training, since attention memory grows
  with sequence length. Two families: **Ring Attention** (pass KV blocks around a
  ring, overlapping compute and comms) and **DeepSpeed Ulysses** (all-to-all so
  each GPU holds full sequence for a subset of heads). Llama 3 used CP for its
  128k-context phase; torchtitan ships both.

## Composing it: 4D/5D parallelism

Standard mental model, outermost to innermost: **DP (FSDP/HSDP) x PP x CP x TP(+SP)**,
with EP orthogonal for MoE. Rules of thumb (Ultra-Scale Playbook):

- Fit the model first: FSDP alone up to ~tens of B params on H100 nodes; add TP
  when a layer no longer fits or FSDP comms dominate; add PP across nodes for
  100B+; add CP only for long sequences; EP for MoE.
- Keep bandwidth-hungry parallelism (TP, EP dispatch) inside NVLink domains;
  PP and DP gradient sync across InfiniBand.
- Then scale batch via DP and gradient accumulation to hit target global batch.
- Activation checkpointing (full or selective) trades ~30% compute for large
  activation-memory savings; selective (checkpoint only attention) is the usual
  sweet spot with FlashAttention
  ([flashattention](../../papers/2022-05_flashattention/summary.md)).

## Frameworks (2026)

- **torchtitan**: PyTorch-native reference for pretraining; FSDP2 + TP + PP + CP,
  torch.compile, fp8, DCP checkpointing, torchft fault tolerance.
- **Megatron-Core / NeMo**: NVIDIA's production stack; most mature TP/PP kernels.
- **DeepSpeed**: still relevant for ZeRO-Offload/Infinity and HF Trainer integration.
- **nanotron**: HF's lightweight pretraining lib (Ultra-Scale Playbook companion).
- FSDP2 + HSDP covers the vast majority of fine-tuning and sub-70B pretraining;
  full 4D parallelism is only needed at frontier scale.
