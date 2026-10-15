"""Data for the Flash tiles lab: the online softmax of the flash forward kernel, replayed step by step on real numbers.
Writes out/tiles.json.

Head 0 of sequence 0 of the running example, layer 1, training batch 0, with the weights after the 500-step run
(at initialisation attention is nearly uniform, so rescaling hardly matters; trained, it does): the query block of rows 96..127
(bq = 32) against 8 key blocks of 16 (bk = 16), exactly the arithmetic of flash_fwd_kernel in pk_kernels.py,
in float32 NumPy. Also the same loop without the rescaling factor alpha (the wrong version), and the kernel itself
run with these block sizes to check the replay against it.
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import math
import numpy as np
import jax, jax.numpy as jnp
import pk_common as P
import pk_kernels as K
import tp_kernels as TK

R = P.running_example()
T, dh = R["T"], R["dh"]
Q, Kk, Vv = P.trained_qkv(1)
q = np.asarray(Q[0], np.float32); k = np.asarray(Kk[0], np.float32); v = np.asarray(Vv[0], np.float32)
bq, bk, qi = 32, 16, 3
rows = np.arange(qi * bq, qi * bq + bq)
scale = np.float32(1 / math.sqrt(dh))
S = (q[rows] @ k.T) * scale                                    # (32, 128) scores of this query block
mask = np.arange(T)[None, :] <= rows[:, None]
Sm = np.where(mask, S, -np.inf).astype(np.float32)
ref = np.asarray(TK.attention_reference(Q[:1], Kk[:1], Vv[:1]))[0][rows]   # (32, 32)
focus = 100 - qi * bq                                          # row 100 of the sequence (index 4 in the block)

steps = []
m = np.full((bq, 1), -np.inf, np.float32); l = np.zeros((bq, 1), np.float32); acc = np.zeros((bq, dh), np.float32)
m2 = np.full((bq, 1), -np.inf, np.float32); l2 = np.zeros((bq, 1), np.float32); acc2 = np.zeros((bq, dh), np.float32)
for j in range(T // bk):
    s = Sm[:, j * bk:(j + 1) * bk]
    m_new = np.maximum(m, s.max(1, keepdims=True))
    p = np.exp(s - m_new)
    alpha = np.exp(m - m_new)
    l = alpha * l + p.sum(1, keepdims=True)
    acc = alpha * acc + p @ v[j * bk:(j + 1) * bk]
    # the wrong version: each block normalised by its own max, nothing rescaled afterwards
    mb = s.max(1, keepdims=True)
    pb = np.where(np.isfinite(mb), np.exp(s - np.where(np.isfinite(mb), mb, 0)), 0)
    l2 = l2 + pb.sum(1, keepdims=True)
    acc2 = acc2 + pb @ v[j * bk:(j + 1) * bk]
    m2 = np.maximum(m2, mb)
    with np.errstate(invalid="ignore", divide="ignore"):
        cur = acc / l
        cur2 = acc2 / l2
    steps.append(dict(
        j=j, alpha=[float(a) if np.isfinite(a) else None for a in alpha[:, 0]],
        m=[float(x) if np.isfinite(x) else None for x in m_new[:, 0]], l=[float(x) for x in l[:, 0]],
        tile_max=[float(x) if np.isfinite(x) else None for x in s.max(1)],
        focus_acc=[float(x) for x in acc[focus]], focus_out=[float(x) for x in cur[focus]],
        focus_out_wrong=[float(x) if np.isfinite(x) else None for x in cur2[focus]],
        focus_alpha=float(alpha[focus, 0]) if np.isfinite(alpha[focus, 0]) else None,
        err_rows_now=float(np.nanmax(np.abs(cur - ref))) if j == T // bk - 1 else None))
    m = m_new
out = acc / l
wrong = acc2 / l2
o_k = np.asarray(K.flash_fwd(Q[:1], Kk[:1], Vv[:1], bq=bq, bk=bk)[0])[0][rows]
P.save("tiles.json", dict(
    head="sequence 0, head 0, layer 1, trained 500 steps", rows=[int(rows[0]), int(rows[-1])], bq=bq, bk=bk, focus_row=100, dh=dh,
    scores=[[None if not np.isfinite(x) else round(float(x), 3) for x in r] for r in Sm],
    probs_focus=[float(x) for x in np.exp(Sm[focus] - Sm[focus].max()) / np.exp(Sm[focus] - Sm[focus].max()).sum()],
    v_focus_dims=[float(x) for x in ref[focus]],
    steps=steps, err_online=float(np.abs(out - ref).max()), err_wrong=float(np.abs(wrong - ref).max()),
    err_wrong_focus=float(np.abs(wrong[focus] - ref[focus]).max()), err_kernel_vs_replay=float(np.abs(o_k - out).max()),
    err_kernel=float(np.abs(o_k - ref).max()), max_ref=float(np.abs(ref).max()),
    floats_naive=int(bq * T), floats_online=int(bq * bk + 2 * bq + bq * dh)))
print("online", float(np.abs(out - ref).max()), "wrong", float(np.abs(wrong - ref).max()), "kernel", float(np.abs(o_k - out).max()))
