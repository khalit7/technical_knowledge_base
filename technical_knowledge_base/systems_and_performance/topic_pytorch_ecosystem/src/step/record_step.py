"""Record one real training step of the running example, op by op.

    python record_step.py --device cpu  --out inputs/step_cpu.json
    python record_step.py --device mps  --out inputs/step_mps.json
    python record_step.py --device cpu  --checkpoint --out inputs/step_cpu_ckpt.json

What it records, for the step after one warm-up step (so AdamW's state already exists):
- every ATen op that reaches the dispatcher below autograd (a TorchDispatchMode sees exactly
  these), in forward, backward and optimizer step;
- for each op: input and output shapes, strides, storage offsets and dtypes; whether an output
  got a NEW storage (and its bytes) or shares an input's storage (a view or an in-place op);
- the dispatch keys the call passed through, reconstructed from the tensors' dispatch key sets,
  the thread-local state (grad mode, inference mode) and the op's dispatch table (which keys
  have a real kernel for this op rather than a fallthrough);
- live bytes after each op, tracked per storage with weakref finalizers on the storage objects
  (and, on MPS, the allocator's own torch.mps.current_allocated_memory as a cross-check);
- the autograd graph after forward: every node, its edges, its saved tensors (shape, bytes,
  and whether the storage is a parameter, the batch, or an activation), and the order
  backward executes the nodes (pre-hooks on every node).
Deterministic: no timing here (see time_step.py, run under the bench lock).
"""
import argparse, json, os, sys, weakref, re
import torch
from torch.utils._python_dispatch import TorchDispatchMode

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "model"))
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step  # noqa: E402

DT = {torch.float32: "f32", torch.int64: "i64", torch.bool: "b", torch.float64: "f64", torch.float16: "f16",
      torch.bfloat16: "bf16", torch.uint8: "u8", torch.int32: "i32"}


def dts(t):
    return DT.get(t.dtype, str(t.dtype).replace("torch.", ""))


def flat_tensors(x):
    if isinstance(x, torch.Tensor):
        return [x]
    if isinstance(x, (list, tuple)):
        out = []
        for e in x:
            out += flat_tensors(e)
        return out
    if isinstance(x, dict):
        out = []
        for e in x.values():
            out += flat_tensors(e)
        return out
    return []


KERNEL_CACHE = {}


def has_kernel(opname, key):
    k = (opname, key)
    if k not in KERNEL_CACHE:
        try:
            KERNEL_CACHE[k] = torch._C._dispatch_has_kernel_for_dispatch_key(opname, key)
        except Exception:
            KERNEL_CACHE[k] = False
    return KERNEL_CACHE[k]


class Recorder(TorchDispatchMode):
    def __init__(self, dev, mps):
        super().__init__()
        self.ops, self.phase, self.ctx = [], "fwd", ""
        self.live = {}          # storage key -> [bytes, category]
        self.fin = []
        self.dev, self.mps, self.optmap, self.bn = dev, mps, {}, -1
        self.backend = "MPS" if dev == "mps" else "CPU"

    # ---- storage tracking
    def skey(self, t):
        s = t.untyped_storage()
        return (s.device.type, s.data_ptr()) if s.nbytes() else None

    def track(self, t, cat):
        s = t.untyped_storage()
        if s.nbytes() == 0:
            return 0
        k = (s.device.type, s.data_ptr())
        if k in self.live:
            return 0
        self.live[k] = [s.nbytes(), cat]
        live = self.live
        self.fin.append(weakref.finalize(s, lambda k=k: live.pop(k, None)))
        return s.nbytes()

    def live_bytes(self, dev_only=True):
        return sum(b for (d, _), (b, c) in self.live.items() if (not dev_only or d == self.dev))

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        name = func._schema.name                      # e.g. aten::addmm
        if not name.startswith("aten::"):
            return func(*args, **kwargs)              # profiler markers and the like
        ins = flat_tensors(args) + flat_tensors(kwargs)
        in_keys = {self.skey(t) for t in ins}
        if self.phase == "opt":
            for k in in_keys:
                if k in self.optmap:
                    self.ctx = self.optmap[k]
                    break
        ks = set()
        for t in ins:
            ks |= {k.strip() for k in str(torch._C._dispatch_keys(t))[len("DispatchKeySet("):-1].split(",") if k.strip()}
        grad_on = torch.is_grad_enabled()
        infer = torch.is_inference_mode_enabled()
        req = any(t.requires_grad for t in ins)
        path = []
        ag = "Autograd" + self.backend
        if ag in ks and not infer:
            path.append(ag + (" (records a node)" if grad_on and req else " (nothing to record)"))
        if "ADInplaceOrView" in ks and not infer and has_kernel(name, "ADInplaceOrView"):
            path.append("ADInplaceOrView")
        path.append("Python (this recording mode)")
        path.append(self.backend)
        out = func(*args, **kwargs)
        outs = flat_tensors(out)
        orec, alloc = [], 0
        for t in outs:
            k = self.skey(t)
            shared = k in in_keys or k in self.live
            nb = 0 if shared else self.track(t, self.phase)
            alloc += nb
            orec.append([list(t.shape), list(t.stride()), t.storage_offset(), dts(t), nb])
        irec = [[list(t.shape), list(t.stride()), t.storage_offset(), dts(t)] for t in ins[:4]]
        rec = {"ph": self.phase, "op": name[6:], "ov": func._overloadname, "ctx": self.ctx,
               "keys": sorted(ks), "path": path, "rg": bool(grad_on and req),
               "in": irec, "nin": len(ins), "out": orec, "alloc": alloc,
               "live": self.live_bytes()}
        if self.phase == "bwd":
            rec["bn"] = self.bn
        if self.mps:
            rec["mps_alloc"] = torch.mps.current_allocated_memory()
        self.ops.append(rec)
        return out


def walk_graph(loss, param_keys, batch_keys):
    """Every node reachable from loss.grad_fn, with edges and saved tensors."""
    nodes, idx, order = [], {}, [loss.grad_fn]
    while order:
        n = order.pop()
        if n is None or n in idx:
            continue
        idx[n] = len(nodes)
        nodes.append(n)
        for nx, _ in n.next_functions:
            if nx is not None and nx not in idx:
                order.append(nx)
    out, seen_storage = [], set()
    for n in nodes:
        saved = []
        for a in dir(n):
            if not a.startswith("_saved_"):
                continue
            try:
                v = getattr(n, a)
            except Exception:
                continue
            for t in flat_tensors(v):
                s = t.untyped_storage()
                k = (s.device.type, s.data_ptr())
                kind = "param" if k in param_keys else "batch" if k in batch_keys else "act"
                new = kind == "act" and k not in seen_storage and s.nbytes() > 0
                if kind == "act":
                    seen_storage.add(k)
                saved.append({"name": a[7:], "shape": list(t.shape), "dtype": dts(t), "kind": kind,
                              "bytes": s.nbytes(), "counted": s.nbytes() if new else 0})
        rec = {"name": n.name(), "seq": n._sequence_nr() if n.name() != "torch::autograd::AccumulateGrad" else None,
               "next": [idx[nx] for nx, _ in n.next_functions if nx is not None], "saved": saved}
        if n.name() == "torch::autograd::AccumulateGrad":
            rec["param"] = None
            rec["_var"] = n.variable
        out.append(rec)
    return nodes, out


def camel(op):
    base = re.sub(r"_forward$", "", op.lstrip("_"))
    return "".join(p[:1].upper() + p[1:] for p in base.split("_")) + "Backward0"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--device", default="cpu")
    ap.add_argument("--checkpoint", action="store_true")
    ap.add_argument("--mode", default="train", choices=["train", "no_grad", "inference_mode"])
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    torch.set_num_threads(4)
    dev = a.device
    cfg = GPTConfig(checkpoint=a.checkpoint)
    model = make_model(cfg, dev)
    opt = make_optimizer(model)
    x0, y0 = get_batch(cfg, 0, dev)
    l0 = train_step(model, opt, x0, y0).item()          # warm-up step: creates AdamW state
    x, y = get_batch(cfg, 1, dev)
    pname = {}
    for n, p in model.named_parameters():
        pname[id(p)] = n

    R = Recorder(dev, dev == "mps")
    # pre-existing storages: parameters, optimizer state, batch
    for p in model.parameters():
        R.track(p, "param")
    for st in opt.state.values():
        for v in st.values():
            if isinstance(v, torch.Tensor):
                R.track(v, "optstate")
    for t in (x, y):
        R.track(t, "batch")
    base_live = R.live_bytes()
    param_keys = {R.skey(p) for p in model.parameters()}
    batch_keys = {R.skey(x), R.skey(y)}

    # module context for forward ops
    hooks, stack = [], [""]
    def push(mn):
        stack.append(mn); R.ctx = mn
    def pop():
        stack.pop(); R.ctx = stack[-1]
    for mn, mod in model.named_modules():
        if mn == "":
            continue
        hooks.append(mod.register_forward_pre_hook(lambda m, i, mn=mn: push(mn)))
        hooks.append(mod.register_forward_hook(lambda m, i, o: pop()))
    # optimizer context: which parameter is being updated (single-tensor loop calls ops per param)
    graph, gnodes, bwd_order = None, None, []
    res = {"device": dev, "torch": torch.__version__, "checkpoint": a.checkpoint, "mode": a.mode,
           "warmup_loss": round(l0, 4), "base_live": base_live}
    if dev == "mps":
        torch.mps.synchronize()
        res["mps_base_alloc"] = torch.mps.current_allocated_memory()
    with R:
        if a.mode == "no_grad":
            with torch.no_grad():
                _, loss = model(x, y)
        elif a.mode == "inference_mode":
            with torch.inference_mode():
                _, loss = model(x, y)
        else:
            _, loss = model(x, y)
    for h in hooks:
        h.remove()
    res["loss"] = round(loss.item(), 4)
    res["n_fwd"] = len(R.ops)
    res["live_after_fwd"] = R.live_bytes()
    if a.mode == "train":
        gnodes, graph = walk_graph(loss, param_keys, batch_keys)
        for i, n in enumerate(gnodes):
            def pre(grad_outputs, i=i):
                bwd_order.append(i)
                R.ctx = graph[i]["name"]
                R.bn = i
            n.register_prehook(pre)
        for g in graph:
            if "_var" in g:
                g["param"] = pname.get(id(g.pop("_var")))
        # map forward ops that recorded a node to graph nodes (both in creation order)
        seqd = sorted([i for i, g in enumerate(graph) if g["seq"] is not None], key=lambda i: graph[i]["seq"])
        j = 0
        for k, o in enumerate(R.ops):
            if not o["rg"] or j >= len(seqd):
                continue
            if graph[seqd[j]]["name"] == camel(o["op"]) or graph[seqd[j]]["name"].startswith(camel(o["op"])[:-9]):
                o["node"] = seqd[j]
                graph[seqd[j]]["op"] = k
                j += 1
        for o in R.ops:
            if o["rg"] and "node" not in o:
                o["rg"] = False
                o["path"][0] = o["path"][0].replace("(records a node)", "(no node: output has no history)")
        res["nodes_matched"] = j
        res["nodes_with_seq"] = len(seqd)
        res["unmatched_nodes"] = [graph[i]["name"] for i in seqd if "op" not in graph[i]]
        R.phase = "bwd"
        R.ctx = ""
        with R:
            loss.backward()
        res["n_bwd"] = len(R.ops) - res["n_fwd"]
        res["live_after_bwd"] = R.live_bytes()
        res["bwd_order"] = bwd_order
        R.phase = "opt"
        # optimizer context: the parameter whose tensors appear in the op
        pk = {R.skey(p): n for n, p in model.named_parameters()}
        R.optmap = dict(pk)
        for p, st in opt.state.items():
            for v in st.values():
                if isinstance(v, torch.Tensor):
                    R.optmap[R.skey(v)] = pname[id(p)]
        start = len(R.ops)
        with R:
            opt.step()
            opt.zero_grad(set_to_none=True)
        res["n_opt"] = len(R.ops) - start
        res["live_end"] = R.live_bytes()
        res["graph"] = graph
    res["ops"] = R.ops
    if dev == "mps":
        torch.mps.synchronize()
        res["mps_end_alloc"] = torch.mps.current_allocated_memory()
    json.dump(res, open(a.out, "w"), separators=(",", ":"))
    print(a.out, {k: v for k, v in res.items() if k not in ("ops", "graph", "bwd_order")})


if __name__ == "__main__":
    main()
