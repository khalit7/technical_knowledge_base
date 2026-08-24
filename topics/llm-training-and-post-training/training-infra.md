# Training Infrastructure

## Best resources

- [torchtitan paper (ICLR 2025)](https://arxiv.org/abs/2410.06511) and [repo](https://github.com/pytorch/torchtitan): the PyTorch-native production pretraining reference (4D parallelism, DCP, torchft).
- [Llama 3 paper, infrastructure section](../../papers/2024-07_llama-3/summary.md): the best public account of failures at 16k-GPU scale.
- [PyTorch: Fault-tolerant Llama with torchft](https://pytorch.org/blog/fault-tolerant-llama-training-with-2000-synthetic-failures-every-15-seconds-and-no-checkpoints-on-crusoe-l40s/): checkpoint-free fault tolerance in practice.
- [AWS SageMaker HyperPod docs](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod.html) and [NVIDIA NeMo Framework docs](https://docs.nvidia.com/nemo-framework/): the managed-cluster and enterprise stacks.

## The stack, bottom to top

1. **Hardware**: GPU nodes (8xH100/H200/B200 class) with NVLink/NVSwitch inside
   the node, InfiniBand or EFA (AWS) across nodes; parallel filesystem (Lustre/
   FSx, GPFS) or object storage for data and checkpoints. See `topics/hardware`.
2. **Cluster manager / scheduler**: SLURM (dominant for research and most LLM
   labs) or Kubernetes (Kubeflow/Volcano; more common for inference and industry
   platform teams). SLURM = job queues, gang scheduling, `sbatch`/`srun`,
   topology-aware placement.
3. **Managed offerings**: **AWS SageMaker HyperPod** is "supercomputer as a
   service": provisioned EFA-connected clusters with SLURM or EKS as the
   orchestrator, deep health checks, and **automatic faulty-node replacement and
   job auto-resume from checkpoint**. Equivalents: GCP Cluster Toolkit / Vertex,
   Azure CycleCloud, CoreWeave/Lambda/Nebius neoclouds.
4. **Training framework**: see below.
5. **Experiment layer**: W&B/MLflow/TensorBoard, config management, data
   versioning. See `topics/ml-infra-and-orchestration`.

## Training frameworks (2026)

- **Megatron-LM / Megatron-Core**: NVIDIA's TP/PP/EP reference; the kernels and
  parallelism most frontier-scale runs still trace back to
  ([megatron-lm](../../papers/2019-09_megatron-lm/summary.md)).
- **NVIDIA NeMo**: enterprise suite wrapping Megatron-Core: data prep (NeMo
  Curator), training, alignment (NeMo-RL), deployment (NIM); the default on
  HyperPod-with-NVIDIA engagements (the stack Khalid's FinLLM training used:
  HyperPod + NeMo + SLURM).
- **torchtitan**: PyTorch-native pretraining: FSDP2 + TP + PP + CP composed on
  DTensor/DeviceMesh, torch.compile, fp8, async DCP, torchft integration; the
  cleanest codebase to learn 4D parallelism from.
- **DeepSpeed**: ZeRO family, offload; still common via HF Trainer/Accelerate.
- **HF stack (accelerate/Trainer/TRL/nanotron)**, **Axolotl**, **torchtune**:
  fine-tuning and post-training tiers.
- RL post-training infra (verl, OpenRLHF, SkyRL, NeMo-RL) adds a rollout engine
  (vLLM/SGLang) plus trainer weight-sync; see
  [alignment-and-rlhf.md](alignment-and-rlhf.md).

## Checkpointing

- **What is saved**: model shards, optimizer states (2x model size for Adam),
  dataloader/RNG state, step counters; sharded per rank.
- **PyTorch DCP (Distributed Checkpoint)**: DTensor-based, parallelism-agnostic
  save/load: reshards automatically when world size or parallelism layout changes
  between save and load. `torch.distributed.checkpoint`.
- **Async checkpointing**: persist to storage on a background thread/process
  after a fast device-to-host copy; torchtitan reports 5-15x lower overhead vs
  synchronous DCP (Llama 3.1 8B). Hierarchical/tiered schemes (local NVMe first,
  object storage later; peer-replicated in-memory checkpoints as in
  Gemini/MegaScale training) cut effective checkpoint time further.
- **Cadence math**: expected lost work = interval/2; choose interval from MTBF
  and checkpoint cost. At frontier scale (3h MTBF observed on 16k GPUs) frequent
  async checkpoints are mandatory.
- Convert training checkpoints (DCP) to serving formats (HF safetensors) as an
  explicit pipeline step; keep optimizer-free "eval" snapshots cheap.

## Failure recovery and fault tolerance

Scale makes failure routine: Llama 3's 54-day run logged 419 unexpected
interruptions on 16k H100s (58.7% GPU-related: HBM/ECC errors, falling off the
bus; plus network, host, filesystem); MTBF around 3 hours, MTTR tens of minutes.
Defences, in increasing sophistication:

- **Detect fast**: NCCL timeouts + Flight Recorder traces to find the stuck rank;
  node health checks (DCGM, EFA counters) before and during jobs; straggler
  detection (MegaScale-style per-rank timing) because one slow GPU drags the
  whole synchronous step.
- **Auto-restart**: scheduler-level requeue (SLURM `--requeue`, HyperPod
  auto-resume) with faulty-node cordon/replacement from a warm spare pool, resume
  from latest checkpoint.
- **Checkpoint-free / in-job tolerance**: **torchft** brings HSDP-aware fault
  tolerance: replica groups run FSDP internally and join a fault-tolerant
  all-reduce across groups; a failed group drops out and rejoins after recovering
  weights from a peer (demonstrated surviving a failure every ~15s with no
  checkpoints). Elastic training (adjust world size on the fly) is standard in
  torchft/torchrun-elastic.
- **Silent data corruption (SDC)**: rare flipped bits that corrupt loss without
  crashing; mitigations: loss-spike detection with rewind-and-skip, periodic
  gold-run comparisons, hardware screening.

## Operational checklist for a big run

1. Burn-in and health-check nodes before the job; keep hot spares.
2. Async checkpoints sized to MTBF; test restore (including resharded restore)
   before day 1.
3. Determinism where affordable (seeds, dataloader state in checkpoint) so
   restarts are bit-comparable.
4. Dashboards on: step time, per-rank timing spread, loss, grad norm, NCCL
   errors, ECC counts; alert on stalls not just crashes.
5. Log data order/shard state so you can attribute loss spikes to data.
6. Rehearse the failure playbook: who cordons nodes, how requeue works, where
   Flight Recorder dumps land.

See also [distributed-training.md](distributed-training.md) for the parallelism
being orchestrated and `topics/ml-infra-and-orchestration` for SLURM/K8s depth.
