# Check the page against its data: the scaling engine in parts/26_js_rd_scale0.js against recompute.py, and every
# prose number of sections 3 and 5 (and the hero) against data/recompute.json and data/toy_summary.json.
# usage: python3 check_data.py   (from src/, after sh build.sh)
import html, json, re, subprocess, sys
from pathlib import Path

H = Path(__file__).resolve().parent
rc = json.loads((H / 'data/recompute.json').read_text())
toy = json.loads((H / 'data/toy_summary.json').read_text())['summary']
page = (H.parent / 'index.html').read_text()
text = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', page, flags=re.S))))
bad = 0

# 1. JS engine against Python, same inputs
js = (H / 'parts/26_js_rd_scale0.js').read_text()
prog = js + """
const P=window.PTS,o={};
for(const C of [1e21,5.76e23,3.8e25]){o[C.toPrecision(3)]={};for(const k of ['hoff','hoffr','besi'])o[C.toPrecision(3)][k]=P.opt(P.FITS[k],C);o[C.toPrecision(3)].kaplan_N=P.kaplan(C)}
o.over={};for(const k of [20,100,1868,3642])o.over[k]=P.over(P.FITS.besi,5.76e23,k);
o.floor=P.floorN(P.FITS.besi,P.opt(P.FITS.besi,5.76e23).L);
o.sard={};for(const [Nc,Di] of [[13e9,2e12],[7e9,1e11],[30e9,1e13]])for(const k of ['hoff','besi'])o.sard[(Nc/1e9).toFixed(0)+'B_'+Di.toExponential(0)+'_'+k]=P.sardana(P.FITS[k],Nc,Di);
console.log(JSON.stringify(o));"""
out = json.loads(subprocess.run(['node', '-e', 'const window={};' + prog], capture_output=True, text=True, check=True).stdout)
sc = rc['scale']
def close(a, b, tol=1e-9):
    return (a is None and b is None) or (a is not None and b is not None and abs(a - b) <= tol * max(1, abs(b)))
n = 0
for C, py in sc['budgets'].items():
    jsC = out[{'1e+21': '1.00e+21', '5.76e+23': '5.76e+23', '3.8e+25': '3.80e+25'}[C]]
    for k, v in py.items():
        vals = [(v, jsC[k])] if k == 'kaplan_N' else [(v[f], jsC[k][f]) for f in v]
        for a, b in vals:
            n += 1
            if not close(b, a): print('ENGINE', C, k, a, b); bad += 1
for k, v in sc['over'].items():
    for f in v:
        n += 1
        if not close(out['over'][k][f], v[f], 1e-6): print('OVER', k, f, v[f], out['over'][k][f]); bad += 1
n += 1
if not close(out['floor'], sc['N_floor']): print('FLOOR', sc['N_floor'], out['floor']); bad += 1
for key, byfit in sc['sardana'].items():
    for k, v in byfit.items():
        j = out['sard'][key + '_' + k]
        for a, b in ((v['N'], j['N']), (v['D'], j['D']), (v['saving'], j['saving']), (v['saving_frac'], j['saving_frac'])):
            n += 1
            if not close(b, a, 1e-6): print('SARDANA', key, k, a, b); bad += 1
print(f'engine: {n} values compared, {bad} differences')

# 2. prose numbers
B = lambda v: f'{v / 1e9:.1f}B'
o0, ov = sc['chin']['opt'], sc['over']
want = [
    B(o0['N']) + ' parameters on ' + f"{o0['D'] / 1e12:.2f}T", f"a = {o0['a']:.3f}", f"{sc['chin']['kaplan_N'] / 1e9:.0f}B parameters on {sc['chin']['kaplan_D'] / 1e9:.0f}B tokens",
    f"{sc['chin']['kaplan_pen_pct']:.1f}% above",
    f"{sc['l405']['opt']['N'] / 1e9:.0f}B on {sc['l405']['opt']['D'] / 1e12:.1f}T", f"{sc['l405']['pen_pct']:.3f}% worse",
    f"{ov['1868']['N'] / 1e9:.1f}B parameters, {ov['1868']['C_ratio']:.2f} times the training compute, {ov['1868']['serve_ratio']:.2f} times the serving cost, repaid after {ov['1868']['breakeven_tokens'] / 1e12:.0f}T",
    f"{ov['100']['N'] / 1e9:.1f}B parameters for {ov['100']['C_ratio']:.2f} times", f"about {ov['100']['breakeven_tokens'] / 1e12:.1f}T served",
    f"no model below {sc['N_floor'] / 1e9:.1f}B", f"({o0['L']:.3f} under the refit)",
    f"{sc['six_nd']['l405'] / 1e25:.2f} &times; 10".replace(' &times; ', ' × '), f"6 × 37B active × 14.8T = {sc['six_nd']['dsv3_active'] / 1e24:.1f} × 10",
    f"6 × 671B × 14.8T = {sc['six_nd']['dsv3_total'] / 1e25:.1f} × 10", f"{sc['six_nd']['smol'] / 1e23:.2f} × 10", f"{sc['six_nd']['smol_tpp']:,.0f} tokens per parameter",
    f"about {round(sc['six_nd']['smol_vs_chin'], -1):.0f} times Chinchilla", f"about {sc['six_nd']['smol_mfu'] * 100:.0f}% of peak",
    f"{rc['llama3_8b_tpp_exact']:,} per parameter",
]
pc = lambda v: f'{v * 100:.1f}%'
a, t, m = toy['acc'], toy['text'], toy['m_answer']
want += [f"{pc(a['const_same'])} with no anneal, {pc(a['decay_same'])} with the decay alone, {pc(a['const_maths'])} with the maths-heavy mix alone and {pc(a['decay_maths'])} with both",
         f"{t['const_same']:.3f} bits per character with no anneal, {t['decay_same']:.3f} with the decay alone", f"worse ({t['const_maths']:.3f})", f"recovers it ({t['decay_maths']:.3f})",
         f"falls from {m['const_same']:.3f} to {m['decay_maths']:.3f} bits with both, below either alone ({m['decay_same']:.3f} and {m['const_maths']:.3f})",
         f"({pc(a['const_same'])} to {pc(a['decay_same'])})"]
miss = [w for w in want if w not in text]
for w in miss: print('PROSE missing:', w)
print(f'prose: {len(want)} numbers checked, {len(miss)} missing')
sys.exit(1 if bad or miss else 0)
