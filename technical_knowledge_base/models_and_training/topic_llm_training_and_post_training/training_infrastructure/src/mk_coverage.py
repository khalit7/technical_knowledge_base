"""Every fact in live.md, where the HTML carries it, and a phrase that must appear in ../index.html.
Writes coverage.json. Run from src/: python3 mk_coverage.py"""
import json, re, html as H

page = open("../index.html", encoding="utf-8").read()
text = H.unescape(page)
F = [
 # Best resources
 ("Best resource: torchtitan paper ICLR 2025, 45 min", "Further reading, Best resources", "torchtitan paper (ICLR 2025)"),
 ("Best resource: torchtitan repo, ~40 min entry path", "Further reading", "repo, about 40 min"),
 ("torchtitan: PyTorch-native production pretraining reference (4D parallelism, DCP, torchft)", "Further reading; Reading, Frameworks", "PyTorch-native production pretraining reference"),
 ("Llama 3 paper infrastructure section: best public account of failures at 16k-GPU scale; summary in Llama 3 page", "Further reading (Llama 3 page and §3.3 link)", "The best public account of failures at 16K-GPU scale"),
 ("Best resource: PyTorch torchft blog ~30 min, checkpoint-free fault tolerance", "Further reading", "Checkpoint-free fault tolerance in practice"),
 ("Best resource: AWS SageMaker HyperPod docs ~1h", "Further reading", "AWS SageMaker HyperPod docs"),
 ("Best resource: NVIDIA NeMo Framework docs ~1h", "Further reading", "NVIDIA NeMo Framework docs"),
 ("Managed-cluster and enterprise stacks", "Further reading (HyperPod, NeMo cards)", "The managed-cluster stack"),
 # Stack
 ("Hardware: GPU nodes 8xH100/H200/B200 class", "Reading, The stack (Hardware layer)", "H100, H200, B200 class"),
 ("NVLink/NVSwitch inside the node", "Reading, The stack", "NVLink and NVSwitch inside"),
 ("InfiniBand or EFA (AWS) across nodes", "Reading, The stack", "InfiniBand, RoCE or EFA between"),
 ("Parallel filesystem (Lustre/FSx, GPFS) or object storage for data and checkpoints", "Reading, The stack", "Lustre, FSx, GPFS or object storage"),
 ("See Topic: hardware", "Reading, stack layer detail; Further reading", "Topic: hardware"),
 ("SLURM dominant for research and most LLM labs; Kubernetes more common for inference and platform teams", "Reading, The stack, Correction (kept as a judgement, marked unconfirmed)", "is a judgement no source here measures"),
 ("Kubernetes with Kubeflow/Volcano", "Reading, The stack (Scheduler layer)", "Kubernetes with Kubeflow, Volcano or Kueue"),
 ("SLURM = job queues, gang scheduling, sbatch/srun, topology-aware placement", "Reading, The stack (Scheduler layer) and Correction on gang scheduling", "topology-aware placement"),
 ("Gang scheduling (corrected: SLURM's term means time-slicing)", "Reading, Correction", "gang scheduling</a> means time-slicing"),
 ("AWS SageMaker HyperPod: supercomputer as a service", "Reading, Recovery; stack layer", "supercomputer as a service"),
 ("HyperPod: provisioned EFA-connected clusters with SLURM or EKS as orchestrator", "Reading, Recovery", "EFA-connected clusters with SLURM or EKS"),
 ("HyperPod: deep health checks, automatic faulty-node replacement, job auto-resume from checkpoint", "Reading, Recovery", "srun --auto-resume=1"),
 ("Equivalents: GCP Cluster Toolkit / Vertex, Azure CycleCloud", "Reading, Recovery", "Azure CycleCloud"),
 ("CoreWeave/Lambda/Nebius neoclouds", "Reading, Recovery", "CoreWeave, Lambda, Nebius"),
 ("Experiment layer: W&B/MLflow/TensorBoard, config management, data versioning", "Reading, Checklist item 4; stack layer", "config management and data versioning"),
 ("See Topic: ml-infra-and-orchestration", "Reading, Checklist; Further reading", "Topic: ml-infra-and-orchestration"),
 # Frameworks
 ("Megatron-LM / Megatron-Core: NVIDIA's TP/PP/EP reference", "Reading, Frameworks", "NVIDIA's reference for tensor, pipeline, expert"),
 ("Kernels and parallelism most frontier-scale runs trace back to (Megatron-LM paper)", "Reading, Frameworks", "most frontier-scale codebases trace their kernels and layouts back to it"),
 ("NeMo: enterprise suite wrapping Megatron-Core", "Reading, Frameworks", "the suite around Megatron Core"),
 ("NeMo Curator (data prep)", "Reading, Frameworks", "NeMo Curator (data)"),
 ("NeMo-RL (alignment)", "Reading, Frameworks", "NeMo RL"),
 ("Deployment (NIM)", "Reading, Frameworks, Corrections (NIM is separate; Export and Deploy)", "deployment (NIM)"),
 ("NeMo default on HyperPod-with-NVIDIA engagements (HyperPod + NeMo + SLURM)", "Reading, Frameworks, Corrections (unconfirmed)", "HyperPod + NeMo + SLURM"),
 ("torchtitan: FSDP2 + TP + PP + CP on DTensor/DeviceMesh", "Reading, Frameworks", "composed on DTensor and DeviceMesh"),
 ("torchtitan: torch.compile, fp8, async DCP, torchft integration (fp8 now MXFP8 and NVFP4)", "Reading, Frameworks", "MXFP8 and NVFP4 training"),
 ("torchtitan: cleanest codebase to learn 4D parallelism from", "Reading, Frameworks", "The cleanest codebase to learn 4D parallelism from"),
 ("DeepSpeed: ZeRO family, offload; common via HF Trainer/Accelerate", "Reading, Frameworks", "still common through the Hugging Face Trainer and Accelerate"),
 ("HF stack (accelerate/Trainer/TRL/nanotron), Axolotl, torchtune: fine-tuning and post-training tiers", "Reading, Frameworks", "Fine-tuning and post-training tiers"),
 ("torchtune (stale: no longer maintained)", "Reading, Frameworks, Corrections", "torchtune</b> is no longer maintained"),
 ("RL post-training infra (verl, OpenRLHF, SkyRL, NeMo-RL)", "Reading, Frameworks", "OpenRLHF"),
 ("RL infra adds a rollout engine (vLLM/SGLang) plus trainer weight-sync; see Alignment page", "Reading, Frameworks", "a rollout engine (vLLM or SGLang)"),
 ("See Alignment: SFT, RLHF, DPO Family, RLVR", "Reading, Frameworks; Further reading", "Alignment: SFT, RLHF, DPO Family, RLVR"),
 # Checkpointing
 ("What is saved: model shards, optimizer states, dataloader/RNG state, step counters; sharded per rank", "Reading, Checkpointing", "dataloader position and random-number-generator state"),
 ("Optimizer states 2x model size for Adam (corrected: 2x in count, 6x bf16 weights in bytes)", "Reading, Checkpointing, Correction", "2x model size for Adam"),
 ("PyTorch DCP: DTensor-based, parallelism-agnostic save/load", "Reading, Checkpointing", "it is parallelism-agnostic"),
 ("DCP reshards automatically when world size or layout changes; torch.distributed.checkpoint", "Reading, Checkpointing", "handles load-time resharding"),
 ("Async checkpointing: background thread after fast device-to-host copy", "Reading, Checkpointing; animation", "a background thread writes to storage"),
 ("torchtitan reports 5-15x lower overhead vs synchronous DCP (Llama 3.1 8B)", "Reading, Checkpointing", "5 to 15 times lower overhead"),
 ("Hierarchical/tiered schemes: local NVMe first, object storage later", "Reading, Checkpointing (tiers: host memory then HDFS)", "keeping a recent copy close"),
 ("Peer-replicated in-memory checkpoints as in Gemini/MegaScale (corrected)", "Reading, Checkpointing, Correction", "mixes three systems"),
 ("Cadence math: expected lost work = interval/2; choose interval from MTBF and checkpoint cost", "Reading, How often to checkpoint; calculator", "half an interval of lost work"),
 ("At frontier scale (3h MTBF observed on 16k GPUs) frequent async checkpoints are mandatory", "Reading, Failures and How often to checkpoint", "3.1 hours"),
 ("Convert DCP checkpoints to serving formats (HF safetensors) as explicit pipeline step", "Reading, Checkpointing", "safetensors as an explicit step"),
 ("Keep optimizer-free eval snapshots cheap", "Reading, Checkpointing; calculator (2 B option)", "model-only snapshots for evaluation"),
 # Failures
 ("Llama 3's 54-day run: 419 unexpected interruptions on 16k H100s", "Reading, Failures are routine", "419 unexpected"),
 ("58.7% GPU-related (corrected to 64.0% by count)", "Reading, Failures, Correction", "64.0%"),
 ("HBM/ECC errors", "Reading, Failures (Table 5 list), stack walk", "GPU HBM3 memory 72"),
 ("Falling off the bus (not a Table 5 category)", "Reading, Failures, Correction", "Falling off the bus"),
 ("Plus network, host, filesystem causes", "Reading, Failures (Table 5 list)", "network switches and cables 35"),
 ("MTBF around 3 hours", "Reading, Failures", "one every 3.1 h"),
 ("MTTR tens of minutes (unconfirmed for Llama 3; Meta u0 5-20 min, MegaScale figures)", "Reading, Failures, Correction; Recovery", "MTTR tens of minutes"),
 ("Detect fast: NCCL timeouts + Flight Recorder traces to find the stuck rank", "Reading, Recovery 1", "Flight Recorder keeps a ring buffer"),
 ("Node health checks (DCGM, EFA counters) before and during jobs", "Reading, Recovery 1", "Health checks before and during jobs"),
 ("Straggler detection (MegaScale-style per-rank timing): one slow GPU drags the whole synchronous step", "Reading, Stragglers", "timed every rank with CUDA events"),
 ("Auto-restart: scheduler-level requeue (SLURM --requeue, HyperPod auto-resume)", "Reading, Recovery 2", "--requeue"),
 ("Faulty-node cordon/replacement from a warm spare pool, resume from latest checkpoint", "Reading, Recovery 2", "A warm spare pool is what makes this fast"),
 ("torchft: HSDP-aware fault tolerance; replica groups run FSDP internally, fault-tolerant all-reduce across groups", "Reading, Recovery 3; stack walk", "across groups a fault-tolerant all-reduce averages gradients"),
 ("Failed group drops out and rejoins after recovering weights from a peer", "Reading, Recovery 3", "copies weights and optimizer state from a healthy peer"),
 ("Demonstrated surviving a failure every ~15s with no checkpoints (with conditions)", "Reading, Recovery 3, box", "every ~15s with no checkpoints"),
 ("Elastic training (adjust world size on the fly) standard in torchft/torchrun-elastic", "Reading, Recovery 3", "Elastic training"),
 ("SDC: rare flipped bits corrupting loss without crashing", "Reading, Stragglers and SDC", "a flipped bit that corrupts values without crashing"),
 ("SDC mitigations: loss-spike detection with rewind-and-skip, gold-run comparisons, hardware screening", "Reading, Stragglers and SDC", "rewind-and-skip"),
 # Checklist
 ("Checklist 1: burn-in and health-check nodes; keep hot spares", "Reading, Checklist", "keep hot spares"),
 ("Checklist 2: async checkpoints sized to MTBF; test restore incl. resharded restore before day 1", "Reading, Checklist", "including resharded restore"),
 ("Checklist 3: determinism where affordable (seeds, dataloader state) so restarts are bit-comparable", "Reading, Checklist", "bit-comparable"),
 ("Checklist 4: dashboards on step time, per-rank timing spread, loss, grad norm, NCCL errors, ECC counts; alert on stalls", "Reading, Checklist", "alert on stalls"),
 ("Checklist 5: log data order/shard state to attribute loss spikes to data", "Reading, Checklist", "Log data order and shard state"),
 ("Checklist 6: rehearse failure playbook: who cordons nodes, how requeue works, where Flight Recorder dumps land", "Reading, Checklist", "where Flight Recorder dumps land"),
 ("See also Distributed Training for the parallelism being orchestrated", "Reading, In one screen and Frameworks; Further reading", "The parallelism this infrastructure orchestrates"),
 ("See also Topic: ml-infra-and-orchestration for SLURM/K8s depth", "Further reading", "SLURM and Kubernetes in depth"),
 ("Header: 6 min read, +3h 55m resources (now recomputed by build.sh)", "Header", "Reading tab about"),
]
out = []
for fact, where, phrase in F:
    found = phrase in text or H.escape(phrase) in page
    out.append({"fact": fact, "where": where, "phrase": phrase, "found": found})
json.dump({"source": "live.md", "facts": out, "dropped": []}, open("coverage.json", "w"), indent=1, ensure_ascii=False)
miss = [o for o in out if not o["found"]]
print(len(out), "facts,", len(out) - len(miss), "found")
for m in miss: print("MISSING:", m["phrase"])
