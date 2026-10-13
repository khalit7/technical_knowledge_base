"""One fresh process: compile the running example's training step one way and time the first step (compile + run).
Timed: run only under the bench lock (time_compile.sh). Prints one JSON line.
Usage: PY ct_one.py <whole|regional|nested> <n_layer> [--save-mega FILE] [--load-mega FILE]
TORCHINDUCTOR_CACHE_DIR decides cold (empty dir) or warm (a dir a previous run filled)."""
import time, argparse
t_import = time.perf_counter()
from common import *
import model as M
from torch._dynamo.utils import counters
ap = argparse.ArgumentParser(); ap.add_argument("variant"); ap.add_argument("n_layer", type=int)
ap.add_argument("--save-mega"); ap.add_argument("--load-mega"); ap.add_argument("--steps", type=int, default=0)
a = ap.parse_args()
torch.set_num_threads(4)
cfg = GPTConfig(n_layer=a.n_layer)
mega_load_s = None
if a.load_mega:
    t = time.perf_counter()
    info = torch.compiler.load_cache_artifacts(open(a.load_mega, "rb").read())
    mega_load_s = time.perf_counter() - t
if a.variant == "nested":
    M.Block.forward = torch.compiler.nested_compile_region(M.Block.forward)
m = make_model(cfg); opt = make_optimizer(m); x, y = get_batch(cfg, 1)
if a.variant == "whole":
    fwd = torch.compile(m)
elif a.variant == "nested":
    fwd = torch.compile(m)
elif a.variant == "regional":
    for b in m.blocks:
        b.compile()
    fwd = m
def step():
    _, loss = fwd(x, y); loss.backward(); opt.step(); opt.zero_grad(set_to_none=True); return loss
t = time.perf_counter(); loss = step(); first = time.perf_counter() - t
t = time.perf_counter(); step(); second = time.perf_counter() - t
st = []
for _ in range(a.steps):
    t = time.perf_counter(); step(); st.append(time.perf_counter() - t)
out = {"variant": a.variant, "n_layer": a.n_layer, "first_s": round(first, 3), "second_ms": round(second * 1000, 2),
       "steps_ms": [round(s * 1000, 2) for s in st], "loss1": round(float(loss), 5), "load_mega_s": mega_load_s,
       "unique_graphs": counters["stats"]["unique_graphs"], "frames_ok": counters["stats"]["calls_captured"],
       "fxgraph_hit": counters["inductor"]["fxgraph_cache_hit"], "fxgraph_miss": counters["inductor"]["fxgraph_cache_miss"],
       "aot_hit": counters["aot_autograd"]["autograd_cache_hit"], "aot_miss": counters["aot_autograd"]["autograd_cache_miss"],
       "load": os.getloadavg()[0]}
try:
    from torch._dynamo.utils import calculate_time_spent
    out["time_spent"] = {k: round(v, 3) for k, v in calculate_time_spent().items()}
except Exception as e:
    out["time_spent_err"] = str(e)[:100]
if a.save_mega:
    art = torch.compiler.save_cache_artifacts()
    if art is not None:
        open(a.save_mega, "wb").write(art[0]); out["mega_bytes"] = len(art[0])
print("RESULT " + json.dumps(out))
