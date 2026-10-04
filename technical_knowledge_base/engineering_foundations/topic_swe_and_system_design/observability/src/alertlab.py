"""Alert lab engine (Python twin of parts/31_js_alab.js).

The SRE workbook's six ways to alert on an SLO (ch. 5, https://sre.google/workbook/alerting-on-slos/),
run on the same error-ratio timeline at 10-second resolution. Traffic is constant, so the error
ratio over a window is the mean of the per-step error ratios in that window.
"""
STEP = 10                      # seconds per step
DAY = 86400
H = 3600
M = 60
PERIOD = 30 * DAY              # the workbook quotes its thresholds for a 30-day period
LEAD = 3 * DAY                 # history before the incident, so 3-day windows are full
HORIZON = 7 * DAY

# scenarios: list of (start offset s, duration s, error ratio); offsets from incident start
SCEN = {
    "outage":  ("Total outage, 20 min", [(0, 20 * M, 1.0)]),
    "deploy":  ("Bad deploy: 5% errors for 45 min, then rollback", [(0, 45 * M, 0.05)]),
    "flap":    ("Flapping: 100% errors 5 min in every 10, three times", [(0, 5 * M, 1.0), (10 * M, 5 * M, 1.0), (20 * M, 5 * M, 1.0)]),
    "spike15": ("15% errors for 10 min (workbook figure 5-6)", [(0, 10 * M, 0.15)]),
    "steady35": ("3.5% errors for 20 h (the workbook's 35x burn)", [(0, 20 * H, 0.035)]),
    "leak":    ("Slow leak: 0.5% errors for 2 days", [(0, 2 * DAY, 0.005)]),
    "blip":    ("Blip: 1% errors for 10 min", [(0, 10 * M, 0.01)]),
}

APPROACHES = ["A1", "A2", "A3", "A4", "A5", "A6"]


def series(key, base=0.0):
    n = HORIZON // STEP
    e = [base] * n
    for off, dur, r in SCEN[key][1]:
        a = (LEAD + off) // STEP
        for i in range(a, a + dur // STEP):
            e[i] = r
    return e


def incident_span(key):
    segs = SCEN[key][1]
    return LEAD, LEAD + max(o + d for o, d, _ in segs)


def prefix(e):
    p = [0.0]
    for x in e:
        p.append(p[-1] + x)
    return p


def ratio(p, i, w):
    """mean error ratio over the w seconds ending at step i (inclusive)."""
    k = w // STEP
    a = max(0, i + 1 - k)
    return (p[i + 1] - p[a]) / k


def rules(b):
    """each approach -> list of (name, severity, test(p, i))."""
    R = lambda p, i, w: ratio(p, i, w)
    return {
        "A1": [("10m >= SLO", "page", lambda p, i: R(p, i, 10 * M) >= b)],
        "A2": [("36h > SLO", "page", lambda p, i: R(p, i, 36 * H) > b)],
        "A3": [("1m > SLO for 1h", "page", None)],  # handled specially
        "A4": [("1h > 36x", "page", lambda p, i: R(p, i, H) > 36 * b)],
        "A5": [("1h > 14.4x", "page", lambda p, i: R(p, i, H) > 14.4 * b),
               ("6h > 6x", "page", lambda p, i: R(p, i, 6 * H) > 6 * b),
               ("3d > 1x", "ticket", lambda p, i: R(p, i, 3 * DAY) > b)],
        "A6": [("1h & 5m > 14.4x", "page", lambda p, i: R(p, i, H) > 14.4 * b and R(p, i, 5 * M) > 14.4 * b),
               ("6h & 30m > 6x", "page", lambda p, i: R(p, i, 6 * H) > 6 * b and R(p, i, 30 * M) > 6 * b),
               ("24h & 2h > 3x", "ticket", lambda p, i: R(p, i, 24 * H) > 3 * b and R(p, i, 2 * H) > 3 * b),
               ("3d & 6h > 1x", "ticket", lambda p, i: R(p, i, 3 * DAY) > b and R(p, i, 6 * H) > b)],
    }


def run(key, slo, base=0.0):
    b = 1 - slo
    e = series(key, base)
    p = prefix(e)
    n = len(e)
    t0, t1 = incident_span(key)
    out = {}
    for ap, rs in rules(b).items():
        fires = []  # per rule: boolean list
        for name, sev, f in rs:
            if f is None:  # A3: condition must hold at every step of the last hour
                need = H // STEP
                run_len = 0
                v = []
                for i in range(n):
                    run_len = run_len + 1 if ratio(p, i, M) > b else 0
                    v.append(run_len >= need)
            else:
                v = [f(p, i) for i in range(n)]
            fires.append((name, sev, v))
        res = {}
        for sev in ("page", "ticket"):
            vs = [v for _, s_, v in fires if s_ == sev]
            if not vs:
                continue
            on = [any(v[i] for v in vs) for i in range(n)]
            first = next((i for i in range(n) if on[i]), None)
            r = {"fires": first is not None}
            if first is not None:
                last = max(i for i in range(n) if on[i])
                r.update(detect_s=(first + 1) * STEP - t0,   # end of the step in which it fired
                         spent_at_detect=(p[first + 1] - p[t0 // STEP]) * STEP / (b * PERIOD),
                         reset_s=(last + 1) * STEP - t1,
                         notifications=sum(1 for v in vs for i in range(n) if v[i] and (i == 0 or not v[i - 1])))
            res[sev] = r
        out[ap] = res
    total = (p[n] - p[0] - base * n) * STEP / (b * PERIOD)
    return {"budget_spent": total, "alerts": out}


if __name__ == "__main__":
    import json
    r = run("outage", 0.999)
    print(json.dumps(r, indent=1))
