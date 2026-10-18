"""Three cheap checks on the trained tiny GPTs (CPU, inference only, deterministic). Writes out/probe.json.
1. Permutation: shuffle tokens 0-254 of the running sequence and keep token 255 last. Without positions (NoPE), token 255's
   residual stream after block 1 is unchanged (attention sees a set); from block 2 on it changes, because the causal mask gave
   every earlier token a different prefix. With RoPE it changes from block 1.
2. Where is position? A ridge-regression probe reads the absolute position (0-255) back from the residual stream after each
   block, for each scheme (train on 24 windows, test on 8 others): held-out R^2 per layer.
3. A layout bug: the RoPE model run with interleaved pairs (x0,x1),(x2,x3)... instead of the rotate-half pairs it was trained
   with (x_i, x_{i+16}): held-out loss and a greedy continuation.
Run: LA_SCRATCH=<scratch>/la OMP_NUM_THREADS=4 nice -n 15 <venv>/bin/python -I probe.py"""
import json, os, sys
import numpy as np, torch, torch.nn.functional as F

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "../../../src/data"))
sys.path.insert(0, DATA)
import tiny_gpt  # noqa: E402
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from tokenizers import Tokenizer  # noqa: E402
sys.path.insert(0, os.path.join(HERE, "../train"))
import train_scaled  # noqa: E402
train_scaled.patch()  # sqrt(d_model) embedding scale, used only by models whose name ends in _x16

SCR = os.environ["LA_SCRATCH"]
torch.set_num_threads(4)
tok = Tokenizer.from_file(os.path.join(DATA, "tokenizer.json"))
val = np.memmap(os.path.join(SCR, "data/val.bin"), dtype=np.uint16, mode="r")
run = json.load(open(os.path.join(DATA, "running_sequence.json")))
MODELS = [("learned", "ref_baseline_s1500"), ("sinusoidal", "pe_sinusoidal_x16"), ("alibi", "pe_alibi"), ("nope", "pe_nope"), ("rope", "at_mha")]


def load(name):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"])); m.load_state_dict(ck["model"]); m.scale_emb = name.endswith("_x16"); return m.eval()


def wins(n, seed):
    rng = np.random.default_rng(seed)
    offs = rng.integers(0, len(val) - 258, n)
    return torch.tensor(np.stack([val[o:o + 257].astype(np.int64) for o in offs]))


@torch.inference_mode()
def hidden(m, x):
    *_, rec = m(x, record="hidden")
    return [h.float() for h in rec["hidden"]]


@torch.inference_mode()
def permutation(m):
    x = torch.tensor([run["ids"]])
    g = torch.Generator().manual_seed(0)
    p = torch.randperm(255, generator=g)
    xp = torch.cat([x[:, :255][:, p], x[:, 255:]], 1)
    a, b = hidden(m, x), hidden(m, xp)
    return [round(float((a[l][0, -1] - b[l][0, -1]).norm() / a[l][0, -1].norm()), 7) for l in range(len(a))]


def ridge_r2(Xtr, ytr, Xte, yte, lam=1.0):
    mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-6
    A, B = (Xtr - mu) / sd, (Xte - mu) / sd
    A1, B1 = np.c_[A, np.ones(len(A))], np.c_[B, np.ones(len(B))]
    w = np.linalg.solve(A1.T @ A1 + lam * np.eye(A1.shape[1]), A1.T @ ytr)
    pred = B1 @ w
    return float(1 - ((pred - yte) ** 2).sum() / ((yte - yte.mean()) ** 2).sum())


def probe(m, Wtr, Wte):
    htr, hte = hidden(m, Wtr[:, :256]), hidden(m, Wte[:, :256])
    pos = np.arange(256, dtype=np.float64)
    ytr, yte = np.tile(pos, Wtr.shape[0]), np.tile(pos, Wte.shape[0])
    return [round(ridge_r2(htr[l].reshape(-1, htr[l].shape[-1]).numpy().astype(np.float64), ytr,
                           hte[l].reshape(-1, hte[l].shape[-1]).numpy().astype(np.float64), yte), 4) for l in range(len(htr))]


@torch.inference_mode()
def loss256(m, W):
    lg, *_ = m(W[:, :256])
    return round(float(F.cross_entropy(lg.float().reshape(-1, lg.shape[-1]), W[:, 1:257].reshape(-1))), 4)


def interleaved_forward(self, x, pos):  # the GPT-J / RoFormer layout: pair (x_2i, x_2i+1) instead of (x_i, x_i+d/2)
    ang = pos.float()[:, None] * self.inv_freq[None, :]
    cos, sin = ang.cos().repeat_interleave(2, -1), ang.sin().repeat_interleave(2, -1)
    x1, x2 = x[..., 0::2], x[..., 1::2]
    rot = torch.stack([-x2, x1], -1).flatten(-2)
    return x * cos.to(x.dtype) + rot * sin.to(x.dtype)


def main():
    out = {"permutation_rel_change_token255_by_block": {}, "position_probe_r2_by_block": {}}
    Wtr, Wte = wins(24, 11), wins(8, 12)
    for scheme, name in MODELS:
        if not os.path.exists(os.path.join(SCR, "runs", name, "ckpt.pt")):
            print("missing", name); continue
        m = load(name)
        out["permutation_rel_change_token255_by_block"][scheme] = permutation(m)
        out["position_probe_r2_by_block"][scheme] = probe(m, Wtr, Wte)
        print(scheme, out["permutation_rel_change_token255_by_block"][scheme], out["position_probe_r2_by_block"][scheme], flush=True)
    # layout bug on the RoPE model
    m = load("at_mha")
    W = wins(32, 13)
    p = torch.tensor([run["ids"][:60]])
    good = m.generate(p, 30)[0, 60:].tolist()
    lay = {"right_layout_loss": loss256(m, W), "right_layout_greedy": tok.decode(good)}
    orig = tiny_gpt.Rope.forward
    tiny_gpt.Rope.forward = interleaved_forward
    bad = m.generate(p, 30)[0, 60:].tolist()
    lay.update({"interleaved_loss": loss256(m, W), "interleaved_greedy": tok.decode(bad)})
    tiny_gpt.Rope.forward = orig
    lay["prompt"] = tok.decode(run["ids"][1:60])
    out["layout_bug"] = lay
    print(lay)
    json.dump(out, open(os.path.join(HERE, "out/probe.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
