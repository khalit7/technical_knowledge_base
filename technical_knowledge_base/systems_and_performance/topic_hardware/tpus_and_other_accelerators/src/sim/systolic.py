"""Reference model of a weight-stationary systolic array (the TPU MXU dataflow).

Two levels, both used by the page and checked against each other:
1. simulate(X, W): a cycle-by-cycle simulation of every processing element (PE) for one
   weight tile that fits the array. Each PE (k, n) holds W[k][n]. Row m of X enters row k
   from the left at cycle m + k (the skew), moves one PE right per cycle; the partial sum
   for output (m, n) moves one PE down per cycle; Y[m][n] leaves the bottom of column n.
   Returns Y and per-cycle counters. Checked: Y equals the plain matmul exactly (integers),
   and the last output leaves in cycle M + K + N - 3 (counting from 0), so the tile takes
   M + K + N - 2 cycles after its weights are loaded (K more cycles to shift them in).
2. tiled_cycles(M, K, N, R, C): the closed form for a big matmul on an R x C array, with
   weights double-buffered (the next tile's weights shift in, one row per cycle, while the current
   tile streams), so a tile costs max(M, R) cycles: with fewer than R rows of X (small batch,
   decode) the array waits on weight loading. Plus the first load and one fill and drain.

Scalar-lane baseline ("before"): R*C independent multiply-add lanes, each computing one
output's dot product, reading both operands from a register file every step.

Run: python3 systolic.py  (writes ../out/systolic_ref.json, used by check_sim.mjs)
"""
import json, math, os, random

def simulate(X, W):
    M, K = len(X), len(X[0]); K2, N = len(W), len(W[0]); assert K == K2
    a = [[None] * N for _ in range(K)]   # activation register in each PE (value, m)
    p = [[None] * N for _ in range(K)]   # partial-sum register in each PE (value, m)
    Y = [[None] * N for _ in range(M)]
    t, macs, active_hist = 0, 0, []
    edge_reads = 0          # X elements read from the buffer at the left edge
    passes = 0              # values handed PE to PE (activations right, sums down)
    done = 0
    while done < M * N:
        na = [[None] * N for _ in range(K)]
        np_ = [[None] * N for _ in range(K)]
        active = 0
        for k in range(K):
            for n in range(N):
                # activation arriving this cycle: from the left neighbour, or the edge
                if n == 0:
                    m = t - k
                    act = (X[m][k], m) if 0 <= m < M else None
                    if act: edge_reads += 1
                else:
                    act = a[k][n - 1]
                    if act: passes += 1
                if act is None:
                    continue
                v, m = act
                if k == 0:
                    ps = 0
                else:
                    prev = p[k - 1][n]
                    assert prev is not None and prev[1] == m, (t, k, n)
                    ps = prev[0]; passes += 1
                na[k][n] = act
                np_[k][n] = (ps + v * W[k][n], m)
                macs += 1; active += 1
        # outputs leave the bottom row
        for n in range(N):
            o = np_[K - 1][n]
            if o is not None:
                Y[o[1]][n] = o[0]; done += 1
        a, p = na, np_
        active_hist.append(active)
        t += 1
    return Y, {"cycles": t, "macs": macs, "edge_reads": edge_reads,
               "weight_reads": K * N, "out_writes": M * N, "passes": passes,
               "active": active_hist}

def scalar_lanes(M, K, N):
    """Same MACs on M*N... lanes: one lane per output, K steps; each step reads x and w."""
    return {"steps": K, "macs": M * K * N, "operand_reads": 2 * M * K * N, "out_writes": M * N}

def tile_cycles(M, K, N):
    return M + K + N - 2

def tiled_cycles(M, K, N, R, C):
    tk, tn = math.ceil(K / R), math.ceil(N / C)
    tiles = tk * tn
    # first weight load (R cycles, one row per cycle) + every tile streams M rows; the next tile's
    # weights shift in behind it (R cycles), so a tile costs max(M, R) + one fill/drain at the end
    cyc = R + tiles * max(M, R) + (R + C - 2)
    util = M * K * N / (R * C * cyc)
    pad_util = (K * N) / (tk * R * tn * C)    # share of the array holding real weights
    return {"tiles": tiles, "cycles": cyc, "util": util, "pad_util": pad_util}

def matmul(X, W):
    return [[sum(X[m][k] * W[k][n] for k in range(len(W))) for n in range(len(W[0]))] for m in range(len(X))]

def main():
    rnd = random.Random(7)
    cases = []
    for (M, K, N) in [(5, 4, 4), (1, 1, 1), (3, 2, 5), (8, 8, 8), (6, 3, 7), (2, 6, 3), (12, 5, 9)]:
        lo = 1 if not cases else -4   # the page animates the first case: small positive values
        X = [[rnd.randint(lo, 4 if lo < 0 else 3) for _ in range(K)] for _ in range(M)]
        W = [[rnd.randint(lo, 4 if lo < 0 else 3) for _ in range(N)] for _ in range(K)]
        Y, c = simulate(X, W)
        assert Y == matmul(X, W)
        assert c["cycles"] == tile_cycles(M, K, N), (c["cycles"], M, K, N)
        assert c["macs"] == M * K * N and c["edge_reads"] == M * K
        cases.append({"M": M, "K": K, "N": N, "X": X, "W": W, "Y": Y, "cycles": c["cycles"],
                      "passes": c["passes"], "active": c["active"]})
    tiled = []
    for (M, K, N, R) in [(8192, 4096, 14336, 128), (8192, 4096, 14336, 256), (8192, 130, 130, 128),
                         (8192, 128, 8192, 256), (8192, 128, 8192, 128), (512, 4096, 1024, 128),
                         (1, 4096, 14336, 128), (8, 4096, 14336, 128), (64, 64, 64, 128)]:
        r = tiled_cycles(M, K, N, R, R); r.update({"M": M, "K": K, "N": N, "R": R}); tiled.append(r)
    out = {"cases": cases, "tiled": tiled, "lanes_5x4x4": scalar_lanes(5, 4, 4)}
    here = os.path.dirname(os.path.abspath(__file__))
    os.makedirs(os.path.join(here, "..", "out"), exist_ok=True)
    with open(os.path.join(here, "..", "out", "systolic_ref.json"), "w") as f:
        json.dump(out, f, separators=(",", ":"))
    for r in tiled:
        print("M%-5d K%-5d N%-5d R%-3d tiles %-5d cycles %-9d util %.3f pad %.3f" % (r["M"], r["K"], r["N"], r["R"], r["tiles"], r["cycles"], r["util"], r["pad_util"]))
    print("all", len(cases), "cycle-level cases match matmul and M+K+N-2")

if __name__ == "__main__":
    main()
