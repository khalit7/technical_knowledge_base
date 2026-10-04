"""Models behind the page's two computed visuals, in Python. The page's JavaScript
(parts/22_js_rd_scale.js and parts/31_js_gw_model.js) implements the same formulas;
recompute.py runs these and check_js.mjs compares the two.

1. scale(): the same burst of chat traffic hitting a GPU pool under four autoscaling
   policies (Reading, "Autoscaling GPUs"). A fluid model, 1-second ticks.
2. gateway(): the Gateway lab (tab t-gw): where requests go, what they cost, how slow.
"""
import math

# ---------------------------------------------------------------- shared inputs
GPU_TPS = 2209          # output tokens/s per H100, Llama 3.3 70B FP8, TP2, 1000/1000 (TensorRT-LLM 8a9c66c; root's shared figure)
GPUS_PER_REP = 2        # tensor parallel 2 (the same run)
REP_TPS = GPU_TPS * GPUS_PER_REP   # 4,418 output tokens/s per replica at full load
GPU_PRICE_H = 3.99      # Lambda on-demand H100 SXM, per GPU-hour (root, 2026-10-04)
PREFILL_S = 0.09        # derived: 2 x 70.55e9 x 1000 / (1979e12 x 0.4 x 2) = 0.089 s (root sim's prefill MFU 0.4, illustrative)

SCALE = dict(
    a0=30.0, a1=60.0,       # requests/s before and at the burst (2x, the root's peak factor; illustrative)
    L0=400.0, L1=600.0,     # output tokens per reply before and during the burst (illustrative: longer answers on launch day)
    t_up=300, ramp=180, t_down=1500, horizon=2400,
    r0=4, rmax=16, rmin=4,  # replicas: start with one 8-GPU node (4 replicas of 2 GPUs); cap at 4 nodes
    sync=15,                # HPA sync period, seconds (Kubernetes default)
    down_window=300,        # HPA scale-down stabilization window, seconds (Kubernetes default)
    tol=0.1,                # HPA tolerance (Kubernetes default)
    cold=180, warm=20,      # seconds from scale decision to serving: cold pod (illustrative) and warm pool (illustrative)
    cpu_base=25.0, cpu_slope=10.0, cpu_target=60.0,   # illustrative: CPU % = base + slope x GPU busy share; target 60%
    rps_target=0.75 * REP_TPS / 400.0,                # requests/s per replica the request-count policy aims for (sized on 400-token replies)
    kv_target=0.75, wait_target=4.0,                  # queue policy: KV cache use 75%, 4 waiting requests per replica
)
MODES = ['cpu', 'rps', 'queue', 'warm']


def traffic(t, p):
    """arrival rate (requests/s) and output tokens per reply at time t"""
    if t < p['t_up']:
        f = 0.0
    elif t < p['t_up'] + p['ramp']:
        f = (t - p['t_up']) / p['ramp']
    elif t < p['t_down']:
        f = 1.0
    elif t < p['t_down'] + p['ramp']:
        f = 1.0 - (t - p['t_down']) / p['ramp']
    else:
        f = 0.0
    return p['a0'] + (p['a1'] - p['a0']) * f, p['L0'] + (p['L1'] - p['L0']) * f


def scale(mode, p=SCALE):
    ready = p['r0']           # replicas serving
    pend = []                 # [ready_at, count] replicas starting
    desired_hist = []         # (t, desired) for the scale-down window
    backlog = 0.0             # output tokens waiting (FIFO fluid queue)
    backlog_req = 0.0         # requests waiting
    gpu_s = 0.0
    out = []
    util = 0.0
    metric = 0.0
    desired = ready
    cold = p['warm'] if mode == 'warm' else p['cold']
    for t in range(p['horizon'] + 1):
        # replicas that finished starting
        for q in pend:
            if q[0] <= t:
                ready += q[1]
        pend = [q for q in pend if q[0] > t]
        a, L = traffic(t, p)
        cap = ready * REP_TPS
        work = a * L + backlog
        served = min(work, cap)
        util = served / cap
        backlog = work - served
        backlog_req = backlog / L
        wait = backlog / cap
        ttft = PREFILL_S + wait
        gpu_s += (ready + sum(q[1] for q in pend)) * GPUS_PER_REP
        if t % p['sync'] == 0 and t > 0:
            total = ready + sum(q[1] for q in pend)
            if mode == 'cpu':
                metric = p['cpu_base'] + p['cpu_slope'] * util
                ratio = metric / p['cpu_target']
                prop = math.ceil(ready * ratio) if abs(ratio - 1) > p['tol'] else total
            elif mode == 'rps':
                metric = a / ready
                ratio = metric / p['rps_target']
                prop = math.ceil(ready * ratio) if abs(ratio - 1) > p['tol'] else total
            else:
                kv_ratio = util / p['kv_target']
                metric = backlog_req / ready      # waiting requests per replica
                w_ratio = metric / p['wait_target']
                cands = []
                cands.append(math.ceil(ready * kv_ratio) if abs(kv_ratio - 1) > p['tol'] else total)
                cands.append(math.ceil(ready * w_ratio) if abs(w_ratio - 1) > p['tol'] and metric > 0 else 0)
                prop = max(cands)
            prop = max(p['rmin'], min(p['rmax'], prop))
            # scale-up rate limit: Kubernetes default allows max(100%, 4 pods) per 15 s
            prop = min(prop, total + max(total, 4))
            desired_hist.append((t, prop))
            desired_hist = [d for d in desired_hist if d[0] > t - p['down_window']]
            if prop > total:
                pend.append([t + cold, prop - total])
                desired = prop
            elif prop < total:
                # scale down only to the highest recommendation in the window
                target = max(d[1] for d in desired_hist)
                if target < total:
                    drop = total - target
                    # cancel starting replicas first, then remove ready ones
                    while drop > 0 and pend:
                        k = min(drop, pend[-1][1])
                        pend[-1][1] -= k
                        drop -= k
                        if pend[-1][1] == 0:
                            pend.pop()
                    ready -= drop
                desired = max(target, prop)
            else:
                desired = total
        if t % 15 == 0:
            out.append(dict(t=t, a=round(a, 4), L=round(L, 4), ready=ready,
                            total=ready + sum(q[1] for q in pend),
                            util=round(util, 6), wait_req=round(backlog_req, 4),
                            ttft=round(ttft, 6), metric=round(metric, 6),
                            gpu_h=round(gpu_s / 3600, 6)))
    return out


def scale_summary(rows, slo=2.0):
    worst = max(r['ttft'] for r in rows)
    over = sum(15 for r in rows if r['ttft'] > slo) / 60
    return dict(worst_ttft=round(worst, 4), minutes_over_slo=round(over, 4),
                gpu_h=rows[-1]['gpu_h'], gpu_cost=round(rows[-1]['gpu_h'] * GPU_PRICE_H, 4),
                max_rep=max(r['total'] for r in rows))


# ---------------------------------------------------------------- gateway lab
# Prices in USD per million tokens, read 2026-10-01 (KB shared snapshot: models_and_training/topic_llms/src/data/aa_snapshot.json)
TIERS = {
    'sonnet': dict(name='Claude Sonnet 5.5 (API)', pin=2.0, pout=10.0, pcache=0.2, ttft=0.8, tps=60.0),
    'gpt61sol': dict(name='GPT-6.1 Sol (API)', pin=2.0, pout=10.0, pcache=0.1, ttft=0.8, tps=60.0),
    'haiku': dict(name='Claude 4.5 Haiku (API)', pin=1.0, pout=5.0, pcache=0.1, ttft=0.4, tps=120.0),
    'luna': dict(name='GPT-6 Luna (API)', pin=0.1, pout=0.5, pcache=0.01, ttft=0.4, tps=120.0),
    # self-hosted: the root's cost per output token, input included in the 1000/1000 throughput run; prefix caching saves time, not money
    'llama': dict(name='Llama 3.3 70B, self-hosted (2 x H100)', self=True, ttft=0.2, tps=69.0),
}
SELF_DERATE = 0.5   # root: run GPUs at half the vendor's max-load throughput (illustrative)


def self_cost_per_out_token():
    return GPU_PRICE_H / 3600 / (GPU_TPS * SELF_DERATE)


def tier_cost(tier, tin, tout, cached_share):
    """USD for one request on this tier"""
    if tier.get('self'):
        return tout * self_cost_per_out_token()
    cin = tin * cached_share
    return ((tin - cin) * tier['pin'] + cin * tier['pcache'] + tout * tier['pout']) / 1e6


def tier_time(tier, tin, cached_share, tout):
    """(TTFT, full response time) in seconds; prefix caching cuts the prefill part of TTFT (assumed 60% of it, illustrative)"""
    ttft = tier['ttft'] * (1 - 0.6 * cached_share)
    return ttft, ttft + tout / tier['tps']


GW = dict(rps=231.5, easy=0.6, tin=1000.0, tout=400.0,
          router=True, router_acc=0.9, router_ms=20.0, small='haiku', big='sonnet', fb='gpt61sol',
          exact=0.05, sem=True, sem_hit=0.15, sem_false=0.03, prefix=0.7,
          outage=0.0, fallback=True, detect_s=2.0, gw_ms=10.0)


def gateway(p=GW):
    """Per-request expectations. Returns shares of requests by path, cost per 1,000 requests,
    monthly cost at the average rate (peak / 2), mean TTFT and full time, error and wrong-answer shares."""
    big, small, fb = TIERS[p['big']], TIERS[p['small']], TIERS[p['fb']]
    gw = p['gw_ms'] / 1000
    share = {}
    exact = p['exact']
    rest = 1 - exact
    sem = rest * p['sem_hit'] if p['sem'] else 0.0
    rest -= sem
    share['exact'] = exact
    share['sem'] = sem
    # router: easy go small when the classifier is right; hard go small when it is wrong
    if p['router']:
        acc = p['router_acc']
        to_small_easy = rest * p['easy'] * acc
        to_big_easy = rest * p['easy'] * (1 - acc)
        to_small_hard = rest * (1 - p['easy']) * (1 - acc)
        to_big_hard = rest * (1 - p['easy']) * acc
        rt = p['router_ms'] / 1000
    else:
        to_small_easy = to_small_hard = 0.0
        to_big_easy = rest * p['easy']
        to_big_hard = rest * (1 - p['easy'])
        rt = 0.0
    to_small = to_small_easy + to_small_hard
    to_big = to_big_easy + to_big_hard
    # outage on the big model's provider: a share of its calls fail
    fail = to_big * p['outage']
    ok_big = to_big - fail
    to_fb = fail if p['fallback'] else 0.0
    err = 0.0 if p['fallback'] else fail
    share.update(small=to_small, big=ok_big, fb=to_fb, err=err)
    tin, tout, pc = p['tin'], p['tout'], p['prefix']
    c_small = tier_cost(small, tin, tout, pc)
    c_big = tier_cost(big, tin, tout, pc)
    # the fallback provider has a separate cache: its first calls miss (assume no cached prefix)
    c_fb = tier_cost(fb, tin, tout, 0.0)
    cost = to_small * c_small + ok_big * c_big + to_fb * c_fb
    # time: cache hits answer in the gateway (plus 20 ms for the semantic lookup's embedding and search, illustrative)
    hit_t = gw
    sem_t = gw + 0.02
    s_ttft, s_full = tier_time(small, tin, pc, tout)
    b_ttft, b_full = tier_time(big, tin, pc, tout)
    f_ttft, f_full = tier_time(fb, tin, 0.0, tout)
    pre = gw + (0.02 if p['sem'] else 0) + rt
    ttft = (exact * hit_t + sem * sem_t + to_small * (pre + s_ttft) + ok_big * (pre + b_ttft)
            + to_fb * (pre + p['detect_s'] + f_ttft) + err * (pre + p['detect_s']))
    full = (exact * hit_t + sem * sem_t + to_small * (pre + s_full) + ok_big * (pre + b_full)
            + to_fb * (pre + p['detect_s'] + f_full) + err * (pre + p['detect_s']))
    wrong = sem * p['sem_false'] + to_small_hard
    per_k = cost * 1000
    monthly = cost * p['rps'] / 2 * 3600 * 730
    return dict(share={k: round(v, 8) for k, v in share.items()}, per_k=round(per_k, 6),
                monthly=round(monthly, 2), ttft=round(ttft, 6), full=round(full, 6),
                err=round(err, 8), wrong=round(wrong, 8))


GW_PRESETS = {
    'naive': dict(router=False, exact=0.0, sem=False, prefix=0.0, outage=0.0, fallback=False),
    'tuned': dict(router=True, exact=0.05, sem=False, prefix=0.7, outage=0.0, fallback=True),
    'semantic': dict(router=True, exact=0.05, sem=True, sem_hit=0.3, sem_false=0.05, prefix=0.7, outage=0.0, fallback=True),
    'outage_nofb': dict(router=True, exact=0.05, sem=False, prefix=0.7, outage=1.0, fallback=False),
    'outage_fb': dict(router=True, exact=0.05, sem=False, prefix=0.7, outage=1.0, fallback=True),
    'selfhost': dict(router=True, small='llama', exact=0.05, sem=False, prefix=0.7, outage=0.0, fallback=True),
}


def cost_per_request_compare():
    """Section 1: a CRUD request against an LLM request, from the root's shared figures."""
    crud = 0.2016 / 3600 / 500           # m7i.xlarge at 500 requests/s (root's srv default)
    llm_self = 400 * self_cost_per_out_token()   # 400 output tokens, self-hosted Llama 3.3 70B
    llm_api = tier_cost(TIERS['sonnet'], 1000, 400, 0.0)
    return dict(crud=crud, llm_self=llm_self, llm_api=llm_api,
                ratio_self=llm_self / crud, ratio_api=llm_api / crud,
                orders_self=math.log10(llm_self / crud), orders_api=math.log10(llm_api / crud))


# ---------------------------------------------------------------- prefix-cache animation (Reading, section 9)
PREFIX = dict(SYS=2000, USER=130, REPLY=400, TURNS=6, PIN=2.0, PWRITE=2.5, PREAD=0.2, POUT=10.0)


def prefix_turns(mode, p=PREFIX):
    out, cum, cum_tok = [], 0.0, 0
    for k in range(1, p['TURNS'] + 1):
        inp = p['SYS'] + (k - 1) * (p['USER'] + p['REPLY']) + p['USER']
        prev = 0 if k == 1 else p['SYS'] + (k - 2) * (p['USER'] + p['REPLY']) + p['USER']
        cached = prev if mode == 'after' else 0
        fresh = inp - cached
        if mode == 'after':
            cost = (cached * p['PREAD'] + fresh * p['PWRITE'] + p['REPLY'] * p['POUT']) / 1e6
        else:
            cost = (inp * p['PIN'] + p['REPLY'] * p['POUT']) / 1e6
        cum += cost
        cum_tok += fresh
        out.append(dict(k=k, input=inp, cached=cached, fresh=fresh, cost=cost, cum=cum, cumTok=cum_tok))
    return out


# ---------------------------------------------------------------- interview worked example (Reading, section 14); every input illustrative
def interview_example(tenants=10000, msgs_per_tenant_day=500, peak=3, tin=3000, tout=300, cached_share=0.7):
    msgs_day = tenants * msgs_per_tenant_day
    avg_rps = msgs_day / 86400
    peak_rps = avg_rps * peak
    peak_out_tps = peak_rps * tout
    per_gpu = GPU_TPS * SELF_DERATE
    gpus = math.ceil(peak_out_tps / per_gpu)
    gpus_even = gpus + (gpus % 2)          # replicas of 2 GPUs
    self_day = gpus_even * 24 * GPU_PRICE_H
    s = TIERS['sonnet']
    api_req = tier_cost(s, tin, tout, 0.0)
    api_req_cached = tier_cost(s, tin, tout, cached_share)
    concurrent_peak = peak_rps * tout / 69.0   # Little's law: streams open at once, 69 tokens/s per stream
    return dict(msgs_day=msgs_day, avg_rps=avg_rps, peak_rps=peak_rps, peak_out_tps=peak_out_tps, gpus=gpus_even,
                replicas=gpus_even // 2, self_day=self_day, api_req=api_req, api_day=api_req * msgs_day,
                api_req_cached=api_req_cached, api_day_cached=api_req_cached * msgs_day, concurrent_peak=concurrent_peak)
