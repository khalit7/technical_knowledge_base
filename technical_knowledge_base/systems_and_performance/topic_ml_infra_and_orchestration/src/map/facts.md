# Tool map: verified facts (copy of what was appended to the topic's shared FACTS.md under "## map")

Read 2026-10-16 unless stated. Machine-read versions and dates are in inputs/ (PyPI JSON, GitHub API, Atom feeds).

## Latest releases (stable; PyPI, else GitHub release feed)
- Slurm 26.05.5 (2026-10-13); 25.11.8 and 25.05.9 still patched (2026-09-02). https://github.com/SchedMD/slurm/releases
- Kubernetes v1.37.1 (2026-09-23); v1.38.0-alpha.2 (2026-10-07). DRA GA in v1.34 (blog 2025-09-01) https://kubernetes.io/blog/2025/09/01/kubernetes-v1-34-dra-updates/
- Kueue v0.20.2 (2026-10-15). v0.20 NO LONGER SERVES kueue.x-k8s.io/v1beta1: manifests must use v1beta2 (CHANGELOG-0.20.md, "Actions required"). Kueue docs: Trainer v1 (PyTorchJob etc.) integration deprecated, "Kubeflow Trainer v1 is now legacy", removal "tentatively v0.20" (still present in 0.20.x per its changelog). https://kueue.sigs.k8s.io/docs/tasks/run/kubeflow/
- JobSet v0.13.0 (2026-10-12). Kubeflow Trainer v2.3.0 (2026-08-07; v2.0 July 2025; README still says alpha); Training Operator v1 maintained on release-1.9 branch, v1.9.4 (2026-08-18).
- Volcano v1.16.0 (2026-10-15); KAI Scheduler v0.18.6 (2026-10-15, repo now kai-scheduler/KAI-Scheduler); KubeRay v1.7.1 (2026-09-21); YuniKorn v1.10.0 (2026-10-06).
- Ray 2.59.0 (PyPI 2026-10-02). torch 2.14.1 (2026-09-30). DeepSpeed 0.19.7 (2026-09-16). Accelerate 1.15.0 (2026-09-09).
- SkyPilot 0.14.0 (2026-10-05); dstack 0.22.4 (2026-10-15); Slinky slurm-operator v1.2.3 (2026-09-30).
- Open MPI v5.0.11 (2026-08-25), v6.0.0rc2; pdsh 2.36 (2026-01-12); TorchX 0.7.0 (2024-07-16, commits continue); submitit 1.5.4 (2025-12-17).
- DCGM 4.6.1 (2026-08-19); dcgm-exporter 4.8.4 (2026-09-18); GPU Operator 26.7.2 (2026-10-14); k8s-device-plugin v0.20.1 (2026-09-22); Prometheus 3.13.4; Grafana 13.2.4.
- Lustre: lustre.org lists 2.17.0 (2025-12-29) as current major release, 2.15.8 (2025-12-03) as maintenance release, 2.18 in development. https://www.lustre.org/
- Airflow 3.3.2 (3.0.0 on 2025-04-22); MLflow 3.17.1 (3.0.0 on 2025-06-10); Flyte 2 SDK 2.11.4 (2.0.0 on 2026-02-18); W&B client 0.30.0; ClearML 2.1.12; kfp 2.17.0.

## Status and ownership events
- NVIDIA acquired SchedMD (Slurm), NVIDIA blog 2025-12-15 https://blogs.nvidia.com/blog/nvidia-acquires-schedmd/ ; Slurm stays open source (GPL-2.0).
- NVIDIA completed Run:ai acquisition 2024-12-30 (TechCrunch); open-sourced the scheduler as KAI Scheduler, Apache-2.0, 2025-04-01 https://developer.nvidia.com/blog/nvidia-open-sources-runai-scheduler-to-foster-community-collaboration/
- CoreWeave completed Weights & Biases acquisition 2025-05-05.
- OpenAI agreed to acquire neptune.ai (Dec 2025, InfoWorld 2025-12-04); hosted app and API off 2026-03-04 10 am PST per Neptune's transition hub (Neptune support page says 2026-03-06 12:00 UTC: sources differ); hosted data deleted; neptune-client repo archived.
- MinIO: minio/minio repository ARCHIVED, README "THIS REPOSITORY IS NO LONGER MAINTAINED" (points to AIStor Free/Enterprise); last push 2026-04-24; maintenance mode December 2025; binary releases had stopped earlier (InfoQ 2025-12). Existing images still run.
- Determined: last release 0.38.1 (2025-03-19), last commit 2025-03-20, not archived, no notice found: "quiet".
- Ray joined the PyTorch Foundation 2025-10-22. DeepSpeed contributed to LF AI & Data February 2025 (repo deepspeedai/DeepSpeed).
- IBM completed HashiCorp acquisition 2025-02-27; Nomad is BUSL-1.1 from v1.7.0. Siemens completed Altair (PBS Professional) acquisition 2025-03-26; OpenPBS last release v23.06.06 (2023-08-16), AGPL-3.0.
- SageMaker HyperPod launched 2023-11-29 (Slurm); EKS support GA 2024-09-10. Slinky announced 2024 (open-sourced around SC24, Nov 2024), 1.0 late 2025. Slurm initial release 2002 (Slurm FAQ).
- Alluxio open-source edition: last release v2.9.6 (2024-07-02); README says it is "purpose-built for analytics workloads".
- RL frameworks on Ray: veRL and OpenRLHF READMEs.
- www.determined.ai redirects (301) to hpe.com/us/en/solutions/ai-artificial-intelligence.html (checked 2026-10-16).
- - (map) Version cross-check 2026-10-16: venv ray 2.59.0 and torch 2.14.1 (both the latest); Slurm containers 24.11.5 (Debian 13 package; latest 26.05.5, and SchedMD's 2026-09-02 patches covered 26.05, 25.11, 25.05 only); kind server v1.37.0 (latest v1.37.1); Kueue v0.20.2 and JobSet v0.13.0 (both latest). Kueue 0.20 serves only kueue.x-k8s.io/v1beta2.

## Corrections (root fix pass, 2026-10-16)
- Alluxio: the GitHub API's releases/latest is v2.9.4 (published 2024-06-11); v2.9.5 (2024-06-24) and v2.9.6 (2024-07-02) are git tags with no release object (releases/tags/v2.9.6 returns 404). The Atom feed lists tags, hence the earlier "v2.9.6". The map now shows v2.9.4 and explains the tags.
- Prometheus: releases/latest is v3.15.0 (published 2026-09-25); 3.13.4 (2026-10-02) is a later patch of an older line, which the feed-order pick had taken. The map now shows 3.15.0.
- Neptune: transition hub (read 2026-10-16): hosted app and API off "On March 5, 2026, at 10 am PST"; changelog "December 5, 2025: Changed the shutdown date from March 4 to March 5, 2026". The map said 03-04: fixed, hub added as a source.
- Slurm 25.11+ serves OpenMetrics from slurmctld (MetricsType=metrics/openmetrics, gauges only; Observability child, Slurm Metrics Guide): added to the Slurm and Prometheus entries. DCGM 4.6.1 field rename noted in the DCGM exporter entry.
- MLflow 3.17.1 (2026-10-16, from the ML platforms child's src/facts.md): default tracking URI sqlite:///mlflow.db (the default since 3.7.0, https://mlflow.org/docs/latest/self-hosting/architecture/backend-store/); 3.17.1 refuses the ./mlruns file store unless MLFLOW_ALLOW_FILE_STORE=true (mlflow/store/tracking/file_store.py lines 223-235, measured there). The "track" picker's laptop line now says so (was "a file store").
