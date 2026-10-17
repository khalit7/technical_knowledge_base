# Kubernetes for ML: scheduling, device plugins, gang scheduling and operators

Notion: https://app.notion.com/p/3c65c17b0d0d81cf9417de52108cfbce (child of Topic: ml-infra-and-orchestration; reuses an older Notion page, retitled at publish).

HTML-only page, built 2026-10-16 (`index.html` from `src/build.sh`; sources and runs in `src/`, see `src/README.md`). Tabs: Reading (control loop, Jobs and failure policies, the scheduler, device plugins and DRA, placement and preemption, gang scheduling including native PodGroups, Kueue, JobSet, Kubeflow Trainer, storage, mistakes, interview questions), Scheduling cycle, Kueue admission, Manifest builder, Further reading. Every manifest ran on the topic's kind cluster (Kubernetes v1.37.0, Kueue v0.20.2, JobSet v0.13.0) with the running example. A new page: no old Notion page was compared (Notion disconnected).
