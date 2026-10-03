"""Write tables.json: the paper's Table 1 (and the blog's earlier version of it), the printed labels of
Figures 6 and 8, the decoded Figures 5, 7, 9 and 10 (inputs/figs.json, from decode_figs.py), and the
ARC-AGI-3 scorecards (Prime Agent's released median run and the public-set community entries) in compact form.
usage: python3 mk_tables.py   (build.sh runs it)"""
import glob, json, os

T1_COLS = ['GLM-5.2 Prime', 'GLM-5.2 Pi-mono', 'Opus 5 Prime', 'Opus 5 Claude Code', 'GPT-5.6 Sol Prime', 'GPT-5.6 Sol Codex']
# arXiv HTML v1 Table 1 (inputs/tables_v1.txt is empty for it; the values are in inputs/paper_v1.txt, section 3.2), printed precision kept
T1 = [
    ['OOLONG (Yahoo, 128k)', 'long context', 'https://arxiv.org/abs/2511.02817', [.700, .420, .900, .920, .940, .900]],
    ['OOLONG-Pairs', 'long output', 'https://arxiv.org/abs/2512.24601', [.874, .556, .929, .922, .911, .895]],
    ['OBLIQ-Bench (math)', 'ranking (nDCG@10)', 'https://arxiv.org/abs/2605.06235', [.669, .635, .802, .795, .612, .646]],
    ['LongBench Pro (English)', 'comprehension', 'https://arxiv.org/abs/2601.02872', [.777, .768, .804, .790, .794, .790]],
    ['LongBench v2', 'expert long tasks', 'https://arxiv.org/abs/2412.15204', [.680, .696, .744, .746, .714, .704]],
    ['ManyIH Coding', 'long instructions', 'https://arxiv.org/abs/2604.09443', [.424, .386, .536, .522, .499, .454]],
    ['ManyIH IF', 'long instructions', 'https://arxiv.org/abs/2604.09443', [.209, .164, .225, .175, .216, .232]],
    ['LongCoT-Mini', 'long reasoning', 'https://arxiv.org/abs/2604.14140', [.638, .613, .722, .558, .671, .681]],
    ['EmulatorBench', 'long coding', None, [.208, .000, .047, .062, .275, .228]],
]
# check the transcription against the extracted arXiv table, cell by cell
tt = [l.strip().rstrip('\t').strip() for l in open('inputs/tables_v1.txt').read().split('\n')]
nums = [float(l) for l in tt if l.startswith('.') and l[1:].isdigit()]
assert nums == [v for r in T1 for v in r[3]], 'Table 1 transcription differs from inputs/tables_v1.txt'
# the same table in the Prime Intellect blog of 5 August 2026 (inputs/blog_2026-08-05.txt), parsed the same way
bl = [l.strip().rstrip('*') for l in open('inputs/blog_2026-08-05.txt').read().split('\n')]
a = bl.index('OOLONG (yahoo, 128k)')
bnums = [float(l) for l in bl[a:a + 120] if l.startswith('0.') and l[2:].isdigit()][:54]
BLOG = {r[0]: bnums[6 * i:6 * i + 6] for i, r in enumerate(T1)}
BLOG_STARRED = [l for l in open('inputs/blog_2026-08-05.txt').read().split('\n') if l.strip().endswith('*')]

FIG6 = [['DeepSeek V4 Pro', 'Prime Agent', 25, 328, 7.6], ['DeepSeek V4 Pro', 'Claude Code', 6, 498, 1.2],
        ['GLM 5.3', 'Prime Agent', 24, 1316, 1.8], ['GLM 5.3', 'Claude Code', 4, 1003, 0.4], ['GLM 5.3', 'opencode', 9, 1010, 0.9],
        ['Kimi K3', 'Prime Agent', 3, 331, 0.9], ['Kimi K3', 'kimi-code', 3, 1009, 0.3]]
FIG8 = [['GPT-5.6 Sol', '1500 s', 'Prime Agent', 43, 69, 62.3], ['GPT-5.6 Sol', '1500 s', 'Codex', 41, 69, 59.4],
        ['Kimi K3', '4500 s', 'Prime Agent', 47, 69, 68.1], ['Kimi K3', '4500 s', 'kimi-code', 49, 69, 71.0]]

figs = json.load(open('inputs/figs.json'))
com = json.load(open('inputs/arc3_community.json'))['entries']
meta = {}
for e in com:
    u = (e.get('scorecardUrls') or [{}])[0].get('url', '')
    meta[u.rsplit('/', 1)[-1]] = e
PRIME = '2af780b4-f2a1-43e9-a794-b23da3cd3f9f'
cards, games = [], None
for f in sorted(glob.glob('inputs/arc_cards/*.json')):
    cid = os.path.basename(f)[:-5]
    c = json.load(open(f))
    envs = sorted(c['environments'], key=lambda e: e['id'])
    if games is None:
        games = [[e['id'].split('-')[0], e['runs'][0]['level_baseline_actions']] for e in envs]
    assert [e['id'].split('-')[0] for e in envs] == [g[0] for g in games]
    assert all(e['runs'][0]['level_baseline_actions'] == g[1] for e, g in zip(envs, games)), cid
    m = meta.get(cid, {})
    cards.append({'id': cid, 'name': 'Prime Agent (median of 3 runs)' if cid == PRIME else m['name'],
                  'date': c['published_at'][:10], 'cost': m.get('cost'), 'board': None if cid == PRIME else m.get('score'),
                  'printed': round(c['score'], 4), 'tags': c.get('tags'), 'open': c.get('open_at'), 'last': c.get('last_update'),
                  'g': [[e['runs'][0]['levels_completed'], [a for a in e['runs'][0]['level_actions']], e['runs'][0]['resets'], round(e['runs'][0]['score'], 4)] for e in envs]})
cards.sort(key=lambda c: (c['id'] != PRIME, -c['printed']))
json.dump({'t1': {'cols': T1_COLS, 'rows': T1, 'blog': BLOG, 'blog_starred': BLOG_STARRED}, 'fig6': FIG6, 'fig8': FIG8,
           'fig5': figs['fig5'], 'fig7': figs['fig7'], 'fig9': figs['fig9'], 'fig10': figs['fig10'], 'figchecks': figs['checks'],
           'arc': {'games': games, 'cards': cards}},
          open('tables.json', 'w'), separators=(',', ':'))
print('tables.json', os.path.getsize('tables.json'), 'bytes;', len(cards), 'scorecards')
