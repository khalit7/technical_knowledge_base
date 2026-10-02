"""Parse the arXiv HTML table extracts (inputs/table_*.txt, written by extract_paper.py) into tables.json.
Cells are kept as the printed strings; only LaTeX markup is turned into plain text. usage: python3 mk_tables.py"""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
def clean(c):
    c = c.strip()
    c = c.replace('$\\pm$', '±').replace('$\\dagger$', '†').replace('$\\uparrow$', '↑').replace('$\\downarrow$', '↓')
    c = re.sub(r'\\text\{([^}]*)\}\^\{\\text\{([^}]*)\}\}', r'\1\2', c)          # Adapter^H -> AdapterH
    c = re.sub(r'\\text\{([^}]*)\}_\{\\text\{([^}]*)\}\}', r'\1-\2', c)          # RoB_base -> RoB-base
    c = re.sub(r'\\textbf\{([^}]*)\}\^\{\\textbf\{([^}]*)\}\}', r'\1\2', c)
    c = re.sub(r'([A-Za-z])_\{([^}]*)\}', r'\1\2', c)                            # W_{q} -> Wq
    c = c.replace('\\pm', '±').replace('\\|', '‖').replace('||', '‖').replace('\\top', 'T').replace('\\Delta ', 'Δ').replace('\\Delta', 'Δ')
    c = c.replace('$', '').replace('\\', '')
    return re.sub(r'\s+', ' ', c).strip()
def rows(tid):
    s = open(os.path.join(HERE, 'inputs', 'table_%s.txt' % tid.replace('.', '_'))).read()
    body = s.split('\n\n', 1)[1]
    cap = re.search(r'(Table \d+:.*)', body, re.S)
    caption = clean(cap.group(1)) if cap else ''
    if cap: body = body[:cap.start()]
    R = []
    for blk in re.split(r'\n\s*\n', body):
        cells = [clean(x) for x in blk.split('\t\n')]
        cells = [x for x in cells if x != '' or False]
        if cells: R.append(cells)
    return {'id': tid, 'url': 'https://arxiv.org/html/2106.09685v2#' + tid, 'caption': caption, 'rows': R}
IDS = ['S3.T1', 'S5.T2', 'S5.T3', 'S5.T4', 'S7.T5', 'S7.T6', 'S7.T7', 'A1.T8', 'A6.T13', 'A6.T15', 'A6.T16', 'A8.T18', 'A4.T12']
T = {tid: rows(tid) for tid in IDS}
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
for tid in IDS:
    print(tid, len(T[tid]['rows']), T[tid]['rows'][:3])
