"""Every calculated default the page shows, computed with the same formulas as the page's JavaScript
(src/parts/2*_js_*.js and 3*_js_*.js); check_page.mjs compares the two. No TPU used: calculations only.

Formulas
- matmul [m,k] x [k,n], b batched copies: FLOPs 2bmkn; bytes = b(mk*ba + kn*bw + mn*bo); time = max(FLOPs/peak, bytes/HBM bw)
- critical batch (scaling book, B << D, F): B > peak / bw * (weight bytes / activation bytes) / ... = peak/bw for bf16, half for int8 weights
- decode step (scaling book, inference chapter): B*KV(T)/bw_total + max(2*B*P/peak_total, P*wb/bw_total)
- HBM tiling (XLA docs/tiled_layout.md): last two dims padded to (8,128) tiles; second-minor of 1-2 -> (2,128), 3-4 -> (4,128)
- MXU utilisation: m k n / (pad8(m) padS(k) padS(n)), S = 128 or 256
- bf16 rounding: round to nearest even on the top 16 bits of the float32 pattern
"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, math
import numpy as np
import ml_dtypes
import tq_common as T

gens = {g["gen"]: g for g in json.load(open(os.path.join(T.OUT, "gens.json")))["gens"]}
R = {}

# 1. critical batches and scaling-book checks
R["bcrit"] = {k: [g["bf16"] / g["bw"], g["bf16"] / g["bw"] / 2] for k, g in gens.items()}
R["sb_v5e_240"] = 1.97e14 / 8.2e11                     # scaling book: 240
R["sb_ici_D"] = 2 * 1.97e14 / 4.5e10                   # scaling book: D > 8755
R["sb_q1_ms"] = 2 * 200e9 / 32 / 1.23e12 * 1e3          # scaling book TPU Q1: ~10 ms


def mm(b, m, k, n, ba=2, bw=2, bo=2):
    return 2 * b * m * k * n, b * (m * k * ba + k * n * bw + m * n * bo)


def t_bound(fl, by, g, peak=None):
    pk = peak or g["bf16"]
    return max(fl / pk, by / g["bw"]), ("compute" if fl / pk >= by / g["bw"] else "memory")


# 2. Llama 2 7B (MaxText configs/models/llama2-7b.yml) per-layer op list at n tokens, sequence S
L7 = dict(D=4096, F=11008, L=32, Hq=32, Hkv=32, dh=128, V=32000)


def ops7(n, S, wbytes=2):
    D, F, Hq, Hkv, dh, V = (L7[k] for k in ("D", "F", "Hq", "Hkv", "dh", "V"))
    nb = max(1, n // S)
    out = [("q, o projections (x2)", 2, mm(1, n, D, Hq * dh, 2, wbytes)),
           ("k, v projections (x2)", 2, mm(1, n, D, Hkv * dh, 2, wbytes)),
           ("MLP gate, up (x2)", 2, mm(1, n, D, F, 2, wbytes)),
           ("MLP down", 1, mm(1, n, F, D, 2, wbytes)),
           ("attention scores QK^T", 1, mm(nb * Hq, S, dh, S)),
           ("attention x V", 1, mm(nb * Hq, S, S, dh))]
    return out


def layer_time(n, S, gk, wbytes=2):
    g = gens[gk]; tot = 0; rows = []
    for name, cnt, (fl, by) in ops7(n, S, wbytes):
        t, bound = t_bound(fl, by, g)
        rows.append([name, cnt, fl, by, fl / by, t * cnt, bound]); tot += t * cnt
    return tot, rows


R["l7_layer"] = {gk: {str(n): layer_time(n, 4096 if n >= 4096 else n, gk)[0] for n in (1, 128, 4096)} for gk in gens}
# 3. the MLP-up roofline walk (Reading animation): Llama 2 7B, [B,4096] x [4096,11008] bf16
R["walk"] = {gk: [[B] + list(mm(1, B, 4096, 11008)) + [t_bound(*mm(1, B, 4096, 11008), gens[gk])[0]] for B in (1, 8, 32, 128, 256, 512, 1024, 4096)] for gk in gens}


# 4. decode model (scaling book), Llama 2 7B
def kv_per_token(m=L7, kvb=2):
    return 2 * m["L"] * m["Hkv"] * m["dh"] * kvb


P7 = 6738415616                                        # root TPU lab, from MaxText llama2-7b.yml
PMM = P7 - L7["V"] * L7["D"]                           # weights a decode step reads in matmuls (the embedding table is only gathered)


def decode(gk, B, Tctx, chips=1, wb=2, kvb=2):
    g = gens[gk]
    bw, pk = g["bw"] * chips, g["bf16"] * chips
    att = B * kv_per_token(kvb=kvb) * Tctx / bw
    lin = max(2 * B * PMM / pk, PMM * wb / bw)
    mem = P7 * wb + B * kv_per_token(kvb=kvb) * Tctx
    return dict(att=att, lin=lin, step=att + lin, tok_s=B / (att + lin), mem=mem, fits=mem <= g["hbm"] * chips)


R["kv_tok"] = kv_per_token()
R["decode"] = {gk: {str(B): decode(gk, B, 2048) for B in (1, 16, 64, 240)} for gk in gens}
R["pmm"] = PMM
R["decode_v5e_b1_noctx"] = PMM * 2 / gens["v5e"]["bw"] * 1e3      # root lab: 16.1 ms


# 5. tiling and MXU padding
def pad(v, m):
    return -(-v // m) * m


def hbm_tile(rows, cols):
    t = 2 if rows <= 2 else 4 if rows <= 4 else 8
    return pad(rows, t) * pad(cols, 128), t


def mxu_util(m, k, n, S):
    return m * k * n / (pad(m, 8) * pad(k, S) * pad(n, S))


ARR = [("running example: output head W [128, 65]", 128, 65), ("running example: token embedding [65, 128]", 65, 128),
       ("running example: one head's q [128 positions, 32]", 128, 32), ("running example: MLP W1 [128, 512]", 128, 512),
       ("GPT-2 vocabulary head [768, 50257]", 768, 50257), ("padded vocabulary [768, 50304]", 768, 50304),
       ("Llama 2 7B MLP W [4096, 11008]", 4096, 11008), ("a bias vector [1, 4096]", 1, 4096), ("a [3, 4096] array", 3, 4096)]
R["tiles"] = [[n, r, c, hbm_tile(r, c)[0] / (r * c), hbm_tile(r, c)[1]] for n, r, c in ARR]
MM = [("running example q projection", 4096, 128, 128), ("running example output head", 4096, 128, 65),
      ("running example attention scores (head_dim 32)", 128, 32, 128), ("Llama 2 7B MLP up", 4096, 4096, 11008),
      ("head_dim 64 scores", 4096, 64, 4096), ("head_dim 128 scores", 4096, 128, 4096), ("decode, batch 1", 1, 4096, 11008)]
R["mxu"] = [[n, m, k, nn, mxu_util(m, k, nn, 128), mxu_util(m, k, nn, 256)] for n, m, k, nn in MM]

# 6. bf16 rounding check values (the JS bf16() must agree)
vals = np.array([0.1, 1.0 / 3.0, -2.718281828, 3.14159265, 1e-3, 65504.0, 0.0071, 123.456], np.float32)
R["bf16_vals"] = [[float(v), float(v.astype(ml_dtypes.bfloat16).astype(np.float32))] for v in vals]
# three-way split of 1/3 and pi: hi, mid, lo
def split(v):
    v = np.float32(v); hi = v.astype(ml_dtypes.bfloat16).astype(np.float32); r = np.float32(v - hi)
    mid = r.astype(ml_dtypes.bfloat16).astype(np.float32); lo = np.float32(r - mid).astype(ml_dtypes.bfloat16).astype(np.float32)
    return [float(hi), float(mid), float(lo)]
R["split"] = {str(float(np.float32(v))): split(v) for v in (1.0 / 3.0, 3.14159265)}

for k in ("bcrit", "sb_v5e_240", "sb_ici_D", "sb_q1_ms", "decode_v5e_b1_noctx", "kv_tok"):
    print(k, R[k])
print("tiles", [(t[0][:22], round(t[3], 3)) for t in R["tiles"]])
print("mxu", [(t[0][:22], round(t[4], 3), round(t[5], 3)) for t in R["mxu"]])
print("decode v5e", {b: round(v["step"] * 1e3, 2) for b, v in R["decode"]["v5e"].items()})
T.save("recompute.json", R)
