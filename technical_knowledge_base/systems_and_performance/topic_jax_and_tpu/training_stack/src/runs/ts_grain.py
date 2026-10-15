"""grain determinism on the running example's data (training_stack page, section 6 and the Data lab tab).

The training text cut into 7,781 non-overlapping windows of 129 characters. Each record carries its window
index so every batch can be identified. Experiments:
G1 order: MapDataset.shuffle(seed) pipeline, first batches, with 0, 2 and 4 worker processes (mp_prefetch);
   and the DataLoader API (IndexSampler) with 0 and 2 workers.
G2 epochs: shuffle then repeat (reseeded per epoch) vs repeat(reseed_each_epoch=False).
G3 random_map: a random crop offset drawn from the per-record generator; same values for any worker count.
G4 filter before mp_prefetch: grain's own warning that output may change with the worker count; measured.
G5 checkpoint mid-stream with workers: get_state, a fresh iterator, set_state, the next batches.
G6 two simulated hosts: ShardOptions / slicing; disjoint and complete.
G7 throughput with a slow per-record map (2 ms) for 0, 1, 2, 4 workers (timing: rough).
G8 the PyTorch contrast: DataLoader with a seeded generator; random augmentation inside __getitem__
   with num_workers 0 vs 2 (torch seeds each worker differently).
Output: out/grain.json
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ts_common as T  # noqa: E402

import numpy as np  # noqa: E402

C = T.C
SEQ, B = C.CFG["ctx"] + 1, C.CFG["batch"]
NB = 6   # batches recorded per run


def windows():
    train, _ = C.tokens()
    n = len(train) // SEQ
    return train[: n * SEQ].reshape(n, SEQ)


def add_index(i_w):
    return i_w


class Indexed:
    """Random-access source returning (window index, window)."""

    def __init__(self):
        self.w = windows()

    def __len__(self):
        return len(self.w)

    def __getitem__(self, i):
        return {"idx": np.int32(i), "x": self.w[i].astype(np.int32)}


def crop(rec, rng):
    # a random offset 0..7 into the window: data augmentation drawn from grain's per-record generator
    rec = dict(rec)
    rec["off"] = np.int32(rng.integers(0, 8))
    return rec


def keep(rec):
    return int(rec["idx"]) % 5 != 0          # drop every fifth window: a many-to-one transformation


def slow(rec):
    time.sleep(0.002)          # waits without holding the GIL, like reading a file
    return rec


def busy(rec):
    t = time.perf_counter()
    while time.perf_counter() - t < 0.002:   # 2 ms of pure-Python work, holding the GIL
        pass
    return rec


def ids(batch):
    return [int(v) for v in np.asarray(batch["idx"]).ravel()]


def offs(batch):
    return [int(v) for v in np.asarray(batch["off"]).ravel()]


def pipe(workers=0, cfg="A", slow_map=False, busy_map=False):
    """A: MapDataset.batch, then to_iter_dataset, then mp_prefetch (batches are the records workers share out).
    B: to_iter_dataset().batch() then mp_prefetch (each worker batches its own slice).
    C: MapDataset.filter, to_iter_dataset, mp_prefetch, then batch in the main process.
    D: as C without the filter."""
    import grain
    ds = grain.MapDataset.source(Indexed()).shuffle(seed=0).random_map(crop, seed=1)
    if slow_map:
        ds = ds.map(slow)
    if busy_map:
        ds = ds.map(busy)
    if cfg == "C":
        ds = ds.filter(keep)
    opts = grain.MultiprocessingOptions(num_workers=workers)
    if cfg == "A":
        it = ds.batch(B, drop_remainder=True).to_iter_dataset()
        return it.mp_prefetch(opts) if workers else it
    if cfg == "B":
        it = ds.to_iter_dataset().batch(B, drop_remainder=True)
        return it.mp_prefetch(opts) if workers else it
    it = ds.to_iter_dataset()
    if workers:
        it = it.mp_prefetch(opts)
    return it.batch(B, drop_remainder=True)


def take(it, n):
    i = iter(it)
    out = [next(i) for _ in range(n)]
    return i, out


def main():
    import grain
    from absl import flags
    flags.FLAGS.mark_as_parsed()      # grain reads absl flags in worker setup; a plain script never parsed them
    R = {"versions": T.versions(), "n_windows": len(windows()), "batch": B}
    # G1 order, configs A to D, 0/2/4 workers
    g1, offmap = {}, {}
    for cfg in ("A", "B", "C", "D"):
        for w in (0, 2, 4):
            _, bs = take(pipe(w, cfg), NB)
            g1["%s%d" % (cfg, w)] = [ids(b) for b in bs]
            if cfg == "A":
                offmap[w] = {i: o for b in bs for i, o in zip(ids(b), offs(b))}
    for w in (0, 2):
        for rep in (0, 1):
            dl = grain.DataLoader(data_source=Indexed(),
                                  sampler=grain.samplers.IndexSampler(num_records=len(windows()), shard_options=grain.sharding.NoSharding(),
                                                                      shuffle=True, num_epochs=1, seed=0),
                                  operations=[grain.transforms.Batch(batch_size=B, drop_remainder=True)], worker_count=w)
            it = iter(dl)
            g1["DL%d_run%d" % (w, rep)] = [ids(next(it)) for _ in range(NB)]
    R["G1"] = {k: v[:2] for k, v in g1.items()}
    R["G1_equal"] = {cfg: {"0_2": g1[cfg + "0"] == g1[cfg + "2"], "0_4": g1[cfg + "0"] == g1[cfg + "4"]} for cfg in "ABCD"}
    R["G1_equal"]["DL"] = {"0_2": g1["DL0_run0"] == g1["DL2_run0"], "rerun_2": g1["DL2_run0"] == g1["DL2_run1"],
                           "rerun_0": g1["DL0_run0"] == g1["DL0_run1"], "DL0_vs_A0_first_batch_overlap": len(set(g1["DL0_run0"][0]) & set(g1["A0"][0]))}
    R["G1_B_vs_A_first_batch_overlap"] = len(set(g1["B2"][0]) & set(g1["A2"][0]))
    common = set(offmap[0]) & set(offmap[4])
    R["G3"] = {"records_compared": len(common), "offsets_equal": all(offmap[0][i] == offmap[4][i] for i in common),
               "example": [[i, offmap[0][i]] for i in sorted(common)[:6]]}
    print("G1", R["G1_equal"], "G3", R["G3"]["offsets_equal"], R["G3"]["records_compared"])
    # G2 epochs
    n = len(windows())
    ds = grain.MapDataset.source(Indexed()).shuffle(seed=0)
    rep = ds.repeat(2)
    rep_same = ds.repeat(2, reseed_each_epoch=False)
    R["G2"] = {"epoch0_first8": [int(rep[i]["idx"]) for i in range(8)],
               "epoch1_first8_reseeded": [int(rep[n + i]["idx"]) for i in range(8)],
               "epoch1_first8_not_reseeded": [int(rep_same[n + i]["idx"]) for i in range(8)],
               "random_access_record_100000": int(grain.MapDataset.source(Indexed()).shuffle(seed=0).repeat()[100000]["idx"])}
    print("G2", R["G2"])
    # G5 checkpoint with workers (config A, 2 workers)
    it, first = take(pipe(2, "A"), 7)
    state = it.get_state()
    after = [ids(next(it)) for _ in range(3)]
    it2 = iter(pipe(2, "A"))
    it2.set_state(state)
    resumed = [ids(next(it2)) for _ in range(3)]
    it0 = iter(pipe(0, "A"))
    R["G5"] = {"state": T.scrub(str(state))[:900], "after": after, "resumed": resumed, "equal": after == resumed,
               "state_0_workers": T.scrub(str(it0.get_state())),
               "load_into_0_workers_error": T.err_text(lambda: it0.set_state(state))}
    print("G5", R["G5"]["equal"], R["G5"]["load_into_0_workers_error"], R["G5"]["state"][:300])
    # G6 two simulated hosts
    g6 = {}
    for k in (0, 1):
        dl = grain.DataLoader(data_source=Indexed(),
                              sampler=grain.samplers.IndexSampler(num_records=n, shard_options=grain.sharding.ShardOptions(shard_index=k, shard_count=2, drop_remainder=True),
                                                                  shuffle=True, num_epochs=1, seed=0),
                              operations=[grain.transforms.Batch(batch_size=B // 2, drop_remainder=True)], worker_count=0)
        allids = [i for b in dl for i in ids(b)]
        g6[str(k)] = {"first_batch": allids[: B // 2], "n": len(allids), "min": min(allids), "max": max(allids)}
        g6[str(k)]["_all"] = allids
    a, b = set(g6["0"].pop("_all")), set(g6["1"].pop("_all"))
    R["G6"] = {"hosts": g6, "disjoint": len(a & b) == 0, "union": len(a | b), "n": n}
    sl = [list(grain.MapDataset.source(Indexed()).shuffle(seed=0)[k::2][:4]) for k in (0, 1)]
    R["G6"]["map_slice_first4"] = [[int(r["idx"]) for r in s] for s in sl]
    print("G6", R["G6"]["disjoint"], R["G6"]["union"])
    # G7 throughput
    g7 = []
    for kind in ("sleep", "busy"):
        for w in (0, 2, 4):
            with T.Timer() as t0:
                it = iter(pipe(w, "A", slow_map=kind == "sleep", busy_map=kind == "busy"))
                next(it)                                  # includes starting the worker processes
            with T.Timer() as t:
                for _ in range(60):
                    next(it)
            g7.append({"kind": kind, "workers": w, "first_batch_s": round(t0.wall, 2), "batches_per_s": round(60 / t.wall, 2),
                       "wall_s": round(t.wall, 2)})
            print(g7[-1], flush=True)
            if hasattr(it, "close"):
                it.close()
    R["G7"] = {"rows": g7, "per_record_ms": 2, "read_threads_default": 16, "per_batch_ms_serial": 2 * B, "load": T.load_avg()}
    print("G7", g7)
    T.save("grain", R)


if __name__ == "__main__":
    main()
