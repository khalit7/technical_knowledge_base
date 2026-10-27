"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-25 light pass), a static SVG redrawn from the paper's pipeline
(Figure 1, Figure 7, §3) with its printed numbers: 359,593 source trajectories (Table 12), mean terminal workspace 2.9 files after
replay and 22.4 after completion (Table 13), 37,273 task-sufficient workspaces (§4.2), the Full Mixture's 25,386 + 3,512 + 3,079
records (Table 19), TB2.1 46.2 to 58.1 (Table 3), and the same-volume comparison 36.7 / 47.0 / 52.1 (Table 4, average of two scaffolds).
The paper is under arXiv's non-exclusive licence, so its own figures are not embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import math
from pathlib import Path

INK, MUTE, ACC, BAD, GOOD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)', 'var(--good)'


def text(x, y, t, fs=12.5, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def box(x, y, w, h, title, subs, stroke='var(--line)', sw=1, fill='var(--soft)'):
    s = '<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" stroke="%s" stroke-width="%s"/>' % (x, y, w, h, fill, stroke, sw)
    n = 1 + len(subs)
    y0 = y + h / 2 - (n - 1) * 7.5 + 4
    s += text(x + w / 2, y0, title, a='middle', w='600')
    for i, t in enumerate(subs):
        s += text(x + w / 2, y0 + 15 * (i + 1), t, fs=11.5, c=MUTE, a='middle')
    return s


def arr(x1, y1, x2, y2, c=MUTE, da=None):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"%s/>' % (x1, y1, x2, y2, c, ' stroke-dasharray="%s"' % da if da else '') +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


s = ('<svg viewBox="0 0 700 340" width="700" height="340" role="img" aria-label="The Terminal-Universe pipeline: 359,593 public agent '
     'trajectories are replayed into partial workspaces of 2.9 files on average, a completion agent grows them to 22.4 files, an LLM judge keeps '
     '37,273 as task-sufficient; new tasks are posed in one workspace, across two, and over several rounds, a teacher solves them and its own '
     'tests filter the solutions; supervised fine-tuning of Qwen3.5-27B on the result lifts Terminal-Bench 2.1 from 46.2 to 58.1. On the same '
     '35.8 thousand tasks, imitating the original traces scores 36.7, the untrained base 47.0, re-solving in rebuilt workspaces 52.1.">')
s += text(8, 16, 'Rebuild: from a recorded run back to a workspace', fs=12, c=MUTE)
row1 = [(8, 'Trajectories', ['359,593 public traces']),
        (148, 'Replay', ['Ê₀: 2.9 files (mean)']),
        (288, 'Completion agent', ['22.4 files, 87% written', 'by the teacher']),
        (428, 'LLM judge', ['37,273 kept as', 'task-sufficient']),
        (568, 'Environment', ['judged, not run'])]
for i, (x, t, sub) in enumerate(row1):
    s += box(x, 26, 124, 58, t, sub, stroke=ACC if i == 4 else 'var(--line)', sw=2 if i == 4 else 1)
    if i:
        s += arr(x - 15, 55, x - 2, 55)
s += text(612, 112, 'Re-query: new tasks, teacher solutions and tests', fs=12, c=MUTE, a='end')
s += arr(630, 85, 630, 121, ACC)
s += box(498, 122, 194, 64, 'Re-query', ['Single-WS 25,386 · Cross-WS 3,512', 'Multi-Round 3,079 records'], stroke=ACC, sw=2)
s += box(268, 122, 200, 64, 'Teacher solves, tests filter', ['Qwen3.7-Max writes task,', 'tests and solution'])
s += box(8, 122, 230, 64, 'SFT Qwen3.5-27B', ['Terminal-Bench 2.1: 46.2 → 58.1', '(31,977 records, 6 runs)'])
s += arr(497, 154, 470, 154) + arr(267, 154, 240, 154)
s += arr(60, 121, 60, 86, MUTE, '4 3')
s += text(68, 108, 'flywheel: the motivation, not run', fs=11.5, c=MUTE)
# the decisive comparison
s += text(8, 216, 'The same 35.8k tasks on Terminal-Bench 2.1 (Table 4, mean of two scaffolds)', fs=12, c=MUTE)
X0, SC = 250, 7.0
for i, (lab, v, c) in enumerate([('imitate the original traces', 36.7, BAD), ('untrained base', 47.0, MUTE), ('re-solve in rebuilt workspaces', 52.1, ACC)]):
    y = 228 + i * 30
    s += text(X0 - 10, y + 15, lab, fs=12, c=INK, a='end')
    s += '<rect x="%d" y="%d" width="%.1f" height="20" rx="3" fill="%s" opacity="%s"/>' % (X0, y, v * SC, c, '0.85' if c != MUTE else '0.45')
    s += text(X0 + v * SC + 6, y + 15, '%.1f' % v, fs=12, c=INK, w='600')
s += text(X0, 334, 'imitation lands below the untrained model; re-solving beats it by 15.4 points', fs=11.5, c=MUTE)
s += '</svg>'
out = Path(__file__).resolve().parent / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes; 87% =', round(100 * (1 - 2.9 / 22.4)), '; gap', round(52.1 - 36.7, 1))
