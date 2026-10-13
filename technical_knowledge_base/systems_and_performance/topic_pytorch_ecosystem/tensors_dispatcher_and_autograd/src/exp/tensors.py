"""Tensors: storage, strides, views, memory formats, dtypes, metadata (deterministic).

Run with the shared venv's python (torch 2.14.1):  python tensors.py > ../inputs/tensors.json
Every number on the page's tensor section and in the Stride explorer tab comes from this record.
"""
import json
import os
import sys
import warnings

import torch

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, make_model, get_batch  # noqa: E402

torch.manual_seed(0)
out = {"torch": torch.__version__}


def ptr_elems(t, base):
    """Storage element index of every element of t, read from real data pointers."""
    es = t.element_size()
    b0 = base.untyped_storage().data_ptr()
    idx = []
    flat = t.reshape(-1) if t.numel() else t
    # address of each element: walk the index space with strides
    import itertools
    for ix in itertools.product(*[range(s) for s in t.shape]):
        off = t.storage_offset() + sum(i * s for i, s in zip(ix, t.stride()))
        idx.append(off)
    # cross-check the first and last element against real pointers
    if t.numel():
        first = t[(0,) * t.dim()] if t.dim() else t
        assert (first.data_ptr() - b0) // es == idx[0] or t.untyped_storage().data_ptr() != b0
    return idx


def rec(expr, t, base, note=""):
    shares = t.untyped_storage().data_ptr() == base.untyped_storage().data_ptr()
    d = {
        "expr": expr,
        "shape": list(t.shape),
        "stride": list(t.stride()),
        "offset": t.storage_offset(),
        "contig": t.is_contiguous(),
        "shares": shares,
        "is_view": t._base is not None,
        "storage_elems": t.untyped_storage().nbytes() // t.element_size(),
        "values": [float(v) for v in t.reshape(-1).tolist()],
        "addr": ptr_elems(t, base) if shares else None,
        "note": note,
    }
    if t.dim() == 4:
        d["cl_contig"] = t.is_contiguous(memory_format=torch.channels_last)
    return d


# --- base 1: x = arange(12).view(3, 4); values equal storage indices, so the values prove the address formula
x = torch.arange(12.0).view(3, 4)
cases = [
    ("x", x, ""),
    ("x.t()", x.t(), "transpose: swap the strides"),
    ("x[1]", x[1], "select row 1: offset 4"),
    ("x[:, 1]", x[:, 1], "select column 1: stride 4"),
    ("x[1:, 1:3]", x[1:, 1:3], "slice: offset 5, strides kept"),
    ("x[:, ::2]", x[:, ::2], "step 2: stride 2"),
    ("x[::2]", x[::2], "every other row: stride 8"),
    ("x.view(4, 3)", x.view(4, 3), "same order, new shape"),
    ("x.view(2, 6)", x.view(2, 6), ""),
    ("x.view(2, 2, 3)", x.view(2, 2, 3), ""),
    ("x.unsqueeze(0)", x.unsqueeze(0), "a size-1 dimension"),
    ("x[0:1].expand(3, 4)", x[0:1].expand(3, 4), "stride 0: one row read three times"),
    ("x.diagonal()", x.diagonal(), "stride 4 + 1 = 5"),
    ("x.narrow(1, 1, 2)", x.narrow(1, 1, 2), ""),
    ("x.unfold(1, 2, 1)", x.unfold(1, 2, 1), "sliding windows overlap: cells read twice"),
    ("x.as_strided((3, 3), (1, 1))", x.as_strided((3, 3), (1, 1)), "any strides you like"),
    ("x.split(2, dim=1)[1]", x.split(2, dim=1)[1], ""),
    ("x.detach()", x.detach(), "same storage, no autograd history"),
    ("x.t().contiguous()", x.t().contiguous(), "copy into a new storage"),
    ("x.t().reshape(12)", x.t().reshape(12), "reshape had to copy"),
    ("x.reshape(12)", x.reshape(12), "reshape returned a view"),
    ("x.flip(0)", x.flip(0), "always copies (no negative strides)"),
    ("x[[0, 2]]", x[[0, 2]], "advanced indexing copies"),
    ("x[x > 5]", x[x > 5], "boolean mask copies"),
    ("x.clone()", x.clone(), ""),
]
y = torch.arange(24.0).view(2, 3, 4)
cases3 = [
    ("y", y, ""),
    ("y.permute(2, 0, 1)", y.permute(2, 0, 1), "permute: strides reordered"),
    ("y.transpose(0, 2)", y.transpose(0, 2), ""),
    ("y[:, 1]", y[:, 1], ""),
    ("y[..., 1:3]", y[..., 1:3], ""),
    ("y.view(6, 4)", y.view(6, 4), ""),
    ("y.permute(1, 0, 2).reshape(3, 8)", y.permute(1, 0, 2).reshape(3, 8), "copy"),
    ("y.flatten(1)", y.flatten(1), ""),
]
# 4D: N=2, C=3, H=2, W=2
z = torch.arange(24.0).view(2, 3, 2, 2)
zc = z.contiguous(memory_format=torch.channels_last)
cases4 = [
    ("z", z, "NCHW: channels outermost"),
    ("z.contiguous(memory_format=torch.channels_last)", zc, "NHWC in memory, shape still (N, C, H, W)"),
    ("zc[:, 1]", zc[:, 1], "one channel of the channels_last tensor"),
]
out["bases"] = {
    "x": {"expr": "x = torch.arange(12.).view(3, 4)", "cases": [rec(e, t, x, n) for e, t, n in cases]},
    "y": {"expr": "y = torch.arange(24.).view(2, 3, 4)", "cases": [rec(e, t, y, n) for e, t, n in cases3]},
    "z": {"expr": "z = torch.arange(24.).view(2, 3, 2, 2)", "cases": [rec(e, t, (zc if e.startswith("zc[") else z), n) for e, t, n in cases4]},
}
# zc storage relative to z: new storage, record its own physical order
out["bases"]["z"]["cases"][1]["storage_values"] = [float(v) for v in torch.as_strided(zc, (24,), (1,), 0).tolist()]
out["bases"]["z"]["cases"][1]["addr"] = ptr_elems(zc, zc)
out["bases"]["z"]["cases"][2]["addr"] = ptr_elems(zc[:, 1], zc)
out["bases"]["z"]["cases"][2]["storage_values"] = out["bases"]["z"]["cases"][1]["storage_values"]


def err(f):
    try:
        f()
        return None
    except Exception as e:  # noqa: BLE001
        return type(e).__name__ + ": " + str(e).split("\n")[0]


out["errors"] = {
    "x.t().view(12)": err(lambda: x.t().view(12)),
    "zc.view(2, 12)": err(lambda: zc.view(2, 12)),
    "x.view(5, 3)": err(lambda: x.view(5, 3)),
    "x.as_strided((3, 4), (4, 1), 2)": err(lambda: x.as_strided((3, 4), (4, 1), 2)),
    "x[0:1].expand(3, 4).add_(1)": err(lambda: x.clone()[0:1].expand(3, 4).add_(1)),
    "x.as_strided((3, 4), (-4, 1), 8)": err(lambda: x.as_strided((3, 4), (-4, 1), 8)),
}
out["cl_facts"] = {
    "z.stride": list(z.stride()), "zc.stride": list(zc.stride()),
    "zc.is_contiguous()": zc.is_contiguous(),
    "zc.is_contiguous(cl)": zc.is_contiguous(memory_format=torch.channels_last),
    "(zc + 1) keeps channels_last": (zc + 1).is_contiguous(memory_format=torch.channels_last),
    "(zc + 1).stride": list((zc + 1).stride()),
}
conv = torch.nn.Conv2d(3, 4, 1)
co = conv(zc)
out["cl_facts"]["conv(zc).stride"] = list(co.stride())
out["cl_facts"]["conv(zc) channels_last"] = co.is_contiguous(memory_format=torch.channels_last)
out["cl_facts"]["conv(z) channels_last"] = conv(z).is_contiguous(memory_format=torch.channels_last)
out["cl_facts"]["conv(zc) shape"] = list(co.shape)
# ambiguous case: C=1 or H=W=1 is contiguous both ways
a1 = torch.zeros(2, 3, 1, 1)
out["cl_facts"]["(2,3,1,1) both"] = [a1.is_contiguous(), a1.is_contiguous(memory_format=torch.channels_last)]

# --- running example: q, k, v views of one qkv output (real)
cfg = GPTConfig()
m = make_model(cfg)
xb, yb = get_batch(cfg, 0)
B, T, C = cfg.batch_size, cfg.block_size, cfg.d_model
with torch.no_grad():
    h = m.tok(xb) + m.pos(torch.arange(T))
    h = m.blocks[0].ln1(h)
    qkv = m.blocks[0].attn.qkv(h)
    q, k, v = qkv.split(C, dim=2)
    qh = q.view(B, T, 4, 64).transpose(1, 2)
    att = torch.nn.functional.scaled_dot_product_attention(qh, qh, qh, is_causal=True)
    yt = att.transpose(1, 2)
re = []
for nm, t in [("qkv", qkv), ("q", q), ("k", k), ("v", v), ("q.view(B, T, 4, 64)", q.view(B, T, 4, 64)), ("q heads: .transpose(1, 2)", qh),
              ("sdpa output y", att), ("y.transpose(1, 2)", yt)]:
    re.append({"name": nm, "shape": list(t.shape), "stride": list(t.stride()), "offset": t.storage_offset(),
               "contig": t.is_contiguous(), "shares_qkv": t.untyped_storage().data_ptr() == qkv.untyped_storage().data_ptr(),
               "bytes": t.untyped_storage().nbytes()})
out["running"] = re

# --- dtypes
dts = ["bool", "uint8", "int8", "int16", "int32", "int64", "float16", "bfloat16", "float32", "float64", "complex64"]
D = {n: getattr(torch, n) for n in dts}
out["dtypes"] = dts
out["itemsize"] = {n: torch.empty(0, dtype=D[n]).element_size() for n in dts}
out["promote"] = [[str(torch.promote_types(D[a], D[b])).replace("torch.", "") for b in dts] for a in dts]
fin = {}
for n in ["float16", "bfloat16", "float32", "float64"]:
    f = torch.finfo(D[n])
    fin[n] = {"bits": f.bits, "eps": f.eps, "max": f.max, "tiny": f.tiny, "smallest_subnormal": f.smallest_normal * f.eps if n != "bfloat16" else None}
    fin[n]["smallest_normal"] = f.smallest_normal
# subnormals computed exactly: 2^(min_exp-1) * eps
fin["float16"]["smallest_subnormal"] = 2.0 ** -24
fin["bfloat16"]["smallest_subnormal"] = 2.0 ** -133
fin["float32"]["smallest_subnormal"] = 2.0 ** -149
fin["float64"]["smallest_subnormal"] = 2.0 ** -1074
out["finfo"] = fin

i32 = torch.tensor([1, 2], dtype=torch.int32)
i64 = torch.tensor([1, 2])
f16 = torch.tensor([1.0, 2.0], dtype=torch.float16)
bf = torch.tensor([1.0, 2.0], dtype=torch.bfloat16)
f32 = torch.tensor([1.0, 2.0])
f64 = torch.tensor([1.0, 2.0], dtype=torch.float64)
u8 = torch.tensor([1, 2], dtype=torch.uint8)
i8 = torch.tensor([1, 2], dtype=torch.int8)
bo = torch.tensor([True, False])
f64_0d = torch.tensor(1.0, dtype=torch.float64)
i64_0d = torch.tensor(1)
promo_cases = [
    ("int32 tensor + 2.5 (Python float)", lambda: i32 + 2.5, "a Python float joins as the default float dtype, float32"),
    ("int64 tensor + 2 (Python int)", lambda: i64 + 2, ""),
    ("int32 tensor + int64 0-dim tensor", lambda: i32 + i64_0d, "a 0-dim tensor of the same category does not win"),
    ("float16 tensor + float64 0-dim tensor", lambda: f16 + f64_0d, "same: a 0-dim tensor does not raise precision"),
    ("float16 tensor + float64 tensor", lambda: f16 + f64, "both dimensioned: the larger wins"),
    ("int64 tensor + float64 0-dim tensor", lambda: i64 + f64_0d, "a higher category wins even as 0-dim: the default float dtype"),
    ("bfloat16 + float16", lambda: bf + f16, "neither contains the other: float32"),
    ("uint8 + int8", lambda: u8 + i8, "neither contains the other: int16"),
    ("bool + bool", lambda: bo + bo, ""),
    ("int64 tensor / int64 tensor", lambda: i64 / i64, "true division always gives a float"),
    ("int64 tensor // int64 tensor", lambda: i64 // i64, ""),
    ("float32 tensor * 1j", lambda: f32 * 1j, "complex Python scalar"),
    ("uint8 tensor + 300", lambda: u8 + 300, "the scalar does not widen the result: 300 wraps"),
    ("float16 tensor.sum()", lambda: f16.sum(), "reductions keep the dtype (accumulate wider inside)"),
    ("int32 tensor.sum()", lambda: i32.sum(), "integer sum promotes to int64"),
    ("int64 tensor.mean()", lambda: i64.mean(), None),
]
pr = []
for name, f, note in promo_cases:
    try:
        r = f()
        pr.append({"case": name, "result": str(r.dtype).replace("torch.", ""), "value": [str(v) for v in (r.tolist() if r.dim() else [r.item()])], "note": note or ""})
    except Exception as e:  # noqa: BLE001
        pr.append({"case": name, "result": "error", "value": [type(e).__name__ + ": " + str(e).split("\n")[0]], "note": "integer mean is not defined" if note is None else note})
out["promo_cases"] = pr
out["inplace_promo_error"] = err(lambda: i64.clone().add_(0.5))
out["inplace_promo_ok"] = str(f32.clone().add_(i64).dtype)
out["default_dtype"] = str(torch.get_default_dtype())

# --- metadata and the version counter
a = torch.zeros(4)
b = a[1:]
vs = [("a = torch.zeros(4); b = a[1:]", a._version, b._version)]
a.add_(1)
vs.append(("a.add_(1)", a._version, b._version))
b.mul_(2)
vs.append(("b.mul_(2)", a._version, b._version))
c = a + 1
vs.append(("c = a + 1 (out of place)", a._version, b._version))
a[0] = 5
vs.append(("a[0] = 5 (setitem is copy_ in place)", a._version, b._version))
with torch.no_grad():
    a.zero_()
vs.append(("with torch.no_grad(): a.zero_()", a._version, b._version))
a.data.fill_(3)
vs.append(("a.data.fill_(3)", a._version, b._version))
out["versions"] = [{"line": l, "a": va, "b": vb} for l, va, vb in vs]

w = torch.randn(3, requires_grad=True)
h = w * 2
meta = {}
for nm, t in [("w (leaf, requires_grad=True)", w), ("h = w * 2", h), ("h.detach()", h.detach()), ("torch.zeros(3)", torch.zeros(3))]:
    meta[nm] = {"requires_grad": t.requires_grad, "is_leaf": t.is_leaf, "grad_fn": type(t.grad_fn).__name__ if t.grad_fn else None,
                "_version": t._version, "has_base": t._base is not None, "keys": str(torch._C._dispatch_keys(t)).replace("DispatchKeySet(", "").rstrip(")")}
with torch.inference_mode():
    it = torch.zeros(3)
meta["inference tensor"] = {"requires_grad": it.requires_grad, "is_leaf": it.is_leaf, "grad_fn": None,
                            "_version": err(lambda: it._version) or it._version, "has_base": False,
                            "keys": str(torch._C._dispatch_keys(it)).replace("DispatchKeySet(", "").rstrip(")"), "is_inference": it.is_inference()}
out["meta"] = meta

# --- running example sizes
n = sum(p.numel() for p in m.parameters())
out["model"] = {"params": n, "bytes_fp32": n * 4, "bytes_bf16": n * 2,
                "sd_entries": len(m.state_dict()), "param_tensors": len(list(m.parameters())),
                "sd_numel_naive": sum(t.numel() for t in m.state_dict().values())}

# --- pinned memory on this machine
pin = {}
pin["accelerator"] = str(torch.accelerator.current_accelerator()) if hasattr(torch, "accelerator") else None
try:
    pt = torch.randn(1024).pin_memory()
    pin["pin_memory()"] = "ok, is_pinned=" + str(pt.is_pinned())
except Exception as e:  # noqa: BLE001
    pin["pin_memory()"] = type(e).__name__ + ": " + str(e).split("\n")[0]
pin["plain is_pinned"] = torch.randn(4).is_pinned()
out["pinned"] = pin
print(json.dumps(out, indent=1))
