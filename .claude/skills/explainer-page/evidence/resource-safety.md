# Resource safety

The rules that keep the build machine responsive and stable while agents train, run models, start containers and check pages. They override every other instruction: an overloaded machine once crashed under hours of oversubscribed load, wiping scratch and losing hours of work. This is the one home for resource, GPU, process and waiting rules; briefs point here.

The machine: this Linux box, 32 cores, 60 GB RAM, two NVIDIA RTX 5090 GPUs (32 GB each, CUDA). It is Khalid's own machine and is shared with his other work, so the GPUs or memory may already be busy: always measure before assuming headroom.

The two scripts live in this skill: [../scripts/guard.sh](../scripts/guard.sh) and [../scripts/lock.sh](../scripts/lock.sh). The lead sets `KB_SCRATCH` to the topic's shared scratch folder in every brief so all agents share one lock folder (briefs call the tools folder `{{TOOLS}}`; a copy there or the skill's own copy is the same script).

## Before every heavy step: the guard
```sh
sh .claude/skills/explainer-page/scripts/guard.sh   # OK or HIGH load=.. cores=.. memavail=..% swapMB=.. gpu=...
```
Heavy means training, model load, generation, compile, container or cluster start, a big download, a browser check. HIGH (1-minute load above three quarters of the cores, available memory under 15%, or heavy swap with little memory available) means: do light work (reading, writing) and check again later. Never push through a HIGH. Never saturate the machine: leave cores, memory and a GPU's memory for Khalid's own work.

## The GPU: one heavy job at a time, under the bench lock
- Check the GPUs first with `nvidia-smi` (the guard prints memory used and utilisation per GPU). If another process (not yours) is using a GPU, do not use that GPU; pick the free one with `CUDA_VISIBLE_DEVICES=<index>`, or wait.
- GPU work only while holding the `bench` lock, every GPU command gated on a successful acquire:
  ```sh
  L=.claude/skills/explainer-page/scripts/lock.sh
  sh $L acquire bench gm-df 60 && { CUDA_VISIBLE_DEVICES=0 python run.py; sh $L release bench gm-df; }
  ```
  Never chain work after an acquire that may have timed out (a timed-out acquire followed by a teardown once killed another lab's job).
- Touch the lock at least every 10 minutes while running (`sh $L touch bench gm-df`, in the background); release the moment GPU work ends. Never hold it while idle or doing CPU work. Release is owner-checked; after a release the same owner waits 20 s before re-acquiring, so other agents get a turn.
- **At most one GPU-bound agent at a time**; CPU-only and writing agents can run beside it. For a measured topic, consider one benchmark agent feeding writer agents.

## Memory
- Check peak memory on one item before any sweep; size batches to leave headroom on the GPU you use and in system RAM.
- Every sampling or evaluation loop runs under `torch.no_grad()` or `torch.inference_mode()` (a sampling loop without it once grew without bound).
- float16 or bfloat16 for anything over about 300M parameters; chunked log-softmax for perplexity over long vocabularies; VAE tiling or slicing where a model offers it.
- One model loaded at a time per process, `torch.cuda.empty_cache()` between stages, progress printed every few minutes. If a run thrashes (RSS collapsing, no progress, swap climbing), kill your own PID and rerun smaller.

## Agents and CPU
- **At most 4 agents at a time in total, at most 3 doing heavy work** (a GPU job counts as one).
- CPU work at low priority with capped threads: `nice -n 15`, `OMP_NUM_THREADS`, `MKL_NUM_THREADS`, `torch.set_num_threads` and `-j` set to at most 8 per job (2 when several builders run at once); one heavy job per agent at a time (two uncapped jobs together once drove load far past the core count).
- Puppeteer: one browser at a time, closed at the end.

## Waiting: idle waits, not sleep loops
- **Never block for long and never sleep-loop.** Idle waits are expensive: four agents queued on one lock once expired the prompt cache on every gap over five minutes and made each page 5 to 9 times more expensive. Acquire with a short wait when you have other work; if the lock is busy, do the writing and come back.
- Anything over about 4 minutes runs detached with a pid file and a progress log while you do other work; check the log with short commands. A 600 s no-progress watchdog kills agents, including one stuck writing a huge file: write big files in pieces of a few KB and never read over about 40 KB in one call.
- If you must wait for a long run, script the rest of your work as a finishing list, hand back and stop; the lead runs one watcher (a background command or the Monitor tool with an until-condition) and resumes you. No status reports while waiting.

## Containers and local clusters
- Docker only when the topic needs it and Khalid has approved it. Every container gets `--memory` (2 GB or less unless stated) and `--cpus 2` or fewer; kind node containers get the same caps with `docker update` right after creation; a topic stays under about 6 GB of container memory in total.
- Name everything you create (containers, clusters, networks, volumes) with your prefix; `--rm` where it fits; never stop, remove or prune anything you did not create.
- No `--privileged`; kind nodes are the only accepted privileged containers (by design), and the report says so.
- Shared clusters (Slurm, kind, Ray) are used under a lock named after the cluster (`lock.sh acquire kind <prefix> 1800`), released right after; never two cluster locks at once; a lab that changes a cluster's config restores it before releasing; whoever starts an on-demand cluster stops it when done.

## Processes
- Kill only PIDs you started: record `$!` or a pid file at launch and `kill <PID>`. Never `pkill`, never `pkill -f <pattern>`, never `killall`. Never kill a process you did not start (Khalid's own work included); tell Khalid instead.
- Never edit a queue script while it runs (`sh` reads a script as it runs); write a new file and start that.
- Never write temporary files outside the scratch folder and the repo; never create them inside `html_utils/`.

## Disk and scratch
- Check `df -h /` before any download; keep at least 15 GB free. Give each topic a scratch budget and raise it when completeness needs it (Khalid: "i need the info to be as complete as possible"); do not shrink an experiment to save disk.
- Big downloads one at a time under the `download` lock, recorded (URL, revision, sha256) so they can be restored. Models in `~/.cache/huggingface` (durable; leave `HF_HOME` unset).
- Scratch is not durable (a reboot or a temp cleaner can clear it): check `last reboot` before trusting scratch after a gap; anything a page needs to rebuild goes in its `src/`.
- Clean up regularly: delete your own intermediates when done, and the scratch of finished, published topics (old venvs, `uv cache prune`, large intermediates), rather than cutting new work.

## Multi-process runs (torch.distributed, Ray, Dask)
Several ranks on one machine count as **one heavy job** for the agent cap; the thread budget is for the launch, not per rank, all under `nice -n 15`. Record the launcher PID and kill that process group only. Two GPUs over PCIe do not behave like NCCL on NVLink in a datacenter: measure counts, bytes, memory per rank and numerical equality; take cluster-scale speed from published numbers, labelled.
