"""Check the synthetic arithmetic sets released in github.com/openai/gpt-3/data against §3.9.1.
usage: python3 check_released_data.py   (downloads three files, about 300 KB; writes inputs/released_data_checks.json)"""
import json, re, urllib.request, collections
U = 'https://raw.githubusercontent.com/openai/gpt-3/master/data/%s.jsonl'
out = {}
for f in ['two_digit_addition', 'three_digit_addition', 'single_digit_three_ops']:
    L = [json.loads(l) for l in urllib.request.urlopen(U % f).read().decode().splitlines() if l.strip()]
    q = [re.search(r'What is (.*)\?', l['context']).group(1) for l in L]
    ev = lambda s: eval(s.replace(' plus ', '+').replace(' minus ', '-').replace(' times ', '*'))
    o = {'url': U % f, 'n': len(L), 'answers_correct': sum(1 for s, l in zip(q, L) if ev(s) == int(l['completion'])), 'first3': [l['context'].strip() + l['completion'] for l in L[:3]]}
    if f == 'single_digit_three_ops':
        o['parens_first_two'] = sum(1 for s in q if re.fullmatch(r'\(\d [-+*] \d\) [-+*] \d', s))
        o['parens_last_two'] = sum(1 for s in q if re.fullmatch(r'\d [-+*] \(\d [-+*] \d\)', s))
    if f == 'three_digit_addition':
        o['first_operand_digits'] = dict(collections.Counter(len(re.match(r'(\d+)', s).group(1)) for s in q))
    out[f] = o
json.dump(out, open('inputs/released_data_checks.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
