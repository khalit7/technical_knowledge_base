"""Transcribe the paper's tables into tables.json, by script, from the arXiv HTML extracts in inputs/
(table_v2_*.txt for the Nature version, arXiv v2; table_v1_*.txt for the January 2025 version). Bold cells (the
captions say bold marks a t-test with p < 0.01) are read from the HTML by mk_tables.py --bold <v2 html> once and kept
in inputs/bold_v2.json. Printed precision is kept as text and as a number.
usage: python3 mk_tables.py   (build.sh runs it)"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')


def cells(name):
    s = open(os.path.join(INP, name + '.txt'), encoding='utf-8').read().split('\n', 2)[2]
    return [c.strip() for c in s.split('\n') if c.strip()]


def num(v):
    v = v.replace('%', '').replace('$', '').replace('K', '').replace('+', '')
    try: return float(v)
    except ValueError: return None


def bench_table(name, ncol, cols, skip_header):
    """Rows of [benchmark, ncol values] with section names (English, Code, Math, Chinese) as groups."""
    c = cells(name)
    c = [x for x in c if not x.startswith('Table ')]
    c = c[skip_header:]
    rows, group, i = [], None, 0
    while i < len(c):
        if c[i] in ('English', 'Code', 'Math', 'Chinese'):
            group = c[i]; i += 1; continue
        if c[i] in ('Architecture', '# Activated Params', '# Total Params'):
            i += ncol + 1; continue
        b = c[i]; vals = c[i + 1:i + 1 + ncol]; i += 1 + ncol
        m = re.match(r'(.*?) \((.*)\)$', b)
        rows.append({'group': group, 'bench': m.group(1) if m else b, 'metric': m.group(2) if m else '', 'v': vals, 'n': [num(x) for x in vals]})
    return {'cols': cols, 'rows': rows}


T = {}
T['t3'] = bench_table('table_v2_S3_T3', 5, ['R1-Zero', 'R1-Dev1', 'R1-Dev2', 'R1-Dev3', 'R1'], 6)
T['t8'] = bench_table('table_v2_A4_T8', 6, ['Claude-3.5-Sonnet-1022', 'GPT-4o-0513', 'DeepSeek-V3', 'OpenAI-o1-mini', 'OpenAI-o1-1217', 'DeepSeek-R1'], 13)
T['t12'] = bench_table('table_v2_A5_T12', 4, ['V3-Base', 'V3', 'R1-Zero', 'R1'], 5)
T['v1t4'] = bench_table('table_v1_S3_T4', 6, ['Claude-3.5-Sonnet-1022', 'GPT-4o-0513', 'DeepSeek-V3', 'OpenAI-o1-mini', 'OpenAI-o1-1217', 'DeepSeek-R1'], 13)


def model_rows(name, ncol, first_model_prefixes):
    c = [x for x in cells(name) if not x.startswith('Table ')]
    i = 0
    while not any(c[i].startswith(p) for p in first_model_prefixes): i += 1
    rows = []
    while i + ncol < len(c) + 1 and i < len(c):
        vals = c[i + 1:i + 1 + ncol]
        if len(vals) < ncol: break
        rows.append({'model': c[i], 'v': vals, 'n': [num(x) for x in vals]}); i += 1 + ncol
    return rows


dcols = ['AIME 2024 pass@1', 'AIME 2024 cons@64', 'MATH-500 pass@1', 'GPQA Diamond pass@1', 'LiveCodeBench pass@1', 'Codeforces rating']
T['t15'] = {'cols': dcols, 'rows': model_rows('table_v2_A6_T15', 6, ['GPT-4o'])}
T['v1t5'] = {'cols': dcols, 'rows': model_rows('table_v1_S3_T5', 6, ['GPT-4o'])}
T['t16'] = {'cols': dcols[:5], 'rows': model_rows('table_v2_A6_T16', 5, ['QwQ'])}
T['v1t6'] = {'cols': dcols[:5], 'rows': model_rows('table_v1_S4_T6', 5, ['QwQ'])}
T['v1t2'] = {'cols': dcols, 'rows': model_rows('table_v1_S2_T2', 6, ['OpenAI-o1-mini'])}
T['t13'] = {'cols': ['AMC 12 2024', 'AIME 2025', 'USAMO index'], 'rows': model_rows('table_v2_A5_T13', 3, ['Human'])}
T['t17'] = {'cols': ['AIME 2024', 'AIME 2025'], 'rows': model_rows('table_v2_A6_T17', 2, ['GPT-4o'])}
# Table 14: LiveCodeBench by difficulty and stage
c = cells('table_v2_A5_T14')
i = c.index('Easy')
T['t14'] = {'cols': ['R1-Zero', 'R1-Dev1', 'R1-Dev2', 'R1-Dev3', 'R1'], 'rows': [{'model': c[j], 'v': c[j + 1:j + 6], 'n': [num(x) for x in c[j + 1:j + 6]]} for j in (i, i + 6, i + 12)]}
# Table 4: RL data
c = cells('table_v2_A2_T4')
i = c.index('Math')
T['t4'] = {'cols': ['# Prompts', 'Question type', 'Output type'], 'rows': [{'model': c[j], 'v': c[j + 1:j + 4], 'n': [num(c[j + 1]), None, None]} for j in range(i, i + 20, 4)]}
# Table 5: SFT data statistics
c = cells('table_v2_A2_T5')
i = c.index('Math')
T['t5'] = {'cols': ['Samples', 'Avg rounds', 'Avg tokens'], 'rows': [{'model': c[j], 'v': c[j + 1:j + 4], 'n': [num(x) for x in c[j + 1:j + 4]]} for j in range(i, i + 24, 4)]}
# Table 6: distilled models
c = cells('table_v2_A2_T6')
rows = []
for j, x in enumerate(c):
    if x.startswith('DeepSeek-R1-Distill'):
        lr = re.search(r'(\d+)\\times 10\^\{-(\d+)\}', c[j + 2])
        rows.append({'model': x, 'v': [c[j + 1], '%s×10⁻%s' % (lr.group(1), lr.group(2))], 'n': [None, int(lr.group(1)) * 10 ** -int(lr.group(2))]})
T['t6'] = {'cols': ['Base model', 'Initial learning rate'], 'rows': rows}
# Table 7: cost
c = cells('table_v2_A2_T7')
i = c.index('in H800 GPU Hours')
T['t7'] = {'cols': ['DeepSeek-R1-Zero', 'SFT data creation', 'DeepSeek-R1', 'Total'], 'rows': [{'model': 'H800 GPU hours', 'v': c[i + 1:i + 5], 'n': [num(x) * 1000 for x in c[i + 1:i + 5]]}, {'model': 'USD at $2 per GPU hour', 'v': c[i + 6:i + 10], 'n': [num(x) * 1000 for x in c[i + 6:i + 10]]}]}
# safety: Tables 9 to 11 (numbers in parentheses: the model alone, without DeepSeek's risk control system)
c = [x for x in cells('table_v2_A4_T9') if not x.startswith('Table ')]
i = c.index('Claude-3.7-Sonnet')
rows = []
while i < len(c):
    rows.append({'model': c[i], 'v': c[i + 1:i + 8]}); i += 8
T['t9'] = {'cols': ['SST', 'BBQ', 'ART', 'XSTest', 'DNA*', 'HarmBench*', 'Average'], 'rows': rows}
c = [x for x in cells('table_v2_A4_T10') if not x.startswith('Table ')]
i = c.index('Claude-3.7-Sonnet')
rows = []
while i < len(c):
    rows.append({'model': c[i], 'v': c[i + 1:i + 11], 'n': [num(x) for x in c[i + 1:i + 11]]}); i += 11
T['t10'] = {'cols': ['Discrimination unsafe', 'Discrimination rejected', 'Illegal unsafe', 'Illegal rejected', 'Harmful unsafe', 'Harmful rejected', 'Ethical unsafe', 'Ethical rejected', 'Overall unsafe', 'Overall rejected'], 'rows': rows}
c = [x for x in cells('table_v2_A4_T11') if not x.startswith('Table ')]
i = c.index('Claude-3.7-Sonnet')
rows = []
while i < len(c):
    rows.append({'model': c[i], 'v': c[i + 1:i + 7], 'n': [num(x) for x in c[i + 1:i + 7]]}); i += 7
T['t11'] = {'cols': ['Unsafe, original', 'Unsafe, jailbreak', 'Unsafe gap', 'Rejected, original', 'Rejected, jailbreak', 'Rejected gap'], 'rows': rows}

# bold cells (significance marks) from the v2 HTML
BP = os.path.join(INP, 'bold_v2.json')
if len(sys.argv) > 2 and sys.argv[1] == '--bold':
    s = open(sys.argv[2], encoding='utf-8').read()
    out = {}
    for tid, key in (('S3.T3', 't3'), ('A4.T8', 't8'), ('A5.T12', 't12'), ('A6.T15', 't15')):
        seg = re.search(r'<figure[^>]*id="' + re.escape(tid) + r'".*?</figure>', s, re.S).group(0)
        rows = re.findall(r'<tr.*?</tr>', seg, re.S)
        marks = []
        for r in rows:
            tds = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', r, re.S)
            cs = [(('ltx_font_bold' in td), re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', '', td)).strip()) for td in tds]
            cs = [c for c in cs if c[1] not in ('', 'English', 'Code', 'Math', 'Chinese')]
            marks.append(cs)
        out[key] = marks
    json.dump(out, open(BP, 'w'))
B = json.load(open(BP)) if os.path.exists(BP) else {}
for key, tb in T.items():
    if key not in B: continue
    for row in tb['rows']:
        name = row.get('bench') or row.get('model')
        for cs in B[key]:
            if cs and cs[0][1].startswith(name) and len(cs) == len(row['v']) + 1:
                row['bold'] = [c[0] for c in cs[1:]]
                break
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables', len(T), ' '.join('%s:%d' % (k, len(v['rows'])) for k, v in T.items()))
