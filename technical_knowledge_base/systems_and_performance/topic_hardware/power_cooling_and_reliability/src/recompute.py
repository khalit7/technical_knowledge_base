#!/usr/bin/env python3
"""Every derived number on the page, stdlib only.

Writes out/expected.json and parts/22_js_pw_data.js (window.PW, embedded in the page).
Sources are typed next to each input with the date they were fetched (2026-10-05).
The checkpoint simulator here is the reference for the page's JavaScript engine (25_js_pw_sim.js):
same PRNG (mulberry32), same event rules; check_embed.py and check/check_page.mjs compare them.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = {}

def r(x, n=3):
    return float(f"{x:.{n}g}") if x else 0.0

# ---------------------------------------------------------------- PRNG and exponential draws
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF
        t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        t &= 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296.0
    return nxt

def arrivals(seed, mu, horizon):
    """Poisson failure arrival times (hours) on [0, horizon), mean gap mu."""
    rnd = mulberry32(seed)
    t, out = 0.0, []
    while True:
        u = rnd()
        t += -mu * math.log(1.0 - u)   # u in [0,1): 1-u in (0,1]
        if t >= horizon:
            return out
        out.append(t)

# ---------------------------------------------------------------- the checkpoint model
# Period T = (T - C) of work, then a checkpoint of length C. A failure loses everything since the last
# completed checkpoint, then the job is down for D (no failures counted while down: arrivals in D are skipped)
# and recovers for R (reload; failures can strike during R). This is the model of Aupy et al. 2013 (Sec. 3),
# whose exact expectation for exponential failures is Time_final = (mu+D) e^{R/mu} (e^{T/mu} - 1) Time_base/(T-C).
def simulate(fails, T, C, D, R, horizon, segs=False):
    """Walk the timeline to `horizon` hours. Returns totals (hours) and optionally segments for drawing."""
    t, i, committed, lost, ck, down = 0.0, 0, 0.0, 0.0, 0.0, 0.0
    seg = []
    nf = len(fails)
    def nextf(after):
        nonlocal i
        while i < nf and fails[i] < after:
            i += 1
        return fails[i] if i < nf else float('inf')
    phase, left, pending = 'work', T - C, 0.0   # pending = work done since last completed checkpoint
    nfails = 0
    while t < horizon - 1e-12:
        f = nextf(t)
        if phase == 'down':
            d = min(left, horizon - t)
            seg.append(('down', t, t + d)); down += d
            if d == left:
                t, left = t + left, 0.0
            else:
                t += d; left -= d
            # arrivals during downtime are skipped
            while i < nf and fails[i] < t:
                i += 1
            if left <= 1e-12:
                phase, left = 'rec', R
            continue
        end = min(t + left, horizon)
        if f < end:   # failure strikes inside this phase
            d = f - t
            if phase == 'work':
                seg.append(('work', t, f)); pending += d
            elif phase == 'ck':
                seg.append(('ck', t, f)); ck += d
            else:
                seg.append(('rec', t, f)); down += d
            # everything since the last completed checkpoint is lost
            lost += pending
            seg.append(('fail', f, f))
            seg.append(('lostmark', f - pending, f)) if pending > 0 else None
            pending = 0.0; nfails += 1
            t = f; i += 1
            phase, left = 'down', D
            if D <= 0:
                phase, left = 'rec', R
            continue
        d = end - t
        if phase == 'work':
            seg.append(('work', t, end)); pending += d
        elif phase == 'ck':
            seg.append(('ck', t, end)); ck += d
        else:
            seg.append(('rec', t, end)); down += d
        if end >= t + left:
            t, left = t + left, 0.0
        else:
            t = end; left -= d
        if left <= 1e-12:
            if phase == 'work':
                phase, left = 'ck', C
                if C <= 0:
                    committed += pending; pending = 0.0; phase, left = 'work', T - C
            elif phase == 'ck':
                committed += pending; pending = 0.0; phase, left = 'work', T - C
            else:
                phase, left = 'work', T - C
    res = dict(committed=committed, pending=pending, lost=lost, ck=ck, down=down, fails=nfails)
    if segs:
        res['segs'] = seg
    return res

def eff_exact(T, mu, C, D, R):
    """Long-run fraction of wall-clock time that becomes saved work (exponential failures, exact)."""
    if T <= C:
        return 0.0
    return (T - C) / ((mu + D) * math.exp(R / mu) * math.expm1(T / mu))

def eff_first(T, mu, C, D, R):
    """First-order: 1 - Waste, Waste = C/T + (1 - C/T)(D + R + T/2)/mu (Aupy et al. eq. 12)."""
    w = C / T + (1 - C / T) * (D + R + T / 2) / mu
    return 1 - w

def t_young(mu, C):
    return math.sqrt(2 * mu * C) + C

def t_daly1(mu, C, D, R):
    return math.sqrt(2 * (mu + D + R) * C) + C

def t_rfo(mu, C, D, R):
    return math.sqrt(2 * max(mu - (D + R), 0) * C)

def t_opt(mu, C, D, R):
    """Exact optimum of eff_exact by golden-section search on log T."""
    lo, hi = math.log(C * 1.0001 + 1e-9), math.log(max(50 * mu, 10 * C))
    g = (math.sqrt(5) - 1) / 2
    f = lambda x: -eff_exact(math.exp(x), mu, C, D, R)
    a, b = lo, hi
    c, d = b - g * (b - a), a + g * (b - a)
    for _ in range(200):
        if f(c) < f(d):
            b = d
        else:
            a = c
        c, d = b - g * (b - a), a + g * (b - a)
    return math.exp((a + b) / 2)

# ---------------------------------------------------------------- 1. Validate the formulas against Aupy et al. Table 2
aupy_mu = [3849609, 1924805, 962402, 481201, 240601, 120300, 60150, 30075, 15038, 7519]
aupy_young = [68567, 48660, 34584, 24630, 17592, 12615, 9096, 6608, 4848, 3604]
aupy_daly = [68573, 48668, 34595, 24646, 17615, 12648, 9142, 6673, 4940, 3733]
aupy_rfo = [67961, 48052, 33972, 24014, 16968, 11982, 8449, 5941, 4154, 2869]
aupy_opt = [68240, 48320, 34189, 24231, 17194, 12218, 8701, 6214, 4458, 3218]
Cs, Rs, Ds = 600.0, 600.0, 60.0
rows = []
for k, mu in enumerate(aupy_mu):
    rows.append(dict(N=2 ** (10 + k), mu=mu,
                     young=round(t_young(mu, Cs)), daly=round(t_daly1(mu, Cs, Ds, Rs)), rfo=round(t_rfo(mu, Cs, Ds, Rs)),
                     opt=round(t_opt(mu, Cs, Ds, Rs)),
                     pub=dict(young=aupy_young[k], daly=aupy_daly[k], rfo=aupy_rfo[k], opt=aupy_opt[k])))
OUT['aupy_table2'] = rows
OUT['aupy_max_rel_err'] = max(max(abs(row[k] - row['pub'][k]) / row['pub'][k] for k in ('young', 'daly', 'rfo', 'opt')) for row in rows)

# ---------------------------------------------------------------- 2. Failure rates (Llama 3, Kokolis et al.)
L3_UNEXP, L3_DAYS, L3_GPUS = 419, 54, 16384           # Llama 3 §3.3.4, Table 5
L3_NODES = L3_GPUS // 8
rate_l3 = L3_UNEXP / (L3_DAYS * L3_NODES) * 1000       # failures per 1,000 node-days
OUT['rate_llama3_per_k_node_days'] = r(rate_l3, 4)
OUT['mtbf_llama3_h'] = r(L3_DAYS * 24 / L3_UNEXP, 4)
OUT['mtbf_llama3_min'] = r(L3_DAYS * 24 * 60 / L3_UNEXP, 4)
def mtbf_h(gpus, rate_k):
    return 24.0 / (gpus / 8 * rate_k / 1000)
OUT['kokolis_mtbf_16k_h'] = r(mtbf_h(16384, 6.50), 3)       # paper: 1.8 h
OUT['kokolis_mtbf_131k_h'] = r(mtbf_h(131072, 6.50), 3)     # paper: 0.23 h
OUT['mtbf_100k_llama3rate_min'] = r(mtbf_h(100000, rate_l3) * 60, 3)
OUT['mtbf_1gpu_years_llama3rate'] = r(mtbf_h(1, rate_l3) / 24 / 365.25, 3)
OUT['mtbf_1server_days_llama3rate'] = r(mtbf_h(8, rate_l3) / 24, 3)

# Table 5 regrouped by hardware part (counts printed in the paper)
t5 = [["Faulty GPU", "GPU", 148], ["GPU HBM3 Memory", "GPU", 72], ["Software Bug", "Dependency", 54],
      ["Network Switch/Cable", "Network", 35], ["Host Maintenance", "Unplanned Maintenance", 32],
      ["GPU SRAM Memory", "GPU", 19], ["GPU System Processor", "GPU", 17], ["NIC", "Host", 7],
      ["NCCL Watchdog Timeouts", "Unknown", 7], ["Silent Data Corruption", "GPU", 6],
      ["GPU Thermal Interface + Sensor", "GPU", 6], ["SSD", "Host", 3], ["Power Supply", "Host", 3],
      ["Server Chassis", "Host", 2], ["IO Expansion Board", "Host", 2], ["Dependency", "Dependency", 2],
      ["CPU", "Host", 2], ["System Memory", "Host", 2]]
OUT['t5'] = t5
OUT['t5_total'] = sum(x[2] for x in t5)
gpu = sum(x[2] for x in t5 if x[1] == 'GPU')
OUT['t5_gpu'] = gpu
OUT['t5_gpu_pct'] = round(100 * gpu / 419, 1)
OUT['t5_faulty_gpu_pct_by_count'] = round(100 * 148 / 419, 1)
OUT['t5_hbm_pct'] = round(100 * 72 / 419, 1)
OUT['t5_memory_on_gpu'] = 72 + 19
OUT['t5_memory_on_gpu_pct'] = round(100 * 91 / 419, 1)
OUT['t5_per_gpu_hbm_years'] = r(L3_DAYS * L3_GPUS / 72 / 365.25, 3)   # GPU-years per HBM interruption

# ---------------------------------------------------------------- 3. Simulator defaults (Llama 3 scale)
# Illustrative recovery settings, labelled on the page: C = 5 min (Meta's assumed synchronous pause, Kokolis et al.),
# D = 10 min downtime (detect and replace), R = 5 min (reload). The "before" interval of 3 h is illustrative.
SIM = dict(gpus=16384, rate=round(rate_l3, 4), C=5 / 60, D=10 / 60, R=5 / 60, bad=3.0, horizon=24.0, seed=54)
mu = mtbf_h(SIM['gpus'], SIM['rate'])
SIM['mu'] = mu
Ty, Tr, To = t_young(mu, SIM['C']), t_rfo(mu, SIM['C'], SIM['D'], SIM['R']), t_opt(mu, SIM['C'], SIM['D'], SIM['R'])
OUT['sim_defaults'] = SIM
OUT['sim_mu_h'] = r(mu, 4)
OUT['sim_T_young_min'] = r(Ty * 60, 4)
OUT['sim_T_rfo_min'] = r(Tr * 60, 4)
OUT['sim_T_opt_min'] = r(To * 60, 4)
for name, T in (('young', Ty), ('opt', To), ('bad', SIM['bad'])):
    OUT[f'sim_eff_exact_{name}'] = r(eff_exact(T, mu, SIM['C'], SIM['D'], SIM['R']), 4)
    OUT[f'sim_eff_first_{name}'] = r(eff_first(T, mu, SIM['C'], SIM['D'], SIM['R']), 4)
# too frequent: every 10 minutes
OUT['sim_eff_exact_10min'] = r(eff_exact(10 / 60, mu, SIM['C'], SIM['D'], SIM['R']), 4)

# the animated day: same failures, two intervals
fails = arrivals(SIM['seed'], mu, SIM['horizon'])
OUT['day_fails_h'] = [round(x, 4) for x in fails]
for name, T in (('bad', SIM['bad']), ('young', Ty)):
    s = simulate(fails, T, SIM['C'], SIM['D'], SIM['R'], SIM['horizon'])
    OUT[f'day_{name}'] = {k: round(v, 4) if isinstance(v, float) else v for k, v in s.items()}

# Monte Carlo check of the exact formula: long runs (2,000 MTBFs each), 8 seeds, at 9 intervals
mc = []
for T in [10 / 60, 0.25, 0.5, Ty, 1.0, 1.5, 2.0, 3.0, 5.0]:
    effs = []
    for sd in range(1, 9):
        H = 2000 * mu
        f = arrivals(1000 + sd, mu, H)
        s = simulate(f, T, SIM['C'], SIM['D'], SIM['R'], H)
        effs.append(s['committed'] / H)
    m = sum(effs) / len(effs)
    mc.append(dict(T_h=round(T, 4), mc_mean=round(m, 4), mc_min=round(min(effs), 4), mc_max=round(max(effs), 4),
                   exact=round(eff_exact(T, mu, SIM['C'], SIM['D'], SIM['R']), 4),
                   first=round(eff_first(T, mu, SIM['C'], SIM['D'], SIM['R']), 4)))
OUT['mc_check'] = mc
OUT['mc_max_abs_gap'] = round(max(abs(x['mc_mean'] - x['exact']) for x in mc), 4)

# Scale: optimum efficiency against GPU count (Llama 3 rate), exact and first order, C = 5 min and 10 s
scale = []
for g in [1024, 4096, 16384, 65536, 100000, 131072, 262144, 524288]:
    m = mtbf_h(g, rate_l3)
    row = dict(gpus=g, mtbf_min=round(m * 60, 2))
    for lab, C in (('c5m', 5 / 60), ('c10s', 10 / 3600)):
        to = t_opt(m, C, SIM['D'], SIM['R'])
        ty = t_young(m, C)
        row[lab] = dict(T_opt_min=round(to * 60, 2), eff_opt=round(eff_exact(to, m, C, SIM['D'], SIM['R']), 4),
                        eff_first_at_young=round(eff_first(ty, m, C, SIM['D'], SIM['R']), 4),
                        eff_exact_at_young=round(eff_exact(ty, m, C, SIM['D'], SIM['R']), 4))
    scale.append(row)
OUT['scale'] = scale

# Training Infrastructure page cross-check: optimal interval sqrt(2 w MTBF) with w = 5 min at 185.6 min
OUT['ti_check_interval_min'] = r(math.sqrt(2 * 5 * L3_DAYS * 24 * 60 / L3_UNEXP), 4)

# ---------------------------------------------------------------- 4. Power per chip, J per FLOP (max power / dense BF16 peak)
chips = [  # name, year, max power W, dense BF16 TFLOPS, note, source key
    ["TPU v2", 2017, 280, 46, "TDP", "jouppi"],
    ["TPU v3", 2018, 450, 123, "TDP", "jouppi"],
    ["A100 SXM", 2020, 400, 312, "max", "a100"],
    ["TPU v4", 2020, 192, 275, "measured max", "tpuv4"],
    ["H100 SXM", 2022, 700, 989.5, "max", "h100"],
    ["MI300X", 2023, 750, 1307.4, "TBP", "mi300x"],
    ["B200 (GB200)", 2024, 1200, 2500, "max", "bwu"],
    ["MI355X", 2025, 1400, 2516.6, "TBP", "mi355x"],
    ["B300 (GB300)", 2025, 1400, 2500, "max", "bwu"],
    ["MI455X (announced)", 2026, 2500, 5000, "max TBP", "mi455x"],
]
for c in chips:
    c.append(round(c[2] / (c[3] * 1e12) * 1e12, 3))   # pJ per FLOP = W / (FLOP/s) * 1e12
OUT['chips'] = chips
OUT['h100_pj'] = chips[4][6]
OUT['a100_pj'] = chips[2][6]

# ---------------------------------------------------------------- 5. Systems, PUE, per gigawatt
systems = [  # key, name, kW (vendor), accelerators, dense BF16 TF per accelerator, rent $/acc-h (FACTS, on demand) or null
    ["dgxh100", "DGX H100 (8 H100)", 10.2, 8, 989.5, 3.99],
    ["dgxb200", "DGX B200 (8 B200)", 14.3, 8, 2250, 6.69],
    ["dgxb300", "DGX B300 (8 B300)", 14.0, 8, 2250, None],
    ["nvl72", "GB200 NVL72 rack (72 B200)", 120.0, 72, 2500, None],
    ["ironwood", "Ironwood pod (9,216 TPU7x)", 10000.0, 9216, 2307, 12.00],
]
OUT['systems'] = systems
PUE_GOOGLE, PUE_UPTIME, PUE_ROOT = 1.09, 1.54, 1.2
PRICE = 0.0977   # $/kWh, EIA US industrial average, July 2026 (released 2026-09-24)
def per_gw(sys, pue, mw=1000.0):
    kw_acc = sys[2] / sys[3] * pue
    n = mw * 1000 / kw_acc
    return n, kw_acc
gw = {}
for s in systems:
    out = {}
    for lab, pue in (('google', PUE_GOOGLE), ('root', PUE_ROOT), ('uptime', PUE_UPTIME)):
        n, kwa = per_gw(s, pue)
        out[lab] = dict(acc=round(n), systems=round(n / s[3]), peak_ef=round(n * s[4] / 1e6, 1),
                        kw_per_acc=round(kwa, 4), elec_per_acc_h=round(kwa * PRICE, 4))
    gw[s[0]] = out
OUT['per_gw'] = gw
OUT['root_check_b200_per_gw'] = gw['dgxb200']['root']['acc']     # root says "about 466,000"
OUT['gw_year_twh'] = 8.766                                      # 1 GW x 8,766 h (365.25 days)
OUT['gw_year_cost_busd'] = round(1e6 * 8766 * PRICE / 1e9, 3)    # 1 GW all year at the EIA price, $B
OUT['h100_elec_share_of_rent'] = round(gw['dgxh100']['root']['elec_per_acc_h'] / 3.99 * 100, 2)
OUT['b200_elec_share_of_rent'] = round(gw['dgxb200']['root']['elec_per_acc_h'] / 6.69 * 100, 2)
OUT['ironwood_kw_per_chip'] = round(10000 / 9216, 4)
OUT['nvl72_shelves_kw'] = 8 * 33          # eight shelves, 33 kW input each, N+N redundant
OUT['nvl72_shelf_psus_kw'] = 6 * 5.5      # six 5.5 kW PSUs per shelf
OUT['dgxh100_psus_kw'] = 6 * 3.3

# Power delivery: copper at 54 V vs 800 V for 1 MW (I = P / V)
OUT['amps_1mw_54v'] = round(1e6 / 54)
OUT['amps_1mw_800v'] = round(1e6 / 800)

# ---------------------------------------------------------------- 6. Cooling: air against water for the same heat
RHO_AIR, CP_AIR, RHO_W, CP_W = 1.2, 1005.0, 998.0, 4186.0     # about 20 C, 1 atm
CFM = 0.000471947                                             # m^3/s per cubic foot per minute
OUT['vol_heat_ratio'] = round(RHO_W * CP_W / (RHO_AIR * CP_AIR))
dgx_flow = 1105 * CFM
OUT['dgxh100_airflow_m3s'] = round(dgx_flow, 4)
OUT['dgxh100_air_dT'] = round(10200 / (RHO_AIR * CP_AIR * dgx_flow), 2)
def air_flow(kw, dT):
    return kw * 1000 / (RHO_AIR * CP_AIR * dT)
def water_lpm(kw, dT):
    return kw * 1000 / (CP_W * dT) / RHO_W * 1000 * 60
OUT['nvl72_air_m3s_dT15'] = round(air_flow(120, 15), 3)
OUT['nvl72_air_cfm_dT15'] = round(air_flow(120, 15) / CFM)
OUT['nvl72_water_lpm_dT10'] = round(water_lpm(120, 10), 1)
OUT['dgxh100_rack_x4_kw'] = 4 * 10.2

# ---------------------------------------------------------------- 7. Power swings (illustrative cluster, labelled)
# 16,384 GPUs at 700 W TDP; server ceiling 2,048 x 10.2 kW
OUT['l3_gpu_tdp_mw'] = round(16384 * 700 / 1e6, 2)
OUT['l3_server_max_mw'] = round(2048 * 10.2 / 1e3, 2)
OUT['gb300_store_ms_at_1400w'] = round(65 / 1400 * 1000, 1)     # 65 J per GPU / 1,400 W
OUT['gb300_store_ms_at_1200w'] = round(65 / 1200 * 1000, 1)
# the animated trace (fractions of TDP, illustrative): see 24_js_pw_swing.js; values recomputed here
SW = dict(tdp_w=1200, gpus=16384, idle=0.15, floor=0.90, ramp_per_s=0.25, compute_s=6.0, comm_s=2.0, iters=6, ckpt_s=12.0)
def swing_trace(sw, smooth, dt=0.05):
    seq = []
    for k in range(sw['iters']):
        seq += [(1.0, sw['compute_s']), (sw['idle'], sw['comm_s'])]
        if k == 2:
            seq += [(sw['idle'], sw['ckpt_s'])]
    t, p, pts = 0.0, sw['idle'], []
    for target, dur in seq:
        n = int(round(dur / dt))
        for _ in range(n):
            tgt = max(target, sw['floor']) if smooth else target
            if smooth:
                step = sw['ramp_per_s'] * dt
                p = min(tgt, p + step) if tgt > p else max(tgt, p - step)
            else:
                p = tgt
            pts.append(p); t += dt
    return pts
raw, smo = swing_trace(SW, False), swing_trace(SW, True)
mw = SW['tdp_w'] * SW['gpus'] / 1e6
OUT['swing'] = SW
OUT['swing_mw_full'] = round(mw, 2)
OUT['swing_raw_pp_mw'] = round((max(raw) - min(raw)) * mw, 2)
OUT['swing_smooth_pp_mw'] = round((max(smo[40:]) - min(smo[40:])) * mw, 2)
OUT['swing_energy_overhead_pct'] = round((sum(smo) / sum(raw) - 1) * 100, 1)

# ---------------------------------------------------------------- 8. Energy per token
GPUH_405B, TOK_405B, H100_W = 30.84e6, 15.6e12, 700     # Llama 3.1 model card; Llama 3 paper
e405 = GPUH_405B * H100_W * 3600                         # joules, GPU board power only
OUT['l405_gwh'] = round(e405 / 3.6e12, 2)
OUT['l405_j_per_tok'] = round(e405 / TOK_405B, 2)
OUT['l405_flop_per_tok'] = 6 * 405e9
OUT['l405_floor_j_per_tok'] = round(6 * 405e9 * 700 / 989.5e12, 2)        # at 100% of dense peak
OUT['l405_at_41mfu_j_per_tok'] = round(6 * 405e9 * 700 / (989.5e12 * 0.41), 2)
OUT['gemini_prompt_wh'] = 0.24
OUT['gemini_prompt_j'] = round(0.24 * 3600, 1)
OUT['gemini_narrow_wh'] = 0.10

OUT['l405_server_scale'] = round(10.2 / 5.6, 3)
OUT['l405_facility_j_per_tok'] = round(e405 / TOK_405B * 10.2 / 5.6 * PUE_ROOT, 1)
# interview drills
OUT['drill_100mw_h100'] = round(100e3 / (10.2 / 8 * PUE_ROOT))
mu32 = mtbf_h(32768, rate_l3) * 60
OUT['drill_32k_mtbf_min'] = round(mu32, 1)
OUT['drill_32k_young_min'] = round(math.sqrt(2 * mu32 * 2) + 2, 1)

with open(os.path.join(HERE, 'out', 'expected.json'), 'w') as f:
    json.dump(OUT, f, indent=1)
page = {k: OUT[k] for k in ('sim_defaults', 'chips', 'systems', 't5', 'scale', 'mc_check', 'swing', 'day_fails_h',
                            'day_bad', 'day_young')}
page.update(price=PRICE, pue=dict(google=PUE_GOOGLE, root=PUE_ROOT, uptime=PUE_UPTIME),
            air=dict(rho=RHO_AIR, cp=CP_AIR), water=dict(rho=RHO_W, cp=CP_W), cfm=CFM, rate_l3=round(rate_l3, 4))
with open(os.path.join(HERE, 'parts', '22_js_pw_data.js'), 'w') as f:
    f.write('// Generated by src/recompute.py; do not edit by hand.\nwindow.PW=' + json.dumps(page, separators=(',', ':')) + ';\n')
print('aupy max rel err', OUT['aupy_max_rel_err'])
print('MC max abs gap', OUT['mc_max_abs_gap'])
for k in ('rate_llama3_per_k_node_days', 'mtbf_llama3_h', 'kokolis_mtbf_16k_h', 'kokolis_mtbf_131k_h', 'sim_mu_h',
          'sim_T_young_min', 'sim_T_rfo_min', 'sim_T_opt_min', 'sim_eff_exact_young', 'sim_eff_exact_opt',
          'sim_eff_exact_bad', 'sim_eff_first_bad', 'sim_eff_exact_10min', 'root_check_b200_per_gw', 'dgxh100_air_dT',
          'swing_raw_pp_mw', 'swing_smooth_pp_mw', 'swing_energy_overhead_pct', 'l405_j_per_tok', 'l405_at_41mfu_j_per_tok',
          'h100_elec_share_of_rent', 'gw_year_cost_busd', 'ti_check_interval_min'):
    print(k, OUT[k])
print('day fails', len(fails), 'bad', OUT['day_bad'], 'young', OUT['day_young'])
for row in OUT['scale']:
    print(row)
