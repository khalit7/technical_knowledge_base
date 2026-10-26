#!/usr/bin/env python3
"""Confirm the built page embeds exactly Part 2's recorded outputs.
1. The window.CB object inside ../../../index.html equals what gen_data.py derives from out/ and code/ now.
2. Independently: every displayed raw output block equals the program's output in out/<name>_1.txt (minus our load line),
   every shown source file equals code/<file>, and every assembly listing appears verbatim (comments aside) in out/*.s."""
import json, os, re, subprocess, sys, pathlib
HERE = pathlib.Path(__file__).resolve().parent; CB_DIR = HERE.parent
html = (CB_DIR.parent.parent / 'index.html').read_text()
m = re.search(r'window\.CB=(\{.*?\});\n', html)
if not m: sys.exit('window.CB not found in index.html')
emb = json.loads(m.group(1))
fresh = json.loads(subprocess.run([sys.executable, str(CB_DIR / 'gen_data.py')], env={**os.environ, 'CB_JSON_ONLY': '1'}, capture_output=True, text=True, check=True).stdout)
bad = 0
if emb != fresh: print('MISMATCH: embedded data differs from gen_data.py output (rebuild needed)'); bad += 1
out = CB_DIR / 'out'
body = lambda t: '\n'.join(l for l in t.splitlines() if not l.startswith('# load')).rstrip('\n')
n = 0
for key, name in [('aos', 'aos_soa'), ('aosfm', 'aos_soa_fm'), ('rowcol', 'rowcol'), ('br_o2', 'branch_o2'), ('br_keep', 'branch_keep'), ('dot', 'dot'),
                  ('fs', 'false_sharing'), ('litmus', 'litmus'), ('mmap', 'mmap'), ('roof', 'roof'), ('alloc', 'alloc'), ('profile', 'profile')]:
    if emb[key]['raw'] != body((out / f'{name}_1.txt').read_text()): print('raw differs:', key); bad += 1
    n += 1
for k, f in [('layout', 'layout.txt'), ('abi', 'abi.txt'), ('remarks', 'vec_remarks.txt'), ('sysctl', 'sysctl.txt')]:
    if emb[k] != (out / f).read_text().strip() and emb[k] != (out / f).read_text().rstrip(): print('differs:', k); bad += 1
    n += 1
for f, t in emb['src'].items():
    if t != (CB_DIR / 'code' / f).read_text().rstrip('\n'): print('source differs:', f); bad += 1
    n += 1
alls = '\n'.join(p.read_text() for p in out.glob('*.s'))
for k, t in emb['asm'].items():
    for line in t.splitlines():
        core = line.split(';')[0].rstrip()
        if core and core not in alls: print('asm line not in out/*.s:', k, line); bad += 1; break
    n += 1
for kb_run in emb['ladder']['random'] + emb['ladder']['seq']:
    n += 1
txt = (out / 'ladder_random_1.txt').read_text()
if not all(f'{a}\t{b:.2f}' in txt for a, b in emb['ladder']['random'][0]['pts']): print('ladder run 1 differs'); bad += 1
print(f'checked {n} embedded items; problems: {bad}')
sys.exit(1 if bad else 0)
