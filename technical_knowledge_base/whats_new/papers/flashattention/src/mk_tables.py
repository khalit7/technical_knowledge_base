"""Build tables.json from the arXiv HTML v2 extracts in inputs/ (made by extract_paper.py).
Cells keep the paper's printed text and precision; numbers are parsed alongside as v.
Tables 5 and 6 share one figure element (S4.T6) in the HTML, so both are read from inputs/paper_v2.txt.
usage: python3 mk_tables.py"""
import json, re

def cells_of(text):
    # caption = the first paragraph (joined); cells = every piece ending in a tab
    text = '\n'.join(l for l in text.split('\n') if not l.startswith('Source:'))
    parts = re.split(r'\n\s*\n', text.strip(), maxsplit=1)
    cap = ' '.join(parts[0].split())
    cells = [' '.join(c.split()) for c in parts[1].split('\t')] if len(parts) > 1 else []
    return [cap] + [c for c in cells if c]

def num(c):
    c = c.replace('$\\times$', '').replace('$\\pm$', '±').strip()
    m = re.match(r'^-?\d+(\.\d+)?', c)
    return float(m.group(0)) if m else None

def grid(cells, ncols, start):
    hdr = cells[start:start + ncols]
    body = cells[start + ncols:]
    rows = [body[i:i + ncols] for i in range(0, len(body), ncols)]
    assert all(len(r) == ncols for r in rows), (hdr, rows[-1])
    return hdr, rows

def clean(c):
    return c.replace(' $\\times$ ', '×').replace('$\\times$ ', '×').replace(' $\\times$', '×').replace('$\\times$', '×').replace(' $\\pm$ ', ' ± ').replace('$F_{1}$', 'F1').replace('$', '')

T = {}
def add(key, anchor, ncols, cells, caption_idx=0, note=None):
    cap = clean(cells[caption_idx])
    hdr, rows = grid(cells, ncols, caption_idx + 1)
    T[key] = {'anchor': anchor, 'caption': cap, 'header': [clean(h) for h in hdr],
              'rows': [[clean(c) for c in r] for r in rows]}
    if note: T[key]['note'] = note

rd = lambda f: open('inputs/' + f).read()
add('t1', 'S4.T1', 2, cells_of(rd('table_S4_T1.txt')))
add('t2', 'S4.T2', 3, cells_of(rd('table_S4_T2.txt')))
add('t3', 'S4.T3', 8, cells_of(rd('table_S4_T3.txt')))
add('t4', 'S4.T4', 4, cells_of(rd('table_S4_T4.txt')))
add('t7', 'A5.T7', 4, cells_of(rd('table_A5_T7.txt')))

# Tables 5 and 6 from the paper text (one HTML figure holds both)
P = rd('paper_v2.txt')
a = P.index('Table 5: Long Document performance'); b = P.index('Table 6: We report the first'); c = P.index('The Path-X and Path-256 benchmarks', b)
c5 = cells_of(P[a:b]); T['t5'] = {'anchor': 'S4.T6', 'caption': clean(c5[0]), 'header': ['Dataset'] + c5[1:7],
    'rows': [c5[7:14], c5[14:21]]}
c6 = cells_of(P[b:c])[:-1]; h6, r6 = grid(c6, 3, 1)
T['t6'] = {'anchor': 'S4.T6', 'caption': clean(c6[0]), 'header': h6, 'rows': r6}
# Figure 2 left: a table printed inside the figure
a = P.index('Attention\t\nStandard'); f2 = cells_of(P[a:P.index('Figure 2:', a)])
T['f2'] = {'anchor': 'S3.F2', 'caption': 'Figure 2 left: forward + backward of standard attention and FlashAttention for GPT-2 medium (seq. length 1024, head dim. 64, 16 heads, batch size 64) on A100 GPU.',
           'header': ['Attention', 'Standard', 'FlashAttention'], 'rows': [f2[1:4], f2[4:7], f2[7:10]]}

# Appendix Tables 9 to 21: runtime (ms) and memory (MB) by sequence length
cfg = {9: ('fwd', 1, 1), 10: ('bwd', 1, 1), 11: ('both', 1, 1), 12: ('fwd', 0, 1), 13: ('bwd', 0, 1), 14: ('both', 0, 1),
       15: ('fwd', 1, 0), 16: ('bwd', 1, 0), 17: ('both', 1, 0), 18: ('fwd', 0, 0), 19: ('bwd', 0, 0), 20: ('both', 0, 0), 21: ('mem', 0, 0)}
bench = {}
for n, (ps, dr, mk) in cfg.items():
    cs = cells_of(rd('table_A5_T%d.txt' % n))
    hdr, rows = grid(cs, 11, 1)
    bench[str(n)] = {'anchor': 'A5.T%d' % n, 'pass': ps, 'dropout': dr, 'masking': mk, 'caption': clean(cs[0]),
                     'N': [int(h) for h in hdr[1:]], 'rows': {r[0]: [None if x == '-' else float(x) for x in r[1:]] for r in rows}}
T['bench'] = bench
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
print('tables:', ', '.join(k for k in T if k != 'bench'), '+ bench', ', '.join(bench))
