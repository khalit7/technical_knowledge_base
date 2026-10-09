"""The page embeds exactly the recorded data, and the numbers written in the prose agree with it.
1. parts/23_js_sg_data.js equals what gen_data.py builds from iso/out, m1/out and inputs/ now.
2. ../index.html contains that data file verbatim.
3. Hand-written numbers in the prose against the data (and against ref.py for the toy example)."""
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
print('ALL OK' if ok else 'FAILURES')
sys.exit(0 if ok else 1)
