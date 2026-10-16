# The running example and the local clusters of Topic: ml-infra-and-orchestration

Every lab of the root page uses one small training job and three small clusters, so that a queue in the Scheduling lab, a rendezvous in the Launch lab, a killed node in the Failure lab, a checkpoint in the Storage lab and a GPU-hour in the Cost lab are all the same object. This folder holds the job (`train/`), the cluster definitions (`slurm/`, `k8s/`, `ray/`), the recorded runs (`runs/`), a log scrubber (`scrub.py`), a run comparer (`compare_runs.py`) and the manifest of every file with size and sha256 (`manifest.json`, made by `make_manifest.py`).

Built on 2026-10-16 on an Apple M1 Pro (10 CPU cores, 16 GB) running macOS, with Docker Desktop (engine 20.10.17; its Linux VM: 5 CPUs, 9.7 GiB, kernel 5.10.104-linuxkit, cgroup v2, aarch64). **CPU only, no real GPUs.** The machine was shared with a GPU job of another topic. Timings are rough and labelled "measured on Apple M1 Pro, Docker Desktop VM, shared machine"; schedules, event orders, logs, configs, counts and losses are deterministic.

## The job: a tiny GPT on TinyShakespeare, DDP over gloo

`train/train.py` (one file, about 200 lines) is the whole job. It runs under `torchrun` (Slurm, Kubernetes, a laptop) and inside Ray Train (`ray/ray_train.py` imports its `train()`).

| | value | why |
|---|---|---|
| model | decoder-only transformer, 2 layers, 2 heads, d_model 64, context 64, no dropout | small enough that 4 ranks fit in 2 GB of containers; no dropout so runs are deterministic |
| parameters | **112,577** | |
| data | TinyShakespeare, 1,115,394 characters, 65-character vocabulary, from karpathy/char-rnn at commit `370cbcd448eb7daf32f21a6be560b70e0b33c4e3`, sha256 `86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed` (`train/fetch_data.sh` downloads and checks it) | public, small, the same text as other topics |
| batch | a **global** batch of 32 sequences x 64 characters per step; rank r of W takes rows r, r+W, ... | the data a step sees depends only on (seed, step): not on the launcher, the host, the world size or restarts |
| optimiser | AdamW, lr 3e-3 | |
| steps | 200 by default (`--steps`) | about 2 s of compute; labs stretch it with `--step-sleep-ms` |
| parallelism | DDP, gloo backend, 1 thread per rank, `torch.use_deterministic_algorithms(True)` | gloo is the CPU stand-in for NCCL |
| checkpoint | every 50 steps (`--ckpt-every`), rank 0 writes `step_NNNNNN.pt` (model + AdamW state + step, **1,386,049 bytes**) to `--ckpt-dir`, atomically (write `.tmp`, fsync it, rename), then a `latest` pointer (also fsynced and renamed), then fsyncs the directory, then a barrier. The fsyncs were added on 2026-10-16 after every recorded run: see "Checkpoint durability" below | resume replays the same batches and optimiser state (bit-exact with 2 ranks; see "Resume exactness") |
| resume | on start, if `<ckpt-dir>/latest` exists, every rank loads it and continues from its step (`--no-resume` to ignore) | |
| logs | one JSON object per line on stdout and in `--log-dir/rank<r>.jsonl`: `ev` (start, step, ckpt, resume, crash, end), `rank`, `world`, `host`, `step`, `loss` (this rank's rows), `gloss` (mean over ranks, all-reduced: **the number to compare**), `ts` (unix time), `t` (seconds since the process started), `rss_mb`; `start` also records the launcher's environment (MASTER_ADDR/PORT, SLURM_JOB_ID, JOB_COMPLETION_INDEX, TORCHELASTIC_RESTART_COUNT, ...) | |
| failure knobs | `--crash-rank R --crash-step S` (rank R exits with code 13 after step S), `--slow-rank R --slow-ms M` (a straggler), `--step-sleep-ms M` (every rank), `--timeout-s` (process group timeout, default 120) | the Failure and Launch labs |

### Resume exactness (corrected 2026-10-16 by the Failure lab)

With **2 ranks** resume is bit-exact (checked natively on 2026-10-16: 100 steps, stop, resume to 200 gives `gloss` at steps 150 and 200 identical to an uninterrupted run). With **4 ranks** (2 nodes x 2, the labs' shape) it is **not** bit-exact: a run resumed from step 100 differs from the uninterrupted one at 2 of the 10 logged steps after the resume (steps 110 and 180) by **2.4e-7**, one float32 rounding step at a loss of about 2.4, identically on Slurm, Kubernetes, Ray and in one container; step 200 matches (2.2638769149780273). The cause, shown by experiment: DDP rebuilds its gradient buckets once per process after the first iteration (`torch/nn/parallel/distributed.py` around lines 1770-1778 in the installed 2.14.1), so a restarted process takes one step with the initial bucket layout and sums gradients in a different order; with the rebuild switched off in both runs, 4-rank resume is exact, and with 2 ranks the order cannot differ (a+b = b+a). Evidence: `../fail/runs/` (runs `exact`, `fl-*`).

### Checkpoint durability

The recorded runs used a `train.py` that wrote `step_NNNNNN.pt.tmp` and renamed it without `fsync`: crash-safe (a reader never sees a partial file, because the rename is atomic) but not power-loss-safe (after a power cut the renamed file can be empty on some file systems). On 2026-10-16 `train.py` gained `fsync` of the checkpoint before its rename, of `latest.tmp` before its rename, and of the directory after both (`fsync_path()`, defined at the end of the file so the line numbers quoted from earlier py-spy stacks, `train.py:154-166`, still match). It changes no recorded result: a native 2-rank, 200-step run before and after the change gave the same `gloss` at all 21 logged steps (2.2638769149780273 at step 200) and byte-identical checkpoints (same sha256 at steps 50 to 200). It does change what a new run's `ckpt` event times (`secs` now includes the fsyncs), and the image `mi-train:1` on the clusters still holds the earlier file: rebuild it (`docker build -t mi-train:1 train/`, then reload it into kind and rebuild `mi-slurm:1` and `mi-ray:1`) before the next cluster run, and label any new checkpoint timings "with fsync".

### The image `mi-train:1`

`train/Dockerfile`: `python:3.12-slim-trixie` pinned by digest (Python 3.12.15, Debian 13), torch 2.14.1+cpu from the PyTorch CPU index, numpy 2.5.4, `train.py` and `input.txt` in `/opt/mi`, `OMP_NUM_THREADS=1`. 971 MB. Build: `sh train/fetch_data.sh train/input.txt && docker build -t mi-train:1 train/` (do not commit `input.txt`). Measured: torchrun plus 2 ranks peak at **656 MB** of container memory (cgroup `memory.current` sampled every 0.25 s); each rank's max RSS is about 345 MB.

## The three clusters

All containers, networks and volumes are named `mi-*`. Every container has a memory and CPU cap. The fake GPUs are counted resources only: nothing can run on them.

| cluster | what runs where | caps | idle memory measured |
|---|---|---|---|
| **Slurm** 24.11.5 | `mi-slurm-ctl` (hostname `ctl`): MariaDB 11.8.6, slurmdbd, slurmctld; `mi-slurm-c1..c3` (hostnames `c1..c3`): slurmd, configless | ctl 512 MB, 1 CPU; nodes 800 MB, 2 CPUs each (2.9 GB) | about 125 MB in all |
| **Kubernetes** v1.37.0 (kind v0.33.0) with JobSet v0.13.0 and Kueue v0.20.2 | `mi-kind-control-plane`: API server, etcd, scheduler, controller manager, CoreDNS, and the Kueue and JobSet controllers (moved there); `mi-kind-worker`, `-worker2`, `-worker3`: kubelet, training pods only | control plane **1600 MB** (raised from 1300 MB on 2026-10-16 after the API server restarted at its cap; `k8s/up.sh` now sets 1600m); workers 1100 MB each; 1.5 CPUs each (4.9 GB) | about 1.9 GB (control plane 1.04 GB idle, 1.25 GiB with extra CRDs installed: watch it) |
| **Ray** 2.59.0 | `mi-ray-head` (0 CPUs for tasks): GCS, dashboard, the driver, Ray Train's controller; `mi-ray-w1`, `mi-ray-w2`: raylets and the training workers | head 1500 MB, 1 CPU; workers 1100 MB, 2 CPUs each (3.7 GB) | about 1.2 GB (head 0.7 GB) |

The caps of all three add up to about 11 GB, more than the topic's 6 GB budget, so **Ray is started only when a lab needs it and stopped after** (`ray/up.sh`, about 20 s; `ray/down.sh`). See "Resource rules" at the end.

### Slurm (`slurm/`)

**Version: Slurm 24.11.5**, the Debian 13 package `24.11.5-4+deb13u1`, not the current upstream release (26.05.5 on 2026-10-13). Backfill, multifactor priority, fairshare, preemption and GRES behave the same way in both for what the labs show; quote Slurm source at tag `slurm-24-11-5-1` so the code matches what runs, and say so on the page.

- `Dockerfile`: `mi-slurm:1` = `mi-train:1` + slurmctld, slurmd, slurmdbd, slurm-client (pinned), munge, MariaDB; one munge key baked in (lab only); users alice and carol (account teama) and bob (account teamb), same uids everywhere. 1.43 GB.
- `entrypoint.sh`: role `ctl` starts MariaDB (16 MB buffer pool), slurmdbd, slurmctld, then creates the accounts; role `node` creates the fake GPU placeholders and runs `slurmd -D --conf-server ctl` (configless: slurmd fetches `slurm.conf`, `gres.conf`, `cgroup.conf` from slurmctld).
- `slurm.conf`: `sched/backfill` (`bf_interval=2,bf_resolution=1,bf_window=60`: seconds-scale jobs), `select/cons_tres` with `CR_Core`, `priority/multifactor` dominated by fairshare (weight 10,000; age 1,000; decay half-life **10 minutes** instead of the default 7 days so a lab can watch it), usage billed in GPU-equivalents (`TRESBillingWeights="CPU=0.25,GRES/gpu=1.0"`), `preempt/partition_prio` with `PreemptMode=REQUEUE` (partition `urgent`, tier 10, requeues jobs of `batch`, tier 1, the default), `SlurmdTimeout=30` and `SlurmctldTimeout=30` (defaults 300 and 120) so node failures show in seconds, accounting through slurmdbd. Three nodes `c[1-3]`, each declared 4 CPUs, 4,000 MB (declared, not enforced) and `gpu:4`.
- `gres.conf`: **fake GPUs**. Slurm ignores a gpu GRES with no device files ("warning: Ignoring file-less GPU gpu:(null) from final GRES list", and the node goes INVAL "gres/gpu count reported lower than configured (0 < 4)"), so each node gets four empty placeholder files `/dev/mi_gpu0..3`. Slurm schedules and accounts `gres/gpu`; jobs see `SLURM_GPUS_ON_NODE` but no `CUDA_VISIBLE_DEVICES`. 12 fake GPUs in all.
- `cgroup.conf`: `CgroupPlugin=disabled`, with `proctrack/linuxproc` and `task/none`: nothing fences a job inside these containers (without it slurmd stops: "fatal: systemd scope for slurmstepd could not be set"). A real cluster uses cgroup v2 confinement.
- `up.sh` / `down.sh`: network `mi-slurm-net` (172.30.77.0/24, fixed addresses and `--add-host` for every name, because slurmctld drops a node whose name does not resolve when it starts: "_set_node_addrs: failure on c3"), volume `mi-slurm-shared` at `/shared` on all four containers (`/shared/jobs`, `/shared/out`, `/shared/ckpt`, `/shared/logs`).
- `train.sbatch`: the running example, 2 nodes x 1 task x 2 CPUs x `gpu:2`; `srun` starts one `torchrun` per node with c10d rendezvous on the first node (`scontrol show hostnames`), `--requeue`.

Use: `docker exec mi-slurm-ctl su alice -c "RUN=myrun sbatch /shared/jobs/train.sbatch --steps 400"`; `docker exec mi-slurm-ctl squeue`, `sacct`, `sshare -a`, `sprio`, `scontrol show job N`. Logs: `/var/log/slurm/slurmctld.log` in ctl, `slurmd.log` in each node. Change the config live: `docker cp slurm.conf mi-slurm-ctl:/etc/slurm/slurm.conf && docker exec mi-slurm-ctl scontrol reconfigure`. Fail a node: `docker stop mi-slurm-c2` (then `docker start mi-slurm-c2`; `ReturnToService=2` brings it back).
Start: `sh slurm/up.sh` (needs `mi-slurm:1`). Stop: `sh slurm/down.sh` (keeps the volume), `sh slurm/down.sh all` (also volume and network). Reset accounting and fairshare: `down.sh` then `up.sh` (the database lives in the ctl container).

### Kubernetes (`k8s/`)

- `kind-config.yaml`: cluster `mi-kind`, 1 control plane + 3 workers, node image pinned by digest; workers labelled `mi.example.com/block=b1` (worker, worker2) and `b2` (worker3) for topology experiments; a host folder mounted at `/shared` on every worker (a stand-in for a shared file system; `SHARED_DIR` is filled in by `up.sh`).
- `up.sh`: creates the cluster, caps the node containers with `docker update` (kind has no flag for it), applies JobSet v0.13.0 and Kueue v0.20.2 release manifests (`--server-side`), moves both controllers to the control plane (after they serve: Kueue's webhook intercepts Deployment updates and refuses them until it is up: 'failed calling webhook "mdeployment.kb.io" ... connection refused'), writes **fake GPUs** into node status (`example.com/gpu: 4` per worker, the documented "advertise extended resources" patch: no device plugin, no device), loads `mi-train:1` into the workers, applies `queues.yaml`.
- `queues.yaml`: namespace `mi`; Kueue `ResourceFlavor` default-flavor, `ClusterQueue` mi-cq (cohort mi-cohort, BestEffortFIFO, quota 4 CPUs, 3 GiB, 12 `example.com/gpu`), `LocalQueue` mi-lq. **Kueue v0.20 serves only `kueue.x-k8s.io/v1beta2`**: every manifest must use it.
- `train-jobset.yaml`: the running example as a JobSet: one replicated Job, 2 Indexed pods (1 CPU request, 900 Mi, `example.com/gpu: 2` each), each running `torchrun --nnodes=2 --nproc-per-node=2 --node-rank=$JOB_COMPLETION_INDEX` with **static** rendezvous on pod 0 through JobSet's headless Service DNS name `mi-train-node-0-0.mi-train`; label `kueue.x-k8s.io/queue-name: mi-lq` (Kueue admits the JobSet as one workload).
- Kubeflow Trainer (v2.3.0) is not installed (memory budget); the JobSet is what Trainer v2 builds on.

Use: `export KUBECONFIG=<scratch>/mi/kubeconfig`; `kubectl --context kind-mi-kind -n mi create -f k8s/train-jobset.yaml`; `kubectl get workloads,jobsets,pods -n mi`; `kubectl get events -n mi --sort-by=.lastTimestamp`; logs in `/shared/logs/<RUN>` (host side: the shared folder). Fail a node: `docker stop mi-kind-worker2`. Start: `MI_SHARED=... KIND=... KUBECTL=... MANIFESTS=... sh k8s/up.sh`. Stop without deleting: `docker stop mi-kind-control-plane mi-kind-worker mi-kind-worker2 mi-kind-worker3` (then `docker start` the same four). Delete: `kind delete cluster --name mi-kind`.

### Ray (`ray/`)

Ray runs in Linux containers, not natively on the Mac: Ray refuses multi-node clusters on macOS ("Multi-node Ray clusters are not supported on Windows and OSX", override `RAY_ENABLE_WINDOWS_OR_OSX_CLUSTER=1`), and its Unix sockets under the long scratch path exceed macOS's 103-byte limit ("AF_UNIX path length cannot exceed 103 bytes").

- `Dockerfile`: `mi-ray:1` = `mi-train:1` + `ray[default,train]==2.59.0`, with `ray_train.py` in `/opt/mi/ray`. 1.54 GB.
- `up.sh` / `down.sh`: network `mi-ray-net`, volume `mi-ray-shared` at `/shared`; `mi-ray-head` runs `ray start --head --num-cpus 0` (GCS, dashboard on 8265 inside the network, the driver and Ray Train's controller live here, no training); `mi-ray-w1`, `mi-ray-w2` each `--num-cpus 2 --resources '{"fake_gpu":2}'` (**fake**: a custom resource Ray only counts), object store 80 MB each.
- `ray_train.py`: Ray Train `TorchTrainer`, 4 workers, `{"CPU": 1, "fake_gpu": 1}` each, placement strategy PACK (so 2 per worker node), `TorchConfig(backend="gloo")`, `storage_path=/shared/results`, `FailureConfig(max_failures=0)` by default (`--max-failures`); each worker calls the same `train()`; host label `raynode<node rank>`.
- **Ray's memory-kill threshold is fixed when the raylet starts** (95% of the container limit it sees then: the byte threshold is passed in once and stored, `threshold_memory_monitor.cc` line 33, and every check compares against it, line 126): raising a running container's cap with `docker update` does not raise it (the Ray child page raised the head to 2000m and the threshold stayed 95% of 1500 MiB = 1494220800 B). To resize, change `--memory` in `up.sh` and restart Ray (`down.sh`, `up.sh`).
- Two smaller heads failed first, and the logs are kept as Failure lab evidence (`runs/ray/ray_oom_head_*.txt`): with the head at 1.4 GB and 2 ranks on it, and with the head at 1.2 GB and no ranks, Ray's memory monitor killed workers at 95% of the container limit ("Memory usage 1395638272B exceeded threshold of 1394606080B (95.0% of 1468006400B limit)").

Use: `sh ray/up.sh`; `docker exec mi-ray-head python /opt/mi/ray/ray_train.py --address auto --storage /shared/results --name myrun -- --ckpt-dir /shared/ckpt/myrun --log-dir /shared/logs/myrun`; `docker exec mi-ray-head ray status`, `ray list nodes|actors|placement-groups`. Fail a node: `docker stop mi-ray-w2`. **Stop when done**: `sh ray/down.sh` (`all` also removes volume and network).

## The three recorded runs (`runs/`)

The same job, 2 nodes x 2 ranks, seed 1234, 200 steps, checkpoints every 50, on each system, submitted the way that system expects. Logs are scrubbed (`scrub.py`: ANSI codes, container IPs replaced by `<ip-N>`, no user paths or host names).

| run | how | files |
|---|---|---|
| `runs/slurm/` | `sbatch train.sbatch` as alice, job 1, nodes c[1-2], COMPLETED, 10 s elapsed by sacct (submit 01:10:20, start 01:10:21, end 01:10:31, UTC in the containers) | `rank0..3.jsonl`, `job.out`, `sacct.txt` |
| `runs/k8s/` | `kubectl create -f train-jobset.yaml`: Kueue created Workload `jobset-mi-train-63335`, reserved quota and admitted it in the same second (01:48:22 UTC), pods on worker3 and worker2, JobSet completed at 01:48:40 (18 s from create to completion; image already on the nodes) | `rank0..3.jsonl`, `pods.log`, `events.txt` (the full event order: suspended, workload created, quota reserved, admitted, resumed, scheduled, started, completed), `workload.yaml`, `jobset.yaml` |
| `runs/ray/` | `ray_train.py` on the head | `rank0..3.jsonl`, `driver.out`, the two OOM logs |

`python compare_runs.py runs/slurm runs/k8s runs/ray` compares the global loss at every logged step. Slurm, Kubernetes and Ray agree **bit for bit** at all 21 logged steps (`runs/compare.json`) (step 200: 2.2638769149780273): same image, same torch build, same world size, same data order, and gloo's all-reduce order is fixed for a given world size. A native macOS run (torch 2.14.1 macOS wheel, 4 ranks) gave the same value to 6 decimals; it is not expected to match bit for bit (different BLAS build).

## Known traps in these clusters (found by the labs, 2026-10-16)

- **Never use `sbatch --export=...` here.** In these unprivileged Slurm containers `sbatch --export=ALL,VAR=x` made slurmd die (`fatal: clone: Operation not permitted`) and the node went down. Pass variables through sbatch's own environment instead: `docker exec mi-slurm-ctl su alice -c "VAR=x sbatch ..."` (sbatch exports the caller's environment by default). Launch lab.
- **`AccountingStorageEnforce` is not set (none)**, so association and QOS limits (`GrpTRES`, `MaxTRESPerUser`, ...) are stored but not enforced, and `AssocGrpGRES` / `QOSMaxGRESPerUser` never appear unless you switch it on (`AccountingStorageEnforce=associations,limits,qos`, as the Slurm child page did for its Why pending? runs, then restore). Slurm child page.
- **torchrun `--max-restarts` across two nodes needs `TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1`** with torch 2.14.1 and the c10d rendezvous: without it the in-job restart failed both times tried (`Gloo connectFullMesh failed ... SO_ERROR: Connection refused`), because the rendezvous store server is created once and reused across rounds (`dynamic_rendezvous.py` lines 1209-1218); with it the restart resumed 3.4 s after the crash. Failure lab (`../fail/scripts/fl_train.sbatch`, `FL_NOSHARE=1`).
- **Kueue's pod webhook is fail-closed** (`mpod.kb.io`, `failurePolicy: Fail`, every namespace except kube-system and kueue-system): if the API server restarts and Kueue's controller with it, no pod can be created until Kueue serves again. Another reason to keep the control plane under its cap. Kubernetes for ML child page.
- **The kind control plane** ran at its old 1.27 GB cap until the API server restarted under memory pressure (memory.events max 3367, no oom_kill) at about 03:16 UTC; the Scheduling lab raised it to 1600m with `docker update`, and `k8s/up.sh` now creates it at 1600m.

## Resource rules (2026-10-16; the Mac kernel-panicked under overload the day before)

- Run `sh <scratch>/inf/guard.sh` before starting a cluster or a training run; if it prints HIGH, do light work only.
- Caps: Slurm 2.9 GB, kind 4.9 GB (left running), Ray 3.7 GB (on demand). Slurm and kind idle use about 2 GB together; a 2 x 2 training run adds about 1.3 GB on whichever system runs it. Run one training workload at a time where possible, and stop Ray when done.
- Inside containers: 1 thread per rank (`OMP_NUM_THREADS=1`); a 4-rank run uses 4 CPUs.
- Nothing here is privileged except the kind node containers, which kind always runs privileged (they run a container runtime and kubelet inside). The Slurm and Ray containers are unprivileged.
