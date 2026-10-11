"""Summarise the laptop runs into exp/out/measured.json (what the page embeds) from the raw outputs in DD_WORK/out.
usage: python3 -I summarise.py DD_WORK
Raw files stay in the scratch folder; the small extracts the page needs are copied to exp/out/raw/ for the record.
"""
import glob, json, os, re, statistics, sys
W = sys.argv[1]
H = os.path.dirname(os.path.abspath(__file__))
O = os.path.join(H, 'out')
os.makedirs(os.path.join(O, 'raw'), exist_ok=True)
r = lambda x, d=4: None if x is None else float('%.*g' % (d, x))
M = {}


def ms(xs):
    return dict(mean=r(statistics.fmean(xs)), sd=r(statistics.stdev(xs)) if len(xs) > 1 else 0.0, n=len(xs), min=r(min(xs)), max=r(max(xs)))


def loads(pattern):
    out = []
    for f in sorted(glob.glob(pattern)):
        t = open(f).read()
        m = re.findall(r'load averages?: ([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)', t) or re.findall(r'\{ ([\d.]+) ([\d.]+) ([\d.]+) \}', t)
        out += [float(a[0]) for a in m]
    return [min(out), max(out)] if out else None


# ---- 1. llama.cpp RPC: one process, layer split, tensor split ----
rpc = {}
for f in sorted(glob.glob(os.path.join(W, 'out', 'rpc', '*.jsonl'))):
    name = os.path.basename(f)[:-6]
    model, mode, run = name.rsplit('_', 2)
    for line in open(f):
        d = json.loads(line)
        test = 'pp512' if d['n_prompt'] else 'tg64'
        rpc.setdefault(model, {}).setdefault(mode, {}).setdefault(test, []).extend(d['samples_ts'])
    if run == '1':
        rows = []
        for line in open(f):
            d = json.loads(line)
            d['model_filename'] = os.path.basename(d.get('model_filename', ''))  # no local paths in the repo
            rows.append(json.dumps(d))
        open(os.path.join(O, 'raw', 'rpc_' + name + '.jsonl'), 'w').write(chr(10).join(rows) + chr(10))
M['rpc'] = dict(build='llama.cpp b11146 (commit 7fe450e19), built here with GGML_METAL=ON and GGML_RPC=ON; transport TCP on localhost',
                load=loads(os.path.join(W, 'out', 'rpc', 'load_*.txt')),
                runs=len(glob.glob(os.path.join(W, 'out', 'rpc', 'load_*.txt'))),
                res={m: {mode: {t: ms(v) for t, v in tests.items()} for mode, tests in modes.items()} for m, modes in rpc.items()})

# ---- 2. vLLM CPU: tp1, tp2, pp2 under 1 and 8 users ----
vt = {}
for f in sorted(glob.glob(os.path.join(W, 'out', 'vtp', '*.c1.json')) + glob.glob(os.path.join(W, 'out', 'vtp', '*.c8.json'))):
    b = os.path.basename(f)
    tag, run = b.split('.')[0].rsplit('_', 1)
    conc = b.split('.')[1]
    s = json.load(open(f))['summary']
    d = vt.setdefault(tag, {}).setdefault(conc, {})
    for k in ('ttft_p50', 'tpot_p50', 'out_tok_per_s', 'e2e_p50'):
        if s.get(k) is not None:
            d.setdefault(k, []).append(s[k])
    d.setdefault('n_err', []).append(s['n_err'])
procs = {}
for f in sorted(glob.glob(os.path.join(W, 'out', 'vtp', '*_1.server.log'))):
    tag = os.path.basename(f).split('_1.')[0]
    t = open(f, errors='replace').read()
    m = re.search(r'world_size=(\d+)', t)
    kv = re.search(r'KV cache size: ([\d,]+) tokens', t)
    procs[tag] = dict(world=int(m.group(1)) if m else None, kv_tokens=int(kv.group(1).replace(',', '')) if kv else None)
if vt:
    M['vtp'] = dict(image='vllm/vllm-openai-cpu:v0.31.0-arm64', model='Qwen/Qwen3-0.6B (float32)', cpus=4,
                    load=loads(os.path.join(W, 'out', 'vtp', '*.load_*.txt')), info=procs,
                    res={t: {c: {k: ms(v) for k, v in d.items()} for c, d in cs.items()} for t, cs in vt.items()})

# ---- 3 and 4. two llama-servers: KV handed over through a file; interference ----
lp = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(W, 'out', 'lpd', 'lpd_*.json')))]
if lp:
    KVT = 28 * 8 * 128 * 2 * 2  # Qwen3-1.7B, F16 cache: layers x KV heads x head dim x (K, V) x bytes
    tr = []
    for run in lp:
        for x in run['transfer']:
            tr.append(dict(words=x['words'], prompt_n=x['prefill']['prompt_n'], prefill_ms=r(x['prefill']['prompt_ms']), save_ms=r(x['save']['ms']),
                           n_written=x['save']['n_written'], kv_bytes=x['prefill']['prompt_n'] * KVT, restore_ms=r(x['restore']['ms']),
                           file_bytes=x['file_bytes'], dec_prompt_n=x['decode']['prompt_n'], dec_prompt_ms=r(x['decode']['prompt_ms']),
                           dec_tok_ms=r(x['decode']['per_tok_ms']), base_prompt_n=x['baseline']['prompt_n'], base_prompt_ms=r(x['baseline']['prompt_ms']),
                           base_tok_ms=r(x['baseline']['per_tok_ms']), same_text=x['decode']['same_text'], seed=run['seed']))
    it = []
    for run in lp:
        for x in run['interfere']:
            it.append({k: (r(v) if isinstance(v, float) else v) for k, v in x.items()})
    M['lpd'] = dict(model='Qwen3-1.7B Q8_0 (F16 KV cache)', engine='llama-server build 11146 (Homebrew 0.5.0), Metal', kv_per_token=KVT,
                    load=loads(os.path.join(W, 'out', 'lpd', 'load_*.txt')), runs=len(lp), transfer=tr, interfere=it)

# ---- 5. vLLM ExampleConnector ----
vp = {}
DISCARD = {'run1': 'another job held the machine during this run (load average 12 to 30; the bench lock had been taken over as stale)'}
for d in sorted(glob.glob(os.path.join(W, 'out', 'vpd', 'run*'))):
    if os.path.basename(d) in DISCARD:
        continue
    one = {'load': [float(x) for x in re.findall(r'[\d.]+', open(os.path.join(d, 'load_before.txt')).read() + open(os.path.join(d, 'load_after.txt')).read())][::3] if os.path.exists(os.path.join(d, 'load_after.txt')) else None}
    for ph in ('prefill', 'decode', 'baseline'):
        f = os.path.join(d, ph + '.json')
        if os.path.exists(f):
            one[ph] = json.load(open(f))
    dl = os.path.join(d, 'decode.log')
    one['injected'] = [int(x) for x in re.findall(r'Inject KV cache of (\d+) tokens', open(dl, errors='replace').read())] if os.path.exists(dl) else []
    bl = os.path.join(d, 'baseline.log')
    m = re.search(r'Reducing Torch threads from (\d+) to (\d+)', open(bl, errors='replace').read()) if os.path.exists(bl) else None
    one['torch_threads'] = int(m.group(2)) if m else None
    kvd = os.path.join(d, 'kv')
    files = [os.path.join(a, f) for a, _, fs in os.walk(kvd) for f in fs]
    one['kv_files'] = len(files)
    one['kv_bytes'] = sum(os.path.getsize(f) for f in files)
    vp[os.path.basename(d)] = one
if vp:
    M['vpd'] = vp
    M['vpd_discarded'] = DISCARD
json.dump(M, open(os.path.join(O, 'measured.json'), 'w'), indent=1)
print(json.dumps(M)[:1500])
