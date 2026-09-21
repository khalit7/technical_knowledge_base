#!/usr/bin/env python3
"""
Produce many episodes at once, using both GPUs and the rest of the machine.

    uv run python video/produce.py topic_llms_overview topic_rl_overview ...
    uv run python video/produce.py --from episodes.txt
    uv run python video/produce.py --gpus 0 --cpu-workers 2   # leave a GPU free

`build.py` does one episode end to end and is still the right thing for one
episode. This is for the case where there are thirty of them, and it exists
because the two stages want completely different hardware:

  * the **voice** is GPU work, and the model takes most of a minute to load
  * the **animation** is manim, which is cairo on a CPU core, and ffmpeg after it

Run end to end, one episode at a time, a machine with two 5090s and thirty-two
cores spends most of its time with both GPUs idle, waiting for a single core to
draw rectangles. So the stages are split and run as a pipeline:

  * one persistent worker per GPU, each holding the model in memory and taking
    the next script the moment it finishes the last one (`render.py --serve`)
  * a pool of animation jobs on the CPU, started the instant an episode's audio
    is done, while the GPUs have already moved on to the next script

Load balancing needs no scheduler: a worker asks for more work when it is free,
so the faster GPU simply does more episodes. The GPUs stop only when every
script has been voiced, and the run ends when the last animation is encoded.
"""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
import threading
import time
from collections import deque
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
UV = os.environ.get("KB_UV", "uv")
GROUPS = ["--group", "tts", "--group", "video"]
LOGS = ROOT / "out" / "logs"

lock = threading.Lock()
state: dict[str, str] = {}
started = time.time()


def mark(episode: str, status: str) -> None:
    with lock:
        state[episode] = status
        elapsed = time.time() - started
        print(f"[{elapsed / 60:6.1f}m] {episode:34s} {status}", flush=True)


def animate(episode: str, quality: str) -> bool:
    """Manim plus ffmpeg for one episode, on a CPU core."""
    mark(episode, "animating")
    log = LOGS / f"{episode}.animate.log"
    with log.open("w") as fh:
        done = subprocess.run(
            [UV, "run", "--project", REPO, *GROUPS, "python", "build.py",
             episode, "--skip-tts", "--quality", quality],
            cwd=ROOT, stdout=fh, stderr=subprocess.STDOUT)
    ok = done.returncode == 0
    mark(episode, "done" if ok else f"ANIMATION FAILED, see {log}")
    return ok


def voice_worker(gpu: str, pending: deque, cpu: ThreadPoolExecutor,
                 futures: list, quality: str, attempts: int) -> None:
    """One GPU, one loaded model, as many scripts as it can get through."""
    env = dict(os.environ, CUDA_VISIBLE_DEVICES=gpu)
    log = LOGS / f"gpu{gpu}.voice.log"
    with log.open("w") as fh:
        worker = subprocess.Popen(
            [UV, "run", "--project", REPO, *GROUPS, "python", "tts/render.py",
             "--serve", "--device", "cuda:0", "--attempts", str(attempts)],
            cwd=ROOT, env=env, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=fh, text=True, bufsize=1)
        assert worker.stdin and worker.stdout

        # The worker says READY once the model is resident. Anything else on
        # stdout before that means it died on the way up, and every episode
        # would otherwise sit in the queue waiting for a process that is gone.
        hello = worker.stdout.readline().strip()
        if hello != "READY":
            print(f"GPU {gpu}: worker did not start ({hello or 'no output'}), "
                  f"see {log}", file=sys.stderr, flush=True)
            return
        print(f"GPU {gpu}: model loaded after {(time.time() - started) / 60:.1f}m",
              flush=True)

        while True:
            with lock:
                episode = pending.popleft() if pending else None
            if episode is None:
                break
            mark(episode, f"voicing on GPU {gpu}")
            worker.stdin.write(episode + "\n")
            worker.stdin.flush()
            reply = worker.stdout.readline().strip()
            if reply.startswith("DONE"):
                # Hand the animation straight to a CPU worker and go back for
                # the next script. This is the whole point of the pipeline.
                futures.append(cpu.submit(animate, episode, quality))
            else:
                mark(episode, f"VOICE FAILED ({reply or 'worker died'}), see {log}")
                if not reply:
                    break
        worker.stdin.write("quit\n")
        worker.stdin.flush()
        worker.wait(timeout=120)


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("episodes", nargs="*")
    ap.add_argument("--from", dest="listfile",
                    help="a file of episode names, one per line, # for comments")
    ap.add_argument("--gpus", default="0,1", help="comma separated GPU indices")
    ap.add_argument("--cpu-workers", type=int, default=4,
                    help="concurrent manim jobs. Manim is single threaded, so "
                         "this is how many cores the animation stage uses")
    ap.add_argument("--quality", default="h", choices=list("lmhpk"))
    ap.add_argument("--attempts", type=int, default=4,
                    help="voice takes per beat before keeping the best")
    ap.add_argument("--skip-tts", action="store_true",
                    help="audio already rendered: animate only")
    ap.add_argument("--only-tts", action="store_true",
                    help="voice only, animate later")
    args = ap.parse_args()

    episodes = list(args.episodes)
    if args.listfile:
        for line in Path(args.listfile).read_text().splitlines():
            line = line.split("#", 1)[0].strip()
            if line:
                episodes.append(line)
    # Keep the order given, drop repeats.
    episodes = list(dict.fromkeys(episodes))
    if not episodes:
        ap.error("name some episodes, or pass --from FILE")

    missing = [e for e in episodes if not (ROOT / "scripts" / f"{e}.py").exists()]
    if missing:
        ap.error("no script for: " + ", ".join(missing))

    LOGS.mkdir(parents=True, exist_ok=True)
    print(f"{len(episodes)} episodes, GPUs {args.gpus}, "
          f"{args.cpu_workers} animation workers\n", flush=True)

    futures: list = []
    with ThreadPoolExecutor(max_workers=args.cpu_workers) as cpu:
        if args.skip_tts:
            for episode in episodes:
                futures.append(cpu.submit(animate, episode, args.quality))
        else:
            pending = deque(episodes)
            workers = [
                threading.Thread(target=voice_worker,
                                 args=(gpu.strip(), pending, cpu, futures,
                                       args.quality, args.attempts),
                                 name=f"gpu{gpu.strip()}")
                for gpu in args.gpus.split(",") if gpu.strip()
            ]
            for w in workers:
                w.start()
            for w in workers:
                w.join()
            if args.only_tts:
                for episode in episodes:
                    if state.get(episode, "").startswith("voicing"):
                        mark(episode, "voiced")
        for f in futures:
            f.result()

    print(f"\n{(time.time() - started) / 60:.1f} minutes\n")
    failed = {e: s for e, s in state.items() if "FAILED" in s}
    for episode in episodes:
        print(f"  {episode:34s} {state.get(episode, 'not started')}")
    if failed:
        print(f"\n{len(failed)} of {len(episodes)} failed.")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
