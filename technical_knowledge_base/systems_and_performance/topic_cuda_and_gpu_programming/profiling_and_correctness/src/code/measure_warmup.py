"""Warm-up, measured in a fresh process on the Apple M1 Pro GPU (torch MPS).

The first calls of an operation pay one-time costs (device and context set-up, kernel/pipeline
compilation, allocator growth). Times the first 15 calls of three operations, each call
synchronised, with a host timer. Prints one JSON line. Run once per fresh process.
"""
import json, time, os
import torch

torch.set_num_threads(2)
D = "mps"


def timed(f):
    t0 = time.perf_counter(); f(); torch.mps.synchronize(); return (time.perf_counter() - t0) * 1e3


out = {"load": [round(x, 2) for x in os.getloadavg()]}
t0 = time.perf_counter()
a = torch.randn(2048, 2048, device=D); torch.mps.synchronize()
out["first_tensor_ms"] = (time.perf_counter() - t0) * 1e3
b = torch.randn(2048, 2048, device=D)
s = torch.randn(4096, 1024, device=D)
w = torch.ones(1024, device=D); bias = torch.zeros(1024, device=D)
ops = {
    "matmul_2048": lambda: a @ b,
    "softmax_4096x1024": lambda: torch.softmax(s, dim=-1),
    "layernorm_4096x1024": lambda: torch.nn.functional.layer_norm(s, (1024,), w, bias),
}
for k, f in ops.items():
    out[k] = [round(timed(f), 4) for _ in range(15)]
print(json.dumps(out))
