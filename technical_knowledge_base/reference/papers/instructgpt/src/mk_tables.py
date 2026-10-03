"""Transcribe the paper's tables from the arXiv HTML extracts (inputs/table_*.txt) into tables.json.
Numbers are kept as printed strings. Table numbering follows the paper (the HTML anchor S3.T2 holds Tables 1 and 2).
  python3 mk_tables.py"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
tok = lambda f: [x.strip() for x in re.split(r'[\n\t]+', open(os.path.join(HERE, 'inputs', f)).read()) if x.strip()]
T = {}
# Table 1: use-case categories (RM dataset, labeled by contractors)
t = tok('table_S3_T2.txt'); i = t.index('(%)')
rows = []
j = i + 1
while j + 1 < len(t) and t[j + 1].endswith('%'):
    rows.append([t[j], t[j + 1]]); j += 2
T['t1'] = {'at': 'S3.T2', 'title': 'Table 1: Distribution of use case categories from our API prompt dataset', 'cols': ['Use-case', '(%)'], 'rows': rows}
# Table 6: dataset sizes (number of prompts)
t = tok('table_A1_T6.txt'); k = t.index('size', t.index('size', t.index('size') + 1) + 1) + 1
cells = t[k:]
sft, rm, ppo = [], [], []
# printed row by row: SFT(split, source, size) RM(...) PPO(...); PPO has only two rows
r = 0
while cells:
    for dst in (sft, rm) + ((ppo,) if r < 2 else ()):
        dst.append(cells[:3]); cells = cells[3:]
    r += 1
T['t6'] = {'at': 'A1.T6', 'title': 'Table 6: Dataset sizes, in terms of number of prompts', 'SFT': sft, 'RM': rm, 'PPO': ppo}
# Table 7: dataset annotations (columns RM test, RM train, RM valid, SFT train, SFT valid)
t = tok('table_A1_T7.txt'); k = t.index('valid', t.index('valid') + 1) + 1
names = ['Ambiguous', 'Sensitive content', 'Identity dependent', 'Closed domain', 'Continuation style', 'Requests opinionated content', 'Requests advice',
         'Requests moral judgment', 'Contains explicit safety constraints', 'Contains other explicit constraints', 'Intent unclear']
rows = []; cells = t[k:]
for n in names:
    a = cells.index(n); nxt = [cells.index(m) for m in names if m in cells and cells.index(m) > a]
    b = min(nxt) if nxt else len(cells); rows.append([n] + cells[a + 1:b])
T['t7'] = {'at': 'A1.T7', 'title': 'Table 7: Dataset annotations', 'cols': ['Annotation', 'RM test', 'RM train', 'RM valid', 'SFT train', 'SFT valid'], 'rows': rows,
           'note': 'Requests advice prints 1 value and Intent unclear 1 value; the others print dashes where not collected (as printed).'}
# Table 8: prompts per customer
t = tok('table_A1_T8.txt'); k = t.index('Prompts per customer') + 1
T['t8'] = {'at': 'A1.T8', 'title': 'Table 8: Average prompts per customer', 'cols': ['Model', 'Split', 'Prompts per customer'], 'rows': [t[k + i:k + i + 3] for i in range(0, len(t) - k, 3)]}
# Table 9: prompt lengths by dataset
t = tok('table_A1_T9.txt'); k = t.index('Max') + 1; c = t[k:]; rows = []; cur = None
while c:
    if c[0] in ('SFT', 'RM', 'PPO', '–'): cur = c[0]; c = c[1:]
    rows.append([cur] + c[:9]); c = c[9:]
T['t9'] = {'at': 'A1.T9', 'title': 'Table 9: Prompt lengths by dataset (tokens)', 'cols': ['Model', 'Split', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'], 'rows': rows}
# Table 10: prompt lengths by category
t = tok('table_A1_T10.txt'); k = t.index('Max') + 1; c = t[k:]
T['t10'] = {'at': 'A1.T10', 'title': 'Table 10: Prompt lengths by category (tokens)', 'cols': ['Category', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'], 'rows': [c[i:i + 9] for i in range(0, len(c), 9)]}
# Table 11: prompt and demonstration lengths
t = tok('table_A1_T11.txt'); k = t.index('Max') + 1; c = t[k:]
T['t11'] = {'at': 'A1.T11', 'title': 'Table 11: Prompt and demonstration lengths (tokens)', 'cols': ['Prompt source', 'Measurement', 'Count', 'Mean', 'Std', 'Min', '25%', '50%', '75%', 'Max'], 'rows': [c[i:i + 10] for i in range(0, len(c), 10)]}
# Table 12: labeler demographics; Table 13: satisfaction survey (question, then answer/percentage pairs)
def qa(f, qs):
    t = tok(f); out = []
    for q in qs:
        a = t.index(q); nxt = [t.index(m) for m in qs if t.index(m) > a]; b = min(nxt) if nxt else len(t)
        out.append({'q': q, 'a': [t[i:i + 2] for i in range(a + 1, b, 2)]})
    return out
T['t12'] = {'at': 'A2.T12', 'title': 'Table 12: Labeler demographic data', 'qs': qa('table_A2_T12.txt', ['What gender do you identify as?', 'What ethnicities do you identify as?', 'What is your nationality?', 'What is your age?', 'What is your highest attained level of education?'])}
T['t13'] = {'at': 'A2.T13', 'title': 'Table 13: Labeler satisfaction survey', 'qs': qa('table_A2_T13.txt', ['It was clear from the instructions what I was supposed to do.', 'I found the task enjoyable and engaging.', 'I found the task repetitive.', 'I was paid fairly for doing the task.', "Overall, I’m glad I did this task."])}
# Table 14: automatic evaluations; 4 model types x 3 sizes (XL = 1.3B, 6b, 175b)
t = tok('table_A5_T14.txt'); k = t.index('175b', t.index('175b', t.index('175b', t.index('175b') + 1) + 1) + 1) + 1
c = t[k:]; rows = []; task = metric = None
num = re.compile(r'^-?\d+(\.\d+)?$')
while c:
    # a row is [task] [metric] prompt v1..v12
    lead = []
    while not num.match(c[0]): lead.append(c.pop(0))
    vals = [c.pop(0) for _ in range(12)]
    if len(lead) == 3: task, metric, prompt = lead
    elif len(lead) == 2 and lead[1] == 'ROUGE-L': task, metric, prompt = lead[0], lead[1], ''
    elif len(lead) == 2: metric, prompt = lead
    else: prompt = lead[0]
    rows.append({'task': task.replace('$\\rightarrow$', 'to'), 'metric': metric, 'prompt': prompt, 'v': vals})
T['t14'] = {'at': 'A5.T14', 'title': 'Table 14: Automatic evaluations', 'models': ['GPT', 'SFT', 'PPO', 'PPO-ptx'], 'sizes': ['1.3B', '6B', '175B'], 'rows': rows,
            'note': 'Columns as printed: GPT, SFT, PPO, PPO + ptx models, each at XL (1.3B), 6b and 175b.'}
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', {k: len(v.get('rows', v.get('qs', v.get('SFT', [])))) for k, v in T.items()})
