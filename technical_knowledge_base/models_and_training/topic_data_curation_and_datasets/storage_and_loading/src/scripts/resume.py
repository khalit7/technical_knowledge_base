"""Resumption mid-epoch and the IterableDataset worker trap, with the real libraries on CPU; deterministic (seeded).
For each loader: run one epoch uninterrupted; run again, stop after K samples, save whatever state the library offers,
build a fresh loader, restore, finish the epoch. Compare the two epochs: same order after the stop?, samples never seen,
samples seen twice.
  nice -n 15 <venv>/bin/python -I resume.py <shard dir with shard-*.parquet (from shuffle.py)> <workdir> <out.json>
"""
import glob, json, os, shutil, sys
import numpy as np, torch
from torch.utils.data import DataLoader, Dataset, IterableDataset, get_worker_info

shard_dir, work, out = sys.argv[1], sys.argv[2], sys.argv[3]
shutil.rmtree(work, ignore_errors=True); os.makedirs(work)
paths = sorted(glob.glob(os.path.join(shard_dir, "shard-*.parquet")))
res = {}
B, STOP = 32, 20  # batch size, batches before the interruption

def compare(full, first, rest):
    resumed = first + rest; n = len(full); k = len(first)
    after_full, after_res = full[k:], rest
    seen = {}
    for x in resumed: seen[x] = seen.get(x, 0) + 1
    return {"epoch_len": n, "stopped_after": k, "resumed_len": len(resumed), "same_order_after_stop": after_full == after_res,
            "never_seen": sum(1 for x in full if x not in seen), "seen_twice": sum(1 for v in seen.values() if v > 1),
            "first_mismatch": next((i for i, (a, b) in enumerate(zip(after_full, after_res)) if a != b), None)}

# 1. map-style dataset with a shuffling sampler ----------------------------------------------------
class Ids(Dataset):
    def __init__(self, n): self.n = n
    def __len__(self): return self.n
    def __getitem__(self, i): return i
N = 2200
def plain_loader(seed):
    g = torch.Generator(); g.manual_seed(seed)
    return DataLoader(Ids(N), batch_size=B, shuffle=True, generator=g, num_workers=0)
full = [int(x) for b in plain_loader(0) for x in b]
it = iter(plain_loader(0)); first = [int(x) for _ in range(STOP) for x in next(it)]
# (a) naive: the job restarts the epoch from the top with the same seed (no data state saved)
rest_naive = [int(x) for b in plain_loader(0) for x in b]
r = compare(full, first, rest_naive); r["note"] = "restart the epoch from the start, same seed"; res["naive_restart"] = r
# (b) naive with a fresh seed: no repeats of order, but the first K samples come back and others are dropped at epoch end
rest_seed = [int(x) for b in plain_loader(1) for x in b][: N - len(first)]
r = compare(full, first, rest_seed); r["note"] = "restart with a new seed, stop at the epoch's sample budget"; res["new_seed_restart"] = r
# (c) Megatron-style: the order is a pure function of (seed, epoch); keep consumed_samples and skip ahead
#     (MegatronPretrainingSampler.__iter__ starts at consumed_samples, data_samplers.py 190-198 at 80781ab)
perm = np.random.RandomState(1234).permutation(N).tolist()
consumed = STOP * B
r = compare(perm, perm[:consumed], perm[consumed:]); r["note"] = "global permutation from the seed; resume at consumed_samples"; res["megatron_consumed_samples"] = r
# (d) torchdata StatefulDataLoader: state_dict() mid-epoch, load_state_dict() into a fresh loader, 2 workers
from torchdata.stateful_dataloader import StatefulDataLoader
def sdl(seed):
    g = torch.Generator(); g.manual_seed(seed)
    return StatefulDataLoader(Ids(N), batch_size=B, shuffle=True, generator=g, num_workers=2, multiprocessing_context="fork")
full_s = [int(x) for b in sdl(0) for x in b]
l1 = sdl(0); it = iter(l1); first = [int(x) for _ in range(STOP) for x in next(it)]; st = l1.state_dict(); del it, l1
l2 = sdl(0); l2.load_state_dict(st); rest = [int(x) for b in l2 for x in b]
r = compare(full_s, first, rest); r["note"] = "torchdata StatefulDataLoader, 2 workers"; res["torchdata_stateful"] = r

# 2. Hugging Face streaming IterableDataset with a shuffle buffer: state_dict() after K samples ------------
import datasets
datasets.disable_progress_bars()
ds = datasets.load_dataset("parquet", data_files=paths, split="train", streaming=True)
key = lambda e: e["shard"] * 10000 + e["i"]
for buf in (100, 1000):
    sh = ds.shuffle(seed=42, buffer_size=buf)
    full_h = [key(e) for e in sh]
    it = iter(sh); first = [key(next(it)) for _ in range(STOP * B)]; st = sh.state_dict()
    sh2 = ds.shuffle(seed=42, buffer_size=buf); sh2.load_state_dict(st); rest = [key(e) for e in sh2]
    r = compare(full_h, first, rest); r["note"] = "datasets IterableDataset.state_dict(), shuffle buffer %d" % buf; res["hf_buffer%d" % buf] = r
# without a shuffle buffer the state is exact
full_h = [key(e) for e in ds]; it = iter(ds); first = [key(next(it)) for _ in range(STOP * B)]; st = ds.state_dict()
ds2 = datasets.load_dataset("parquet", data_files=paths, split="train", streaming=True); ds2.load_state_dict(st)
r = compare(full_h, first, [key(e) for e in ds2]); r["note"] = "datasets IterableDataset.state_dict(), no shuffle"; res["hf_noshuffle"] = r

# 3. MosaicML Streaming: local MDS, StreamingDataset state_dict(num_samples) -----------------------------
from streaming import MDSWriter, StreamingDataset
import pyarrow.parquet as pq
mds = os.path.join(work, "mds")
with MDSWriter(out=mds, columns={"shard": "int", "i": "int"}, size_limit=1 << 12) as w:
    for p in paths:
        for row in pq.read_table(p, columns=["shard", "i"]).to_pylist(): w.write(row)
from streaming.base.util import clean_stale_shared_memory
def sds():
    clean_stale_shared_memory()
    return StreamingDataset(local=mds, shuffle=True, shuffle_seed=9176, batch_size=B, num_canonical_nodes=1)
try:
    d1 = sds(); full_m = [key(e) for e in d1]; del d1
    d1 = sds(); it = iter(d1); first = [key(next(it)) for _ in range(STOP * B)]; st = d1.state_dict(STOP * B, from_beginning=True); del it, d1
    d2 = sds(); d2.load_state_dict(st); rest = [key(e) for e in d2]
    r = compare(full_m, first, rest); r["note"] = "MosaicML StreamingDataset.state_dict(num_samples), py1e default"; r["state"] = st; res["mosaic_streaming"] = r
except Exception as e:
    res["mosaic_streaming"] = {"error": repr(e)[:300]}

# 4. The IterableDataset worker trap -----------------------------------------------------------------
class Naive(IterableDataset):
    def __iter__(self): return iter(range(1000))
class Sharded(IterableDataset):
    def __iter__(self):
        w = get_worker_info(); k, n = (w.id, w.num_workers) if w else (0, 1)
        return iter(range(k, 1000, n))
for name, D in (("naive", Naive), ("sharded", Sharded)):
    got = [int(x) for b in DataLoader(D(), batch_size=50, num_workers=4, multiprocessing_context="fork") for x in b]
    res["worker_trap_" + name] = {"samples": len(got), "distinct": len(set(got)), "expected": 1000}

import importlib.metadata as im
res["versions"] = {p: im.version(p) for p in ("torch", "torchdata", "datasets", "mosaicml-streaming")}
json.dump(res, open(out, "w"), indent=1)
for k, v in res.items(): print(k, {kk: vv for kk, vv in v.items() if kk != "state"} if isinstance(v, dict) else v)
