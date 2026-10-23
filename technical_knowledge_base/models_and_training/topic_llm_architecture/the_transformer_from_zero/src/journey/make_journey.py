"""make_journey.py: every number of the "Token's journey" game, from one forward pass of the trained baseline.

The player is token 30 of the running sequence (" to", in "Roxy loved to"), whose next token is " climb".
This script runs gpt_zero.GPT on the running sequence with the trained baseline checkpoint, and records, for
that one position, every intermediate vector the game shows (8 representative dimensions of 256, chosen by the
rule below), the attention scores and weights of all 8 heads of block 1, the FFN's 1,024 hidden activations,
the residual size after every block, and the 4,096 logits. It asserts that its hand-written pieces equal the
model's own forward pass. Writes out/journey.json (CPU, a few seconds).

Run: LA_SCRATCH=<scratch>/la python journey/make_journey.py   (checkpoint: $LA_SCRATCH/runs/tz_base/ckpt.pt,
made by train/train_zero.py --name tz_base; see src/README.md)
"""
import json, math, os, sys
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "..", "..", "src", "data")
sys.path.insert(0, os.path.join(HERE, "..", "zero"))
import gpt_zero as gz

torch.set_num_threads(4)
torch.set_grad_enabled(False)
SCR = os.environ["LA_SCRATCH"]
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
pieces = run["pieces"]
ids = torch.tensor([run["ids"]])
P = 30                                                   # the player: " to"
TWIN = (20, 25)                                          # " R" (of "Roxy") at two positions
K = 8                                                    # dimensions drawn in the backpack
TOPK = 40                                                # exit doors: top-k 40, as Reading section 9 samples

ck = torch.load(os.path.join(SCR, "runs", "tz_base", "ckpt.pt"), map_location="cpu")
cfg = gz.Config(**ck["config"])
m = gz.GPT(cfg).eval()
m.load_state_dict(ck["model"])
log = json.load(open(os.path.join(SCR, "runs", "tz_base", "log.json")))


def rms(v):
    return v.pow(2).mean().sqrt().item()


def r(x, n=4):
    return float(round(float(x), n))


def rl(v, n=4):
    return [r(x, n) for x in v.tolist()]


with torch.no_grad():
    logits_ref, *_ = m(ids)
    E, Pt = m.emb.tok.weight, m.emb.pos.weight
    tid = int(ids[0, P])
    tok, pos = E[tid], Pt[P]
    X = m.emb(ids)[0]                                    # (T, D)
    x0 = X[P]
    assert torch.equal(x0, tok + pos)
    b0 = m.blocks[0]
    N1 = b0.n1(X)                                        # (T, D): the normalised copy every token sends in
    at = b0.attn
    H, hd = cfg.n_head, cfg.hd
    q = (N1 @ at.q.weight.T).view(-1, H, hd)            # (T, H, hd)
    k = (N1 @ at.k.weight.T).view(-1, H, hd)
    v = (N1 @ at.v.weight.T).view(-1, H, hd)
    heads = []
    ys = []
    for h in range(H):
        s = (k[:P + 1, h] @ q[P, h]) / math.sqrt(hd)     # scores of tokens 0..P (the rest is the future)
        w = s.softmax(-1)
        y = w @ v[:P + 1, h]
        ys.append(y)
        heads.append({"score": rl(s, 3), "w": rl(w, 4), "y8": None})
    ycat = torch.cat(ys)                                 # (D): the 8 heads side by side
    a = at.o.weight @ ycat                               # output projection
    a_ref = at(N1[None])[0, P]
    assert (a - a_ref).abs().max() < 1e-4, (a - a_ref).abs().max()
    x1 = x0 + a
    n2 = b0.n2(x1[None])[0]
    hpre = b0.ffn.up.weight @ n2                         # (F)
    hpost = F.gelu(hpre, approximate="tanh")
    f = b0.ffn.down.weight @ hpost
    x2 = x1 + f
    xs = [X]
    for b in m.blocks:
        xs.append(b(xs[-1][None])[0])
    assert (xs[1][P] - x2).abs().max() < 1e-4
    xL = xs[-1][P]
    hf = m.ln_f(xL)
    lg = m.lm_head(hf)
    assert (lg - logits_ref[0, P]).abs().max() < 1e-4
    # the twin: the same token at two positions
    t1, t2 = X[TWIN[0]], X[TWIN[1]]
    tw_tok_diff = (E[int(ids[0, TWIN[0]])] - E[int(ids[0, TWIN[1]])]).abs().max().item()
    tw_cos = F.cosine_similarity(t1, t2, dim=0).item()
    # replace instead of add: how much of "who you are" survives (cosine with your lookup row)
    cos_add = F.cosine_similarity(x1, tok, dim=0).item()
    cos_rep = F.cosine_similarity(a, tok, dim=0).item()

    # representative dimensions: the K with the largest mean |value| / RMS over the states the backpack shows
    states = [tok, pos, x0, a, x1, f, x2, xL]
    score = sum((s_.abs() / s_.pow(2).mean().sqrt()) for s_ in states)
    dims = sorted(score.topk(K).indices.tolist())

    def d8(vv):
        return [r(vv[i], 4) for i in dims]

    for h in range(H):
        heads[h]["y8"] = [r(x, 4) for x in ys[h][:K].tolist()]   # first 8 of the head's 32 numbers
    # the head the player walks with: the most peaked head whose top token is neither <eot> (0) nor itself
    cand = [(max(hh["w"][1:P]), h) for h, hh in enumerate(heads)
            if 0 < max(range(P + 1), key=lambda j: hh["w"][j]) < P]
    main_head = max(cand)[1] if cand else 0

    probs = lg.softmax(-1)
    order = torch.argsort(lg, descending=True)
    top = [{"id": int(i), "t": pieces_t, "logit": r(lg[i], 3), "p": r(probs[i], 4), "row": d8(E[int(i)])}
           for i in order[:TOPK].tolist() for pieces_t in [None]]
    from tokenizers import Tokenizer
    tk = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    for t in top:
        t["t"] = tk.decode([t["id"]])
    true_next = int(run["ids"][P + 1])
    rank_true = int((lg > lg[true_next]).sum().item()) + 1
    near = [{"id": i, "t": tk.decode([i]), "row": d8(E[i])} for i in range(max(0, tid - 2), tid + 3)]

out = {
    "source": "gpt_zero.GPT, checkpoint tz_base retrained 2026-10-23 with train/train_zero.py (seed 0, 1,500 steps)",
    "ckpt_val_loss": log["final_val_loss"], "ckpt_seconds": log["seconds"], "ckpt_device": log["device"],
    "P": P, "tid": tid, "piece": pieces[P], "next_true": pieces[P + 1], "next_true_rank": rank_true,
    "next_true_p": r(probs[true_next], 4),
    "pieces": [("<eot>" if i == 0 else pieces[i]) for i in range(P + 6)],
    "ids": run["ids"][:P + 6],
    "dims": dims, "K": K, "D": cfg.d, "H": H, "hd": hd, "F": cfg.f, "L": cfg.n_layer, "V": cfg.vocab,
    "near": near,
    "tok": d8(tok), "pos": d8(pos), "x0": d8(x0), "pos_next": d8(Pt[P + 1]),
    "rms": {"tok": r(rms(tok)), "pos": r(rms(pos)), "x0": r(rms(x0)), "n1": r(rms(N1[P])), "a": r(rms(a)),
            "x1": r(rms(x1)), "n2": r(rms(n2)), "f": r(rms(f)), "x2": r(rms(x2)), "hf": r(rms(hf))},
    "n1": d8(N1[P]), "a": d8(a), "x1": d8(x1), "n2": d8(n2), "f": d8(f), "x2": d8(x2), "hf": d8(hf),
    "twin": {"pos": list(TWIN), "piece": pieces[TWIN[0]], "tok_diff": tw_tok_diff, "cos": r(tw_cos, 3),
             "a": d8(t1), "b": d8(t2), "row": d8(E[int(ids[0, TWIN[0]])])},
    "cos_add": r(cos_add, 3), "cos_rep": r(cos_rep, 3),
    "heads": heads, "main_head": main_head,
    "ffn": {"pre": rl(hpre, 2), "post": rl(hpost, 2),
            "neg_share": r((hpre < 0).float().mean(), 4), "small_post": r((hpost.abs() < 0.05).float().mean(), 4)},
    "layers": [{"rms": r(rms(xs[i][P])), "x8": d8(xs[i][P])} for i in range(len(xs))],
    "top": top,
    "logits": rl(lg, 3),
}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "out", "journey.json"), "w"))
print("token", repr(pieces[P]), "id", tid, "dims", dims, "main head", main_head,
      "top", [(t["t"], t["p"]) for t in top[:6]], "true next rank", rank_true, "val", log["final_val_loss"])
for h, hh in enumerate(heads):
    j = max(range(P + 1), key=lambda j: hh["w"][j])
    print("head", h, "top", repr(out["pieces"][j]), hh["w"][j])
