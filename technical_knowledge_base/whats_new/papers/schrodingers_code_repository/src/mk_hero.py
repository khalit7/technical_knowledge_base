"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-26 light pass), a static SVG.
Top: the same Django task in two views, the familiar one and the one SchrodingerRepo draws when the agent enters the container
(paths and names as Figure 4 and §III-C print them), with the translator that maps commands back and the grading on the original tests (§III-A, §III-G).
Bottom: Table I's Pass@1 and actions per task, baseline against the full setting (all four levels), read from tables.json so the numbers keep their source.
The paper is under arXiv's non-exclusive licence, so nothing is embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK, MUTE, ACC, BAD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)'
rows = json.load(open(HERE / 'tables.json'))['T1']['rows']
T = {}
for r in rows:
    if r['setting'] in ('Baseline', 'SchrodingerRepo'):
        T.setdefault(r['model'], {})[r['setting']] = (r['pass']['v'], r['actions']['v'])
ORDER = ['DeepSeek-v4-Flash', 'Gemini-3.1-Flash-Lite', 'GPT-5.4-mini', 'GPT 5.1']


def text(x, y, t, fs=12, c=INK, a=None, w=None, mono=False):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '',
        ' font-family="ui-monospace,Menlo,monospace"' if mono else '', t)


def arr(x1, y1, x2, y2, c=MUTE):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x1, y1, x2, y2, c) +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


aria = ('The same Django task in two views. Left, the familiar repository: django/db/models/fields/__init__.py, CharField, QuerySet. '
        'Right, the view a seed draws when the agent enters: working_repository/storage_engine/object_models/entries/__init__.py, '
        'Character_unitField, LedgerSuite. A translator maps commands back to the real repository, and the standard tests grade the recovered patch. '
        'Bottom, Table I, Pass@1 and actions per task, baseline then full setting: ' +
        '; '.join('%s %.1f to %.1f percent, %.1f to %.1f actions' % (m, T[m]['Baseline'][0], T[m]['SchrodingerRepo'][0], T[m]['Baseline'][1], T[m]['SchrodingerRepo'][1]) for m in ORDER) + '.')
s = '<svg viewBox="0 0 700 392" width="700" height="392" role="img" aria-label="%s">' % aria
# two views
for x, title, sub, lines, col in ((2, 'Familiar view', 'the copy in public training data', ['django/db/models/fields/__init__.py', 'class CharField(Field)', 'get_FOO_display(), QuerySet'], MUTE),
                                  (398, 'The view a seed draws', 'when the agent enters the container', ['working_repository/storage_engine/', '  object_models/entries/__init__.py', 'class Character_unitField', 'render_FOO_label(), LedgerSuite'], ACC)):
    s += '<rect x="%d" y="4" width="300" height="122" rx="8" fill="var(--soft)" stroke="%s"%s/>' % (x, col if col == ACC else 'var(--line)', ' stroke-width="2"' if col == ACC else '')
    s += text(x + 12, 24, title, fs=13, w='600', c=INK) + text(x + 12, 41, sub, fs=11.5, c=MUTE)
    for i, l in enumerate(lines):
        s += text(x + 12, 64 + i * 17, l.replace(' ', '&#160;'), fs=11.5, c=col if col == ACC else INK, mono=True)
s += arr(308, 50, 392, 50, ACC) + text(350, 42, 'same task,', fs=11.5, c=MUTE, a='middle') + text(350, 70, 'new names', fs=11.5, c=MUTE, a='middle')
s += arr(392, 100, 308, 100) + text(350, 92, 'commands', fs=11.5, c=MUTE, a='middle') + text(350, 118, 'mapped back', fs=11.5, c=MUTE, a='middle')
s += text(350, 146, 'The agent works in the right-hand view; its commands run in the real container and the standard tests grade the patch.', fs=11.5, c=MUTE, a='middle')
s += '<line x1="2" y1="160" x2="698" y2="160" stroke="var(--line)"/>'
# Table I: Pass@1 and actions, baseline -> full
s += text(2, 182, 'Pass@1 falls by 6 to 14 points…', fs=12.5, w='600') + text(420, 182, '…and needs 1.6 to 2.2 times the actions', fs=12.5, w='600')
lo, hi, x0, x1 = 30, 80, 168, 372
X = lambda v: x0 + (v - lo) / (hi - lo) * (x1 - x0)
alo, ahi, ax0, ax1 = 0, 110, 530, 650
AX = lambda v: ax0 + (v - alo) / (ahi - alo) * (ax1 - ax0)
for i, m in enumerate(ORDER):
    y = 214 + i * 34
    (p0, a0), (p1, a1) = T[m]['Baseline'], T[m]['SchrodingerRepo']
    s += text(2, y + 4, m + ('*' if m.startswith('Gemini') else ''), fs=12, c=INK)
    s += '<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="var(--line)" stroke-width="5" stroke-linecap="round"/>' % (X(p1), y, X(p0), y)
    s += '<circle cx="%.1f" cy="%d" r="6" fill="%s"/><circle cx="%.1f" cy="%d" r="6" fill="%s"/>' % (X(p0), y, MUTE, X(p1), y, BAD)
    s += text(X(p1) - 9, y + 4, '%.1f' % p1, fs=11.5, c=BAD, a='end') + text(X(p0) + 9, y + 4, '%.1f' % p0, fs=11.5, c=MUTE)
    s += '<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="var(--line)" stroke-width="5" stroke-linecap="round"/>' % (AX(a0), y, AX(a1), y)
    s += '<circle cx="%.1f" cy="%d" r="6" fill="%s"/><circle cx="%.1f" cy="%d" r="6" fill="%s"/>' % (AX(a0), y, MUTE, AX(a1), y, BAD)
    s += text(AX(a0) - 9, y + 4, '%.0f' % a0, fs=11.5, c=MUTE, a='end') + text(AX(a1) + 9, y + 4, '%.0f' % a1, fs=11.5, c=BAD)
    s += text(470, y + 4, '×%.1f' % (a1 / a0), fs=11.5, c=INK, a='end')
s += text(2, 346, 'Grey: original view; orange: all four levels on (Table I, one run per setting, mini-swe-agent).', fs=11.5, c=MUTE)
s += text(2, 364, 'Renaming alone (Level 2) costs the most of any single level. Pass@1 in %; actions per task.', fs=11.5, c=MUTE)
s += text(2, 382, '* Gemini-3.1-Flash-Lite ran on the 300 instances with the strongest leakage evidence; the others on all 500.', fs=11.5, c=MUTE)
s += '</svg>'
out = HERE / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes')
