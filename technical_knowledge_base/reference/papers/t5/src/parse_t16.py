"""Parse Table 16 (Appendix E, every score of every experiment) from inputs/paper_v4.txt into inputs/table16.json."""
import json, re
L = open('inputs/paper_v4.txt', encoding='utf-8').read().split('\n')
a = next(i for i, l in enumerate(L) if l.startswith('Appendix E Scores'))
b = next(i for i, l in enumerate(L) if l.startswith('References'))
toks = [l.strip() for l in L[a:b] if l.strip()]
COLS = ['GLUE', 'CoLA', 'SST-2', 'MRPC F1', 'MRPC Acc', 'STSB PCC', 'STSB SCC', 'QQP F1', 'QQP Acc', 'MNLIm', 'MNLImm', 'QNLI', 'GLUE RTE',
        'CNNDM R-1', 'CNNDM R-2', 'CNNDM R-L', 'SQuAD EM', 'SQuAD F1', 'SGLUE', 'BoolQ', 'CB F1', 'CB Acc', 'COPA', 'MultiRC F1', 'MultiRC EM',
        'ReCoRD F1', 'ReCoRD EM', 'SGLUE RTE', 'WiC', 'WSC', 'EnDe', 'EnFr', 'EnRo']
num = lambda t: re.fullmatch(r'\$\s*(?:\\mathbf\{)?([0-9.]+)\}?\s*\$', t)
rows = []; i = toks.index('BLEU', toks.index('Experiment')) + 3
while i < len(toks):
    if re.fullmatch(r'\d{1,2}', toks[i]) and i + 1 < len(toks) and not num(toks[i + 1]):
        name = toks[i + 1].replace('$\\bigstar\\,$', '').strip()
        vals = []; j = i + 2
        while len(vals) < 33 and j < len(toks) and num(toks[j]):
            vals.append(num(toks[j]).group(1)); j += 1
        if len(vals) == 33:
            rows.append({'table': int(toks[i]), 'name': name, 'v': vals}); i = j; continue
    i += 1
json.dump({'source': 'https://arxiv.org/html/1910.10683v4#A5', 'cols': COLS, 'rows': rows}, open('inputs/table16.json', 'w'), indent=0)
print(len(rows), 'rows'); [print(r['table'], r['name'], r['v'][0], r['v'][18]) for r in rows]
