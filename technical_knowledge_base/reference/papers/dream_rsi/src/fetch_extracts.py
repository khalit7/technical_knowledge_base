"""Save short verbatim extracts of the outside sources this page checks the paper against, into inputs/extracts.txt.
usage: S=<scratch>; curl -sL https://arxiv.org/html/2604.19341 -o $S/simpletes.html
       curl -sL https://www.dream-rsi.com -o $S/site.html
       curl -sL https://raw.githubusercontent.com/zhengkid/Dream-RSI/main/README.md -o $S/readme.md
       curl -s https://api.github.com/repos/zhengkid/Dream-RSI/git/trees/main?recursive=1 -o $S/tree.json
       curl -s https://huggingface.co/api/papers/2609.14858 -o $S/hf.json
       curl -s "https://huggingface.co/api/daily_papers?week=2026-W38&limit=100" -o $S/hfweek.json
       curl -s "https://huggingface.co/api/daily_papers?date=2026-09-15&limit=100" -o $S/hfday.json
       python3 fetch_extracts.py $S        (fetched 2026-10-03)"""
import re, sys, html, json
S = sys.argv[1]
def flat(s):
    s = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: ' ' + html.unescape(m.group(1)) + ' ', s, flags=re.S)
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S)
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s)))
out = []
st = flat(open(S + '/simpletes.html').read())
def grab(t, a, b):
    i = t.index(a); j = t.index(b, i) + len(b); return t[i:j]
out.append('== SimpleTES (Ye et al. 2026, arXiv 2604.19341, latest version v2 of 27 July 2026, now titled "Structured Scaling of AI Discovery Across Diverse Scientific Domains"; v1 prints the same Lasso numbers), https://arxiv.org/html/2604.19341, Supplementary Table 16')
out.append(grab(st, 'Supplementary Table 16 : Lasso', 'Average 4139.4 26766.7 2502.3 2.17 \\times 14.08 \\times'))
out.append('== SimpleTES Table 1, mathematics rows')
out.append(grab(st, 'Third autocorrelation inequality Bound', 'Circle packing ( n=26 ) Sum of radii ( \\uparrow ) AlphaEvolve V2 [ 43 ] 2.635983 2.635983'))
out.append('== SimpleTES Table 1 caption')
out.append(grab(st, 'Table 1 : Summary of SimpleTES results', 'can be found in Figure 6 .'))
out.append('== SimpleTES default budget')
out.append(grab(st, 'Unless otherwise stated, we use', 'as a default configuration.'))
out.append(grab(st, 'total evaluation budget N=C', 'L=\\frac{N}{CK}'))
sh = open(S + '/site.html').read()
sf = flat(sh)
out.append('== Project page https://www.dream-rsi.com (fetched 2026-10-03)')
out.append(grab(sf, 'Final wall-clock runtime (ms) on six held-out downstream datasets', '† denotes our reproduction.'))
out.append(grab(sf, 'One lap of the loop in Figure 1.', 'Drawn live, not recorded.'))
out.append(grab(sf, 'Numbers on the canvas are illustrative', 'the real ones are in Results .'))
out.append(grab(sf, 'π 0 is the version already deployed and π 1', 'scored by replay over the whole history'))
rd = open(S + '/readme.md').read()
out.append('== GitHub README https://github.com/zhengkid/Dream-RSI (fetched 2026-10-03)')
out.append(re.search(r'> \[!NOTE\]\n> (.*)', rd).group(1))
out.append(re.search(r'alt="(Algorithm engineering:[^"]*)"', rd).group(1))
out.append(rd[rd.index('## Release plan'):rd.index('## Citation')].strip())
tr = json.load(open(S + '/tree.json'))
out.append('== Repository files: ' + ', '.join(t['path'] for t in tr['tree'] if t['type'] == 'blob'))
hf = json.load(open(S + '/hf.json'))
out.append('== Hugging Face papers API https://huggingface.co/api/papers/2609.14858 (fetched 2026-10-03): upvotes %s, submittedOnDailyAt %s' % (hf['upvotes'], hf['submittedOnDailyAt']))
for f, lab in (('hfweek.json', 'week 2026-W38 (https://huggingface.co/api/daily_papers?week=2026-W38&limit=100)'), ('hfday.json', 'day 2026-09-15 (https://huggingface.co/api/daily_papers?date=2026-09-15&limit=100)')):
    d = json.load(open(S + '/' + f))
    xs = sorted([(p.get('paper', {}).get('upvotes', 0), p.get('paper', {}).get('id')) for p in d], reverse=True)
    ids = [i for _, i in xs]
    out.append('Hugging Face %s: %d papers; 2609.14858 ranks %d by upvotes; top five %s' % (lab, len(xs), ids.index('2609.14858') + 1, xs[:5]))
# the knowledge base allows no em dashes anywhere, so the sources' own are marked, not kept
open('inputs/extracts.txt', 'w').write(('\n\n'.join(out) + '\n').replace('\u2014', ' [em dash] '))
print('ok', sum(len(x) for x in out), 'chars')
