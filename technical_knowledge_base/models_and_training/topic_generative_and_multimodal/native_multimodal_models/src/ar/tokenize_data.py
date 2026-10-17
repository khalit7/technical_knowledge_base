"""Turn the running example into image tokens with two tiny tokenizers, and count FLOPs (CPU only; prefix nm).

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I tokenize_data.py
Tokenizers reused, not retrained:
  fsq1000  the sibling page Autoencoders and VAEs' FSQ [8,5,5,5] ConvAE (GM_SCRATCH/av/ckpt/q_fsq1000.pt): 64 tokens
           (8x8) from 1,000 codes; its best tiny tokenizer (rFD 29.9 there, 10k vs 10k).
  vq128    the root's Latent lab VQ-VAE with dead-code restarts (GM_SCRATCH/ckpt/lt_vq_restart.pt): 64 tokens from 128.
Writes GM_SCRATCH/nm/tokens_<name>.npz (train/val/test token arrays and labels) and out/tokenize.json here.
"""
import json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
SIB = os.path.join(HERE, "..", "..", "..", "autoencoders_and_vaes", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), os.path.join(ROOT_SRC, "latent"), os.path.join(SIB, "quant"), HERE]
import numpy as np
import torch
from torch.utils.flop_counter import FlopCounterMode
from common import cap_threads, load_split, to_model, from_model, scratch, MACHINE
from objectives import to_image
from nets import TinyUNet
import fid
from quantizers import QAE, FSQ
from vq import VQVAE
from tinyar import TinyTokenTransformer


def load_tokenizer(name):
    if name == "fsq1000":
        m = QAE(FSQ((8, 5, 5, 5)))
        m.load_state_dict(torch.load(scratch("av", "ckpt", "q_fsq1000.pt"), map_location="cpu"))
    else:
        m = VQVAE(K=128, D=8, restart=True)
        m.load_state_dict(torch.load(scratch("ckpt", "lt_vq_restart.pt"), map_location="cpu"), strict=False)
    return m.eval()


@torch.no_grad()
def encode_all(m, x_uint8, bs=1000):
    out = []
    for i in range(0, len(x_uint8), bs):
        out.append(m.tokens(to_model(x_uint8[i:i + bs])).reshape(-1, 64))
    return torch.cat(out).numpy().astype(np.int16)


@torch.no_grad()
def decode_all(m, tok, bs=1000):
    out = []
    for i in range(0, len(tok), bs):
        t = torch.as_tensor(tok[i:i + bs], dtype=torch.long).view(-1, 8, 8)
        out.append(from_model(to_image(m.decode_tokens(t))))
    return np.concatenate(out)


def flops(fn):
    with FlopCounterMode(display=False) as fc, torch.no_grad():
        fn()
    return int(fc.get_total_flops())


def entropy_bits(counts):
    p = counts[counts > 0] / counts.sum()
    return float(-(p * np.log2(p)).sum())


def main():
    cap_threads(4)
    os.makedirs(scratch("nm"), exist_ok=True)
    xtr, ytr = load_split("train"); xv, yv = load_split("val"); xte, yte = load_split("test")
    clf = fid.load_classifier("cpu")
    res = {"machine": MACHINE, "device": "cpu", "torch": torch.__version__, "date": time.strftime("%Y-%m-%d"), "tok": {}}
    floor_d, _ = fid.fd_fmnist(xv[:1000], clf, "cpu", labels=yv[:1000])
    res["floor_fd_val1000"] = round(float(floor_d), 2)
    for name in ["fsq1000", "vq128"]:
        m = load_tokenizer(name)
        t0 = time.time()
        ttr, tv, tte = encode_all(m, xtr), encode_all(m, xv), encode_all(m, xte)
        enc_s = time.time() - t0
        np.savez_compressed(scratch("nm", f"tokens_{name}.npz"), train=ttr, val=tv, test=tte, ytrain=ytr, yval=yv, ytest=yte)
        K = 1000 if name == "fsq1000" else 128
        cnt = np.bincount(ttr.reshape(-1), minlength=K)
        # per-position statistics: how predictable is each of the 64 positions without context?
        pos_ent = [entropy_bits(np.bincount(ttr[:, j], minlength=K)) for j in range(64)]
        rec = decode_all(m, tv[:1000])
        d, acc = fid.fd_fmnist(rec, clf, "cpu", labels=yv[:1000])
        x = to_model(xv[:1000]).numpy()
        r = to_model(rec).numpy()
        mse = ((x - r) ** 2).reshape(1000, -1).mean(1)
        psnr = float(np.mean(10 * np.log10(4.0 / np.maximum(mse, 1e-12))))
        top = np.argsort(-cnt)[:5]
        res["tok"][name] = {
            "K": K, "tokens_per_image": 64, "grid": "8x8", "codes_used_train": int((cnt > 0).sum()),
            "unigram_entropy_bits": round(entropy_bits(cnt), 3), "uniform_bits": round(math.log2(K), 3),
            "bits_per_image_uniform": round(64 * math.log2(K), 1),
            "bits_per_image_unigram": round(64 * entropy_bits(cnt), 1),
            "pos_entropy_bits": [round(v, 3) for v in pos_ent],
            "top_codes": [[int(c), round(float(cnt[c] / cnt.sum()), 4)] for c in top],
            "recon_val1000_fd": round(float(d), 2), "recon_val1000_acc": round(float(acc), 4),
            "recon_val1000_psnr_db_32px": round(psnr, 2), "encode_seconds_70k_cpu": round(enc_s, 1),
            "test16_tokens": tte[:16].tolist(),
        }
        print(name, json.dumps({k: v for k, v in res["tok"][name].items() if k not in ("pos_entropy_bits", "test16_tokens")}), flush=True)
        # FLOPs of the tokenizer's encoder and decoder for one image
        x1 = to_model(xv[:1])
        res["tok"][name]["flops_encode_1"] = flops(lambda: m.tokens(x1))
        res["tok"][name]["flops_decode_1"] = flops(lambda: m.decode_tokens(torch.zeros(1, 8, 8, dtype=torch.long)))
    # FLOPs per forward pass, one image: TinyUNet (the Diffusion and Flow labs' denoiser) and the token transformers
    unet = TinyUNet().eval()
    res["flops_unet_fwd_1"] = flops(lambda: unet(to_model(xv[:1]), torch.zeros(1), torch.zeros(1, dtype=torch.long)))
    res["params_unet"] = sum(p.numel() for p in unet.parameters())
    for kind in ["ar", "mask"]:
        for K in [1000, 128]:
            m = TinyTokenTransformer(K, kind).eval()
            n_in = 64 if kind == "ar" else 64
            tok = torch.zeros(1, 63 if kind == "ar" else 64, dtype=torch.long)
            f = flops(lambda: m(tok, torch.zeros(1, dtype=torch.long)))
            res[f"flops_{kind}{K}_fwd_1"] = f
            res[f"params_{kind}{K}"] = sum(p.numel() for p in m.parameters())
    # analytic check of the transformer count: 2 FLOPs per multiply-add
    d, L, T, K = 192, 6, 64, 1000
    lin = L * (d * 3 * d + d * d + 2 * d * 4 * d) + d * K
    res["flops_ar1000_formula"] = {"linear": 2 * T * lin, "attention_scores_and_values": L * 2 * 2 * T * T * d,
                                   "total": 2 * T * lin + L * 4 * T * T * d}
    json.dump(res, open(os.path.join(HERE, "..", "out", "tokenize.json"), "w"), indent=1)
    print(json.dumps({k: v for k, v in res.items() if k != "tok"}, indent=1))


if __name__ == "__main__":
    main()
