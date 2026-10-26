"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-25 light pass), a static SVG redrawn from the paper's loop (Figure 1, §3)
and its headline numbers: Lasso with Gemini-3.1-Pro, 550 against 317 discovery-agent calls and 3,587.1 against 2,931.0 ms average held-out
runtime, faster on 1 of 6 datasets (Figure 3a; the per-dataset count is recompute.py's); VGG16, 990 against 408 generations (2.43x by total
budget, 1.89x at matched speed, Figure 4 decoded). The two small grids are illustrative (6 branches x 6 attempts, invented scores); they show
the replay rule of §3: a replayed policy reveals only recorded cells, so it can match the recorded best with fewer probes but never beat it.
The paper is under arXiv's non-exclusive licence and the repository's figures carry no licence, so nothing is embedded; this is a redraw.
Run by build.sh. Text is at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import math
from pathlib import Path

HERE = Path(__file__).resolve().parent
INK, MUTE, ACC, BAD, GOOD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)', 'var(--good)'


def text(x, y, t, fs=12.5, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def arr(x1, y1, x2, y2, c=MUTE, da=None):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"%s/>' % (x1, y1, x2, y2, c, ' stroke-dasharray="%s"' % da if da else '') +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


# an illustrative recorded world: 6 branches (columns) x 6 attempts (rows); score 0 to 1, None = failed attempt
S = [[.20, .28, .31, .30, .33, .32],
     [.25, None, .52, .61, .74, .92],
     [.15, .18, .17, .19, .18, .20],
     [.30, .41, .47, .55, .58, .60],
     [.10, None, .12, .11, None, .13],
     [.22, .35, .44, .46, .45, .47]]
BEST = (1, 5)
# the dreamed policy: deepen branches 1 and 3, close the others after two attempts
REVEAL = {(b, k) for b in range(6) for k in range(2)} | {(1, k) for k in range(6)} | {(3, k) for k in range(4)}


def grid(x0, y0, reveal):
    s, cs = '', 26
    for b in range(6):
        for k in range(6):
            v = S[b][k]
            x, y = x0 + b * (cs + 3), y0 + k * (cs + 3)
            if (b, k) not in reveal:
                fill, op = 'var(--dim)', '0.45'
            elif v is None:
                fill, op = 'var(--bad)', '0.85'
            else:
                fill, op = ACC, '%.2f' % (0.15 + 0.85 * v)
            s += '<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="%s" opacity="%s"/>' % (x, y, cs, cs, fill, op)
            if (b, k) == BEST and (b, k) in reveal:
                s += '<rect x="%d" y="%d" width="%d" height="%d" rx="3" fill="none" stroke="%s" stroke-width="2.5"/>' % (x - 1, y - 1, cs + 2, cs + 2, GOOD)
    return s


s = ('<svg viewBox="0 0 700 360" width="700" height="360" role="img" aria-label="The Dream-RSI loop. Left: an online run records a tree, '
     'here 6 branches by 6 attempts, all 36 attempts evaluated, best node outlined. Middle: dreaming replays a revised policy on the same record, '
     'revealing only recorded cells; it deepens two branches and closes the others, reaching the same best in NREV of 36 attempts and never above it. '
     'Right: the best-scoring version steers the next online run. Bottom: Lasso with Gemini-3.1-Pro, 550 against 317 calls, average runtime 3,587.1 '
     'against 2,931.0 milliseconds, faster on 1 of 6 datasets; VGG16 kernel, 990 against 408 generations, 2.43 times by total budget, 1.89 at matched speed.">')
s = s.replace('NREV', str(len(REVEAL)))
s += text(8, 16, '1  Online: a policy steers the agent;', fs=12, c=MUTE) + text(8, 31, '    every attempt is recorded', fs=12, c=MUTE)
s += grid(20, 44, {(b, k) for b in range(6) for k in range(6)})
s += text(103, 228, '36 attempts, all paid for', fs=11.5, c=INK, a='middle')
s += text(20, 244, 'columns: branches · rows: attempts', fs=11.5, c=MUTE)
s += arr(206, 128, 248, 128, ACC)
s += text(256, 16, '2  Dream: replay a revised policy on', fs=12, c=MUTE) + text(256, 31, '    the record (reads only, no calls)', fs=12, c=MUTE)
s += grid(268, 44, REVEAL)
s += text(351, 228, 'same best in %d of 36 attempts' % len(REVEAL), fs=11.5, c=INK, a='middle')
s += text(268, 244, 'grey: never revealed; orange: failed', fs=11.5, c=MUTE)
s += arr(454, 128, 496, 128, ACC)
s += '<rect x="500" y="44" width="192" height="170" rx="8" fill="var(--soft)" stroke="var(--line)"/>'
s += text(510, 16, '3  Redeploy the best version;', fs=12, c=MUTE) + text(510, 31, '    its run adds a new tree', fs=12, c=MUTE)
for i, t in enumerate(['M policy versions', 'scored by Eq. 1 on', 'every recorded tree:', 'best score, minus a', 'charge per attempt,', 'plus a batching bonus']):
    s += text(596, 70 + i * 19, t, fs=12, c=INK, a='middle')
s += text(596, 196, 'ceiling: the recorded best', fs=11.5, c=BAD, a='middle', w='600')
s += '<path d="M596,214 L596,262 L103,262 L103,252" fill="none" stroke="var(--mute)" stroke-width="1.5" stroke-dasharray="4 3"/>'
s += '<path d="M103,248 L99,256 L107,256 z" fill="var(--mute)"/>'
s += text(350, 276, 'next round, with one more recorded tree', fs=11.5, c=MUTE, a='middle')
s += '<line x1="8" y1="290" x2="692" y2="290" stroke="var(--line)"/>'
s += text(8, 310, 'Lasso, Gemini-3.1-Pro', fs=12.5, c=ACC, w='600') + text(170, 310, '550 → 317 calls; 3,587.1 → 2,931.0 ms average, but faster on 1 of 6 datasets', fs=12, c=INK)
s += text(8, 332, 'VGG16 kernel', fs=12.5, c=ACC, w='600') + text(170, 332, '990 → 408 generations: 2.43× by total budget, 1.89× at matched speed', fs=12, c=INK)
s += text(8, 354, 'One run per arm against a fixed-policy baseline. Grids illustrative; numbers from Figures 3 and 4.', fs=11.5, c=MUTE)
s += '</svg>'
out = HERE / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes; revealed', len(REVEAL))
