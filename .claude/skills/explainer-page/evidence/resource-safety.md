# Resource safety on the Mac

The rules that keep the Mac (Apple M1 Pro, 16 GB) from crashing while agents train, run models, start containers and check pages. They override every other instruction: Khalid, 2026-10-16, "make sure to manage mac resources well so it doesn't crash", after a kernel panic on 2026-10-15 under hours of load 50 to 100, swap full, MPS jobs plus four CPU agents plus Docker plus Chrome. A crash wipes scratch and loses hours of work.

The two scripts live in this skill: [../scripts/guard.sh](../scripts/guard.sh) and [../scripts/lock.sh](../scripts/lock.sh). The lead sets `KB_SCRATCH` to the topic's shared scratch folder in every brief so all agents share one lock folder.

## Before every heavy step: the guard
```sh
sh .claude/skills/explainer-page/scripts/guard.sh   # OK or HIGH load=.. swapMB=.. memfree=..%
```
Heavy means training, model load, generation, compile, container or cluster start, a big download, a browser check. HIGH (1-minute load over 10, or swap over 8 GB while free memory is under 35%, or free memory under 20%) means: do light work (reading, writing) and check again in a few minutes. Never push through a HIGH.

## The GPU: one job machine-wide, under the bench lock
- MPS work only while holding the `bench` lock, and every GPU command gated on a successful acquire:
  ```sh
  L=.claude/skills/explainer-page/scripts/lock.sh
  sh $L acquire bench gm-df 3600 && { PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 python run.py; sh $L release bench gm-df; }
  ```
  Never chain work after an acquire that may have timed out (on 2026-10-16 a timed-out acquire followed by a teardown killed another lab's job).
- Touch the lock at least every 10 minutes while running (`sh $L touch bench gm-df`, in the background); release the moment GPU work ends. Never hold it while idle or doing CPU work.
- Release is owner-checked; after a release the same owner waits 20 s before re-acquiring, so other agents get a turn.
- **Never block for long and never sleep-loop.** Idle waits are expensive: on the inference topic four agents queued on one lock, each gap over 5 minutes expired the prompt cache, and usage per page was 5 to 9 times earlier topics. Acquire with a short wait when you have other work; if the lock is busy, do the writing and come back. Long jobs run detached with a pid file and a progress log while you do other work.
- **At most one GPU-bound agent at a time**; CPU-only and writing agents can run beside it. For a measured topic, consider one benchmark agent feeding writer agents.

## The hard memory cap for MPS
- Every process that uses MPS starts with `PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45` (PyTorch then refuses allocations beyond about 7 GB and raises an out-of-memory error instead of swapping the machine). If the cap is hit, make the run smaller; never raise the ratio.
- Every sampling or evaluation loop runs under `torch.no_grad()` or `torch.inference_mode()` (a sampling loop without it reached 20 GB of MPS memory and 15 GB of swap on 2026-10-17).
- float16 or bfloat16 weights for anything over about 300M parameters (a float32 1.7B model thrashed swap for 75 minutes on 2026-10-15); chunked log-softmax for perplexity over long vocabularies.
- Keep each process under about 6 GB: **check peak memory on one item first** and stop if it passes 6 GB (a Qwen-Image VAE float32 round trip peaked at 9.9 GB); use VAE tiling or slicing where a model offers it.
- One model loaded at a time, one process per model run, `torch.mps.empty_cache()` between stages, progress printed every few minutes. If a run thrashes (RSS collapsing, no progress, swap climbing), kill your own PID and rerun smaller.

## Agents and CPU
- **At most 4 agents at a time in total, at most 3 doing heavy work** (a GPU job counts as one). Keep load under about 10.
- CPU work at low priority with capped threads: `nice -n 15`, `OMP_NUM_THREADS=4`, `torch.set_num_threads(4)`; one heavy job per agent at a time (two 20-thread jobs together drove load to about 100 on 2026-10-15).
- Puppeteer: one browser at a time, closed at the end.

## Containers and local clusters
- Docker only when the topic needs it and Khalid has approved it. Every container gets `--memory` (2 GB or less unless stated) and `--cpus 2` or fewer; kind node containers get the same caps with `docker update` right after creation; a topic stays under about 6 GB of container memory in total.
- Name everything you create (containers, clusters, networks, volumes) with your prefix; `--rm` where it fits; never stop, remove or prune anything you did not create.
- No `--privileged`; kind nodes are the only accepted privileged containers (by design), and the report says so.
- Shared clusters (Slurm, kind, Ray) are used under a lock named after the cluster (`lock.sh acquire kind <prefix> 1800`), released right after; never two cluster locks at once; a lab that changes a cluster's config restores it from `src/data/` before releasing; whoever starts an on-demand cluster stops it when done.
- Stop clusters no longer needed, and quit Docker Desktop when the topic is done (its VM can hold about 10 GB of RAM, which breaks MPS runs).

## Processes
- Kill only PIDs you started: record `$!` or a pid file at launch and `kill <PID>`. Never `pkill`, never `pkill -f <pattern>`, never `killall` (agents twice killed by pattern on 2026-10-15).
- Never write temporary files outside the scratch folder and the repo; never create them inside `html_utils/`.

## Disk
- Check `df -h /` before any download; keep at least 15 GB free. Give each topic a scratch budget and raise it when completeness needs it (data curation went to about 35 GB at Khalid's request: "i need the info to be as complete as possible"); do not shrink an experiment to save disk.
- Big downloads one at a time under the `download` lock, recorded (URL, revision, sha256) so they can be restored.
- Clean up regularly: delete your own intermediates when done, and the scratch of finished, published topics (old venvs, `uv cache prune`, large intermediates), rather than cutting new work.

## Sources distilled
Memory: manage-mac-resources, gpu-runs-one-agent, cheap-runs-over-expensive, completeness-over-disk, no-usage-caps, scratch-wiped-reboot, dc-topic-in-progress (thread and pkill incidents, fp16 lesson), gm-topic-in-progress (no_grad incident, lock fairness). Briefs: gm_common (RESOURCE SAFETY, HARD MEMORY CAP), gm_child_common (peak memory on one item), mi_common (CONTAINERS, CLUSTER SHARING), dc_common and jx_common (disk budgets, download lock). Scripts: `guard.sh` and `lock.sh` from the kb_briefs folder.
