"""Reference collective simulator (the page's JavaScript in parts/23_js_ic_sim.js is a line-by-line port; check/check_page.mjs
compares the two on every case in out/expected.json["simcases"]).

A cluster of n GPUs, each with one full-duplex port of bandwidth beta (bytes/s each way) into a non-blocking switch,
and a fixed start-up cost alpha per message step. A collective is a list of steps; in one step every GPU may send and
receive; a step takes alpha + max over GPUs of max(bytes out, bytes in) / beta. The buffer of S bytes is cut into n chunks.
State: have[g][c] = set of GPUs whose contribution chunk c on GPU g already contains (a bitmask).
"""


def log2i(n):
    k = 0
    while (1 << k) < n:
        k += 1
    return k


def steps_for(coll, alg, n):
    """Return a list of steps; a step is a list of transfers (src, dst, chunks, op) with op 'add' or 'copy'.
    For alg 'switch' the destination -1 is the switch."""
    st = []
    if coll == "ar" and alg == "ring":
        for i in range(n - 1):  # reduce-scatter
            st.append([(g, (g + 1) % n, [(g - i) % n], "add") for g in range(n)])
        for i in range(n - 1):  # all-gather
            st.append([(g, (g + 1) % n, [(g + 1 - i) % n], "copy") for g in range(n)])
    elif coll == "ar" and alg == "rd":
        k = 1
        while k < n:
            st.append([(g, g ^ k, list(range(n)), "add") for g in range(n)])
            k <<= 1
    elif coll == "ar" and alg == "rab":  # recursive halving reduce-scatter, then recursive doubling all-gather
        L = log2i(n)
        own = {g: list(range(n)) for g in range(n)}  # chunk range each GPU is still responsible for
        hist = []
        for k in range(L):
            d = n >> (k + 1)
            step, new = [], {}
            for g in range(n):
                p = g ^ d
                lo = [c for c in own[g] if (c & d) == (g & d)]  # keep the half matching my bit
                give = [c for c in own[g] if (c & d) != (g & d)]
                step.append((g, p, give, "add"))
                new[g] = lo
            own = new
            hist.append(d)
            st.append(step)
        for d in reversed(hist):
            step, new = [], {}
            for g in range(n):
                p = g ^ d
                step.append((g, p, list(own[g]), "copy"))
                new[g] = sorted(own[g] + own[p])
            own = new
            st.append(step)
    elif coll == "ar" and alg == "switch":
        st.append([(g, -1, list(range(n)), "add") for g in range(n)])
        st.append([(-1, g, list(range(n)), "copy") for g in range(n)])
    elif coll == "ag" and alg == "ring":
        for i in range(n - 1):
            st.append([(g, (g + 1) % n, [(g - i) % n], "copy") for g in range(n)])
    elif coll == "ag" and alg == "rd":
        k = 1
        while k < n:
            # after step j each GPU holds the chunks of its aligned block of size k
            st.append([(g, g ^ k, [c for c in range(n) if c // k == g // k], "copy") for g in range(n)])
            k <<= 1
    elif coll == "a2a" and alg == "pair":
        for k in range(1, n):
            st.append([(g, (g + k) % n, [("a2a", g, (g + k) % n)], "copy") for g in range(n)])
    else:
        raise ValueError((coll, alg))
    return st


def initial(coll, n):
    if coll == "ar":
        return [[1 << g for c in range(n)] for g in range(n)]
    if coll == "ag":
        return [[(1 << g) if c == g else 0 for c in range(n)] for g in range(n)]
    if coll == "a2a":  # have[g][c]: bit s set means GPU g holds the piece GPU s addressed to GPU c... kept as a dict below
        return [[(1 << g) for c in range(n)] for g in range(n)]
    raise ValueError(coll)


def run(coll, alg, n, S, alpha, beta, alpha_sw=None):
    """Simulate; return dict(time, steps, sent_per_gpu, ok, step_times)."""
    have = initial(coll, n)
    recv_a2a = [[0] * n for _ in range(n)]  # recv_a2a[g][s] = 1 when GPU g has GPU s's piece for g
    for g in range(n):
        recv_a2a[g][g] = 1
    chunk = S / n
    T, sent, times = 0.0, [0.0] * n, []
    sw = None
    for step in steps_for(coll, alg, n):
        out, inn = {}, {}
        snap = [row[:] for row in have]
        for (s, d, cs, op) in step:
            b = chunk * len(cs)
            out[s] = out.get(s, 0) + b
            inn[d] = inn.get(d, 0) + b
            if s >= 0:
                sent[s] += b
            if coll == "a2a":
                _, src, dst = cs[0]
                recv_a2a[dst][src] = 1
                continue
            if d == -1:  # into the switch: it adds every arriving chunk
                sw = [a | snap[s][c] for a, c in zip(sw, range(n))] if sw else [snap[s][c] for c in range(n)]
                continue
            src = sw if s == -1 else snap[s]
            for c in cs:
                have[d][c] = (have[d][c] | src[c]) if op == "add" else src[c]
        a = alpha if alg != "switch" or alpha_sw is None else alpha_sw
        ports = [max(out.get(g, 0), inn.get(g, 0)) for g in range(n)]
        t = a + max(ports) / beta
        times.append(t)
        T += t
    full = (1 << n) - 1
    if coll == "a2a":
        ok = all(all(r) for r in recv_a2a)
    elif coll == "ag":
        ok = all(all(row[c] == 1 << c for c in range(n)) for row in have)
    else:
        ok = all(all(x == full for x in row) for row in have)
    if alg == "switch":  # up and down streams overlap in chunks (pipelined): one buffer's worth of time
        T = 2 * (alpha_sw if alpha_sw is not None else alpha) + S / beta
    return dict(time=T, steps=len(times), sent=max(sent), ok=ok)


def closed(coll, alg, n, S, alpha, beta, alpha_sw=None):
    """Closed forms (Thakur, Rabenseifner and Gropp 2005 for ring, recursive doubling, Rabenseifner; idealised switch)."""
    L = log2i(n)
    if coll == "ar":
        return {"ring": 2 * (n - 1) * alpha + 2 * (n - 1) / n * S / beta,
                "rd": L * alpha + L * S / beta,
                "rab": 2 * L * alpha + 2 * (n - 1) / n * S / beta,
                "switch": 2 * (alpha_sw if alpha_sw is not None else alpha) + S / beta}[alg]
    if coll == "ag":
        return {"ring": (n - 1) * alpha + (n - 1) / n * S / beta, "rd": L * alpha + (n - 1) / n * S / beta}[alg]
    if coll == "a2a":
        return (n - 1) * alpha + (n - 1) / n * S / beta
    raise ValueError(coll)


BUSF = {"ar": lambda n: 2 * (n - 1) / n, "ag": lambda n: (n - 1) / n, "rs": lambda n: (n - 1) / n, "a2a": lambda n: (n - 1) / n}


if __name__ == "__main__":
    bad = 0
    for coll, algs in (("ar", ["ring", "rd", "rab", "switch"]), ("ag", ["ring", "rd"]), ("a2a", ["pair"])):
        for alg in algs:
            for n in (2, 4, 8, 16, 32, 64):
                r = run(coll, alg, n, 1e9, 5e-6, 4.5e11)
                c = closed(coll, alg, n, 1e9, 5e-6, 4.5e11)
                if not r["ok"] or abs(r["time"] - c) > 1e-12 * max(1, c):
                    bad += 1
                    print("MISMATCH", coll, alg, n, r, c)
    print("collsim self-test:", "ok" if not bad else f"{bad} failures")
