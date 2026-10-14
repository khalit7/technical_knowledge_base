"""Packing strategies on real document lengths (Qwen3 tokens), deterministic. Every document gets one end-of-document
token, as in the root's Tool map run (its padded count uses the length without it; kept identical so the numbers agree).
Strategies, for context length L:
  pad      one document per window; a document longer than L takes ceil(n / L) windows (root's definition)
  trunc    one window per document, the rest of a long document is thrown away
  concat   concatenate everything and cut every L tokens (GPT-2/3, nanoGPT, Megatron's default)
  bfd      Best-fit Decreasing (Ding et al. 2024, arXiv 2404.10830): split documents longer than L into L-sized chunks,
           sort chunks longest first, put each in the open window with the least room that still fits it
Metrics: windows, fill (real tokens / positions), documents cut by a window boundary (truncations), tokens lost,
share of causal attention pairs that cross a document boundary (what a document mask removes, and what a variable-length
attention kernel skips), and tokens whose document started in an earlier window (they lose their context).
  python3 packing.py <lens json (list or {"lens": [...]})> <out.json> [demo_n]
"""
import bisect, json, math, sys

def load(p):
    d = json.load(open(p)); return d["lens"] if isinstance(d, dict) else d

def segs_concat(lens, L):
    """windows as lists of [doc, start_in_doc, length] (document length includes its end token)"""
    wins, cur, room = [], [], L
    for d, n in enumerate(lens):
        n += 1; s = 0
        while n - s > 0:
            take = min(room, n - s); cur.append([d, s, take]); s += take; room -= take
            if room == 0: wins.append(cur); cur, room = [], L
    if cur: wins.append(cur)
    return wins

def segs_bfd(lens, L):
    chunks = []
    for d, n in enumerate(lens):
        n += 1; s = 0
        while s < n: chunks.append((min(L, n - s), d, s)); s += L
    chunks.sort(key=lambda c: (-c[0], c[1], c[2]))
    rooms, ids, wins = [], [], []  # sorted list of (room, window id)
    for size, d, s in chunks:
        i = bisect.bisect_left(rooms, size)
        if i < len(rooms):
            room, w = rooms.pop(i), ids.pop(i)
        else:
            room, w = L, len(wins); wins.append([])
        wins[w].append([d, s, size]); room -= size
        if room > 0:
            j = bisect.bisect_left(rooms, room); rooms.insert(j, room); ids.insert(j, w)
    return wins

def stats(wins, lens, L):
    pos = len(wins) * L; real = sum(sg[2] for w in wins for sg in w)
    pairs_all = cross = orphan = 0
    for w in wins:
        m = sum(sg[2] for sg in w); pairs_all += m * (m + 1) // 2
        cross += m * (m + 1) // 2 - sum(sg[2] * (sg[2] + 1) // 2 for sg in w)
        orphan += sum(sg[2] for sg in w if sg[1] > 0)
    pieces = {}
    for w in wins:
        for sg in w: pieces[sg[0]] = pieces.get(sg[0], 0) + 1
    cut = sum(1 for v in pieces.values() if v > 1); cuts = sum(v - 1 for v in pieces.values())
    return {"windows": len(wins), "fill": real / pos, "pad_frac": 1 - real / pos, "docs_cut": cut, "cuts": cuts,
            "cross_pair_frac": cross / pairs_all if pairs_all else 0, "orphan_token_frac": orphan / real,
            "docs_per_window": sum(len(w) for w in wins) / len(wins)}

def run(lens, L):
    N, T = len(lens), sum(lens)
    n_pad = sum(math.ceil(n / L) for n in lens if n)
    out = {"pad": {"windows": n_pad, "fill": T / (n_pad * L), "pad_frac": 1 - T / (n_pad * L), "docs_cut": sum(1 for n in lens if n > L),
                   "cuts": sum(math.ceil(n / L) - 1 for n in lens if n), "cross_pair_frac": 0.0},
           "trunc": {"windows": N, "fill": sum(min(n, L) for n in lens) / (N * L), "tokens_lost_frac": sum(max(0, n - L) for n in lens) / T,
                     "docs_cut": sum(1 for n in lens if n > L), "cross_pair_frac": 0.0}}
    out["concat"] = stats(segs_concat(lens, L), lens, L)
    out["bfd"] = stats(segs_bfd(lens, L), lens, L)
    out["bfd"]["cross_pair_frac_unmasked"] = out["bfd"]["cross_pair_frac"]
    out["T"], out["N"] = T, N
    return out

if __name__ == "__main__":
    lens = load(sys.argv[1]); out = sys.argv[2]; demo_n = int(sys.argv[3]) if len(sys.argv) > 3 else 12
    res = {"n_docs": len(lens), "tokens": sum(lens), "by_L": {}}
    for L in (1024, 2048, 4096, 8192):
        res["by_L"][str(L)] = run(lens, L)
    dl = lens[:demo_n]
    res["demo"] = {"lens": dl, "L": 2048, "concat": segs_concat(dl, 2048), "bfd": segs_bfd(dl, 2048), "stats": run(dl, 2048)}
    json.dump(res, open(out, "w"), indent=1)
    for L, r in res["by_L"].items():
        print(L, {k: {kk: (round(vv, 4) if isinstance(vv, float) else vv) for kk, vv in v.items()} if isinstance(v, dict) else v for k, v in r.items()})
