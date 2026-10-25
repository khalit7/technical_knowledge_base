"""The hero's result panel (light pass 2026-10-25), drawn from tables.json and inputs/recompute.json so no number is retyped:
ARC-AGI-3 public-set RHAE for Opus 5 in the official ARC harness (Figure 5's external reference line), Prime Agent + Opus 5
(best of three runs, and the released median run rescored here), the Human Intelligence Harness card, and the three community
scorecards posted before Prime Agent's run. Writes parts/_gen_hero.html (HTML bars, so it reflows at phone width). Run by build.sh."""
import json
T = json.load(open('tables.json')); R = json.load(open('inputs/recompute.json'))
refs = T['fig5']['refs']; cards = {c['name']: c for c in R['arc_cards']}
rows = [
    ('Opus 5, official ARC harness', refs['Opus 5, ARC harness']['printed'], 'ref', 'external line, $%s' % format(refs['Opus 5, ARC harness']['cost'], ',')),
    ('Prime Agent + Opus 5, best of 3', R['three_runs']['best'], 'sk', 'blog: runs %s' % ', '.join('%.1f' % x for x in R['three_runs']['runs'])),
    ('Prime Agent + Opus 5, released median run', R['prime']['rhae'], 'sk', 'rescored here from the scorecard'),
    ('Human Intelligence Harness card', cards['Human Intelligence Harness']['rhae'], 'hum', 'community leaderboard'),
]
for n in ('baseline1', 'Retrodict', 'Tycho'):
    rows.append(('%s (community, before Prime Agent)' % n, cards[n]['rhae'], '', 'self-reported'))
assert R['three_runs']['best'] == 95.5 and abs(R['prime']['rhae'] - 95.24) < 1e-9
bar = lambda lab, v, cls, note: '<div class="br %s"><span>%s<span class="nt">%s</span></span><span class="tr"><span class="f" style="display:block;width:%.1f%%"></span></span><span class="v">%s%%</span></div>' % (cls, lab, note, v, v)
h = '<div class="met"><p class="mt">ARC-AGI-3 public set, RHAE (25 games, 0 to 100%)</p>' + ''.join(bar(*r) for r in rows) + '</div>'
open('parts/_gen_hero.html', 'w', encoding='utf-8').write(h + '\n')
print('hero:', [(r[0], r[1]) for r in rows])
