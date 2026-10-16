"""Cost lab calculator, in Python: the page's JavaScript (parts/35_js_co_3calc.js) must give the same numbers.
Run: python3 recompute.py  (prints the defaults and the checks; check_data.mjs compares against the page)."""
import json, math, os

PEAK = {'h100': 989.5e12, 'b200': 2250e12}          # dense BF16, as on Performance math (Topic: hardware)
MODELS = {'l405': ('Llama 3.1 405B', 405853388800, 15.6), 'l70': ('Llama 3.1 70B', 70553706496, 15.0),
          'l8': ('Llama 3.1 8B', 8030261248, 15.0)}
# Llama 3 (arXiv 2407.21783 section 3.3.4): 419 unexpected interruptions in 54 days on 16,384 H100s
LLAMA_RATE = 419 / (54 * 16384) * 1000              # per 1,000 GPU-days


def run(params, tokens_t, gpu, n, mfu, price, rate_k, stall_s, restart_min, interval_min, idle):
    flops = 6 * params * tokens_t * 1e12
    ideal_h = flops / (PEAK[gpu] * mfu) / 3600
    lam = rate_k / 1000 / 24                         # interruptions per GPU-hour
    mtbf_h = 1 / (lam * n) if lam > 0 else math.inf
    tau_h, stall_h, rs_h = interval_min / 60, stall_s / 3600, restart_min / 60
    g = 1 - stall_h / tau_h - ((tau_h / 2 + rs_h) / mtbf_h if mtbf_h != math.inf else 0)
    g = max(g, 0)
    wall_h = ideal_h / n / g if g > 0 else math.inf
    paid_h = n * wall_h / (1 - idle)
    yd_min = math.sqrt(2 * stall_h * mtbf_h) * 60 if mtbf_h != math.inf else math.inf
    return dict(flops=flops, ideal_h=ideal_h, mtbf_h=mtbf_h, goodput=g, wall_days=wall_h / 24, paid_h=paid_h,
                cost=paid_h * price, useful=mfu * g * (1 - idle), yd_min=yd_min)


def gpus_for(deadline_days, **k):
    """Smallest GPU count on a grid of multiples of 8 (up to 200,000) that meets the deadline; None if none does."""
    for n in range(8, 200001, 8):
        if run(n=n, **k)['wall_days'] <= deadline_days: return n
    return None


if __name__ == '__main__':
    stall, mtbf = 60, None
    k = dict(params=MODELS['l405'][1], tokens_t=15.6, gpu='h100', mfu=0.40, price=5.970, rate_k=LLAMA_RATE,
             stall_s=60, restart_min=10, idle=0.0)
    r0 = run(n=16384, interval_min=60, **k)
    yd = round(r0['yd_min'])
    r = run(n=16384, interval_min=yd, **k)
    print('Llama rate per 1,000 GPU-days', round(LLAMA_RATE, 4), 'job MTBF h', round(r['mtbf_h'], 3))
    print('Young/Daly interval min', yd)
    for kk, v in r.items(): print(kk, v)
    print('GPUs for 60 days', gpus_for(60, interval_min=yd, **k))
    print('vs model card 30.84M H100 GPU-hours:', round(r['paid_h'] / 30.84e6 - 1, 4))
    print('overhead over ideal:', round(r['paid_h'] / r['ideal_h'] - 1, 4))
    # interview answers
    print('70B 15T ideal GPU-h', run(params=70e9, tokens_t=15, gpu='h100', n=1000, mfu=.4, price=1, rate_k=0, stall_s=0, restart_min=0, interval_min=60, idle=0)['ideal_h'])
    print('8B 15T ideal GPU-h', run(params=8e9, tokens_t=15, gpu='h100', n=1000, mfu=.4, price=1, rate_k=0, stall_s=0, restart_min=0, interval_min=60, idle=0)['ideal_h'])
    json.dump(dict(defaults=r, yd=yd, rate=LLAMA_RATE), open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out/recompute.json'), 'w'), indent=1)
