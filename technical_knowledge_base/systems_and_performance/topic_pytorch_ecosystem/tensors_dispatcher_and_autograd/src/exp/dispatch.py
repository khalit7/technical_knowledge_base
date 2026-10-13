"""The dispatcher, observed (deterministic).  python dispatch.py > ../inputs/dispatch.json

1. Key priorities from the wheel's DispatchKey enum; TLS include/exclude sets in each context.
2. Key sets of many kinds of tensor.
3. Dispatch tables of chosen ops (kind of entry per key; file paths reduced to basenames).
4. Statistics over every aten operator in the wheel.
5. A walk through the dispatcher: a custom op with a logging kernel at each key (ground truth of which kernels run, in which order,
   with which key set and TLS), in eight situations; and real aten calls seen at the top (TorchFunctionMode) and at the Python key
   (TorchDispatchMode) with their computed key sets.
6. Schemas and native_functions.yaml / derivatives.yaml entries at v2.14.1 (read from the source files with line numbers).
7. Autocast on the running example; functionalization graphs; meta and fake tensors.
"""
import json
import os
import re
import sys
import warnings

import torch
from torch._C import DispatchKey as DK
from torch.overrides import TorchFunctionMode
from torch.utils._python_dispatch import TorchDispatchMode

warnings.filterwarnings("ignore")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "..", "src", "model"))
from model import GPTConfig, GPT, make_model, get_batch  # noqa: E402

SRC = sys.argv[1] if len(sys.argv) > 1 else None  # path to the v2.14.1 source files (optional)
torch.manual_seed(0)
out = {"torch": torch.__version__}

FUNC_KEYS = ["Dense", "Quantized", "Sparse", "SparseCsr", "NestedTensor", "BackendSelect", "Fake", "Python",
             "FuncTorchDynamicLayerBackMode", "Functionalize", "Conjugate", "Negative", "ZeroTensor", "ADInplaceOrView",
             "AutogradOther", "AutogradFunctionality", "AutogradNestedTensor", "Tracer", "AutocastCPU", "AutocastMPS", "AutocastCUDA",
             "FuncTorchBatched", "BatchedNestedTensor", "FuncTorchVmapMode", "Batched", "VmapMode", "FuncTorchGradWrapper",
             "DeferredInit", "PythonTLSSnapshot", "FuncTorchDynamicLayerFrontMode", "PreDispatch", "PythonDispatcher"]
out["key_values"] = {k: int(getattr(DK, k)) for k in FUNC_KEYS if hasattr(DK, k)}


def ks_list(s):
    s = str(s)
    m = re.match(r"DispatchKeySet\((.*)\)", s)
    return [x.strip() for x in m.group(1).split(",")] if m and m.group(1).strip() else []


_PROBE_T = torch.randn(1)


def effective(t):
    """(tensor keys | TLS included) - TLS excluded, computed on the raw bit sets exactly as DispatchKeyExtractor.h L46 does."""
    ks = torch._C._dispatch_keys(t).raw_repr()
    inc = torch._C._dispatch_tls_local_include_set().raw_repr()
    exc = torch._C._dispatch_tls_local_exclude_set().raw_repr()
    return ks_list(torch._C.DispatchKeySet.from_raw_repr((ks | inc) & ~exc))


def tls():
    return {"include": ks_list(torch._C._dispatch_tls_local_include_set()),
            "exclude": ks_list(torch._C._dispatch_tls_local_exclude_set()),
            "effective_cpu": effective(_PROBE_T)}


ctx = {"default": tls()}
with torch.no_grad():
    ctx["no_grad"] = tls()
with torch.inference_mode():
    ctx["inference_mode"] = tls()
with torch.autocast("cpu", dtype=torch.bfloat16):
    ctx["autocast_cpu_bf16"] = tls()


class Probe(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        Probe.seen = tls()
        return func(*args, **(kwargs or {}))


with Probe():
    torch.ones(1) + 1
ctx["inside a TorchDispatchMode (read at the Python key)"] = Probe.seen
with Probe():
    ctx["inside a TorchDispatchMode (read in user code)"] = tls()
out["tls"] = ctx

# 2. key sets of tensor kinds
kinds = {}
kinds["CPU float32"] = torch.randn(2)
kinds["CPU, requires_grad"] = torch.randn(2, requires_grad=True)
with torch.inference_mode():
    kinds["inference tensor"] = torch.randn(2)
kinds["meta"] = torch.empty(2, device="meta")
kinds["MPS"] = torch.randn(2, device="mps") if torch.backends.mps.is_available() else None
kinds["complex .conj() view"] = torch.randn(2, dtype=torch.cfloat).conj()
kinds["sparse COO"] = torch.randn(2, 2).to_sparse()
kinds["quantized"] = torch.quantize_per_tensor(torch.randn(2), 0.1, 0, torch.qint8)
kinds["nested"] = torch.nested.nested_tensor([torch.randn(2), torch.randn(3)])
from torch._subclasses.fake_tensor import FakeTensorMode  # noqa: E402
with FakeTensorMode() as fm:
    kinds["FakeTensor"] = torch.empty(2)
from torch._subclasses.functional_tensor import FunctionalTensor, FunctionalTensorMode  # noqa: E402,F401
kinds["functional wrapper (torch._to_functional_tensor)"] = torch._to_functional_tensor(torch.randn(2))


class Sub(torch.Tensor):
    @staticmethod
    def __new__(cls, elem):
        return torch.Tensor._make_wrapper_subclass(cls, elem.shape, dtype=elem.dtype, device=elem.device)

    def __init__(self, elem):
        self.elem = elem

    @classmethod
    def __torch_dispatch__(cls, func, types, args=(), kwargs=None):
        un = lambda a: a.elem if isinstance(a, Sub) else a  # noqa: E731
        return func(*[un(a) for a in args], **{k: un(v) for k, v in (kwargs or {}).items()})


kinds["wrapper subclass (_make_wrapper_subclass)"] = Sub(torch.randn(2))
out["tensor_keys"] = {k: ks_list(torch._C._dispatch_keys(v)) for k, v in kinds.items() if v is not None}

# 3. dispatch tables
def table(op):
    rows = {}
    for line in torch._C._dispatch_dump_table(op).splitlines():
        m = re.match(r"(\w+): (fallthrough )?registered at (.*):(\d+) \[(.*)\]", line)
        if not m:
            continue
        key, ft, path, ln, kind = m.groups()
        rows[key] = {"kind": ("fallthrough" if ft else kind), "file": os.path.basename(path) + ":" + ln}
    return rows


KEEP = ["CPU", "MPS", "Meta", "BackendSelect", "Python", "Functionalize", "Conjugate", "Negative", "ZeroTensor", "ADInplaceOrView",
        "AutogradCPU", "AutogradMPS", "AutocastCPU", "AutocastMPS", "PythonTLSSnapshot", "PreDispatch", "PythonDispatcher",
        "FuncTorchBatched", "FuncTorchDynamicLayerFrontMode"]
ops = ["aten::mm", "aten::addmm", "aten::linear", "aten::view", "aten::add.Tensor", "aten::add_.Tensor", "aten::gelu",
       "aten::scaled_dot_product_attention", "aten::_scaled_dot_product_flash_attention_for_cpu", "aten::native_layer_norm",
       "aten::matmul", "aten::empty.memory_format", "aten::_to_copy", "aten::softmax.int", "aten::cross_entropy_loss"]
out["tables"] = {o: {k: v for k, v in table(o).items() if k in KEEP} for o in ops}

# 4. statistics over all aten ops
names = [n for n in torch._C._dispatch_get_all_op_names() if n.startswith("aten::")]
stat = {"aten_ops": len(names)}
cnt = {k: {} for k in ["CPU", "MPS", "Meta", "AutogradCPU", "ADInplaceOrView", "AutocastCPU", "Functionalize", "Python"]}
for n in names:
    t = table(n)
    for k in cnt:
        kind = t.get(k, {}).get("kind", "none")
        cnt[k][kind] = cnt[k].get(kind, 0) + 1
stat["by_key"] = cnt
stat["all_op_names_including_other_namespaces"] = len(torch._C._dispatch_get_all_op_names())
out["op_stats"] = stat

# 5a. custom op walk: a logging kernel at every key we care about
lib = torch.library.Library("tda", "DEF")
lib.define("scale(Tensor x) -> Tensor")
op = torch.ops.tda.scale.default
LOG = []


def logk(key, how):
    def k(ks, x):
        LOG.append({"key": key, "keyset": ks_list(ks), "tls": tls(), "dtype": str(x.dtype).replace("torch.", ""),
                    "grad_mode": torch.is_grad_enabled()})
        if key == "AutocastCPU":
            with torch._C._ExcludeDispatchKeyGuard(torch._C.DispatchKeySet(DK.AutocastCPU)):
                xx = x.to(torch.get_autocast_dtype("cpu"))  # what a lower_precision_fp autocast kernel does
                return op(xx)
        if key == "AutogradCPU":
            # what a generated autograd kernel does: record a node if needed, then call below autograd
            with torch._C._AutoDispatchBelowAutograd():
                return op.redispatch(ks & torch._C._after_autograd_keyset, x)
        if key == "ADInplaceOrView":
            return op.redispatch(ks & torch._C._after_ADInplaceOrView_keyset, x)
        return how(x)
    return k


for key in ["AutocastCPU", "AutogradCPU", "ADInplaceOrView"]:
    lib.impl("scale", logk(key, None), key, with_keyset=True)
lib.impl("scale", logk("CPU", lambda x: x * 2), "CPU", with_keyset=True)
lib.impl("scale", logk("Meta", lambda x: torch.empty_like(x)), "Meta", with_keyset=True)


class Seen(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        if func is op:
            LOG.append({"key": "Python (TorchDispatchMode)", "keyset": None, "tls": tls(), "dtype": str(args[0].dtype).replace("torch.", ""),
                        "grad_mode": torch.is_grad_enabled()})
        return func(*args, **(kwargs or {}))


walk = []


def run(name, fn, code):
    LOG.clear()
    try:
        r = fn()
        res = {"dtype": str(r.dtype).replace("torch.", ""), "device": str(r.device)}
    except Exception as e:  # noqa: BLE001
        res = {"error": type(e).__name__ + ": " + str(e).split("\n")[0]}
    walk.append({"name": name, "code": code, "visits": list(LOG), "result": res})


xc = torch.randn(4)
xg = torch.randn(4, requires_grad=True)
run("plain CPU tensor", lambda: op(xc), "op(x)")
run("input requires grad", lambda: op(xg), "op(w)  # w.requires_grad")


def _ng():
    with torch.no_grad():
        return op(xg)


def _im():
    with torch.inference_mode():
        return op(xc)


def _ac():
    with torch.autocast("cpu", dtype=torch.bfloat16):
        return op(xc)


def _mode():
    with Seen():
        return op(xc)


with torch.inference_mode():
    xinf = torch.randn(4)
run("under torch.no_grad()", _ng, "with torch.no_grad(): op(w)")
run("under torch.inference_mode()", _im, "with torch.inference_mode(): op(x)")
run("under autocast (CPU, bfloat16)", _ac, "with torch.autocast('cpu', dtype=torch.bfloat16): op(x)")
run("inside a TorchDispatchMode", _mode, "with MyMode(): op(x)")
run("meta tensor", lambda: op(torch.empty(4, device="meta")), "op(torch.empty(4, device='meta'))")
run("inference tensor, normal mode", lambda: op(xinf), "op(x_made_in_inference_mode)")
out["walk"] = walk

# 5b. real aten calls observed at the top and at the Python key
class Top(TorchFunctionMode):
    def __torch_function__(self, func, types, args=(), kwargs=None):
        Top.calls.append(getattr(func, "__name__", str(func)))
        return func(*args, **(kwargs or {}))


class Bottom(TorchDispatchMode):
    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        tens = [a for a in args if isinstance(a, torch.Tensor)]
        Bottom.calls.append({"op": str(func.overloadpacket.__name__) + ("" if func._overloadname == "default" else "." + func._overloadname),
                             "in_dtypes": [str(a.dtype).replace("torch.", "") for a in tens],
                             "in_keys": [ks_list(torch._C._dispatch_keys(a)) for a in tens],
                             "exclude_has_autograd": "AutogradCPU" in ks_list(torch._C._dispatch_tls_local_exclude_set()) or
                             "AutogradFunctionality" in str(torch._C._dispatch_tls_local_exclude_set())})
        r = func(*args, **(kwargs or {}))
        if isinstance(r, torch.Tensor):
            Bottom.calls[-1]["out_dtype"] = str(r.dtype).replace("torch.", "")
        return r


W = torch.randn(256, 256, requires_grad=True)
X = torch.randn(8, 256)
lin = torch.nn.Linear(256, 256)
aten_cases = {
    "torch.mm(x, w)": lambda: torch.mm(X, W),
    "F.linear(x, lin.weight, lin.bias)": lambda: torch.nn.functional.linear(X, lin.weight, lin.bias),
    "x.view(2048)": lambda: X.view(2048),
    "w2 = w.clone(); w2.add_(1)": lambda: W.clone().add_(1),
}
contexts = {"training": None, "no_grad": torch.no_grad, "inference_mode": torch.inference_mode,
            "autocast bf16": lambda: torch.autocast("cpu", dtype=torch.bfloat16)}
aten = []
for cname, cm in contexts.items():
    for name, f in aten_cases.items():
        Top.calls, Bottom.calls = [], []
        if cm is None:
            with Top(), Bottom():
                r = f()
        else:
            with cm(), Top(), Bottom():
                r = f()
        aten.append({"ctx": cname, "call": name, "top": Top.calls, "bottom": Bottom.calls,
                     "grad_fn": type(r.grad_fn).__name__ if r.grad_fn is not None else None,
                     "out_dtype": str(r.dtype).replace("torch.", ""), "out_keys": ks_list(torch._C._dispatch_keys(r)),
                     "is_inference": r.is_inference()})
out["aten_calls"] = aten

# autograd fallback for an op with no autograd kernel
lib2 = torch.library.Library("tda2", "DEF")
lib2.define("noautograd(Tensor x) -> Tensor")
lib2.impl("noautograd", lambda x: x * 3, "CPU")
fb = {"mode": torch._C._get_autograd_fallback_mode()}
with warnings.catch_warnings(record=True) as wl:
    warnings.simplefilter("always")
    yy = torch.ops.tda2.noautograd(xg)
    fb["grad_fn"] = type(yy.grad_fn).__name__ if yy.grad_fn else None
    try:
        yy.sum().backward()
        fb["backward"] = "ok"
    except Exception as e:  # noqa: BLE001
        fb["backward"] = type(e).__name__ + ": " + str(e).split("\n")[0]
    fb["warnings"] = [str(w.message).split("\n")[0][:300] for w in wl]
out["autograd_fallback"] = fb

# 6. schemas and yaml entries
schemas = {}
for n in ["add.Tensor", "add_.Tensor", "add.out", "view.default", "transpose.int", "mm.default", "addmm.default", "linear.default",
          "gelu.default", "t.default", "split.Tensor", "_to_copy.default", "native_layer_norm.default", "embedding.default"]:
    pk, ov = n.split(".")
    schemas[n] = str(getattr(getattr(torch.ops.aten, pk), ov)._schema)
out["schemas"] = schemas


def yaml_block(path, func):
    lines = open(path).read().split("\n")
    for i, l in enumerate(lines):
        if l.startswith("- func: " + func + "(") or l.startswith("- name: " + func + "("):
            j = i + 1
            while j < len(lines) and not lines[j].startswith("- "):
                j += 1
            while lines[j - 1].strip() == "" or lines[j - 1].strip().startswith("#"):
                j -= 1
            return {"line": i + 1, "end": j, "text": "\n".join(lines[i:j])}
    return None


if SRC:
    nf = os.path.join(SRC, "aten/src/ATen/native/native_functions.yaml")
    dv = os.path.join(SRC, "tools/autograd/derivatives.yaml")
    out["native_functions"] = {f: yaml_block(nf, f) for f in ["add.Tensor", "add_.Tensor", "mm", "addmm", "linear", "view", "gelu", "t", "_to_copy"]}
    out["derivatives"] = {f: yaml_block(dv, f) for f in ["mm", "addmm", "gelu", "add.Tensor", "mul.Tensor", "view", "t"]}
    out["native_functions_count"] = sum(1 for l in open(nf) if l.startswith("- func:"))
    out["derivatives_count"] = sum(1 for l in open(dv) if l.startswith("- name:"))

# 7a. autocast on the running example: which ops ran in which dtype
cfg = GPTConfig()
model = make_model(cfg)
xb, yb = get_batch(cfg, 0)


class Count(TorchDispatchMode):
    def __init__(self):
        super().__init__()
        self.ops = []

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        r = func(*args, **(kwargs or {}))
        name = func.overloadpacket.__name__
        dt = str(r.dtype).replace("torch.", "") if isinstance(r, torch.Tensor) else (
            str(r[0].dtype).replace("torch.", "") if isinstance(r, (tuple, list)) and r and isinstance(r[0], torch.Tensor) else "-")
        ins = sorted({str(a.dtype).replace("torch.", "") for a in args if isinstance(a, torch.Tensor)})
        self.ops.append((name, dt, ins))
        return r


ac = {}
for dev, dtypes in [("cpu", [torch.bfloat16]), ("mps", [torch.bfloat16, torch.float16])]:
    if dev == "mps" and not torch.backends.mps.is_available():
        continue
    m = make_model(cfg, dev)
    xd, yd = xb.to(dev), yb.to(dev)
    with torch.no_grad():
        _, l32 = m(xd, yd)
    for dt in dtypes:
        c = Count()
        with torch.no_grad(), torch.autocast(dev, dtype=dt), c:
            logits, l = m(xd, yd)
        per = {}
        for name, odt, ins in c.ops:
            per.setdefault(name, {}).setdefault(odt, 0)
            per[name][odt] += 1
        casts = sum(1 for n, _, _ in c.ops if n == "_to_copy")
        ac[dev + " " + str(dt).replace("torch.", "")] = {
            "loss_fp32": float(l32), "loss": float(l), "logits_dtype": str(logits.dtype).replace("torch.", ""),
            "loss_dtype": str(l.dtype).replace("torch.", ""), "calls": len(c.ops), "casts": casts, "per_op": per}
    c = Count()
    with torch.no_grad(), c:
        m(xd, yd)
    ac[dev + " float32 (no autocast)"] = {"calls": len(c.ops)}
out["autocast_model"] = ac

# 7b. functionalization
from torch.fx.experimental.proxy_tensor import make_fx  # noqa: E402


def f(x):
    y = x.clone()
    z = y.view(-1)
    z.add_(1)
    y.mul_(2)
    return y


gx = torch.arange(4.0).view(2, 2)


def code(gm):
    return "\n".join(l for l in gm.code.strip().split("\n") if l.strip())


out["functionalize"] = {
    "source": "def f(x):\n    y = x.clone()\n    z = y.view(-1)\n    z.add_(1)\n    y.mul_(2)\n    return y",
    "plain": code(make_fx(f)(gx)),
    "functionalized": code(make_fx(torch.func.functionalize(f))(gx)),
    "functionalized_remove": code(make_fx(torch.func.functionalize(f, remove="mutations_and_views"))(gx)),
    "same_result": bool(torch.equal(f(gx), torch.func.functionalize(f)(gx))),
}

# 7c. meta device and fake tensors on the running example
mt = {}
with torch.device("meta"):
    mm = GPT(cfg)
mt["param_device"] = str(next(mm.parameters()).device)
mt["params"] = sum(p.numel() for p in mm.parameters())
mt["tied_on_meta"] = mm.head.weight is mm.tok.weight
xm = xb.to("meta")
lg, ls = mm(xm, yb.to("meta"))
mt["logits"] = list(lg.shape)
mt["loss_shape"] = list(ls.shape)
try:
    mt["loss.item()"] = ls.item()
except Exception as e:  # noqa: BLE001
    mt["loss.item()"] = type(e).__name__ + ": " + str(e).split("\n")[0]
mm2 = mm.to_empty(device="cpu")
mt["tied_after_to_empty"] = mm2.head.weight is mm2.tok.weight
mt["same_storage_after_to_empty"] = mm2.head.weight.data_ptr() == mm2.tok.weight.data_ptr()
with FakeTensorMode() as fmode:
    fx_ = fmode.from_tensor(xb)
    fy_ = fmode.from_tensor(yb)
    try:
        make_model(cfg)
        mt["make_model_under_fake"] = "ok"
    except Exception as e:  # noqa: BLE001
        mt["make_model_under_fake"] = type(e).__name__ + ": " + str(e).split("\n")[0]
    torch.manual_seed(0)
    fmodel = GPT(cfg)
    flog, floss = fmodel(fx_, fy_)
    floss.backward()
    mt["fake_logits"] = list(flog.shape)
    mt["fake_type"] = type(floss).__name__
    mt["fake_loss_device"] = str(floss.device)
    mt["fake_grad_shape"] = list(fmodel.blocks[0].mlp.fc.weight.grad.shape)
out["meta_fake"] = mt
print(json.dumps(out, indent=1))
