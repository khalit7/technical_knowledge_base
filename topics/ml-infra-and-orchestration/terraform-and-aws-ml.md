# Terraform and the AWS ML Stack

⏱ 11 min read · +3h 5m resources

### Best resources

- [Terraform style/structure guide (HashiCorp)](https://developer.hashicorp.com/terraform/language/style) (docs, ~35 min for the core pages): official patterns for modules, state, and workspaces.
- [SageMaker HyperPod docs](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod.html) (docs, ~40 min for the core pages), especially [resiliency](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-resiliency.html) (~20 min) and the [release notes](https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-release-notes.html) (~15 min).
- [awsome-distributed-training](https://github.com/aws-samples/awsome-distributed-training) (repo, ~30 min for the entry path): AWS's reference repo of HyperPod/ParallelCluster/EKS training setups, test cases, and Terraform/CDK templates.
- [S3 performance best practices](https://docs.aws.amazon.com/AmazonS3/latest/userguide/optimizing-performance.html) (~20 min): prefix parallelism and request-rate design.
- [terraform-aws-modules](https://github.com/terraform-aws-modules) (repo, ~25 min for the entry path): the community module registry worth copying patterns from (vpc, eks, s3).

### Terraform patterns that matter for ML infra

**State**: remote state in S3 with locking (native S3 lockfile since Terraform 1.10, previously a DynamoDB table), encrypted, versioned bucket. One state file per blast-radius unit, not per repo: `network`, `cluster`, `data` as separate roots so a bad `apply` on experiment infra cannot touch the VPC. Read cross-stack outputs via `terraform_remote_state` or (better) data sources on tagged resources.

**Modules**: thin roots, reusable modules. The ML-shaped module set tends to be: `vpc-ml` (subnets in the accelerator AZ, EFA-ready security groups), `fsx-lustre` (+S3 data repository association), `hyperpod-cluster` or `eks-gpu-nodegroup`, `training-bucket` (lifecycle rules baked in), `lambda-glue`. Pin module and provider versions; upgrade deliberately.

**Workspaces vs directories**: workspaces are fine for N identical copies of cheap infra (per-dev sandboxes). For real environments (dev/prod), separate root directories with separate state and a shared module set beat workspaces: different account IDs, different instance counts, explicit diffs. GPU capacity is the reason this matters: you want prod's `p5.48xlarge` count in a file you can code-review, not behind `terraform workspace select`.

**ML-specific realities**: capacity is the scarce resource, so reservations (ODCR/capacity blocks, HyperPod flexible training plans) become Terraform-managed objects too; long-lived clusters drift (SLURM config edited by hand), so keep lifecycle-script content in git and treat the cluster as cattle-with-a-pet-name; `prevent_destroy` on stateful things (FSx, buckets); never let `terraform destroy` be the way a training cluster dies mid-run.

### The AWS ML stack

#### SageMaker training jobs vs HyperPod

- **Training jobs**: ephemeral. You call `CreateTrainingJob` with an image + S3/FSx inputs; AWS provisions instances, runs, tears down, bills per second. Zero cluster ops, warm pools for iteration, managed spot with checkpointing. Right for finetunes, sweeps, and anything under a few days.
- **HyperPod**: a persistent cluster you own, orchestrated by **SLURM** or **EKS**. You get login/controller/worker instance groups, lifecycle scripts, FSx for Lustre, and, the actual product, **resiliency**:
  - *Health monitoring agent*: continuous passive checks on every GPU/Trainium node (unresponsive GPUs, NVLink/ECC error counters, EFA health); faulty nodes are rebooted or replaced automatically.
  - *Deep health checks*: intensive stress tests (DCGM diagnostics, NCCL tests) at provisioning time, and since April 2026 **on demand** against specific instances or groups, for both Slurm and EKS clusters.
  - *Auto-resume*: a failed job is requeued and restarted (including on GRES-enabled Slurm nodes) once the node is replaced; your script resumes from its last checkpoint, so checkpoint hygiene is the contract you must hold up.
  - *Task governance* (EKS): quotas, priorities, and preemption across teams, Kueue-style; *flexible training plans* reserve GPU capacity windows.
- **Inference**: SageMaker real-time endpoints (instance-based, autoscaling, multi-model), async inference for long requests, batch transform for offline scoring, serverless inference for spiky CPU-scale models. For LLMs, the LMI (vLLM-based) containers, or skip SageMaker and run vLLM on EKS.
- GCP mirror for context: Vertex AI custom training jobs ≈ SageMaker training jobs; Vertex pipelines ≈ SageMaker Pipelines; GKE + GPUs ≈ EKS + GPUs.

#### Lambda/EventBridge glue patterns

The serverless layer is the nervous system around training:

- **Event-driven ingestion**: S3 `ObjectCreated` on a raw prefix, then EventBridge rule, then Lambda (or Step Functions) kicking preprocessing or a Dagster/Airflow run. EventBridge over direct S3-to-Lambda for fan-out and filtering.
- **Job lifecycle reactions**: SageMaker and HyperPod emit state-change events to EventBridge (`Training Job State Change`, cluster/node events). Route failures to Slack/PagerDuty, completions to eval-triggering Lambdas, spot interruptions to checkpoint-now signals.
- **Scheduled hygiene**: EventBridge Scheduler crons for idle-endpoint teardown, stale-checkpoint pruning, nightly cost reports, dataset freshness checks.
- **Step Functions** for multi-stage ML workflows that are AWS-API-shaped (train, then evaluate, then register, then deploy) when a full orchestrator is overkill; native SageMaker integrations mean no polling code.

#### S3 design for datasets and checkpoints

- **Buckets**: separate `raw`, `processed/tokenized`, `checkpoints`, `artifacts` buckets (different lifecycle, replication and access policies); version code/config artifacts, not multi-TB shards.
- **Prefix design for throughput**: S3 scales request rate per prefix (~5,500 GET/s each), so shard datasets across many prefixes and many files (`processed/dclm/v3/shard=00417/part-*.parquet`); hundreds of parallel readers need hundreds of prefixes, not one giant directory. Target shard sizes in the 100 MB-1 GB range; millions of tiny files kill listing and per-request overhead.
- **Checkpoints**: `ckpt/<run-id>/step-<n>/` with sharded writes (one object per rank, e.g. torch.distributed.checkpoint layout) for parallel PUT bandwidth; lifecycle rule keeping last-k step dirs plus milestone steps to Glacier; a `latest` pointer object rather than renames. **S3 Express One Zone** (directory buckets) is the option for checkpoint hot storage when restore latency matters.
- **FSx for Lustre** in front of S3 (data repository association) is the HyperPod pattern: POSIX + striped bandwidth for the hot path, S3 as durable truth. Also in the toolbox: **Mountpoint for S3** (read-heavy dataset mounts on EKS) and s5cmd for bulk copies.

#### Cost control

- Tag everything (`project`, `owner`, `run-id`) via Terraform `default_tags`; no untagged GPU instance should be possible. Cost Explorer + CUR queries by tag.
- GPU spend levers, in impact order: (1) do not leave allocations idle (idle-GPU alarms from DCGM utilisation metrics, auto-stop notebooks/endpoints); (2) right procurement: capacity blocks / savings plans for steady load, spot + requeue-safe jobs for interruptible work, training-job warm pools instead of a personal always-on node; (3) storage lifecycle rules (checkpoint retention is routinely a five-figure line item); (4) egress awareness (keep data, cluster, and registry in one region).
- AWS Budgets with EventBridge actions for hard alerts; anomaly detection for the slow leaks.
