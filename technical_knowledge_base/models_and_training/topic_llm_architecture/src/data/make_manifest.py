"""Write src/data/manifest.json: every committed artefact of the running example with size and sha256, plus the
large scratch artefacts (by name, size and hash) that live outside the repo under $LA_SCRATCH."""
import hashlib, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SCR = os.environ.get("LA_SCRATCH")


def h(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest()


files = []
for root, _, fs in os.walk(HERE):
    if "__pycache__" in root:
        continue
    for f in sorted(fs):
        if f == "manifest.json" and root == HERE:
            continue
        p = os.path.join(root, f)
        files.append({"path": os.path.relpath(p, HERE), "bytes": os.path.getsize(p), "sha256": h(p)})
scratch = []
if SCR:
    for rel in ["data/train.bin", "data/val.bin"]:
        p = os.path.join(SCR, rel)
        if os.path.exists(p):
            scratch.append({"path": "$LA_SCRATCH/" + rel, "bytes": os.path.getsize(p), "sha256": h(p)})
pk = {}
try:
    from importlib.metadata import version
    for n in ["torch", "transformers", "tokenizers", "safetensors", "datasets", "numpy", "einops", "huggingface_hub"]:
        pk[n] = version(n)
except Exception:
    pass
json.dump({"built": "2026-10-18", "python": sys.version.split()[0], "packages": pk,
           "dataset": {"name": "roneneldan/TinyStories", "revision": "f54c09fd23315a6f9c86f9dc80f725de7d8f9c64",
                       "license": "CDLA-Sharing-1.0", "files": {
                           "train-00000-of-00004-2d5a1467fff1081b.parquet": "77cf780cebe52b6e83e3a2ac84bc56d8059363113e41d17a023f1d8b2ed0fc0b",
                           "validation-00000-of-00001-869c898b519ad725.parquet": "33406a6206554cfc279c29c11f4df51528af487aa1a602b075566fc83c49dcab"}},
           "inspection_models": {"HuggingFaceTB/SmolLM2-135M": "93efa2f097d58c2a74874c7e644dbc9b0cee75a2",
                                 "Qwen/Qwen3-0.6B": "c1899de289a04d12100db370d81485cdf75e47ca"},
           "files": files, "scratch": scratch}, open(os.path.join(HERE, "manifest.json"), "w"), indent=1)
print(len(files), "files")
