"""torch.compile on the CPU (torch 2.14.1+cpu in kb-gpu-lab:1): the programs this page inspects.
Usage: python tc_programs.py <name>   (run_tc.sh sets TORCH_LOGS per run and keeps stderr)
Every program prints a JSON line with what it observed; the logs are the evidence."""
import sys, json, time, os, torch, torch._dynamo as dynamo
torch.manual_seed(0)
torch.set_num_threads(2)

def attn_like(x, w):                     # the running example: softmax of scaled scores, then a multiply by V
    return torch.softmax(x * 0.125, dim=-1) @ w

def with_print(x):                       # a graph break: print is not something a graph can hold
    y = torch.softmax(x * 0.125, dim=-1)
    print("max prob", "(printed from Python)")
    return y.sum(dim=-1)

def with_item(x):                        # a graph break: .item() turns a tensor into a Python number
    m = x.max().item()
    return torch.exp(x - m)

def with_branch(x):                      # data-dependent control flow on a tensor value
    if x.sum() > 0:
        return x * 2
    return x - 1

def rmsnorm(x, w):                       # a training-style op: forward and backward
    return x * torch.rsqrt(x.pow(2).mean(-1, keepdim=True) + 1e-6) * w

def out(d): print("RESULT " + json.dumps(d), flush=True)

name = sys.argv[1]
if name == "graph":                      # one graph, its guards
    x, w = torch.randn(64, 256), torch.randn(256, 32)
    y = torch.compile(attn_like)(x, w)
    out({"name": name, "maxerr": float((y - attn_like(x, w)).abs().max())})
elif name == "explain":                  # graph breaks counted by torch._dynamo.explain
    x = torch.randn(64, 256)
    res = {}
    for f in (attn_like, with_print, with_item, with_branch):
        args = (x, torch.randn(256, 32)) if f is attn_like else (x,)
        e = dynamo.explain(f)(*args)
        res[f.__name__] = {"graphs": e.graph_count, "breaks": e.graph_break_count, "ops": e.op_count,
                           "reasons": [str(r.reason).splitlines()[0][:220] for r in e.break_reasons]}
        dynamo.reset()
    out({"name": name, "explain": res})
elif name == "fullgraph":                # the same breaks under fullgraph=True: an error instead of a silent split
    res = {}
    for f in (with_print, with_item, with_branch):
        dynamo.reset()
        try:
            torch.compile(f, fullgraph=True)(torch.randn(8, 8)); res[f.__name__] = None
        except Exception as ex:
            res[f.__name__] = type(ex).__name__ + ": " + str(ex).strip().splitlines()[0][:300]
    out({"name": name, "errors": res})
elif name == "breakrun":                 # with_print compiled and called: two graphs and Python in between
    f = torch.compile(with_print)
    for rows in (64, 64):
        f(torch.randn(rows, 256))
    out({"name": name})
elif name == "scalar":                   # a Python float argument: specialised (a guard on its value) or not?
    def scaled(x, s): return torch.softmax(x * s, dim=-1)
    f = torch.compile(scaled); x = torch.randn(64, 256)
    for s in (0.125, 0.25, 0.5): f(x, s)
    out({"name": name})
elif name == "recompile":                # shapes change: static first, then a dynamic recompile, then reuse
    f = torch.compile(attn_like); w = torch.randn(256, 32); seen = []
    for rows in (64, 128, 256, 512):
        t = time.perf_counter(); f(torch.randn(rows, 256), w); seen.append([rows, round((time.perf_counter() - t) * 1000, 1)])
    out({"name": name, "calls_ms": seen})
elif name == "aot":                      # AOTAutograd: forward and backward graphs for a training op
    x = torch.randn(64, 256, requires_grad=True); w = torch.randn(256, requires_grad=True)
    torch.compile(rmsnorm)(x, w).sum().backward()
    out({"name": name, "grad_ok": bool(torch.allclose(x.grad, torch.func.grad(lambda a: rmsnorm(a, w).sum())(x), atol=1e-5))})
elif name == "inductor_cpu":             # Inductor writing C++ (OpenMP) for the CPU, and running it
    x, w = torch.randn(64, 256), torch.randn(256, 32)
    y = torch.compile(attn_like)(x, w)
    out({"name": name, "maxerr": float((y - attn_like(x, w)).abs().max())})
elif name == "cold" or name == "warm":   # compile latency: first call in a fresh process, with an empty or a filled cache
    x, w = torch.randn(64, 256, requires_grad=True), torch.randn(256, requires_grad=True)
    f = torch.compile(rmsnorm)
    t = time.perf_counter(); f(x, w).sum().backward(); first = time.perf_counter() - t
    t = time.perf_counter(); f(x, w).sum().backward(); second = time.perf_counter() - t
    t = time.perf_counter(); rmsnorm(x, w).sum().backward(); eager = time.perf_counter() - t
    out({"name": name, "first_s": round(first, 3), "second_ms": round(second * 1000, 2), "eager_ms": round(eager * 1000, 2)})
elif name == "triton_train":           # GPU-style code generation without a GPU (method of the Triton page's inductor_tg.py)
    import torch._inductor.config as cfg
    cfg.cpu_backend = "triton"
    import torch.utils._triton as ut
    ut.triton_hash_with_backend = lambda: "nodevice"; ut.triton_backend = lambda: None
    from triton.backends.compiler import GPUTarget
    import triton.runtime as tr
    class StandInDriver:                 # answers "which target?" so code generation can finish; kernels cannot run
        def get_current_target(self): return GPUTarget("cuda", 90, 32)
        def get_current_device(self): return 0
        def get_active_torch_device(self): return torch.device("cpu")
        def __getattr__(self, k): raise AttributeError(k)
    tr.driver.set_active(StandInDriver())
    x = torch.randn(64, 256, requires_grad=True); w = torch.randn(256, requires_grad=True)
    try:
        torch.compile(rmsnorm)(x, w).sum().backward(); err = None
    except Exception as ex:
        err = type(ex).__name__ + ": " + str(ex).splitlines()[0][:200]
    out({"name": name, "ran": err is None, "error": err})
elif name == "modes":
    import torch._inductor as ind
    out({"name": name, "modes": {m: ind.list_mode_options(m) for m in ("default", "reduce-overhead", "max-autotune", "max-autotune-no-cudagraphs")},
         "recompile_limit": dynamo.config.recompile_limit, "automatic_dynamic_shapes": dynamo.config.automatic_dynamic_shapes,
         "torch": torch.__version__})
