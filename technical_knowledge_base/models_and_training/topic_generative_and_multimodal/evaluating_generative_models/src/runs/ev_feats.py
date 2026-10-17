"""Feature vectors of every set, for every metric on the page. One feature extractor per process (MPS, bench lock).

    python -I ev_feats.py inception | dino | clipB | clipL
inception : torch-fidelity 0.4.0 FeatureExtractorInceptionV3('inception-v3-compat'), 2048-d pool features, through the
            topic's own fid.inception_features (uint8 in, the extractor's TensorFlow-1-style bilinear resize to 299).
            Used for FID, KID and precision/recall.
dino      : facebook/dinov2-base (the Vision encoders page's pin), its own processor (shortest edge 256 bicubic, centre
            crop 224, ImageNet mean/std), the final [CLS] token after the last LayerNorm (pooler_output), NOT normalised.
            Used for FD-DINOv2. Check: normalised, the test-set vectors must equal the Vision encoders page's stored
            cls_test (fmnist_dino.npz, float16).
  clipB     : openai/clip-vit-base-patch32 (the topic pin) in float16, its own processor (224), image_embeds (512-d). Used for
            the CMMD sweep (a departure: the CMMD paper uses ViT-L/14 at 336 px).
  clipL     : openai/clip-vit-large-patch14-336 in float16 (CMMD's own model), image_embeds (768-d), on 1,000 images per set
            only (about 10 images/s here), to check that B/32 ranks the sets as L/14-336 does.
Grey 28x28 images become RGB by repeating the channel (inception) or PIL convert("RGB") (dino, clipL): the same thing.

Sets: the reference (the 10,000 test images) and the eight sets of ev_gen.py, plus pitfall variants (Inception only,
except real_jpeg75 for every extractor):
  real_jpeg90/75/50 : the real set saved as JPEG at that quality (PIL, grey) and read back
  real_bic299 / real_near299 : the real set pre-resized to 299x299 with PIL bicubic (antialiased) / nearest, before the
                    extractor (whose own resize is then a no-op); test_bic299: the reference resized the same way
  test_jpeg75       : the reference saved as JPEG 75
  ddpm_jpeg75, flow_jpeg75 : model samples saved as JPEG 75
Writes GM_SCRATCH/ev/feat_<model>.npz (float32) and out/feats_<model>.json (timings, checks, peak memory).
"""
import io, os, sys, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ev_env import ev_scratch, dump
import numpy as np
import torch
from PIL import Image
from common import cap_threads, device, scratch, load_split, MACHINE, touch_bench, PeakMem, sync

cap_threads(4)
torch.set_grad_enabled(False)
which = sys.argv[1]
SMOKE = os.environ.get("EV_SMOKE") == "1"          # CPU smoke test on 100 images per set, nothing kept
dev = device("cpu" if SMOKE else "mps")
DINO = ("facebook/dinov2-base", "f9e44c814b77203eaa57a6bdbbd535f21ede1415")
CLIPL = ("openai/clip-vit-large-patch14-336", "ce19dc912ca5cd21c8a653c79e251e808ccabcd1")


def jpeg(a, q):
    out = np.empty_like(a)
    for i, im in enumerate(a):
        b = io.BytesIO(); Image.fromarray(im, "L").save(b, "JPEG", quality=q); b.seek(0)
        out[i] = np.asarray(Image.open(b).convert("L"))
    return out


def resize_rgb(a, size, how):
    f = {"bic": Image.BICUBIC, "near": Image.NEAREST}[how]
    return np.stack([np.asarray(Image.fromarray(im, "L").convert("RGB").resize((size, size), f)) for im in a])


sets = dict(np.load(ev_scratch("sets_smoke.npz" if SMOKE else "sets.npz")))
xte, _ = load_split("test")
if SMOKE:
    sets = {k: v[:100] for k, v in sets.items()}; xte = xte[:100]
todo = [("test", xte, None)] + [(k, v, None) for k, v in sets.items()]
todo.append(("real_jpeg75", sets["real"], ("jpeg", 75)))
if which == "clipL":   # ViT-L/14 at 336 px runs at about 10 images/s here (measured: 10,000 test images in 1,022 s), so only
    # 1,000 images per set (the same random, class-balanced-in-expectation indices for every set, seed 0)
    SUB = np.random.default_rng(0).choice(10000, 1000, replace=False)
    todo = [(k, a[SUB], tf) for k, a, tf in todo if k in ("test", "real", "ddpm", "ddim", "flow", "flow_g4", "vae", "half")]
if which == "inception":
    todo += [("real_jpeg90", sets["real"], ("jpeg", 90)), ("real_jpeg50", sets["real"], ("jpeg", 50)),
             ("test_jpeg75", xte, ("jpeg", 75)), ("ddpm_jpeg75", sets["ddpm"], ("jpeg", 75)),
             ("flow_jpeg75", sets["flow"], ("jpeg", 75)),
             ("real_bic299", sets["real"], ("bic", 299)), ("real_near299", sets["real"], ("near", 299)),
             ("test_bic299", xte, ("bic", 299))]

res = {"subset_seed0_n": 1000 if which == "clipL" else None, "which": which, "machine": MACHINE, "device": str(dev), "date": time.strftime("%Y-%m-%d"), "sets": {}}
t0 = time.time()
if which == "inception":
    import fid
    net = fid.inception(dev)
    res["extractor"] = "torch-fidelity 0.4.0 FeatureExtractorInceptionV3('inception-v3-compat'), 2048"

    def feats(a, tf):
        out = []
        for i in range(0, len(a), 500):
            b = a[i:i + 500]
            if tf and tf[0] == "jpeg":
                b = jpeg(b, tf[1])
            if tf and tf[0] in ("bic", "near"):
                b = resize_rgb(b, tf[1], tf[0])                  # uint8 [n,299,299,3]
            out.append(fid.inception_features(b, dev, bs=25).astype(np.float32))   # bs 25: stays well under the 0.45 watermark cap
        return np.concatenate(out)
else:
    from transformers import AutoImageProcessor
    if which == "dino":
        from transformers import AutoModel
        proc = AutoImageProcessor.from_pretrained(DINO[0], revision=DINO[1])
        net = AutoModel.from_pretrained(DINO[0], revision=DINO[1], dtype=torch.float32).to(dev).eval()
        res["extractor"] = f"{DINO[0]}@{DINO[1][:12]} pooler_output (final [CLS] after LayerNorm), float32"
        emb = lambda pv: net(pixel_values=pv).pooler_output
        dt = torch.float32
    else:
        from transformers import CLIPVisionModelWithProjection
        import pretrained
        R = CLIPL if which == "clipL" else pretrained.CLIP
        proc = AutoImageProcessor.from_pretrained(R[0], revision=R[1])
        net = CLIPVisionModelWithProjection.from_pretrained(R[0], revision=R[1], dtype=torch.float16).to(dev).eval()
        res["extractor"] = f"{R[0]}@{R[1][:12]} image_embeds (projection), float16"
        emb = lambda pv: net(pixel_values=pv).image_embeds
        dt = torch.float16
    res["processor"] = {k: v for k, v in proc.to_dict().items() if k in ("size", "crop_size", "resample", "image_mean", "image_std")}
    res["params"] = sum(p.numel() for p in net.parameters())

    def feats(a, tf):
        if tf:
            a = jpeg(a, tf[1])
        out = []
        for i in range(0, len(a), 100):
            pv = proc(images=[Image.fromarray(im).convert("RGB") for im in a[i:i + 100]], return_tensors="pt")["pixel_values"]
            out.append(emb(pv.to(dev, dt)).float().cpu().numpy())
        return np.concatenate(out)

arr = {}
with PeakMem() as pm:
    for k, a, tf in todo:
        t = time.time()
        arr[k] = feats(a, tf); sync(dev); touch_bench("ev")
        res["sets"][k] = {"n": len(a), "seconds": round(time.time() - t, 1), "transform": tf}
        print(f"{which} {k}: {arr[k].shape} {time.time() - t:.0f} s (total {time.time() - t0:.0f} s)", flush=True)
res["peak_mps_mb"] = round(pm.peak_mb, 1); res["rss_mb"] = round(pm.rss_mb, 1)
res["images_per_second"] = round(sum(len(a) for _, a, _ in todo) / (time.time() - t0), 1)

if which == "inception":                       # must reproduce the setup's reference statistics and its 2.54 floor
    mu, sig = fid.load_ref("inc_test")
    f = arr["test"].astype(np.float64)
    res["check_ref_mu_maxabs"] = float(np.abs(f.mean(0) - mu).max())
    res["check_fid_real_vs_setup_ref"] = round(fid.frechet(*fid.stats(arr["real"].astype(np.float64)), mu, sig), 3)
if which == "dino":                            # must reproduce the Vision encoders page's stored test vectors
    ref = np.load(scratch("ve", "fmnist_dino.npz"))["cls_test"].astype(np.float32)[:len(arr["test"])]
    f = arr["test"] / np.linalg.norm(arr["test"], axis=1, keepdims=True)
    cos = (f * ref / np.linalg.norm(ref, axis=1, keepdims=True)).sum(1)
    res["check_cos_to_ve_cls_test"] = {"min": round(float(cos.min()), 5), "mean": round(float(cos.mean()), 6)}
if SMOKE:
    print({k: v.shape for k, v in arr.items()}, {k: v for k, v in res.items() if k.startswith("check")}); sys.exit(0)
np.savez(ev_scratch(f"feat_{which}.npz"), **arr)
dump(f"feats_{which}.json", res)
