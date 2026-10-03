#!/bin/sh
# Regenerate src/inputs/ from public sources (run from src/). SCRATCH is any temporary folder.
set -e
S=${SCRATCH:-/tmp/jitm}; mkdir -p $S/src
curl -sL https://arxiv.org/html/2609.27334v1 -o $S/v.html && python3 extract_paper.py $S/v.html v1
curl -sL https://arxiv.org/e-print/2609.27334v1 | tar xz -C $S/src && uv run --with pymupdf python decode_figs.py $S/src/figures
# SkillOS (the source of most baseline rows): Tables 1 and 2
curl -sL https://arxiv.org/html/2605.06614 -o $S/skillos.html
python3 - "$S" <<'PY'
import re, html, sys, json, zipfile, io
S = sys.argv[1]
def txt(x):
    x = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' $' + html.unescape(m.group(1)) + '$ ', x, flags=re.S)
    x = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', x, flags=re.S)
    x = re.sub(r'</(p|h\d|div|tr|li|figcaption)>', '\n', x); x = re.sub(r'</t[dh]>', '\t', x)
    x = re.sub(r'<[^>]+>', '', x); x = html.unescape(x)
    return re.sub(r'\n\s*\n+', '\n\n', re.sub(r'[  ]+', ' ', x))
t = txt(open(S + '/skillos.html').read())
a = t.index('Table 1: Experiment results on ALFWorld'); b = t.index('4.2 Main Results')
seg = ' '.join(l for l in t[a:b].split('\n') if l.strip()).replace('\t', ' ')
seg = re.sub(r'\$\\?(?:textbf\{)?([0-9.]+)\}?_\{[^$]*scriptscriptstyle ([0-9.]+)\}\}\$', r'\1±\2', seg)
rows = re.split(r'(?=Executor|No Memory|ReasoningBank|MemP|SkillOS-base|SkillOS-gemini|SkillOS  |Table [0-9])', seg)
open('inputs/skillos_tables.txt', 'w').write('Source: https://arxiv.org/html/2605.06614 (SkillOS, Ouyang et al. 2026a), Tables 1 and 2, flattened by fetch_inputs.sh\n' + '\n'.join(r[:200] for r in rows if '±' in r) + '\n')
PY
# ALFWorld valid_seen goals (the 140-task test set)
curl -sL https://github.com/alfworld/alfworld/releases/download/0.2.2/json_2.1.1_tw-pddl.zip -o $S/tw.zip
python3 - "$S" <<'PY'
import zipfile, json, re, sys
z = zipfile.ZipFile(sys.argv[1] + '/tw.zip'); games = []
for n in sorted(z.namelist()):
    if '/valid_seen/' in n and n.endswith('game.tw-pddl'):
        d = json.loads(z.read(n))
        if d['solvable']:
            g = n.split('/')[2]
            games.append({'id': g, 'type': g.split('-')[0], 'goal': re.search(r'Your task is to: ([^"]*)"', d['grammar']).group(1)})
json.dump({'source': 'https://github.com/alfworld/alfworld/releases/download/0.2.2/json_2.1.1_tw-pddl.zip, valid_seen, games with solvable=true (140); goal text from each game grammar "Your task is to: ..."', 'games': games}, open('inputs/alfworld_valid_seen.json', 'w'), indent=0)
print(len(games), 'ALFWorld games')
PY
