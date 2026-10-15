"""Pick the Cosmopedia rows the page shows (fixed indices in the seeded samples of get_synth_samples.py).
usage: DC_SCRATCH=<scratch>/dc python -I cosmo_examples.py <out.json>"""
import os, sys, json, re, pyarrow.parquet as pq
S = os.path.join(os.environ['DC_SCRATCH'], 'data', 'syn', 'samples')
PICK = [('cosmo_web_v2', 22, 'A web extract about solar-powered shipping becomes a college textbook unit'),
        ('cosmo_web_v1', 180, 'A product listing becomes a college textbook unit: note what the model invents'),
        ('cosmo_stories', None, 'A story prompt (stories subset)'),
        ('cosmo_khanacademy', None, 'A Khan Academy-seeded unit for young children')]
out = []
for name, i, note in PICK:
    t = pq.read_table(f'{S}/{name}.parquet').to_pylist()
    if i is None:  # first row whose text opens with the subset's most common opening
        i = next(k for k, r in enumerate(t) if re.match(r'\s*(Once upon a|Welcome back to)', r['text']))
    r = t[i]
    m = re.match(r'(.*?extract from a webpage: ")(.*?)("\.?\s*\n)(.*)', r['prompt'], re.S)
    seed, instr = (m.group(2), m.group(1) + '[EXTRACT]' + m.group(3) + m.group(4)) if m else (None, r['prompt'])
    out.append(dict(set=name, row=i, note=note, format=r['format'], audience=r['audience'], seed_data=r['seed_data'],
                    seed=seed, instructions=instr[:1800], text=r['text'][:1700], text_tokens=r.get('text_token_length')))
    print(name, i, r['format'], r['audience'])
# the prompt fix for repeated openings, measured: stories told / not told to avoid "Once upon a time"
t = pq.read_table(f'{S}/cosmo_stories.parquet').to_pylist(); tab = {}
for r in t:
    told = 'Do not start with classic sentences like "Once upon a time"' in r['prompt']
    once = bool(re.match(r'\s*Once upon a', r['text']))
    k = ('told' if told else 'not_told'); tab.setdefault(k, [0, 0]); tab[k][0] += 1; tab[k][1] += once
print('avoid table [n, opens with Once upon a]:', tab)
json.dump(dict(examples=out, avoid=tab), open(sys.argv[1], 'w'), indent=1)
