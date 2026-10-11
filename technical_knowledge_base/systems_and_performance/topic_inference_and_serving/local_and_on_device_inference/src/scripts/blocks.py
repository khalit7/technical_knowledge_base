"""Read one real block of Qwen3-1.7B weights from the F16 GGUF and from each quantized GGUF made by llama-quantize,
decode the stored fields (scales, codes) and dequantize with gguf-py (llama.cpp b11146). Also: per-file tensor-type mix,
and the whole-tensor error of the chosen tensor.
usage: python blocks.py <llama.cpp src> <dir with q17-*.gguf and the F16> <out.json>
"""
import sys, json
import numpy as np
sys.path.insert(0, sys.argv[1] + "/gguf-py")
from gguf import GGUFReader
from gguf.quants import dequantize
from gguf.constants import GGMLQuantizationType as QT

src, d, outp = sys.argv[1:4]
TENSOR = "blk.14.attn_q.weight"
files = {"F16": d + "/Qwen3-1.7B-F16.gguf"}
for t in ("Q8_0", "Q4_0", "Q4_K_M", "IQ4_XS+i", "Q3_K_M+i", "Q2_K+i"):
    files[t] = d + "/q17-" + t + ".gguf"
KV_IQ4NL = [-127, -104, -83, -65, -49, -35, -22, -10, 1, 13, 25, 38, 53, 69, 89, 113]

out = {"tensor": TENSOR, "row": 0, "n": 256, "files": {}}
ref_full = None
import os
for name, f in files.items():
    if not os.path.exists(f):
        print("missing", name); continue
    r = GGUFReader(f)
    mix = {}
    for t in r.tensors:
        k = t.tensor_type.name
        mix.setdefault(k, [0, 0])
        mix[k][0] += 1
        mix[k][1] += int(t.n_elements)
    t = next(t for t in r.tensors if t.name == TENSOR)
    raw = np.array(t.data)
    full = dequantize(raw, t.tensor_type).astype(np.float32).reshape(-1)
    row = full[:256]
    rec = {"type": t.tensor_type.name, "mix": mix, "shape": [int(x) for x in t.shape],
           "vals": [round(float(x), 6) for x in row]}
    if name == "F16":
        ref_full = full
    else:
        e = full - ref_full
        rec["rmse_tensor"] = float(np.sqrt(np.mean(e ** 2)))
        rec["rel_rmse_tensor"] = float(np.sqrt(np.mean(e ** 2)) / np.sqrt(np.mean(ref_full ** 2)))
        rec["rmse_block"] = float(np.sqrt(np.mean((row - ref_full[:256]) ** 2)))
    # stored fields of the first block(s)
    b = raw.reshape(-1)  # uint8 view of the row-major blocks
    if t.tensor_type == QT.Q4_0:
        blk = np.frombuffer(bytes(b[:18 * 8]), dtype=np.uint8)
        fields = []
        for j in range(8):
            x = blk[18 * j:18 * j + 18]
            dd = float(np.frombuffer(x[:2].tobytes(), dtype=np.float16)[0])
            qs = x[2:]
            codes = [int(v & 15) for v in qs] + [int(v >> 4) for v in qs]
            fields.append({"d": dd, "codes": codes})
        rec["blocks"] = fields
    if t.tensor_type == QT.Q8_0:
        blk = np.frombuffer(bytes(b[:34 * 8]), dtype=np.uint8)
        rec["blocks"] = [{"d": float(np.frombuffer(blk[34 * j:34 * j + 2].tobytes(), dtype=np.float16)[0]),
                          "codes": [int(v) for v in blk[34 * j + 2:34 * j + 34].view(np.int8)]} for j in range(8)]
    if t.tensor_type == QT.Q4_K:
        x = np.frombuffer(bytes(b[:144]), dtype=np.uint8)
        dd = float(np.frombuffer(x[0:2].tobytes(), dtype=np.float16)[0])
        dm = float(np.frombuffer(x[2:4].tobytes(), dtype=np.float16)[0])
        s = x[4:16]
        sc, mn = [], []
        for j in range(8):
            if j < 4:
                sc.append(int(s[j] & 63)); mn.append(int(s[j + 4] & 63))
            else:
                sc.append(int((s[j + 4] & 0xF) | ((s[j - 4] >> 6) << 4)))
                mn.append(int((s[j + 4] >> 4) | ((s[j] >> 6) << 4)))
        qs = x[16:144]
        codes = []
        for j in range(4):
            q = qs[32 * j:32 * j + 32]
            codes += [int(v & 15) for v in q] + [int(v >> 4) for v in q]
        rec["superblock"] = {"d": dd, "dmin": dm, "scales": sc, "mins": mn, "codes": codes}
    if t.tensor_type == QT.IQ4_XS:
        x = np.frombuffer(bytes(b[:136]), dtype=np.uint8)
        dd = float(np.frombuffer(x[0:2].tobytes(), dtype=np.float16)[0])
        sh = int(np.frombuffer(x[2:4].tobytes(), dtype=np.uint16)[0])
        sl = x[4:8]
        ls = [int(((sl[j // 2] >> 4 * (j % 2)) & 0xF) | (((sh >> 2 * j) & 3) << 4)) for j in range(8)]
        qs = x[8:136]
        codes = []
        for j in range(8):
            q = qs[16 * j:16 * j + 16]
            codes += [int(v & 15) for v in q] + [int(v >> 4) for v in q]
        rec["superblock"] = {"d": dd, "ls": ls, "codes": codes, "table": KV_IQ4NL}
    out["files"][name] = rec
    print(name, rec["type"], rec.get("rel_rmse_tensor"), flush=True)
json.dump(out, open(outp, "w"))
