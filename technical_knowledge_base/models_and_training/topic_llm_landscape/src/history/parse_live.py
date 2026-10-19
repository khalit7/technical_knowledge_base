"""The old Notion table of the LLM release history page, against the dataset.

live_rows.json is the parse of that page's 140-row table (fetched 2026-10-01T10:24:22Z) before the page
became HTML-only and was folded into the Release history tab of Topic: llms. With a copy of the fetch saved
as live.md beside this script, it re-parses it; otherwise it uses live_rows.json. It then diffs every field
against ../data/release_history.json. The only differences expected are the five corrections (rows with `fix`).
Run from anywhere: python3 src/history/parse_live.py
"""
import re, json, os
H = os.path.dirname(os.path.abspath(__file__))
LIVE, ROWS = os.path.join(H, 'live.md'), os.path.join(H, 'live_rows.json')
if os.path.exists(LIVE):
    s = open(LIVE).read()
    out = []
    for r in re.findall(r'<tr>\s*(.*?)\s*</tr>', s, re.S)[1:]:
        c = re.findall(r'<td>(.*?)</td>', r, re.S)
        m = re.match(r'(.*) \[source\]\((.*)\)$', c[5])
        out.append(dict(date=c[0], model=c[1], lab=c[2], weights=c[3], size=c[4], note=m.group(1), url=m.group(2)))
    json.dump(out, open(ROWS, 'w'), indent=0, ensure_ascii=False)
else:
    out = json.load(open(ROWS))
J = json.load(open(os.path.join(H, '..', 'data', 'release_history.json')))['rows']
print('live rows', len(out), 'dataset rows', len(J))
def fmtsz(x):
    t, a = x['total_params_B'], x['active_params_B']
    if t is None: return 'not disclosed' if not x['open_weights'] else 'n/a'
    f = lambda v: (('%g' % (v / 1000)) + 'T') if v >= 1000 else '%g' % v
    return f(t) if (a is None or a == t) else f(t) + ' / ' + f(a)
n = 0
for L, x in zip(out, J):
    w = 'open (' + (x['licence'] or '') + ')' if x['open_weights'] else 'closed'
    for k, v in [('date', x['date']), ('model', x['model']), ('lab', x['lab']), ('weights', w), ('size', fmtsz(x)), ('note', x['note']), ('url', x['source_url'])]:
        lv = L[k].replace('\\$', '$')
        if lv != v:
            n += 1
            print(('corrected ' if x.get('fix') else 'DIFF      ') + x['model'], k, repr(lv), '->', repr(v))
print(n, 'field differences')
