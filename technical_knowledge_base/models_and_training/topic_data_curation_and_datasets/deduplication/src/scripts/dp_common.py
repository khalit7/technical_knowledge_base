"""Shared helpers for the deduplication child page (prefix dp).

Reuses the root Dedup lab's helpers (../../../src/dedup/dd_common.py): the running example's loader, datatrove's
own MinHash signer, the PII scrubber and the save() guard against local paths. Run every script with the shared venv:
    export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
    nice -n 15 $DC_SCRATCH/venv/bin/python -I -B <this folder>/<script>.py
Large intermediates go to $DC_SCRATCH/dp/; small results the page embeds go to ../data/out/.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_DEDUP = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "dedup"))
sys.path.insert(0, ROOT_DEDUP)
import dd_common as C  # noqa: E402,F401  (root lab helpers: C.L loader, C.work, C.signer, C.scrub)

OUT = os.path.abspath(os.path.join(HERE, "..", "data", "out"))


def work(*parts):
    d = os.path.join(C.L.scratch(), "dp")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, *parts)


def dd_work(*parts):
    """the root lab's large intermediates (pairs.npz, shingles.pkl, emb.npy, ...), read only"""
    return C.work(*parts)


# Hostnames that look like a private individual's site (a person's name, a personal blog) are replaced by neutral
# labels everywhere this page writes data (decision of 2026-10-15); organisations and businesses are kept.
# keyed by the first 16 hex digits of SHA-1 of the hostname (without "www."), so the names are not stored here.
PERSONAL_HOSTS = {"103c3f45e703c2cd": "personal-site-1.example", "0d52800ec6852372": "personal-site-2.example", "b570ff1470b28c05": "personal-site-3.example", "60f6a473ba7d8185": "personal-site-4.example", "acaae47087ea72b4": "personal-site-5.example"}


def mask_hosts(s):
    import hashlib
    import re

    def rep(m):
        h = m.group(0)
        k = hashlib.sha1((h[4:] if h.startswith("www.") else h).encode()).hexdigest()[:16]
        return PERSONAL_HOSTS.get(k, h)
    return re.sub(r"[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+", rep, s)


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    s = mask_hosts(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))
    for bad in ("/" + "Users/", "Users" + "-", "/private/tmp", "scratchpad", __import__("getpass").getuser()):
        assert bad not in s, f"private path fragment {bad!r} in {name}"
    with open(os.path.join(OUT, name), "w") as f:
        f.write(s)
    print("wrote", name, len(s), "bytes")


def load_out(name):
    return json.load(open(os.path.join(OUT, name)))
