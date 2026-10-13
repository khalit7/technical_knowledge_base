"""Graph-break fixer: each common break kind put into the running example's Block.forward (between attention and MLP),
then the fix. For each variant: torch._dynamo.explain (graphs, breaks, reasons), the compiled pieces and how many run
per forward (a counting backend), the fullgraph=True error, and the max difference of the forward output against the
unmodified model (the fix must not change the numbers). Deterministic. Usage: PY fixer.py -> ../inputs/fixer.json"""
import inspect, math, random
from common import *
import model as M
import torch.nn.functional as F
torch.set_num_threads(4)
cfg = GPTConfig()
ORIG = M.Block.forward

# ---- the variants (each is a Block.forward); "fix" variants compute the same numbers without the break
def print_break(self, x):
    x = x + self.attn(self.ln1(x))
    print("block done")
    return x + self.mlp(self.ln2(x))
def print_fix(self, x):            # same code; config.reorderable_logging_functions = {print} set by the runner
    x = x + self.attn(self.ln1(x))
    print("block done")
    return x + self.mlp(self.ln2(x))
def item_break(self, x):
    x = x + self.attn(self.ln1(x))
    s = x.abs().max().item()
    return x + self.mlp(self.ln2(x)) * (1.0 if s < 1e9 else 0.0)
def item_fix(self, x):             # keep the scalar a tensor
    x = x + self.attn(self.ln1(x))
    s = x.abs().max()
    return x + self.mlp(self.ln2(x)) * (s < 1e9).to(x.dtype)
def if_break(self, x):
    x = x + self.attn(self.ln1(x))
    if x.abs().max() > 100:
        x = x / 100
    return x + self.mlp(self.ln2(x))
def if_fix(self, x):               # both branches as tensors: torch.where
    x = x + self.attn(self.ln1(x))
    m = x.abs().max()
    x = torch.where(m > 100, x / 100, x)
    return x + self.mlp(self.ln2(x))
def if_fix_cond(self, x):          # or torch.cond: one graph holding both branches
    x = x + self.attn(self.ln1(x))
    x = torch.cond(x.abs().max() > 100, lambda t: t / 100, lambda t: t.clone(), (x,))
    return x + self.mlp(self.ln2(x))
def numpy_break(self, x):
    x = x + self.attn(self.ln1(x))
    import numpy as np
    s = float(np.linalg.norm(x.detach().cpu().numpy()))
    return x + self.mlp(self.ln2(x)) * (1.0 if s > 0 else 0.0)
def numpy_fix(self, x):            # the same reduction in torch
    x = x + self.attn(self.ln1(x))
    s = torch.linalg.vector_norm(x.detach())
    return x + self.mlp(self.ln2(x)) * (s > 0).to(x.dtype)
def mask_break(self, x):           # boolean-mask indexing: output size depends on the data
    x = x + self.attn(self.ln1(x))
    h = self.mlp(self.ln2(x))
    big = h[h.abs() > 1e9]
    return x + h + big.sum()
def mask_fix(self, x):             # keep the shape static: zero out instead of selecting
    x = x + self.attn(self.ln1(x))
    h = self.mlp(self.ln2(x))
    big = torch.where(h.abs() > 1e9, h, torch.zeros_like(h))
    return x + h + big.sum()
@torch.compiler.disable
def log_stats(t):                  # a helper someone marked disable (common in logging utilities)
    return None
def disable_break(self, x):
    x = x + self.attn(self.ln1(x))
    log_stats(x)
    return x + self.mlp(self.ln2(x))
def disable_fix(self, x):          # call the helper outside the compiled region (here: dropped from forward)
    x = x + self.attn(self.ln1(x))
    return x + self.mlp(self.ln2(x))
def explicit_break(self, x):
    x = x + self.attn(self.ln1(x))
    torch._dynamo.graph_break()
    return x + self.mlp(self.ln2(x))
def random_break(self, x):         # Python's random module inside the model
    x = x + self.attn(self.ln1(x))
    keep = 1.0 if random.random() < 2.0 else 0.0
    return x + self.mlp(self.ln2(x)) * keep
def random_fix(self, x):
    x = x + self.attn(self.ln1(x))
    keep = (torch.rand(()) < 2.0).to(x.dtype)
    return x + self.mlp(self.ln2(x)) * keep
def tolist_break(self, x):
    x = x + self.attn(self.ln1(x))
    sc = x.abs().amax(dim=(0, 1))[:2].tolist()
    return x + self.mlp(self.ln2(x)) * (1.0 if sc[0] < 1e9 else 0.0)
def tolist_fix(self, x):
    x = x + self.attn(self.ln1(x))
    sc = x.abs().amax(dim=(0, 1))[:2]
    return x + self.mlp(self.ln2(x)) * (sc[0] < 1e9).to(x.dtype)

KINDS = [  # key, label, broken, fixed, config for the fixed run, what the fix is
    ("print", "print()", print_break, print_fix, {"reorderable_logging_functions": {print}}, "config.reorderable_logging_functions = {print}: Dynamo moves the print after the graph"),
    ("item", ".item()", item_break, item_fix, {}, "keep the value a 0-d tensor"),
    ("item_cfg", ".item() with capture_scalar_outputs", item_break, item_break, {"capture_scalar_outputs": True}, "config.capture_scalar_outputs = True: the scalar becomes an unbacked symbol in the graph"),
    ("if", "if on a tensor value", if_break, if_fix, {}, "torch.where computes both branches"),
    ("cond", "if on a tensor value, torch.cond", if_break, if_fix_cond, {}, "torch.cond keeps both branches inside one graph"),
    ("numpy", "NumPy on .numpy()", numpy_break, numpy_fix, {}, "the same reduction in torch"),
    ("mask", "boolean-mask indexing", mask_break, mask_fix, {}, "torch.where keeps the shape static"),
    ("mask_cfg", "boolean-mask indexing with capture_dynamic_output_shape_ops", mask_break, mask_break, {"capture_dynamic_output_shape_ops": True}, "config.capture_dynamic_output_shape_ops = True: the selected size becomes an unbacked symbol"),
    ("disable", "a @torch.compiler.disable helper", disable_break, disable_fix, {}, "call it outside the compiled function"),
    ("explicit", "torch._dynamo.graph_break()", explicit_break, ORIG, {}, "remove it"),
    ("random", "Python random.random()", random_break, random_fix, {}, "torch.rand (traced, seeded by torch)"),
    ("tolist", ".tolist()", tolist_break, tolist_fix, {}, "index the tensor instead"),
]

def run_variant(fwd, conf, nested=False):
    import torch._dynamo.config as dc
    old = {k: getattr(dc, k) for k in conf}
    for k, v in conf.items():
        setattr(dc, k, v)
    oldn = dc.nested_graph_breaks; dc.nested_graph_breaks = nested
    M.Block.forward = fwd
    try:
        torch._dynamo.reset()
        m = make_model(cfg); x, y = get_batch(cfg, 0)
        with quiet():
            ex = torch._dynamo.explain(m)(x, y)
        reasons = []
        for br in ex.break_reasons:
            reasons.append({"reason": clean(br.reason).split("\n")[0][:300], "where": [clean(f"{fs.filename.split('/')[-1]}:{fs.lineno} in {fs.name}") for fs in br.user_stack[-1:]]})
        err = ""
        torch._dynamo.reset()
        try:
            with quiet():
                torch.compile(make_model(cfg), fullgraph=True, backend="eager")(x, y)
        except Exception as e:
            err = clean(type(e).__name__ + ": " + str(e).split("\n")[0])[:300]
        torch._dynamo.reset()
        pieces, runs = [], [0]
        def counting(gm, ex_in):
            ns = [n for n in gm.graph.nodes if n.op in ("call_function", "call_method", "call_module")]
            pieces.append(len(ns))
            def run(*a):
                runs[0] += 1
                return gm.forward(*a)
            return run
        mm = make_model(cfg); cmm = torch.compile(mm, backend=counting)
        with quiet():
            cmm(x, y); runs[0] = 0; out = cmm(x, y)
        M.Block.forward = ORIG
        with torch.no_grad():
            ref = make_model(cfg)(x, y)
        diff = max(float((out[0] - ref[0]).abs().max()), float((out[1] - ref[1]).abs().max()))
        return {"graphs": ex.graph_count, "breaks": ex.graph_break_count, "ops_per_graph": [len(o) for o in ex.ops_per_graph],
                "reasons": reasons, "fullgraph_error": err, "pieces_compiled": len(pieces), "piece_ops": pieces,
                "pieces_per_forward": runs[0], "max_diff_vs_original": diff}
    finally:
        for k, v in old.items():
            setattr(dc, k, v)
        dc.nested_graph_breaks = oldn
        M.Block.forward = ORIG

R = {"torch": torch.__version__, "kinds": []}
R["baseline"] = run_variant(ORIG, {})
for key, label, brk, fix, conf, how in KINDS:
    b = run_variant(brk, {})
    f = run_variant(fix, conf)
    R["kinds"].append({"key": key, "label": label, "how": how, "conf": {k: (sorted(getattr(v, "__name__", str(v)) for v in val) if isinstance(val, set) else val) for k, val in conf.items()},
                       "src_break": inspect.getsource(brk), "src_fix": inspect.getsource(fix), "broken": b, "fixed": f})
    print(key, "broken", b["graphs"], b["breaks"], b["pieces_compiled"], b["pieces_per_forward"], "| fixed", f["graphs"], f["breaks"], f["pieces_compiled"], f["pieces_per_forward"], f["max_diff_vs_original"], (b["reasons"][:1] or [{}])[0].get("reason", "")[:90])
# nested graph breaks (config.nested_graph_breaks, off by default at 2.14.1): does the outer GPT.forward stay compiled?
R["nested"] = {"print": run_variant(print_break, {}, nested=True), "explicit": run_variant(explicit_break, {}, nested=True)}
print("nested", {k: (v["graphs"], v["pieces_compiled"], v["pieces_per_forward"]) for k, v in R["nested"].items()})
save("fixer.json", R)
