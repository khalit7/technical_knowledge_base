"""Evaluate every tiny tokenizer on CPU: the Latent lab's two VQ-VAEs (vq_plain, vq_restart) and this page's runs.

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I quant/eval_quant.py
Measures on the 10,000 Fashion-MNIST test images:
- reconstruction: Bernoulli NLL (nats per image, the training loss), PSNR on the 28x28 crop (uint8), LPIPS (AlexNet
  v0.1 weights bundled in torchmetrics 1.9.0, grey repeated to RGB, resized to 64) on the first 2,000
- rFD: Frechet distance between the classifier features of the 10,000 reconstructions and of the 10,000 originals
  (the topic's fd_fmnist with its test-set reference): the "reconstruction FID" of tokenizer papers, in the topic's
  domain-specific feature space
- tokens: codes used on the test set, perplexity exp(H(usage)), bits per image = 64 log2 K, the 16 test images' tokens
Writes out/quant.json and GM_SCRATCH/av/quant.npz (reconstructions of the 16 test images, for the page's strips).
"""
import json, math, os, sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
ROOT_SRC = os.path.join(SRC, "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), os.path.join(ROOT_SRC, "latent"), HERE]
from common import cap_threads, load_split, to_model, from_model, test16, scratch
from objectives import to_image
import fid as F
from quantizers import VQ, FSQ, LFQ, QAE

cap_threads(4)
torch.set_grad_enabled(False)

MAKE = {
    "q_vq_ema": lambda: QAE(VQ(128, 8, mode="ema")), "q_vq_l2": lambda: QAE(VQ(128, 8, mode="l2")),
    "q_fsq125": lambda: QAE(FSQ((5, 5, 5))), "q_lfq7": lambda: QAE(LFQ(7)), "q_lfq7_noent": lambda: QAE(LFQ(7, entropy_weight=0)),
    "q_vq1024_plain": lambda: QAE(VQ(1024, 8, mode="plain")), "q_vq1024_restart": lambda: QAE(VQ(1024, 8, mode="restart")),
    "q_fsq1000": lambda: QAE(FSQ((8, 5, 5, 5))), "q_lfq10": lambda: QAE(LFQ(10)),
    "g_lpips": lambda: QAE(VQ(128, 8, mode="restart")), "g_lpips_gan": lambda: QAE(VQ(128, 8, mode="restart")),
}


def load(name):
    if name in ("vq_plain", "vq_restart"):
        from vq import VQVAE
        m = VQVAE(K=128, D=8); m.load_state_dict(torch.load(scratch("ckpt", f"lt_{name}.pt"), map_location="cpu"), strict=False)
        meta = json.load(open(os.path.join(ROOT_SRC, "latent", "runs", name + ".json")))
        enc = lambda X: m.quantize(m.ae.encode(X))
        dec = lambda zq: m.ae.decode(zq)
        return m.eval(), meta, enc, dec, 128
    m = MAKE[name]()
    m.load_state_dict(torch.load(scratch("av", "ckpt", f"{name}.pt"), map_location="cpu"), strict=False)
    m.eval()
    meta = json.load(open(os.path.join(SRC, "runs", name + ".json")))
    def enc(X):
        zq, idx, _, _ = m.q(m.ae.encode(X)); return zq, idx
    return m, meta, enc, m.ae.decode, m.q.K


def psnr_u8(a, b):
    mse = ((a.astype(np.float64) - b.astype(np.float64)) ** 2).reshape(len(a), -1).mean(1)
    return 10 * np.log10(255 ** 2 / np.maximum(mse, 1e-10))


def main(names):
    from torchmetrics.functional.image.lpips import _NoTrainLpips
    lp = _NoTrainLpips(net="alex", resize=64).eval()
    xte, yte = load_split("test"); Xte = to_model(xte)
    x16, y16, idx16 = test16()
    clf = F.load_classifier("cpu")
    path = os.path.join(SRC, "out", "quant.json")
    out = json.load(open(path)) if os.path.exists(path) else {"runs": {}}
    arrs = dict(np.load(scratch("av", "quant.npz"))) if os.path.exists(scratch("av", "quant.npz")) else {}
    fd_real, _ = F.fd_fmnist(load_split("val")[0][:10000], clf, "cpu")
    out["floor_real_val_5000"] = round(fd_real, 2)
    for name in names:
        m, meta, enc, dec, K = load(name)
        rec, nll, toks, lps = [], [], [], []
        for i in range(0, len(Xte), 1000):
            X = Xte[i:i + 1000]
            zq, idx = enc(X)
            lg = dec(zq)
            rec.append(from_model(to_image(lg))); toks.append(idx.reshape(len(X), -1))
            nll.append(torch.nn.functional.binary_cross_entropy_with_logits(lg, (X + 1) / 2, reduction="none").flatten(1).sum(1))
            if i < 2000:
                lps.append(lp(to_image(lg).repeat(1, 3, 1, 1), X.repeat(1, 3, 1, 1)).flatten())
        rec = np.concatenate(rec); nll = torch.cat(nll); toks = torch.cat(toks)
        ps = psnr_u8(xte, rec)
        cnt = torch.bincount(toks.flatten(), minlength=K).double(); pr = cnt / cnt.sum()
        ent = float(-(pr[pr > 0] * pr[pr > 0].log()).sum())
        rfd, _ = F.fd_fmnist(rec, clf, "cpu")
        r = {"K": K, "params": meta["params"], "train_seconds": meta["seconds"], "steps": meta["steps"],
             "test_nll_nats": round(float(nll.mean()), 2), "test_psnr_db": round(float(ps.mean()), 2),
             "lpips_2000": round(float(torch.cat(lps).mean()), 4), "rfd": round(rfd, 2),
             "codes_used_test": int((cnt > 0).sum()), "usage_share": round(float((cnt > 0).sum()) / K, 3),
             "perplexity": round(math.exp(ent), 1), "bits_per_image": round(64 * math.log2(K), 1),
             "alive_log": meta.get("alive_log"), "tokens16": toks[torch.from_numpy(idx16)].tolist(),
             "usage_sorted": sorted([int(v) for v in cnt], reverse=True)}
        arrs[name + "_rec16"] = rec[idx16]
        out["runs"][name] = r
        print(name, {k: v for k, v in r.items() if k not in ("tokens16", "alive_log", "usage_sorted")}, flush=True)
        os.makedirs(os.path.dirname(path), exist_ok=True)
        json.dump(out, open(path, "w"), indent=1)
        np.savez_compressed(scratch("av", "quant.npz"), **arrs)


if __name__ == "__main__":
    main(sys.argv[1].split(",") if len(sys.argv) > 1 else ["vq_plain", "vq_restart"] + list(MAKE))
