"""Frechet distances for the running example.

FID implementation chosen for this topic: torch-fidelity 0.4.0's FeatureExtractorInceptionV3
('inception-v3-compat', the 2015 TensorFlow Inception weights ported by torch-fidelity, the same network
torchmetrics' FrechetInceptionDistance wraps), 2048-d pool features; images given as uint8 RGB, resized
to 299x299 inside the extractor with its TensorFlow-1.x-compatible bilinear resize. Grey 28x28 Fashion-MNIST
images are cropped back to 28x28 and repeated to 3 channels. Features are computed on MPS or CPU in
float32; means, covariances and the matrix square root are computed on CPU in float64 with scipy
(MPS has no float64). Reference statistics live in GM_SCRATCH/fid/ (not committed: 2048x2048 float64).

Two distances:
  fid(...)        Inception features: the standard number papers report, but Inception never saw grey
                  28x28 clothing, so absolute values on this dataset are not comparable to papers' FIDs.
  fd_fmnist(...)  the same Frechet formula in the 128-d feature space of FMClassifier trained on this data
                  (domain-specific, more sensitive here; comparable only within this topic).
Both are biased upward at small sample sizes: compare models at the same N (README gives real-vs-real
floors at several N).
"""
import os, sys

import numpy as np
import torch
from scipy import linalg

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import scratch

_INC = None


def inception(dev):
    global _INC
    if _INC is None:
        from torch_fidelity.feature_extractor_inceptionv3 import FeatureExtractorInceptionV3
        _INC = FeatureExtractorInceptionV3("inception-v3-compat", ["2048"]).eval()
    return _INC.to(dev)


@torch.no_grad()
def inception_features(imgs_uint8, dev, bs=50):   # bs=100 peaked at 7.1 GB of MPS memory
    """imgs: uint8 numpy [N,28,28] (grey) or [N,H,W,3] (RGB) -> float64 numpy [N,2048]."""
    net, out = inception(dev), []
    for i in range(0, len(imgs_uint8), bs):
        x = torch.from_numpy(np.ascontiguousarray(imgs_uint8[i:i + bs]))
        x = x[:, None].repeat(1, 3, 1, 1) if x.ndim == 3 else x.permute(0, 3, 1, 2)
        out.append(net(x.to(dev))[0].float().cpu())
    return torch.cat(out).double().numpy()


@torch.no_grad()
def classifier_features(imgs_uint8, clf, dev, bs=500):
    from common import to_model
    clf = clf.to(dev).eval(); out, logits = [], []
    for i in range(0, len(imgs_uint8), bs):
        x = to_model(imgs_uint8[i:i + bs]).to(dev)
        f = clf.features(x); out.append(f.float().cpu()); logits.append(clf.cls(f).float().cpu())
    return torch.cat(out).double().numpy(), torch.cat(logits).numpy()


def stats(feats):
    return feats.mean(0), np.cov(feats, rowvar=False)


def frechet(mu1, s1, mu2, s2):
    """||mu1 - mu2||^2 + Tr(S1 + S2 - 2 (S1 S2)^(1/2)) (Dowson and Landau 1982; Heusel et al. 2017)."""
    diff = mu1 - mu2
    covmean = linalg.sqrtm(s1 @ s2)          # scipy >= 1.16: no disp argument
    if not np.isfinite(covmean).all():
        off = np.eye(s1.shape[0]) * 1e-6
        covmean = linalg.sqrtm((s1 + off) @ (s2 + off))
    covmean = covmean.real
    return float(diff @ diff + np.trace(s1) + np.trace(s2) - 2 * np.trace(covmean))


def load_ref(name):
    """name in {'inc_test', 'inc_train10k', 'clf_test'}: (mu, sigma) saved by smoke_fid.py."""
    d = np.load(scratch("fid", f"{name}.npz"))
    return d["mu"], d["sigma"]


def fid(imgs_uint8, dev, ref="inc_test"):
    return frechet(*stats(inception_features(imgs_uint8, dev)), *load_ref(ref))


def load_classifier(dev="cpu"):
    from nets import FMClassifier
    clf = FMClassifier()
    clf.load_state_dict(torch.load(scratch("ckpt", "fm_classifier.pt"), map_location="cpu"))
    return clf.to(dev).eval()


def fd_fmnist(imgs_uint8, clf, dev, labels=None, ref="clf_test"):
    """Returns (FD in classifier space, accuracy of the classifier on the samples' intended labels or None)."""
    f, lg = classifier_features(imgs_uint8, clf, dev)
    acc = None if labels is None else float((lg.argmax(1) == np.asarray(labels)).mean())
    return frechet(*stats(f), *load_ref(ref)), acc
