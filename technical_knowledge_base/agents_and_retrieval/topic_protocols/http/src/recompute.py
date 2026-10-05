"""Recompute every derived number the HTTP page shows, from raw/, and check the Timeout chain model.

1. The timeout model (same rules as parts/32_js_chain.js) against the eight measured runs in raw/timeouts.json.
2. Flow control: ceil(bytes / window) - 1 stalls x 50 ms against the measured download times (raw/flow_h2.json).
3. Header bytes: HTTP/1.1 head 160 = 277 - 117; HPACK and QPACK sizes in the real captures equal hpack_sizes.json's
   "running" set; Huffman saving on the SDK header values.
4. HOL medians (raw/hol_app.json) and SDK retry gaps against the SDK's own formula (0.5 s x 2^n x U(0.75, 1), cap 8 s).
Prints a line per check and exits non-zero on a mismatch. Usage: python3 recompute.py (from src/)
"""
import json, math, os, statistics, sys

HERE = os.path.dirname(os.path.abspath(__file__))
J = lambda n: json.load(open(os.path.join(HERE, "raw", n)))
bad = 0


def ok(cond, msg):
    global bad
    print(("ok   " if cond else "FAIL ") + msg)
    bad += 0 if cond else 1


# ---- 1. timeout model ----
def byte_times(r):
    end = r["think"] + r["gap"] * max(0, r["ntok"] - 1)
    if not r["stream"]:
        return [end], end, [end] * r["ntok"], end
    t = [0.0]
    if r["ping"] > 0:
        p = r["ping"]
        while p < r["think"] - 1e-9:
            t.append(p); p += r["ping"]
    tok = [r["think"] + j * r["gap"] for j in range(r["ntok"])]
    return t + tok, end, tok, 0.0


def fire(kind, L, times, end, head):
    if kind == "total":
        return L if end > L else None
    if kind == "first":
        return L if head > L else None
    prev = 0.0
    for t in times:
        if t - prev > L:
            return prev + L
        prev = t
    return None


def run(timers, r):
    times, end, tok, head = byte_times(r)
    best = None
    for k, L in timers:
        f = fire(k, L, times, end, head)
        if f is not None and (best is None or f < best):
            best = f
    if best is None:
        return True, end, r["ntok"]
    return False, best, sum(1 for t in tok if t < best - 1e-9)


NG = [("idle", 2)]
V = [(0, NG, dict(stream=True, think=1, ntok=5, gap=0.05, ping=0)), (1, NG, dict(stream=True, think=3, ntok=5, gap=0.05, ping=0)),
     (2, NG, dict(stream=True, think=3, ntok=5, gap=0.05, ping=1)), (3, NG, dict(stream=True, think=1, ntok=8, gap=1.5, ping=0)),
     (4, NG + [("total", 5)], dict(stream=True, think=1, ntok=8, gap=1.5, ping=0)), (5, NG, dict(stream=False, think=3, ntok=5, gap=0.05, ping=0)),
     (6, [("idle", 2)], dict(stream=True, think=1, ntok=8, gap=1.5, ping=0)), (7, [("idle", 2)], dict(stream=True, think=3, ntok=5, gap=0.05, ping=0))]
T = J("timeouts.json")["cases"]
for ci, timers, r in V:
    c = T[ci]
    if "httpx" in c:
        m_ok, m_s, m_tok = not c["httpx"]["error"], c["httpx"]["seconds"], c["httpx"]["tokens"]
    else:
        m_ok, m_s, m_tok = c["curl"]["exit"] == 0 and c["curl"]["http"] == "200", c["curl"]["seconds"], c["curl"].get("tokens")
    p_ok, p_s, p_tok = run(timers, r)
    ok(p_ok == m_ok and abs(p_s - m_s) < 0.35 and (m_tok is None or p_tok == m_tok),
       f"timeout model: {c['label']}: predicted {'complete' if p_ok else 'ended'} at {p_s:.2f} s, {p_tok} tokens; measured {m_s:.2f} s, {m_tok} tokens")

# ---- 2. flow control ----
F = J("flow_h2.json")
for r in F["runs"]:
    cap = min(r["window"], max(r["window"], 65535))
    stalls = math.ceil(F["bytes"] / cap) - 1
    exp = stalls * F["delay_ms"]  # plus a few ms of real processing per stall, hence the 5 ms per stall tolerance
    ok(abs(r["total_ms"] - exp) <= 15 + 5 * stalls, f"flow control: window {r['window']}: {stalls} stalls x 50 ms = {exp:.0f} ms; measured {r['total_ms']} ms")

# ---- 3. header bytes ----
req = open(os.path.join(HERE, "../../src/wire/raw/h1_request.bin"), "rb").read()
ok(len(req) == 277 and len(req.split(b"\r\n\r\n")[1]) == 117, "HTTP/1.1 request 277 bytes, head 160, body 117")
H2 = J("h2_frames.json"); H3 = J("h3_frames.json"); HS = J("hpack_sizes.json")
h2o = [f["len"] for f in H2["frames"] if f["type"] == "HEADERS" and f["dir"] == "out"]
h3o = [f["len"] for f in H3["frames"] if f["type"] == "HEADERS" and f["dir"] == "out"]
ok(h2o[:2] == [69, 7] and [x["block"] for x in HS["sets"]["running"]["hpack"][:2]] == [69, 7], f"HPACK running request 69 then 7 in the capture and the encoder run ({h2o[:4]})")
q = HS["sets"]["running"]["qpack"]["dynamic_4096"]
ok(h3o[:2] == [59, 9] and q[0]["block"] == 59 and q[1]["block"] == 9 and q[1]["encoder_stream"] == 53, f"QPACK 59 then 9, encoder stream 53 ({h3o})")
enc = [f for f in H3["frames"] if f["type"] == "QPACK instructions" and f["dir"] == "out" and f["stream"] == 6]
ok([e["len"] for e in enc][:2] == [3, 53], f"QPACK encoder stream from the client: {[e['len'] for e in enc]}")
ok([x["block"] for x in HS["sets"]["bearer"]["hpack"]] == [67, 32, 32], "authorization never-indexed: 67, 32, 32")
a = b = 0
for f in HS["sets"]["sdk"]["hpack"][0]["fields"]:
    if f.get("value_huffman"):
        a += len(f["value"].encode()); b += f["value_len"]
ok((a, b) == (164, 121), f"Huffman on SDK values: {a} -> {b} bytes ({100 * (1 - b / a):.0f}%)")
ok(HS["sets"]["running"]["h1_head_bytes"] == 141, "running set as HTTP/1.1 lines without connection: close = 141")

# ---- 4. HOL and retries ----
HOL = J("hol_app.json")["runs"]
med = {k: statistics.median([r["B_last"] for r in v]) for k, v in HOL.items()}
ok(med["h1_pipelined"] > 1100 and med["h1_two_conns"] < 30 and med["h2_one_conn"] < 30, f"HOL medians of B: {med}")
S = J("sdk_retries.json")["cases"]
for c in S:
    n = len(c["server_saw"])
    exp = {"ok": 1, "400x1": 1, "429_retry_after_1": 2}.get(c["case"], 3)
    ok(n == exp, f"SDK {c['sdk']} {c['case']}: server saw {n} attempts (expected {exp})")
    if c["case"] in ("529x2", "503x2", "500x5", "connection_dropped"):
        ts = [a["t"] for a in c["server_saw"]]; g = [y - x for x, y in zip(ts, ts[1:])]
        ok(0.375 - 0.05 <= g[0] <= 0.5 + 0.1 and 0.75 - 0.05 <= g[1] <= 1.0 + 0.1, f"  backoff gaps {[round(x, 3) for x in g]} within 0.5 and 1.0 s x U(0.75, 1) plus request time")
    if c["case"] == "429_retry_after_1":
        g = c["server_saw"][1]["t"] - c["server_saw"][0]["t"]
        ok(1.0 <= g <= 1.1, f"  Retry-After: 1 honoured ({g:.3f} s)")
for c in S:
    ok(all("idempotency-key" not in a["headers"] for a in c["server_saw"]), f"no idempotency key sent: {c['sdk']} {c['case']}")
print("FAIL" if bad else "all checks pass", bad)
sys.exit(1 if bad else 0)
