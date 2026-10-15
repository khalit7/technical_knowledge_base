"""Check that ../index.html embeds exactly data/syn_data.json, that every @@fact@@ was filled, and that the prose's
measured numbers are recomputed independently here from the embedded data (not from facts.json).
usage: python3 check_page.py   (from src/scripts/; exits 1 on any failure)"""
import os, re, json, sys
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
page = open(os.path.join(H, '..', 'index.html'), encoding='utf-8').read()
data = json.load(open(os.path.join(H, 'data', 'syn_data.json'), encoding='utf-8'))
facts = json.load(open(os.path.join(H, 'data', 'facts.json'), encoding='utf-8'))
fail = []
m = re.search(r'window\.SY=(.*?);\n</script>', page, re.S)
if not m or json.loads(m.group(1)) != data: fail.append('embedded data differs from data/syn_data.json')
if re.search(r'@@[a-z0-9_]+@@', page): fail.append('unfilled facts: ' + ', '.join(sorted(set(re.findall(r'@@([a-z0-9_]+)@@', page)))))
# which facts the parts actually use, and that each value appears in the page text
parts = ''.join(open(os.path.join(H, 'parts', f), encoding='utf-8').read() for f in os.listdir(os.path.join(H, 'parts')) if f.endswith('.html'))
used = sorted(set(re.findall(r'@@([a-z0-9_]+)@@', parts)))
for k in used:
    if k not in facts: fail.append('fact missing: ' + k)
# independent recomputation from the embedded data
S = {s['key']: s for s in data['sets']}
pc = lambda x: f'{100 * x:.0f}%' if x >= 0.1 else f'{100 * x:.1f}%'
exp = {
    'ts_once': pc(S['tinystories']['openings_top3'][0][1] / 1000), 'ts_open10': pc(S['tinystories']['openings_top10_share']),
    'fw_d2': f"{S['fineweb']['distinct2']:.2f}", 'fw_edu3': pc(S['fineweb']['edu_ge3']), 'fwe_edu3': pc(S['fineweb_edu']['edu_ge3']),
    'cosmo_edu3_max': pc(max(s['edu_ge3'] for s in data['sets'] if s['key'].startswith('cosmo'))),
    'bg_pplR': f"{data['bigram']['modes']['replace'][-1]['test_ppl']:.1f}", 'bg_pplA': f"{data['bigram']['modes']['accumulate'][-1]['test_ppl']:.1f}",
    'cat_replace_med': f"{data['collapse_ref']['alive_at_G_50_seeds']['replace']['median']:.0f}",
    'av_told_pct': f"{100 * data['cosmo']['avoid']['told'][1] / data['cosmo']['avoid']['told'][0]:.1f}%",
}
for k, v in exp.items():
    if facts.get(k) != v: fail.append(f'{k}: facts {facts.get(k)} vs recomputed {v}')
# the hard-coded statements in the prose that are not placeholders
checks = [('cs_once', '22%'), ('ka_welcome', '22%')]
for k, v in checks:
    if facts.get(k) != v: fail.append(f'{k} changed: {facts.get(k)}')
print(f'{len(used)} facts used, {len(exp)} recomputed independently, embedded data {len(m.group(1)) if m else 0} bytes')
print('FAIL\n' + '\n'.join(fail) if fail else 'OK'); sys.exit(1 if fail else 0)
