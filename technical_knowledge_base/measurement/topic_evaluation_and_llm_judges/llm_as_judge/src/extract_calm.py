"""Extract CALM (Ye et al., arXiv 2410.02736) Table 4 from the arXiv HTML into inputs/calm_table4.tsv.
Usage: python3 src/extract_calm.py path/to/2410.02736.html   (https://arxiv.org/html/2410.02736)"""
import re, html, sys, os
t = open(sys.argv[1], errors='ignore').read()
i = t.find('Table 4:'); j = t.find('</table>', i)
s = re.sub(r'(?s)<math[^>]*>.*?</math>', ' ', t[i:j])
cells = [html.unescape(re.sub(r'<[^>]+>', ' ', c)).strip() for c in re.findall(r'(?s)<t[dh][^>]*>(.*?)</t[dh]>', s)]
cells = [re.sub(r'\s+', ' ', c) for c in cells]
cols = ['Ver.', 'Fal.', 'Sen.', 'CR_FR', 'Pos.', 'Com.', 'Ban.', 'Aut.', 'Dst.', 'Div.', 'CR_AL', 'CoT']
rows = []
for k, c in enumerate(cells):
    if c in ('ChatGPT', 'GPT-4-Turbo', 'GPT-4o', 'GLM-4', 'Claude-3.5', 'Qwen2'):
        vals = cells[k + 1:k + 13]
        assert all(re.fullmatch(r'0\.\d{3}', v) for v in vals), vals
        rows.append([c] + vals)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'calm_table4.tsv')
with open(out, 'w') as f:
    f.write('# CALM (arXiv 2410.02736v2) Table 4: robustness rate (RR) per bias; CR = consistency rate with nothing changed; CoT = accuracy. Columns: Ver. Fal. Sen. on fact-related data, Pos. Com. Ban. Aut. Dst. Div. on alignment data.\n')
    f.write('model\t' + '\t'.join(cols) + '\n')
    for r in rows: f.write('\t'.join(r) + '\n')
print(open(out).read())
