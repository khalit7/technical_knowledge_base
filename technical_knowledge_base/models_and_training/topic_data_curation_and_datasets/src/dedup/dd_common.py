"""Shared helpers for the Dedup lab (and, later, the deduplication child page).

Run every script with the shared venv, from anywhere:
    export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
    nice -n 15 $DC_SCRATCH/venv/bin/python -I -B <this folder>/<script>.py
Large intermediate files go to $DC_SCRATCH/dedup/; small results that the page embeds go to ./out/.
Nothing here writes a local path into ./out/ (run0 metadata carries one: strip it).
"""
import json
import os
import sys
import types
import importlib.machinery

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

# datatrove imports python-magic at import time in some readers; same stub as run0.py (no libmagic on this Mac)
_m = types.ModuleType("magic"); _m.__spec__ = importlib.machinery.ModuleSpec("magic", None)
_m.from_buffer = lambda b, mime=True: "application/octet-stream"; sys.modules.setdefault("magic", _m)


def work(*parts):
    d = os.path.join(L.scratch(), "dedup")
    os.makedirs(d, exist_ok=True)
    return os.path.join(d, *parts)


def save(name, obj, indent=None):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name)
    s = json.dumps(obj, indent=indent, ensure_ascii=False, separators=(",", ":") if indent is None else None)
    for bad in ("/Users/", "Users-", "/private/tmp", "scratchpad"):
        assert bad not in s, f"private path fragment {bad!r} in {name}"
    with open(p, "w") as f:
        f.write(s)
    print("wrote", os.path.relpath(p, HERE), len(s), "bytes")


def clean_doc(d):
    """id, url, text and the safe metadata of a run0 document (drops metadata.file_path)."""
    m = d.get("metadata", {})
    return {"id": d["id"], "url": m.get("url", ""), "text": d["text"]}


def minhash_cfg(buckets=14, rows=8):
    from datatrove.pipeline.dedup.minhash import MinhashConfig
    from datatrove.utils.hashing import HashConfig
    return MinhashConfig(hash_config=HashConfig(precision=64), num_buckets=buckets, hashes_per_bucket=rows)


def signer(buckets=14, rows=8):
    """datatrove's own MinhashDedupSignature (shingling and signature code), used without running the pipeline."""
    from datatrove.pipeline.dedup import MinhashDedupSignature
    return MinhashDedupSignature(output_folder=work("tmp_sig"), config=minhash_cfg(buckets, rows))


_pii = None


def scrub(text):
    """The running example's PII step (datatrove PIIFormatter, as in run0's final stage) applied to an excerpt."""
    global _pii
    if _pii is None:
        from datatrove.pipeline.formatters import PIIFormatter
        _pii = PIIFormatter()
    return _pii.format(text)


# Hostnames that look like a private individual's site (a person's name as the domain, a family or hobby blog) are
# replaced by neutral labels everywhere the lab shows a hostname (decision of 2026-10-15). Organisations, companies,
# public institutions and well-known sites are kept.
# stored as the first 16 hex digits of sha256(hostname), so the repository does not name them
PERSONAL_HOSTS = ['952940e2e4afd969', 'a103d633399b854a', '8ec5a1ccdc6559dc', '1a11afd94299596a', 'd59c3cae3e41a360']


def host_label(h):
    import hashlib
    d = hashlib.sha256((h or "").encode()).hexdigest()[:16]
    return f"personal-site-{PERSONAL_HOSTS.index(d) + 1}.example" if d in PERSONAL_HOSTS else h
