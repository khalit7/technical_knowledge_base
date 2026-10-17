"""Reconstruction metrics for the tokenizer comparator, on CPU, from the uint8 reconstructions roundtrip.py saved.

  GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I tok/metrics.py
Per image and model: PSNR (dB, uint8 RGB), SSIM (scikit-image 0.26 structural_similarity, channel_axis=2,
data_range=255, its default 7x7 window), LPIPS (AlexNet, v0.1 linear weights bundled in torchmetrics 1.9.0, inputs in
[-1, 1] at 512x512; lower is closer). rFID is not computed: 16 images give no usable Frechet distance (the topic's
real-vs-real floor is 15 at N = 1,000; root src/data/README.md). Writes out/tok/metrics.json.
"""
import glob, json, os, sys

import numpy as np
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
sys.path.insert(0, os.path.join(SRC, "..", "..", "src", "data"))
from common import cap_threads, scratch
import pretrained
from skimage.metrics import structural_similarity

cap_threads(4)
torch.set_grad_enabled(False)


def main():
    from torchmetrics.functional.image.lpips import _NoTrainLpips
    lp = _NoTrainLpips(net="alex").eval()
    orig = {k: np.asarray(im) for k, im, _ in pretrained.test_images(512)}
    res = {}
    for f in sorted(glob.glob(scratch("av", "tok", "*.npz"))):
        name = os.path.basename(f)[:-4]
        d = np.load(f)
        for field in [k for k in d.files if k.startswith("rec")]:
          rows = []
          nm = name + field[3:]
          for k, rec in zip(d["keys"], d[field]):
            o = orig[str(k)]
            mse = ((o.astype(np.float64) - rec.astype(np.float64)) ** 2).mean()
            ps = 10 * np.log10(255 ** 2 / max(mse, 1e-10))
            ss = structural_similarity(o, rec, channel_axis=2, data_range=255)
            t = lambda a: torch.from_numpy(a).permute(2, 0, 1)[None].float() / 127.5 - 1
            l = float(lp(t(o), t(rec)).flatten()[0])
            rows.append({"key": str(k), "psnr": round(ps, 2), "ssim": round(float(ss), 4), "lpips": round(l, 4)})
          mean = {m: round(float(np.mean([r[m] for r in rows])), 4) for m in ("psnr", "ssim", "lpips")}
          res[nm] = {"mean": mean, "per_image": rows}
          print(nm, mean, flush=True)
    json.dump(res, open(os.path.join(SRC, "out", "tok", "metrics.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
