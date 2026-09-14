# Monitoring, Experiment Tracking, and Run Hygiene

⏱ 10 min read · +4h 5m resources

Last updated: 2026-08-24

## Best resources

- [NVIDIA dcgm-exporter](https://github.com/NVIDIA/dcgm-exporter) (repo, ~20 min for the entry path): the GPU metrics exporter for Prometheus; also NVIDIA's [GPU telemetry docs](https://docs.nvidia.com/datacenter/cloud-native/gpu-telemetry/latest/) (docs, ~30 min for the core pages).
- [kube-prometheus-stack chart](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack) (repo, ~25 min for the entry path): Prometheus + Grafana + Alertmanager in one Helm release.
- [PyTorch: debugging distributed hangs with the NCCL flight recorder](https://docs.pytorch.org/tutorials/prototype/flight_recorder_tutorial.html) (~25 min): the tool for "everything is stuck and nothing errored".
- [W&B docs](https://docs.wandb.ai/) (docs, ~60 min for the core pages) and [MLflow docs](https://mlflow.org/docs/latest/) (docs, ~60 min for the core pages): the two tracking references.
- [torch.distributed.checkpoint docs](https://docs.pytorch.org/docs/stable/distributed.checkpoint.html) (~25 min): sharded, resharding-capable checkpointing.

## GPU metrics: Prometheus + Grafana + DCGM exporter

The standard stack: **DCGM exporter** (a DaemonSet on K8s, installed by the GPU Operator; a systemd service or container on SLURM nodes) reads NVIDIA DCGM and exposes `/metrics`; **Prometheus** scrapes it; **Grafana** renders the standard NVIDIA DCGM dashboard plus your own. On K8s, kube-prometheus-stack gives you the whole spine (node exporter, Alertmanager, operators) and DCGM exporter labels metrics with pod/namespace so GPU usage maps to workloads and teams.

Metrics that earn their dashboard slots:

- `DCGM_FI_DEV_GPU_UTIL` (coarse) and, better, `DCGM_FI_PROF_SM_ACTIVE` / `SM_OCCUPANCY` / `PIPE_TENSOR_ACTIVE`: is the GPU actually computing or just allocated? Tensor-core activity is the honest utilisation metric for training.
- `DCGM_FI_DEV_FB_USED`: memory headroom and leak detection.
- `DCGM_FI_DEV_GPU_TEMP`, `POWER_USAGE`, and clock **throttle reasons**: thermally throttled GPUs are silent stragglers that stall whole NCCL collectives.
- `DCGM_FI_DEV_ECC_DBE_VOL_TOTAL` (double-bit ECC), row-remap counters, and `DCGM_FI_DEV_XID_ERRORS`: leading indicators of a node about to kill your job (Xid 79 = GPU fell off the bus; 48/63/64 = ECC trouble).
- NVLink/PCIe error counters and, on EFA clusters, the EFA counters from the node exporter side.

## What to alert on for training jobs

Infra metrics alone miss the most expensive failure mode: the job that is *running* but not *progressing*. Alert on both layers.

**Job progress (from your training loop, pushed to Prometheus via pushgateway or scraped from a rank-0 metrics endpoint; or W&B alerts):**

- **Throughput drop**: tokens/s or samples/s below X% of the run's rolling baseline for N minutes. Catches stragglers, dataloader starvation, storage slowdowns.
- **No step progress**: `step` counter unchanged for M minutes. This is the NCCL-hang detector; pair with `TORCH_NCCL_TRACE_BUFFER_SIZE` (flight recorder) so the hang dumps collective state, and rely on the watchdog timeout (`TORCH_NCCL_HEARTBEAT_TIMEOUT_SEC` and friends) to convert silent hangs into loud crashes.
- **Loss is NaN/inf or grad-norm explosion**: cheap to emit, saves GPU-days.
- **Checkpoint staleness**: time since last successful checkpoint upload exceeds the interval by 2x. A run that computes but cannot checkpoint is accumulating risk.

**Node health (from DCGM/node exporter):**

- Any ECC DBE / Xid error, then drain the node, do not wait (HyperPod's health monitoring agent automates exactly this).
- Sustained thermal/power throttling on any GPU in an active allocation.
- GPU utilisation ~0 on nodes holding an allocation for more than ~15 min: either a hang or an idle reservation, both worth a page; also the top cost-leak alarm.
- Disk pressure on local NVMe (dataloader caches), `/dev/shm` exhaustion, filesystem (FSx) throughput saturation.

## W&B vs MLflow

Same job (log params/metrics/artifacts per run, compare runs), different centres of gravity:

- **W&B**: hosted-first SaaS (CoreWeave-owned since 2025), best-in-class run comparison UI, system metrics (GPU util per run) captured automatically, Sweeps, Reports, Artifacts with lineage; Launch and Weave for jobs and LLM tracing. Costs real money at team scale, and your metrics live with a vendor (self-hosting exists but is not the happy path). The default for research-style deep learning and large training runs.
- **MLflow**: open source, self-hostable, Databricks-backed; tracking + **model registry** (staging/production model promotion) + serving hooks; MLflow 3.x added serious GenAI features (tracing, prompt/eval tooling). The UI is weaker for fifty-run visual comparisons, but the registry is the piece W&B lacks a strong equivalent of, and managed MLflow now exists inside SageMaker itself.
- Common pattern: W&B for training-time experiment tracking, MLflow registry for deployment-side model governance. If you must pick one OSS thing, MLflow; if research velocity dominates, W&B.

Practices that matter more than the tool: log the exact config object (resolved, not the CLI args), git SHA + dirty flag, container image digest, dataset version/hash, and world size on every run; name runs by convention (`proj-arch-tokens-lr`); log system metrics so "slow run" is diagnosable months later; make the tracker the index, S3 the storage (do not upload 100 GB checkpoints as tracker artifacts, log their S3 URI).

## Checkpoint/restart hygiene

The contract with preemption, spot, and HyperPod auto-resume is: **any job can be killed at any moment and must resume losslessly on its own.**

- Use sharded distributed checkpointing (`torch.distributed.checkpoint`, DCP): every rank writes in parallel, and DCP can **reshard** on load (resume 512-GPU state on 256 GPUs). Save model + optimizer + LR scheduler + dataloader/sampler state + RNG states per rank + step/epoch counters; a checkpoint missing optimizer or data state is not a checkpoint.
- Atomicity: write to `step-N.tmp/`, fsync/upload, then rename or write a `latest` marker last. Resume logic reads the marker, never "newest directory" (partial uploads look newest).
- Asynchronous checkpointing (DCP async, or CPU-offload then background upload) keeps GPU stall to seconds; checkpoint interval is an economics decision: interval ≈ sqrt(2 x MTBF x checkpoint_cost) is the classic optimum, in practice every 15-60 min at multi-node scale.
- Retention: keep last k + milestones (see S3 lifecycle notes in [terraform-and-aws-ml.md](terraform-and-aws-ml.md)).
- **Test the resume path** deliberately: kill a node mid-run in staging and diff the loss curve against an unkilled control. An untested resume path is broken.

## Run reproducibility

- Pin the trinity: **code** (git SHA, no dirty trees in real runs), **environment** (container image digest, not `latest`; lockfiles), **data** (immutable versioned prefixes or content hashes; never train from a mutable "current/" path).
- Seed everything and log the seeds; know the limits: exact bitwise reproducibility across runs costs performance (`torch.use_deterministic_algorithms(True)`, `CUBLAS_WORKSPACE_CONFIG`) and is usually reserved for debugging; cross-hardware or different-world-size bitwise equality is effectively off the table because float reduction order changes. The practical bar: same config + same data order reproduces the loss curve within noise.
- Data order is part of the run: seeded, checkpointable samplers, so resume does not replay or skip data.
- The tracker ties it together: a run page from which you could re-launch the exact job (config + SHA + image + data version) is the definition of done.
