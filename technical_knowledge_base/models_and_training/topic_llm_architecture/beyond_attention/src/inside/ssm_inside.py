"""Look inside the trained SSM-only tiny GPT (run ba_ssm) on the running sequence, and beside it the attention model.

For every SSM layer and head of ba_ssm (6 layers x 16 heads, state 16 per channel, 32 channels per head):
  - the decay a_t = exp(dt_t * A_h) at every token (how much of the state survives one step), and its median as a
    half-life in tokens: h = ln 0.5 / ln a;
  - the implicit "attention" matrix of the dual form (Mamba-2's state space duality; Ali et al. 2024 for Mamba-1):
        M[i, j] = (C_i . B_j) * prod_{j<k<=i} a_k * dt_j        so that  y_i = sum_j M[i, j] x_j + D x_i
    (per head; x is that head's 32 channels after the convolution). Shown as |M| normalised per row.
For at_mha (the Attention lab's MHA run): its attention weights for the same tokens.
Also checks that the dual (quadratic) form equals the step-by-step recurrence on this sequence (max abs difference
of the layer outputs), the property the page states.

Run: LA_SCRATCH=<scratch>/la <venv>/bin/python src/inside/ssm_inside.py   (CPU, seconds)  -> out/ssm_inside.json
"""
import json, math, os, sys
import torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402

SCR = os.environ["LA_SCRATCH"]
NTOK = 48            # tokens shown in the maps


def load(name):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); return m.eval()


@torch.no_grad()
def ssm_internals(mix, h):
    """Recompute one SSM layer's quantities from its input h (1, T, D), following tiny_gpt.SSM.forward."""
    T = h.shape[1]; E, N, nh, P = mix.E, mix.N, mix.nh, mix.P
    z, xbc, dt = mix.in_proj(h).split([E, E + 2 * N, nh], -1)
    xbc = F.silu(mix._causal_conv(F.pad(xbc.transpose(1, 2), (mix.cfg.ssm_conv - 1, 0))).transpose(1, 2))
    xs, Bm, Cm = xbc.split([E, N, N], -1)
    dt = F.softplus(dt + mix.dt_bias)[0]                    # (T, nh)
    A = -torch.exp(mix.A_log.float())
    la = dt * A                                             # log a_t
    cs = torch.cumsum(la, 0)                                # (T, nh)
    seg = cs[:, None, :] - cs[None, :, :]                   # (Ti, Tj, nh)
    causal = torch.ones(T, T, dtype=torch.bool).tril()
    L = torch.exp(seg.masked_fill(~causal[..., None], float("-inf")))
    CB = (Cm[0] @ Bm[0].T)                                  # (Ti, Tj)
    M = CB[..., None] * L * dt[None, :, :]                  # (Ti, Tj, nh)
    return torch.exp(la), M


def q8(rows):
    """Row-normalised |M| (or attention) quantised to 0..255, as a flat list."""
    out = []
    for r in rows:
        mx = max(r) or 1.0
        out.extend(int(round(255 * v / mx)) for v in r)
    return out


@torch.no_grad()
def main():
    torch.set_num_threads(4)
    run = json.load(open(os.path.join(DATA, "running_sequence.json")))
    ids = torch.tensor([run["ids"]])
    m = load("ba_ssm")
    hs = {}
    for i, b in enumerate(m.blocks):
        b.mix.register_forward_pre_hook(lambda mod, args, i=i: hs.__setitem__(i, args[0]))
    logits, *_ = m(ids)
    res = {"run": "ba_ssm", "tokens": run["pieces"][:NTOK], "ntok": NTOK, "layers": []}
    for i, b in enumerate(m.blocks):
        a, M = ssm_internals(b.mix, hs[i])
        med = a.median(0).values                            # per head
        half = [round(math.log(0.5) / math.log(float(x)), 2) if float(x) < 1 else None for x in med]
        lay = {"layer": i + 1, "half_life": half, "a_median": [round(float(x), 4) for x in med],
               "a_tokens": [[round(float(a[t, h]), 3) for t in range(a.shape[0])] for h in range(a.shape[1])]}
        # two heads per layer for the maps: the longest and the shortest memory
        order = sorted(range(len(half)), key=lambda h: med[h])
        lay["map_heads"] = [order[-1], order[0]]
        lay["maps"] = [q8([[abs(float(M[r, c, h])) for c in range(r + 1)] + [0.0] * (NTOK - r - 1) for r in range(NTOK)])
                       for h in lay["map_heads"]]
        res["layers"].append(lay)
    # dual form against the recurrence (whole model, cached decode one token at a time)
    cache = []; outs = []
    for t in range(ids.shape[1]):
        lg, *_ = m(ids[:, t:t + 1], cache=cache); outs.append(lg)
    res["dual_vs_recurrent_max_abs_logit_diff"] = float((torch.cat(outs, 1) - logits).abs().max())
    # attention model for the same tokens
    a = load("at_mha"); _, _, _, rec = a(ids, record=True)
    res["attn_run"] = "at_mha"; res["attn_maps"] = []
    for li, w in enumerate(rec["attn"]):                    # (1, H, T, T)
        w = w[0, :, :NTOK, :NTOK]
        prev = [float(sum(w[h, t, t - 1] for t in range(1, NTOK)) / (NTOK - 1)) for h in range(w.shape[0])]
        far = [float(sum(w[h, t, :max(0, t - 8)].sum() for t in range(NTOK)) / NTOK) for h in range(w.shape[0])]
        hsel = [max(range(len(far)), key=far.__getitem__), max(range(len(prev)), key=prev.__getitem__)]
        res["attn_maps"].append({"layer": li + 1, "heads": hsel, "maps": [q8(w[h].tolist()) for h in hsel]})
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(res, open(os.path.join(HERE, "out", "ssm_inside.json"), "w"))
    hl = [x for l in res["layers"] for x in l["half_life"] if x]
    print("half-lives min/median/max", min(hl), sorted(hl)[len(hl) // 2], max(hl))
    print("dual vs recurrent", res["dual_vs_recurrent_max_abs_logit_diff"])


if __name__ == "__main__":
    main()
