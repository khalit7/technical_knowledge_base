"""Timed runs for the Compile lab (hold the shared bench lock). Each mode prints JSON to stdout.
  step <cpu|mps>   eager vs compiled training step variants (5 trials x 20 steps after 5 warm-up steps)
  breaks           compiled step with each deliberate graph break (CPU)
  fusion <cpu|mps> the two small functions, eager vs compiled
  first <cachedir> first-call time of a compiled training step in a fresh process (cold or warm cache)
  infer            inference forward: eager no_grad, compiled, AOTInductor package
  seq              the recompile sequence of breaks.py, wall time per call"""
import time, statistics, json, contextlib, io
from common import *
import model as M
torch.set_num_threads(4)
mode = sys.argv[1]
cfg = GPTConfig()

def sync(dev):
    if dev == "mps": torch.mps.synchronize()

def load():
    return os.getloadavg()

def bench(fn, dev, steps=20, trials=5, warm=5):
    for _ in range(warm): fn()
    sync(dev); out = []
    for _ in range(trials):
        t = time.perf_counter()
        for _ in range(steps): fn()
        sync(dev); out.append((time.perf_counter() - t) / steps * 1e3)
    return {"median_ms": statistics.median(out), "min_ms": min(out), "max_ms": max(out), "trials_ms": out}

def step_fn(dev, compile_kw=None, copt=False, fused=False, ckpt=False):
    torch._dynamo.reset()
    c = GPTConfig(checkpoint=ckpt)
    m = make_model(c, dev)
    decay = [p for p in m.parameters() if p.dim() >= 2]; nod = [p for p in m.parameters() if p.dim() < 2]
    opt = torch.optim.AdamW([{"params": decay, "weight_decay": 0.1}, {"params": nod, "weight_decay": 0.0}],
                            lr=6e-4, betas=(0.9, 0.95), fused=True if fused else None)
    f = torch.compile(m, **compile_kw) if compile_kw is not None else m
    ostep = torch.compile(opt.step) if copt else opt.step
    batches = [get_batch(c, s, dev) for s in range(8)]
    k = [0]
    def fn():
        x, y = batches[k[0] % 8]; k[0] += 1
        _, l = f(x, y); l.backward(); ostep(); opt.zero_grad(set_to_none=True)
        return l
    t = time.perf_counter(); l0 = fn(); sync(dev); first = (time.perf_counter() - t) * 1e3
    return fn, first

out = {"mode": mode, "load_before": load(), "torch": torch.__version__, "threads": 4}
if mode == "step":
    dev = sys.argv[2]
    V = [("eager", None, False, False), ("compiled", {}, False, False)]
    if dev == "cpu":
        V += [("compiled, max-autotune", {"mode": "max-autotune"}, False, False),
              ("compiled, reduce-overhead", {"mode": "reduce-overhead"}, False, False),
              ("compiled + compiled optimizer", {}, True, False),
              ("eager, fused AdamW", None, False, True), ("compiled, fused AdamW", {}, False, True)]
    else:
        V += [("eager, fused AdamW", None, False, True), ("compiled, fused AdamW", {}, False, True)]
    res = {}
    for name, kw, copt, fused in V:
        fn, first = step_fn(dev, kw, copt, fused)
        r = bench(fn, dev); r["first_call_ms"] = first; res[name] = r
        print(name, round(r["median_ms"], 2), round(first), file=sys.stderr)
    out["results"] = res
    if dev == "mps":   # memory held after forward (MPS allocator), eager vs compiled
        mem = {}
        for name, kw in [("eager", None), ("compiled", {})]:
            torch._dynamo.reset(); m = make_model(cfg, dev); f = torch.compile(m, **kw) if kw is not None else m
            x, y = get_batch(cfg, 0, dev)
            for _ in range(3):
                _, l = f(x, y); l.backward(); m.zero_grad(set_to_none=True)
            torch.mps.synchronize(); torch.mps.empty_cache(); a0 = torch.mps.current_allocated_memory()
            _, l = f(x, y); torch.mps.synchronize(); a1 = torch.mps.current_allocated_memory()
            l.backward(); m.zero_grad(set_to_none=True)
            mem[name] = {"after_forward_minus_before": a1 - a0}
        out["mps_mem"] = mem
elif mode == "phases":
    # forward and backward timed separately, eager vs compiled, on three shapes of the model; plus a profile
    dev = sys.argv[2]
    shapes = [("default (SDPA)", {}), ("attention written out", {"attn": "manual"}),
              ("attention written out, T=256", {"attn": "manual", "block_size": 256})]
    res = {}
    for label, kw in shapes:
        c = GPTConfig(**kw)
        for comp in (False, True):
            torch._dynamo.reset(); m = make_model(c, dev); f = torch.compile(m) if comp else m
            x, y = get_batch(c, 0, dev)
            st = {}
            def fwd():
                st["l"] = f(x, y)[1]
            def bwd():
                st["l"].backward()
            for _ in range(5): fwd(); bwd(); m.zero_grad(set_to_none=True)
            sync(dev)
            tf, tb = [], []
            for _ in range(5):
                a = b = 0.0
                for _ in range(20):
                    t = time.perf_counter(); fwd(); sync(dev); t1 = time.perf_counter(); bwd(); sync(dev); t2 = time.perf_counter()
                    m.zero_grad(set_to_none=True); a += t1 - t; b += t2 - t1
                tf.append(a / 20 * 1e3); tb.append(b / 20 * 1e3)
            key = label + (" | compiled" if comp else " | eager")
            res[key] = {"fwd_ms": statistics.median(tf), "bwd_ms": statistics.median(tb), "fwd_trials": tf, "bwd_trials": tb}
            print(key, round(res[key]["fwd_ms"], 2), round(res[key]["bwd_ms"], 2), file=sys.stderr)
    out["results"] = res
    if dev == "cpu":
        from torch.profiler import profile, ProfilerActivity
        prof = {}
        for comp in (False, True):
            torch._dynamo.reset(); m = make_model(cfg); f = torch.compile(m) if comp else m
            x, y = get_batch(cfg, 0)
            for _ in range(5):
                _, l = f(x, y); l.backward(); m.zero_grad(set_to_none=True)
            with profile(activities=[ProfilerActivity.CPU]) as p:
                for _ in range(10):
                    _, l = f(x, y); l.backward(); m.zero_grad(set_to_none=True)
            rows = []
            for e in p.key_averages():
                rows.append([e.key, e.count / 10, e.self_cpu_time_total / 10])
            rows.sort(key=lambda r: -r[2])
            prof["compiled" if comp else "eager"] = {"top": rows[:25], "self_total_us": sum(r[2] for r in rows)}
        out["profile"] = prof
elif mode == "breaks":
    sys.argv = sys.argv[:1]
    import breaks as B  # noqa  (re-imports the variants; its side effects write breaks.json again, deterministic)
    res = {}
    for k in B.VARIANTS:
        B.variant(k)
        with contextlib.redirect_stdout(io.StringIO()):
            fn, first = step_fn("cpu", {})
            r = bench(fn, "cpu")
        r["first_call_ms"] = first; res[k] = r
        print(k, round(r["median_ms"], 2), file=sys.stderr)
    B.variant("none")
    with contextlib.redirect_stdout(io.StringIO()):
        fn, _ = step_fn("cpu", None); res["eager"] = bench(fn, "cpu")
    out["results"] = res
elif mode == "fusion":
    dev = sys.argv[2]
    import fusion as F
    res = {}
    for name, f in F.FUNCS.items():
        args = F.inputs(name, dev)
        torch._dynamo.reset(); cf = torch.compile(f)
        with torch.no_grad():
            res[name] = {"eager": bench(lambda: f(*args), dev, steps=200), "compiled": bench(lambda: cf(*args), dev, steps=200)}
        print(name, {k: round(v["median_ms"], 4) for k, v in res[name].items()}, file=sys.stderr)
    out["results"] = res
elif mode == "first":
    # run in a fresh process with TORCHINDUCTOR_CACHE_DIR set by the caller
    fn, first = step_fn("cpu", {})
    t = time.perf_counter(); fn(); second = (time.perf_counter() - t) * 1e3
    out["first_call_ms"] = first; out["second_call_ms"] = second
elif mode == "infer":
    import torch._inductor
    m = make_model(cfg).eval(); x, _ = get_batch(cfg, 0)
    runner = torch._inductor.aoti_load_package(sys.argv[2])
    torch._dynamo.reset(); cm = torch.compile(m)
    res = {}
    with torch.no_grad():
        res["eager"] = bench(lambda: m(x), "cpu", steps=50)
        res["compiled"] = bench(lambda: cm(x), "cpu", steps=50)
        res["aoti"] = bench(lambda: runner(x), "cpu", steps=50)
    out["results"] = res
elif mode == "seq":
    torch._dynamo.reset()
    m = make_model(cfg); cm = torch.compile(m)
    calls = [("first call", 8, 64, "train"), ("same shapes again", 8, 64, "train"), ("batch 4", 4, 64, "train"),
             ("batch 2", 2, 64, "train"), ("batch 8, length 32", 8, 32, "train"), ("batch 3, length 48", 3, 48, "train"),
             ("eval() under no_grad", 8, 64, "eval")]
    rows = []
    for desc, Bn, T, md in calls:
        x, y = get_batch(GPTConfig(batch_size=Bn), 0); x, y = x[:, :T].contiguous(), y[:, :T].contiguous()
        t = time.perf_counter()
        if md == "eval":
            m.eval()
            with torch.no_grad(): cm(x, y)
        else:
            m.train(); _, l = cm(x, y); l.backward()
        rows.append({"call": desc, "ms": (time.perf_counter() - t) * 1e3})
    out["results"] = rows
out["load_after"] = load()
print(json.dumps(out))
