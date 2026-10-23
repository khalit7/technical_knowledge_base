"""The page embeds exactly the recorded data, and the numbers written in the prose agree with it.
1. parts/23_js_sg_data.js equals what gen_data.py builds from iso/out, m1/out and inputs/ now.
2. ../index.html contains that data file verbatim.
3. Hand-written numbers in the prose against the data (and against ref.py for the toy example). Since the 2026-10-23 rebuild
   the numbers that scripts used to fill in are written as static text, so every one of them is checked here."""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__))
ok = True


def chk(name, cond, detail=''):
    global ok
    print(('OK   ' if cond else 'FAIL ') + name + (' ' + detail if detail else ''))
    ok = ok and cond


data_js = open(os.path.join(H, 'parts', '23_js_sg_data.js')).read()
subprocess.run([sys.executable, '-I', os.path.join(H, 'gen_data.py')], check=True, capture_output=True)
chk('data file regenerates identically', open(os.path.join(H, 'parts', '23_js_sg_data.js')).read() == data_js)
page = open(os.path.join(H, '..', 'index.html')).read()
chk('page embeds the data file verbatim', data_js.strip() in page)
D = json.loads(data_js[data_js.index('=') + 1:].rstrip().rstrip(';'))
cache = {(r['trace'], r['cap']): r for r in D['cache']}
read = ''.join(open(os.path.join(H, 'parts', f)).read() for f in sorted(os.listdir(os.path.join(H, 'parts'))) if f.startswith('20_read'))
# agent cliff: "from about 70% to 97%"
a24 = cache[('agent', 24000)]; a48 = cache[('agent', 48000)]
chk('agent 24k about 70%', round(100 * a24['rh'] / a24['prompt']) == 70, f"{100*a24['rh']/a24['prompt']:.1f}")
chk('agent 48k 97%', round(100 * a48['rh'] / a48['prompt']) == 97, f"{100*a48['rh']/a48['prompt']:.1f}")
chk('prose has the agent cliff numbers', 'from about 70% to 97%' in read)
# tree lab: 24 settings, 72 replays
chk('24 trace and pool settings', D['real'] and D['real']['runs'] == 72 and D['real']['identical'] == 72 and len({(r['trace'], r['cap']) for r in D['cache']}) == 24)
# toy example: request 6 hits 13 (tree) and 12 (blocks of 4) with a 40-slot pool
sys.path.insert(0, os.path.join(H, 'iso'))
import ref  # noqa: E402
S = 'You are a bank assistant . Be brief .'.split(); T = 'You are a travel agent . Be brief .'.split(); sp = str.split
reqs = [(S + sp('What is my balance ?'), sp('It is $40 .')), (S + sp('Can I open an account ?'), sp('Yes , online .')),
        (S + sp('What is my balance ?') + sp('It is $40 .') + sp('And savings ?'), sp('$9 .')), (T + sp('Book a flight .'), sp('Where to ?')),
        (S + sp('What are your hours ?'), sp('Nine to five .')), (S + sp('What is my balance ?'), sp('It is $40 .')),
        (T + sp('Book a flight .') + sp('Where to ?') + sp('Paris .'), sp('Done .')), (S + sp('What is my loan ?'), sp('None .'))]
voc = {}
for kind, want in (('radix', 13), ('blocks', 12)):
    c = ref.Radix(40) if kind == 'radix' else ref.Blocks(40, 4)
    hits = []
    for p, o in reqs:
        ids = [voc.setdefault(w, len(voc) + 1) for w in p + o]
        hits.append(c.serve(ids, len(p), len(o))[0])
    chk(f'toy request 6 {kind} hit {want}', hits[5] == want, str(hits))
chk('toy prompt is 14 tokens', len(reqs[5][0]) == 14)
chk('prose: 13 of 14 and 12 in blocks', '<b>13.</b>' in read and 'Blocks of 4 reuse 12' in read)
# scheduling prose: 128 cliff and thresholds 32 are code constants (checked by reading the source); policy counts
chk('sched checked', D['check_sched'] and D['check_sched']['mismatches'] == 0)
# Qwen3-0.6B KV bytes per token
chk('114,688 bytes per token', 28 * 8 * 128 * 2 * 2 == 114688 and '114,688' in read)
# m1 data present
chk('m1 data present', D['m1'] is not None and D['m1'].get('sched') is not None, '')
# ---- static prose numbers (written by hand since the 2026-10-23 rebuild) ----
def pc(r, k): return f"{100*r[k]/r['prompt']:.1f}%"
ci, ai, r6 = cache[('chat', 1000000)], cache[('agent', 1000000)], cache[('rag', 6000)]
chk('room for all: chat, agent', f"reuses {pc(ci,'rh')} of the chat trace's prompt tokens and the blocks {pc(ci,'bh')}" in read and f"{pc(ai,'rh')} against {pc(ai,'bh')}" in read)
chk('rag 6k: blocks win', f"the blocks reuse {pc(r6,'bh')} and the tree {pc(r6,'rh')}" in read)
chk('bookkeeping nodes and blocks', f"holds {ci['nodes']-0:,} nodes where vLLM holds {ci['blocks']:,} cached blocks" in read or f"holds {ci['nodes']:,} nodes" in read, f"{ci['nodes']} {ci['blocks']}")
gap = max(abs(r['rh']-r['bh'])/r['prompt']*100 for r in D['cache'] if r['cap'] == 1000000 and r['prompt'])
chk('within 0.8 points', f'within {gap:.1f} points' in read, f'{gap:.2f}')
chk('4,800 requests, 72 replays', f"{D['real']['requests']//3:,} requests through each class, {D['real']['runs']} replays" in read)
def st(k):
    v = [100*x[1]/x[3] for x in D['sched'][k]]; return sum(v)/len(v), min(v), max(v)
for p in ['fcfs', 'lpm', 'dfs-weight', 'random']:
    m, lo, hi = st('96_3000_' + p)
    chk(f'ten orders {p}', f"{p} {m:.1f}%" in read.replace('<b>', '').replace('</b>', '') and f"({lo:.0f} to {hi:.0f})" in read, f'{m:.1f} {lo:.0f} {hi:.0f}')
chk('pool 6,000', ', '.join(f"{p} {st('96_6000_'+p)[0]:.1f}%" for p in ['fcfs', 'lpm', 'dfs-weight', 'random']) in read)
chk('475 checks', f"{D['check_sched']['orders_checked']} queue orderings and prefix matches, {D['check_sched']['mismatches']} mismatches" in read)
m1 = D['m1']; ms = m1['sched']
chk('M1 sched fcfs', f"<b>fcfs</b> {ms['fcfs']['cached_pct']:.1f}% of prompt tokens from cache, batch done in {ms['fcfs']['makespan']:.1f} s (runs {ms['fcfs']['makespan_min']:.1f} to {ms['fcfs']['makespan_max']:.1f})" in read)
chk('M1 sched lpm', f"<b>lpm</b> {ms['lpm']['cached_pct']:.1f}%, {ms['lpm']['makespan']:.1f} s (runs {ms['lpm']['makespan_min']:.1f} to {ms['lpm']['makespan_max']:.1f})" in read)
chk('M1 sched random', f"<b>random</b> {ms['random']['cached_pct']:.1f}%, {ms['random']['makespan']:.1f} s (one run)" in read and ms['random']['reps'] == 1 and 'dfs-weight' not in ms)
on, off = m1['multiturn']['radix_on'], m1['multiturn']['radix_off']
t4, t4o, t1, t1o = on['by_turn'][3], off['by_turn'][3], on['by_turn'][0], off['by_turn'][0]
chk('M1 multiturn turn 4', f"about {round(t4['prompt']):,} prompt tokens, {round(t4['cached']):,} of them cached) the mean time to first token was {t4['ttft']['mean']:.2f} s with the radix cache and {t4o['ttft']['mean']:.2f} s" in read and f"{t4o['ttft']['mean']/t4['ttft']['mean']:.1f} times faster" in read)
chk('M1 multiturn turn 1', f"{t1['ttft']['mean']:.2f} s against {t1o['ttft']['mean']:.2f} s" in read)
chk('M1 multiturn decode and job', f"{on['tpot_ms']['mean']:.0f} against {off['tpot_ms']['mean']:.0f} ms per output token" in read and f"{on['makespan']['mean']:.1f} s against {off['makespan']['mean']:.1f} s" in read)
j = m1['json']
chk('M1 json', f"{j['schema']['valid']} of {j['schema']['n']} answers with a JSON schema parsed as JSON against {j['free']['valid']} of {j['free']['n']}" in read and f"{j['schema']['tpot_ms_median']:.1f} ms against {j['free']['tpot_ms_median']:.1f} ms" in read)
chk('M1 json first schema and no-sampling', f"{j['schema_first_ttft_ms'][0]:.0f} ms to first token" in read and f"ended after {round(j['no_sampling']['tokens_mean'])} tokens" in read and f"({j['no_sampling']['valid']} valid of {j['no_sampling']['n']})" in read)
chk('M1 load range', f"{m1['load_range'][0]:.1f} to {m1['load_range'][1]:.1f}" in read)
chk('M1 overlap absent (crashed)', not (m1.get('overlap') or {}).get('on') and '6 configurations, each retried once' in read)
sp = m1['repro'].get('split')
if sp: chk('split-prefill margins', ', '.join(f"{sp['runs'][k]['first8_margins'][8]:.3f}" for k in sp['runs']).replace(', 0.125, 0.125', ', 0.125 and 0.125') in read)
# InferenceX ratios: same rule as 29_js_sg_vs.js (best configuration per engine per concurrency, settings with at least 3 runs of each)
C = D['ix']['cols']; R = [dict(zip(C, r)) for r in D['ix']['rows']]; R = [r for r in R if r['tput_gpu'] > 0 and r['intvty'] > 0]
G = {}
for r in R: G.setdefault((r['hw'], r['prec'], str(r['isl'])), {'vllm': [], 'sglang': []})[r['fw']].append(r)
for (hw, prec, isl), g in G.items():
    if isl != '1024' or len(g['vllm']) < 3 or len(g['sglang']) < 3: continue
    by = {}
    for fw in ('vllm', 'sglang'):
        for r in g[fw]: by.setdefault(r['conc'], {})[fw] = max(by.get(r['conc'], {}).get(fw, 0), r['tput_gpu'])
    rs = [by[c]['sglang']/by[c]['vllm'] for c in sorted(by) if 'vllm' in by[c] and 'sglang' in by[c]]
    lo, hi = min(rs), max(rs)
    chk(f'InferenceX {hw} {prec}', f'{lo:.2f} to {hi:.2f} times' in read, f'{lo:.2f} to {hi:.2f}')
print('ALL OK' if ok else 'FAILURES')
sys.exit(0 if ok else 1)
