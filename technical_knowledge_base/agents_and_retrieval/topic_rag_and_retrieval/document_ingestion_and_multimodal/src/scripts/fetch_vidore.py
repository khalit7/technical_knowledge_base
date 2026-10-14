"""Download three ViDoRe v1 test sets (run under the download lock), revisions pinned as read 2026-10-13.
usage: python -I fetch_vidore.py <ING_DIR>"""
import hashlib, json, os, sys, urllib.request
ING = sys.argv[1]
SETS = {"infovqa_test_subsampled": "f793e830aaea", "arxivqa_test_subsampled": "b8a106812c86",
        "syntheticDocQA_energy_test": "a2f2f358463b"}
man = {}
for name, short in SETS.items():
    info = json.load(urllib.request.urlopen("https://huggingface.co/api/datasets/vidore/" + name))
    sha = info["sha"]; assert sha.startswith(short)
    for f in [s["rfilename"] for s in info["siblings"] if s["rfilename"].endswith(".parquet")]:
        dst = os.path.join(ING, "vidore", name, os.path.basename(f)); os.makedirs(os.path.dirname(dst), exist_ok=True)
        if not os.path.exists(dst):
            urllib.request.urlretrieve("https://huggingface.co/datasets/vidore/%s/resolve/%s/%s" % (name, sha, f), dst)
        data = open(dst, "rb").read()
        man[name + "/" + os.path.basename(f)] = {"revision": sha, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
        print(name, len(data), flush=True)
json.dump(man, open(os.path.join(ING, "vidore_manifest.json"), "w"), indent=1)
