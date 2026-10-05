"""Walk the real autograd graph of one tiny transformer block (PyTorch, pinned version printed).
Writes out/graph.json: every grad_fn node, its edges, and every tensor it saved for backward."""
import json, os, torch
from blk import make_params, model_loss

torch.manual_seed(0)
B, T, d, h, f, V = 1, 4, 8, 2, 32, 16
P = make_params(d, h, f, V, L=1, seed=0)
tokens = torch.tensor([[3, 1, 4, 1, 5]])
names = {}
loss = model_loss(tokens, P, names=names)

# label nodes by the named intermediate that produced them
label = {}
for n, t in names.items():
    if t.grad_fn is not None:
        label[id(t.grad_fn)] = n
label[id(loss.grad_fn)] = "loss"
param_names = {}
for k, v in P.items():
    if isinstance(v, torch.Tensor):
        param_names[id(v)] = k
for k, v in P["layers"][0].items():
    param_names[id(v)] = k
param_ptr = {v.data_ptr(): k for k, v in list(P["layers"][0].items()) + [("emb", P["emb"]), ("lnf_w", P["lnf_w"]), ("lnf_b", P["lnf_b"])]}

nodes, order, seen = {}, [], set()
stack = [loss.grad_fn]
idx = {}
while stack:
    fn = stack.pop()
    if fn is None or id(fn) in seen:
        continue
    seen.add(id(fn))
    idx[id(fn)] = len(order)
    order.append(fn)
    for nxt, _ in fn.next_functions:
        if nxt is not None:
            stack.append(nxt)

out = []
total_saved = {}
for fn in order:
    name = type(fn).__name__
    rec = {"i": idx[id(fn)], "op": name, "label": label.get(id(fn), ""), "next": [], "saved": []}
    for nxt, _ in fn.next_functions:
        rec["next"].append(idx[id(nxt)] if nxt is not None else None)
    if name == "AccumulateGrad":
        rec["param"] = param_names.get(id(fn.variable), "?")
        rec["shape"] = list(fn.variable.shape)
    for attr in sorted(dir(fn)):
        if not attr.startswith("_saved_"):
            continue
        try:
            val = getattr(fn, attr)
        except Exception as e:
            rec["saved"].append({"name": attr[7:], "err": str(e)[:80]})
            continue
        if isinstance(val, torch.Tensor):
            ptr = val.untyped_storage().data_ptr()
            is_param = ptr in param_ptr
            nb = val.untyped_storage().nbytes()
            rec["saved"].append({"name": attr[7:], "shape": list(val.shape), "dtype": str(val.dtype).replace("torch.", ""),
                                 "bytes": val.numel() * val.element_size(), "storage_bytes": nb,
                                 "is_param": param_ptr.get(ptr, "") if is_param else ""})
            if not is_param:
                total_saved[ptr] = nb
        elif isinstance(val, (int, float, bool, str)) or val is None:
            rec["saved"].append({"name": attr[7:], "value": val if not isinstance(val, float) or val == val else "nan"})
        elif isinstance(val, (tuple, list)):
            rec["saved"].append({"name": attr[7:], "value": [x if isinstance(x, (int, float, bool)) else str(x) for x in val][:8]})
        else:
            rec["saved"].append({"name": attr[7:], "value": str(val)[:40]})
    out.append(rec)

# what saved_tensors_hooks see during the forward (a second, independent count)
packed = []
def pack(t):
    packed.append((t.untyped_storage().data_ptr(), t.untyped_storage().nbytes(), tuple(t.shape)))
    return t
with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
    loss2 = model_loss(tokens, P)
uniq = {}
for ptr, nb, s in packed:
    if ptr not in param_ptr:
        uniq[ptr] = nb

exec_order = []
for fn in order:
    fn.register_prehook(lambda go, i=idx[id(fn)]: exec_order.append(i))
for r, fn in zip(out, order):
    try:
        r["seq"] = fn._sequence_nr()
    except Exception:
        r["seq"] = None
loss.backward()
res = {"exec_order": exec_order, "torch": torch.__version__, "git": torch.version.git_version, "config": dict(B=B, T=T, d=d, h=h, f=f, V=V),
       "tokens": tokens.tolist(), "loss": loss.item(), "nodes": out,
       "saved_unique_nonparam_bytes": sum(total_saved.values()), "hook_packed_count": len(packed),
       "hook_unique_nonparam_bytes": sum(uniq.values()),
       "n_nodes": len(out), "n_accumulate": sum(1 for r in out if r["op"] == "AccumulateGrad"),
       "grad_norms": {k: float(v.grad.norm()) for k, v in P["layers"][0].items()}}
os.makedirs("out", exist_ok=True)
json.dump(res, open("out/graph.json", "w"), indent=1)
print(res["torch"], "nodes", res["n_nodes"], "acc", res["n_accumulate"], "loss", round(res["loss"], 4),
      "exec", exec_order, "saved", res["saved_unique_nonparam_bytes"], "hook", res["hook_unique_nonparam_bytes"], len(packed))
for r in out:
    print(r["i"], r.get("seq"), r["op"], r["label"], r.get("param", ""), [(s["name"], s.get("shape", s.get("value"))) for s in r["saved"]], r["next"])
