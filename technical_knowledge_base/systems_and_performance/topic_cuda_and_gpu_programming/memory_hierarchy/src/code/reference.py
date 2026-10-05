"""Python reference for the page's models (parts/24_js_model.js), written independently from the rules:
  sectors : NVIDIA's 32-byte sector rule for one warp-wide load (Programming Guide 2.3.4.1)
  banks   : 32 banks x 4 bytes, one distinct word per bank per pass, same word broadcast (2.3.4.2)
  pipeline: a tile loop with S shared-memory buffers (Reading section 6)
Writes out/expected.json: 1,000 random patterns with the expected results (check/check_js.mjs compares the page's JS).
Run from src/: python3 code/reference.py
"""
import json, random


def sectors(w, stride, off=0, instr=1):
    per = []
    used = set()
    for k in range(instr):
        s = set()
        for l in range(32):
            a = off + (k * 32 + l) * stride
            for b in range(a, a + w):
                s.add(b // 32); used.add(b)
        per.append(len(s))
    fetched = 32 * sum(per)
    return {"nSec": sum(per), "fetched": fetched, "used": len(used)}


def banks(mode, w=4, s=1, layout="plain", c=0):
    words = []
    for l in range(32):
        if mode == "col":
            words.append([{"plain": l * 32 + c, "pad": l * 33 + c, "xor": l * 32 + ((c ^ l) & 31)}[layout]])
        else:
            nw = w // 4
            words.append([l * s * nw + j for j in range(nw)])
    per = [set() for _ in range(32)]
    for ws in words:
        for x in ws:
            per[x % 32].add(x)
    passes = max(len(p) for p in per)
    ideal = max(1, -(-32 * (4 if mode == "col" else w) // 128))
    return {"passes": passes, "ideal": ideal}


def pipeline(S, L, C, n):
    issue, ce = [], []
    for i in range(n):
        free = ce[i - S] if i - S >= 0 else 0
        iss = max(issue[i - 1] if i else 0, free)
        issue.append(iss)
        cs = max(iss + L, ce[i - 1] if i else 0)
        ce.append(cs + C)
    return {"total": ce[-1], "issue": issue, "ce": ce}


if __name__ == "__main__":
    rng = random.Random(7)
    cases = []
    for _ in range(400):
        w = rng.choice([1, 2, 4, 8, 16]); st = rng.choice([0, 1, 2, 4, 8, 12, 16, 32, 64, 128, 1000, 16384, rng.randrange(0, 300)])
        off = rng.choice([0, 0, 4, 16, rng.randrange(0, 128)]); ins = rng.choice([1, 1, 2, 4])
        cases.append({"kind": "sectors", "p": {"w": w, "stride": st, "off": off, "instr": ins}, "exp": sectors(w, st, off, ins)})
    for _ in range(400):
        if rng.random() < 0.3:
            p = {"mode": "col", "layout": rng.choice(["plain", "pad", "xor"]), "c": rng.randrange(32)}
            e = banks("col", layout=p["layout"], c=p["c"])
        else:
            p = {"mode": "stride", "w": rng.choice([4, 8, 16]), "s": rng.randrange(0, 70)}
            e = banks("stride", w=p["w"], s=p["s"])
        cases.append({"kind": "banks", "p": p, "exp": e})
    for _ in range(200):
        S, L, C, n = rng.randrange(1, 6), rng.randrange(1, 1000), rng.randrange(1, 600), rng.randrange(1, 20)
        cases.append({"kind": "pipeline", "p": [S, L, C, n], "exp": pipeline(S, L, C, n)})
    # the page's defaults, stated in the prose
    page = {"pipe": {S: pipeline(S, 479, 200, 8)["total"] for S in (1, 2, 3, 4)},
            "aos": sectors(4, 32), "soa": sectors(4, 4), "mis": sectors(4, 4, 4), "vec4": sectors(4, 4, 0, 4), "vec16": sectors(16, 16),
            "f4s8": banks("stride", w=16, s=8), "f4s9": banks("stride", w=16, s=9), "col": banks("col")}
    json.dump({"cases": cases, "page": page}, open("out/expected.json", "w"))
    print(len(cases), "cases;", page["pipe"], page["aos"], page["f4s8"])
