"""Data for the Grid and BlockSpec lab: for each kernel of the page, every grid step, which block of every operand
it uses, whether that block is copied (Pallas copies a block only when its index differs from the previous step's),
and whether the kernel body runs (its pl.when). Writes out/grid.json.

The index maps evaluated here are the kernels' own (pk_kernels.py, and the root lab's matmul); the body predicates are
the kernels' pl.when conditions written again in Python. The grid order is the TPU interpreter's, recorded with
grid_point_recorder on the real kernels (1 core: lexicographic; 2 cores with a "parallel" axis: shuffled on purpose).
Bytes are for the dtypes a TPU kernel would use (bf16 activations and weights, f32 statistics and outputs).
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import itertools, math
import numpy as np
import jax, jax.numpy as jnp
from jax.experimental.pallas import tpu as pltpu
import pk_common as P
import pk_kernels as K
import tp_kernels as TK

R = P.running_example()
B, H, T, D, dh = R["B"], R["H"], R["T"], R["D"], R["dh"]
LAB = []


def walk(name, title, grid, ops, run=lambda g: True, note="", variant=None, axes=None, sem=None):
    """ops: list of dict(name, kind in|out, shape (rows, cols) as drawn, block (rows, cols), map(g)->(r, c), bytes)."""
    steps = []
    prev = [None] * len(ops)
    copies = [0] * len(ops)
    for g in itertools.product(*[range(n) for n in grid]):
        idx = []
        cp = []
        for t, o in enumerate(ops):
            r = tuple(int(x) for x in o["map"](g))
            c = r != prev[t]
            if c:
                copies[t] += 1
            prev[t] = r
            idx.append(list(r)); cp.append(c)
        steps.append(dict(g=list(g), run=bool(run(g)), idx=idx, cp=cp))
    byt = [copies[t] * o["block"][0] * o["block"][1] * o["bytes"] for t, o in enumerate(ops)]
    LAB.append(dict(name=name, title=title, grid=list(grid), axes=axes, sem=sem, note=note, variant=variant,
                    ops=[dict(name=o["name"], kind=o["kind"], shape=list(o["shape"]), block=list(o["block"]),
                              bytes=o["bytes"]) for o in ops],
                    steps=steps, copies=copies, moved=byt,
                    min_bytes=[o["shape"][0] * o["shape"][1] * o["bytes"] for o in ops],
                    runs=sum(s["run"] for s in steps)))


# 1. bias + GELU
walk("bias_gelu", "Bias + exact GELU", (8,), [
    dict(name="x", kind="in", shape=(4096, 512), block=(512, 512), map=lambda g: (g[0], 0), bytes=2),
    dict(name="b", kind="in", shape=(1, 512), block=(1, 512), map=lambda g: (0, 0), bytes=2),
    dict(name="o", kind="out", shape=(4096, 512), block=(512, 512), map=lambda g: (g[0], 0), bytes=2)],
    axes=["i"], sem=["parallel"], note="The bias block never changes, so it is copied once (and the TPU lowering single-buffers it).")
# 2. softmax rows
walk("softmax", "Fused softmax (attention scores, all heads)", (32,), [
    dict(name="s", kind="in", shape=(16384, 128), block=(512, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="o", kind="out", shape=(16384, 128), block=(512, 128), map=lambda g: (g[0], 0), bytes=4)],
    axes=["i"], sem=["parallel"], note="Whole rows fit in a block: one read and one write per element.")
# 3. cross-entropy
walk("xent", "Fused cross-entropy (vocabulary 65)", (8,), [
    dict(name="logits", kind="in", shape=(4096, 65), block=(512, 65), map=lambda g: (g[0], 0), bytes=4),
    dict(name="labels", kind="in", shape=(4096, 1), block=(512, 1), map=lambda g: (g[0], 0), bytes=4),
    dict(name="loss", kind="out", shape=(4096, 1), block=(512, 1), map=lambda g: (g[0], 0), bytes=4)],
    axes=["i"], sem=["parallel"], note="65 columns are legal only because they are the whole row; in VMEM each row is padded to 128 lanes.")
# 4. layer norm forward and backward
walk("ln_fwd", "LayerNorm forward", (16,), [
    dict(name="x", kind="in", shape=(4096, 128), block=(256, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="scale", kind="in", shape=(1, 128), block=(1, 128), map=lambda g: (0, 0), bytes=4),
    dict(name="bias", kind="in", shape=(1, 128), block=(1, 128), map=lambda g: (0, 0), bytes=4),
    dict(name="y", kind="out", shape=(4096, 128), block=(256, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="mu", kind="out", shape=(4096, 1), block=(256, 1), map=lambda g: (g[0], 0), bytes=4),
    dict(name="rstd", kind="out", shape=(4096, 1), block=(256, 1), map=lambda g: (g[0], 0), bytes=4)],
    axes=["i"], sem=["parallel"])
walk("ln_bwd", "LayerNorm backward", (16,), [
    dict(name="x", kind="in", shape=(4096, 128), block=(256, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="dy", kind="in", shape=(4096, 128), block=(256, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="mu, rstd", kind="in", shape=(4096, 1), block=(256, 1), map=lambda g: (g[0], 0), bytes=8),
    dict(name="dx", kind="out", shape=(4096, 128), block=(256, 128), map=lambda g: (g[0], 0), bytes=4),
    dict(name="dscale", kind="out", shape=(1, 128), block=(1, 128), map=lambda g: (0, 0), bytes=4),
    dict(name="dbias", kind="out", shape=(1, 128), block=(1, 128), map=lambda g: (0, 0), bytes=4)],
    axes=["i"], sem=["arbitrary"],
    note="dscale and dbias are one block for the whole grid: it stays in VMEM, is added to at every step and written back once. That is why the axis must be \"arbitrary\".")
# 5. the root lab's matmul
walk("matmul", "Tiled matmul (the root lab's)", (8, 1, 4), [
    dict(name="A", kind="in", shape=(4096, 512), block=(512, 128), map=lambda g: (g[0], g[2]), bytes=2),
    dict(name="B", kind="in", shape=(512, 128), block=(128, 128), map=lambda g: (g[2], g[1]), bytes=2),
    dict(name="O", kind="out", shape=(4096, 128), block=(512, 128), map=lambda g: (g[0], g[1]), bytes=4)],
    axes=["i", "j", "k"], sem=["parallel", "parallel", "arbitrary"])
# 6. flash attention forward, one head, bq = bk = 32 (display size), naive and clamped K/V maps
bq = bk = 32
nq = nk = T // bq
fwd_run = lambda g: g[2] * bk <= g[1] * bq + bq - 1
for variant, kvm in (("naive", lambda b, i, j: (b, j, 0)), ("clamped", K.kv_map_clamped(bq, bk))):
    walk("flash_fwd", "Flash attention forward (one head)", (1, nq, nk), [
        dict(name="q", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
        dict(name="k", kind="in", shape=(128, 32), block=(32, 32), map=lambda g, kvm=kvm: kvm(*g)[1:], bytes=2),
        dict(name="v", kind="in", shape=(128, 32), block=(32, 32), map=lambda g, kvm=kvm: kvm(*g)[1:], bytes=2),
        dict(name="o", kind="out", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
        dict(name="lse", kind="out", shape=(128, 1), block=(32, 1), map=lambda g: (g[1], 0), bytes=4)],
        run=fwd_run, variant=variant, axes=["head", "q block i", "k block j"], sem=["parallel", "parallel", "arbitrary"],
        note="Blocks above the diagonal are skipped by pl.when; with the clamped map their K and V are not even copied.")
walk("flash_dkv", "Flash attention backward: dK, dV (one head)", (1, nk, nq), [
    dict(name="q", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[2], 0), bytes=2),
    dict(name="k", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
    dict(name="v", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
    dict(name="dO", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[2], 0), bytes=2),
    dict(name="lse, D", kind="in", shape=(128, 1), block=(32, 1), map=lambda g: (g[2], 0), bytes=8),
    dict(name="dK", kind="out", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
    dict(name="dV", kind="out", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2)],
    run=lambda g: g[2] * bq + bq - 1 >= g[1] * bk, axes=["head", "k block j", "q block i"],
    sem=["parallel", "parallel", "arbitrary"], note="Each key block stays put while every query block streams past it.")
walk("flash_dq", "Flash attention backward: dQ (one head)", (1, nq, nk), [
    dict(name="q", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
    dict(name="k", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[2], 0), bytes=2),
    dict(name="v", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[2], 0), bytes=2),
    dict(name="dO", kind="in", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2),
    dict(name="lse, D", kind="in", shape=(128, 1), block=(32, 1), map=lambda g: (g[1], 0), bytes=8),
    dict(name="dQ", kind="out", shape=(128, 32), block=(32, 32), map=lambda g: (g[1], 0), bytes=2)],
    run=fwd_run, axes=["head", "q block i", "k block j"], sem=["parallel", "parallel", "arbitrary"],
    note="The same loop as the forward. The production kernel splits the backward the same way: _flash_attention_bwd_dkv, then _flash_attention_bwd_dq.")
# 7. paged decode: the page pool of the real run (pk_run.py) with its page table
import json
pg = json.load(open(os.path.join(P.OUT, "kernels.json")))["paged"]
table = np.array(pg["table"]); lens = np.array(pg["lens"]); page = pg["page"]; npp = pg["npp"]; n_phys = pg["n_phys"]
tab_ok = np.where(table < 0, 0, table)
for variant, mp in (("naive", lambda s, p: (tab_ok[s, p], 0)),
                    ("clamped", lambda s, p: (tab_ok[s, min(p, (lens[s] - 1) // page)], 0))):
    walk("paged", "Paged decode attention (scalar prefetch)", (len(lens), npp), [
        dict(name="q", kind="in", shape=(8, 32), block=(1, 32), map=lambda g: (g[0], 0), bytes=2),
        dict(name="k pool", kind="in", shape=(n_phys * page, 32), block=(page, 32), map=lambda g, mp=mp: mp(*g), bytes=2),
        dict(name="v pool", kind="in", shape=(n_phys * page, 32), block=(page, 32), map=lambda g, mp=mp: mp(*g), bytes=2),
        dict(name="o", kind="out", shape=(8, 32), block=(1, 32), map=lambda g: (g[0], 0), bytes=2)],
        run=lambda g: g[1] * page < lens[g[0]], variant=variant, axes=["sequence s", "page p"],
        sem=["parallel", "arbitrary"],
        note="The page table and lengths arrive in SMEM before the grid starts (num_scalar_prefetch=2); the index map reads them.")

# ---- the grid order, recorded by the TPU interpreter on real kernels
def record(fn, cores=1, seed=0):
    pts = []

    def rec(tok, g, c):
        pts.append([int(t) for t in np.asarray(g)] + [int(c)])
        return tok
    ip = pltpu.InterpretParams(num_cores_or_threads=cores, random_seed=seed, grid_point_recorder=rec)
    jax.block_until_ready(fn(ip))
    return pts


S2 = jnp.zeros((16384, 128), jnp.float32)
order = {}
pts = record(lambda ip: K.softmax_rows(S2, interpret=ip))
order["softmax_1core"] = pts                          # "parallel" axis: shuffled by the interpreter even on 1 core
order["softmax_1core_lexicographic"] = pts == [[i, 0] for i in range(32)]
xz = jnp.zeros((4096, 128), jnp.float32); oz = jnp.ones((4096, 1), jnp.float32); gz = jnp.ones((128,), jnp.float32)
pts = record(lambda ip: K._ln_bwd_call(xz, gz, oz, oz, xz, 256, ip)[0])
order["ln_bwd_1core_lexicographic"] = pts == [[i, 0] for i in range(16)]   # "arbitrary": in order
order["softmax_2core"] = record(lambda ip: K.softmax_rows(S2, interpret=ip), cores=2)
q1 = R["q"][:1]; k1 = R["k"][:1]; v1 = R["v"][:1]
pts = record(lambda ip: K.flash_fwd(q1, k1, v1, bq=32, bk=32, interpret=ip)[0])
order["flash_1core"] = pts
order["flash_1core_lexicographic"] = pts == [[0, i, j, 0] for i in range(4) for j in range(4)]
order["flash_2core"] = record(lambda ip: K.flash_fwd(q1, k1, v1, bq=32, bk=32, interpret=ip)[0], cores=2)
P.save("grid.json", dict(kernels=LAB, order=order))
for L in LAB:
    print(L["name"], L["variant"], "steps", len(L["steps"]), "runs", L["runs"], "copies", L["copies"], "moved", sum(L["moved"]))
print({k_: v_ for k_, v_ in order.items() if not isinstance(v_, list)})
