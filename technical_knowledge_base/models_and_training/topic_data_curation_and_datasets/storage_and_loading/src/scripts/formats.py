"""Storage and loading child page (prefix sl): write the same documents in every format the page discusses, record bytes
on disk (deterministic) and rough read timings (single thread, low priority, shared machine).
Extends the root's Tool map run (src/map/storage/storage_sizes.py): same input, same first N rows, same tokenizer; the
seven sizes it recorded must come out identical here (checked at the end).
Run outside the repo with the page's venv (pyarrow, zstandard, tokenizers, webdataset, mosaicml-streaming, pylance):
  nice -n 15 <venv>/bin/python -I formats.py <fineweb .parquet> <N> <qwen3 tokenizer.json> <gpt2 tokenizer.json> <workdir> <out.json> [--time]
"""
import gzip, io, json, os, shutil, statistics, struct, sys, tarfile, time
import numpy as np, pyarrow as pa, pyarrow.parquet as pq, pyarrow.feather as feather, zstandard
from tokenizers import Tokenizer

src, N, tq, tg, work, out = sys.argv[1], int(sys.argv[2]), sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6]
TIME = "--time" in sys.argv
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
P = lambda n: os.path.join(work, n)
rows = pq.read_table(src).slice(0, N).to_pylist()
N = len(rows)
# file_path is a FineWeb S3 path in the published rows (not a local path); kept so the columns match the root's run
jl = "".join(json.dumps(r, ensure_ascii=False, default=str) + "\n" for r in rows).encode()
text_bytes = sum(len(r["text"].encode()) for r in rows)
res = {"n_docs": N, "text_bytes": text_bytes, "jsonl_bytes": len(jl), "sizes": [], "timings": {}, "parquet": {}}

def add(fmt, label, path_or_bytes, kind="doc", group="", note=""):
    b = path_or_bytes if isinstance(path_or_bytes, int) else (os.path.getsize(path_or_bytes) if os.path.isfile(path_or_bytes) else
        sum(os.path.getsize(os.path.join(d, f)) for d, _, fs in os.walk(path_or_bytes) for f in fs))
    res["sizes"].append({"fmt": fmt, "label": label, "bytes": b, "kind": kind, "group": group, "note": note})

# 1. JSONL and stream compressors -----------------------------------------------------------
open(P("docs.jsonl"), "wb").write(jl); add("jsonl", "JSONL, uncompressed", P("docs.jsonl"), group="row text")
for lv in (1, 6, 9):
    os.makedirs(P("gz%d" % lv))  # gzip stores the file name in its header: keep it "docs.jsonl" as in the root's run
    with gzip.open(P("gz%d/docs.jsonl.gz" % lv), "wb", compresslevel=lv) as f: f.write(jl)
    add("jsonl.gz" + ("" if lv == 6 else str(lv)), "JSONL + gzip (level %d)" % lv, P("gz%d/docs.jsonl.gz" % lv), group="row text")
for lv in (1, 3, 9, 19):
    open(P("docs.jsonl.zst%d" % lv), "wb").write(zstandard.ZstdCompressor(level=lv).compress(jl))
    add("jsonl.zst" + ("" if lv == 3 else str(lv)), "JSONL + zstd (level %d)" % lv, P("docs.jsonl.zst%d" % lv), group="row text")

# 2. Parquet: the root's two defaults, then what changes the size -------------------------------
tab = pa.Table.from_pylist(rows)
pq.write_table(tab, P("docs.snappy.parquet"), compression="snappy"); add("parquet.snappy", "Parquet, snappy", P("docs.snappy.parquet"), group="columnar")
pq.write_table(tab, P("docs.zstd.parquet"), compression="zstd"); add("parquet.zstd", "Parquet, zstd (pyarrow default level)", P("docs.zstd.parquet"), group="columnar")
pq.write_table(tab.select(["text"]), P("text_only.zstd.parquet"), compression="zstd"); add("parquet.text", "Parquet, zstd, text column only", P("text_only.zstd.parquet"), group="columnar")
for lv in (1, 3, 9, 19):
    pq.write_table(tab, P("docs.zstd%d.parquet" % lv), compression="zstd", compression_level=lv)
    add("parquet.zstd%d" % lv, "Parquet, zstd level %d" % lv, P("docs.zstd%d.parquet" % lv), group="columnar")
pq.write_table(tab, P("docs.zstd3.nodict.parquet"), compression="zstd", compression_level=3, use_dictionary=False)
add("parquet.zstd3.nodict", "Parquet, zstd level 3, no dictionary encoding", P("docs.zstd3.nodict.parquet"), group="columnar")
for rg in (100, 500):
    pq.write_table(tab, P("docs.zstd3.rg%d.parquet" % rg), compression="zstd", compression_level=3, row_group_size=rg)
    add("parquet.zstd3.rg%d" % rg, "Parquet, zstd level 3, row groups of %d rows" % rg, P("docs.zstd3.rg%d.parquet" % rg), group="columnar")
# per-column compressed bytes and the pyarrow default zstd level, read from the file's own metadata
md = pq.ParquetFile(P("docs.zstd.parquet")).metadata
cols = {}
for g in range(md.num_row_groups):
    for c in range(md.num_columns):
        cc = md.row_group(g).column(c)
        d = cols.setdefault(cc.path_in_schema, {"compressed": 0, "uncompressed": 0, "encodings": sorted(set(cc.encodings))})
        d["compressed"] += cc.total_compressed_size; d["uncompressed"] += cc.total_uncompressed_size
res["parquet"] = {"row_groups_default": md.num_row_groups, "rows": md.num_rows, "columns": cols,
                  "footer_bytes": md.serialized_size, "created_by": md.created_by}

# 3. Arrow IPC (Feather v2): what HF datasets keeps in its cache --------------------------------
for comp in ("uncompressed", "lz4", "zstd"):
    feather.write_feather(tab, P("docs.%s.arrow" % comp), compression=comp)
    add("arrow." + comp, "Arrow IPC (Feather v2), %s" % comp, P("docs.%s.arrow" % comp), group="columnar")

# 4. WebDataset: a POSIX tar, one sample = files sharing a key ----------------------------------
import webdataset as wds
for ext in ("tar", "tar.gz"):
    with wds.TarWriter(P("shard-000000." + ext), compress=(ext == "tar.gz")) as sink:
        for i, r in enumerate(rows):
            meta = {k: v for k, v in r.items() if k != "text"}
            sink.write({"__key__": "%06d" % i, "txt": r["text"], "json": json.dumps(meta, default=str)})
    add("wds." + ext, "WebDataset %s (txt + json per sample)" % ext, P("shard-000000." + ext), group="shards")
with tarfile.open(P("shard-000000.tar")) as t:
    ms = t.getmembers()
    res["tar"] = {"members": len(ms), "payload_bytes": sum(m.size for m in ms), "file_bytes": os.path.getsize(P("shard-000000.tar")),
                  "format": {0: "ustar", 1: "gnu", 2: "pax"}[t.format], "pax_keys": sorted(ms[0].pax_headers)}

# 5. MosaicML Streaming MDS -------------------------------------------------------------------
from streaming import MDSWriter
colspec = {"text": "str", "url": "str", "id": "str", "dump": "str", "date": "str", "file_path": "str", "language": "str",
           "language_score": "float64", "token_count": "int64"}
for comp in (None, "zstd"):
    d = P("mds_" + (comp or "none"))
    with MDSWriter(out=d, columns=colspec, compression=comp) as w:
        for r in rows: w.write({k: r[k] for k in colspec})
    add("mds." + (comp or "none"), "MosaicML MDS, %s" % (comp or "uncompressed"), d, group="shards",
        note="directory: shard files plus index.json")
res["mds_index"] = json.load(open(os.path.join(P("mds_zstd"), "index.json")))

# 6. Lance ------------------------------------------------------------------------------------
import lance
lance.write_dataset(tab, P("docs.lance"))
add("lance", "Lance (default settings)", P("docs.lance"), group="columnar", note="directory: data files, manifest, transactions")

# 7. Token shards: nanoGPT-style flat array, datatrove-style index, Megatron .bin/.idx ------------
tokq, tokg = Tokenizer.from_file(tq), Tokenizer.from_file(tg)
Vq, Vg = tokq.get_vocab_size(with_added_tokens=True), tokg.get_vocab_size(with_added_tokens=True)
idsq = [tokq.encode(r["text"], add_special_tokens=False).ids for r in rows]
idsg = [tokg.encode(r["text"], add_special_tokens=False).ids for r in rows]
lq, lg = [len(x) for x in idsq], [len(x) for x in idsg]
Tq, Tg = int(sum(lq)), int(sum(lg))
flatq = np.concatenate([np.asarray(x, dtype=np.uint32) for x in idsq])
flatg = np.concatenate([np.asarray(x, dtype=np.uint32) for x in idsg])
flatq.tofile(P("q.bin")); np.asarray(np.cumsum(lq), dtype=np.uint64).tofile(P("q.index"))
add("bin", "Token shard (uint32) + index", os.path.getsize(P("q.bin")) + os.path.getsize(P("q.index")), kind="tok", group="tokens",
    note="Qwen3 tokenizer, vocabulary %d" % Vq)
assert flatg.max() < 65536
flatg.astype(np.uint16).tofile(P("g.bin")); np.asarray(np.cumsum(lg), dtype=np.uint64).tofile(P("g.index"))
add("bin.gpt2", "Token shard (uint16, GPT-2 tokenizer) + index", os.path.getsize(P("g.bin")) + os.path.getsize(P("g.index")), kind="tok", group="tokens",
    note="GPT-2 tokenizer, vocabulary %d" % Vg)
open(P("q.bin.zst"), "wb").write(zstandard.ZstdCompressor(level=3).compress(open(P("q.bin"), "rb").read()))
add("bin.zst", "Token shard (uint32) + zstd level 3", P("q.bin.zst"), kind="tok", group="tokens", note="not seekable without frames")
open(P("g.bin.zst"), "wb").write(zstandard.ZstdCompressor(level=3).compress(open(P("g.bin"), "rb").read()))
add("bin.gpt2.zst", "Token shard (uint16, GPT-2) + zstd level 3", P("g.bin.zst"), kind="tok", group="tokens")
# Megatron indexed dataset, written byte for byte as megatron/core/datasets/indexed_dataset.py _IndexWriter (lines 150-210 at 80781ab):
# header b"MMIDIDX\x00\x00", <Q version 1, <B dtype code, <Q sequence count, <Q document count, int32 lengths, int64 byte pointers,
# int64 document indices. dtype: uint16 when vocabulary < 65,500, else int32 (DType.optimal_dtype, lines 114-127).
def megatron(ids, vocab, stem):
    dt = np.uint16 if vocab < 65500 else np.int32
    code = {np.uint8: 1, np.int8: 2, np.int16: 3, np.int32: 4, np.int64: 5, np.float64: 6, np.float32: 7, np.uint16: 8}[dt]
    with open(P(stem + ".bin"), "wb") as f:
        for x in ids: f.write(np.asarray(x, dtype=dt).tobytes(order="C"))
    lens = [len(x) for x in ids]; ptr, p = [], 0
    for n in lens: ptr.append(p); p += n * np.dtype(dt).itemsize
    with open(P(stem + ".idx"), "wb") as f:
        f.write(b"MMIDIDX\x00\x00"); f.write(struct.pack("<Q", 1)); f.write(struct.pack("<B", code))
        f.write(struct.pack("<Q", len(lens))); f.write(struct.pack("<Q", len(lens) + 1))
        f.write(np.array(lens, dtype=np.int32).tobytes()); f.write(np.array(ptr, dtype=np.int64).tobytes())
        f.write(np.arange(len(lens) + 1, dtype=np.int64).tobytes())
    return os.path.getsize(P(stem + ".bin")), os.path.getsize(P(stem + ".idx"))
mb, mi = megatron(idsq, Vq, "meg_q"); add("megatron.q", "Megatron .bin + .idx (int32, Qwen3)", mb + mi, kind="tok", group="tokens", note="idx %d bytes" % mi)
mb2, mi2 = megatron(idsg, Vg, "meg_g"); add("megatron.g", "Megatron .bin + .idx (uint16, GPT-2)", mb2 + mi2, kind="tok", group="tokens", note="idx %d bytes" % mi2)
res["tokens"] = {"qwen3": {"vocab": Vq, "tokens": Tq, "ids_ge_65536": int((flatq >= 65536).sum()), "max_id": int(flatq.max()),
                           "docs_with_id_ge_65536": int(sum(1 for x in idsq if max(x, default=0) >= 65536))},
                 "gpt2": {"vocab": Vg, "tokens": Tg, "max_id": int(flatg.max())},
                 "lens_q": lq, "lens_g": lg}

# 8. Rough read timings (single process, best of 3, shared machine at low priority) ----------------
def best(f, k=3):
    ts = []
    for _ in range(k):
        t0 = time.perf_counter(); n = f(); ts.append(time.perf_counter() - t0)
    return min(ts), n
def r_jsonl(path, opener):
    def f():
        n = 0
        with opener(path) as fh:
            for line in fh: n += len(json.loads(line)["text"])
        return n
    return f
if TIME:
    zd = zstandard.ZstdDecompressor()
    T = {}
    T["jsonl"] = best(r_jsonl(P("docs.jsonl"), lambda p: open(p, "rb")))
    T["jsonl.gz"] = best(r_jsonl(P("gz6/docs.jsonl.gz"), lambda p: gzip.open(p, "rb")))
    T["jsonl.zst"] = best(r_jsonl(P("docs.jsonl.zst3"), lambda p: io.BufferedReader(zd.stream_reader(open(p, "rb")))))
    T["parquet.zstd"] = best(lambda: sum(len(s) for s in pq.read_table(P("docs.zstd.parquet"), columns=["text"]).column(0).to_pylist()))
    T["parquet.snappy"] = best(lambda: sum(len(s) for s in pq.read_table(P("docs.snappy.parquet"), columns=["text"]).column(0).to_pylist()))
    T["parquet.zstd.allcols"] = best(lambda: len(pq.read_table(P("docs.zstd.parquet")).to_pylist()))
    T["arrow.uncompressed"] = best(lambda: sum(len(s) for s in feather.read_table(P("docs.uncompressed.arrow"), columns=["text"], memory_map=True).column(0).to_pylist()))
    T["arrow.zstd"] = best(lambda: sum(len(s) for s in feather.read_table(P("docs.zstd.arrow"), columns=["text"]).column(0).to_pylist()))
    def r_tar(p):
        def f():
            n = 0
            with tarfile.open(p) as t:
                for m in t:
                    if m.name.endswith(".txt"): n += len(t.extractfile(m).read().decode())
            return n
        return f
    T["wds.tar"] = best(r_tar(P("shard-000000.tar"))); T["wds.tar.gz"] = best(r_tar(P("shard-000000.tar.gz")))
    from streaming.base.format import reader_from_json
    def unzip_mds(d, idx):  # Streaming decompresses a zstd shard once, on download, before reading it (time counted here)
        for sh in idx["shards"]:
            if sh.get("compression"):
                raw = os.path.join(d, sh["raw_data"]["basename"])
                if os.path.exists(raw): os.remove(raw)
                open(raw, "wb").write(zstandard.ZstdDecompressor().decompress(open(os.path.join(d, sh["zip_data"]["basename"]), "rb").read()))
    def r_mds(d):
        def f():
            idx = json.load(open(os.path.join(d, "index.json"))); n = 0; unzip_mds(d, idx)
            for sh in idx["shards"]:
                rd = reader_from_json(d, None, sh)
                for i in range(rd.samples): n += len(rd[i]["text"])
            return n
        return f
    T["mds.none"] = best(r_mds(P("mds_none"))); T["mds.zstd"] = best(r_mds(P("mds_zstd")))
    T["lance"] = best(lambda: sum(len(s) for s in lance.dataset(P("docs.lance")).to_table(columns=["text"]).column(0).to_pylist()))
    T["bin"] = best(lambda: int(np.fromfile(P("q.bin"), dtype=np.uint32).size))
    T["bin.memmap"] = best(lambda: int(np.memmap(P("q.bin"), dtype=np.uint32, mode="r")[:].astype(np.int64).sum() > 0))
    res["timings"] = {k: {"s": v[0], "n": v[1]} for k, v in T.items()}
    # random access: 200 documents chosen with a fixed seed
    rng = np.random.default_rng(0); pick = sorted(rng.choice(N, 200, replace=False).tolist())
    RA = {}
    ends = np.cumsum(lq); starts = ends - np.array(lq)
    def ra_bin():
        m = np.memmap(P("q.bin"), dtype=np.uint32, mode="r"); return sum(int(m[starts[i]:ends[i]].size) for i in pick)
    RA["bin.memmap"] = best(ra_bin)
    def ra_parquet():
        pf = pq.ParquetFile(P("docs.zstd3.rg100.parquet")); n = 0
        for i in pick: n += len(pf.read_row_group(i // 100, columns=["text"]).column(0)[i % 100].as_py())
        return n
    RA["parquet.rg100"] = best(ra_parquet)
    def ra_lance():
        return sum(len(s) for s in lance.dataset(P("docs.lance")).take(pick, columns=["text"]).column(0).to_pylist())
    RA["lance"] = best(ra_lance)
    def ra_mds():
        d = P("mds_zstd"); idx = json.load(open(os.path.join(d, "index.json"))); unzip_mds(d, idx)
        rds = [reader_from_json(d, None, sh) for sh in idx["shards"]]; cum = np.cumsum([r.samples for r in rds]); n = 0
        for i in pick:
            s = int(np.searchsorted(cum, i, side="right")); j = i - (int(cum[s - 1]) if s else 0); n += len(rds[s][j]["text"])
        return n
    RA["mds.zstd"] = best(ra_mds)
    def ra_jsonl_zst():  # no index: decompress from the start up to each document
        n = 0
        for i in pick:
            with io.BufferedReader(zstandard.ZstdDecompressor().stream_reader(open(P("docs.jsonl.zst3"), "rb"))) as fh:
                for k, line in enumerate(fh):
                    if k == i: n += len(json.loads(line)["text"]); break
        return n
    RA["jsonl.zst"] = best(ra_jsonl_zst, k=1)
    res["random_access"] = {k: {"s": v[0], "n": v[1], "docs": len(pick)} for k, v in RA.items()}

# check against the root's Tool map run (same input, same first N rows)
ROOT = {"jsonl": 7697313, "jsonl.gz": 2837462, "jsonl.zst": 2742399, "parquet.snappy": 4271069, "parquet.zstd": 3015707, "parquet.text": 2871968, "bin": 5706564}
got = {s["fmt"]: s["bytes"] for s in res["sizes"]}
res["root_check"] = {k: {"root": v, "here": got.get(k), "same": got.get(k) == v} for k, v in ROOT.items()} if N == 2000 else "n/a"
res["versions"] = {m: __import__(m).__version__ for m in ("pyarrow", "zstandard", "numpy", "webdataset", "lance")}
import importlib.metadata as im
res["versions"]["mosaicml-streaming"] = im.version("mosaicml-streaming"); res["versions"]["tokenizers"] = im.version("tokenizers")
json.dump(res, open(out, "w"), indent=1)
print(json.dumps(res.get("root_check")), "\n", "\n".join("%-22s %10d" % (s["fmt"], s["bytes"]) for s in res["sizes"]))
if TIME: print(json.dumps({k: round(v["s"], 4) for k, v in res["timings"].items()}), json.dumps({k: round(v["s"], 4) for k, v in res["random_access"].items()}))
