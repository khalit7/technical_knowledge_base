# Kubernetes for ML page: sources, scripts and runs

Built 2026-10-16; rebuilt 2026-10-24 to the teaching contract (editing plus source reading, no new cluster runs). Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page), organised by the path of a job through Kubernetes (control loop, Jobs, scheduler, devices, RDMA networking, placement, gangs, Kueue, JobSet, operators, serving, storage). Departures: no old page to cover (`coverage.md`); the parent's Scheduling and Failure labs own the Kueue deadlock fix, borrowing, reclaim and node failures, so they are linked, not rebuilt.

## Rebuild
```
cd src
python3 -I recompute.py                      # out/scores.json, out/cases.json (stdlib only)
uv run --no-project --with pyyaml python -I make_data.py   # out/data.json, parts/22_js_km_data.js
sh build.sh                                  # ../index.html
python3 -I check/check_embed.py              # embedded data == out/data.json, prose numbers, privacy
node check/check_ui.mjs <page folder>        # from the repo root, absolute folder: every control, 390 dark and 920 light
node check/check_stages.mjs [shots dir]      # a few minutes: the 2026-11-06 rollout checks (below)
```

## Files
| Path | What |
|---|---|
| `build.sh`, `parts/` | page parts (storage key `km-tab`; prefix `km`). Reading `20_read_a` (shared styles) to `20_read_n` (closed depth: mistakes, interview), `20_read_z`; JS `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` (skill templates; animations autoplay in view since 2026-11-12), `22_js_km_data.js` (generated), `23_js_km_rd.js` (Reading animations), `24_js_km_static.js` (hero, two-network pod, Deployment against LeaderWorkerSet: static diagrams), `30_js_km_cycle.js` (scheduling cycle, now in section 3's closed block), `31_js_km_kueue.js` (Kueue admission, now inline in section 8), `32_*` (Manifest builder tab), `39_tab_more.html` |
| `ledger.json` | knowledge ledger (`python3 html_utils/ledger.py check <page>`) |
| `k8s/` | every manifest and generator that ran: `train-indexed-job.sh`, `train-jobset.sh`, `gpu-pod.sh`, `spread-pod.sh`, `gang-pod.sh`, `gang-podgroup.sh`, `kueue-job.sh`, `e4a-per-index.yaml`, `e4b-success-policy.yaml`, `e5-priority.yaml`, `e7-device-plugin.yaml`, `e8-dra*.yaml`, `e9-*.yaml`, `e10-kueue.yaml`, `e12-trainjob.yaml`, `km-sched-config.yaml` |
| `scripts/` | `km_watch.py` (namespace watcher, one JSON line per change), `km_lib.sh`, run drivers `km_e2.sh`, `km_e3.sh`, `km_e5.sh`, `km_e6.sh`, `km_e78.sh`, `km_e10.sh`, `km_e11.sh`, `km_e12.sh`, `km_evict.py`, the control-plane switches `km_sched_reconf.sh` and `km_gang_reconf.sh`, and `km_save_runs.py` (scrubs raw output into `runs/` with the root's `src/data/scrub.py`) |
| `runs/` | scrubbed evidence of every run (watch streams, events, objects, logs, scheduler logs); `runs/logs/` rank logs of km-e1 and km-e3b; `runs/e11_failed_webhook/` the first gang attempt that hit Kueue's webhook outage |
| `recompute.py` | the scheduler's NodeResourcesFit and BalancedAllocation scores ported from v1.37.0 and checked against the logged scores |
| `make_data.py` | runs -> `window.KM` |
| `check/` | `check_ui.mjs`, `check_embed.py`, `cards.mjs` (card screenshots) |
| `facts.md` | verified facts with sources (also appended to the topic's shared FACTS file under `km`) |
| `viz_ideas.md` | visuals built and rejected |

## Runs (all on kind `mi-kind`, namespace `km`, under the shared kind lock, 16 Oct 2026, 06:05 to 07:15 UTC)
e1 the running example as Indexed Job + Service; e2a-e2d2 crash and eviction under Job failure rules; e3a-e3c the running example as JobSet, eviction and crash under the JobSet failure policy; e4a/e4b backoffLimitPerIndex and successPolicy; e5a priority and preemption; e5b topology spread with a tainted block; e6 spread against bin-packing scores (scheduler reconfigured); e7 sample device plugin; e8 DRA with a hand-written ResourceSlice; e9 local-path PVC pinning; e10a Kueue flavors; e10b Kueue TAS; e11 native gang scheduling (API server and scheduler reconfigured); e12 Kubeflow Trainer v2.3.0 installed, one TrainJob, uninstalled.

## Changes made to the shared cluster, all restored
- kube-scheduler static pod: `--config` with two profiles and `--vmodule=schedule_one=10` (e6, e5), then the original manifest (checked identical).
- kube-apiserver and kube-scheduler: `--feature-gates=GenericWorkload=true`, `--runtime-config=scheduling.k8s.io/v1beta1=true` (e11), then the originals (checked identical). The API server restart restarted Kueue's controller; while it was down all pod creations failed (webhook), recorded.
- worker3: device plugin image loaded and removed; its leftover `example.com/resource` capacity cleared by a kubelet restart at cleanup. Node labels `km.example.com/tas` and the taint `km.example.com/reserved` added and removed. Kubeflow Trainer CRDs, controller and webhooks installed and removed (the control plane went from 1.04 to 1.35 GiB over the install and uninstall, and was at 1.11 GiB at 07:20 UTC).
- Kind node containers run privileged by design (kind's requirement); nothing else here was privileged.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (one pod at a time, CPU and memory only, failures per pod; so add-ons count and attach GPUs, admit the whole job and restart it as one unit), a new static hero (`24_js_km_static.js`: the chain TrainJob, JobSet, Jobs and Service, Workload, pods, bound pods, containers, with the controller on each arrow and the gap each add-on closes), "You need", new terms. The layer table moved into a closed reference block; the three surprises stay.
- **Tabs folded into Reading** (each explained one mechanism): the Scheduling cycle stepper is now section 3's closed block (the core keeps the spread-against-pack before/after on the same six pods); the Kueue admission stepper is inline in section 8, its YAML in a closed block. Tabs left: Reading, Manifest builder (a tool across sections 2, 9 and 10), Further reading.
- **New owned sections** (OWNERS assignment of 2026-10-23, from source and docs, not run here): section 5, RDMA in a pod (hostNetwork, Multus and NetworkAttachmentDefinitions, the RDMA shared and SR-IOV device plugins, the NVIDIA Network Operator, how to check NET/IB) with a static two-network diagram; section 11, serving on Kubernetes (Deployment against LeaderWorkerSet with a static diagram, LWS v1.0.0's API at file and line, KServe v0.21.0's LLMInferenceService writing a Deployment or an LWS, the vLLM production stack); the NVIDIA GPU Operator in section 4; LWS in the gang options.
- **Depth into closed blocks**: manifests and source listings, line references, the exit-code-1 trade-off, the resumed run's loss difference, the shard runs, the full extension-point list and the cycle stepper, the device-plugin API and the DRA run in full, the native PodGroup objects and the finalizer trap, the gang options table, Kueue's other features, JobSet's knobs, Trainer v1, mistakes and interview rehearsal.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (the old controller started each animation when it scrolled into view). A load-and-scroll check at both motion settings: 0 of 8 animations playing.
- **Removed as fat** (24 ledger units, each with a note): wind-ups, headings, tab pointers, the old reading-time line and section nav, and the nodeName predict (its answer is now one prose sentence).
- **Images**: none. The page is about software objects; the physical node, NIC and rack belong to Cluster anatomy and the hardware topic, which carry photos. A Kubernetes dashboard screenshot would show nothing the watch-stream animation does not.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 37.6 min | 32.3 min |
| Reading, closed details | 4.3 min | 18.9 min |
| Other tabs, core | Scheduling cycle 2.3 + Kueue admission 1.4 + Manifest builder 1.4 + Further reading 2.5 | Manifest builder 1.4 + Further reading 2.7 |
| Visuals drawn in Reading (audit count of svg) | 7 | 10 (plus the two HTML steppers moved in) |

Why 32 minutes is right: the core lost about 9 minutes of listings, line references, run details and the two lab tabs' prose, and gained about 4 minutes of content this page now owns and no other page teaches (RDMA in a pod, LeaderWorkerSet, KServe and the production stack as Kubernetes objects, the GPU Operator). Every core section is one gap a training job hits on Kubernetes, with its measured run or a sourced mechanism and a visual beside it; about a sixth of the core words are captions of those visuals. The closed time grew because the depth was kept, not cut.

## Knowledge ledger
402 units (`ledger.py check`: problems 0): core 252, depth 126, fat 24, owned 0, volatile 0. 392 were drafted from the old page by `ledger.py init`; 10 were added by hand for the new owned content and for script-rendered tables (TrainJob variables, the cycle's side-by-side table, the PVC output, the hero). Keys were found automatically where at least 60% of a unit's word 4-grams survive on the new page; the 87 units below that were labelled by hand.

2026-10-24 topic close: section 2's exit-code finding links Launching distributed training section 3 (torchrun's agent); Further reading times fixed (training root 27 to 22, LLM serving in production 32 to 30); ledger keys 377, 378 updated.

2026-10-26 (final follow-up sweep): the scheduling-cycle caption links Containers and isolation section 12 for what requests and limits become on the node (cgroup files, QoS and `oom_score_adj`), which this page does not teach.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `km-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`. No new runs; no change to `recompute.py`, `make_data.py` or `out/`: every scene draws from `window.KM`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | 2D hero chain (static) | no |
| Reading | 1 Control loop | split | **3D** `stg-loop`: controllers, API server, workers; three layers as modes | yes, 5 / 6 / 7 |
| Reading | 2 Jobs | split | 2D failure timelines, a widget (opens on its end, never plays by itself) | no |
| Reading | 3 Scheduler | split | **3D** `stg-pack`: filter, score, bind; two profiles as modes | yes, 6 + 6 |
| Reading | 3 depth: the scheduling cycle | full width, closed | 2D widget (the reader's own sequence) | no |
| Reading | 4 GPUs | split | 2D sequence animation, device plugin against DRA | yes, 7 / 6 |
| Reading | 5 RDMA | split | 2D two-network pod (static) | no |
| Reading | 6 Placement | split | 2D spread toggle (Ignore against Honor) | no |
| Reading | 6 Priority and preemption | split | **3D** `stg-pre` (run e5a) | yes, 4 |
| Reading | 7 Gangs | split | **3D** `stg-gang`: without and with a PodGroup | yes, 4 / 6 |
| Reading | 8 Kueue | split | 2D admission animation, one step per workload | yes, 4 / 3 |
| Reading | 9 JobSet, 10 Operators | full width | YAML and a table | no |
| Reading | 11 Serving | split | 2D Deployment against LeaderWorkerSet (static) | no |
| Reading | 12 Storage | split | the PVC log | no |
| Manifest builder, Further reading | | full width (tool, links) | unchanged | no |

**Stages and their data.** `40_js_sc_geo.js`: a worker as a slab with its 4 fake GPUs (`example.com/gpu: 4`), a pod as a block on the slots it holds; illustrative sizes. `41_js_sc_loop.js`: `KM.life` (the watch streams of km-e1, km-e3a and km-tj), grouped into stretches (top object, JobSet, Job, pods, binding, start, completion); each stretch's clock is its last recorded change; which worker each pod went to is read from the binding notes. `42_js_sc_pack.js`: `KM.scores` (the logged per-plugin scores), bars are NodeResourcesFit, the plugin that differs between nodes. `43_js_sc_gang.js`: `KM.gang.tl0` and `KM.gang.tl` (pod timelines), the log lines in the list are `KM.gang.log`. `44_js_sc_pre.js`: `KM.preempt.tl` at four moments (1.2, 6.5, 12.65 and 15.3 s), each checked to fall in its stretch of the timeline.

**Kept 2D** and why: the hero is a labelled map of the page with section references; the failure runs are swimlanes on a time axis (and long replays, so a widget); device plugin against DRA is a sequence diagram; the spread toggle is one end state per policy; Kueue admission is quota bars and a block view; the network and LWS figures are labelled structure; the PVC output is a log.

**Changed text.** The control-loop, scheduler, preemption, gang, device and Kueue explanations moved from caption carousels and per-step captions into step lists (the device and Kueue captions were drawn by script before, so their words are now static and counted); the gang "what happened" paragraph and the Kueue pair of result boxes became list items. Removed as duplicates: a second copy of section 2's predict, resumed-run and shard paragraphs inside its depth block, and a second copy of section 3's predict. Section 10 links the control-loop stage's TrainJob mode instead of a second reconcile-loop stage.

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: the four stages and two 2D animations play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; mode chips swap the list and replay; the failure timeline and the cycle stepper never play by themselves (the timeline opens on its last moment); 12 Reading splits are two columns at 1400 px and one below 1100 px; canvas labels do not overlap or leave the card; every time, node, score and message in the step lists equals `window.KM`. `check_ui.mjs` and `check_embed.py` unchanged and passing.

**Length judgement.** Reading core 32.4 min before (7,450 words, `audit_pages.mjs`), 38.6 min after (8,873); closed details 19.0 before, 17.8 after (the duplicated depth paragraphs went); other tabs unchanged (Manifest builder 1.4, Further reading 2.7). The added words are the step lists that explain the stages and animations, as the rollout requires; the hidden mode lists (JobSet and TrainJob layers, the bin-packing profile, the gang run, DRA, TAS) count in the audit although a reader sees one list at a time. Nothing the ledger holds was cut.

**Ledger**: 402 units unchanged (core 252, depth 126, fat 24); keys of units 29, 31, 36, 59, 105, 196, 197 and 228 to 233 reworded to the new list text. `ledger.py check` problems 0 here and on the root.
