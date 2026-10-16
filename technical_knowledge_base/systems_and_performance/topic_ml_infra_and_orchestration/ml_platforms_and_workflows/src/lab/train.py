#!/usr/bin/env python3
"""The running example of Topic: ml-infra-and-orchestration.

A tiny character-level GPT trained on TinyShakespeare with DDP over gloo (CPU).
The same file runs under torchrun (Slurm, Kubernetes, a laptop) and inside Ray Train
(ray_train.py imports train()).

Deterministic by construction:
  * model init from --seed, no dropout, torch.use_deterministic_algorithms(True), 1 thread per rank;
  * the batch of step s is drawn from a generator seeded with (seed, s) only, as a GLOBAL batch of
    --global-batch sequences; rank r takes rows r, r+W, r+2W, ... So the data a step sees does not
    depend on the launcher, the host or restarts, and resuming from a checkpoint replays the same batches.
  * checkpoints hold model + AdamW state + step; nothing else carries state (no RNG is used after init).

Logs one JSON object per line (stdout, and --log-dir/rank<r>.jsonl if given):
  {"ev": "start"|"step"|"ckpt"|"resume"|"crash"|"end", "rank", "world", "host", "step", "loss", "gloss", "ts", "t", ...}
  loss = this rank's loss on its rows (full float precision, so runs can be compared bit for bit); gloss = mean over ranks (all-reduced), the number to compare across runs.

Failure and slowness knobs for the labs: --crash-rank/--crash-step (exit 13 mid-run),
--slow-rank/--slow-ms (a straggler), --step-sleep-ms (stretch every step so a job lasts long enough to watch).
"""
import argparse, json, os, socket, sys, time, resource, datetime

T0 = time.time()

import torch
import torch.nn as nn
import torch.nn.functional as F
import torch.distributed as dist


def parse(argv=None):
    p = argparse.ArgumentParser()
    p.add_argument("--data", default=os.environ.get("MI_DATA", "/opt/mi/input.txt"))
    p.add_argument("--steps", type=int, default=200)
    p.add_argument("--global-batch", type=int, default=32)
    p.add_argument("--ctx", type=int, default=64)
    p.add_argument("--d", type=int, default=64)
    p.add_argument("--layers", type=int, default=2)
    p.add_argument("--heads", type=int, default=2)
    p.add_argument("--lr", type=float, default=3e-3)
    p.add_argument("--seed", type=int, default=1234)
    p.add_argument("--ckpt-dir", default=os.environ.get("MI_CKPT_DIR", "./ckpt"))
    p.add_argument("--ckpt-every", type=int, default=50)
    p.add_argument("--no-resume", action="store_true")
    p.add_argument("--log-every", type=int, default=10)
    p.add_argument("--log-dir", default=os.environ.get("MI_LOG_DIR", ""))
    p.add_argument("--step-sleep-ms", type=float, default=0.0)
    p.add_argument("--slow-rank", type=int, default=-1)
    p.add_argument("--slow-ms", type=float, default=0.0)
    p.add_argument("--crash-rank", type=int, default=-1)
    p.add_argument("--crash-step", type=int, default=-1)
    p.add_argument("--threads", type=int, default=1)
    p.add_argument("--backend", default="gloo")
    p.add_argument("--timeout-s", type=int, default=120)
    return p.parse_args(argv)


class Block(nn.Module):
    def __init__(self, d, h):
        super().__init__()
        self.h = h
        self.ln1, self.ln2 = nn.LayerNorm(d), nn.LayerNorm(d)
        self.qkv, self.proj = nn.Linear(d, 3 * d), nn.Linear(d, d)
        self.fc, self.out = nn.Linear(d, 4 * d), nn.Linear(4 * d, d)

    def forward(self, x):
        B, T, D = x.shape
        q, k, v = self.qkv(self.ln1(x)).split(D, dim=2)
        q, k, v = (t.view(B, T, self.h, D // self.h).transpose(1, 2) for t in (q, k, v))
        att = (q @ k.transpose(-2, -1)) / (D // self.h) ** 0.5
        att = att.masked_fill(torch.ones(T, T, dtype=torch.bool).triu(1), float("-inf")).softmax(-1)
        x = x + self.proj((att @ v).transpose(1, 2).reshape(B, T, D))
        return x + self.out(F.gelu(self.fc(self.ln2(x))))


class GPT(nn.Module):
    def __init__(self, vocab, d, layers, heads, ctx):
        super().__init__()
        self.tok, self.pos = nn.Embedding(vocab, d), nn.Embedding(ctx, d)
        self.blocks = nn.Sequential(*[Block(d, heads) for _ in range(layers)])
        self.ln, self.head = nn.LayerNorm(d), nn.Linear(d, vocab)

    def forward(self, idx):
        x = self.tok(idx) + self.pos(torch.arange(idx.shape[1]))
        return self.head(self.ln(self.blocks(x)))


def load_text(path):
    text = open(path, encoding="utf-8").read()
    chars = sorted(set(text))
    stoi = {c: i for i, c in enumerate(chars)}
    return torch.tensor([stoi[c] for c in text], dtype=torch.long), len(chars)


def get_batch(data, step, a, rank, world):
    g = torch.Generator().manual_seed(a.seed * 1_000_003 + step)
    ix = torch.randint(len(data) - a.ctx - 1, (a.global_batch,), generator=g)[rank::world]
    x = torch.stack([data[i:i + a.ctx] for i in ix])
    y = torch.stack([data[i + 1:i + 1 + a.ctx] for i in ix])
    return x, y


def rss_mb():
    r = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return round(r / (1024 * 1024 if sys.platform == "darwin" else 1024), 1)


def latest_ckpt(d):
    try:
        name = open(os.path.join(d, "latest")).read().strip()
        return os.path.join(d, name)
    except FileNotFoundError:
        return None


def train(a, rank, world, local_rank=0, host=None, extra_start=None):
    """Assumes the process group is initialised when world > 1."""
    host = host or os.environ.get("MI_HOST") or socket.gethostname()
    logf = None
    if a.log_dir:
        os.makedirs(a.log_dir, exist_ok=True)
        logf = open(os.path.join(a.log_dir, f"rank{rank}.jsonl"), "a")

    def emit(ev, **kw):
        rec = {"ev": ev, "rank": rank, "world": world, "host": host, "ts": round(time.time(), 3),
               "t": round(time.time() - T0, 3), **kw}
        line = json.dumps(rec)
        print(line, flush=True)
        if logf:
            logf.write(line + "\n"); logf.flush()

    torch.set_num_threads(a.threads)
    torch.use_deterministic_algorithms(True)
    data, vocab = load_text(a.data)
    torch.manual_seed(a.seed)
    model = GPT(vocab, a.d, a.layers, a.heads, a.ctx)
    nparams = sum(p.numel() for p in model.parameters())
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr)
    start = 0
    ck = None if a.no_resume else latest_ckpt(a.ckpt_dir)
    if ck:
        st = torch.load(ck, map_location="cpu")
        model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"]); start = st["step"]
    ddp = nn.parallel.DistributedDataParallel(model) if world > 1 else model
    emit("start", local_rank=local_rank, pid=os.getpid(), params=nparams, start_step=start,
         resumed_from=os.path.basename(ck) if ck else None, torch=torch.__version__,
         init_s=round(time.time() - T0, 3), **(extra_start or {}))
    if ck:
        emit("resume", step=start, ckpt=os.path.basename(ck))
    loss_v = gl = None
    for step in range(start, a.steps):
        x, y = get_batch(data, step, a, rank, world)
        loss = F.cross_entropy(ddp(x).view(-1, vocab), y.view(-1))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        opt.step()
        g = loss.detach().clone()
        if world > 1:
            dist.all_reduce(g)
            g /= world
        loss_v, gl = loss.item(), g.item()
        if a.step_sleep_ms > 0:
            time.sleep(a.step_sleep_ms / 1000)
        if rank == a.slow_rank and a.slow_ms > 0:
            time.sleep(a.slow_ms / 1000)
        done = step + 1
        if rank == a.crash_rank and done == a.crash_step:
            emit("crash", step=done, code=13)
            os._exit(13)
        if done % a.log_every == 0 or step == start or done == a.steps:
            emit("step", step=done, loss=loss_v, gloss=gl, rss_mb=rss_mb())
        if a.ckpt_every > 0 and (done % a.ckpt_every == 0 or done == a.steps):
            t = time.time()
            if rank == 0:
                os.makedirs(a.ckpt_dir, exist_ok=True)
                name = f"step_{done:06d}.pt"
                tmp = os.path.join(a.ckpt_dir, name + ".tmp")
                torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "step": done}, tmp)
                os.replace(tmp, os.path.join(a.ckpt_dir, name))
                with open(os.path.join(a.ckpt_dir, "latest.tmp"), "w") as f:
                    f.write(name)
                os.replace(os.path.join(a.ckpt_dir, "latest.tmp"), os.path.join(a.ckpt_dir, "latest"))
                emit("ckpt", step=done, file=name, bytes=os.path.getsize(os.path.join(a.ckpt_dir, name)),
                     secs=round(time.time() - t, 4))
            if world > 1:
                dist.barrier()
    emit("end", step=a.steps, loss=loss_v, gloss=gl, wall_s=round(time.time() - T0, 3), rss_mb=rss_mb())
    return gl


def main():
    a = parse()
    rank, world = int(os.environ.get("RANK", 0)), int(os.environ.get("WORLD_SIZE", 1))
    local_rank = int(os.environ.get("LOCAL_RANK", 0))
    if world > 1:
        dist.init_process_group(a.backend, timeout=datetime.timedelta(seconds=a.timeout_s))
    keys = ("MASTER_ADDR", "MASTER_PORT", "GROUP_RANK", "LOCAL_WORLD_SIZE", "TORCHELASTIC_RESTART_COUNT",
            "SLURM_JOB_ID", "SLURM_PROCID", "SLURM_NODEID", "JOB_COMPLETION_INDEX")
    env = {k.lower(): os.environ[k] for k in keys if k in os.environ}
    train(a, rank, world, local_rank, extra_start={"env": env})
    if world > 1:
        dist.destroy_process_group()


if __name__ == "__main__":
    main()
