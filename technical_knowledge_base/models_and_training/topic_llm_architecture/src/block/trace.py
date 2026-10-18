"""Block lab: trace ONE token of the running sequence through every block of a trained tiny GPT, recording every
intermediate tensor the Block lab animation shows, plus residual-stream norms by layer and sub-layer for all tokens.

Run on CPU (tiny model, 256 tokens; no GPU needed):
  LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python src/block/trace.py <run name> [--pos 157] [--init]
--init traces a freshly initialised model with the run's config and seed 0 instead of the trained checkpoint.
Writes src/block/out/trace_<run>[_init].json. The block is re-executed step by step here (same maths as
tiny_gpt.Block.forward) so every intermediate is visible; the script checks that its output equals the model's own
forward to within 1e-4.
"""
import argparse, json, math, os, sys
import torch
import torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]


def r(t, n=4):
    return [round(float(v), n) for v in t.flatten().tolist()]


def load(name, init):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    cfg = GPTConfig(**ck["config"])
    torch.manual_seed(0)
    m = GPT(cfg)
    if not init:
        m.load_state_dict(ck["model"])
    return m.eval(), cfg


@torch.no_grad()
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("run")
    ap.add_argument("--pos", type=int, default=157)
    ap.add_argument("--init", action="store_true")
    ap.add_argument("--norms", action="store_true", help="keep only the norms and the prediction (small file)")
    a = ap.parse_args()
    torch.set_num_threads(4)
    m, cfg = load(a.run, a.init)
    seq = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([seq["ids"]])
    T, D, H, hd, P = ids.shape[1], cfg.d_model, cfg.n_head, cfg.head_dim, a.pos
    assert cfg.attn == "mha" and cfg.pos == "learned" and cfg.ffn == "gelu" and cfg.n_experts == 0

    ref_logits, *_ = m(ids)
    x, pos = m.embed(ids)
    out = {"run": a.run, "init": a.init, "pos": P, "token": seq["pieces"][P], "token_id": seq["ids"][P],
           "next_token": seq["pieces"][P + 1], "context": seq["pieces"][max(0, P - 12):P + 1],
           "config": {"d_model": D, "n_layer": cfg.n_layer, "n_head": H, "head_dim": hd, "ffn_hidden": cfg.ffn_hidden,
                      "vocab": cfg.vocab_size, "ctx": cfg.ctx, "norm_pos": cfg.norm_pos},
           "embed": {"tok": r(m.wte.weight[seq["ids"][P]]), "pos": r(m.wpe.weight[P]), "x": r(x[0, P])},
           "layers": []}
    # residual norms: stream after the embedding, after each attention add and each FFN add (all tokens)
    sub = [x[0].norm(dim=-1)]
    branch = []
    for li, b in enumerate(m.blocks):
        L = {}
        post = cfg.norm_pos == "post"
        xin = x
        h = xin if post else b.n1(xin)
        at = b.mix
        q = at.q(h).view(1, T, H, hd).transpose(1, 2)
        k = at.k(h).view(1, T, H, hd).transpose(1, 2)
        v = at.v(h).view(1, T, H, hd).transpose(1, 2)
        s = (q @ k.transpose(-2, -1)) * at.scale
        mask = torch.triu(torch.ones(T, T, dtype=torch.bool), 1)
        s = s.masked_fill(mask, float("-inf"))
        w = s.softmax(-1)
        y = (w @ v)                                # (1,H,T,hd)
        ym = y.transpose(1, 2).reshape(1, T, D)
        ao = at.o(ym)
        if post:
            xm = b.n1(xin + ao)
        else:
            xm = xin + ao
        h2 = xm if post else b.n2(xm)
        up = b.ffn.up(h2)
        act = F.gelu(up, approximate="tanh")
        fo = b.ffn.down(act)
        xo = b.n2(xm + fo) if post else xm + fo
        L["x_in"] = r(xin[0, P]); L["norm1"] = r(h[0, P])
        L["q"] = r(q[0, :, P]); L["k"] = r(k[0, :, P]); L["v"] = r(v[0, :, P])
        L["scores"] = [r(s[0, hh, P, :P + 1], 3) for hh in range(H)]
        L["attn"] = [r(w[0, hh, P, :P + 1], 4) for hh in range(H)]
        L["head_out"] = r(ym[0, P]); L["attn_out"] = r(ao[0, P]); L["x_mid"] = r(xm[0, P])
        L["norm2"] = r(h2[0, P]); L["ffn_up"] = r(up[0, P], 3); L["ffn_act"] = r(act[0, P], 3)
        L["ffn_out"] = r(fo[0, P]); L["x_out"] = r(xo[0, P])
        L["stats"] = {"attn_entropy_bits": [round(float(-(w[0, hh, P, :P + 1].clamp_min(1e-12).log2() * w[0, hh, P, :P + 1]).sum()), 3) for hh in range(H)],
                      "gelu_neg_frac": round(float((up[0, P] < 0).float().mean()), 4),
                      "gelu_small_frac": round(float((act[0, P].abs() < 0.05).float().mean()), 4)}
        out["layers"].append(L)
        sub.append(xm[0].norm(dim=-1)); sub.append(xo[0].norm(dim=-1))
        branch.append(ao[0].norm(dim=-1)); branch.append(fo[0].norm(dim=-1))
        x = xo
    hf = m.ln_f(x)
    logits = m.lm_head(hf)
    err = float((logits - ref_logits).abs().max())
    assert err < 1e-3, err
    pr = logits[0, P].softmax(-1)
    top = pr.topk(10)
    from tokenizers import Tokenizer
    tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
    out["final"] = {"norm_f": r(hf[0, P]), "top": [[tok.decode([int(i)]), round(float(p), 4), int(i)] for p, i in zip(top.values, top.indices)],
                    "p_next": round(float(pr[seq["ids"][P + 1]]), 4), "logit_max": round(float(logits[0, P].max()), 3),
                    "logit_min": round(float(logits[0, P].min()), 3), "check_max_abs_err_vs_model_forward": err}
    S = torch.stack(sub)          # (2L+1, T)
    B = torch.stack(branch)       # (2L, T)
    out["norms"] = {"labels": ["embed"] + [f"L{i + 1}{s}" for i in range(cfg.n_layer) for s in ("attn", "ffn")],
                    "stream_median": r(S.median(dim=1).values, 3), "stream_token": r(S[:, P], 3),
                    "stream_p10": r(S.quantile(0.1, dim=1), 3), "stream_p90": r(S.quantile(0.9, dim=1), 3),
                    "branch_median": r(B.median(dim=1).values, 3), "branch_token": r(B[:, P], 3),
                    "first_token_stream": r(S[:, 0], 3)}
    if a.init or a.norms:  # only the norms and the prediction are used for an untrained model
        out.pop("layers"); out.pop("embed")
    fn = os.path.join(HERE, "out", f"trace_{a.run}{'_init' if a.init else ''}.json")
    json.dump(out, open(fn, "w"))
    print(fn, "token", repr(out["token"]), "-> next", repr(out["next_token"]), "p", out["final"]["p_next"],
          "err", err, "stream median", out["norms"]["stream_median"])


if __name__ == "__main__":
    main()
