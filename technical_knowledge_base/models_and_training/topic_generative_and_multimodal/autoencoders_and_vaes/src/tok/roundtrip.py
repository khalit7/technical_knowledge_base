"""Tokenizer comparator: the 16 colour test images (512x512) through one pretrained autoencoder per process (MPS).

  GM_SCRATCH=... GM_LOCK=... nice -n 15 $GM_SCRATCH/venv/bin/python -I tok/roundtrip.py <key> [dtype]
Encode (posterior mean, or nearest code for VQ), put the latent in the units the generator sees (the pipeline's own
scaling / shift / per-channel or batch-norm statistics), undo it, decode. Records latent shape and statistics, codes
used (VQ), timing and peak memory, and the reconstructions (uint8) to GM_SCRATCH/av/tok/<key>_<dtype>.npz. Metrics
(PSNR, SSIM, LPIPS) are computed afterwards on CPU by tok/metrics.py. Writes out/tok/<key>_<dtype>.json.
Hub revisions are pinned below (checked 2026-10-17).
"""
import json, os, sys, time

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(SRC, "..", "..", "src", "data"))
from common import cap_threads, scratch, PeakMem, MACHINE, sync, empty_cache
import pretrained

MODELS = {   # key: (class, repo, revision, subfolder, licence)
    "sd15":   ("AutoencoderKL", "stable-diffusion-v1-5/stable-diffusion-v1-5", "451f4fe16113bff5a5d2269ed5ad43b0592e9a14", "vae", "CreativeML OpenRAIL-M"),
    "sdxl":   ("AutoencoderKL", "stabilityai/sdxl-vae", "6f5909a7e596", None, "MIT"),
    "sdxlfix": ("AutoencoderKL", "madebyollin/sdxl-vae-fp16-fix", "207b116dae70", None, "MIT"),
    "flux1":  ("AutoencoderKL", "Tongyi-MAI/Z-Image-Turbo", "f332072aa78b", "vae", "Apache 2.0"),
    "flux2":  ("AutoencoderKLFlux2", "black-forest-labs/FLUX.2-klein-4B", "e7b7dc27f91d", "vae", "Apache 2.0"),
    "qwen":   ("AutoencoderKLQwenImage", "Qwen/Qwen-Image", "75e0b4be04f6", "vae", "Apache 2.0"),
    "dcae":   ("AutoencoderDC", "mit-han-lab/dc-ae-f32c32-sana-1.1-diffusers", "6f7b3f3b289a", None, "MIT"),
    "amused": ("VQModel", "amused/amused-512", "6f3f309ba188", "vqvae", "OpenRAIL++"),
    "movq":   ("VQModel", "kandinsky-community/kandinsky-2-2-decoder", "9ae140d347fe", "movq", "Apache 2.0"),
}


def full_rev(repo, rev):
    if len(rev) == 40:
        return rev
    revs = json.load(open(scratch("av", "revisions.json")))
    assert revs[repo].startswith(rev), (repo, rev)
    return revs[repo]


def main(key, dtype_name="fp32"):
    cap_threads(4)
    dt = {"fp32": torch.float32, "fp16": torch.float16, "bf16": torch.bfloat16}[dtype_name]
    cls_name, repo, rev, sub, lic = MODELS[key]
    import diffusers
    cls = getattr(diffusers, cls_name)
    kw = {"subfolder": sub} if sub else {}
    if key == "amused":
        kw["variant"] = "fp16"
    dev = torch.device(os.environ.get("AV_DEV", "mps"))
    with PeakMem() as pm:
        t0 = time.time()
        m = cls.from_pretrained(repo, revision=full_rev(repo, rev), dtype=dt, **kw).to(dev).eval()
        load_s = time.time() - t0
        cfg = dict(m.config)
        n_par = sum(p.numel() for p in m.parameters())
        imgs = pretrained.test_images(512)[:int(os.environ.get("AV_N", 16))]
        recs, stats, times, toks, noshift = [], [], [], [], []
        for i, (k, im, it) in enumerate(imgs):
            x = torch.from_numpy(np.asarray(im)).permute(2, 0, 1)[None].float().div(127.5).sub(1).to(dev, dt)
            with torch.no_grad():
                sync(dev); t = time.time()
                if cls_name == "VQModel":
                    h = m.encode(x).latents
                    zq, _, (_, _, idx) = m.quantize(h)
                    raw = h
                    lat = zq                                            # what the decoder gets (codebook vectors)
                    toks.append(idx.reshape(-1).cpu().tolist())
                    y = m.decode(h).sample                              # decode() quantizes again: same zq
                elif cls_name == "AutoencoderKLQwenImage":
                    post = m.encode(x[:, :, None]).latent_dist          # (B, C, T=1, H, W)
                    raw = post.mode()
                    mean = torch.tensor(cfg["latents_mean"], device=dev, dtype=dt).view(1, -1, 1, 1, 1)
                    std = torch.tensor(cfg["latents_std"], device=dev, dtype=dt).view(1, -1, 1, 1, 1)
                    lat = (raw - mean) / std                            # pipeline_qwenimage.py: (z - mean) / std
                    y = m.decode(lat * std + mean).sample[:, :, 0]
                    raw, lat = raw[:, :, 0], lat[:, :, 0]
                elif cls_name == "AutoencoderKLFlux2":
                    raw = m.encode(x).latent_dist.mode()                # (B, 32, 64, 64)
                    B, C, H, W = raw.shape                              # pipeline_flux2.py _patchify_latents
                    p = raw.view(B, C, H // 2, 2, W // 2, 2).permute(0, 1, 3, 5, 2, 4).reshape(B, C * 4, H // 2, W // 2)
                    mu = m.bn.running_mean.view(1, -1, 1, 1).to(dt)
                    sd = torch.sqrt(m.bn.running_var.view(1, -1, 1, 1) + cfg["batch_norm_eps"]).to(dt)
                    lat = (p - mu) / sd                                 # batch-norm statistics instead of one factor
                    q = (lat * sd + mu).reshape(B, C, 2, 2, H // 2, W // 2).permute(0, 1, 4, 2, 5, 3).reshape(B, C, H, W)
                    y = m.decode(q).sample
                elif cls_name == "AutoencoderDC":
                    raw = m.encode(x).latent
                    lat = raw * cfg["scaling_factor"]
                    y = m.decode(lat / cfg["scaling_factor"]).sample
                else:
                    raw = m.encode(x).latent_dist.mode()
                    sf = cfg.get("scaling_factor") or 0.18215
                    sh = cfg.get("shift_factor") or 0.0
                    lat = (raw - sh) * sf                               # what the denoiser sees
                    y = m.decode(lat / sf + sh).sample
                    if sh:                                              # a common mistake: forgetting the shift on decode
                        ns = m.decode(lat / sf).sample.float().clamp(-1, 1).add(1).mul(127.5).round().byte()[0]
                        noshift.append(ns.permute(1, 2, 0).cpu().numpy())
                sync(dev); times.append(time.time() - t)
            yy = y.float().clamp(-1, 1).add(1).mul(127.5).round().byte()[0].permute(1, 2, 0).cpu().numpy()
            nan = bool(torch.isnan(y.float()).any())
            recs.append(yy)
            r, l = raw.float().cpu(), lat.float().cpu()
            stats.append({"key": k, "nan": nan, "raw_std": round(float(r.std()), 4), "raw_mean": round(float(r.mean()), 4),
                          "lat_std": round(float(l.std()), 4), "lat_mean": round(float(l.mean()), 4),
                          "lat_ch_std": [round(float(v), 3) for v in l[0].flatten(1).std(1)]})
            print(key, k, "nan" if nan else "", round(times[-1], 3), stats[-1]["raw_std"], stats[-1]["lat_std"], flush=True)
    out = {"key": key, "dtype": dtype_name, "class": cls_name, "repo": repo, "revision": full_rev(repo, rev), "licence": lic,
           "params": n_par, "latent_shape": list(lat.shape[1:]), "raw_shape": list(raw.shape[1:]),
           "numbers_per_image": int(np.prod(lat.shape[1:])) if cls_name != "VQModel" else int(np.prod(lat.shape[2:])),
           "config": {k: v for k, v in cfg.items() if k in ("latent_channels", "scaling_factor", "shift_factor", "z_dim",
                      "num_vq_embeddings", "vq_embed_dim", "block_out_channels", "encoder_block_out_channels",
                      "patch_size", "batch_norm_eps", "force_upcast", "norm_type", "latents_mean", "latents_std")},
           "per_image": stats, "roundtrip_s_median": round(float(np.median(times[1:])), 3), "load_s": round(load_s, 1),
           "peak_mps_mib": pm.peak_mb, "machine": MACHINE, "date": time.strftime("%Y-%m-%d"),
           "diffusers": diffusers.__version__, "torch": torch.__version__}
    if toks:
        out["K"] = cfg["num_vq_embeddings"]; out["tokens_per_image"] = len(toks[0])
        out["codes_used_16"] = len(set(sum(toks, [])))
        ks = [s["key"] for s in stats]
        if "s03_text" in ks:
            out["tokens_s03"] = toks[ks.index("s03_text")]
    os.makedirs(os.path.join(SRC, "out", "tok"), exist_ok=True)
    json.dump(out, open(os.path.join(SRC, "out", "tok", f"{key}_{dtype_name}.json"), "w"), indent=1)
    os.makedirs(scratch("av", "tok"), exist_ok=True)
    extra = {"rec_noshift": np.stack(noshift)} if noshift else {}
    np.savez_compressed(scratch("av", "tok", f"{key}_{dtype_name}.npz"), rec=np.stack(recs), keys=np.array([s["key"] for s in stats]), **extra)
    print("done", key, dtype_name, out["latent_shape"], out["roundtrip_s_median"], out["peak_mps_mib"], flush=True)
    del m; empty_cache()


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2] if len(sys.argv) > 2 else "fp32")
