#!/usr/bin/env python3
"""Write manifest.json: every file in this folder (except the manifest itself) with size and sha256."""
import hashlib, json, os
H = os.path.dirname(os.path.abspath(__file__))
files = {}
for root, dirs, names in os.walk(H):
    dirs[:] = sorted(d for d in dirs if d != "__pycache__")
    for n in sorted(names):
        p = os.path.join(root, n); rel = os.path.relpath(p, H)
        if rel in ("manifest.json", "train/input.txt") or n.startswith("."):
            continue
        b = open(p, "rb").read()
        files[rel] = {"bytes": len(b), "sha256": hashlib.sha256(b).hexdigest()}
json.dump({"built": "2026-10-16", "files": files}, open(os.path.join(H, "manifest.json"), "w"), indent=1)
print(len(files), "files")
