"""Write manifest.json: every file of the running example (in this folder and in $JX_SCRATCH/data)
with its size and sha256, plus the dataset's source."""
import hashlib
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import common as C  # noqa: E402


def entry(p, where):
    h = hashlib.sha256(open(p, "rb").read()).hexdigest()
    return {"file": os.path.basename(p), "where": where, "bytes": os.path.getsize(p), "sha256": h}


repo = [entry(os.path.join(C.HERE, f), "repo: src/data/") for f in sorted(os.listdir(C.HERE))
        if os.path.isfile(os.path.join(C.HERE, f)) and f != "manifest.json" and not f.startswith(".")]
scr = [entry(C.path("data", f), "$JX_SCRATCH/data/") for f in sorted(os.listdir(C.path("data")))
       if os.path.isfile(C.path("data", f))]
out = {
    "dataset": {"name": "TinyShakespeare (char-rnn input.txt)",
                "url": "https://raw.githubusercontent.com/karpathy/char-rnn/6f9487a6fe5b420b7ca9afb0d7c078e37c1d1b4e/data/tinyshakespeare/input.txt",
                "repo_licence": "MIT (karpathy/char-rnn)", "text": "Shakespeare plays, public domain",
                "bytes": 1115394, "sha256": "86c4e6aa9db7c042ec79f339dcb96d42b0075e16b8fc2e86bf0ca57e2dc565ed",
                "downloaded": "2026-10-15"},
    "repo_files": repo, "scratch_files": scr,
}
with open(os.path.join(C.HERE, "manifest.json"), "w") as f:
    json.dump(out, f, indent=1)
print(len(repo), "repo files,", len(scr), "scratch files")
