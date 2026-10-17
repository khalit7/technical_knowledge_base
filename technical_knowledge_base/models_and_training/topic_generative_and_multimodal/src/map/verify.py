"""Check that the built page embeds exactly the recorded Model map data and that every number written in the tab's
prose and captions matches that data. Usage: python3 -I verify.py  (exit 1 on any mismatch)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__)); P = os.path.join(HERE, '..', 'parts')
D = json.load(open(os.path.join(HERE, 'out', 'mm_data.json')))
page = open(os.path.join(HERE, '..', '..', 'index.html'), encoding='utf-8').read()
m = re.search(r'window\.MM_DATA=(\{.*?\});\n', page)
bad = []
if not m or json.loads(m.group(1)) != D: bad.append('page data differs from out/mm_data.json')
S = {s['id']: s for s in D['stack']}; V = {v['id']: v for v in D['vstack']}; R = {r['id']: r for r in D['rows']}
cap = open(os.path.join(P, '36_js_mm_3stack.js')).read() + open(os.path.join(P, '36_tab_map_b.html')).read() + open(os.path.join(P, '36_tab_map_c.html')).read()
def chk(cond, msg):
    if not cond: bad.append(msg)
chk(round(S['sd15']['teP'] / 1e6) == 123 and '123M text encoder' in cap, 'SD1.5 text encoder 123M')
chk(2.8 <= S['sdxl']['denP'] / S['sd15']['denP'] <= 3.2 and 'U-Net triples' in cap, 'SDXL U-Net triples')
chk(S['sdxl']['sf'] == 0.13025 and S['sd15']['sf'] == 0.18215 and '0.13025 instead of 0.18215' in cap, 'scaling factors')
chk(S['pixs']['tok1024'] == 4096 and '4,096 tokens' in cap, 'PixArt 4096 tokens')
chk(7.5 <= S['pixs']['teP'] / S['pixs']['denP'] <= 8.5 and 'about eight times larger' in cap, 'T5 vs DiT ratio')
chk(S['sana']['tok1024'] == 1024 and S['sana']['down'] == 32 and S['sana']['ch'] == 32 and '1,024 tokens' in cap, 'Sana 1024 tokens')
chk(round(S['qimg']['denP'] / 1e9) == 20 and 28.5 <= S['qimg']['tot'] / 1e9 < 29 and round(2 * S['qimg']['tot'] / 1e9) == 58 and 'Nearly 29B' in cap and '58 GB' in cap, 'Qwen-Image totals')
chk(round(S['zimg']['denP'] / 1e9) == 6 and 'Back down to 6B' in cap, 'Z-Image 6B')
chk(round(2 * S['sd15']['tot'] / 1e9, 1) == 2.1, 'SD1.5 bf16 2.1 GB')
chk(V['llava']['tok'] == 576 and '576 patch features' in cap, 'LLaVA 576')
chk(V['qwen2vl']['tok'] == 256 and 'A 448 px square is 256 tokens' in cap, 'Qwen2-VL 256')
chk(V['smolvlm']['tok'] == 81 and '81 tokens instead of 729' in cap and (384 // 14) ** 2 == 729, 'SmolVLM 81/729')
chk(V['gemma4']['tok'] == 280 and V['gemma4u']['tok'] == 280 and '280 soft tokens' in cap, 'Gemma 4 280')
for rid, s in [('sd35l', 'US$1M'), ('flux3k', 'US$5M'), ('ltx2', 'US$10M'), ('llama4', '700 million'), ('cogvx', '1 million visits'), ('hdit', 'excludes the EU')]:
    chk(s in R[rid]['lic'] and s.replace('excludes the EU', 'European Union').split()[0] in cap, 'licence claim ' + rid)
for rid in ['flux1d', 'flux2d', 'qimg21', 'ideo4', 'musicgen', 'f5', 'xtts']: chk(R[rid]['acc'] == 'nc', 'nc ' + rid)
chk(R['qimg']['acc'] == 'osi' and R['flux2k']['acc'] == 'osi' and R['gemma4']['acc'] == 'osi' and R['dinov2']['acc'] == 'osi' and R['dinov3']['acc'] == 'restr', 'same family different licence')
print('checked; problems:', bad or 'none'); sys.exit(1 if bad else 0)
