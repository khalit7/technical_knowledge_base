"""Every number the Training Infrastructure page computes, recomputed here (stdlib only).
Writes recompute.json, which check_page.mjs compares with what the page's JS shows.
Run from src/:  python3 recompute.py
"""
import json, math

out = {}

# ---- Llama 3 405B, 54-day snapshot (arXiv 2407.21783v3 §3.3.4, Table 5) ----
GPUS, DAYS, UNEXP, PLANNED = 16384, 54, 419, 47
T5 = [("Faulty GPU", "GPU", 148), ("GPU HBM3 Memory", "GPU", 72), ("Software Bug", "Dependency", 54),
      ("Network Switch/Cable", "Network", 35), ("Host Maintenance", "Unplanned Maintenance", 32),
      ("GPU SRAM Memory", "GPU", 19), ("GPU System Processor", "GPU", 17), ("NIC", "Host", 7),
      ("NCCL Watchdog Timeouts", "Unknown", 7), ("Silent Data Corruption", "GPU", 6),
      ("GPU Thermal Interface + Sensor", "GPU", 6), ("SSD", "Host", 3), ("Power Supply", "Host", 3),
      ("Server Chassis", "Host", 2), ("IO Expansion Board", "Host", 2), ("Dependency", "Dependency", 2),
      ("CPU", "Host", 2), ("System Memory", "Host", 2)]
assert sum(c for _, _, c in T5) == UNEXP
gpu = sum(c for _, k, c in T5 if k == "GPU")
nodes = GPUS // 8
out["llama3"] = {
    "mtbf_h_unexpected": round(DAYS * 24 / UNEXP, 2),             # 3.09
    "mtbf_h_all": round(DAYS * 24 / (UNEXP + PLANNED), 2),         # 2.78
    "per_day": round(UNEXP / DAYS, 2),                             # 7.76
    "gpu_count": gpu, "gpu_share_by_count": round(100 * gpu / UNEXP, 1),   # 268, 64.0
    "faulty_gpu_share_true": round(100 * 148 / UNEXP, 1),          # 35.3 (printed 30.1)
    "rf_per_1000_node_days": round(1000 * UNEXP / (nodes * DAYS), 2),       # 3.79
    "per_gpu_failures_per_year": round(UNEXP / (GPUS * DAYS) * 365, 4),
}

# ---- Meta RSC reliability (Kokolis et al., arXiv 2410.21680v2) ----
# E[ETTR] ~ (1 - N r (u0 + dt/2)) / (1 + w/dt); dt* = sqrt(2 w / (N r))
def ettr(n_nodes, rf_per_day, w_min, u0_min, dt_min):
    lam = n_nodes * rf_per_day / 1440.0          # failures per minute
    return (1 - lam * (u0_min + dt_min / 2)) / (1 + w_min / dt_min)

def dt_opt(n_nodes, rf_per_day, w_min):
    lam = n_nodes * rf_per_day / 1440.0
    return math.sqrt(2 * w_min / lam)

rsc1 = 6.50e-3
out["meta"] = {
    "mttf_h_16384": round(24 / (16384 / 8 * rsc1), 2),     # paper: 1.8 h
    "mttf_h_131072": round(24 / (131072 / 8 * rsc1), 3),   # paper: 0.23 h
    "mttf_h_1024_from_rf": round(24 / (1024 / 8 * rsc1), 1),  # paper's empirical 7.9 h is shorter
}
# "ETTR 0.9 at 12,000 GPUs needs ~10 s checkpoint writes or r_f ~1"
n12 = 12000 / 8
sweep = {}
for u0 in (5, 10, 20):
    w = 10 / 60
    d = dt_opt(n12, rsc1, w)
    sweep[str(u0)] = {"dt_opt_min": round(d, 2), "ettr_w10s": round(ettr(n12, rsc1, w, u0, d), 3),
                      "ettr_w5min": round(ettr(n12, rsc1, 5, u0, dt_opt(n12, rsc1, 5)), 3),
                      "ettr_w5min_rf1": round(ettr(n12, 1e-3, 5, u0, dt_opt(n12, 1e-3, 5)), 3)}
out["meta"]["at_12000"] = sweep

# ---- Llama 3 ">90% effective training time": which (w, u0) clear it at the Llama 3 rate ----
rf_l3 = UNEXP / (nodes * DAYS)
grid = {}
for w_s in (6.3, 10, 30, 60, 148.8, 300):
    for u0 in (5, 10, 20):
        w = w_s / 60
        d = dt_opt(nodes, rf_l3, w)
        grid[f"{w_s}s_{u0}m"] = {"dt_opt_min": round(d, 1), "ettr": round(ettr(nodes, rf_l3, w, u0, d), 3)}
out["llama3_grid"] = grid

# ---- Checkpoint sizes and write-time floors ----
def ckpt_tb(params, bpp):
    return params * bpp / 1e12
out["ckpt"] = {
    "llama405_12B_TB": round(ckpt_tb(405.853e9, 12), 2),            # fp32 master + Adam m, v
    "llama405_14B_TB": round(ckpt_tb(405.853e9, 14), 2),            # + bf16 weights
    "llama405_per_gpu_MB_12B": round(405.853e9 * 12 / 16384 / 1e6),  # Llama 3 says 1 MB to 4 GB per GPU
    "llama405_floor_s_at_2TBps": round(ckpt_tb(405.853e9, 12) / 2.0, 2),
    # Gemini (SOSP'23) §2.2: MT-NLG to remote storage at 20 Gbps takes 42 min -> implied bytes per parameter
    "mtnlg_implied_bpp": round(42 * 60 * 20e9 / 8 / 530e9, 1),
    # IBM / PyTorch async DCP: 7B, 148.8 s -> 6.3 s
    "ibm_speedup": round(148.8 / 6.3, 2),
    "ibm_7b_effective_GBps_sync": round(7e9 * 12 / 148.8 / 1e9, 2),
}

# ---- torchft blog arithmetic ----
out["torchft"] = {"run1_step_eff": round(5145 / 6249 * 100, 1), "run1_train_eff": round(5145 / 6249 * 29.6 / 30 * 100, 1),
                  "run2_step_eff": round(268 / 888 * 100, 1), "run2_train_eff": round(268 / 888 * 18.9 / 30 * 100, 1)}

# ---- OPT-175B: 2 months, >=35 manual restarts, >100 hosts cycled; ~178,000 GPU-hours wasted (Gemini SOSP'23 citing OPT logbook) ----
out["opt"] = {"gpu_hours_2_months": 992 * 24 * 61, "wasted_share": round(178000 / (992 * 24 * 61) * 100, 1)}

# ---- The day-long animation: seeded failures and four recovery designs ----
# Arrivals: exponential inter-arrival at the Llama 3 rate (419/54 per day), seed fixed; causes drawn in proportion to Table 5 counts.
class Rng:  # mulberry32, identical to the page's JS
    def __init__(self, s): self.s = s & 0xFFFFFFFF
    def __call__(self):
        self.s = (self.s + 0x6D2B79F5) & 0xFFFFFFFF
        t = self.s
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296

def failures(seed, day_min=1440, rate=UNEXP / DAYS / 1440):
    r = Rng(seed); t = 0; fs = []
    while True:
        t += -math.log(1 - r()) / rate
        if t >= day_min: break
        x = r() * UNEXP; acc = 0
        for name, cat, c in T5:
            acc += c
            if x < acc: break
        fs.append((round(t, 1), name))
    return fs

SEED = 119
FAILS = failures(SEED)
out["anim_failures"] = FAILS

# Designs. w: training pause per checkpoint (min); P: background persist after the pause (min) during which a
# failure loses that checkpoint; u: downtime per failure (min); I: training minutes between checkpoints
# (Young/Daly optimum at the Llama 3 rate unless given); group: if set, only 1/group of the job stops (torchft).
MTBF = DAYS * 1440 / UNEXP
DESIGNS = {
    "sync":  {"w": 5.0, "P": 0.0, "u": 20.0},
    "async": {"w": 10 / 60, "P": 5.0, "u": 20.0},
    "mem":   {"w": 10 / 60, "P": 0.0, "u": 5.0},
    "ft":    {"w": 0.0, "P": 0.0, "u": 5.0, "group": 16},
}
for d in DESIGNS.values():
    d["I"] = math.sqrt(2 * d["w"] * MTBF) if d["w"] > 0 else None

def simulate(d, fails, T=1440.0):
    """Event simulation in wall-clock minutes. Returns useful minutes, lost (rework) minutes, stall minutes,
    downtime minutes, the list of segments (kind, start, end) and the per-failure losses."""
    segs = []; t = 0.0; p = 0.0; c = 0.0; pending = None  # pending: (progress saved, time persisted)
    fi = 0; lost = 0.0; stall = 0.0; down = 0.0; per = []
    if d.get("group"):
        g = d["group"]; useful = T;
        for (tf, _) in fails:
            dt = min(d["u"], T - tf); useful -= dt / g; down += dt / g; per.append({"t": tf, "lost": 0.0, "down": round(dt / g, 3)})
        return {"useful": useful, "lost": 0.0, "stall": 0.0, "down": down, "per": per}
    I, w, P, u = d["I"], d["w"], d["P"], d["u"]
    next_ck = I
    while t < T - 1e-9:
        tf = fails[fi][0] if fi < len(fails) else T + 1
        # train until next checkpoint (in progress terms) or failure or end
        t_ck = t + (next_ck - p)
        t_end = min(tf, t_ck, T)
        if pending and pending[1] <= t_end and pending[1] <= tf:
            c = pending[0]; pending = None
        p += t_end - t; t = t_end
        if t >= T - 1e-9: break
        if abs(t - tf) < 1e-9 or tf <= t:   # failure
            if pending and pending[1] > tf: pending = None   # checkpoint not yet persisted: lost
            l = p - c; lost += l; per.append({"t": tf, "lost": round(l, 3), "down": round(min(u, T - t), 3)})
            p = c; dd = min(u, T - t); down += dd; t += dd; fi += 1
            next_ck = p + I
            while fi < len(fails) and fails[fi][0] < t:   # failures during downtime are absorbed
                fi += 1
            continue
        # checkpoint: pause w
        dd = min(w, T - t)
        if fi < len(fails) and fails[fi][0] < t + dd:   # failure during the pause
            dd = fails[fi][0] - t; stall += dd; t += dd; continue
        stall += dd; t += dd
        if P > 0: pending = (p, t + P)
        else: c = p
        next_ck = p + I
    return {"useful": p, "lost": lost, "stall": stall, "down": down, "per": per}

sims = {}
for k, d in DESIGNS.items():
    s = simulate(d, FAILS)
    lam = 1 / MTBF
    expected = (1 - lam * (d["u"] + (d["I"] or 0) / 2)) / (1 + (d["w"] / d["I"] if d["I"] else 0)) if not d.get("group") else 1 - lam * d["u"] / d["group"]
    sims[k] = {"I_min": round(d["I"], 2) if d["I"] else None, "goodput_day": round(100 * s["useful"] / 1440, 1),
               "lost_min": round(s["lost"], 1), "stall_min": round(s["stall"], 1), "down_min": round(s["down"], 1),
               "expected_ettr": round(100 * expected, 1)}
out["anim"] = {"seed": SEED, "mtbf_min": round(MTBF, 1), "n_fail": len(FAILS), "designs": sims}

# Calculator defaults (Llama 3 rate, w = 10 s, u0 = 10 min) at 16,384 and 131,072 GPUs, and the 1-minute restart case
cal = {}
for g in (16384, 131072):
    for w_s, u0 in ((10, 10), (300, 10), (10, 1)):
        n = g / 8; w = w_s / 60; d = dt_opt(n, rf_l3, w)
        cal[f"{g}_{w_s}s_{u0}m"] = round(ettr(n, rf_l3, w, u0, d), 3)
out["calc"] = cal
json.dump(out, open("recompute.json", "w"), indent=1)
print(json.dumps(out, indent=1))
