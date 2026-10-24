"""Capacity planner in Python: the page's JavaScript (parts/33_js_oc_cap.js) must give the same numbers.
The run model is the root Cost lab's (src/cost/recompute.py), copied unchanged so both pages agree.
Run: python3 recompute.py   -> ../recompute.json (check/check_data.mjs compares the page with it)."""
import json, math, os

H = os.path.dirname(os.path.abspath(__file__))
PEAK = {'h100': 989.5e12, 'b200': 2250e12}
MODELS = {'l405': ('Llama 3.1 405B', 405853388800, 15.6), 'l70': ('Llama 3.1 70B', 70553706496, 15.0),
          'l8': ('Llama 3.1 8B', 8030261248, 15.0)}
LLAMA_RATE = 419 / (54 * 16384) * 1000              # per 1,000 GPU-days (Llama 3 section 3.3.4)


def run(params, tokens_t, gpu, n, mfu, price, rate_k, stall_s, restart_min, interval_min, idle):
    flops = 6 * params * tokens_t * 1e12
    ideal_h = flops / (PEAK[gpu] * mfu) / 3600
    lam = rate_k / 1000 / 24
    mtbf_h = 1 / (lam * n) if lam > 0 else math.inf
    tau_h, stall_h, rs_h = interval_min / 60, stall_s / 3600, restart_min / 60
    g = 1 - stall_h / tau_h - ((tau_h / 2 + rs_h) / mtbf_h if mtbf_h != math.inf else 0)
    g = max(g, 0)
    wall_h = ideal_h / n / g if g > 0 else math.inf
    paid_h = n * wall_h / (1 - idle)
    yd_min = math.sqrt(2 * stall_h * mtbf_h) * 60 if mtbf_h != math.inf else math.inf
    return dict(flops=flops, ideal_h=ideal_h, mtbf_h=mtbf_h, goodput=g, wall_days=wall_h / 24, paid_h=paid_h,
                cost=paid_h * price, useful=mfu * g * (1 - idle), yd_min=yd_min)


def run_yd(n, **k):
    """The run with the Young/Daly interval for its own size (as the page's 'auto' interval)."""
    r0 = run(n=n, interval_min=60, **k)
    return run(n=n, interval_min=max(1, round(r0['yd_min'])) if r0['yd_min'] != math.inf else 60, **k)


def gpus_for(deadline_days, **k):
    for n in range(8, 200001, 8):
        if run_yd(n, **k)['wall_days'] <= deadline_days:
            return n
    return None


def fleet(run_gpus, run_paid_h, runs_per_year, extra_share, sched_eff):
    """GPUs to own or reserve for a year: enough for the big run at once, and enough GPU-hours for the year's
    demand (main runs plus experiments, fine-tunes and evaluation as a share of it) at a scheduling efficiency."""
    demand_h = run_paid_h * runs_per_year * (1 + extra_share)
    by_hours = demand_h / (8760 * sched_eff)
    n = max(run_gpus, math.ceil(by_hours / 8) * 8)
    return dict(demand_h=demand_h, by_hours=by_hours, gpus=n, binding='deadline' if run_gpus >= by_hours else 'hours')


def own(capex_gpu, net, life_y, kw_gpu, load, pue, usd_kwh, ops):
    """Annual cost of owning one GPU and its share of the cluster, and per calendar hour."""
    cap = capex_gpu * (1 + net) / life_y
    energy = kw_gpu * load * pue * 8760 * usd_kwh
    opx = ops * capex_gpu
    a = cap + energy + opx
    return dict(capital=cap, energy=energy, ops=opx, annual=a, per_hour=a / 8760)


B = json.load(open(os.path.join(os.path.dirname(H), 'inputs', 'page_inputs.json')))['buy']
DEF = dict(model='l405', gpu='h100', mfu=0.40, price=5.970, stall_s=60, restart_min=10, idle=0.0, deadline=90,
           runs=1, extra=0.5, sched=0.85, od=6.88, spot=2.2712)  # spot: Azure ND96isr H100 v5, East US, read 2026-10-16

if __name__ == '__main__':
    m = MODELS[DEF['model']]
    k = dict(params=m[1], tokens_t=m[2], gpu=DEF['gpu'], mfu=DEF['mfu'], price=DEF['price'], rate_k=round(LLAMA_RATE, 3),  # the page shows 0.474
             stall_s=DEF['stall_s'], restart_min=DEF['restart_min'], idle=DEF['idle'])
    n = gpus_for(DEF['deadline'], **k)
    r = run_yd(n, **k)
    f = fleet(n, r['paid_h'], DEF['runs'], DEF['extra'], DEF['sched'])
    o = own(B['capex_gpu'], B['net'], B['life_y'], B['kw_gpu'], B['load'], B['pue'], B['usd_kwh'], B['ops'])
    be_od = o['per_hour'] / DEF['od']
    out = dict(gpus=n, run=r, fleet=f, own=o, own_per_useful_h=o['per_hour'] / B['util'],
               reserved_per_useful_h=DEF['price'] / B['util'], breakeven_vs_ondemand=be_od,
               fleet_year_cost_own=f['gpus'] * o['annual'], fleet_year_cost_reserved=f['gpus'] * DEF['price'] * 8760,
               # the root Cost lab's check: 16,384 GPUs, its residual against the model card (30.84M H100-hours)
               root_check=run_yd(16384, **dict(k, rate_k=LLAMA_RATE))['paid_h'] / 30.84e6 - 1)
    # cost per training token (Reading section 12): tokens per paid GPU-hour of the default run, then
    # $ per million tokens = $ per GPU-hour / tokens per paid GPU-hour x 1e6, at 100% busy
    tph = m[2] * 1e12 / r['paid_h']
    out['tokens_per_gpu_h_ideal'] = DEF['mfu'] * PEAK[DEF['gpu']] * 3600 / (6 * m[1])
    out['tokens_per_paid_gpu_h'] = tph
    out['usd_per_m_tokens'] = {'owned': o['per_hour'] / tph * 1e6, 'reserved': DEF['price'] / tph * 1e6,
                               'on_demand': DEF['od'] / tph * 1e6, 'spot': DEF['spot'] / tph * 1e6}
    out['breakeven_vs_spot'] = o['per_hour'] / DEF['spot']
    for kk, v in out.items():
        print(kk, v)
    json.dump(out, open(os.path.join(os.path.dirname(H), 'recompute.json'), 'w'), indent=1, default=str)
