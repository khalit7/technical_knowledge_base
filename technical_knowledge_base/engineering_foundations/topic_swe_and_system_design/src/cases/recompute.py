"""Recompute every derived number on the Case files tab, and the flagship animation's model.

1. Derived card numbers (each card shows its formula): checked against the quoted inputs.
2. The congestive-collapse animation (AWS DWFM, 20 Oct 2025): a deliberately tiny, illustrative model of the
   mechanism the postmortem describes; AWS gives no internal sizes, so N, C and T below are ours, not AWS's.
   The page's JavaScript must produce the same step states (checked by the tab's puppeteer script against
   recompute_out.json).
Run: python3 recompute.py  (writes recompute_out.json)
"""
import json, os
from datetime import datetime as D

HERE = os.path.dirname(os.path.abspath(__file__))
out = {}


def minutes(a, b):
    return int((D.strptime(b, "%Y-%m-%d %H:%M") - D.strptime(a, "%Y-%m-%d %H:%M")).total_seconds() // 60)


def hm(m):
    return f"{m // 60} h {m % 60} min" if m >= 60 else f"{m} min"


checks = [
    ("aws-2025-dwfm", "3 h 3 min", hm(minutes("2025-10-20 02:25", "2025-10-20 05:28"))),
    ("aws-2025-dns", "14 h 32 min", hm(minutes("2025-10-19 23:48", "2025-10-20 14:20"))),
    ("cf-2026-02", "17%", f"{round(100 * 1100 / 6500)}%"),
    ("cf-2026-02", "50 min", hm(minutes("2026-02-20 17:56", "2026-02-20 18:46"))),
    ("oai-2024-12", "4 h 22 min", hm(minutes("2024-12-11 15:16", "2024-12-11 19:38"))),
    ("crowd-2024-07", "78 min", f"{minutes('2024-07-19 04:09', '2024-07-19 05:27')} min"),
    ("slack-2021-01", "14 min", hm(minutes("2021-01-04 07:01", "2021-01-04 07:15"))),
    ("abl-timeouts", "3^5 = 243", f"3^5 = {3 ** 5}"),
    ("insta-2012", "1024", str(2 ** 10)),
    ("notion-2021", "15", str(480 // 32)),
    ("memcache-2013", "13x", f"{round(17000 / 1300)}x"),
    ("twitter-2013", "25x", f"{round(143199 / 5700)}x"),
]
bad = [c for c in checks if c[1] != c[2]]
out["derived"] = [dict(case=c, shown=s, recomputed=r, ok=s == r) for c, s, r in checks]
# Notion: 480 divides evenly over the host counts the post names
assert all(480 % h == 0 for h in (32, 40, 48))
# Instagram: 41 bits of milliseconds is about 69.7 years of IDs; the post says "41 years" (it reads "41 bits ... gives us 41 years")
out["insta_41_bits_years"] = round(2 ** 41 / 1000 / 3600 / 24 / 365.25, 1)
# SRE book: 99.99% of a year in minutes, and 0.01% of 2.5M requests
out["sre_minutes"] = round(365 * 24 * 60 * 0.0001, 2)
out["sre_errors"] = round(2.5e6 * 0.0001)
assert out["sre_minutes"] == 52.56 and out["sre_errors"] == 250

# ---- the animation model ----
N, C, T = 48, 4, 3          # droplets, lease attempts finished per tick, timeout in ticks (illustrative)
L = C * T                   # the most work that can wait in line and still finish before its timeout


def sim_before(ticks=16):
    """All N droplets ask at tick 1. FIFO; each tick the worker finishes C attempts. An attempt served
    T or more ticks after it joined the line has timed out: the work is wasted and a new attempt joins the back."""
    q = [(d, 1) for d in range(N)]  # (droplet, tick it joined)
    leased, wasted, done = set(), 0, 0
    states = [dict(t=0, leased=0, queue=N, wasted=0, done=0, outside=0)]
    for t in range(1, ticks + 1):
        served, q = q[:C], q[C:]
        for d, e in served:
            done += 1
            if t - e < T:
                leased.add(d)
            else:
                wasted += 1
                q.append((d, t))
        states.append(dict(t=t, leased=len(leased), queue=len(q), wasted=wasted, done=done, outside=0))
    return states


def sim_after(start):
    """From the collapsed state: restart empties the queue (step 1); then each tick admits work only while the
    line is shorter than L, so every admitted attempt finishes in time."""
    leased = start["leased"]
    outside = N - leased
    wasted, done = start["wasted"], start["done"]
    states = [dict(start, t=0), dict(t=1, leased=leased, queue=0, wasted=wasted, done=done, outside=outside)]
    q = 0
    t = 1
    while leased < N:
        t += 1
        admit = min(L - q, outside)
        outside -= admit
        q += admit
        fin = min(C, q)
        q -= fin
        leased += fin
        done += fin
        states.append(dict(t=t, leased=leased, queue=q, wasted=wasted, done=done, outside=outside))
    return states


before = sim_before()
after = sim_after(before[-1])
out["anim"] = dict(N=N, C=C, T=T, L=L, before=before, after=after)
# what the captions claim
assert before[3]["leased"] == L and before[-1]["leased"] == L          # only the first L ever succeed
assert all(s["queue"] == N - L for s in before[4:])                       # the line never shrinks
assert before[-1]["wasted"] == before[-1]["done"] - L                     # every attempt after the first L is wasted
assert after[-1]["leased"] == N and after[-1]["wasted"] == before[-1]["wasted"]
out["anim_claims"] = dict(before_leased_final=before[-1]["leased"], before_wasted_final=before[-1]["wasted"],
                          after_ticks_to_all=after[-1]["t"] - 1, after_steps=len(after))
json.dump(out, open(os.path.join(HERE, "recompute_out.json"), "w"), indent=1)
print("derived:", "all match" if not bad else bad)
print("insta 41 bits =", out["insta_41_bits_years"], "years; anim:", out["anim_claims"])
