"""Why sharing or compressing K/V costs little: how many numbers per token a trained MHA cache really needs.

On the Attention lab's trained at_mha checkpoint (tiny GPT, RoPE, 8 heads of 32, 6 layers), CPU only:
 1. reproduce the lab's held-out loss (20 fixed windows) to prove the checkpoint is the same model;
 2. the spectrum of the cache: PCA of the pre-RoPE keys, the values, and keys and values together, per layer, on
    8,192 held-out tokens: share of variance in the top r directions;
 3. conversions WITHOUT any training: mean-pool KV heads into groups (the GQA paper's MHA -> GQA conversion, before
    its uptraining), and project keys and values jointly onto their top r principal directions (a data-aware low-rank
    cache, what an MHA -> MLA conversion starts from); held-out loss of each.
Writes ../out/kv_rank.json.  Run: LA_SCRATCH=<scratch>/la python kv_rank.py
"""
import json, os, sys, time
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data"))
sys.path.insert(0, DATA)
from tiny_gpt import GPT, GPTConfig  # noqa: E402
from train import held_out_loss, Batches, SCR  # noqa: E402

torch.set_num_threads(4)
torch.manual_seed(0)


def load(name):
    ck = torch.load(os.path.join(SCR, "runs", name, "ckpt.pt"), map_location="cpu")
    m = GPT(GPTConfig(**ck["config"]))
    m.load_state_dict(ck["model"])
    return m.eval(), ck


@torch.no_grad()
def attn_inputs(m, x):
    """normalised input of every attention layer, (L, N, D)"""
    _, _, _, rec = m(x, record="hidden")
    return [m.blocks[i].n1(rec["hidden"][i]).reshape(-1, m.cfg.d_model) for i in range(m.cfg.n_layer)]


def share(ev, r):
    return float(ev[:r].sum() / ev.sum())


@torch.no_grad()
def main():
    t0 = time.time()
    m, ck = load("at_mha")
    cfg = m.cfg
    out = {"run": "at_mha", "device": "Apple M1 Pro, CPU, 4 threads", "torch": torch.__version__,
           "held_out_20win": round(held_out_loss(m, "cpu", cfg.ctx), 4), "lab_held_out_20win": 2.1374}
    b = Batches("val", 32, cfg.ctx, 4321)   # 32 x 256 = 8,192 held-out tokens, a different seed from the eval windows
    x, _ = b.next("cpu")
    hs = attn_inputs(m, x)
    rs = [8, 16, 32, 48, 64, 80, 96, 128, 192, 256]
    spec, pcs = [], []
    for i, h in enumerate(hs):
        a = m.blocks[i].mix
        k, v = a.k(h), a.v(h)                     # (N, 256) each, keys before RoPE
        kv = torch.cat([k, v], 1)                 # (N, 512)
        row = {"layer": i + 1}
        for nm, t in (("k", k), ("v", v), ("kv", kv)):
            tc = t - t.mean(0)
            ev = torch.linalg.eigvalsh(tc.T @ tc / len(tc)).flip(0).clamp(min=0)
            row[nm] = {str(r): round(share(ev, r), 4) for r in rs if r <= t.shape[1]}
        spec.append(row)
        cov = kv.T @ kv / len(kv)                 # uncentred: the projection must keep the mean too
        evals, evecs = torch.linalg.eigh(cov)
        pcs.append(evecs.flip(1))                 # (512, 512), columns by decreasing variance
    out["spectrum"] = spec

    def eval_with(fn):
        m2, _ = load("at_mha")
        fn(m2)
        return round(held_out_loss(m2, "cpu", cfg.ctx), 4)

    conv = []
    H, hd = cfg.n_head, cfg.head_dim
    for g in (4, 2, 1):                           # KV heads after mean pooling
        def pool(m2, g=g):
            for blk in m2.blocks:
                a = blk.mix
                for lin in (a.k, a.v):
                    w = lin.weight.view(H, hd, -1)
                    w2 = w.view(g, H // g, hd, -1).mean(1, keepdim=True).expand(g, H // g, hd, w.shape[-1])
                    lin.weight.copy_(w2.reshape(H * hd, -1))
        conv.append({"method": "mean-pool heads", "kv_heads": g, "numbers_per_token_layer": 2 * g * hd,
                     "held_out_20win": eval_with(pool)})
    for r in (32, 64, 80, 128, 192, 256):
        def proj(m2, r=r):
            for i, blk in enumerate(m2.blocks):
                a = blk.mix
                P = pcs[i][:, :r]                 # (512, r)
                W = torch.cat([a.k.weight, a.v.weight], 0)   # (512, D)
                W2 = P @ (P.T @ W)                # keys and values live in an r-dim subspace: cache r numbers
                a.k.weight.copy_(W2[:cfg.d_model]); a.v.weight.copy_(W2[cfg.d_model:])
        conv.append({"method": "joint PCA of keys and values", "rank": r, "numbers_per_token_layer": r,
                     "held_out_20win": eval_with(proj)})
    out["conversions"] = conv
    out["trained_reference_100win"] = "see the Attention lab runs_summary (val_loss_20win: MHA 2.1374, GQA-4 2.1612, GQA-2 2.1604, MQA 2.1536, MLA 2.231)"
    out["seconds"] = round(time.time() - t0, 1)
    os.makedirs(os.path.join(HERE, "..", "out"), exist_ok=True)
    json.dump(out, open(os.path.join(HERE, "..", "out", "kv_rank.json"), "w"), indent=1)
    print(json.dumps({k: out[k] for k in ("held_out_20win", "lab_held_out_20win")}))
    for row in spec:
        print(row["layer"], "k", row["k"]["32"], row["k"]["64"], "v", row["v"]["64"], "kv64", row["kv"]["64"], "kv128", row["kv"]["128"])
    for c in conv:
        print(c)


if __name__ == "__main__":
    main()
