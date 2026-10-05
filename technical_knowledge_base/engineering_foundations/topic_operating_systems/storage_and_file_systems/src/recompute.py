"""Recompute every derived number on the page from raw/ (via gen_data's output) into recompute.txt:
the readahead windows from the v5.10 source rules against the measurement, Little's law, ratios quoted in prose,
the ext4 extent arithmetic, and the illustrative fsync time."""
import json, math, pathlib
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
out = []
P = out.append
# readahead: mm/readahead.c v5.10 get_init_ra_size (line 311), get_next_ra_size (line 329)
def pow2(n):
    p = 1
    while p < n: p *= 2
    return p
def init(req, mx):
    s = pow2(req); return s * 4 if s <= mx / 32 else s * 2 if s <= mx / 4 else mx
def nxt(cur, mx): return 4 * cur if cur < mx / 16 else 2 * cur if cur <= mx / 2 else mx
def predict(mx, n):
    ev = {0: init(1, mx)}; start, size = 0, ev[0]; marker = start + size - (size - 1)
    for i in range(1, n):
        if i == marker: start += size; size = nxt(size, mx); ev[i] = size; marker = start
    return ev
for j, mx in ((0, 32), (1, 64)):
    r = D["ra"][j]; p = predict(mx, r["reads"]); m = {e[0]: e[2] for e in r["ev"]}
    P(f"readahead {r['label']}: predicted {len(p)} requests {sum(p.values())} pages; measured {len(m)} requests {sum(m.values())} pages; identical: {p == m}")
q = {k: D["fio"][f"randread_4k_qd{k}"] for k in (1, 4, 16, 64)}
for k, v in q.items(): P(f"Little's law QD {k}: {k} / {v['mean']} us = {k / (v['mean'] * 1e-6):,.0f} per s; measured {v['iops']:,.0f} ({100 * (k / (v['mean'] * 1e-6) / v['iops'] - 1):+.1f}%)")
P(f"QD 1 to 64: throughput x{q[64]['iops'] / q[1]['iops']:.1f}, mean latency x{q[64]['mean'] / q[1]['mean']:.1f}")
S = {(r['fs'], r['shape'], r['mode']): r['med'] for r in D['sync']}
P(f"overwrite fsync / fdatasync = {S['ext4','overwrite','fsync'] / S['ext4','overwrite','fdatasync']:.2f}; append = {S['ext4','append','fsync'] / S['ext4','append','fdatasync']:.2f}")
M = {r['label']: r['ms'] for r in D['meta']}
P(f"small files cold / big file cold = {M['read 10,240 small files, data cold'] / M['read the big file, cold']:.1f}")
P(f"ext4 extent: ceil(3,000,000 / 4096) = {math.ceil(3_000_000 / 4096)} blocks; x8 sectors = {math.ceil(3_000_000 / 4096) * 8}")
P(f"illustrative fsync of 256 MiB at 250 MB/s: {256 * 2**20 / 1e6:.1f} MB / 250 = {256 * 2**20 / 250e6:.2f} s")
C = {r['label']: r for r in D['ckpt']}
n, sf = C['torch.save straight to ckpt.pt'], C['tmp + fsync + rename + fsync(dir)']
P(f"safe - naive = {sf['med'] - n['med']:.1f} ms; fsync variant - naive = {C['torch.save + flush + fsync']['med'] - n['med']:.1f} ms")
pr = [D['wb'][k]['last_dirty_s'] for k in ('primed', 'primed2', 'primed3', 'primed4')]
P(f"writeback: fresh small {D['wb']['small']['last_dirty_s']} s, mid {D['wb']['mid']['last_dirty_s']} s, primed {pr}")
P(f"root checkpoint state 276,813 bytes = {276813 / 1e6:.2f} MB")
pathlib.Path("recompute.txt").write_text("\n".join(out) + "\n"); print("\n".join(out))
