# SLURM for ML

⏱ 10 min read · +3h 15m resources

Last updated: 2026-08-24

### Best resources

- [Slurm official docs](https://slurm.schedmd.com/documentation.html) (docs, ~45 min for the core pages): sbatch/srun man pages are genuinely the best reference; also the [containers guide](https://slurm.schedmd.com/containers.html) (~20 min) and [GRES guide](https://slurm.schedmd.com/gres.html) (~15 min).
- [PyTorch multinode DDP tutorial](https://docs.pytorch.org/tutorials/intermediate/ddp_series_multinode.html) (~30 min): canonical torchrun-on-a-cluster walkthrough.
- [CSC multi-GPU/multi-node ML guide](https://docs.csc.fi/support/tutorials/ml-multi/) (~30 min): best practical HPC-centre writeup of SLURM + DDP.
- [NVIDIA Pyxis](https://github.com/NVIDIA/pyxis) (repo, ~15 min for the entry path) and [Enroot](https://github.com/NVIDIA/enroot) (repo, ~15 min for the entry path): the container plugin stack used by HyperPod, DGX clusters, and MLPerf submissions.
- [AWS ParallelCluster Pyxis tutorial](https://docs.aws.amazon.com/en_us/parallelcluster/latest/ug/tutorials_11_running-containerized-jobs-with-pyxis.html) (~25 min): the AWS-flavoured setup you will recognise from HyperPod.

### Mental model

SLURM is a batch scheduler with three core objects: **nodes** (machines with resources, including GRES like GPUs), **partitions** (named queues over node sets, with limits and priority), and **jobs** (resource requests + a script). An **allocation** is the granted resource set; `srun` launches **job steps** inside it. Gang scheduling is implicit: a job starts only when all requested nodes are available simultaneously, which is exactly what synchronous data-parallel training needs and exactly what vanilla Kubernetes lacks.

### Partitions, QOS, accounts

- `sinfo` shows partitions and node states (`idle`, `alloc`, `mix`, `drain`, `down`).
- Partitions carry `MaxTime`, `Priority`, default/max resources; typical ML clusters split e.g. `dev` (short, interactive-friendly), `train` (long, big), `low` / `preempt` (scavenger).
- **QOS** (quality of service) layers per-user/per-account limits and preemption rules on top: `sacctmgr show qos`, request with `--qos=`. Priority is computed by the multifactor plugin (age, fairshare, QOS, partition, size); inspect with `sprio`.
- Fairshare means your recent heavy usage lowers your future priority; `sshare` shows where you stand.

### sbatch, srun, and the request language

```bash
#!/bin/bash
#SBATCH --job-name=llm-pretrain
#SBATCH --partition=train
#SBATCH --nodes=4
#SBATCH --ntasks-per-node=1        # one launcher per node; torchrun spawns the rest
#SBATCH --gpus-per-node=8          # or: --gres=gpu:h100:8
#SBATCH --cpus-per-task=96
#SBATCH --mem=0                    # all memory on the node
#SBATCH --time=48:00:00
#SBATCH --exclusive
#SBATCH --output=logs/%x_%j.out    # %x job name, %j job id
#SBATCH --signal=B:USR1@120        # signal 120s before timeout, for checkpointing
```

Key distinctions:

- `sbatch` queues a script; `srun` launches tasks (inside an allocation, or creates one ad hoc); `salloc` gives an interactive allocation.
- `--ntasks` is the number of processes SLURM launches. For torchrun the standard pattern is one task per node and let torchrun fork per-GPU workers; for `srun`-native launching (e.g. with `python -m torch.distributed.run` replaced by srun) you use `--ntasks-per-node=8` and read `SLURM_PROCID`/`SLURM_LOCALID` as rank/local_rank.
- GPU requests: `--gres=gpu:8` (classic), or the newer `--gpus`, `--gpus-per-node`, `--gpus-per-task` family. `--gpus-per-task` plus `--gpu-bind` controls affinity; SLURM sets `CUDA_VISIBLE_DEVICES` per task. Check binding with `srun nvidia-smi -L`.
- Useful env vars inside a job: `SLURM_JOB_ID`, `SLURM_NNODES`, `SLURM_NODEID`, `SLURM_PROCID` (global rank), `SLURM_LOCALID`, `SLURM_JOB_NODELIST`.

### Job arrays

`#SBATCH --array=0-99%10` runs 100 tasks, max 10 concurrent; each gets `SLURM_ARRAY_TASK_ID`. This is the workhorse for sweeps, data-shard processing (datatrove's SlurmPipelineExecutor is built on arrays), and eval grids. Arrays are far cheaper for the scheduler than 100 separate jobs, and `scancel jobid_[5-20]` gives you granular control.

### Multi-node torchrun

```bash
nodes=($(scontrol show hostnames "$SLURM_JOB_NODELIST"))
head_node=${nodes[0]}
head_node_ip=$(srun --nodes=1 --ntasks=1 -w "$head_node" hostname --ip-address)

srun torchrun \
  --nnodes "$SLURM_NNODES" \
  --nproc_per_node 8 \
  --rdzv_id "$SLURM_JOB_ID" \
  --rdzv_backend c10d \
  --rdzv_endpoint "$head_node_ip:29500" \
  train.py
```

`srun` runs one torchrun per node; c10d rendezvous handles the process group. On EFA clusters (HyperPod) also export `FI_PROVIDER=efa` and let NCCL pick it up via aws-ofi-nccl. `NCCL_DEBUG=INFO` on rank 0 for bring-up, off for production. Frameworks note: HF Accelerate, Lightning, and torchtitan all read SLURM env vars and can skip the manual rendezvous dance.

### Containers: Enroot/Pyxis and Apptainer

- **Enroot** is NVIDIA's unprivileged container runtime: it flattens a Docker image into a squashfs and runs it as basically a chroot, so no daemon, no isolation tax, native GPU/EFA access. **Pyxis** is the SPANK plugin exposing it through srun: `srun --container-image=nvcr.io/nvidia/pytorch:25.06-py3 --container-mounts=/fsx:/fsx python train.py`. Pre-pull with `enroot import` to a `.sqsh` file and pass that path to avoid 256 nodes hammering the registry. `--container-name` reuses a started container across job steps.
- **Apptainer** (renamed from Singularity) is the academic-cluster standard: images are single `.sif` files, rootless by design, `apptainer exec --nv image.sif python train.py`. Same idea, different ecosystem; HyperPod/DGX land is Pyxis land.
- Slurm also has native OCI support (`--container` with an OCI bundle) but Pyxis/Apptainer remain what people actually use.

### Preemption and requeue

- Preemption is configured per partition/QOS (`PreemptType=preempt/qos`, mode `REQUEUE`, `CANCEL`, or `SUSPEND`). Scavenger-tier jobs must be **requeue-safe**: `#SBATCH --requeue`, idempotent setup, and resume-from-latest-checkpoint as the default code path, not an option.
- `--signal=B:USR1@120` + a signal handler that checkpoints and exits cleanly is the standard graceful-preemption pattern.
- HyperPod's auto-resume works the same way from the job's side: node fails, agent replaces it, job is requeued; your script must find its own latest checkpoint.

### Debugging failed distributed jobs

Order of operations when a 32-node job dies:

1. `sacct -j <jobid> --format=JobID,State,ExitCode,NodeList,Elapsed`: which step failed, which node, OOM-killed (exit 0:125-ish or `OUT_OF_MEMORY` state)?
2. Grep per-node logs (use `--output=logs/%x_%j_%N.out` to split by node). The first error in time matters; NCCL timeouts on 31 nodes are usually symptoms of one node's real crash (OOM, ECC error, dataloader exception).
3. NCCL stalls with no error: suspect a straggler or network. `NCCL_DEBUG=INFO`, check `TORCH_NCCL_TRACE_BUFFER_SIZE` flight recorder dumps (PyTorch's NCCL flight recorder), and py-spy dump the hung ranks to see where they diverge.
4. Hardware: `nvidia-smi -q -d ECC,ROW_REMAPPER` on the suspect node, `dmesg` for Xid errors (Xid 79 = fell off the bus, 48/63/64 = ECC). On HyperPod, the health monitoring agent usually catches these first and drains the node.
5. Reproduce small: same script, `--nodes=2`, same container. Most "cluster bugs" are code bugs that only trigger at rank counts where a shard is empty or uneven.
Common footguns: mismatched NCCL/driver versions across nodes, `/dev/shm` too small in containers (dataloader workers die silently), heterogeneous node types in one job, and forgetting `--exclusive` so a noisy neighbour steals CPU from your dataloaders.
