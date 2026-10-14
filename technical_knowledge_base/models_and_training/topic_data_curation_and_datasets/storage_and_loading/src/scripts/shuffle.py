"""Storage and loading child page (prefix sl): shuffle quality with the real libraries, deterministic (seeded), no timings.
Corpus: 11 shards, one per Nemotron-CC CC-MAIN-2024-30 partition (quality bucket x kind), the first S documents of each
head sample, written in pipeline order (shard 0 first). This is how curated data usually sits on disk: each output file
holds one source, bucket or crawl. We then read it back under each shuffling scheme and record, for every position of the
stream, which shard the sample came from.
Run with the page's venv:  nice -n 15 <venv>/bin/python -I shuffle.py <nemotron_cc dir> <workdir> <out.json> [S]
"""
import glob, gzip, json, os, shutil, sys
import numpy as np, pyarrow as pa, pyarrow.parquet as pq

src, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
S = int(sys.argv[4]) if len(sys.argv) > 4 else 200
B = 32  # batch size for the batch-mix metric
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
files = sorted(glob.glob(os.path.join(src, "quality-*.jsonl.gz")))
names = [os.path.basename(f).split("__CC-MAIN")[0].replace("quality-", "").replace("__kind-", " / ").replace("__kind2-", " / ") for f in files]
K = len(files)
paths = []
for k, f in enumerate(files):
    rows = []
    with gzip.open(f, "rt") as fh:
        for line in fh:
            d = json.loads(line); rows.append({"shard": k, "i": len(rows), "text": d["text"][:200]})
            if len(rows) == S: break
    assert len(rows) == S, (f, len(rows))
    p = os.path.join(work, "shard-%02d.parquet" % k); pq.write_table(pa.Table.from_pylist(rows), p); paths.append(p)
Ntot = K * S
orders = {}
orders["none"] = [k for k in range(K) for _ in range(S)]

# Hugging Face datasets streaming: IterableDataset.shuffle(seed, buffer_size) shuffles the shard (file) order and then
# draws from a buffer of buffer_size examples (datasets/iterable_dataset.py, BufferShuffledExamplesIterable)
import datasets
datasets.disable_progress_bars()
ds = datasets.load_dataset("parquet", data_files=paths, split="train", streaming=True)
hf_nshards = ds.num_shards
# datasets 5.x: shuffle() also interleaves up to max_buffer_input_shards (default 10) shard groups round robin before the
# buffer (iterable_dataset.py 3738-3830); max_buffer_input_shards=1 gives the older behaviour (shard order, then buffer)
for buf in (1, 100, 1000):
    orders["hf_buf%d" % buf] = [r["shard"] for r in ds.shuffle(seed=42, buffer_size=buf)]
    orders["hf_buf%d_mbis1" % buf] = [r["shard"] for r in ds.shuffle(seed=42, buffer_size=buf, max_buffer_input_shards=1)]
hf_nshards_after = {"default": ds.shuffle(seed=42, buffer_size=1000).num_shards,
                    "mbis1": ds.shuffle(seed=42, buffer_size=1000, max_buffer_input_shards=1).num_shards}
# own mirror of a buffer shuffle without the shard-order shuffle, to separate the two effects
def buffer_only(seq, buf, seed):
    rng = np.random.default_rng(seed); b, outl = [], []
    for x in seq:
        if len(b) < buf: b.append(x); continue
        j = int(rng.integers(buf)); outl.append(b[j]); b[j] = x
    rng.shuffle(b); return outl + b
for buf in (100, 1000):
    orders["buf_only%d" % buf] = buffer_only(orders["none"], buf, 42)

# PyTorch DataLoader over the same streaming dataset with 4 workers: each worker reads its own shards and collates its own
# batches, so a batch holds samples from one worker's shards only
import torch
from torch.utils.data import DataLoader
dl = DataLoader(ds.shuffle(seed=42, buffer_size=1000, max_buffer_input_shards=1), batch_size=B, num_workers=4, multiprocessing_context="fork", collate_fn=lambda xs: [x["shard"] for x in xs])  # fork: macOS default spawn cannot pickle the lambda
orders["dl4_hf_buf1000_mbis1"] = [s for batch in dl for s in batch]

# MosaicML Streaming: the shuffle algorithms are pure functions of shard sizes, canonical nodes, seed, epoch and block size
from streaming.base.shuffle import get_shuffle
sizes = np.array([S] * K, dtype=np.int64)
for algo in ("naive", "py1s", "py1br", "py1e"):
    for blk in (S, 1 << 18):
        o = get_shuffle(algo, sizes, 1, 9176, 0, blk)
        orders["mds_%s_blk%d" % (algo, blk)] = [int(x) // S for x in o]
for algo in ("py1s", "py1e"):  # several canonical nodes: the global order interleaves the nodes' shard groups
    o = get_shuffle(algo, sizes, 8, 9176, 0, S)
    orders["mds_%s_ncn8_blk%d" % (algo, S)] = [int(x) // S for x in o]

# Megatron-style: one global permutation of sample indices per epoch (gpt_dataset.py _build_shuffle_index)
orders["global"] = [int(x) // S for x in np.random.RandomState(1234).permutation(Ntot)]

def metrics(o):
    o = np.asarray(o); nb = len(o) // B; tv, distinct, top = [], [], []
    for b in range(nb):
        c = np.bincount(o[b * B:(b + 1) * B], minlength=K) / B
        tv.append(0.5 * np.abs(c - 1 / K).sum()); distinct.append(int((c > 0).sum())); top.append(float(c.max()))
    # where the first and last sample of every shard land, as a share of the stream (how long a shard stays "open")
    span = [float((np.where(o == k)[0].max() - np.where(o == k)[0].min() + 1) / len(o)) for k in range(K)]
    return {"n": int(len(o)), "batch_tv_mean": float(np.mean(tv)), "batch_distinct_mean": float(np.mean(distinct)),
            "batch_top_mean": float(np.mean(top)), "shard_span_mean": float(np.mean(span)), "tv_per_batch": [round(x, 4) for x in tv]}
res = {"K": K, "S": S, "batch": B, "names": names, "hf_num_shards": hf_nshards, "hf_num_shards_after_shuffle": hf_nshards_after, "orders": {}, "metrics": {},
       "versions": {"datasets": datasets.__version__, "torch": torch.__version__}}
import importlib.metadata as im
res["versions"]["mosaicml-streaming"] = im.version("mosaicml-streaming")
digits = "0123456789abcdefghijklmnopqrstuvwxyz"
for k, o in orders.items():
    assert sorted(o) == sorted(orders["none"]), k  # every scheme is a permutation: nothing lost, nothing repeated
    res["orders"][k] = "".join(digits[x] for x in o); res["metrics"][k] = metrics(o)
json.dump(res, open(out, "w"), indent=1)
for k, m in res["metrics"].items(): print("%-22s tv %.3f distinct %.2f top %.3f span %.3f" % (k, m["batch_tv_mean"], m["batch_distinct_mean"], m["batch_top_mean"], m["shard_span_mean"]))
