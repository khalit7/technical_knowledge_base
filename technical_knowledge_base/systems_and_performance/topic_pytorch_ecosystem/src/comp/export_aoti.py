"""torch.export and AOTInductor on the running example (inference forward, logits only), CPU.
Deterministic parts: the exported graph (ops, signature), the package contents and size, output match.
Usage: python export_aoti.py <workdir for the .pt2 package> -> inputs/export.json"""
import collections, zipfile, time
from common import *
from torch.export import export, Dim
torch.set_num_threads(4)
work = sys.argv[1]
os.makedirs(work, exist_ok=True)
cfg = GPTConfig()
m = make_model(cfg).eval()
x, _ = get_batch(cfg, 0)

class Logits(torch.nn.Module):                 # export the inference path: tokens in, logits out
    def __init__(s, g): super().__init__(); s.g = g
    def forward(s, idx): return s.g(idx)[0]

w = Logits(m).eval()
B = Dim("batch", min=1, max=64)
t0 = time.time()
ep = export(w, (x,), dynamic_shapes={"idx": {0: B}})
t_export = time.time() - t0
c = collections.Counter(str(n.target).replace("aten.", "") for n in ep.graph.nodes if n.op == "call_function")
sig = ep.graph_signature
R = {"export_s": t_export, "calls": sum(c.values()), "by_op": c.most_common(),
     "n_params_inputs": len(sig.inputs_to_parameters), "n_buffer_inputs": len(sig.inputs_to_buffers),
     "user_inputs": sig.user_inputs, "user_outputs": sig.user_outputs,
     "range_constraints": {str(k): str(v) for k, v in ep.range_constraints.items()},
     "graph_head": clean("\n".join(str(ep.graph_module.code).strip().split("\n")[:24]))}
# run_decompositions: the core ATen opset (what a backend has to implement)
ep2 = ep.run_decompositions()
c2 = collections.Counter(str(n.target).replace("aten.", "") for n in ep2.graph.nodes if n.op == "call_function")
R["core_aten"] = {"calls": sum(c2.values()), "by_op": c2.most_common()}
# AOTInductor: compile ahead of time into a .pt2 package, load it with no Python model code
pkg = os.path.join(work, "tiny_gpt.pt2")
t0 = time.time()
path = torch._inductor.aoti_compile_and_package(ep, package_path=pkg)
R["aoti_compile_s"] = time.time() - t0
R["pkg_bytes"] = os.path.getsize(path)
with zipfile.ZipFile(path) as z:
    R["pkg_files"] = sorted([[clean(i.filename).split("/")[-1], i.file_size, i.filename.rsplit(".", 1)[-1] if "." in i.filename else ""] for i in z.infolist()], key=lambda r: -r[1])[:14]
    R["pkg_n_files"] = len(z.infolist())
runner = torch._inductor.aoti_load_package(path)
with torch.no_grad():
    ref = w(x)
    out = runner(x)
    out4 = runner(x[:4])
R["max_abs_diff"] = (out - ref).abs().max().item()
R["max_abs_diff_b4"] = (out4 - w(x[:4])).abs().max().item()
R["out_shape"] = list(out.shape)
save("export.json", R)
print({k: v for k, v in R.items() if k not in ("by_op", "graph_head", "core_aten", "pkg_files")})
print(R["pkg_files"])
