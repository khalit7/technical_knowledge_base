"""Check that the built page embeds exactly the recorded outputs, and that the static prose numbers match the data.
Run from anywhere: python3 check_data.py   (stdlib only). Exit 1 on any mismatch."""
import json, math, os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(H, '..', 'index.html')).read()
m = re.search(r'window\.PE_DATA=(\{.*?\});\n', page, flags=re.S)
D = json.loads(m.group(1))
J = lambda *p: json.load(open(os.path.join(H, *p)))
bad = []
def eq(name, a, b):
    if a != b: bad.append(name)

# 1. embedded data equals the recorded outputs
past = J('past', 'out', 'past.json')
for r in past['runs']:
    for v in r.get('shifted', {}).values():
        v.pop('token_loss', None)
eq('past.json', D['past'], past)
runs = J('train', 'out', 'runs.json')['runs']
for r in runs:
    if r.get('train_curve'):
        r['train_curve'] = r['train_curve'][::2]
eq('runs.json', D['runs'], runs)
eq('probe.json', D['probe'], J('probe', 'out', 'probe.json'))
cr = J('code', 'out', 'code_refs.json')
eq('code_refs.json', D['code']['refs'], cr['refs']); eq('rope_calls', D['code']['rope_calls'], cr['rope_calls'])
cen = [r for r in J('census', 'out', 'census.json')['rows'] if 'error' not in r]
eq('census count', len(D['census']), len(cen))
eq('census repos', [r['repo'] for r in D['census']], [r['repo'] for r in cen])
rc = J('inputs', 'recompute.json')
eq('yarn_bands', D['R']['yarn_bands'], rc['yarn_bands']); eq('partial_two_ways', D['R']['partial_two_ways'], rc['partial_two_ways'])

# 2. static prose numbers against the data (text of the built page with tags stripped)
text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', page, flags=re.S)))
def has(name, s):
    if s not in text: bad.append('prose: ' + name + ' -> ' + s)
inv = [10000 ** (-2 * i / 32) for i in range(16)]
full = sum(1 for f in inv if 256 * f >= 2 * math.pi)
has('tiny fast pairs', 'pairs 0 to %d go round at least once' % (full - 1))
has('tiny split', '%d fast and %d slow' % (full, 16 - full))
has('tiny pair 15 wavelength', '{:,}'.format(round(2 * math.pi / inv[15])))
has('tiny pair 15 degrees', '%.1f degrees' % (256 * inv[15] * 180 / math.pi))
has('census count header', '%d real configs' % len(cen))
p = rc['presets']
has('tiny ntk base', '{:,}'.format(p['tiny']['ntk_base']))
has('llama31 bands', '%d kept, %d blended, %d divided' % (rc['llama31_bands']['kept'], rc['llama31_bands']['smoothed'], rc['llama31_bands']['divided']))
b = rc['yarn_bands']
has('oss bands', '%d kept, %d on the ramp and %d interpolated' % (b['oss']['kept'], b['oss']['ramp'], b['oss']['interp']))
has('dsv3 bands', '%d are kept, %d on the ramp and %d fully interpolated' % (b['dsv3']['kept'], b['dsv3']['ramp'], b['dsv3']['interp']))
has('dsv4 bands', '%d kept, %d on the ramp' % (b['dsv4']['kept'], b['dsv4']['ramp']))
assert b['dsv4']['interp'] == 0
has('yarn temp s=8', '%.3f' % (0.1 * math.log(8) + 1) ** 2)
has('oss temp', '%.3f' % (0.1 * math.log(32) + 1))
has('llama4 temp 1M', '%.2f at position one million' % rc['llama4_temp']['1048575'])
has('llama4 temp 10M', '%.2f at ten million' % rc['llama4_temp']['10485759'])
has('mistral3 llama4 scale', '%.3f at its last position' % (1 + 0.1 * math.log(1 + math.floor(294911 / 8192))))
g = rc['partial_two_ways']['gemma4']
has('gemma4 globals in variants text via data', 'global_head_dim 512')
has('learned table params', '65,536 parameters in the tiny GPT, 786,432')
has('rope flops', '6 × 256 = 1,536')
has('llama3 pair 63', '2.46 × 10')
has('llama3 pair 63 wavelength', '2.56 million tokens')
has('kimi k3 full layers', '(24 of 93)')
# the measured headline sentences live in 24_js_pe_fill.js and are built from the data; check the ones that assert an ordering
pr = {(r['model'], r['scaling']): r for r in past['runs']}
rope, y8, n8, l8, t8 = pr[('at_mha', 'plain')], pr[('at_mha', 'yarn x8')], pr[('at_mha', 'ntk x8')], pr[('at_mha', 'linear x8')], pr[('at_mha', 'temperature only (x8)')]
if not (y8['1024-2047'] < min(n8['1024-2047'], l8['1024-2047'])): bad.append('claim: YaRN x8 best far out')
if not (t8['1024-2047'] >= rope['1024-2047'] - 0.05): bad.append('claim: temperature alone does nothing useful')
if not (n8['512-1023'] < rope['512-1023'] and n8['1024-2047'] > n8['512-1023'] + 0.5): bad.append('claim: NTK holds to 1,023 then rises')
if not (l8['0-255'] > rope['0-255'] + 0.5): bad.append('claim: PI x8 costs inside 256')
if not (l8['0-255'] > y8['0-255'] > n8['0-255']): bad.append('claim: inside-256 cost order PI > YaRN > NTK')
mo = pr.get(('at_mha', 'mistake: yarn x8 with orig_ctx 2,048'))
if mo and not (mo['1024-2047'] > y8['1024-2047']): bad.append('claim: orig_ctx mistake is worse')
# lc agreement: the long_context sibling's recorded numbers for the same windows
lcp = os.path.normpath(os.path.join(H, '../../long_context/src/past/out/past.json'))
if os.path.exists(lcp):
    lc = json.load(open(lcp))
    for r in lc['runs']:
        mine = pr.get((r['model'], r['scaling']))
        if mine:
            for k in ('0-255', '256-511', '512-1023', '1024-2047'):
                if abs(mine[k] - r[k]) > 1e-4: bad.append('lc disagrees %s %s %s' % (r['model'], r['scaling'], k))
print('checked', 'OK' if not bad else 'PROBLEMS: ' + '; '.join(bad))
sys.exit(1 if bad else 0)
