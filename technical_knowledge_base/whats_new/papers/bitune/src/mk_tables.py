"""Turn inputs/tables_raw.json (every arXiv v2 table, cells as printed) into tables.json:
for each table the anchor, caption, column names and rows {model, method, vals (strings as printed)}."""
import json, re
R = json.load(open('inputs/tables_raw.json'))
MODELS = ['Gemma-2B', 'Gemma-7B', 'Llama2-7B', 'Llama3-8B', 'Phi-2', 'Codestral-22B']
WANT = {'S3.T1': 'Table 1', 'S3.T2': 'Table 2', 'S3.T3': 'Table 3', 'S3.T4': 'Table 4', 'S3.T5': 'Table 5', 'S3.T6': 'Table 6',
        'S3.T7': 'Table 7', 'S3.T8': 'Table 8', 'A1.T14': 'Table 14', 'A1.T15': 'Table 15', 'A1.T16': 'Table 16',
        'A1.T17': 'Table 17', 'A1.T21': 'Table 21', 'A1.T22': 'Table 22', 'A1.T23': 'Table 23', 'A1.T24': 'Table 24', 'A1.T25': 'Table 25'}
out = {}
for tid, name in WANT.items():
    t = R[tid]; rows = [r for r in t['rows'] if any(c for c in r)]
    std = tid in ('A1.T21', 'A1.T22', 'A1.T23', 'A1.T24', 'A1.T25')
    head = [c for c in rows[0] if c]
    if head and head[0] in ('Method', 'Model'): head = head[1:]
    if head and head[0] in ('Attention Mask', 'Init. Value'): head = head[1:]
    body, model = [], None
    for r in rows[1:]:
        cells = [c for c in r]
        if cells[0] in ('Model', '') and not any(re.match(r'^-?\d', c) for c in cells): continue
        if std and cells[:2] == ['', ''] and 'mean' in cells: continue
        if cells[0] in MODELS:
            model = cells[0]; cells = cells[1:]
            if not any(c for c in cells): continue
        cells = [c for c in cells]
        while cells and cells[-1] == '' and len(cells) > 1: cells.pop()
        meth = re.sub(r'\{\}_\{\\text\{([^}]*)\}\}', lambda m: ('16' if m.group(1) == '16' else ' (' + m.group(1) + ')'), cells[0]).strip()
        body.append({'model': model, 'method': meth, 'vals': cells[1:]})
    out[name] = {'anchor': tid, 'caption': t['caption'] or name, 'cols': head, 'std': std, 'rows': body}
json.dump(out, open('tables.json', 'w'), indent=1, ensure_ascii=False)
for k, v in out.items(): print(k, v['cols'], len(v['rows']), v['rows'][0], v['rows'][-1])
