"""The autograd graph and engine on one block of the running example (deterministic).

python autograd_graph.py > ../inputs/engine.json

One Block (block 0 of the seeded running example, d_model 256, batch 8 x 64) applied to a leaf input x
(the embedding output, detached, requires_grad=True); loss = mean(block(x) ** 2).
Three variants on the same input and weights: plain, saved tensors offloaded with a pack/unpack pair
(torch.autograd.graph.saved_tensors_hooks; on MPS with save_on_cpu), and the block checkpointed (non-reentrant).
Records every node (name, sequence number, edges, saved tensors and bytes), the order backward ran them, every
ATen call made during backward with the node that was running, live bytes after forward, gradients equal or not,
the engine thread per device, and a re-run of the engine's scheduling rule (ready queue ordered by sequence number,
AccumulateGrad first) to check it reproduces the recorded order.
"""
import heapq
import json
import os
import sys
import threading
import warnings
import weakref

import torch
from torch.utils._python_dispatch import TorchDispatchMode
from torch.utils.checkpoint import checkpoint

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, make_model, get_batch  # noqa: E402

torch.set_num_threads(2)
cfg = GPTConfig()
out = {"torch": torch.__version__, "config": "Block 0 of the running example, input (8, 64, 256) float32, loss = mean(block(x)**2)"}

MAXSEQ = 2 ** 64 - 1


class Live(TorchDispatchMode):
    """Tracks every storage an ATen call creates, with a finalizer, so live bytes are exact."""

    def __init__(self):
        super().__init__()
        self.live = {}
        self.ops = []
        self.tag = None

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        ins = {a.untyped_storage().data_ptr() for a in args if isinstance(a, torch.Tensor) and a.device.type != "meta"}
        r = func(*args, **(kwargs or {}))
        self.ops.append((func.overloadpacket.__name__, self.tag))
        rs = r if isinstance(r, (tuple, list)) else [r]
        for t in rs:
            if isinstance(t, torch.Tensor) and t.device.type == "cpu":
                s = t.untyped_storage()
                p = s.data_ptr()
                if p and p not in ins and p not in self.live:
                    self.live[p] = s.nbytes()
                    weakref.finalize(s, self.live.pop, p, None)
        return r


def build(device):
    torch.manual_seed(0)
    m = make_model(cfg, device)
    blk = m.blocks[0]
    xb, _ = get_batch(cfg, 0, device)
    with torch.no_grad():
        x0 = m.tok(xb) + m.pos(torch.arange(cfg.block_size, device=device))
    return blk, x0


def walk(root):
    nodes, order, seen = {}, [], set()
    stack = [root]
    while stack:
        n = stack.pop()
        if n is None or n in seen:
            continue
        seen.add(n)
        order.append(n)
        for nx, _ in n.next_functions:
            if nx is not None:
                stack.append(nx)
    return order


def saved_of(n):
    res = []
    for a in dir(n):
        if a.startswith("_saved_"):
            try:
                v = getattr(n, a)
            except Exception:  # noqa: BLE001
                continue
            vs = v if isinstance(v, (tuple, list)) else [v]
            for t in vs:
                if isinstance(t, torch.Tensor):
                    res.append({"name": a[7:], "shape": list(t.shape), "bytes": t.untyped_storage().nbytes(),
                                "ptr": t.untyped_storage().data_ptr(), "is_param": False})
    return res


def record(variant, device="cpu"):
    blk, x0 = build(device)
    x = x0.detach().requires_grad_()
    params = {p.untyped_storage().data_ptr(): n for n, p in blk.named_parameters()}
    packed = []

    def pack(t):
        packed.append((list(t.shape), t.untyped_storage().nbytes(), t.device.type))
        if device == "mps":
            return (t.device, t.to("cpu"))
        return t

    def unpack(p):
        if isinstance(p, tuple):
            return p[1].to(p[0])
        return p

    mode = Live() if device == "cpu" else None
    if device == "mps":
        torch.mps.synchronize()
        base = torch.mps.current_allocated_memory()
    ctxs = []
    if variant == "offload":
        ctxs.append(torch.autograd.graph.saved_tensors_hooks(pack, unpack))
    for c in ctxs:
        c.__enter__()
    if mode:
        mode.__enter__()
        mode.tag = "forward"
    if variant == "checkpoint":
        y = checkpoint(blk, x, use_reentrant=False)
    else:
        y = blk(x)
    loss = (y ** 2).mean()
    if mode:
        mode.__exit__(None, None, None)
    for c in reversed(ctxs):
        c.__exit__(None, None, None)
    res = {"variant": variant, "device": device}
    if device == "mps":
        torch.mps.synchronize()
        res["mps_bytes_after_forward"] = torch.mps.current_allocated_memory() - base
    else:
        # live bytes created by forward and still held (the graph's saved tensors + y + loss)
        res["live_after_forward"] = sum(mode.live.values())
        res["y_bytes"] = y.untyped_storage().nbytes()
    nodes = walk(loss.grad_fn)
    idx = {n: i for i, n in enumerate(nodes)}
    info = []
    sids = {}
    for n in nodes:
        sv = saved_of(n)
        for s in sv:
            if s["ptr"] in params:
                s["is_param"] = params[s["ptr"]]
            if s["ptr"] == x.untyped_storage().data_ptr():
                s["is_param"] = "x (input)"
        nm = type(n).__name__
        if nm == "AccumulateGrad":
            v = n.variable
            pn = params.get(v.untyped_storage().data_ptr(), "x (input)")
            nm = "AccumulateGrad"
        else:
            pn = None
        info.append({"name": nm, "param": pn, "seq": n._sequence_nr() if nm != "AccumulateGrad" else MAXSEQ,
                     "next": [idx[nx] for nx, _ in n.next_functions if nx is not None],
                     "saved": [dict({k: v for k, v in s.items() if k != "ptr"}, sid=sids.setdefault(s["ptr"], len(sids))) for s in sv]})
    # backward with node pre-hooks recording order, thread, and ATen calls per node
    ran, threads = [], set()
    bmode = Live() if device == "cpu" else None

    def mk(i):
        def pre(grad_outputs):
            ran.append(i)
            threads.add(threading.get_ident())
            if bmode:
                bmode.tag = i
        return pre

    for n in nodes:
        n.register_prehook(mk(idx[n]))
    main = threading.get_ident()
    if bmode:
        bmode.__enter__()
        bmode.tag = "start"
    loss.backward()
    if bmode:
        bmode.__exit__(None, None, None)
    res["order"] = ran
    res["engine_thread_is_caller"] = threads == {main}
    res["n_threads"] = len(threads)
    res["nodes"] = info
    if bmode:
        res["backward_ops"] = [[o, t] for o, t in bmode.ops]
    res["n_packed"] = len(packed)
    res["packed_bytes"] = sum(b for _, b, _ in packed)
    res["grads"] = {n: p.grad.detach().cpu() for n, p in blk.named_parameters()}
    res["xgrad"] = x.grad.detach().cpu()
    res["loss"] = float(loss)
    return res


def simulate(info, root=0):
    """The engine's rule: dependencies = number of incoming edges from the graph; ready queue ordered by
    sequence number, largest first (engine.h L91-105); AccumulateGrad has sequence_nr UINT64_MAX (accumulate_grad.cpp L88-91)."""
    dep = [0] * len(info)
    for n in info:
        for j in n["next"]:
            dep[j] += 1
    # ties (every AccumulateGrad has the same, maximal number) are left to std::priority_queue; on this graph the
    # node pushed first ran first every time, so the re-run breaks ties that way
    cnt = 0
    heap = [(-info[root]["seq"], 0, root)]
    order = []
    while heap:
        _, _, i = heapq.heappop(heap)
        order.append(i)
        for j in info[i]["next"]:
            dep[j] -= 1
            if dep[j] == 0:
                cnt += 1
                heapq.heappush(heap, (-info[j]["seq"], cnt, j))
    return order


variants = {}
for v in ["plain", "offload", "checkpoint"]:
    variants[v] = record(v, "cpu")
ref = variants["plain"]
for v, r in variants.items():
    r["max_grad_diff_vs_plain"] = max(float((r["grads"][k] - ref["grads"][k]).abs().max()) for k in r["grads"])
    r["max_xgrad_diff_vs_plain"] = float((r["xgrad"] - ref["xgrad"]).abs().max())
    sim = simulate(r["nodes"])
    r["simulated_order_matches"] = sim == r["order"]
    r["simulated_order"] = sim
for r in variants.values():
    del r["grads"], r["xgrad"]
out["cpu"] = variants

if torch.backends.mps.is_available():
    mv = {}
    for v in ["plain", "offload", "checkpoint"]:
        r = record(v, "mps")
        mv[v] = {k: r[k] for k in ["mps_bytes_after_forward", "engine_thread_is_caller", "n_threads", "n_packed", "packed_bytes", "loss", "nodes", "order"]}
        mv[v]["simulated_order_matches"] = simulate(r["nodes"]) == r["order"]
        mv[v]["order_same_as_cpu"] = r["order"] == variants[v]["order"]
        mv[v]["grads"] = r["grads"]
    for v in mv:
        mv[v]["max_grad_diff_vs_plain"] = max(float((mv[v]["grads"][k] - mv["plain"]["grads"][k]).abs().max()) for k in mv[v]["grads"])
    for v in mv:
        del mv[v]["grads"]
    out["mps"] = mv
print(json.dumps(out, indent=1))
