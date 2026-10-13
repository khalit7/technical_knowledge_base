"""Which SDPA implementation actually runs on this machine (CPU and MPS), what forcing each backend does, the
numerical error against a float64 reference, and how much the backward keeps (deterministic, no timing).
    python attn_backends.py  -> inputs/attn_backends.json
"""
import math, sys, warnings
import torch
import torch.nn.functional as F
from torch.nn.attention import sdpa_kernel, SDPBackend
import common

warnings.filterwarnings("ignore")
torch.set_num_threads(4)
SDPA_OPS = ("scaled_dot_product", "_safe_softmax", "softmax", "bmm", "baddbmm", "matmul")


def ops_called(fn):
    from torch.profiler import profile, ProfilerActivity
    with profile(activities=[ProfilerActivity.CPU]) as p:
        fn()
    names = []
    for e in p.events():
        n = e.name
        if n.startswith("aten::") and any(k in n for k in SDPA_OPS) and n not in names:
            names.append(n)
    return names


def ref(q, k, v, causal, mask):
    q, k, v = (t.detach().cpu().double() for t in (q, k, v))
    s = q @ k.transpose(-2, -1) / math.sqrt(q.size(-1))
    if causal:
        T = q.size(-2); s = s.masked_fill(~torch.ones(T, T, dtype=torch.bool).tril(), float("-inf"))
    if mask is not None:
        s = s + mask.cpu().double() if mask.dtype != torch.bool else s.masked_fill(~mask.cpu(), float("-inf"))
    return torch.softmax(s, -1) @ v


def case(dev, dtype, B, H, T, D, causal=True, mask_kind=None, dropout=0.0, grad=False):
    g = torch.Generator().manual_seed(0)
    q, k, v = (torch.randn(B, H, T, D, generator=g).to(dev, dtype) for _ in range(3))
    if grad:
        for t in (q, k, v): t.requires_grad_(True)
    mask = None
    if mask_kind == "bool":
        mask = torch.ones(T, T, dtype=torch.bool, device=dev).tril()
        causal_arg = False
    elif mask_kind == "float":
        mask = torch.zeros(T, T, device=dev, dtype=dtype).masked_fill(~torch.ones(T, T, dtype=torch.bool, device=dev).tril(), float("-inf"))
        causal_arg = False
    else:
        causal_arg = causal
    run = lambda: F.scaled_dot_product_attention(q, k, v, attn_mask=mask, is_causal=causal_arg, dropout_p=dropout)
    r = {"device": dev, "dtype": str(dtype).replace("torch.", ""), "shape": [B, H, T, D], "is_causal": causal_arg,
         "mask": mask_kind, "dropout": dropout, "requires_grad": grad}
    try:
        r["default_ops"] = ops_called(run)
        if dropout == 0:
            out = run()
            r["max_abs_err_vs_f64"] = float((out.detach().cpu().double() - ref(q, k, v, causal and mask_kind is None, mask)).abs().max())
    except Exception as e:
        r["default_error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:200]}"
    forced = {}
    for be in (SDPBackend.MATH, SDPBackend.FLASH_ATTENTION, SDPBackend.EFFICIENT_ATTENTION, SDPBackend.CUDNN_ATTENTION):
        try:
            with sdpa_kernel([be]):
                o = ops_called(run)
            forced[be.name] = {"ok": True, "ops": o}
        except Exception as e:
            forced[be.name] = {"ok": False, "error": f"{type(e).__name__}: {str(e).splitlines()[0][:160]}"}
    r["forced"] = forced
    return r


def saved_bytes_attn(dev, T, how, B=1, H=8, D=64):
    """Bytes autograd keeps for one attention call (unique storages, q, k, v excluded)."""
    g = torch.Generator().manual_seed(0)
    q, k, v = (torch.randn(B, H, T, D, generator=g).to(dev).requires_grad_(True) for _ in range(3))
    seen, tot = {q.untyped_storage().data_ptr(), k.untyped_storage().data_ptr(), v.untyped_storage().data_ptr()}, [0]
    shapes = []
    def pack(t):
        p = t.untyped_storage().data_ptr()
        if p not in seen:
            seen.add(p); tot[0] += t.untyped_storage().nbytes(); shapes.append(list(t.shape))
        return t
    with torch.autograd.graph.saved_tensors_hooks(pack, lambda t: t):
        if how == "sdpa":
            F.scaled_dot_product_attention(q, k, v, is_causal=True)
        else:   # written out, as GPTConfig(attn="manual")
            s = (q @ k.transpose(-2, -1)) / math.sqrt(D)
            s = s.masked_fill(~torch.ones(T, T, dtype=torch.bool, device=dev).tril(), float("-inf"))
            torch.softmax(s, -1) @ v
    return {"device": dev, "T": T, "how": how, "B": B, "H": H, "D": D, "saved_bytes": tot[0], "saved_shapes": shapes}


if __name__ == "__main__":
    out = {"env": common.env(), "cases": [], "saved": []}
    devs = ["cpu"] + (["mps"] if torch.backends.mps.is_available() else [])
    for dev in devs:
        for dtype in (torch.float32, torch.bfloat16, torch.float16):
            out["cases"].append(case(dev, dtype, 8, 4, 64, 64))
        out["cases"].append(case(dev, torch.float32, 8, 4, 64, 64, grad=True))
        out["cases"].append(case(dev, torch.float32, 8, 4, 64, 64, mask_kind="bool"))
        out["cases"].append(case(dev, torch.float32, 8, 4, 64, 64, mask_kind="float"))
        out["cases"].append(case(dev, torch.float32, 8, 4, 64, 64, dropout=0.1, grad=True))
        out["cases"].append(case(dev, torch.float32, 8, 4, 64, 80))
        out["cases"].append(case(dev, torch.float32, 8, 8, 256, 64))
        out["cases"].append(case(dev, torch.float32, 1, 8, 2048, 64))
        for T in (256, 1024, 2048):
            for how in ("sdpa", "manual"):
                out["saved"].append(saved_bytes_attn(dev, T, how))
    for c in out["cases"]:
        print(c["device"], c["dtype"], c["shape"], c["mask"], c["dropout"], c.get("default_ops"), c.get("default_error"), c.get("max_abs_err_vs_f64"),
              {k: v["ok"] for k, v in c["forced"].items()}, file=sys.stderr)
    for s in out["saved"]:
        print(s["device"], s["T"], s["how"], s["saved_bytes"], s["saved_shapes"], file=sys.stderr)
    common.dump("attn_backends.json", out)
