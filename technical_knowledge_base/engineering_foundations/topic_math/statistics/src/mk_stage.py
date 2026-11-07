#!/usr/bin/env python3
"""Data for the two 3D stages (2026-11-07), derived only from what the page already has; stdlib only, runs in well under a second.

Run from src/ after sims.py, then mk_data.py:  python3 mk_stage.py
Writes inputs/stage.json:
  hero: the first 8 seeded samples of 30 from inputs/sims_anim.json (tiny30) with their means, and the 20,000 simulated
        means of 30 (inputs/sims_clt.json, tiny, n = 30) moved from their 40 bins onto the lattice they live on;
  boot: for each sample of inputs/sims_boot.json (tiny30, lognormal10), six resamples drawn here with random.Random(2026)
        (indices into the sample, their means, how many points each left out), and the 4,000 bootstrap means and 20,000
        fresh-sample means as histograms (tiny30 on its lattice; lognormal10 in the 40 bins of sims.py).
Why the lattice: a mean of 30 losses from {0.408, 1.408, 2.408} is 0.408 + m/30 for a whole number m, so the means sit on
a grid with spacing 1/30 = 0.0333; each 40-bin histogram of sims.py has bins narrower than that (0.0158 and 0.0200), so
every non-empty bin holds one lattice value and its count can be placed there (a value on a bin edge, split over two bins by
float rounding, is merged back). The first and last bins also hold sims.py's clipped tails, drawn at the edge values.
"""
import json, math, os, random

H = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(H, "inputs")
anim = json.load(open(os.path.join(IN, "sims_anim.json")))
clt = json.load(open(os.path.join(IN, "sims_clt.json")))
boot = json.load(open(os.path.join(IN, "sims_boot.json")))
L_EXACT = -math.log(math.exp(2) / (math.exp(2) + math.exp(1) + 1))  # 0.40761: sims_clt.json uses the exact losses
L_ROUND = 0.408  # sims_anim.json and sims_boot.json store each draw rounded to 3 decimals


def to_lattice(lo, hi, cnt, L0, n=30):
    """Place each non-empty bin's count on the unique value L0 + m/n inside it. The first and last bins also hold the
    clipped tails (sims.py clips to the histogram's range), so their counts sit at the edge values: about 0.5% each."""
    snap = lambda v: L0 + round((v - L0) * n) / n  # the JSON rounds lo and hi to 4 decimals; both are lattice values
    lo, hi = snap(lo), snap(hi)
    w = (hi - lo) / len(cnt)
    # a lattice value can sit exactly on a bin edge, where float rounding of the mean splits its count over the two bins: merge them
    acc = {}
    for i, c in enumerate(cnt):
        if not c:
            continue
        ms = [m for m in range(0, 2 * n + 1) if lo + i * w - 1e-6 <= L0 + m / n <= lo + (i + 1) * w + 1e-6]
        assert ms, (i, lo + i * w)
        m = ms[0] if len(ms) == 1 else min(ms, key=lambda m: abs(L0 + m / n - (lo + (i + .5) * w)))
        acc[m] = acc.get(m, 0) + c
    return [[round(L0 + m / n, 4), acc[m]] for m in sorted(acc)]


def moments(h):
    N = sum(c for _, c in h)
    m = sum(v * c for v, c in h) / N
    sd = math.sqrt(sum((v - m) ** 2 * c for v, c in h) / (N - 1))
    return N, m, sd


out = {}
# ---- hero ----
xs = anim["tiny30"]["x"][:8]
c30 = clt["dists"]["tiny"]["by_n"]["30"]
front = to_lattice(c30["lo"], c30["hi"], c30["cnt"], L_EXACT)
N, m, sd = moments(front)
assert N == clt["R"], N
out["hero"] = {"samples": xs, "means": [round(sum(r) / len(r), 4) for r in xs], "front": front,
               "front_mean": round(m, 4), "front_sd": round(sd, 4)}
print("hero means", out["hero"]["means"], "front", N, round(m, 4), round(sd, 4))

# ---- bootstrap ----
rng = random.Random(2026)
out["boot"] = {}
for key in ("tiny30", "lognormal10"):
    b = boot[key]
    x, n = b["x"], b["n"]
    res = []
    for _ in range(6):
        idx = [rng.randrange(n) for _ in range(n)]
        mean = sum(x[i] for i in idx) / n
        res.append({"idx": idx, "mean": round(mean, 4), "left_out": n - len(set(idx)),
                    "twice": sum(1 for i in range(n) if idx.count(i) >= 2)})
    d = {"x": x, "n": n, "mean": b["mean"], "res": res}
    if key == "tiny30":
        hb = to_lattice(b["lo"], b["hi"], b["hist_boot"], L_ROUND)
        ht = to_lattice(b["lo"], b["hi"], b["hist_true"], L_ROUND)
        d["lattice"] = True
    else:
        w = (b["hi"] - b["lo"]) / len(b["hist_boot"])
        hb = [[round(b["lo"] + (i + .5) * w, 4), c] for i, c in enumerate(b["hist_boot"])]
        ht = [[round(b["lo"] + (i + .5) * w, 4), c] for i, c in enumerate(b["hist_true"])]
        d["lattice"] = False
        d["bin"] = round(w, 4)
    Nb, mb, sb = moments(hb)
    Nt, mt, stt = moments(ht)
    assert Nb == boot["B"] and Nt == boot["R"], (Nb, Nt)
    d.update({"hb": hb, "ht": ht, "lo": b["lo"], "hi": b["hi"], "boot_sd": b["boot_sd"], "true_sd": b["true_sd"],
              "hist_boot_sd": round(sb, 4), "hist_true_sd": round(stt, 4)})
    out["boot"][key] = d
    print("boot", key, [r["mean"] for r in res], "left out", [r["left_out"] for r in res],
          "sd from histograms", round(sb, 4), round(stt, 4), "(sims.py:", b["boot_sd"], b["true_sd"], ")")

json.dump(out, open(os.path.join(IN, "stage.json"), "w"), separators=(",", ":"))
