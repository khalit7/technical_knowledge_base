"""cuDNN frontend 1.30.0 and cuDNN 9.27 without a GPU: what the Python API exposes (graph methods,
heuristic modes, SDPA entry points) and what happens when a handle is created. Run in kb-gpu-lab:1."""
import importlib, inspect
import cudnn
print("cudnn frontend", getattr(cudnn, "__version__", "?"))
try:
    print("backend version", cudnn.backend_version())
except Exception as e:
    print("backend_version FAIL", type(e).__name__, str(e)[:200])
g = cudnn.pygraph
print("graph methods:", ", ".join(sorted(m for m in dir(g) if not m.startswith("_") and m in (
    "validate", "build_operation_graph", "create_execution_plans", "check_support", "build_plans", "execute",
    "get_workspace_size", "sdpa", "sdpa_backward", "sdpa_fp8", "matmul", "pointwise", "conv_fprop", "layernorm", "rmsnorm", "reduction", "scale", "softmax"))))
print("heur modes:", [m for m in dir(cudnn.heur_mode) if not m.startswith("_")])
try:
    h = cudnn.create_handle(); print("create_handle OK")
except Exception as e:
    print("create_handle FAIL", type(e).__name__, str(e)[:240])
