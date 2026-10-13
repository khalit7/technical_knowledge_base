"""The warm-cache trap, reproduced in three fresh processes sharing one compile cache.

  late   : the C++ op is traced (explain) before its Python autograd formula is registered, then compiled
  fixed  : a new process, registrations made at import, same cache directory
  fixed_nocache / fixed_noaotcache: the same with all caches, or only the AOTAutograd cache, turned off
Each prints how many of the 52 parameters got no gradient after one compiled forward and backward.
Writes src/inputs/cache_trap.json. Run: python cache_trap.py (it starts the children itself).
"""
import json, os, subprocess, sys, tempfile

if len(sys.argv) > 1:
    mode = sys.argv[1]
    from common import SCRATCH
    import torch, warnings
    warnings.simplefilter("ignore")
    import torch.nn.functional as F
    import model as M
    from model import GPTConfig, make_model, get_batch
    from cpp_ext import load_ext
    torch.set_num_threads(2)
    load_ext(SCRATCH + "/build_ops")
    cfg = GPTConfig(); xi, yi = get_batch(cfg, 0)
    M.MLP.forward = lambda self, x: self.proj(torch.ops.extc.gelu(self.fc(x)))

    def register():
        torch.library.register_fake("extc::gelu")(lambda x: torch.empty_like(x))
        torch.library.register_fake("extc::gelu_backward")(lambda g, x: torch.empty_like(x))

        def sc(ctx, inputs, output):
            ctx.save_for_backward(inputs[0])

        def bw(ctx, g):
            (x,) = ctx.saved_tensors
            return torch.ops.extc.gelu_backward(g, x)
        torch.library.register_autograd("extc::gelu", bw, setup_context=sc)

    if mode == "late":
        try:
            torch._dynamo.explain(make_model(cfg))(xi, yi)   # traced with no fake, no autograd
        except Exception:
            pass
        register()
    else:
        register()
    m = make_model(cfg)
    _, loss = torch.compile(m, fullgraph=True)(xi, yi)
    loss.backward()
    print(json.dumps({"mode": mode, "no_grad_params": sum(p.grad is None for p in m.parameters()),
                      "params": sum(1 for _ in m.parameters()), "loss": round(loss.item(), 6)}))
else:
    from common import SCRATCH, save
    cache = tempfile.mkdtemp(prefix="trap_", dir=SCRATCH)
    runs = []
    for mode, extra in [("late", {}), ("fixed", {}), ("fixed", {"TORCHINDUCTOR_AUTOGRAD_CACHE": "0"}),
                        ("fixed", {"TORCHINDUCTOR_FORCE_DISABLE_CACHES": "1"})]:
        env = dict(os.environ, EXT_CACHE_DIR=cache, **extra)
        r = subprocess.run([sys.executable, __file__, mode], env=env, capture_output=True, text=True)
        line = [l for l in r.stdout.splitlines() if l.startswith("{")]
        rec = json.loads(line[-1]) if line else {"mode": mode, "error": r.stderr[-300:]}
        rec["env"] = extra
        runs.append(rec)
        print(rec)
    save("cache_trap.json", {"torch": __import__("torch").__version__, "runs": runs})
