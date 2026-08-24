# Kubernetes for ML (a learning track for a SLURM native)

Last updated: 2026-08-24

## Best resources

- [Kubernetes concepts docs](https://kubernetes.io/docs/concepts/): read Pods,
  Deployments, Jobs, Services first; skip the rest until needed.
- [Kueue docs](https://kueue.sigs.k8s.io/docs/concepts/): ClusterQueue/LocalQueue and
  [all-or-nothing scheduling](https://kueue.sigs.k8s.io/docs/concepts/all_or_nothing/).
- [NVIDIA GPU Operator docs](https://docs.nvidia.com/datacenter/cloud-native/gpu-operator/latest/):
  the one component that makes GPUs on K8s sane; includes MIG and time-slicing.
- [Kubeflow Trainer v2 intro](https://blog.kubeflow.org/trainer/intro/) and the
  [trainer repo](https://github.com/kubeflow/trainer): the modern TrainJob API.
- [k3s docs](https://docs.k3s.io/): the single-binary distribution for the home lab.
- [KubeRay docs](https://docs.ray.io/en/latest/cluster/kubernetes/index.html): Ray on
  K8s, increasingly the pragmatic training/data layer on top.

## Why bother, coming from SLURM

SLURM answers "give me 4 nodes for 48 hours". Kubernetes answers "keep this system
running forever and reconcile reality toward my declared spec". K8s is worse at batch
gang scheduling (bolted on via Kueue) but wins at: serving models, multi-tenancy,
self-healing services, one API for training + inference + data services, and being
the industry's shared platform (every vendor ships a Helm chart, not an sbatch
script). The 2026 stack for ML on K8s has largely converged: GPU Operator + Kueue +
(Kubeflow Trainer or KubeRay) + vLLM/KServe for serving.

## SLURM-to-K8s translation table

| SLURM concept | Nearest K8s concept | Notes |
|---|---|---|
| Node | Node | Same idea; kubelet instead of slurmd |
| Partition | Node pool + taints/labels + Kueue ClusterQueue | No single equivalent; queueing lives in Kueue, placement in selectors/taints |
| Job (sbatch) | Job (batch/v1) or TrainJob | K8s Job = run N pods to completion; `completions`, `parallelism`, `backoffLimit` |
| Job step (srun) | Container / Pod exec | No real step concept |
| Allocation | Pod resource requests (granted) | Requests are scheduling currency |
| GRES gpu:8 | `resources.limits: nvidia.com/gpu: 8` | Whole GPUs unless MIG/time-slicing |
| QOS / fairshare | Kueue ClusterQueue quotas, priorities, preemption | Kueue is the fairshare layer |
| Gang scheduling (native) | Kueue all-or-nothing / PodGroup (Volcano) / KEP-4671 | The big historical gap; now solved-ish |
| Job array | Indexed Job (`completionMode: Indexed`) | `JOB_COMPLETION_INDEX` env var |
| `squeue` / `sinfo` | `kubectl get pods,jobs` / `kubectl get nodes` | Plus `kubectl describe` for the why |
| `scancel` | `kubectl delete job` | Deletion cascades to pods |
| Prolog/epilog | Init containers / operators / hooks | |
| Shared FSx/NFS mount | PersistentVolume + PVC | Storage is explicit and API-driven |
| Env modules / containers | Everything is a container image | No escape hatch; this is the point |

## Core objects (the 20% you need)

- **Pod**: one or more containers sharing network/volumes; the atomic scheduling
  unit. Pods are cattle: they die and are replaced, never repaired.
- **Deployment**: keeps N replica pods of a service running (rolling updates). For
  inference servers, not training.
- **Job**: runs pods to completion with retries; **Indexed Job** gives each pod a
  stable index (rank). **CronJob** = scheduled Job.
- **Service**: stable virtual IP/DNS over a changing set of pods. **Headless
  service** gives per-pod DNS, which is how training pods find rank 0.
- **ConfigMap/Secret**: injected config; **PVC**: claimed storage.
- **Namespace**: multi-tenancy boundary; **RBAC** controls who does what.
- Everything is YAML declaring desired state; controllers reconcile. `kubectl apply`,
  `kubectl get`, `kubectl describe`, `kubectl logs`, `kubectl exec` cover 90% of life.

## GPU scheduling

- **NVIDIA device plugin** advertises `nvidia.com/gpu` as a schedulable resource. In
  practice you install the **GPU Operator**, which manages the driver, container
  toolkit, device plugin, DCGM exporter, and MIG configuration as one Helm release.
- GPUs are requested in `limits` and are integer and exclusive by default.
- **MIG** partitions A100/H100/B200-class GPUs into hardware-isolated slices
  (`nvidia.com/mig-3g.40gb: 1`); right for inference and small jobs, wrong for
  training throughput.
- **Time-slicing** oversubscribes a GPU across pods with zero isolation (shared
  memory, no fairness); fine for a home lab and bursty dev pods, dangerous in prod.
- **DRA (Dynamic Resource Allocation)** is the newer K8s-native resource API the GPU
  ecosystem is migrating toward (ResourceClaims instead of the device-plugin integer
  model); know it exists.

## Requests vs limits (the concept SLURM never made you learn)

Every container declares `requests` (what the scheduler reserves; your bill) and
`limits` (hard cap; CPU throttled above it, memory OOM-killed above it). GPUs must
have request == limit. The classic ML failure: generous CPU limit but small request,
node gets packed, your dataloader is throttled, GPU util drops, nobody sees why. For
training pods: set requests = limits (Guaranteed QoS class), request whole nodes
where possible, and mount ample `/dev/shm` (emptyDir with `medium: Memory`).

## Batch scheduling: Kueue

Raw kube-scheduler places pods one by one: a 16-pod training job can deadlock at 12
pods forever holding GPUs. **Kueue** fixes this at the admission layer: jobs are
suspended until a **ClusterQueue** (cluster-wide quota pool, e.g. "team-nlp gets 64
H100s, can borrow 32 more") admits the whole workload atomically; **LocalQueue** is
the namespaced handle users submit to. You get quotas, borrowing/lending between
teams, priority-based preemption, all-or-nothing admission (gang), and **Topology
Aware Scheduling** (pack pods on the same rail/spine for NCCL bandwidth). Kueue is
the fairshare + QOS layer of SLURM, rebuilt for K8s, and is the de facto standard
(native gang scheduling is also landing in upstream K8s via KEP-4671, with Kueue as
the intended consumer). **Volcano** is the older alternative (PodGroups, its own
scheduler), still common in Chinese-cloud and Spark-on-K8s stacks.

## Training operators

- **Kubeflow Trainer v2** (v2.0 July 2025, v2.2 March 2026): one **TrainJob** CRD
  replacing PyTorchJob/TFJob/MPIJob, with **TrainingRuntime** templates (torch
  distributed, DeepSpeed, MPI, JAX), built-in Kueue/Volcano gang integration, and a
  Python SDK so users never write YAML. It sets up the headless services, ranks, and
  `MASTER_ADDR` that you would otherwise hand-roll with Indexed Jobs.
- **KubeRay** runs Ray clusters as CRDs (RayCluster/RayJob); you then use Ray Train /
  Ray Data on top. Increasingly popular because one Ray abstraction covers data
  preprocessing + training + serving.
- Hand-rolled **Indexed Job + headless Service + torchrun** is fine to learn the
  mechanics and for simple cases; operators earn their keep at restart semantics,
  elastic scaling, and gang integration.

## Helm, briefly

Helm is templated-YAML package management: `helm install kube-prometheus-stack`,
`values.yaml` for overrides, releases are upgradable/rollbackable. You will consume
charts (GPU operator, Kueue, Prometheus, vLLM) far more often than you author them.
For your own apps, plain manifests + Kustomize overlays are often cleaner; Terraform's
helm provider ties chart installs into your IaC.

## k3s home-lab route (dual GPU)

1. **k3s** single-node: one binary, batteries included (containerd, traefik, local
   storage). `curl -sfL https://get.k3s.io | sh -`. Ignore multi-node until later.
2. Install NVIDIA drivers + nvidia-container-toolkit on the host; k3s's containerd
   detects the runtime, then deploy the **device plugin** (or full GPU Operator with
   `driver.enabled=false`) so `nvidia.com/gpu: 2` appears in `kubectl describe node`.
3. Milestones, in order: (a) a Pod that runs `nvidia-smi`; (b) a batch Job running
   single-GPU finetune from your own image; (c) Indexed Job + headless service
   running 2-GPU torchrun DDP; (d) install Kueue, put a 2-GPU quota on one
   ClusterQueue, watch jobs queue and gang-admit; (e) kube-prometheus-stack + DCGM
   exporter dashboard; (f) vLLM Deployment + Service serving a small model; (g)
   time-slicing config to oversubscribe GPUs for dev pods.
4. That sequence covers every concept above with hardware you own, and maps 1:1 onto
   what an EKS/HyperPod-EKS cluster does at work.
