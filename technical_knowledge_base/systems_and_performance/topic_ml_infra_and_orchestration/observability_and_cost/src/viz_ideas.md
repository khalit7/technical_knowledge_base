# Observability and cost: visual ideas

Question the page keeps returning to: which meter tells the truth about a GPU-hour, and what does the answer cost?

## Built
1. **Metrics explainer** (own tab, derived): a 132-SM H100 over one 20-slice window; seven situations (healthy matmuls, too few blocks, launch gaps, input stall, memory-bound phase, exposed all-reduce, hung collective), each before/after its fix; every counter (GPU util, SM active, occupancy, tensor, DRAM, NVLink) computed from its quoted definition; decoder table. Extends the root's 3-case drill with occupancy, pipes and fixes.
2. **Cluster dashboard** (own tab, measured): replay of a real Prometheus recording of five scenarios on kind and Slurm, panels with their PromQL, alert states at the cursor, healthy run overlaid as before/after; scrape cost table.
3. **Healthy against hung, three meters** (Reading, before/after animation on the same recorded time axis): scheduler, device (measured CPU and derived GPU util), training log.
4. **Capacity planner** (own tab): run against deadline (root calculator, residual +2.6% vs Llama 3.1 405B card), fleet for a year, own vs rent with cost per useful GPU-hour against utilisation chart.
5. **Prometheus sizing calculator** (Reading): series, samples/s, disk from GPUs, nodes, interval, retention; measured cAdvisor series per node as default.
6. Tables from data: published utilisation studies by metric kind, goodput of two recorded runs, alert latencies, Slurm chargeback from sacct.
7. Predict-then-reveal: SM activity of a small grid; Acme's SM activity.

## Rejected
- A live Grafana: impossible in a sandboxed iframe; replaced by the replay.
- Real GPU counters: no GPU; derived and labelled instead.
- Ray metrics: Ray's 3.7 GB of caps on a shared machine for little new; the Ray child's head-memory finding is linked.
- Price-history chart: a pattern Khalid removed; one dated snapshot (the root's table) is reused.
- Goodput vs checkpoint interval curve and recovery-design comparisons: owned by the Fault tolerance sibling.
- Cardinality explosion demo with per-job labels: taught on the SWE Observability page; only the sizing calculator here.

## 2026-10-24 rebuild
Built: the hero ladder (static: one GPU-hour through seven meters); goodput bars (static, measured); alert timeline (static, measured, defaults off the chart); fragmentation diagram (static, measured Kueue and Slurm cases); cost per useful GPU-hour against the busy share with one slider and four price kinds, plus cost per million training tokens (defaults land on recompute.py: owned $2.00 and Capacity Block $8.53 at 70%; breakeven 20% against on demand).
Moved: the Metrics explainer from its own tab into Reading section 2; the healthy-against-hung stepper from section 4 to section 1.
Removed: the planner tab's cost chart (now drawn once, in Reading section 10).
Rejected: photos (no licensed GPU-dashboard image; an H100 card photo would decorate); a spot-eviction simulation (no sourced eviction rate).
