"""Independent reference for the page's floating-point model (parts/24_js_fp.js).

Rounding uses PyTorch's own casts (torch 2.14.1), not the page's algorithm; the PRNG, the Box-Muller
normals and the dot-product recipes are re-implemented from their description. Writes out/expected.json,
which check/check_js.mjs compares with the JavaScript bit for bit.
Usage: uv run --no-project --with torch==2.14.1 --with numpy python code/reference.py
"""
import json, math, os, random
import torch

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), "out", "expected.json")
DT = {"fp16": torch.float16, "bf16": torch.bfloat16, "e4m3": torch.float8_e4m3fn, "e5m2": torch.float8_e5m2,
      "fp32": torch.float32}


def rnd(x, k):
    if k == "fp64":
        return x
    if k == "tf32":  # float32 exponent, 10 mantissa bits: round the float64 value at 2^(e-10) with ties to even
        if x == 0 or math.isinf(x):
            return x
        a = abs(x); e = math.floor(math.log2(a)); e = max(e, -126)
        q = 2.0 ** (e - 10)
        r = round(a / q) * q  # Python round() is ties-to-even
        return -r if x < 0 else r
    return float(torch.tensor([x], dtype=torch.float64).to(DT[k]).double()[0])


def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt


def gauss(r):
    u = r()
    if u < 1e-300:
        u = 1e-300
    v = r()
    return math.sqrt(-2 * math.log(u)) * math.cos(2 * math.pi * v)


def dot(a, b, fin, fa, acc, S, fout):
    p = [rnd(rnd(x, fin) * rnd(y, fin), fa) for x, y in zip(a, b)]
    if acc == "pair":
        v = p[:]
        while len(v) > 1:
            w = [rnd(v[i] + v[i + 1], fa) for i in range(0, len(v) - 1, 2)]
            if len(v) % 2:
                w.append(v[-1])
            v = w
        s = v[0]
    elif acc == "split":
        c = -(-len(p) // S); parts = []
        for j in range(0, len(p), c):
            t = 0.0
            for x in p[j:j + c]:
                t = rnd(t + x, fa)
            parts.append(t)
        s = 0.0
        for t in parts:
            s = rnd(s + t, fa)
    else:
        s = 0.0
        for x in p:
            s = rnd(s + x, fa)
    return rnd(s, fout)


TOL = {"fp16": (1e-3, 1e-5), "bf16": (1.6e-2, 1e-5), "fp32": (1.3e-6, 1e-5)}


def experiment(o):
    r = mulberry32(o["seed"]); errs = []; pas = 0
    for _ in range(o["trials"]):
        a = [0.0] * o["K"]; b = [0.0] * o["K"]
        for i in range(o["K"]):
            a[i] = gauss(r); b[i] = gauss(r)
        ex = [rnd(x, o["fin"]) * rnd(y, o["fin"]) for x, y in zip(a, b)]
        exact = math.fsum(ex); scale = math.sqrt(math.fsum(v * v for v in ex)) or 1
        out = dot(a, b, o["fin"], o["fa"], o["acc"], o.get("S", 1), o["fout"])
        errs.append(abs(out - exact) / scale)
        ref = rnd(exact, o["fout"]); rt, at = TOL.get(o["fout"], TOL["fp32"])
        if abs(out - ref) <= at + rt * abs(ref):
            pas += 1
    errs.sort()
    q = lambda p: errs[min(len(errs) - 1, int(math.floor(p * (len(errs) - 1) + 0.5)))]
    return {"median": q(.5), "p90": q(.9), "max": errs[-1], "pass": pas, "T": o["trials"]}


def main():
    random.seed(3)
    cases = []
    for k in ("fp16", "bf16", "e4m3", "e5m2", "tf32"):
        for _ in range(400):
            x = random.choice([random.gauss(0, 1), random.gauss(0, 1) * 10 ** random.uniform(-9, 6)])
            cases.append([x, k, rnd(x, k)])
        for x in (448.0, 460.0, 500.0, 1e6, 65504.0, 65519.0, 65520.0, 7e4, 2.0 ** -24, 2.0 ** -25, 3 * 2.0 ** -26):
            cases.append([x, k, rnd(x, k)])
    configs = [
        {"seed": 1, "trials": 16, "K": 256, "fin": "fp16", "fa": "fp32", "acc": "seq", "fout": "fp16"},
        {"seed": 2, "trials": 16, "K": 256, "fin": "bf16", "fa": "bf16", "acc": "seq", "fout": "bf16"},
        {"seed": 3, "trials": 16, "K": 512, "fin": "fp16", "fa": "fp16", "acc": "pair", "fout": "fp16"},
        {"seed": 4, "trials": 16, "K": 1000, "fin": "bf16", "fa": "fp32", "acc": "split", "S": 7, "fout": "fp32"},
        {"seed": 5, "trials": 8, "K": 2048, "fin": "e4m3", "fa": "fp32", "acc": "seq", "fout": "bf16"},
        {"seed": 6, "trials": 8, "K": 300, "fin": "tf32", "fa": "fp32", "acc": "pair", "fout": "fp32"},
    ]
    exps = [{"o": o, "r": experiment(o)} for o in configs]
    r = mulberry32(42); prng = [r() for _ in range(20)]
    enc = lambda v: ("inf" if v > 0 else "-inf") if isinstance(v, float) and math.isinf(v) else v
    cases = [[x, k, enc(v)] for x, k, v in cases]
    json.dump({"round": cases, "experiments": exps, "prng42": prng}, open(OUT, "w"))
    print("out/expected.json", len(cases), "rounding cases,", len(exps), "experiments")


if __name__ == "__main__":
    main()
