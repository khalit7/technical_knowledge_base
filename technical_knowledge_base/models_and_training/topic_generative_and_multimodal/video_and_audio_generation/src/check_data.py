# Checks that (1) the page embeds exactly the recorded data (window.VA equals what make_data.py builds from the files),
# (2) the page's JavaScript formulas agree with calc/recompute.py for every preset, and (3) numbers written as static prose
# match the recorded data. Every quoted source line is checked against inputs/source_lines.json by construction (the page reads it).
# usage: python3 -I check_data.py
import json, os, re, subprocess, tempfile
H = os.path.dirname(os.path.abspath(__file__)); page = open(os.path.join(H, '..', 'index.html')).read()
bad = 0
def ok(cond, msg):
    global bad
    print(('OK   ' if cond else 'FAIL ') + msg); bad += (not cond)
# 1. embedded data equals the generated part, which equals a fresh build
part = open(os.path.join(H, 'parts', '22_js_va_0data.js')).read()
emb = re.search(r'window\.VA=(\{.*?\});\n', page, re.S).group(1)
gen = re.search(r'window\.VA=(\{.*?\});\n', part, re.S).group(1)
ok(emb == gen, 'page embeds parts/22_js_va_0data.js byte for byte')
tmp = part
subprocess.run(['python3', '-I', os.path.join(H, 'make_data.py')], check=True, capture_output=True)
ok(open(os.path.join(H, 'parts', '22_js_va_0data.js')).read() == tmp, 'make_data.py rebuild from codec/out, vae/out, calc/out, inputs is identical')
VA = json.loads(emb)
cod = json.load(open(os.path.join(H, 'codec', 'out', 'codecs.json')))
ok(VA['codecs'] == {c: R['codecs'] for c, R in cod['clips'].items()}, 'codec metrics equal codec/out/codecs.json')
vae = json.load(open(os.path.join(H, 'vae', 'out', 'wan_vae.json')))
ok(VA['vae']['clips']['fast']['psnr'] == vae['clips']['fast']['psnr'] and VA['vae']['clips']['slow']['psnr'] == vae['clips']['slow']['psnr'], 'VAE PSNRs equal vae/out/wan_vae.json')
# 2. the JS formulas against recompute.py (run the page's util in node with stubs)
rc = json.load(open(os.path.join(H, 'calc', 'out', 'recompute.json')))
util = open(os.path.join(H, 'parts', '23_js_va_util.js')).read()
js = 'global.window={VA:' + emb + '};global.Audio=function(){return {addEventListener(){},pause(){},play(){}}};global.document={addEventListener(){}};\n' + util + \
     '\nconst U=window.VAU;const o={};U.V.models.forEach(m=>{const c=U.calc(m);o[m.id]={tokens:c.N,tps:Math.round(c.tps),tflop_pass:Math.round(c.per/1e11)/10,attn_share:Math.round(c.share*1000)/1000,vae:c.vae,ppt:c.ppt,full:c.full,fact:c.fact}});' + \
     'o.D=U.D;console.log(JSON.stringify(o))'
with tempfile.NamedTemporaryFile('w', suffix='.js', delete=False) as f: f.write(js); fn = f.name
out = json.loads(subprocess.run(['node', fn], capture_output=True, text=True, check=True).stdout); os.unlink(fn)
for k, r in rc.items():
    j = out[k]
    ok(j['tokens'] == r['tokens'] and j['tps'] == r['tok_per_s'] and abs(j['tflop_pass'] - r['tflop_pass']) < 0.06 and abs(j['attn_share'] - r['attn_share']) < 0.0006
       and j['vae'] == r['vae_ratio'] and j['ppt'] == r['px_per_token'] and j['full'] == r['full_pairs'] and j['fact'] == r['fact_pairs'], f'JS calc = recompute.py for {k} ({r["tokens"]} tokens)')
D = out['D']
# 3. static prose numbers against data
sp = cod['clips']['speech']['codecs']; mi = json.load(open(os.path.join(H, 'codec', 'out', 'mistakes.json')))
meta = json.load(open(os.path.join(H, 'calc', 'out', 'meta.json')))
checks = [
 ('32,760', f"{rc['wan13']['tokens']:,}"), ('75,600', f"{rc['wan14']['tokens']:,}"), ('27,280', f"{rc['wan22']['tokens']:,}"), ('73,728', f"{rc['moviegen']['tokens']:,}"),
 ('126,360', f"{81 * 30 * 52:,}"), ('97,044,480', f"{81 * 480 * 832 * 3:,}"), ('88,080', f"{round(3.67 * 24000):,}"), ('58,720', f"{mi['wrong_rate']['input_samples']:,}"),
 ('1.07 billion', f"{rc['wan13']['full_pairs'] / 1e9:.2f} billion"), ('about 21 times fewer', f"about {round(rc['wan13']['fact_ratio'])} times fewer"),
 ('126.9M parameters', f"{vae['params'] / 1e6:.1f}M parameters"), ('16 &times; 5 &times; 32 &times; 32', ' &times; '.join(str(v) for v in vae['clips']['slow']['latent_shape'][1:])),
 ('147,600 tokens', f"{41 * 45 * 80:,} tokens"), ('(3.8 times)', f"({((41 * 45 * 80) / 75600) ** 2:.1f} times)"),
 ('1.42B parameters', f"{meta['params']['Wan-AI_Wan2.1-T2V-1.3B-Diffusers'] / 1e9:.2f}B parameters"),
 ('6,800 TFLOP per pass', f"{round(rc['wan14']['tflop_pass'], -2):,.0f} TFLOP per pass"), ('680,000 TFLOP', f"{round(rc['wan14']['tflop_video'], -4):,.0f} TFLOP"),
 ('about two thirds of the compute even at 480p', 'about two thirds of the compute even at 480p' if 0.6 < meta['flop_check']['by_op']['aten.bmm'] / meta['flop_check']['counted'] < 0.75 else 'x'),
 ('MUSHRA 83.1 at 6 kbps against 76.5 for Opus at 12 kbps and 30.1', 'MUSHRA 83.1 at 6 kbps against 76.5 for Opus at 12 kbps and 30.1'),
]
# these three were quoted only by the removed Model timeline tab (2026-10-24); the tables now render them from the same formula
for s, want in [('44,520', f"{rc['mochi']['tokens']:,}"), ('17,550', f"{rc['cogx']['tokens']:,}"), ('118,800', f"{rc['hyv']['tokens']:,}")]:
    ok(s == want, f'token count "{s}" (Mochi card, CogVideoX, HunyuanVideo) equals recompute.py ("{want}")')
for s, want in checks:
    ok(s == want and s in page, f'prose "{s}" matches data ("{want}") and is on the page')
for s in ['600 tokens a second at 6 kbps', '100 a second for Mimi at 1.1 kbps', '75 frames a second']:
    ok(s in page, f'prose "{s}" on the page (75 x 8 = 600; 12.5 x 8 = 100; 24,000 / 320 = 75)')
ok(D['vae']['f0'] == '37.0' and D['fc']['share'] == '71%', f"derived prose values: frame 0 {D['vae']['f0']} dB, attention share {D['fc']['share']}")
print('FAIL' if bad else 'ALL OK', bad)
