"""Summarise the raw M1 Pro runs (chunked prefill, KV tiers, KV cache quantization) into out/measured.json, and copy
compact raw files into out/raw/ (token times rounded, no paths). usage: python3 -I summarize.py <raw results dir>"""
import glob, json, os, re, statistics, sys

R = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
os.makedirs(os.path.join(OUT, 'raw'), exist_ok=True)


def pct(a, p):
    a = sorted(a)
    if not a:
        return None
    k = (len(a) - 1) * p / 100
    f = int(k)
    c = min(f + 1, len(a) - 1)
    return a[f] + (a[c] - a[f]) * (k - f)


def chunk():
    rows = []
    budgets = sorted({int(re.search(r'_b(\d+)_r', f).group(1)) for f in glob.glob(os.path.join(R, 'chunk17_b*_r*.json')) if '.load' not in f})
    for b in budgets:
        reps = []
        for f in sorted(glob.glob(os.path.join(R, 'chunk17_b%d_r*.json' % b))):
            if f.endswith('.load.json'):
                continue
            d = json.load(open(f))
            ld = json.load(open(f.replace('.json', '.load.json')))
            L = d['long']
            t0, t1 = L['t_send'], L['times'][0]
            g_in, g_all, ntok = [], [], 0
            for r in d['decoders']:
                t = r['times']
                ntok += len(t)
                for a, c in zip(t, t[1:]):
                    g_all.append(c - a)
                    if c > t0 and a < t1:
                        g_in.append(c - a)
            reps.append({'ttft': t1 - t0, 'maxgap': max(g_in), 'meangap': statistics.fmean(g_in), 'p50': pct(g_all, 50),
                         'p99': pct(g_all, 99), 'prompt_tokens': L['usage']['prompt_tokens'], 'load': ld['load_before'][0]})
            json.dump({'budget': b, 'long': {'t_send': round(t0, 4), 'times': [round(x, 4) for x in L['times']], 'usage': L['usage']},
                       'decoders': [{'times': [round(x, 4) for x in r['times']], 'usage': r['usage']} for r in d['decoders']]},
                      open(os.path.join(OUT, 'raw', os.path.basename(f)), 'w'))
        med = lambda k: statistics.median([x[k] for x in reps])
        rows.append({'budget': b, 'reps': len(reps), 'ttft_med': med('ttft'), 'ttft_min': min(x['ttft'] for x in reps), 'ttft_max': max(x['ttft'] for x in reps),
                     'maxgap_med': med('maxgap'), 'maxgap_min': min(x['maxgap'] for x in reps), 'maxgap_max': max(x['maxgap'] for x in reps),
                     'meangap_med': med('meangap'), 'p50_med': med('p50'), 'p99_med': med('p99'),
                     'prompt_tokens': reps[0]['prompt_tokens'], 'load_min': min(x['load'] for x in reps), 'load_max': max(x['load'] for x in reps)})
    # the decoders alone, no long prompt (budget 512)
    alone = None
    f = os.path.join(R, 'chunk17_b512_nolong.json')
    if os.path.exists(f):
        d = json.load(open(f))
        g = [c - a for r in d['decoders'] for a, c in zip(r['times'], r['times'][1:])]
        alone = {'p50': pct(g, 50), 'p99': pct(g, 99), 'max': max(g)}
    lat = []
    for f in glob.glob(os.path.join(R, 'chunk17_b*_r*.json')):
        if not f.endswith('.load.json'):
            d = json.load(open(f))
            lat.append(d['long']['t_send'] - min(r['t_send'] for r in d['decoders']))
    return {'model': 'Qwen3-1.7B Q4_K_M (unsloth @ d7f544ee)', 'engine': 'llama-server, llama.cpp 0.5.0 build 11146 (commit 7fe450e19), Metal, -fa on, -np 5, -c 40960, -b = -ub = budget',
            'reps': min(r['reps'] for r in rows) if rows else 0, 'rows': rows, 'alone': alone,
            'long_at_med': statistics.median(lat) if lat else None}


def tiers():
    out = {}
    for cr in (8192, 0):
        reps = []
        for f in sorted(glob.glob(os.path.join(R, 'tiers17_cr%d_r*.json' % cr))):
            if f.endswith('.load.json'):
                continue
            d = json.load(open(f))
            ld = json.load(open(f.replace('.json', '.load.json')))
            reps.append({'res': d['results'], 'load': ld['load_before'][0]})
        out[str(cr)] = reps
    sizes = []
    f = os.path.join(R, 'tiers17_slotfiles.txt')
    if os.path.exists(f):
        sizes = [int(l.split()[0]) for l in open(f) if l.strip()]
    return {'model': 'Qwen3-1.7B Q4_K_M', 'engine': 'llama-server build 11146, -np 1, -c 16384, --cache-ram 8192 or 0', 'runs': out, 'slot_file_bytes': sizes}


def kvq():
    out = []
    for t in ('f16', 'q8_0', 'q4_0'):
        f = os.path.join(R, 'kvq17_%s.log' % t)
        if not os.path.exists(f):
            continue
        s = open(f).read()
        m = re.search(r'Final estimate: PPL = ([\d.]+) \+/- ([\d.]+)', s)
        kv = re.search(r'KV buffer size = +([\d.]+) MiB', s)
        ld = json.load(open(f.replace('.log', '.load.json')))
        out.append({'type': t, 'ppl': float(m.group(1)) if m else None, 'pm': float(m.group(2)) if m else None,
                    'kv_mib': float(kv.group(1)) if kv else None, 'ctx': ld['ctx'], 'chunks': ld['chunks'], 'load': ld['load_before'][0]})
    return {'model': 'Qwen3-1.7B Q8_0 (unsloth @ d7f544ee)', 'text': 'WikiText-2 raw test', 'rows': out}


res = {'chunk': chunk(), 'tiers': tiers(), 'kvq': kvq()}
json.dump(res, open(os.path.join(OUT, 'measured.json'), 'w'), indent=1)
print(json.dumps(res['chunk']['rows'], indent=0)[:3000])
