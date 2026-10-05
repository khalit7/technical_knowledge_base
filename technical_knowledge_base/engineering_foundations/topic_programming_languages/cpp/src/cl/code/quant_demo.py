# Read real Q8_0 blocks from the GGUF file, then requantise the same 32 weights with ggml's Q8_0 and Q4_0
# reference algorithms (ggml/src/ggml-quants.c: quantize_row_q8_0_ref, quantize_row_q4_0_ref), in plain Python.
import json, math, struct, sys, io, contextlib
sys.path.insert(0, __import__("os").path.dirname(__file__))
from gguf_read import main as read_header

def f16(x):                     # round a float to fp16 and back, as GGML_FP32_TO_FP16 does (nearest even)
    return struct.unpack("<e", struct.pack("<e", x))[0]

def q8_0(x):
    amax = max(abs(v) for v in x)
    d = amax / 127; idv = 1 / d if d else 0.0
    q = [int(math.copysign(math.floor(abs(v * idv) + 0.5), v)) for v in x]   # roundf: half away from zero
    return f16(d), q

def q4_0(x):
    amax, mx = 0.0, 0.0
    for v in x:
        if amax < abs(v): amax, mx = abs(v), v
    d = mx / -8; idv = 1 / d if d else 0.0
    q = [min(15, int(v * idv + 8.5)) for v in x]                           # (int8_t) truncates toward zero
    return f16(d), q

def blocks(path, name, nblocks):
    with contextlib.redirect_stdout(io.StringIO()):
        kv, tensors, data_start = read_header(path, show_t=0)
    t = next(t for t in tensors if t[0] == name)
    with open(path, "rb") as f:
        f.seek(data_start + t[3])
        raw = f.read(34 * nblocks)
    out = []
    for b in range(nblocks):
        blk = raw[34 * b: 34 * b + 34]
        d = struct.unpack("<e", blk[:2])[0]
        qs = list(struct.unpack("<32b", blk[2:]))
        out.append((blk, d, qs))
    return t, out

if __name__ == "__main__":
    path = sys.argv[1]; name = "blk.0.attn_q.weight"
    t, bl = blocks(path, name, 576 * 576 // 32)
    blk, d, qs = bl[0]
    x = [d * q for q in qs]
    d8, q8 = q8_0(x); d4, q4 = q4_0(x)
    x8 = [d8 * q for q in q8]; x4 = [d4 * (q - 8) for q in q4]
    print(f"tensor {name} ne={t[1]} first block, 34 bytes: {blk.hex()}")
    print(f"stored d = {d!r} (fp16 bytes {blk[:2].hex()}), qs = {qs}")
    print(f"requantised Q8_0 reproduces the stored block: {d8 == d and q8 == qs}")
    print(f"Q4_0: d = {d4!r}, q = {q4}")
    rms = lambda a: math.sqrt(sum(v * v for v in a) / len(a))
    print(f"block max |error| Q8_0 = {max(abs(a - b) for a, b in zip(x, x8)):.3g}, Q4_0 = {max(abs(a - b) for a, b in zip(x, x4)):.4g}")
    # whole tensor: Q4_0 error relative to the Q8_0 weights it was made from
    se4 = ss = 0.0
    for blk_, dd, qq in bl:
        xx = [dd * q for q in qq]; e, k = q4_0(xx)
        se4 += sum((a - e * (b - 8)) ** 2 for a, b in zip(xx, k)); ss += sum(a * a for a in xx)
    print(f"whole tensor ({len(bl)} blocks): relative RMS error of Q4_0 = {math.sqrt(se4 / ss):.4f}")
    packed = bytes((q4[j] | (q4[j + 16] << 4)) for j in range(16))           # qs[j] = low nibble x[j], high nibble x[j+16]
    q4_block = struct.pack("<e", d4) + packed
    print(f"Q4_0 block, 18 bytes: {q4_block.hex()}")
    json.dump({"q4_block_hex": q4_block.hex(), "tensor": name, "ne": t[1], "hex": blk.hex(), "d": d, "qs": qs, "x": x, "d8": d8, "q8": q8,
               "d4": d4, "q4": q4, "rel_rms_q4_tensor": math.sqrt(se4 / ss)}, open(sys.argv[2], "w"))
