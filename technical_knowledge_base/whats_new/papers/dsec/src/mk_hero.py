"""Writes parts/03_hero.svg.html: the hero figure of the 2026-10-26 light pass, a static SVG redrawn for this page.
The paper's argument on one screen: each measured workload pressure (§4: Figures 2, 5, 7, Tables 2 and 3) forces one mechanism
(§5, §6), and each mechanism's measured effect (§8, Figures 10 to 13, numbers as printed in the text, all reproduced by recompute.py
from the decoded figures within rounding). The fifth row, the RL co-design, is described in §6 but excluded from the evaluation (§8).
Bottom line: the production scale as the paper reports it (§2.4), with no trace or method.
The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK, MUTE, ACC, BAD, LINE, SOFT = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)', 'var(--line)', 'var(--soft)'


def text(x, y, t, fs=12, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def arr(x1, y1, x2, y2, c=MUTE):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x1, y1, x2, y2, c) +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


ROWS = [  # (pressure, mechanism, effect, measured?)
    (('bursts of up to 32K; a task', 'reads 4.2 to 13.3% of its image'),
     ('on-demand loading from 3FS', '(EROFS, metadata kept local)'),
     ('8,192 burst done in ~35 min,', 'over 60 eager; 57% fewer writes'), True),
    (('toolkits change often, across', '102,171 workspaces a week'),
     ('composable overlayfs layers:', 'base + workspace + toolkits'),
     ('tar writes 5.5\u00d7 the data and', '3.4\u00d7 the peak rate of EROFS'), True),
    (('~90% use at most 5% of CPU;', 'memory pinned (p99 life 3 h+)'),
     ('share one page cache (pmem)', '+ return free pages (DAMON)'),
     ('peak host memory \u221240.2%;', 'time-integrated \u221221.2%'), True),
    (('latency-sensitive agents share', 'cores with best-effort work'),
     ('SCHED_IDLE for best effort', '+ core scheduling for LS'),
     ('latency rise at 50% load:', '45.2% down to 17.3%'), True),
    (('GPU training jobs preempted', 'while rollouts are mid-flight'),
     ('rollout state lives on DSec;', 'idle sandboxes are paused'),
     ('not evaluated in the paper', '(excluded by design, \u00a78)'), False),
]
X = (8, 244, 480)
W = 212
o = [text(X[0], 16, 'Workload pressure (§1, §4)', 12.5, MUTE, w=600),
     text(X[1], 16, 'Mechanism (§5, §6)', 12.5, MUTE, w=600),
     text(X[2], 16, 'Effect (§8, 10-node test cluster)', 12.5, MUTE, w=600)]
Y0, RH = 28, 60
for i, (p, m, e, ok) in enumerate(ROWS):
    y = Y0 + i * RH
    for j, (cell, col) in enumerate(((p, LINE), (m, ACC), (e, ACC if ok else BAD))):
        x = X[j]
        o.append('<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" stroke="%s" stroke-width="%s"%s/>' % (
            x, y, W, RH - 12, SOFT, col, 1.5, '' if ok or j < 2 else ' stroke-dasharray="5 3"'))
        o.append(text(x + 8, y + 19, cell[0], 12, INK if (ok or j < 2) else BAD))
        o.append(text(x + 8, y + 36, cell[1], 12, INK if (ok or j < 2) else BAD))
    o.append(arr(X[0] + W, y + 24, X[1] - 2, y + 24))
    o.append(arr(X[1] + W, y + 24, X[2] - 2, y + 24, ACC if ok else BAD))
yb = Y0 + len(ROWS) * RH + 8
o.append('<line x1="8" y1="%d" x2="692" y2="%d" stroke="%s"/>' % (yb - 6, yb - 6, LINE))
o.append(text(8, yb + 12, 'Production scale, as the authors report it (§2.4, no trace or method): about 3 M sandboxes a day,', 12, MUTE))
o.append(text(8, yb + 29, 'about 380K peak concurrent, over 5,000 created a second, about 160 CPU nodes per unit.', 12, MUTE))
H = yb + 40
aria = ('The DSec argument in five rows, pressure to mechanism to measured effect. Bursts of up to 32K sandboxes reading only 4.2 to 13.3% of their images: '
        'on-demand loading from 3FS with EROFS; an 8,192-container burst finishes in about 35 minutes against over 60 with eager pulls, with 57% fewer disk writes. '
        'Toolkits changing across 102,171 workspaces: composable overlayfs layers; tar extraction writes 5.5 times the data and 3.4 times the peak rate. '
        'About 90% of sandboxes use at most 5% of their CPU while memory stays pinned: page-cache sharing with virtio-pmem and free-page reporting with DAMON; '
        'peak host memory down 40.2% and time-integrated memory down 21.2%. Latency-sensitive agents sharing cores with best-effort work: SCHED_IDLE plus core '
        'scheduling; latency rise at 50% load from 45.2% to 17.3%. GPU jobs preempted mid-rollout: rollout state kept on DSec and idle sandboxes paused; not '
        'evaluated in the paper. Below: the self-reported production scale, about 3 million sandboxes a day, 380 thousand peak concurrent, over 5,000 created a '
        'second, about 160 nodes per unit.')
svg = '<svg viewBox="0 0 700 %d" width="700" height="%d" role="img" aria-label="%s">%s</svg>' % (H, H, aria, ''.join(o))
(HERE / 'parts/03_hero.svg.html').write_text(svg + '\n')
print('hero', len(svg), 'bytes')
