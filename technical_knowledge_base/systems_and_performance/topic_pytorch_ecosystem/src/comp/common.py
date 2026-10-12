"""Shared helpers for the Compile lab scripts (tab t-comp). Imports the topic's running example from ../model."""
import os, re, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "model"))
import torch
from torch.utils._python_dispatch import TorchDispatchMode
from model import GPTConfig, make_model, get_batch, make_optimizer, train_step, n_params  # noqa: F401

INP = os.path.join(HERE, "inputs")


def save(name, obj):
    with open(os.path.join(INP, name), "w") as f:
        json.dump(obj, f, indent=1, sort_keys=False)
    print("wrote", name)


def clean(s):
    """Drop machine paths from logs and code before they are stored (privacy)."""
    s = re.sub(r"/(Users|home|private|tmp|var)/[^\s'\"\]\),:]*?/(model/model\.py|comp/\w+\.py)", r"\2", s)
    s = re.sub(r"/(Users|home|private|tmp|var)/[^\s'\"\]\),]*?site-packages/", "", s)
    s = re.sub(r"/(Users|home|private|tmp|var)/[^\s'\"\]\),]+", "<path>", s)
    s = re.sub(r"[\w.]*sers/\w+/[^\s]*?/(model/model\.py)", r"\1", s)
    return s


def nbytes(t):
    return t.numel() * t.element_size() if isinstance(t, torch.Tensor) else 0


class OpLog(TorchDispatchMode):
    """Every ATen call that reaches the dispatcher (below autograd), with bytes of tensor inputs and outputs."""
    def __init__(self):
        super().__init__(); self.ops = []

    def __torch_dispatch__(self, func, types, args=(), kwargs=None):
        out = func(*args, **(kwargs or {}))
        ins = [a for a in torch.utils._pytree.tree_leaves((args, kwargs or {})) if isinstance(a, torch.Tensor)]
        outs = [o for o in torch.utils._pytree.tree_leaves(out) if isinstance(o, torch.Tensor)]
        self.ops.append({"op": str(func.overloadpacket.__name__) if hasattr(func, "overloadpacket") else str(func),
                         "full": str(func), "read": sum(nbytes(a) for a in ins), "write": sum(nbytes(o) for o in outs),
                         "out_shapes": [list(o.shape) for o in outs]})
        return out


LAUNCH = re.compile(r"^\s+(?:\w+(?:, \w+)* = )?(cpp_fused_\w+|extern_kernels\.\w+|torch\.ops\.\w+\.\w+(?:\.\w+)?|generated_kernel_\d+)\(")


def parse_wrapper(code):
    """Kernel launches in the generated wrapper's call(), in order, with Inductor's origin comment."""
    lines = code.split("\n")
    try:
        start = next(i for i, l in enumerate(lines) if l.strip().startswith("def call(self, args)") or l.strip().startswith("def call(args)"))
    except StopIteration:
        return []
    out, comment = [], ""
    for l in lines[start + 1:]:
        if l and not l.startswith(" "):
            break
        s = l.strip()
        if s.startswith("# Topologically Sorted Source Nodes") or s.startswith("# Source Nodes"):
            comment = s; continue
        m = LAUNCH.match(l)
        if m and "assert" not in s and "empty_strided" not in s and "alloc_from_pool" not in m.group(1):
            name = m.group(1)
            kind = "extern" if name.startswith("extern") else ("fallback" if name.startswith("torch.ops") else "fused")
            aten = re.findall(r"Original ATen: \[(.*?)\]", comment)
            out.append({"name": name, "kind": kind, "aten": aten[0].split(", ") if aten else []})
            comment = ""
        elif s.startswith("return"):
            break
    return out


def kernel_source(code, name):
    m = re.search(re.escape(name) + r" = async_compile\.\w+\((.*?)r?'''(.*?)'''", code, re.S)
    return m.group(2).strip() if m else ""
