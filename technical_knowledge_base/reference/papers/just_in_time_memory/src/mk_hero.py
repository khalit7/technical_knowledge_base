"""Writes parts/03a_hero.svg.html: the hero figure of the 2026-10-26 light pass, a static SVG redrawn for this page.
Top: the paper's two designs on one past trajectory (Figure 1, §1, §3): write time distils it once, before any later task is known,
and its storage decision is graded only when some later task first retrieves it; read time keeps it raw and a curator writes one
payload per task, graded by that task's own success at once. The delay numbers are this page's replay of the paper's test protocol on
the 140 real ALFWorld goals (inputs/stream.json, p = 0.774, stream_sim.py). Bottom: where the headline gain comes from, Qwen3-8B
executor, from recompute.py's decomposition of Tables 1 and 9 (no memory, untrained JitMem-base, trained JitMem; RL-trained SkillOS
as the tick). The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import json, math
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK, MUTE, ACC, ACC2, LINE, SOFT, DIM = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--acc2)', 'var(--line)', 'var(--soft)', 'var(--dim)'
ST = json.load(open(HERE / 'inputs/stream.json'))['0.774']
DC = json.load(open(HERE / 'inputs/recompute.json'))['decomp']


def text(x, y, t, fs=12.5, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def box(x, y, w, h, l1, l2=None, c=LINE, fill=SOFT, w1=None):
    s = '<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" stroke="%s" stroke-width="1.5"/>' % (x, y, w, h, fill, c)
    if l2 is None:
        return s + text(x + w / 2, y + h / 2 + 4.5, l1, a='middle', w=w1)
    return s + text(x + w / 2, y + h / 2 - 3, l1, a='middle', w=w1) + text(x + w / 2, y + h / 2 + 13, l2, 11.5, MUTE, 'middle')


def arr(x1, y1, x2, y2, c=MUTE):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x1, y1, x2, y2, c) +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


o = []
# lane 1: write time
o.append(text(8, 16, 'Write time (ReasoningBank, MemP, SkillOS): distil each trajectory once, before any later task is known', 12.5, MUTE, w=600))
o.append(box(8, 40, 118, 46, 'past trajectory', 'finished task s'))
o.append(arr(126, 63, 196, 63))
o.append(text(161, 55, 'distil', 11.5, MUTE, 'middle'))
o.append(box(198, 40, 140, 46, 'one fixed artifact', 'lesson chosen blind'))
o.append(arr(338, 56, 398, 40)); o.append(arr(338, 70, 398, 88))
o.append(box(400, 24, 116, 30, 'task A: same text'))
o.append(box(400, 74, 116, 30, 'task B: same text'))
o.append(text(530, 38, 'graded only when a later', 12, INK))
o.append(text(530, 54, 'task first uses it:', 12, INK))
o.append(text(530, 72, '%.1f tasks later on average,' % ST['first_delay_mean'], 12, 'var(--bad)', w=600))
o.append(text(530, 88, '%d%% never used' % round(100 * ST['never_used']), 12, 'var(--bad)', w=600))
o.append(text(530, 104, '(replay, ALFWorld test goals)', 11.5, MUTE))
# lane 2: read time
o.append(text(8, 140, 'Read time (JitMem): keep it raw; when a task arrives, a curator writes a payload for that task', 12.5, MUTE, w=600))
o.append(box(8, 168, 118, 46, 'past trajectory', 'kept raw'))
o.append(arr(126, 182, 196, 164, ACC)); o.append(arr(126, 200, 196, 218, ACC))
o.append(box(198, 148, 140, 34, 'curator: it + task A', c=ACC))
o.append(box(198, 204, 140, 34, 'curator: it + task B', c=ACC))
o.append(arr(338, 165, 398, 165, ACC)); o.append(arr(338, 221, 398, 221, ACC))
o.append(box(400, 150, 116, 30, 'payload for A', c=ACC))
o.append(box(400, 206, 116, 30, 'payload for B', c=ACC))
o.append(text(530, 166, 'graded at once by the', 12, INK))
o.append(text(530, 182, 'success of the task it', 12, INK))
o.append(text(530, 198, 'was written for:', 12, INK))
o.append(text(530, 216, 'one-step credit, trainable', 12, ACC, w=600))
o.append(text(530, 232, 'with GRPO', 12, ACC, w=600))
# bottom: where the headline gain comes from
o.append('<line x1="8" y1="256" x2="692" y2="256" stroke="%s"/>' % LINE)
o.append(text(8, 278, 'Where the headline gain comes from (Qwen3-8B executor, success rate in points)', 12.5, MUTE, w=600))
X0, SC = 112, 5.0  # px per point; 0 to 100 spans 112 to 612
for i, (key, name) in enumerate((('Qwen3-8B alf', 'ALFWorld'), ('Qwen3-8B ws', 'WebShop'))):
    d = DC[key]; y = 306 + i * 70
    o.append(text(8, y + 15, name, 12.5, INK, w=600))
    a, b, c = d['no_memory'], d['base'], d['full']
    o.append('<rect x="%.1f" y="%d" width="%.1f" height="20" fill="%s" opacity=".35"/>' % (X0, y, a * SC, MUTE))
    o.append('<rect x="%.1f" y="%d" width="%.1f" height="20" fill="%s" opacity=".45"/>' % (X0 + a * SC, y, max(b - a, 0) * SC, ACC))
    o.append('<rect x="%.1f" y="%d" width="%.1f" height="20" fill="%s"/>' % (X0 + b * SC, y, (c - b) * SC, ACC))
    sk = d['skillos']
    o.append('<line x1="%.1f" y1="%d" x2="%.1f" y2="%d" stroke="%s" stroke-width="2.5"/>' % (X0 + sk * SC, y - 4, X0 + sk * SC, y + 24, INK))
    o.append(text(X0 + sk * SC, y - 8, 'RL SkillOS %.1f' % sk, 11.5, INK, 'middle'))
    o.append(text(X0 + c * SC + 6, y + 15, '%.1f trained JitMem' % c, 12, INK, w=600))
    o.append(text(X0, y + 38, 'no memory %.1f \u00b7 untrained curator +%.1f \u00b7 RL training +%.1f = %d%% of the gain' % (a, b - a, c - b, round(100 * d['share_rl'])), 11.5, MUTE))
H = 432
aria = ('Two designs on one past trajectory. Write time: the trajectory is distilled once into one fixed artifact before any later task is known; '
        'tasks A and B get the same text; the storage decision is graded only when a later task first uses it, %.1f tasks later on average and %d%% never '
        '(replay of the paper protocol on the ALFWorld test goals). Read time, JitMem: the trajectory is kept raw; a curator reads it with task A, or task B, '
        'and writes a payload for that task, graded at once by that task\'s success, which makes it trainable with GRPO. Below: with the Qwen3-8B executor, '
        'ALFWorld goes from %.1f with no memory to %.1f with the untrained curator to %.1f trained, against %.1f for RL-trained SkillOS; WebShop success rate '
        'from %.1f to %.1f to %.1f against %.1f. RL training supplies %d%% and %d%% of the gain over no memory.') % (
    ST['first_delay_mean'], round(100 * ST['never_used']),
    DC['Qwen3-8B alf']['no_memory'], DC['Qwen3-8B alf']['base'], DC['Qwen3-8B alf']['full'], DC['Qwen3-8B alf']['skillos'],
    DC['Qwen3-8B ws']['no_memory'], DC['Qwen3-8B ws']['base'], DC['Qwen3-8B ws']['full'], DC['Qwen3-8B ws']['skillos'],
    round(100 * DC['Qwen3-8B alf']['share_rl']), round(100 * DC['Qwen3-8B ws']['share_rl']))
svg = '<svg viewBox="0 0 700 %d" width="700" height="%d" role="img" aria-label="%s">%s</svg>' % (H, H, aria, ''.join(o))
(HERE / 'parts/03a_hero.svg.html').write_text(svg + '\n')
print('hero', len(svg), 'bytes')
