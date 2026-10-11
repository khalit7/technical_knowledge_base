"""Compact every raw run into out/measured.json (the page's data) and copy compact raw files into out/raw/.
usage: python3 -I summarize.py <raw dir>   (raw dir holds root8/, root8big/, root8burst/, conv/, lora/, co/, cold/, vllm/)"""
import glob, json, os, re, statistics as st, sys

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = sys.argv[1]
OUT = os.path.join(HERE, 'out')


def pct(xs, q):
    s = sorted(xs)
    if not s:
        return None
    k = (len(s) - 1) * q; f = int(k); c = min(f + 1, len(s) - 1)
    return s[f] + (s[c] - s[f]) * (k - f)


def r3(x):
    return None if x is None else round(x, 3)


def route_run(d):
    R = [r for r in d['requests'] if 'error' not in r]
    cn = sum(r['cache_n'] for r in R); pn = sum(r['prompt_n'] for r in R)
    tt = [r['ttft'] for r in R]
    out_tok = sum(r['pred_n'] or 0 for r in R)
    n_rep = d['n_replicas']
    per = [{'req': sum(1 for r in R if r['rep'] == k), 'computed': sum(r['prompt_n'] for r in R if r['rep'] == k),
            'cached': sum(r['cache_n'] for r in R if r['rep'] == k)} for k in range(n_rep)]
    turn2 = [r for r in R if r.get('n_in', 0) and r['cache_n'] is not None]
    return {'n': len(d['requests']), 'errors': len(d['requests']) - len(R), 'hit': r3(cn / max(1, cn + pn)), 'computed': pn, 'cached': cn,
            'ttft_p50': r3(pct(tt, .5)), 'ttft_p90': r3(pct(tt, .9)), 'ttft_p99': r3(pct(tt, .99)), 'ttft_mean': r3(st.fmean(tt)),
            'e2e_mean': r3(st.fmean([r['e2e'] for r in R])), 'wall': d['wall_s'], 'out_tok_s': r3(out_tok / d['wall_s']),
            'prompt_ms_total': round(sum(r['prompt_ms'] or 0 for r in R)), 'per_replica': per,
            'load': [d['loadavg_before'], d['loadavg_after']], 'maxload': max((max(r['loads']) for r in R if r.get('loads')), default=None),
            'modes': {m: sum(1 for r in R if r.get('mode') == m) for m in ('cache', 'low-match', 'imbalanced')} if d['policy'] == 'ca' else None}


def route(sub):
    res = {}
    for f in sorted(glob.glob(os.path.join(RAW, sub, '*_r*.json'))):
        m = re.match(r'(\w+)_r(\d+)\.json', os.path.basename(f))
        d = json.load(open(f))
        res.setdefault(m.group(1), []).append(dict(route_run(d), rep=int(m.group(2))))
    return res


def route_requests(sub, rep=1):
    """per request, for the Router lab: [send s, replica, cached, computed, ttft s] for one repeat"""
    res = {}
    for f in sorted(glob.glob(os.path.join(RAW, sub, '*_r%d.json' % rep))):
        p = os.path.basename(f).split('_r')[0]
        d = json.load(open(f))
        res[p] = [[round(r['send'], 2), r['rep'], r.get('cache_n'), r.get('prompt_n'), r3(r.get('ttft')), r['n_in']] for r in d['requests']]
    return res


def root8_detail(sub):
    res = {}
    for f in sorted(glob.glob(os.path.join(RAW, sub, '*_r1.json'))):
        p = os.path.basename(f).split('_r')[0]
        d = json.load(open(f))
        res[p] = [[r['conv'] + ('1' if r['id'] < 4 else '2'), r['rep'], r['cache_n'], r['prompt_n'], r3(r['ttft'])] for r in d['requests']]
    return res


def corrected(lat, E):
    """HdrHistogram's recordValueWithExpectedInterval: each sample L > E also stands for the requests a
    closed-loop user did not send while waiting: L - E, L - 2E, ... down to E."""
    out = []
    for L in lat:
        out.append(L); m = L - E
        while m >= E:
            out.append(m); m -= E
    return out


def co():
    d = os.path.join(RAW, 'co')
    if not os.path.isdir(d):
        return None
    res = {'runs': {}, 'req': {}}
    for f in sorted(glob.glob(os.path.join(d, 'co_*_r*.json'))):
        m = re.match(r'co_(closed|poisson)_stall(no|yes)_r(\d+)\.json', os.path.basename(f))
        mode, st_, rep = m.group(1), m.group(2), int(m.group(3))
        J = json.load(open(f)); R = [r for r in J['requests'] if 'e2e' in r and 'error' not in r]
        e2e = [r['e2e'] for r in R]; tt = [r['ttft'] for r in R if 'ttft' in r]
        launch = float(open(os.path.join(d, 'launch_%s_stall%s_r%d.t' % (mode, st_, rep))).read().split()[0])
        stall = None
        if st_ == 'yes':
            a, b = [float(x) for x in open(os.path.join(d, 'stall_%s_r%d.t' % (mode, rep))).read().split()[:2]]
            stall = [round(a - launch, 2), round(b - launch, 2)]
        row = {'mode': mode, 'stall': st_ == 'yes', 'rep': rep, 'n': len(R), 'wall': r3(J['summary']['wall_s']), 'req_s': r3(J['summary']['req_per_s']),
               'e2e_p50': r3(pct(e2e, .5)), 'e2e_p90': r3(pct(e2e, .9)), 'e2e_p99': r3(pct(e2e, .99)), 'e2e_max': r3(max(e2e)),
               'ttft_p50': r3(pct(tt, .5)), 'ttft_p99': r3(pct(tt, .99)), 'stall_s': stall,
               'over1s': sum(1 for x in e2e if x > 1.0)}
        if stall:
            row['sent_in_stall'] = sum(1 for r in R if stall[0] <= r['t_send'] <= stall[1])
        res['runs'].setdefault(mode + '_' + st_, []).append(row)
        if rep == 1:
            res['req'][mode + '_' + st_] = [[round(r['t_send'], 3), round(r['e2e'], 3)] for r in R]
    # corrected closed loop: expected interval per user from the same repeat's no-stall closed run
    for row in res['runs'].get('closed_yes', []):
        base = [x for x in res['runs']['closed_no'] if x['rep'] == row['rep']][0]
        J = json.load(open(os.path.join(d, 'co_closed_stallyes_r%d.json' % row['rep'])))
        conc = J['config']['conc']; E = conc / base['req_s']
        c = corrected([r['e2e'] for r in J['requests'] if 'e2e' in r and 'error' not in r], E)
        row['corr'] = {'E': r3(E), 'n': len(c), 'p50': r3(pct(c, .5)), 'p90': r3(pct(c, .9)), 'p99': r3(pct(c, .99))}
    return res


def cold():
    d = os.path.join(RAW, 'cold')
    if not os.path.isdir(d):
        return None
    rows = []
    for fn in ('cold.json', 'warm.json'):
        if os.path.exists(os.path.join(d, fn)):
            rows += json.load(open(os.path.join(d, fn)))
    agg = {}
    for r in rows:
        agg.setdefault(r['model'] + '|' + r['mode'], []).append(r)
    out = []
    for k, v in agg.items():
        model, mode = k.split('|')
        rd = sorted(x['ready_s'] for x in v); ft = sorted(x['first_token_s'] for x in v)
        out.append({'model': model, 'bytes': v[0]['bytes'], 'mode': mode, 'n': len(v), 'ready': [rd[0], st.median(rd), rd[-1]],
                    'first_token': [ft[0], st.median(ft), ft[-1]], 'load': [min(x['loadavg'] for x in v), max(x['loadavg'] for x in v)]})
    return sorted(out, key=lambda r: (r['bytes'], r['mode']))


def closed_runs(d, pattern):
    res = {}
    for f in sorted(glob.glob(os.path.join(d, pattern))):
        name = re.sub(r'_r\d+\.json$', '', os.path.basename(f))
        J = json.load(open(f)); s = J['summary']; R = J['requests']
        row = {k: s[k] for k in ('mode', 'conc', 'reqs', 'wall_s', 'out_tok_per_s', 'ms_per_tok_median', 'loadavg_before', 'loadavg_after')}
        row['errors'] = sum(1 for r in R if r.get('err'))
        row['pred_n_mean'] = r3(st.fmean([r['pred_n'] or 0 for r in R]))
        if 'valid' in s:
            row['valid'] = s['valid']
            def loose(t):
                t = t.strip()
                if t.startswith('```'):
                    t = t.split('\n', 1)[1] if '\n' in t else ''
                    t = t.rsplit('```', 1)[0]
                try:
                    d = json.loads(t)
                    return isinstance(d, dict) and set(d) == {'name', 'age', 'city', 'skills'}
                except Exception:
                    return False
            row['valid_after_fence_strip'] = sum(1 for r in R if loose(r.get('text', '')))
            row['example'] = R[0].get('text', '')[:160]
        res.setdefault(name, []).append(row)
    return res


def vllm():
    d = os.path.join(RAW, 'vllm')
    if not os.path.isdir(d):
        return None
    out = {'start': [], 'runs': closed_runs(d, 'vllm_*_c*_r*.json')}
    for f in sorted(glob.glob(os.path.join(d, 'vllm_start_r*.json'))):
        rep = int(re.search(r'_r(\d+)', f).group(1)); S = json.load(open(f))
        log = open(os.path.join(d, 'vllm_log_r%d.txt' % rep), errors='replace').read()
        ph = {}
        pats = (('weights_s', r'Loading weights took ([\d.]+) seconds'), ('engine_init_s', r'init engine \(profile, create kv cache, warmup model\) took ([\d.]+) s'),
                ('checkpoint_gib', r'Checkpoint size: ([\d.]+) GiB'), ('kv_tokens', r'KV cache size: ([\d,]+) tokens'), ('fs', r'Filesystem type for checkpoints: ([\w.]+)'))
        for key, pat in pats:
            m = re.search(pat, log)
            if m:
                ph[key] = m.group(1).rstrip('.') if key == 'fs' else float(m.group(1).replace(',', ''))
        ts = lambda pat: (lambda m: int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) if m else None)(re.search(r'(\d\d):(\d\d):(\d\d) \[[^\]]*\] ' + pat, log))
        t_init, t_w, t_srv = ts(r'Initializing a V1 LLM engine'), ts(r'Loading weights took'), ts(r'Starting vLLM server')
        if t_init and t_w and t_srv:
            ph['log_init_to_weights_done_s'] = t_w - t_init; ph['log_weights_done_to_server_s'] = t_srv - t_w
        out['start'].append({'rep': rep, 'healthy_s': round(S['healthy'] - S['docker_run'], 2), 'phases': ph})
    return out


def main():
    M = {'date': '2026-10-10', 'machine': 'Apple M1 Pro (16-core GPU, 16 GB), shared with other agents; llama.cpp build 11146 (Homebrew 0.5.0)'}
    tr = json.load(open(os.path.join(RAW, '..', 'tr', 'conv.json')))
    M['trace'] = tr['meta']
    M['route'] = {s: route(s) for s in ('root8', 'root8big', 'root8burst', 'conv') if os.path.isdir(os.path.join(RAW, s))}
    M['route_detail'] = {s: root8_detail(s) for s in ('root8', 'root8big', 'root8burst') if os.path.isdir(os.path.join(RAW, s))}
    M['route_req'] = route_requests('conv') if os.path.isdir(os.path.join(RAW, 'conv')) else {}
    mf = sorted(glob.glob(os.path.join(RAW, 'conv', 'logs', 'metrics_rr_r1_0.txt')))
    if mf:
        M['lc_metrics'] = sorted(set(re.findall(r'^(llamacpp:\w+)', open(mf[0]).read(), re.M)))
    M['co'] = co()
    M['cold'] = cold()
    M['lora'] = closed_runs(os.path.join(RAW, 'lora'), '*_c*_r*.json') if os.path.isdir(os.path.join(RAW, 'lora')) else None
    M['vllm'] = vllm()
    os.makedirs(OUT, exist_ok=True)
    json.dump(M, open(os.path.join(OUT, 'measured.json'), 'w'), separators=(',', ':'))
    print('wrote', os.path.join(OUT, 'measured.json'), os.path.getsize(os.path.join(OUT, 'measured.json')), 'bytes')


if __name__ == '__main__':
    main()
