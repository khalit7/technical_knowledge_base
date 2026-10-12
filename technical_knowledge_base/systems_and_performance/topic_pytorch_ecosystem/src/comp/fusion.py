"""The fusion demo: two small functions from the running example, eager op by op against Inductor's fused code.
Deterministic: ops, bytes each op reads and writes, the generated kernel. Timing lives in time_comp.py.
Usage: python fusion.py  -> inputs/fusion.json"""
import math
from common import *
from torch._inductor.utils import run_and_get_code
torch.set_num_threads(4)
torch._inductor.config.fx_graph_cache = False

def new_gelu(x):
    # GPT-2's tanh GELU written out, as in the original GPT-2 code and early nanoGPT
    return 0.5 * x * (1.0 + torch.tanh(math.sqrt(2.0 / math.pi) * (x + 0.044715 * torch.pow(x, 3.0))))

def add_ln(x, r, w, b):
    # the residual add and the LayerNorm that follows it in every block: ln2(x + attn(...))
    return torch.nn.functional.layer_norm(x + r, (x.shape[-1],), w, b)

def inputs(name, dev="cpu"):
    g = torch.Generator().manual_seed(0)
    if name == "new_gelu":
        return (torch.randn(8, 64, 1024, generator=g).to(dev),)
    return (torch.randn(8, 64, 256, generator=g).to(dev), torch.randn(8, 64, 256, generator=g).to(dev),
            torch.ones(256).to(dev), torch.zeros(256).to(dev))

FUNCS = {"new_gelu": new_gelu, "add_ln": add_ln}
def main():
    R = {}
    for name, f in FUNCS.items():
        args = inputs(name)
        with torch.no_grad():
            with OpLog() as L:
                ref = f(*args)
            torch._dynamo.reset()
            out, codes = run_and_get_code(torch.compile(f), *args)
        launches = parse_wrapper(codes[0])
        kern = [l["name"] for l in launches if l["kind"] == "fused"]
        in_b = sum(nbytes(a) for a in args); out_b = nbytes(ref)
        R[name] = {"eager_ops": [{"op": o["op"], "read": o["read"], "write": o["write"], "shape": o["out_shapes"]} for o in L.ops],
                   "eager_read": sum(o["read"] for o in L.ops), "eager_write": sum(o["write"] for o in L.ops),
                   "compiled_launches": launches, "compiled_read": in_b, "compiled_write": out_b,
                   "kernel": clean(kernel_source(codes[0], kern[0])) if kern else "",
                   "max_abs_diff": (out - ref).abs().max().item(), "numel": ref.numel(),
                   "input_shapes": [list(a.shape) for a in args]}
        print(name, len(L.ops), [o["op"] for o in L.ops], R[name]["eager_read"] + R[name]["eager_write"], in_b + out_b, len(launches), R[name]["max_abs_diff"])
    save("fusion.json", R)


if __name__ == "__main__":
    main()
