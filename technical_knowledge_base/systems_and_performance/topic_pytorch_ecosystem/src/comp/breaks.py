"""Graph breaks, guards failing (recompiles) and dynamic shapes on the running example. Deterministic: graph counts,
break reasons, recompile reasons, symbolic shapes. Timing of the same variants lives in time_comp.py.
Usage: python breaks.py -> inputs/breaks.json"""
import io, logging
from common import *
import model as M
torch.set_num_threads(4)
cfg = GPTConfig()
R = {"breaks": {}, "recompiles": {}}

ORIG = M.Block.forward
def blk_print(self, x):
    x = x + self.attn(self.ln1(x))
    print("block done")                                   # side effect Dynamo cannot put in a graph
    return x + self.mlp(self.ln2(x))
def blk_item(self, x):
    x = x + self.attn(self.ln1(x))
    self.last_scale = x.abs().max().item()                # a Python float out of a tensor
    return x + self.mlp(self.ln2(x))
def blk_if(self, x):
    x = x + self.attn(self.ln1(x))
    if x.abs().max() > 100:                               # control flow that depends on tensor values
        x = x / 100
    return x + self.mlp(self.ln2(x))
def blk_numpy(self, x):
    x = x + self.attn(self.ln1(x))
    import numpy as np
    s = float(np.linalg.norm(x.detach().cpu().numpy()))    # leaves torch: numpy on real data
    return x + self.mlp(self.ln2(x)) * (1.0 if s > 0 else 0.0)
VARIANTS = {"none": ORIG, "print": blk_print, "item": blk_item, "if": blk_if, "numpy": blk_numpy}
R["variant_src"] = {}
import inspect
for k, f in VARIANTS.items():
    if k != "none":
        R["variant_src"][k] = inspect.getsource(f)

def variant(k):
    M.Block.forward = VARIANTS[k]

def main():
    def rmpath(s):
        return clean(str(s))

    import contextlib
    for k in VARIANTS:
        variant(k); torch._dynamo.reset()
        m = make_model(cfg); x, y = get_batch(cfg, 0)
        with contextlib.redirect_stdout(io.StringIO()):
            ex = torch._dynamo.explain(m)(x, y)
        reasons = []
        for br in ex.break_reasons:
            reasons.append({"reason": rmpath(br.reason)[:600],
                            "where": [rmpath(f"{fs.filename.split('/')[-1]}:{fs.lineno} in {fs.name}") for fs in br.user_stack[-1:]]})
        # fullgraph=True turns the first break into an error
        err = ""
        if ex.graph_break_count:
            torch._dynamo.reset()
            try:
                with contextlib.redirect_stdout(io.StringIO()):
                    torch.compile(make_model(cfg), fullgraph=True)(x, y)
            except Exception as e:
                err = rmpath(type(e).__name__ + ": " + str(e).split("\n")[0])[:400]
        # run it: how many compiled pieces exist, and how many run per forward
        torch._dynamo.reset()
        pieces, runs, names = [], [0], []
        def counting(gm, ex_in):
            ns = [n for n in gm.graph.nodes if n.op in ("call_function", "call_method", "call_module")]
            pieces.append(len(ns))
            names.append([str(n.target if isinstance(n.target, str) else getattr(n.target, "__name__", n.target)) for n in ns])
            def run(*a):
                runs[0] += 1
                return gm.forward(*a)
            return run
        mm = make_model(cfg); cmm = torch.compile(mm, backend=counting)
        with contextlib.redirect_stdout(io.StringIO()):
            cmm(x, y); runs[0] = 0; cmm(x, y)
        R["breaks"][k] = {"pieces_compiled": len(pieces), "piece_ops": pieces, "pieces_per_forward": runs[0], "piece_names": names, "graphs": ex.graph_count, "breaks": ex.graph_break_count, "ops_per_graph": [len(o) for o in ex.ops_per_graph],
                          "reasons": reasons, "fullgraph_error": err}
        print(k, len(pieces), pieces, runs[0], ex.graph_count, ex.graph_break_count, [len(o) for o in ex.ops_per_graph], reasons[:1], err[:150])
    variant("none")

    # ---- recompiles: a sequence of calls on one compiled model ----
    buf = io.StringIO(); h = logging.StreamHandler(buf)
    def capture(on):
        torch._logging.set_logs(recompiles=on, dynamic=False)
        lg = logging.getLogger("torch._dynamo")
        (lg.addHandler if on else lg.removeHandler)(h)

    def frames():
        from torch._dynamo.utils import counters
        return counters["stats"]["unique_graphs"]

    def sequence(label, calls, prep=None):
        torch._dynamo.reset(); buf.seek(0); buf.truncate()
        m = make_model(cfg); cm = torch.compile(m)
        rows = []
        capture(True)
        for desc, B, T, mode in calls:
            c2 = GPTConfig(batch_size=B, block_size=64)
            x, y = get_batch(c2, 0); x, y = x[:, :T].contiguous(), y[:, :T].contiguous()
            if prep: prep(x, y)
            before = frames(); pos = buf.tell()
            if mode == "eval":
                m.eval()
                with torch.no_grad(): cm(x, y)
            else:
                m.train(); _, l = cm(x, y); l.backward()
            txt = buf.getvalue()[pos:]
            reason = re.findall(r"triggered by the following guard failure\(s\):\s*\n?\s*-\s*\d+/\d+:\s*(.*)", txt)
            rows.append({"call": desc, "B": B, "T": T, "mode": mode, "new_graphs": frames() - before,
                         "reason": rmpath(reason[0])[:300] if reason else ""})
        capture(False)
        R["recompiles"][label] = rows
        for r in rows: print(label, r)
        return cm

    calls = [("first call", 8, 64, "train"), ("same shapes again", 8, 64, "train"), ("batch 4", 4, 64, "train"),
             ("batch 2", 2, 64, "train"), ("batch 8, length 32", 8, 32, "train"), ("batch 3, length 48", 3, 48, "train"),
             ("eval() under no_grad", 8, 64, "eval")]
    sequence("automatic", calls)
    sequence("mark_dynamic", calls, prep=lambda x, y: (torch._dynamo.mark_dynamic(x, 0), torch._dynamo.mark_dynamic(x, 1)))
    sequence("mark_dynamic_both", calls, prep=lambda x, y: [torch._dynamo.mark_dynamic(t, d) for t in (x, y) for d in (0, 1)])

    # what the dynamic graph looks like: symbols in the recompiled graph
    torch._dynamo.reset()
    m = make_model(cfg)
    ex1 = torch._dynamo.explain(m)(*[t[:4] for t in get_batch(cfg, 0)])
    # a changing Python scalar: float, int, or a 0-d tensor, passed to a small compiled update
    from torch._dynamo.utils import counters
    def upd(p, g, lr):
        return p - lr * g
    R["scalars"] = {}
    for kind, vals in [("float", [0.1, 0.2, 0.3, 0.4, 0.5]), ("int", [1, 2, 3, 4, 5]),
                       ("tensor", [torch.tensor(v) for v in [0.1, 0.2, 0.3, 0.4, 0.5]])]:
        torch._dynamo.reset(); counters.clear()
        cf = torch.compile(upd, backend="eager"); p_, g_ = torch.randn(4), torch.randn(4); per = []
        for v in vals:
            b = counters["stats"]["unique_graphs"]; cf(p_, g_, v); per.append(counters["stats"]["unique_graphs"] - b)
        R["scalars"][kind] = per
    print("scalars", R["scalars"])
    R["dynamic_note"] = {"recompile_limit": torch._dynamo.config.recompile_limit,
                         "automatic_dynamic_shapes": torch._dynamo.config.automatic_dynamic_shapes,
                         "assume_static_by_default": torch._dynamo.config.assume_static_by_default,
                         "specialize_float": torch._dynamo.config.specialize_float}
    save("breaks.json", R)


if __name__ == "__main__":
    main()
