"""Inductor's GPU-style output for one Block of the running example, generated WITHOUT a GPU (nothing runs on a GPU):
run inside the kb-gpu-lab-cs7:1 Docker image (torch 2.14.1+cpu, Triton 3.8.0) with cpu_backend="triton" and a stand-in
Triton driver that only answers "which target?" (cuda, sm_90), the method of the Triton and Gluon page (inductor_tg.py)
and The compiler stack page (tc_programs.py). Kernels are compiled to Triton source but cannot run.
Usage: docker run --rm -v <topic>/src/model:/model:ro -v <this exp dir>:/exp:ro -v <this inputs dir>:/inputs -w /exp kb-gpu-lab-cs7:1 python triton_gen.py"""
import sys, os, re, json
sys.path.insert(0, "/model")
import torch
import torch._inductor.config as cfg
cfg.cpu_backend = "triton"
cfg.fx_graph_cache = False
import torch.utils._triton as ut
ut.triton_hash_with_backend = lambda: "nodevice"; ut.triton_backend = lambda: None
from triton.backends.compiler import GPUTarget
import triton, triton.runtime as tr
class StandInDriver:
    def get_current_target(self): return GPUTarget("cuda", 90, 32)
    def get_current_device(self): return 0
    def get_active_torch_device(self): return torch.device("cpu")
    def __getattr__(self, k): raise AttributeError(k)
tr.driver.set_active(StandInDriver())
from model import GPTConfig, make_model
from torch._inductor.utils import run_and_get_code
torch.manual_seed(0)
blk = make_model(GPTConfig()).blocks[0].eval()
x = torch.randn(8, 64, 256)
R = {"torch": torch.__version__, "triton": triton.__version__}
import logging
class H(logging.Handler):
    def __init__(s): super().__init__(logging.DEBUG); s.msgs = []
    def emit(s, r): s.msgs.append(r.getMessage())
h = H()
torch._logging.set_logs(output_code=True)
for name, lg in list(logging.root.manager.loggerDict.items()):
    if name.startswith("torch") and isinstance(lg, logging.Logger) and lg.handlers:
        for hh in list(lg.handlers): lg.removeHandler(hh)
        lg.addHandler(h)
try:
    with torch.no_grad():
        torch.compile(blk)(x)
    R["error"] = None
except Exception as e:
    R["error"] = type(e).__name__ + ": " + str(e).splitlines()[0][:300]
code = next((m for m in h.msgs if "async_compile" in m), "")
names = re.findall(r"^(triton_\w+) = async_compile\.triton\(", code, re.M)
R["kernels"] = {}
for n in names:
    m = re.search(re.escape(n) + r" = async_compile\.triton\('\w+', '''(.*?)'''", code, re.S)
    R["kernels"][n] = m.group(1).strip() if m else ""
i = code.find("def call(")
R["call"] = code[i:code.find("return (", i)] if i >= 0 else ""
R["code_lines"] = code.count("\n")
txt = json.dumps(R, indent=1)
open("/inputs/triton.json", "w").write(txt)
print(R.get("error"), list(R.get("kernels", {})))
