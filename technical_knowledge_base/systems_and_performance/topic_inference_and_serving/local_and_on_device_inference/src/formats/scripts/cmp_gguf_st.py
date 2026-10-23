"""Is safetensors -> GGUF lossless? Compare every tensor of converted GGUFs against the safetensors original.

Usage: python3 -I cmp_gguf_st.py <model.safetensors> <out.json> <name=file.gguf> ...
Values are compared after decoding both sides to float32 (BF16 widens to F32 exactly).
GGUF dims are stored fastest-first (ne0 = last PyTorch dim), so shapes are compared reversed.
Also counts, directly from the safetensors BF16 values, how many cannot be held exactly in F16
(magnitude above 65504, or too small: F16 subnormals hold 10 bits below 2^-14, smallest 2^-24).
"""
import sys, json, numpy as np
from safetensors.numpy import load_file
from gguf import GGUFReader, get_tensor_name_map, MODEL_ARCH

st_path, out_path = sys.argv[1], sys.argv[2]


def bf16_to_f32(a):
    return (a.view(np.uint16).astype(np.uint32) << 16).view(np.float32)


# safetensors.numpy cannot return bf16 as a numpy dtype; read raw bytes instead
import struct
with open(st_path, 'rb') as f:
    n = struct.unpack('<Q', f.read(8))[0]; hdr = json.loads(f.read(n)); base = 8 + n
mm = np.memmap(st_path, dtype=np.uint8, mode='r')
ST = {}
for k, t in hdr.items():
    if k == '__metadata__': continue
    a, b = t['data_offsets']
    ST[k] = (bf16_to_f32(np.array(mm[base + a: base + b]).view(np.uint16)).reshape(t['shape']))

# F16 representability of every BF16 value in the checkpoint
tot = 0; inexact = 0; zeroed = 0; overflow = 0; nz = 0
for k, x in ST.items():
    y = x.astype(np.float16).astype(np.float32)
    tot += x.size; inexact += int(np.count_nonzero(y != x)); nz += int(np.count_nonzero(x))
    zeroed += int(np.count_nonzero((y == 0) & (x != 0))); overflow += int(np.count_nonzero(~np.isfinite(y)))
f16stats = {'values': tot, 'nonzero': nz, 'not_exact_in_f16': inexact, 'flushed_to_zero': zeroed, 'overflow': overflow}
print('f16 representability', f16stats)

tmap = get_tensor_name_map(MODEL_ARCH.QWEN3, 28)
res = {'f16_representability': f16stats, 'files': {}}
for arg in sys.argv[3:]:
    name, path = arg.split('=', 1)
    rd = GGUFReader(path)
    G = {t.name: t for t in rd.tensors}
    exact = 0; diff = 0; maxabs = 0.0; nvals_diff = 0; types = {}; missing = []; shape_ok = True
    for k, x in ST.items():
        gname = tmap.get_name(k, try_suffixes=('.weight', '.bias'))
        if gname not in G: missing.append(k); continue
        t = G[gname]
        types[t.tensor_type.name] = types.get(t.tensor_type.name, 0) + 1
        if list(reversed([int(d) for d in t.shape])) != list(x.shape) and list(t.shape) != list(x.shape): shape_ok = False
        d = np.array(t.data)
        if t.tensor_type.name == 'BF16': g = bf16_to_f32(d.view(np.uint16))
        else: g = d.astype(np.float32)
        g = g.reshape(-1); xr = x.reshape(-1)
        nd = int(np.count_nonzero(g != xr))
        if nd == 0: exact += 1
        else: diff += 1; nvals_diff += nd; maxabs = max(maxabs, float(np.max(np.abs(g - xr))))
    res['files'][name] = {'tensors_exact': exact, 'tensors_diff': diff, 'values_diff': nvals_diff, 'max_abs_diff': maxabs,
                          'gguf_types': types, 'missing_in_gguf': missing, 'shapes_ok': shape_ok, 'n_gguf_tensors': len(G)}
    print(name, res['files'][name])
json.dump(res, open(out_path, 'w'), indent=1)
