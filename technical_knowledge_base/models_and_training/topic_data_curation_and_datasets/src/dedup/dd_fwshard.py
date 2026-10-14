"""Widening of dd_fineweb.py: our 2,692 filtered documents against a whole FineWeb shard of the same crawl.

FineWeb's data/CC-MAIN-2024-30/000_00000.parquet (rev 9bb295dd) holds 971,981 rows from about 400 consecutive WARC
files, ours first. Steps:
  get     download it (huggingface_hub, under the shared download lock) to $DC_SCRATCH/data/curated/
  sign    datatrove MinHash signatures (FineWeb's 14 x 8) for every row, 4 worker processes, cached as .npy
  join    LSH: per band, group equal band values (numpy sort), list candidate pairs (a) between our documents and the
          shard's rows from other WARC files, (b) inside the shard among rows from other WARC files; true Jaccard for
          every candidate pair
Writes out/dd_fwshard.json.
"""
import json
import multiprocessing as mp
import os
import subprocess
import sys
import time

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

REV = "9bb295ddab0e05d785b879661af7260fed5140fc"
PQ = C.L.path("curated", "fineweb_2024-30_000_00000_full.parquet")
SIG = C.work("fwshard_sigs.npy")
LOCK = os.path.join(C.L.scratch(), "..", "inf", "lock.sh")


def get():
    if os.path.exists(PQ):
        return
    print(subprocess.run(["sh", LOCK, "acquire", "download", "dd"], capture_output=True, text=True).stdout, flush=True)
    try:
        from huggingface_hub import hf_hub_download
        p = hf_hub_download("HuggingFaceFW/fineweb", "data/CC-MAIN-2024-30/000_00000.parquet", repo_type="dataset",
                            revision=REV, local_dir=C.work("hfdl"))
        os.replace(p, PQ)
    finally:
        print(subprocess.run(["sh", LOCK, "release", "download", "dd"], capture_output=True, text=True).stdout)
    import hashlib
    h = hashlib.sha256()
    with open(PQ, "rb") as f:
        for b in iter(lambda: f.read(1 << 24), b""):
            h.update(b)
    print("size", os.path.getsize(PQ), "sha256", h.hexdigest())


_SG = None


def _sign(texts):
    global _SG
    if _SG is None:
        _SG = C.signer()  # once per worker process
    sg = _SG
    out = np.zeros((len(texts), 112), dtype=np.uint64)
    for k, t in enumerate(texts):
        s = np.unique(sg.get_shingles(t).ravel())
        if s.size:
            out[k] = np.concatenate(sg.get_signature(s.reshape(-1, 1)))
    return out


def sign():
    if os.path.exists(SIG):
        return
    # the pool is forked before pyarrow starts its threads (forking after them deadlocked the workers)
    pool = mp.get_context("fork").Pool(4)
    import pyarrow.parquet as pq
    f = pq.ParquetFile(PQ)
    t0, parts = time.time(), []
    G = 16  # row groups (16,000 rows) per batch, 250 rows per task
    for rg0 in range(0, f.num_row_groups, G):
        texts = []
        for rg in range(rg0, min(rg0 + G, f.num_row_groups)):
            texts += f.read_row_group(rg, columns=["text"]).column("text").to_pylist()
        parts += pool.map(_sign, [texts[i:i + 250] for i in range(0, len(texts), 250)])
        print("rows", sum(len(p) for p in parts), round(time.time() - t0), "s", flush=True)
    pool.close(); pool.join()
    np.save(SIG, np.concatenate(parts))
    print("rough seconds (shared machine, 4 processes, low priority):", round(time.time() - t0))


def band_keys(S):
    # one 64-bit key per band: a mix of its 8 values (collisions between different bands' values are negligible here,
    # and every candidate is checked with the true Jaccard anyway)
    K = np.zeros((len(S), 14), dtype=np.uint64)
    for b in range(14):
        x = np.zeros(len(S), dtype=np.uint64)
        for r in range(8):
            x = (x * np.uint64(1099511628211)) ^ S[:, b * 8 + r]
        K[:, b] = x
    return K


def join():
    import pyarrow.parquet as pq
    fsig = np.load(SIG)
    meta = pq.read_table(PQ, columns=["id", "file_path"]).to_pandas()
    other = ~meta["file_path"].str.endswith(C.L.FILE + ".warc.gz").to_numpy()
    nfiles = meta["file_path"].nunique()
    osig = np.load(C.work("pairs.npz"))["sigs"]
    no = len(osig)
    S = np.concatenate([osig, fsig])
    valid = S.any(1)
    src = np.concatenate([np.full(no, 0), np.where(other, 1, 2)])  # 0 ours, 1 shard other files, 2 shard our file
    K = band_keys(S)
    cross, inside = set(), set()
    for b in range(14):
        idx = np.nonzero(valid & (src != 2))[0]
        order = idx[np.argsort(K[idx, b], kind="stable")]
        kv = K[order, b]
        starts = np.nonzero(np.r_[True, kv[1:] != kv[:-1]])[0]
        ends = np.r_[starts[1:], len(order)]
        for s, e in zip(starts, ends):
            if e - s < 2:
                continue
            g = order[s:e]
            ours = [x for x in g if src[x] == 0]
            theirs = [x - no for x in g if src[x] == 1]
            for a in ours:
                for t in theirs:
                    cross.add((int(a), int(t)))
            if len(theirs) > 1 and len(theirs) <= 2000:
                for i in range(len(theirs)):
                    for j in range(i + 1, len(theirs)):
                        inside.add((int(theirs[i]), int(theirs[j])))
    print("cross candidates", len(cross), "inside candidates", len(inside), flush=True)
    # true Jaccard for candidates
    docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
    final_ids = set(C.L.ids("run0_final")); fw_ids = set(C.L.ids("fineweb_kept"))
    need = sorted({t for _, t in cross} | {a for a, _ in inside} | {b for _, b in inside})
    f = pq.ParquetFile(PQ)
    rg_rows = np.cumsum([0] + [f.metadata.row_group(i).num_rows for i in range(f.num_row_groups)])
    texts = {}
    for rg in range(f.num_row_groups):
        want = [x for x in need if rg_rows[rg] <= x < rg_rows[rg + 1]]
        if want:
            col = f.read_row_group(rg, columns=["text"]).column("text")
            for x in want:
                texts[x] = col[x - rg_rows[rg]].as_py()
    sg = C.signer()
    sh = lambda t: set(np.unique(sg.get_shingles(t).ravel()).tolist())  # noqa: E731
    cache = {}

    def J(a, b):
        return len(a & b) / len(a | b) if (a | b) else 0.0

    def grp(i):
        d = docs[i]["id"]
        return "in_fineweb" if d in fw_ids else ("removed_by_our_minhash" if d not in final_ids else "kept_by_us_not_in_fineweb")

    crows = []
    for a, t in sorted(cross):
        cache.setdefault(("o", a), sh(docs[a]["text"])); cache.setdefault(("f", t), sh(texts[t]))
        crows.append([a, t, round(J(cache[("o", a)], cache[("f", t)]), 3), grp(a)])
    irows = []
    for a, b in sorted(inside):
        cache.setdefault(("f", a), sh(texts[a])); cache.setdefault(("f", b), sh(texts[b]))
        irows.append([a, b, round(J(cache[("f", a)], cache[("f", b)]), 3)])
    groups = ["in_fineweb", "removed_by_our_minhash", "kept_by_us_not_in_fineweb"]
    res = {"rows": int(len(meta)), "rows_other_files": int(other.sum()), "files": int(nfiles),
           "cross_candidates": len(crows), "inside_candidates": len(irows),
           "ours_with_partner_ge08": {g: len({r[0] for r in crows if r[3] == g and r[2] >= 0.8}) for g in groups},
           "ours_with_candidate": {g: len({r[0] for r in crows if r[3] == g}) for g in groups},
           "inside_hist": np.histogram([r[2] for r in irows], bins=np.linspace(0, 1, 11))[0].tolist() if irows else [],
           "inside_ge08": sum(1 for r in irows if r[2] >= 0.8),
           "cross_hist": np.histogram([r[2] for r in crows], bins=np.linspace(0, 1, 11))[0].tolist() if crows else []}
    print(res)
    json.dump({"cross": crows, "inside": irows}, open(C.work("fwshard_pairs.json"), "w"))
    C.save("dd_fwshard.json", res)


if __name__ == "__main__":
    for step in sys.argv[1:]:
        {"get": get, "sign": sign, "join": join}[step]()
