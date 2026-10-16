#!/usr/bin/env python3
"""Storage lab: checkpointing a multi-rank job. Run under torchrun (gloo, CPU, 1 thread per rank).

The model is train.py's GPT scaled to d 512, 8 layers, 8 heads (25,319,489 parameters; about 304 MB with
AdamW state), trained on train.py's batches (same seed, same global batch of 32 x 64 characters).

--mode layouts : one checkpoint written five ways, each timed on every rank:
    ddp_rank0      DDP, rank 0 writes the whole state (train.py's way)
    ddp_every      DDP, every rank writes the whole state (the forgotten `if rank == 0`)
    fsdp_full      FSDP2, gather the full state on rank 0 (cpu_offload), rank 0 writes one file
    fsdp_dcp       FSDP2, torch.distributed.checkpoint (DCP): every rank writes its own shard, in parallel
    ddp_dcp        DDP, DCP: replicated tensors are de-duplicated and the writes spread over ranks
--mode train   : FSDP2 training with a checkpoint every --every steps, --ckpt none|sync|async;
                 logs every step's wall time on every rank (the before/after of async checkpointing)
--mode reshard : load a DCP checkpoint written by a different number of ranks and compare it to the full one
Every write is followed by fsync (F_FULLFSYNC on macOS) of every file written, so the bytes are on the device.
Prints JSON lines on rank 0 (and per-rank records where noted).
"""
import argparse, datetime, glob, shutil, importlib.util, json, os, sys, time, platform
import torch, torch.distributed as dist, torch.nn as nn, torch.nn.functional as F
from torch.distributed.fsdp import fully_shard
from torch.distributed.device_mesh import init_device_mesh
import torch.distributed.checkpoint as dcp
from torch.distributed.checkpoint.state_dict import get_state_dict, set_state_dict, StateDictOptions


def fsync_path(path):
    paths = [path] if os.path.isfile(path) else [os.path.join(path, f) for f in os.listdir(path) if os.path.isfile(os.path.join(path, f))]
    for p in paths:
        fd = os.open(p, os.O_RDONLY)
        try:
            if sys.platform == "darwin":
                import fcntl; fcntl.fcntl(fd, fcntl.F_FULLFSYNC)
            else:
                os.fsync(fd)
        finally:
            os.close(fd)


def dir_bytes(d):
    return {f: os.path.getsize(os.path.join(d, f)) for f in sorted(os.listdir(d))}  # includes DCP's .metadata


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--train-py", required=True); ap.add_argument("--data", required=True)
    ap.add_argument("--out", required=True); ap.add_argument("--mode", required=True)
    ap.add_argument("--reps", type=int, default=3); ap.add_argument("--steps", type=int, default=60)
    ap.add_argument("--every", type=int, default=15); ap.add_argument("--ckpt", default="none")
    ap.add_argument("--async-pg", default="separate", help="separate: async_save gets its own gloo group (the PyTorch blog's advice); default: it shares the training group")
    ap.add_argument("--pg-timeout", type=int, default=120)
    ap.add_argument("--src", default=""); ap.add_argument("--d", type=int, default=512); ap.add_argument("--layers", type=int, default=8)
    a = ap.parse_args()
    dist.init_process_group("gloo", timeout=datetime.timedelta(seconds=a.pg_timeout))
    r, W = dist.get_rank(), dist.get_world_size()
    torch.set_num_threads(1)
    spec = importlib.util.spec_from_file_location("mi_train", a.train_py)
    T = importlib.util.module_from_spec(spec); spec.loader.exec_module(T)
    targs = T.parse(["--d", str(a.d), "--layers", str(a.layers), "--heads", "8"])
    data, vocab = T.load_text(a.data)

    def log(**kw):
        if r == 0: print(json.dumps({"world": W, "os": platform.system(), "torch": torch.__version__, **kw}), flush=True)

    def build(kind):
        torch.manual_seed(1234)
        m = T.GPT(vocab, a.d, a.layers, 8, 64)
        n = sum(p.numel() for p in m.parameters())
        if kind == "fsdp":
            mesh = init_device_mesh("cpu", (W,))
            for b in m.blocks: fully_shard(b, mesh=mesh)
            fully_shard(m, mesh=mesh); wrapped = m
        else:
            wrapped = nn.parallel.DistributedDataParallel(m)
        opt = torch.optim.AdamW(m.parameters(), lr=targs.lr)
        return m, wrapped, opt, n

    def step(wrapped, opt, s):
        x, y = T.get_batch(data, s, targs, r, W)
        loss = F.cross_entropy(wrapped(x).view(-1, vocab), y.view(-1))
        opt.zero_grad(set_to_none=True); loss.backward(); opt.step()
        return loss

    os.makedirs(a.out, exist_ok=True)
    if a.mode == "layouts":
        for kind_mode in ["ddp_rank0", "ddp_every", "fsdp_full", "fsdp_dcp", "ddp_dcp"]:
            kind = "fsdp" if kind_mode.startswith("fsdp") else "ddp"
            m, wrapped, opt, n = build(kind)
            step(wrapped, opt, 0)
            for rep in range(a.reps):
                dst = os.path.join(a.out, f"{kind_mode}_{rep}")
                dist.barrier(); t0 = time.perf_counter(); tg = t0; files = 0
                if kind_mode in ("ddp_rank0", "ddp_every"):
                    if r == 0 or kind_mode == "ddp_every":
                        os.makedirs(dst, exist_ok=True)
                        f = os.path.join(dst, f"rank{r}.pt")
                        torch.save({"model": m.state_dict(), "opt": opt.state_dict(), "step": 1}, f); fsync_path(f); files = 1
                elif kind_mode == "fsdp_full":
                    msd, osd = get_state_dict(m, opt, options=StateDictOptions(full_state_dict=True, cpu_offload=True))
                    tg = time.perf_counter()
                    if r == 0:
                        os.makedirs(dst, exist_ok=True)
                        f = os.path.join(dst, "full.pt"); torch.save({"model": msd, "optim": osd, "step": 1}, f); fsync_path(f); files = 1
                else:
                    msd, osd = get_state_dict(m, opt)
                    tg = time.perf_counter()
                    dcp.save({"model": msd, "optim": osd}, checkpoint_id=dst)
                    if os.path.exists(os.path.join(dst, f"__{r}_0.distcp")):
                        fsync_path(os.path.join(dst, f"__{r}_0.distcp")); files = 1
                t1 = time.perf_counter()
                dist.barrier(); t2 = time.perf_counter()
                mine = torch.tensor([t1 - t0, tg - t0, float(files)])
                allr = [torch.zeros(3) for _ in range(W)]; dist.all_gather(allr, mine)
                if r == 0:
                    log(mode="layouts", layout=kind_mode, rep=rep, params=n, wall_s=round(t2 - t0, 4),
                        rank_s=[round(float(x[0]), 4) for x in allr], gather_s=[round(float(x[1]), 4) for x in allr],
                        files=dir_bytes(dst))
                dist.barrier()
                if r == 0:
                    shutil.rmtree(dst)
            del m, wrapped, opt
    elif a.mode == "train":
        m, wrapped, opt, n = build("fsdp")
        fut = None; times = []
        ck_pg = dist.new_group(backend="gloo") if (a.ckpt == "async" and a.async_pg == "separate") else None
        for s in range(a.steps):
            t0 = time.perf_counter()
            loss = step(wrapped, opt, s)
            ck_s = 0.0; kind = ""
            if a.ckpt != "none" and (s + 1) % a.every == 0:
                tc = time.perf_counter()
                dst = os.path.join(a.out, f"{a.ckpt}_step{s + 1}")
                msd, osd = get_state_dict(m, opt)
                if a.ckpt == "sync":
                    dcp.save({"model": msd, "optim": osd}, checkpoint_id=dst)
                    fsync_path(os.path.join(dst, f"__{r}_0.distcp")); kind = "sync"
                else:
                    if fut is not None: fut.result()  # one checkpoint in flight at a time
                    fut = dcp.async_save({"model": msd, "optim": osd}, checkpoint_id=dst, process_group=ck_pg); kind = "async"
                ck_s = time.perf_counter() - tc
            dist.barrier()
            dt = time.perf_counter() - t0
            mine = torch.tensor([dt, ck_s]); allr = [torch.zeros(2) for _ in range(W)]; dist.all_gather(allr, mine)
            if r == 0: print(f"step {s + 1} {dt:.3f}s ckpt {ck_s:.3f}s", file=sys.stderr, flush=True)
            times.append({"step": s + 1, "wall_s": round(max(float(x[0]) for x in allr), 4),
                          "ckpt_block_s": round(max(float(x[1]) for x in allr), 4), "ckpt": kind, "loss": round(loss.item(), 5)})
        if fut is not None: fut.result()
        log(mode="train", ckpt=a.ckpt, async_pg=a.async_pg if a.ckpt == "async" else None, every=a.every, params=n, steps=times,
            files=dir_bytes(os.path.join(a.out, f"{a.ckpt}_step{a.every}")) if a.ckpt != "none" else {})
    elif a.mode == "reshard":
        # a.src: a DCP checkpoint written by some number of ranks; compare with a full one gathered here
        m, wrapped, opt, n = build("fsdp")
        step(wrapped, opt, 0)
        msd, osd = get_state_dict(m, opt)
        t0 = time.perf_counter()
        dcp.load({"model": msd, "optim": osd}, checkpoint_id=a.src)
        set_state_dict(m, opt, model_state_dict=msd, optim_state_dict=osd)
        t1 = time.perf_counter()
        full, _ = get_state_dict(m, opt, options=StateDictOptions(full_state_dict=True, cpu_offload=True))
        if r == 0:
            ref = torch.load(os.path.join(a.src + "_full", "full.pt"), map_location="cpu", weights_only=False)["model"]
            same = all(torch.equal(full[k], ref[k]) for k in ref)
            meta = json.load(open(os.path.join(a.src + "_full", "meta.json")))
            log(mode="reshard", saved_by_ranks=meta["world"], loaded_by_ranks=W, load_s=round(t1 - t0, 4),
                tensors=len(ref), identical_to_full=same)
    elif a.mode == "make_src":
        # write a DCP checkpoint at this world size plus the full state for comparison
        m, wrapped, opt, n = build("fsdp")
        for s in range(3): step(wrapped, opt, s)
        msd, osd = get_state_dict(m, opt)
        dcp.save({"model": msd, "optim": osd}, checkpoint_id=a.src)
        full, fo = get_state_dict(m, opt, options=StateDictOptions(full_state_dict=True, cpu_offload=True))
        if r == 0:
            os.makedirs(a.src + "_full", exist_ok=True)
            torch.save({"model": full}, os.path.join(a.src + "_full", "full.pt"))
            json.dump({"world": W}, open(os.path.join(a.src + "_full", "meta.json"), "w"))
            log(mode="make_src", files=dir_bytes(a.src))
    dist.barrier()
    dist.destroy_process_group()


if __name__ == "__main__":
    main()
