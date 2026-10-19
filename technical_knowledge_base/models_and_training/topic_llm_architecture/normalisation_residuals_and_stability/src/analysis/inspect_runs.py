"""CPU inspection of trained (and freshly initialised) tiny GPTs on the running sequence.

For each run: the residual stream after the embedding and after every sub-layer (attention, then FFN, per block:
13 points for 6 blocks), for every token, computed by stepping the block by hand for its placement (pre, post,
sandwich, output) and checked against the model's own forward (logits must agree); plus per-layer largest attention
logit, attention entropy, largest single residual entry and the token holding it.
  inspect_runs.py <run> [<run> ...]          trained checkpoints from $LA_SCRATCH/runs
  inspect_runs.py --init <norm_pos> [--flat] a fresh seed-0 model (pre | post | sandwich | output)
Writes ../out/inspect/<name>.json.
"""
import json, math, os, sys
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "runs"))
from ns_model import NS, probe  # noqa: E402
import tiny_gpt  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
OUT = os.path.join(HERE, "..", "out", "inspect"); os.makedirs(OUT, exist_ok=True)
TRACE = 157   # the Block lab's traced token ("o" in "Ro|xy")


def placement(cfg):
    return NS["norm_pos"] or cfg.norm_pos


@torch.no_grad()
def stream(model, ids):
    """Residual stream after the embedding and after each sub-layer: list of (T, D)."""
    cfg = model.cfg; p = placement(cfg)
    x, pos = model.embed(ids)
    pts = [x[0]]
    for b in model.blocks:
        if p == "post":
            a, _ = b.mix(x, pos); x = b.n1(x + a); pts.append(x[0])
            f, _ = b._ffn(x); x = b.n2(x + f); pts.append(x[0])
        elif p == "sandwich":
            a, _ = b.mix(b.n1(x), pos); x = x + b.n1b(a); pts.append(x[0])
            f, _ = b._ffn(b.n2(x)); x = x + b.n2b(f); pts.append(x[0])
        elif p == "output":
            a, _ = b.mix(x, pos); x = x + b.n1(a); pts.append(x[0])
            f, _ = b._ffn(x); x = x + b.n2(f); pts.append(x[0])
        else:
            a, _ = b.mix(b.n1(x), pos); x = x + a; pts.append(x[0])
            f, _ = b._ffn(b.n2(x)); x = x + f; pts.append(x[0])
    logits = model.lm_head(model.ln_f(x))
    return pts, logits


def inspect(model, name, meta):
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([run["ids"]])
    pts, logits = stream(model, ids)
    ref = model(ids)[0]
    err = (logits - ref).abs().max().item()
    assert err < 1e-3, (name, err)
    st, rec, _ = probe(model, ids)
    D = model.cfg.d_model
    rms = [p.norm(dim=-1) for p in pts]                                 # (T,) L2 norm per point (as the Block lab)
    res = {"name": name, **meta, "check_max_abs_logit_diff": err,
           "points": ["emb"] + [f"{k}{i + 1}" for i in range(len(model.blocks)) for k in ("a", "f")],
           "median_norm": [round(r[1:].median().item(), 4) for r in rms],
           "tok0_norm": [round(r[0].item(), 4) for r in rms],
           "trace_norm": [round(r[TRACE].item(), 4) for r in rms],
           "max_abs": [round(p.abs().max().item(), 3) for p in pts],
           "max_abs_tok": [int(p.abs().amax(-1).argmax().item()) for p in pts],
           "max_abs_dim": [int(p.abs().max(0).values.argmax().item()) for p in pts],
           "median_abs": [round(p.abs().median().item(), 5) for p in pts],
           "max_logit": [round(s["max_logit"], 3) for s in st], "max_logit_head": [[round(v, 2) for v in s["max_logit_head"]] for s in st],
           "entropy": [round(s["entropy"], 4) for s in st], "top_w": [round(s["top_w"], 4) for s in st],
           "q_norm": [round(s["q_norm"], 3) for s in st], "k_norm": [round(s["k_norm"], 3) for s in st],
           "loss_running_seq": round(torch.nn.functional.cross_entropy(ref[0, :-1], ids[0, 1:]).item(), 4)}
    json.dump(res, open(os.path.join(OUT, name + ".json"), "w"))
    print(name, "err", f"{err:.1e}", "loss", res["loss_running_seq"], "median rms", res["median_norm"][0], "->", res["median_norm"][-1],
          "max logit", max(res["max_logit"]), "max|x|", max(res["max_abs"]))


def load_run(name):
    d = os.path.join(SCR, "runs", name)
    ck = torch.load(os.path.join(d, "ckpt.pt"), map_location="cpu")
    ns = json.load(open(os.path.join(d, "ns.json"))) if os.path.exists(os.path.join(d, "ns.json")) else {}
    NS.update(norm_pos=ns.get("norm_pos"), attn_softcap=ns.get("attn_softcap") or None, init="gpt2")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); m.eval()
    return m, {"trained": True, "ns": ns}


if __name__ == "__main__":
    torch.set_num_threads(2)
    a = sys.argv[1:]
    if a and a[0] == "--init":
        pos = a[1]; flat = "--flat" in a
        NS.update(norm_pos="output" if pos == "output" else None, attn_softcap=None, init="flat" if flat else "gpt2")
        torch.manual_seed(0)
        cfg = GPTConfig(norm_pos=pos if pos != "output" else "pre")
        m = GPT(cfg).eval()
        inspect(m, f"init_{pos}{'_flat' if flat else ''}", {"trained": False, "norm_pos": pos, "init": "flat" if flat else "gpt2"})
    else:
        for n in a:
            m, meta = load_run(n)
            inspect(m, n, meta)
