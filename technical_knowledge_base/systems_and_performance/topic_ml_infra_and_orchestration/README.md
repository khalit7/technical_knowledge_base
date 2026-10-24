# Topic: ml-infra-and-orchestration

Notion: https://app.notion.com/p/3c65c17b0d0d81b5925bfd1d8665dd4b
Site: https://khalit7.github.io/technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`; `src/README.md` has the 2026-10-24 rebuild). The machinery around a training run as a map: the life of one job (get machines, start and meet, train, fail and resume, account) on Slurm, Kubernetes and Ray, with definitions, cross-system comparisons and child cards in the Reading tab, and one running example (a tiny GPT trained with DDP over gloo, identical losses on all three systems) measured in the labs. Tabs: Reading, Scheduling lab (`src/sched/`), Launch lab (`src/launch/`), Failure lab (`src/fail/`), Storage lab (`src/io/`), Cost lab (`src/cost/`), Tool map (`src/map/`), Further reading. Shared clusters and the running example in `src/data/`.
Real runs on an Apple M1 Pro with Docker Desktop, 2026-10-16; published cluster numbers kept apart and dated.
Nine child pages, each in its own folder: cluster_anatomy, slurm, kubernetes_for_ml, ray, launching_distributed_training, fault_tolerance_at_scale, storage_and_data_movement, observability_and_cost, ml_platforms_and_workflows. Their Notion pages are not created yet; `src/read/links_todo.md` lists the plain-text links to wire once they are.
