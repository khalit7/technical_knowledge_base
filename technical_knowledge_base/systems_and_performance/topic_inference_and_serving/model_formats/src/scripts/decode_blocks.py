"""Decode real quantized bytes by hand: one GGUF Q4_K super-block and one MLX 4-bit group.

Usage: INF_DIR=... python3 -I decode_blocks.py <out.json>
Both come from the same original weights (Qwen3-0.6B, layer 0 attention K projection, first row),
so the decoded values can be compared with the BF16 originals in model.safetensors.
GGUF Q4_K layout: llama.cpp b11146 ggml/src/ggml-common.h L325-L338 (d, dmin as F16; 12 bytes of
6-bit scales and mins; 128 bytes of 4-bit quants); unpacking follows dequantize_row_q4_K and
get_scale_min_k4 in ggml/src/ggml-quants.c. Cross-checked against gguf-py's dequantize.
MLX affine layout: w = scale * q + bias per group of 64, q packed 8 per uint32, lowest bits first.
"""
import os, sys, json, struct, numpy as np

INF = os.environ['INF_DIR']
NAME_HF = 'model.layers.0.self_attn.k_proj.weight'


def st_tensor(path, name):
    with open(path, 'rb') as f:
        n = struct.unpack('<Q', f.read(8))[0]; h = json.loads(f.read(n)); base = 8 + n
        t = h[name]; a, b = t['data_offsets']; f.seek(base + a); raw = f.read(b - a)
    return t, raw, base + a


def bf16(raw):
    return (np.frombuffer(raw, np.uint16).astype(np.uint32) << 16).view(np.float32)


t, raw, off_hf = st_tensor(os.path.join(INF, 'models/hf/Qwen3-0.6B/model.safetensors'), NAME_HF)
orig = bf16(raw).reshape(t['shape'])  # [1024 out, 1024 in]
row0 = orig[0]
res = {'hf': {'tensor': NAME_HF, 'shape': t['shape'], 'abs_offset': off_hf, 'first8_hex': raw[:8].hex(), 'first4': row0[:4].tolist()}}

# ---- GGUF Q4_K (Qwen3-0.6B-Q4_K_M.gguf, made here with llama-quantize from BF16)
from gguf import GGUFReader
from gguf.quants import dequantize
rd = GGUFReader(os.path.join(INF, 'models/gguf/Qwen3-0.6B-Q4_K_M.gguf'))
gt = [x for x in rd.tensors if x.name == 'blk.0.attn_k.weight'][0]
blk = bytes(np.array(gt.data).reshape(-1)[:144].tobytes())
d = np.frombuffer(blk[0:2], np.float16)[0].astype(np.float32)
dmin = np.frombuffer(blk[2:4], np.float16)[0].astype(np.float32)
sc = blk[4:16]; qs = blk[16:144]


def scale_min(j):  # get_scale_min_k4
    if j < 4:
        return sc[j] & 63, sc[j + 4] & 63
    return (sc[j + 4] & 0xF) | ((sc[j - 4] >> 6) << 4), (sc[j + 4] >> 4) | ((sc[j] >> 6) << 4)


vals = []; subs = []
for g in range(4):  # 4 chunks of 64 = 2 sub-blocks of 32 each (low nibble, then high nibble)
    q = qs[g * 32:(g + 1) * 32]
    for half in range(2):
        j = 2 * g + half
        s, m = scale_min(j)
        subs.append({'j': j, 'scale6': s, 'min6': m, 'scale': float(d * s), 'min': float(dmin * m)})
        for b in q:
            nib = (b & 0xF) if half == 0 else (b >> 4)
            vals.append(float(d * s) * nib - float(dmin * m))
vals = np.array(vals, np.float32)
ref = dequantize(np.array(gt.data).reshape(-1)[:144].reshape(1, 144), gt.tensor_type).reshape(-1)[:256]
res['q4k'] = {'tensor': gt.name, 'type': gt.tensor_type.name, 'abs_offset': int(gt.data_offset), 'block_hex': blk.hex(),
              'd': float(d), 'dmin': float(dmin), 'subblocks': subs, 'decoded_first8': vals[:8].tolist(),
              'matches_ggufpy': bool(np.allclose(vals, ref, atol=1e-6)), 'orig_first8': row0[:8].tolist(),
              'rmse_vs_orig_256': float(np.sqrt(np.mean((vals - row0[:256]) ** 2))), 'orig_rms_256': float(np.sqrt(np.mean(row0[:256] ** 2))),
              'bits_per_weight': 144 * 8 / 256}

# ---- MLX 4-bit affine, group 64 (Qwen3-0.6B-4bit, made here with mlx_lm convert)
p = os.path.join(INF, 'models/mlx/Qwen3-0.6B-4bit/model.safetensors')
tw, rw, ow = st_tensor(p, 'model.layers.0.self_attn.k_proj.weight')
ts, rs, os_ = st_tensor(p, 'model.layers.0.self_attn.k_proj.scales')
tb, rb, ob = st_tensor(p, 'model.layers.0.self_attn.k_proj.biases')
W = np.frombuffer(rw, np.uint32).reshape(tw['shape']); S = bf16(rs).reshape(ts['shape']); Bi = bf16(rb).reshape(tb['shape'])
words = W[0, :8]  # first 64 weights of row 0 = group 0
q = np.array([(int(wd) >> (4 * k)) & 0xF for wd in words for k in range(8)])
deq = S[0, 0] * q + Bi[0, 0]
res['mlx'] = {'weight': [tw['dtype'], tw['shape'], ow], 'scales': [ts['dtype'], ts['shape'], os_], 'biases': [tb['dtype'], tb['shape'], ob],
              'first_word_hex_le': rw[:4].hex(), 'first_word_u32': int(words[0]), 'q_first8': q[:8].tolist(),
              'scale0': float(S[0, 0]), 'bias0': float(Bi[0, 0]), 'decoded_first8': deq[:8].tolist(), 'orig_first8': row0[:8].tolist(),
              'rmse_vs_orig_64': float(np.sqrt(np.mean((deq - row0[:64]) ** 2))), 'orig_rms_64': float(np.sqrt(np.mean(row0[:64] ** 2))),
              'bits_per_weight': (64 * 4 + 16 + 16) / 64}
try:
    sys.path.insert(0, '')
    import mlx.core as mx
    full = np.array(mx.dequantize(mx.array(W), mx.array(S).astype(mx.bfloat16), mx.array(Bi).astype(mx.bfloat16), group_size=64, bits=4).astype(mx.float32))
    res['mlx']['matches_mx_dequantize'] = bool(np.allclose(full[0, :64], deq, atol=1e-6))
except Exception as e:
    res['mlx']['mx_check'] = 'not run in this env: ' + type(e).__name__  # run separately with the MLX env (mlx 0.32.3): equal, see results/mlx_conv.txt
json.dump(res, open(sys.argv[1], 'w'), indent=1)
print(json.dumps(res, indent=0)[:2500])
