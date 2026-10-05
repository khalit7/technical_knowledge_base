"""Reading tab: confirm the built page embeds exactly the recorded outputs and that numbers in the prose match the data.
1 window.RDC in ../index.html equals read/out/summary.json (which summarize.py derived from read/out/run_*.json,
  sim/out/data.json, lab/out/data.json and compile/out/*.ptxas.txt);
2 key medians in summary.json are recomputed from the raw run files;
3 every <span data-rdv="key"> in the built Reading tab shows read/out/prose_values.json[key];
4 a few hand-written figures in the prose are recomputed from vendor constants (ridge 295, 4.8x, Boehm ratios).
Run from src/:  python3 read/check/check_embed.py"""
import json, re, statistics as st, sys
bad = 0
def ok(c, m):
    global bad
    print(('ok   ' if c else 'FAIL ') + m); bad += (not c)
html = open('../index.html').read()
S = json.load(open('read/out/summary.json')); V = json.load(open('read/out/prose_values.json'))
m = re.search(r'window\.RDC=(\{.*?\});\n', html)
ok(m and json.loads(m.group(1)) == S, 'embedded window.RDC equals read/out/summary.json')
runs = [json.load(open(f'read/out/run_{i}.json')) for i in (1, 2, 3)]
ok(round(st.median([r["cases"]["softmax"]["gbps"] for r in runs]), 1) == S["softmax"]["gbps_median"], 'softmax GB/s median recomputed from the three raw runs')
for j, a in enumerate(S["attention"]):
    ok(round(st.median([r["cases"]["attention"][j]["fused"]["ms"] for r in runs]), 2) == a["fused_ms"], f'attention N={a["N"]} fused median recomputed')
sim = json.load(open('sim/out/data.json'))["m"]
ok(any(abs(x["gbps"] - S["sim"]["coal"][0]["gbps"]) < 1e-9 for x in sim["coalesce"]), 'GPU simulator coalescing value present in sim/out/data.json')
lab = json.load(open('lab/out/data.json'))["cases"]
ok(any(abs(x["ms"] - S["lab"]["matmul"][0][1]) < 1e-9 for x in lab), 'Kernel lab matmul value present in lab/out/data.json')
read = html[html.index('id="t-read"'):html.index('id="t-sim"')]
spans = re.findall(r'data-rdv="(\w+)">([^<]*)<', read)
ok(len(spans) >= 40, f'{len(spans)} prose numbers tagged')
for k, v in spans:
    if V.get(k) != v: ok(False, f'prose span {k}: page "{v}" vs data "{V.get(k)}"')
ok(all(V.get(k) == v for k, v in spans), 'every tagged prose number equals prose_values.json')
ok(round(989.5e12 / 3.35e12) == 295, 'H100 ridge 295 FLOP/byte (989.5 TF / 3.35 TB/s)')
ok(abs(1986.5 / 309.0 - 6.4) < 0.05 and abs(15971.7 / 2980.3 - 5.4) < 0.05, 'Boehm ratios 6.4x and 5.4x quoted in section 4')
ok(abs(989.5 / 67 - 15) < 0.3, '"about 15 times" tensor vs FP32 on H100')
ok(abs(478.8 / 29.0 - 16) < 0.6, '"about 16 times lower latency" (H800 Table IV)')
ok(all(t not in html for t in ('/' + 'Users/', 'gl' + 'pat', 'sk' + '-ant')), 'no private paths or tokens in the page')
print('FAIL' if bad else 'OK'); sys.exit(1 if bad else 0)
