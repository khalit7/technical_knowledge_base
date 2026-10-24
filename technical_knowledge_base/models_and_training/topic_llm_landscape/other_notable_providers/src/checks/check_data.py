"""Prose numbers on the built page against the recompute outputs and the data parts.
Run from the page folder: python3 src/checks/check_data.py   (prints problems; exits 1 if any)"""
import html, json, re, subprocess, sys
from pathlib import Path
SRC = Path(__file__).resolve().parent.parent
page = (SRC.parent / 'index.html').read_text()
vis = re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<script.*?</script>|<style.*?</style>', ' ', page, flags=re.S))))
rc = subprocess.run([sys.executable, str(SRC / 'recompute.py')], capture_output=True, text=True, cwd=SRC).stdout
ol = subprocess.run([sys.executable, str(SRC / 'olmo' / 'recompute.py')], capture_output=True, text=True, cwd=SRC / 'olmo').stdout
bad = []
def need(cond, msg):
    if not cond: bad.append(msg)
# recompute.py (this page) -> prose
for frag, prose in [('= 96 KiB per token', '96 KiB'), ('= 6 KiB per token', '6 KiB'), ('= 320 KiB per token', '320 KiB'), ('= 16 KiB per token', '16 KiB'), ('= 8 KiB per token', '8 KiB'),
                    ('(tokens): 533', 'about 533 tokens'), ('ctx  131,072: transformer    12288.0 MiB  hybrid     814.8 MiB', '12 GiB per sequence against 0.8 GiB'),
                    ('1.76 bit: 5.94 GB; 16-bit 54 GB; ratio 9.09x', '16 ÷ 1.76 = 9.09'), ('218B 4-bit: 109 GB', '218 × 4 ÷ 8 = 109 GB'),
                    ('8-bit 111 GB', 'holds at 8-bit (111 GB)'), ('2.026 bytes per parameter', 'about 2.03 bytes per parameter'),
                    ('Hy4 preview             15.7x', '770 ÷ 49 = 15.7'), ('Qwen3.8-Flash-Next      20.8x', '125 ÷ 6 = 20.8'), ('Step 5 Preview          22.2x', '600 ÷ 27 = 22.2'),
                    ('DeepSeek V4 Pro         32.7x', '1,600 ÷ 49 = 32.7'), ('2.70/15 = 18%', '2.70 ÷ 15 = 18%'), ('cache hit / miss: 0.83%', '0.83% of a miss'),
                    ('MiMo-V2.6-Pro                                  46.3 $0.133', 'MiMo-V2.6-Pro at $0.133'), ('Step 5 Preview                                 43.7 $0.718', 'Step 5 Preview costs $0.718'),
                    ('DiLoCo 95.7% (published 95.7%)', '95.7%, 85.6% and 83.0%'), ('5.2% (step', '5.2% utilisation'), ('= 400', '100 × 4 = 400'), ('2 x (32 - 8) = 48', '2 × (32 − 8) = 48')]:
    need(frag in rc, f'recompute.py no longer prints {frag!r}')
    need(prose in vis, f'prose missing {prose!r}')
# olmo/recompute.py -> prose
for frag, prose in [('ratio 6.21', '36 ÷ 5.8 ≈ 6.2'), ('GPU-hours 1376256', '1,376,256 GPU-hours'), ('GPU-hours 112896', '112,896 GPU-hours'),
                    ('Math 12.7 -> 41.7', 'from 12.7 to 41.7')]:
    need(frag in ol, f'olmo/recompute.py no longer prints {frag!r}')
    need(prose in vis, f'prose missing {prose!r}')
# data parts -> prose
d = (SRC / 'parts' / '40_js_ol_0data.js').read_text()
ck = dict(json.loads('[' + re.search(r'window\.CKN=\[(.*?)\];', d, flags=re.S).group(1) + ']'))
need(ck.get('Olmo 3 32B Base') == 718 and '718 checkpoint branches' in vis, 'Olmo 3 32B checkpoint count')
need('655 from pretraining, 49 from midtraining, 14 from long-context' in vis and 655 + 49 + 14 == 718, '718 split')
aa = (SRC / 'parts' / '14_js_aa_0data.js').read_text()
for name, v in [('MiMo-V2.6-Pro', '46.3'), ('Step 5 Preview', '43.7'), ('K2 Horizon', '30.5')]:
    need(re.search(re.escape(name) + r'[^\]]*?, ' + re.escape(v), aa) is not None, f'AA data {name} {v}')
    need(v in vis, f'prose AA {v}')
cmp = (SRC / 'parts' / '15_js_cmp_0data.js').read_text()
for lab, aav in [('xm', '46.3'), ('sf', '43.7'), ('ifm', '30.5'), ('ai2', '7.1')]:
    m = re.search(r"\{id:'" + lab + r"'.*?aa:([\d.]+|null)", cmp)
    need(m and m.group(1) == aav, f'Compare labs AA for {lab}: {m.group(1) if m else None} != {aav}')
print('\n'.join(bad) if bad else 'check_data: all prose numbers match recompute and data parts')
sys.exit(1 if bad else 0)
