"""Sample the tiny token transformers every way the page shows, and score them (MPS, under the bench lock; prefix nm).

  GM_SCRATCH=... PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 nice -n 15 $GM_SCRATCH/venv/bin/python -I sample_ar.py
Scores exactly as the Diffusion and Flow labs: fid.fd_fmnist on N = 1,000 samples (100 per class) against the 10,000
test images in the shared classifier's 128-d feature space, label accuracy of the classifier on the asked-for class,
diversity = mean pairwise same-class feature distance (the Diffusion lab's definition). Floor: 1,000 real validation
images, 18.93. Every setting uses the same fixed uniforms per (sample, position) (inverse-CDF draws), so a setting
change on the page is a before/after on the same random draw.
Writes out/samples.json (metrics, timings) and GM_SCRATCH/nm/samples.npz (uint8 images for the page).
"""
import json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.join(HERE, "..", "..", "..", "src")
sys.path[:0] = [os.path.join(ROOT_SRC, "data"), HERE]
import numpy as np
import torch
from common import cap_threads, device, scratch, sync, from_model, PeakMem, MACHINE, empty_cache, touch_bench, load_split
from objectives import to_image
import fid
from tinyar import TinyTokenTransformer, sample_ar, sample_mask
from tokenize_data import load_tokenizer

cap_threads(4)
SMOKE = bool(os.environ.get("NM_SMOKE"))              # CPU dry run with random weights: catches bugs before the GPU run
dev = device("cpu" if SMOKE else "mps")
clf = fid.load_classifier(dev)
N = 20 if SMOKE else 1000
Y = torch.arange(10).repeat_interleave(N // 10).to(dev)
U = torch.rand(N, 64, generator=torch.Generator().manual_seed(1234))
STRIP = torch.arange(10) * (N // 10)            # first sample of each class: the page's gallery row
out = {"machine": MACHINE, "device": str(dev), "torch": torch.__version__, "date": time.strftime("%Y-%m-%d"), "N": N,
       "floor_fd": 18.93}
imgs = {}
_last_touch = [time.time()]


def touch():
    if time.time() - _last_touch[0] > 300:
        touch_bench("nm"); _last_touch[0] = time.time()


def load(name):
    ck = torch.load(scratch("nm", "smoke_ckpt" if SMOKE else "ckpt", f"{name}.pt"), map_location="cpu")
    c = ck["config"]
    m = TinyTokenTransformer(c["K"], c["kind"]); m.load_state_dict(ck["ema"]); return m.to(dev).eval(), c


def diversity(f, y):
    f = torch.as_tensor(np.asarray(f)); yy = torch.as_tensor(np.asarray(y))
    return round(float(np.mean([torch.pdist(f[yy == c]).mean().item() for c in range(10)])), 3)


def score(img_u8):
    f, lg = fid.classifier_features(img_u8, clf, dev)
    d, acc = fid.fd_fmnist(img_u8, clf, dev, labels=Y.cpu().numpy())
    return round(float(d), 2), round(float(acc), 4), diversity(f, Y.cpu().numpy())


CHUNK = 250     # samples per call: with guidance the batch doubles; at 1,000 (2,000 with guidance) the KV cache
                # concatenations ran past the 0.45 memory cap (MPS out of memory, 5.08 GiB allocated)


def chunked(fn):
    outs = []
    for i in range(0, N, CHUNK):
        outs.append(fn(slice(i, i + CHUNK)))
        empty_cache()
    return torch.cat(outs)


def decode(tokm, t):
    with torch.no_grad():
        return from_model(to_image(tokm.decode_tokens(t.view(-1, 8, 8).cpu())))


def run_ar(m, tokm, key, T, k, s):
    if key in imgs:
        return
    sync(dev); t0 = time.time()
    tok = chunked(lambda sl: sample_ar(m, Y[sl], T, k, s, u=U[sl]))
    sync(dev); sec = time.time() - t0
    im = decode(tokm, tok)
    d, acc, div = score(im)
    uniq = len({tuple(r) for r in tok[STRIP].cpu().tolist()})
    rec = {"T": T, "k": k, "s": s, "fd": d, "acc": acc, "div": div, "sec_batch1000": round(sec, 2), "chunk": CHUNK,
           "distinct_per_class": round(float(np.mean([len({tuple(r) for r in tok[Y == c].cpu().tolist()}) for c in range(10)])), 1)}
    out.setdefault(key.split("|")[0], []).append(rec)
    imgs[key] = im[STRIP.numpy()]
    print(key, rec, flush=True); touch()


def main():
    tokf = load_tokenizer("fsq1000")
    # ---------------------------------------------------------------- AR over FSQ-1000 tokens
    m, cfgc = load("ar_fsq1000")
    with PeakMem() as pm:
        for T in [0, 0.5, 0.7, 0.85, 1.0, 1.15, 1.3, 1.5]:
            run_ar(m, tokf, f"ar_temp|{T}|0|1", T, 0, 1.0)
        for k in [1, 2, 5, 10, 50, 200]:
            run_ar(m, tokf, f"ar_topk|1.0|{k}|1", 1.0, k, 1.0)
        for s in [0, 1.5, 2, 3, 4, 6]:
            run_ar(m, tokf, f"ar_cfg|1.0|0|{s}", 1.0, 0, float(s))
        for T in [0.7, 0.85, 1.0, 1.15, 1.3]:
            for k in [10, 50, 0]:
                for s in [1, 2, 3]:
                    run_ar(m, tokf, f"ar_grid|{T}|{k}|{s}", T, k, float(s))
        # timing at batch 1 (one image, 64 sequential calls), with and without the KV cache; and the recorded strip
        y1 = torch.tensor([2], device=dev)
        tm = {}
        for cache in [True, False]:
            ts = []
            for rep in range(4):
                sync(dev); t0 = time.time(); sample_ar(m, y1, 1.0, 0, 1.0, u=U[:1], use_cache=cache); sync(dev); ts.append(time.time() - t0)
            tm["cache" if cache else "nocache"] = round(float(np.median(ts[1:])), 4)
        out["ar_batch1_seconds"] = tm
        ys = torch.arange(10, device=dev)
        rec_out = {}
        for s in [1.0, 3.0]:
            tok, pr, en, tops = sample_ar(m, ys, 1.0, 0, s, u=U[STRIP], record=True)
            # partial decodes: tokens so far, the rest filled with the most common training token (background)
            frames = []
            bg = 472
            for i in range(65):
                part = tok.clone(); part[:, i:] = bg
                frames.append(decode(tokf, part))
            imgs[f"ar_frames|{s}"] = np.stack(frames, 1)          # (10, 65, 28, 28)
            rec_out[str(s)] = {"tokens": tok.cpu().tolist(), "p_chosen": pr.cpu().numpy().round(4).tolist(),
                               "entropy_bits": en.cpu().numpy().round(3).tolist(),
                               "top5": tops.cpu().numpy().round(4).tolist()}
        out["ar_record"] = rec_out
    out["ar_peak_mps_mib"] = pm.peak_mb
    del m; empty_cache()
    # ---------------------------------------------------------------- masked (MaskGIT-style) over the same tokens
    m, _ = load("mask_fsq1000")
    out["mask"] = []
    for s in [1.0, 2.0, 3.0]:
        for steps in [1, 2, 4, 8, 16, 32, 64]:
            sync(dev); t0 = time.time()
            g = torch.Generator().manual_seed(1234)
            tok = chunked(lambda sl: sample_mask(m, Y[sl], steps=steps, temperature=1.0, cfg=s, gen=g))
            sync(dev); sec = time.time() - t0
            im = decode(tokf, tok); d, acc, div = score(im)
            rec = {"steps": steps, "s": s, "fd": d, "acc": acc, "div": div, "sec_batch1000": round(sec, 2)}
            out["mask"].append(rec); imgs[f"mask|{steps}|{s}"] = im[STRIP.numpy()]
            print("mask", rec, flush=True); touch()
    tok, frames = sample_mask(m, torch.arange(10, device=dev), steps=8, cfg=1.0, gen=torch.Generator().manual_seed(7), record=True)
    fr = []
    for f in frames:
        part = f.clone(); part[part == m.mask_id] = 472
        fr.append(decode(tokf, part))
    imgs["mask_frames|8"] = np.stack(fr, 1)
    out["mask_record"] = {"tokens_per_round": [f.cpu().tolist() for f in frames], "mask_id": m.mask_id}
    del m; empty_cache()
    # ---------------------------------------------------------------- AR over the Latent lab's VQ-128 tokens
    tokv = load_tokenizer("vq128")
    m, _ = load("ar_vq128")
    for s in [1.0, 2.0, 3.0]:
        run_ar(m, tokv, f"vq_cfg|1.0|0|{s}", 1.0, 0, s)
    del m; empty_cache()
    if SMOKE:
        print("smoke ok", len(imgs)); return
    json.dump(out, open(os.path.join(HERE, "..", "out", "samples.json"), "w"), indent=1)
    np.savez_compressed(scratch("nm", "samples.npz"), **{k.replace("|", "__"): v for k, v in imgs.items()})
    print("saved", len(imgs), "image sets", flush=True)


if __name__ == "__main__":
    main()
