"""The hero's result panel (light pass 2026-10-25), drawn from tables.json so no number is retyped:
Table 2's nine-benchmark averages (vanilla backbone, with a JIT-written harness, bare GPT-5.6) and Table 3's
cost per case for the cheapest fixed harness against the JIT harness in all six settings, with each one's score.
Writes parts/_gen_hero.html (HTML bars, so it reflows at phone width). Run by build.sh."""
import json
T = json.load(open('tables.json'))
avg = lambda r: round(sum(r['v']) / len(r['v']), 1)
R = {r['model']: r for r in T['t2']}
rows = [('GLM-5.2, its default scaffold', avg(R['GLM-5.2']), ''), ('GLM-5.2 + JIT harness', avg(R['JIT-Agent + GLM-5.2']), 'sk'),
        ('V4-Flash, its default scaffold', avg(R['DeepSeek-V4-Flash']), ''), ('V4-Flash + JIT harness', avg(R['JIT-Agent + DeepSeek-V4-Flash']), 'sk'),
        ('GPT-5.6, bare', avg(R['GPT-5.6']), 'ref')]
bar = lambda lab, v, w, cls, txt: '<div class="br %s"><span>%s</span><span class="tr"><span class="f" style="display:block;width:%.1f%%"></span></span><span class="v">%s</span></div>' % (cls, lab, w, txt)
a = '<div class="met"><p class="mt">Nine-benchmark average, 0 to 100 ({{Table 2|ax:S5.T2}})</p>' + ''.join(bar(l, v, v, c, '%.1f' % v) for l, v, c in rows) + '</div>'
BN = {'DSQA': 'DeepSearchQA', 'xBench': 'xBench-DS', 'AgentIF': 'AgentIF'}
b = '<div class="met"><p class="mt">Cost per case: cheapest fixed harness against JIT, score in brackets ({{Table 3|ax:S5.T3}})</p>'
cuts = []
for bb, short in (('DeepSeek-V4-Flash', 'V4-Flash'), ('Qwen3.6-Flash', 'Qwen-Flash')):
    g = [r for r in T['t3'] if r['backbone'] == bb]
    jit = next(r for r in g if r['harness'] == 'JIT-Agent')
    for k in ('DSQA', 'xBench', 'AgentIF'):
        fx = min((r for r in g if r['harness'] != 'JIT-Agent'), key=lambda r: r[k][2])
        cut = 100 * (1 - jit[k][2] / fx[k][2]); cuts.append(cut)
        b += '<p class="pair">%s, %s: %.0f%% cheaper</p>' % (short, BN[k], cut)
        b += bar(fx['harness'], 0, 100 * fx[k][2] / 0.2, '', '$%.3f (%.1f)' % (fx[k][2], fx[k][0]))
        b += bar('JIT', 0, 100 * jit[k][2] / 0.2, 'sk', '$%.3f (%.1f)' % (jit[k][2], jit[k][0]))
b += '</div>'
assert round(min(cuts), 1) == 14.9 and round(max(cuts), 1) == 54.1 and round(sum(cuts) / 6, 1) == 36.0
open('parts/_gen_hero.html', 'w', encoding='utf-8').write('<div class="mets">' + a + b + '</div>\n')
print('hero: averages', [r[1] for r in rows], 'cuts %.1f to %.1f' % (min(cuts), max(cuts)))
