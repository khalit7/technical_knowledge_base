"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-26 light pass), a static SVG.
Top row: the harness-evolution loop of Figure 2 and Algorithm 2, with what RRSI adds marked in the accent colour (§3.2, §3.3, Appendix C).
Bottom row: Table 2's headline trade on the agentic workspace instance (Harvey LAB evolve split, the out-of-distribution average over
JobBench, GDPval and APEX-Agents, and policy tokens per trial), read from tables.json so the numbers keep their source.
The paper's licence on arXiv is not CC BY, so nothing is embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK, MUTE, ACC, BAD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)'
T2 = {r[0]: [float(v) for v in r[1:]] for r in json.load(open(HERE / 'tables.json'))['t2']['rows']}
H0, UN, RR = T2['H0 (no evolution)'], T2['Unregularized evolution'], T2['RRSI']


def text(x, y, t, fs=12, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def arr(x1, y1, x2, y2, c=MUTE):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x1, y1, x2, y2, c) +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


# the loop: (title, generic line, RRSI lines)
BOX = [('Proposer', 'drafts candidates', ['edit budget shrinks', 'reads the edit ledger', 'explores on a stall']),
       ('Critic', '(not in the generic loop)', ['rejects leaking diffs', 'before any score']),
       ('Evaluate', 'evolve set, k runs a task', ['noise band δ from', 'repeats of H₀']),
       ('Accept?', 'generic: best score', ['floor S* − δ', 'tokens must pay', 'for the gain']),
       ('Incumbent', 'next round starts here', ['pruner marks parts', 'with no measured gain'])]
s = ('<svg viewBox="0 0 700 340" width="700" height="340" role="img" aria-label="Top: the harness evolution loop, proposer, critic, evaluate, '
     'accept, incumbent, with what RRSI adds: an annealed edit budget, an edit ledger, exploration on a stall, a leakage critic before scoring, '
     'a noise floor and a cost rule at acceptance, and a pruner. Bottom: Table 2 on the agentic workspace. Evolve split: unevolved %.1f, '
     'unregularised %.1f, RRSI %.1f. Out-of-distribution average: %.1f, %.1f, %.1f. Policy tokens per trial in millions: %.2f, %.2f, %.2f.">'
     % (H0[0], UN[0], RR[0], H0[2], UN[2], RR[2], H0[3], UN[3], RR[3]))
bw, gap, y0 = 124, 20, 8
for i, (t, g, r) in enumerate(BOX):
    x = 2 + i * (bw + gap)
    s += '<rect x="%d" y="%d" width="%d" height="128" rx="8" fill="var(--soft)" stroke="%s"%s/>' % (
        x, y0, bw, ACC if t == 'Critic' else 'var(--line)', ' stroke-width="2"' if t == 'Critic' else '')
    s += text(x + bw / 2, y0 + 20, t, fs=13, a='middle', w='600')
    s += text(x + bw / 2, y0 + 38, g, fs=11.5, c=MUTE, a='middle')
    for j, line in enumerate(r):
        s += text(x + bw / 2, y0 + 62 + j * 17, line, fs=11.5, c=ACC, a='middle')
    if i < len(BOX) - 1:
        s += arr(x + bw + 2, y0 + 64, x + bw + gap - 2, y0 + 64)
s += '<path d="M638,136 L638,152 L64,152 L64,142" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="4 3"/>'
s += '<path d="M64,138 L60,146 L68,146 z" fill="var(--mute)"/>'
s += text(350, 166, 'next round · blue: what RRSI adds to the generic loop', fs=11.5, c=MUTE, a='middle')
s += '<line x1="2" y1="178" x2="698" y2="178" stroke="var(--line)"/>'
# three dumbbells: (title, index, lo, hi, format)
P = [('Evolve split: the score the loop sees', 0, 88.5, 93.5, '%.1f'),
     ('OOD average: tasks never seen', 2, 39.0, 44.5, '%.1f'),
     ('Policy tokens per trial (M)', 3, 1.2, 4.2, '%.2f')]
pw = 210
for i, (t, k, lo, hi, f) in enumerate(P):
    x0 = 8 + i * (pw + 30)
    X = lambda v: x0 + 8 + (v - lo) / (hi - lo) * (pw - 16)
    s += text(x0, 198, t, fs=12, w='600')
    s += '<line x1="%d" y1="250" x2="%d" y2="250" stroke="var(--line)" stroke-width="2"/>' % (x0, x0 + pw)
    s += '<line x1="%.1f" y1="236" x2="%.1f" y2="264" stroke="%s" stroke-width="2"/>' % (X(H0[k]), X(H0[k]), MUTE)
    s += text(X(H0[k]), 280, 'H₀ ' + f % H0[k], fs=11.5, c=MUTE, a='middle')
    for v, c in ((UN[k], BAD), (RR[k], ACC)):
        s += '<circle cx="%.1f" cy="250" r="7" fill="%s"/>' % (X(v), c)
    # labels above the dots, pushed apart if close
    xu, xr = X(UN[k]), X(RR[k])
    if abs(xu - xr) < 70:
        m = (xu + xr) / 2; xu, xr = (m + 35, m - 35) if xu > xr else (m - 35, m + 35)
    s += text(xu, 226, 'unreg. ' + f % UN[k], fs=11.5, c=BAD, a='middle', w='600')
    s += text(xr, 226, 'RRSI ' + f % RR[k], fs=11.5, c=ACC, a='middle', w='600')
s += text(8, 308, 'Same loop, same budget (Harvey LAB, Table 2): RRSI gives up %.1f evolve points against unregularised search and' % (UN[0] - RR[0]), fs=11.5, c=INK)
s += text(8, 325, 'gains %.1f out of distribution on %d%% fewer tokens. One run per arm; each benchmark\'s gain alone is within about one standard error.'
          % (RR[2] - UN[2], round(100 * (1 - RR[3] / UN[3]))), fs=11.5, c=MUTE)
s += '</svg>'
out = HERE / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes')
