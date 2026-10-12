"""What mode="max-autotune" chose on CPU for the running example's matmuls (deterministic enough to record once).
Usage: python autotune_check.py -> inputs/autotune.json"""
import collections
from common import *
from torch._inductor.utils import run_and_get_code
torch.set_num_threads(4)
torch._inductor.config.fx_graph_cache = False
torch._functorch.config.enable_autograd_cache = False
cfg = GPTConfig(); m = make_model(cfg); x, y = get_batch(cfg, 0)
cm = torch.compile(m, mode="max-autotune")
def fn():
    _, l = cm(x, y); l.backward(); return l
_, codes = run_and_get_code(fn)
R = {"modes": {k: {kk: str(vv) for kk, vv in v.items()} for k, v in torch._inductor.list_mode_options().items()}}
for i, c in enumerate(codes):
    L = parse_wrapper(c)
    R["fwd" if i == 0 else "bwd"] = {"launches": collections.Counter(l["name"] if l["kind"] != "fused" else ("template" if "template" in l["name"] or "gemm" in l["name"].lower() else "fused") for l in L).most_common(),
                                     "gemm_template_defs": len(re.findall(r"CppMicroGemm|cpp_CppGemmTemplate|GemmTemplate", c))}
save("autotune.json", R)
print(R["fwd"], R["bwd"])
