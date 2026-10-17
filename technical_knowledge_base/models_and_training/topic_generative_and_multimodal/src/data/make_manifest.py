"""Write manifest.json: every committed file in src/data with size and sha256, plus the large artefacts kept
outside the repo (GM_SCRATCH) with their sizes, and the pinned models and package versions.
Run: GM_SCRATCH=... python -I make_manifest.py
"""
import json, os, sys, time
from importlib.metadata import version

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from common import scratch, sha256, SCRATCH
import pretrained as P

repo = []
for dp, _, fs in os.walk(HERE):
    if "__pycache__" in dp:
        continue
    for f in sorted(fs):
        p = os.path.join(dp, f); rel = os.path.relpath(p, HERE)
        if rel == "manifest.json":
            continue
        repo.append({"path": rel, "bytes": os.path.getsize(p), "sha256": sha256(p)})
repo.sort(key=lambda r: r["path"])

outside = []
for sub in ("data", "ckpt", "fid", "test_images"):
    d = scratch(sub)
    if os.path.isdir(d):
        for f in sorted(os.listdir(d)):
            p = os.path.join(d, f)
            if os.path.isfile(p):
                outside.append({"path": f"GM_SCRATCH/{sub}/{f}", "bytes": os.path.getsize(p),
                                **({"sha256": sha256(p)} if os.path.getsize(p) < 200_000_000 else {})})

pk = ["torch", "torchvision", "diffusers", "transformers", "accelerate", "safetensors", "huggingface-hub",
      "timm", "torch-fidelity", "torchmetrics", "scikit-image", "pillow", "numpy", "scipy", "matplotlib"]
models = json.load(open(scratch("models_dl.json"))) if os.path.exists(scratch("models_dl.json")) else {}
clones = {}
cl = scratch("clone.log")
if os.path.exists(cl):
    for line in open(cl):
        w = line.split()
        if len(w) == 4 and len(w[2]) == 40:
            clones[w[0]] = {"ref": w[1], "commit": w[2], "commit_date": w[3]}
out = {"built": time.strftime("%Y-%m-%d"), "python": sys.version.split()[0],
       "packages": {p: version(p) for p in pk},
       "models": {k: {"repo": r, "revision": v, **({"bytes_downloaded": models[r]["bytes"]} if r in models else {})}
                  for k, (r, v) in (("latent_diffusion", P.SD), ("clip", P.CLIP), ("siglip", P.SIGLIP), ("vlm", P.VLM))},
       "source_clones_in_GM_SCRATCH_src": clones, "repo_files": repo, "outside_repo": outside}
json.dump(out, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
print(len(repo), "repo files,", sum(r["bytes"] for r in repo), "bytes;", len(outside), "outside files")
