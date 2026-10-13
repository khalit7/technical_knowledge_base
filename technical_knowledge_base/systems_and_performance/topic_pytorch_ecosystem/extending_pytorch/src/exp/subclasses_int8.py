"""The int8 weight-only wrapper subclass used on the page (imported by subclasses.py and timing.py)."""
import torch
import torch.nn as nn
from torch.utils._pytree import tree_map


def name(func):
    return str(func).replace("aten.", "").replace(".default", "")


SEEN = {}


class Int8Weight(torch.Tensor):
    """Weight-only int8: qdata (out, in) int8 and scale (out,) float32; looks like a float32 (out, in) tensor.
    `transposed` marks the view aten.t returns, so addmm/mm know which side the scale belongs to."""
    @staticmethod
    def __new__(cls, qdata, scale, transposed=False):
        shape = qdata.shape[::-1] if transposed else qdata.shape
        return torch.Tensor._make_wrapper_subclass(cls, shape, dtype=scale.dtype, device=qdata.device,
                                                   requires_grad=False)

    def __init__(self, qdata, scale, transposed=False):
        self.qdata, self.scale, self.transposed = qdata, scale, transposed

    # the traceable-subclass protocol: which attributes are tensors, plus non-tensor metadata
    def __tensor_flatten__(self):
        return ["qdata", "scale"], (self.transposed,)

    @staticmethod
    def __tensor_unflatten__(inner, meta, outer_size, outer_stride):
        return Int8Weight(inner["qdata"], inner["scale"], meta[0])

    @classmethod
    def from_float(cls, w):
        scale = w.detach().abs().amax(dim=1).clamp(min=1e-8) / 127.0
        q = torch.round(w.detach() / scale[:, None]).clamp(-127, 127).to(torch.int8)
        return cls(q, scale)

    def dequantize(self):
        w = self.qdata.to(self.scale.dtype) * self.scale[:, None]
        return w.t() if self.transposed else w

    def __repr__(self):
        return f"Int8Weight(shape={tuple(self.shape)}, transposed={self.transposed})"

    __torch_function__ = torch._C._disabled_torch_function_impl

    @classmethod
    def __torch_dispatch__(cls, func, types, args=(), kwargs=None):
        kwargs = kwargs or {}
        f = name(func)
        SEEN[f] = SEEN.get(f, 0) + 1
        if func is torch.ops.aten.t.default:
            (w,) = args
            return Int8Weight(w.qdata, w.scale, not w.transposed)
        if func is torch.ops.aten.detach.default:
            (w,) = args
            return Int8Weight(w.qdata, w.scale, w.transposed)
        if func is torch.ops.aten.addmm.default and isinstance(args[2], Int8Weight):
            bias, x, w = args[:3]
            # x @ W^T + bias with W = q * s[:, None]: the scale factors out of the matmul per output column
            y = torch.mm(x, w.qdata.to(x.dtype).t()) if w.transposed else torch.mm(x, w.dequantize())
            if w.transposed:
                y = y * w.scale
            return y + bias
        if func is torch.ops.aten.mm.default and isinstance(args[1], Int8Weight):
            x, w = args
            if w.transposed:
                return torch.mm(x, w.qdata.to(x.dtype).t()) * w.scale
            return torch.mm(x * 1.0, w.dequantize())
        # anything else: compute on the dequantized weight (and note it)
        SEEN["(fallback) " + f] = SEEN.get("(fallback) " + f, 0) + 1
        unwrap = lambda t: t.dequantize() if isinstance(t, Int8Weight) else t
        return func(*tree_map(unwrap, args), **tree_map(unwrap, kwargs))


def quantize_blocks(m):
    n = 0
    for blk in m.blocks:
        for lin in (blk.attn.qkv, blk.attn.proj, blk.mlp.fc, blk.mlp.proj):
            lin.weight = nn.Parameter(Int8Weight.from_float(lin.weight), requires_grad=False)
            n += 1
    return n


