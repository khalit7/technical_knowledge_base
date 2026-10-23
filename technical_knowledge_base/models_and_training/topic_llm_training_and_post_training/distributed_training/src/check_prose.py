#!/usr/bin/env python3
"""Check that the numbers written into the Reading tab's static text and figures match recompute.json.
Run from src/ after build.sh and recompute.py: python3 check_prose.py"""
import json, re, html
R = json.load(open('recompute.json'))
s = open('../index.html').read()
t = html.unescape(re.sub(r'<script.*?</script>', ' ', s, flags=re.S))
rd, an = R['reading'], R['anim']
want = []
f1 = lambda v: f'{v:.1f}'
m = rd['mem']
want += [f'bf16 weights {f1(m["w"])} GB', f'bf16 gradients {f1(m["g"])} GB', f'Adam moments {f1(m["o"])} GB', f'sequence {f1(m["acts"])} GB',
         f'width:{m["pct"]["w"]:.2f}%', f'width:{m["pct"]["o"]:.2f}%', f'width:{m["pct"]["acts"]:.2f}%', f'left:{m["pct"]["line80"]:.2f}%',
         f'Model states {f1(sum(an["states"]["DP"] for _ in [0]))} GB']
c = rd['ckpt']
want += [f'{c["store_all"]:.0f} GB', f'{c["selective"]:.1f} GB', f'{c["full"]:.1f} GB', f'width:{c["pct"]["selective"]:.1f}%', f'width:{c["pct"]["full"]:.2f}%']
d = rd['dp_hide']
want += [f'about <b>{round(d["dp_tokens"], -2):,.0f} tokens</b>', f'{d["llama405_tokens_per_replica"]:,.0f} tokens each']
ml, md = rd['mesh']['l405'], rd['mesh']['dsv3']
want += [f'{ml["TP"]:.1f} GB per GPU per step over NVLink for TP ({ml["tTP"]:.2f} s)', f'{ml["DP"]:.1f} GB over the network for DP ({ml["tDP"]:.2f} s)',
         f'{ml["PP"]:.2f} GB for PP ({ml["tPP"]:.2f} s)', f'against {ml["tcomp"]:.2f} s of compute', f'sends {md["EP"]:.0f} GB over InfiniBand ({md["tEP"]:.1f} s) against {md["tcomp"]:.1f} s']
z = rd['zero_n64']
want += [f'{z[0]:.1f}, {z[1]:.1f} and {z[2]} GB']
sent = an['sent']
want += [f'gradients: {sent["DP"]:.1f} GB', f'gradients once: {sent["ZeRO-3"]:.1f} GB', f'every layer: {sent["TP"]:.1f} GB', f'micro-batch: {sent["PP"]:.2f} GB',
         f'all-to-all: {sent["EP"]:.1f} GB', f'all-reduce: {sent["CP"]:.1f} GB', f'{sent["HSDP_ib"]:.1f} GB per GPU on InfiniBand', f'{sent["TP"]:.1f} GB per GPU for this step']
bad = [w for w in want if w not in t]
for w in bad: print('MISSING', w)
print(f'{len(want) - len(bad)} of {len(want)} prose numbers found' + ('' if not bad else ', FAIL'))
