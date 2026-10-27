"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-25 light pass), a static SVG redrawn from the paper's design (§3.2 to §3.4,
Eq. 1 to 3, Figure 1) and its run (§4.3, §4.5, Table 4), with printed numbers only: 13 workers, 1,703 contributions, the Table 2 weights
(+5 result, +20 confirmed verification, self-citation 0), random initialisation 3.3923, unigram 2.5151, bigram SVD 2.1284, the 18th scored
contribution 1.9304, the final 1.899044, a trained GPT-2 124M about 1.0. The share 98% is recompute.py's share_18th.
The paper is under arXiv's non-exclusive licence, so its own Figure 1 is not embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = json.load(open(HERE / 'inputs' / 'recompute.json'))
INK, MUTE, ACC, BAD, GOOD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)', 'var(--good)'


def text(x, y, t, fs=12.5, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def arr(x1, y1, x2, y2, c=MUTE, da=None):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"%s/>' % (x1, y1, x2, y2, c, ' stroke-dasharray="%s"' % da if da else '') +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


def node(x, y, lab, c=ACC, r=13, fill='var(--bg)'):
    return '<circle cx="%d" cy="%d" r="%d" fill="%s" stroke="%s" stroke-width="2"/>' % (x, y, r, fill, c) + text(x, y + 4, lab, fs=11.5, c=INK, a='middle', w='600')


s = ('<svg viewBox="0 0 700 372" width="700" height="372" role="img" aria-label="Agora in one picture. Left: 13 coding-agent workers, '
     'with no planner, each loop: run agora analyze, pick a parent commit, change one thing, evaluate, publish a commit. Middle: the shared record '
     'is a Git commit graph; each node carries hypothesis, code, metric and parents; a result built on by another account earns its parent 5 points, '
     'a confirmed verification 20, and work on one\'s own commit earns nothing. Right: the run took the evaluator from 3.3923 bits per byte at random '
     'initialisation to 1.899044; the first 18 scored contributions on day one made about 98 percent of that drop; a trained GPT-2 sits at about 1.0.">')
# left: the workers' loop
s += text(8, 16, 'Workers (13, no planner)', fs=12, c=MUTE)
s += '<rect x="8" y="26" width="168" height="196" rx="8" fill="var(--soft)" stroke="var(--line)"/>'
for i, t in enumerate(['1  agora analyze', '2  pick a parent commit', '3  check it out, change', '    one thing', '4  run the evaluator', '5  publish a commit', '    (code + metric)']):
    s += text(20, 50 + i * 22, t, fs=12, c=INK if not t.startswith('    ') else MUTE)
s += arr(176, 160, 226, 160, ACC)
s += arr(226, 72, 176, 72, MUTE, '4 3')
s += text(201, 64, 'read', fs=11.5, c=MUTE, a='middle')
s += text(201, 152, 'write', fs=11.5, c=ACC, a='middle')
# middle: the commit graph
s += text(236, 16, 'Shared memory: an append-only Git DAG', fs=12, c=MUTE)
s += '<rect x="230" y="26" width="236" height="196" rx="8" fill="none" stroke="var(--acc)" stroke-width="1.5"/>'
N = {'s': (262, 124, 'setup'), 'a': (322, 72, 'w1'), 'b': (322, 176, 'w2'), 'c': (392, 72, 'w3'), 'd': (392, 124, 'w1'), 'v': (440, 150, 'w4')}
E = [('s', 'a'), ('s', 'b'), ('a', 'c'), ('a', 'd'), ('c', 'v')]
for p, c in E:
    x1, y1, _ = N[p]; x2, y2, _ = N[c]
    d = math.hypot(x2 - x1, y2 - y1); ux, uy = (x2 - x1) / d, (y2 - y1) / d
    s += arr(x1 + ux * 14, y1 + uy * 14, x2 - ux * 15, y2 - uy * 15, MUTE)
for k, (x, y, lab) in N.items():
    s += node(x, y, lab if k != 's' else '0', c=GOOD if k == 'v' else ACC, r=14)
s += text(262, 152, 'setup', fs=11.5, c=MUTE, a='middle')
s += text(357, 58, '+5', fs=11.5, c=ACC, a='middle', w='600')
s += text(374, 158, '0: own branch', fs=11.5, c=BAD, a='middle')
s += text(428, 104, '+20', fs=11.5, c=GOOD, a='start', w='600')
s += text(440, 182, 'verified', fs=11.5, c=MUTE, a='middle')
s += text(348, 214, 'node = hash, account, tags, metric, parents', fs=11.5, c=MUTE, a='middle')
# right: the result
s += text(484, 16, 'The run: 1,703 contributions, 12 days', fs=12, c=MUTE)
Y = lambda v: 40 + (3.45 - v) / (3.45 - 0.95) * 170
s += '<line x1="530" y1="%.1f" x2="530" y2="%.1f" stroke="var(--line)" stroke-width="2"/>' % (Y(3.45), Y(0.95))
pts = [(3.3923, 'random init 3.39', MUTE), (2.5151, 'unigram prior 2.52', ACC), (2.1284, 'bigram SVD 2.13', ACC),
       (1.9304, '18th scored: 1.93', ACC), (1.899044, 'final 1.899', GOOD), (1.0, 'trained GPT-2 ~1.0', MUTE)]
ly = [Y(v) for v, _, _ in pts]
for i in range(1, len(ly)):  # push labels apart (at least 16 px), dots stay on the linear scale
    ly[i] = max(ly[i], ly[i - 1] + 16)
for (v, lab, c), yl in zip(pts, ly):
    y = Y(v)
    s += '<circle cx="530" cy="%.1f" r="4.5" fill="%s"/>' % (y, c)
    if abs(yl - y) > 1:
        s += '<line x1="535" y1="%.1f" x2="546" y2="%.1f" stroke="var(--line)"/>' % (y, yl)
    s += text(550, yl + 4, lab, fs=11.5, c=INK if c != MUTE else MUTE)
s += '<path d="M518,%.1f L512,%.1f L512,%.1f L518,%.1f" fill="none" stroke="var(--acc)" stroke-width="1.5"/>' % (Y(3.3923), Y(3.3923), Y(1.9304), Y(1.9304))
s += text(506, (Y(3.3923) + Y(1.9304)) / 2, '%d%%' % round(100 * R['share_18th']), fs=12, c=ACC, a='end', w='600')
s += text(506, (Y(3.3923) + Y(1.9304)) / 2 + 15, 'day 1', fs=11.5, c=MUTE, a='end')
s += text(598, 228, 'bits per byte (lower is better)', fs=11.5, c=MUTE, a='middle')
# bottom: the three mechanisms in words
s += '<line x1="8" y1="246" x2="692" y2="246" stroke="var(--line)"/>'
rows = [('Store', 'every claim is a commit (hypothesis, code, result, parents) that anyone can rerun (Eq. 1)'),
        ('Score', 'weighted children from other accounts: +5 built on it, +20 confirmed verification (Eq. 2)'),
        ('Steer', 'analyze ranks what to extend: quality + exploration + novelty in thin clusters (Eq. 3)')]
for i, (h, t) in enumerate(rows):
    y = 268 + i * 24
    s += text(8, y, h, fs=12.5, c=ACC, w='600') + text(56, y, t, fs=12, c=INK)
s += text(8, 352, 'One task, one run, no matched comparison: this shows how the record works, not that it helped.', fs=11.5, c=MUTE)
s += '</svg>'
out = HERE / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes; share_18th', round(100 * R['share_18th'], 1))
