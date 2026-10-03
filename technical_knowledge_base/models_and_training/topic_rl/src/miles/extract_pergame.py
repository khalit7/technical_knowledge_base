"""Extract the per-game Atari-57 scores used by the Milestones tab.

Inputs (not committed; download and run `pdftotext -layout` first):
  muzero.txt  from https://arxiv.org/pdf/1911.08265v2  (Table S1: 30 random no-op starts)
  agent57.txt from https://arxiv.org/pdf/2003.13350     (App. H.4: Atari 57 table of scores)
Usage: python3 extract_pergame.py <dir with the two .txt files>
Writes inputs/atari57_pergame.tsv: one row per game with the raw scores as printed.
"""
import re, sys, os
d = sys.argv[1] if len(sys.argv) > 1 else '.'
key = lambda g: re.sub(r"[^a-z]", "", g.lower())
M = open(os.path.join(d, 'muzero.txt')).read().split('\n')
i1 = [k for k, l in enumerate(M) if 'Table S1:' in l][0]
mz = {}
for l in M[i1 - 120:i1]:
    m = re.match(r"\s*([a-z][a-z' ]+?)\s{2,}(.*?)\s+(-?[\d,\.]+)\s*%\s*$", l)
    if m:
        t = re.findall(r"-?[\d,]+\.\d+|-?[\d,]+|(?<=\s)-(?=\s)", ' ' + m.group(2) + ' ')
        mz[key(m.group(1))] = (m.group(1).strip(), [x.replace(',', '') for x in t])
A = open(os.path.join(d, 'agent57.txt')).read().split('\n')
i = [k for k, l in enumerate(A) if 'H.4. Atari 57 Table of Scores' in l][0]
num = r'(-?[\d\.]+)'
a57 = {}
for l in A[i + 2:i + 80]:
    m = re.match(r"\s*([a-z][a-z' \.]+?)\s{2,}" + num + r'\s+' + num + r'\s+' + num + r' ± [\d\.]+\s+' + num + r' ± [\d\.]+\s+' + num + r'\s*$', l)
    if m:
        a57[key(m.group(1))] = [m.group(k) for k in range(2, 7)]
assert len(mz) == 57 and len(a57) == 57, (len(mz), len(a57))
with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'inputs', 'atari57_pergame.tsv'), 'w') as f:
    f.write('# Raw Atari-57 scores, 30 random no-op starts, as printed.\n')
    f.write('# random, human, apex, r2d2, muzero: MuZero arXiv v2 Table S1 (https://arxiv.org/abs/1911.08265).\n')
    f.write('# a57_human, a57_random, agent57, r2d2_bandit, muzero_in_a57: Agent57 App. H.4 (https://arxiv.org/abs/2003.13350).\n')
    f.write('game\trandom\thuman\tapex\tr2d2\tmuzero\ta57_human\ta57_random\tagent57\tr2d2_bandit\tmuzero_in_a57\n')
    for k in sorted(mz):
        name, t = mz[k]
        f.write('\t'.join([name, t[0], t[1], t[3], t[4], t[5]] + a57[k]) + '\n')
print('wrote 57 rows')
