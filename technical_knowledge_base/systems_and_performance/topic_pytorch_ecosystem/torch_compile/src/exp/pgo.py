"""Profile-guided dynamic shapes (automatic_dynamic_local_pgo, on at 2.14.1): run this twice in fresh processes with the
same TORCHINDUCTOR_CACHE_DIR. Each run calls the compiled model at T = 64 then T = 32 and prints how many compiles each
call caused and whether the first graph already had a symbolic length. Deterministic. Usage: PY pgo.py <run label>"""
from common import *
from torch._dynamo.utils import counters
torch.set_num_threads(4)
cfg = GPTConfig(); m = make_model(cfg).eval(); x = get_batch(cfg, 0)[0]
n = [0]; first = []
def be(gm, ex):
    n[0] += 1
    first.append([str(getattr(e, "shape", e)) for e in ex if not isinstance(e, torch.nn.Parameter)][:2])
    from torch._inductor.compile_fx import compile_fx
    return compile_fx(gm, ex)
c = torch.compile(m, backend=be)
per = []
with torch.no_grad(), quiet():
    for T in (64, 32):
        k = n[0]; c(x[:, :T].contiguous()); per.append(n[0] - k)
print("RESULT " + json.dumps({"run": sys.argv[1], "compiles_per_call": per, "graph_inputs": first, "pgo": dict(counters.get("pgo", {}))}))
