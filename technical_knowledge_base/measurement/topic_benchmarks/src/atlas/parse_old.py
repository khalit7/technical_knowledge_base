"""Parse the old Notion page's master table (../live.md) into inputs/old_table.json, verbatim cells."""
import json, re, pathlib
here = pathlib.Path(__file__).parent
t = (here.parent / 'live.md').read_text()
start = t.index('## Master table'); end = t.index('</table>', start)
rows = re.findall(r'<tr>(.*?)</tr>', t[start:end], re.S)
out = []
for r in rows:
    cells = [re.sub(r'\s+', ' ', c).strip() for c in re.findall(r'<td>(.*?)</td>', r, re.S)]
    out.append(cells)
hdr, body = out[0], out[1:]
data = [dict(zip(['name', 'year', 'measures', 'format', 'status'], c)) for c in body]
(here / 'inputs' / 'old_table.json').write_text(json.dumps({'source': 'Notion 3c65c17b0d0d811fb43fece56e40041a, fetched to src/live.md', 'header': hdr, 'rows': data}, indent=1, ensure_ascii=False))
print(len(data)); [print(i, d['name']) for i, d in enumerate(data)]
