"""What the backward pass keeps: walk the autograd graph of the measured stack (cost.CFG) and sum the bytes of
every saved tensor by operation, counting each storage once and leaving out the parameters."""
import json, torch
import cost
from blk import model_loss

P, tok = cost.setup()
names = {}
loss = model_loss(tok, P, names=names)
param_ptrs = {p.untyped_storage().data_ptr() for p in cost.params_of(P)}
seen_fn, seen_st = set(), {}
by_op = {}
stack = [loss.grad_fn]
while stack:
    fn = stack.pop()
    if fn is None or id(fn) in seen_fn:
        continue
    seen_fn.add(id(fn))
    stack += [n for n, _ in fn.next_functions if n is not None]
    op = type(fn).__name__
    for a in dir(fn):
        if not a.startswith("_saved_"):
            continue
        try:
            v = getattr(fn, a)
        except Exception:
            continue
        if not isinstance(v, torch.Tensor):
            continue
        st = v.untyped_storage(); ptr = st.data_ptr()
        if ptr in param_ptrs or ptr in seen_st:
            continue
        seen_st[ptr] = st.nbytes()
        key = op + "." + a[7:]
        e = by_op.setdefault(key, [0, 0, list(v.shape)])
        e[0] += 1; e[1] += st.nbytes()
tot = sum(seen_st.values())
res = dict(cfg=cost.CFG, total_saved_bytes=tot, by_op={k: dict(count=v[0], bytes=v[1], shape=v[2]) for k, v in sorted(by_op.items(), key=lambda kv: -kv[1][1])})
json.dump(res, open("out/savedops.json", "w"), indent=1)
print("total MiB", tot / 2**20)
for k, v in res["by_op"].items():
    print(k, v)
