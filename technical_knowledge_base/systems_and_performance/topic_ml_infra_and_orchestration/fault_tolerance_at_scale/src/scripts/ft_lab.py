#!/usr/bin/env python3
"""Fault tolerance child page: two cheap native experiments on the running example (4 ranks, gloo, CPU).

Same model, data order, optimiser and seed as the topic's running example (imports its train.py), with two
changes, both needed for measurement and applied to every run of a mode, including its reference run:
  * a DDP communication hook replaces DDP's built-in all-reduce (same all-reduce, then divide by the world
    size). It records when the gradient bucket became ready (local compute finished) and when the
    all-reduce completed, and it is where a gradient bit flip is injected;
  * DDP's one-time bucket rebuild after the first iteration is switched off (the root's Failure lab showed
    that a restarted process otherwise sums in a different order and differs in the last bit), so that a
    replay from a checkpoint reproduces the original arithmetic exactly.

Modes
  strag:  per-rank compute time and all-reduce time for every step, with emulated stragglers (a sleep
          inside forward on a schedule: --slow "rank:first:last:ms[:every]" ...).
  sdc:    one bit flipped at one step, in a gradient before the all-reduce (--flip grad) or in a weight
          after the optimiser step (--flip weight), on one rank; every step logs the global loss, the
          global gradient norm and whether the ranks' weight checksums agree. Checkpoint at --ckpt-at.
  replay: load the checkpoint written by an sdc run and recompute its steps cleanly, step by step.

Run (natively, from any folder):
  MI_TRAIN_DIR=<root src/data/train> torchrun --standalone --nproc-per-node 4 ft_lab.py --mode strag --out DIR ...
"""
import argparse, datetime, json, os, struct, sys, time

sys.path.insert(0, os.environ["MI_TRAIN_DIR"])
import train as T  # noqa: E402
import torch  # noqa: E402
import torch.distributed as dist  # noqa: E402
import torch.nn.functional as F  # noqa: E402
import torch.nn.parallel as P  # noqa: E402


def flip_bit(t, idx, bit):
    """Flip bit `bit` of float32 element `idx` of the flat view of tensor t, in place. Returns (before, after)."""
    flat = t.view(-1)
    before = flat[idx].item()
    iv = flat.view(torch.int32)
    iv[idx] = iv[idx] ^ (1 << bit) if bit < 31 else iv[idx] ^ -(1 << 31)
    return before, flat[idx].item()


def checksum(model):
    """An integer fingerprint of every weight bit (sum of the int32 views, as int64)."""
    s = 0
    for p in model.parameters():
        s += int(p.detach().view(-1).view(torch.int32).to(torch.int64).sum())
    return s


class NoRebuild:
    def __init__(self, r): object.__setattr__(self, "_r", r)
    def _rebuild_buckets(self): return False
    def __getattr__(self, k): return getattr(self._r, k)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mode", required=True, choices=["strag", "sdc", "replay"])
    ap.add_argument("--out", required=True)
    ap.add_argument("--steps", type=int, default=200)
    ap.add_argument("--slow", nargs="*", default=[], help="rank:first:last:ms[:every]")
    ap.add_argument("--flip", default="", choices=["", "grad", "weight"])
    ap.add_argument("--flip-rank", type=int, default=2)
    ap.add_argument("--flip-step", type=int, default=120)
    ap.add_argument("--flip-index", type=int, default=1000, help="-1: the largest element (gradient flips)")
    ap.add_argument("--flip-bit", type=int, default=3)
    ap.add_argument("--ckpt-at", type=int, default=100)
    ap.add_argument("--replay-from", default="")
    ap.add_argument("--replay-to", type=int, default=150)
    ap.add_argument("--data", default=os.environ.get("MI_DATA", "input.txt"))
    o = ap.parse_args()
    a = T.parse(["--data", o.data])
    rank, world = int(os.environ["RANK"]), int(os.environ["WORLD_SIZE"])
    dist.init_process_group("gloo", timeout=datetime.timedelta(seconds=60))
    torch.set_num_threads(1)
    torch.use_deterministic_algorithms(True)
    data, vocab = T.load_text(a.data)
    torch.manual_seed(a.seed)
    model = T.GPT(vocab, a.d, a.layers, a.heads, a.ctx)
    opt = torch.optim.AdamW(model.parameters(), lr=a.lr)
    start, stop = 0, o.steps
    if o.mode == "replay":
        st = torch.load(o.replay_from, map_location="cpu")
        model.load_state_dict(st["model"]); opt.load_state_dict(st["opt"]); start = st["step"]; stop = o.replay_to
    ddp = P.DistributedDataParallel(model)
    ddp.reducer = NoRebuild(ddp.reducer)

    slow = []
    for s in o.slow:
        f = [int(x) for x in s.split(":")]
        slow.append((f[0], f[1], f[2], f[3], f[4] if len(f) > 4 else 1))
    cur = {"lgh": 0, "step": 0, "t_hook": 0.0, "t_done": 0.0, "nb": 0, "flip": None, "gn2": 0.0}

    def hook(state, bucket):
        cur["t_hook"] = time.perf_counter(); cur["nb"] += 1
        buf = bucket.buffer()
        if o.flip == "grad" and rank == o.flip_rank and cur["step"] == o.flip_step:
            i = o.flip_index if o.flip_index >= 0 else int(buf.abs().argmax())  # -1: the largest gradient element
            cur["flip"] = flip_bit(buf, i, o.flip_bit); cur["fidx"] = i
        if o.mode != "strag":
            cur["lgh"] = int(buf.view(torch.int32).to(torch.int64).sum())  # fingerprint of this rank's local gradients
        fut = dist.all_reduce(buf, async_op=True).get_future()

        def done(f):
            cur["t_done"] = time.perf_counter()
            g = f.value()[0].div_(world)
            cur["gn2"] += float((g.double() ** 2).sum())
            return g
        return fut.then(done)
    ddp.register_comm_hook(None, hook)

    orig_fwd = model.forward

    def fwd(idx):
        s = cur["step"]
        for (r, a0, a1, ms, every) in slow:
            if r == rank and a0 <= s <= a1 and (s - a0) % every == 0:
                time.sleep(ms / 1000)
        return orig_fwd(idx)
    model.forward = fwd

    os.makedirs(o.out, exist_ok=True)
    recs = []
    for step in range(start, stop):
        cur["step"] = step + 1; cur["nb"] = 0; cur["gn2"] = 0.0
        x, y = T.get_batch(data, step, a, rank, world)
        t0 = time.perf_counter()
        loss = F.cross_entropy(ddp(x).view(-1, vocab), y.view(-1))
        opt.zero_grad(set_to_none=True)
        loss.backward()
        t_bwd = time.perf_counter()
        opt.step()
        if o.flip == "weight" and rank == o.flip_rank and cur["step"] == o.flip_step:
            with torch.no_grad():
                w = model.blocks[0].fc.weight
                cur["flip"] = flip_bit(w.data, o.flip_index, o.flip_bit)
        g = loss.detach().clone(); dist.all_reduce(g); g /= world
        t1 = time.perf_counter()
        r = {"step": cur["step"], "rank": rank, "loss": loss.item(), "gloss": g.item(),
             "compute_ms": round((cur["t_hook"] - t0) * 1000, 3), "comm_ms": round((cur["t_done"] - cur["t_hook"]) * 1000, 3),
             "step_ms": round((t1 - t0) * 1000, 3), "buckets": cur["nb"]}
        if o.mode != "strag":
            r["gnorm"] = cur["gn2"] ** 0.5
            r["lgh"] = cur["lgh"]
            ck = torch.tensor([checksum(model)], dtype=torch.int64)
            allck = [torch.zeros(1, dtype=torch.int64) for _ in range(world)]
            dist.all_gather(allck, ck)
            r["cks_agree"] = len({int(c) for c in allck}) == 1
        if cur["flip"] is not None and cur["step"] == o.flip_step:
            r["flip"] = {"kind": o.flip, "index": cur.get("fidx", o.flip_index), "bit": o.flip_bit, "before": cur["flip"][0], "after": cur["flip"][1]}
        recs.append(r)
        if o.mode == "sdc" and cur["step"] == o.ckpt_at and rank == 0:
            torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "step": cur["step"]},
                       os.path.join(o.out, f"step_{cur['step']:06d}.pt"))
        dist.barrier()
    with open(os.path.join(o.out, f"rank{rank}.jsonl"), "w") as f:
        for r in recs:
            f.write(json.dumps(r) + "\n")
    dist.destroy_process_group()


if __name__ == "__main__":
    main()
