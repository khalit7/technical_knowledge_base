# Visual ideas for Kubernetes for ML (built and rejected)

Question the page keeps returning to: what does Kubernetes do with a multi-node training job by default, and which piece fixes each gap? Every visual replays a recorded run on the kind cluster (16 Oct 2026).

## Built
1. **The same job at three levels** (Reading 1, before/after across layers): watch stream of the running example as Indexed Job + Service, JobSet, TrainJob; actors around the API server, objects appearing, counters. Shows the controller chain; real timings.
2. **Nine failure runs** (Reading 2): pod swimlanes with Job/JobSet conditions, stepped by event. Pairs: rule on 13 against rule on 1 (exit code hidden by torchrun); Ignore per pod against JobSet restart (eviction collateral); per-index and success policy.
3. **Spread against pack** (Reading 3, before/after on the same pods) and the **Scheduling cycle** tab: Queue, Filter, Score, Select, Bind per pod, all logged plugin scores with recompute check marks (135/135), plus the reader's own sequence through the ported formulas (checked against Python on 60 random sequences).
4. **Device plugin against DRA** (Reading 4, before/after on the same request): sequence diagram with real log lines.
5. **Spread with a tainted domain**, Ignore against Honor (Reading 5), and a **preemption** step-through.
6. **Native gang before/after** (Reading 6) on the parent's deadlock input, with the PodGroup gate switched on for the run.
7. **Kueue admission** tab: flavor fallback quota bars and TAS block view from real Workload objects.
8. **Manifest builder** tab: generators identical to the scripts that ran; object tree with creators; measured or derived outcome per event.

## Rejected
- Rebuilding the parent's gang deadlock with Kueue and the borrowing/reclaim animation: the root's Scheduling lab owns them (linked).
- A Volcano or KAI run: a second scheduler on a control plane already near its memory cap, teaching what the comparison table states; skipped (expensive, little new).
- A cluster-autoscaler or ProvisioningRequest demo: no autoscaler on kind.
- An etcd/API-server latency chart: laptop timings would mislead; event order is the robust result.
- Fair sharing in Kueue: needs a Kueue controller config change and restart (and the webhook outage that comes with it); described with docs instead.
- KubeRay: the Ray sibling's subject.

## What the methodology lacked
A rule for reconfiguring a shared cluster's control plane for one experiment: here backups outside the manifests folder, verify-identical on restore, and a note that restarting the API server takes Kueue's fail-closed webhook down with it.
