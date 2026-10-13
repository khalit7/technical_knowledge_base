"""The minifier on purpose: Inductor's test-only switch makes every relu fail to compile (inject_relu_bug_TESTING_ONLY),
repro_after="aot" makes Dynamo write a launcher script when the backend fails; running that launcher shrinks the failing
graph. Run from a scratch directory (it writes torch_compile_debug/ into the current directory).
Usage: cd <scratch>; PY <this file>   then: PY torch_compile_debug/run_*/minifier/minifier_launcher.py"""
import torch
import torch._dynamo.config as dc, torch._inductor.config as ic
dc.repro_after = "aot"
ic.cpp.inject_relu_bug_TESTING_ONLY = "compile_error"
def mlp(x, w1, w2, b):
    h = x @ w1
    h = h * 0.5 + b
    h = torch.relu(h)          # the op Inductor will "fail" on
    h = h @ w2
    return torch.nn.functional.layer_norm(h, (h.shape[-1],)).sum()
args = [torch.randn(64, 32), torch.randn(32, 64), torch.randn(64, 32), torch.randn(64)]
try:
    torch.compile(mlp)(*args)
    print("RESULT compiled without error")
except Exception as e:
    print("RESULT", type(e).__name__, str(e).split("\n")[0][:300])
