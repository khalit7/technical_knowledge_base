"""Writes parts/03a_hero.svg.html: the hero figure (2026-10-25 light pass), a static SVG redrawn from the paper's Eq. 2,
§5 (the write side is never trained) and §6.2 (gamma = 0.95, n_P = 64 or 640, d = 2,048). The 20 shaded cells are 0.95**age.
The paper is under arXiv's non-exclusive licence, so its own figures are not embedded; this is a redraw.
Run by build.sh. Text sizes are at least 11.5 px at scale 1 (the SVG never shrinks below its 700 px viewBox width)."""
import math
from pathlib import Path

INK, MUTE, ACC, BAD = 'var(--ink)', 'var(--mute)', 'var(--acc)', 'var(--bad)'


def text(x, y, t, fs=12.5, c=INK, a=None, w=None):
    return '<text x="%s" y="%s" font-size="%s" fill="%s"%s%s>%s</text>' % (
        x, y, fs, c, ' text-anchor="%s"' % a if a else '', ' font-weight="%s"' % w if w else '', t)


def box(x, y, w, h, title, sub, fill='var(--soft)', stroke='var(--line)', sw=1, subc=MUTE):
    s = '<rect x="%d" y="%d" width="%d" height="%d" rx="6" fill="%s" stroke="%s" stroke-width="%s"/>' % (x, y, w, h, fill, stroke, sw)
    s += text(x + w / 2, y + h / 2 - 3, title, a='middle', w='600')
    s += text(x + w / 2, y + h / 2 + 13, sub, fs=11.5, c=subc, a='middle')
    return s


def arr(x1, y1, x2, y2, c=MUTE):
    a, h = math.atan2(y2 - y1, x2 - x1), 7
    return ('<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="%s" stroke-width="1.5"/>' % (x1, y1, x2, y2, c) +
            '<path d="M%.1f,%.1fL%.1f,%.1fL%.1f,%.1fz" fill="%s"/>' % (
                x2, y2, x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45), x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45), c))


sub = lambda t: '<tspan baseline-shift="sub" font-size="11.5">%s</tspan>' % t
sup = lambda t: '<tspan baseline-shift="super" font-size="11">%s</tspan>' % t
s = ('<svg viewBox="0 0 700 300" width="700" height="300" role="img" aria-label="A frozen encoder and decoder with a persistent bank beside them. '
     'Each turn the latent Z_t is written into the bank by a fixed, untrained rule that first multiplies the bank by 0.95; on the next turn a small '
     'trained read adapter hands the bank to the frozen decoder. A turn written 256 turns earlier keeps about two millionths of its weight.">')
s += text(8, 18, 'One turn: everything except the read adapter is fixed', fs=12, c=MUTE)
s += box(8, 32, 82, 50, 'turn x' + sub('t'), 'current input')
s += box(112, 32, 104, 50, 'Encoder E', 'frozen', fill='var(--acc2)')
s += box(238, 32, 66, 50, 'Z' + sub('t'), 'latent')
s += box(330, 32, 128, 50, 'Read adapter', 'trained (θ' + sub('Mem') + ')', stroke=ACC, sw=2.2, subc=ACC)
s += box(484, 32, 104, 50, 'Decoder D', 'frozen', fill='var(--acc2)')
s += box(612, 32, 80, 50, 'answer', 'ŷ' + sub('t'))
for x1, x2 in [(90, 112), (216, 238), (304, 330), (458, 484), (588, 612)]:
    s += arr(x1 + 1, 57, x2 - 2, 57)
# the write: no gradients, fixed random projections, decay first
s += '<rect x="150" y="112" width="190" height="58" rx="6" fill="var(--soft)" stroke="%s" stroke-width="1.6"/>' % BAD
s += text(245, 130, 'Write, no gradients', a='middle', w='600')
s += text(245, 146, 'fixed random projections', fs=11.5, c=MUTE, a='middle')
s += text(245, 162, 'P ← 0.95 P + this turn', fs=11.5, c=BAD, a='middle')
s += arr(271, 83, 271, 111, BAD) + arr(245, 171, 245, 207, BAD)
# the read path back up
s += arr(470, 207, 400, 85, ACC)
s += text(452, 138, 'read on the', fs=11.5, c=ACC) + text(452, 152, 'next turn', fs=11.5, c=ACC)
# the bank and its decay strip
s += '<rect x="150" y="208" width="542" height="86" rx="6" fill="var(--soft)" stroke="var(--line)"/>'
s += text(160, 224, 'Persistent bank P <tspan font-weight="400" fill="%s" font-size="11.5">64 rows × 2,048 at 1x, 640 rows at 10x</tspan>' % MUTE, w='600')
for i in range(20):
    age = 19 - i
    s += '<rect x="%.1f" y="232" width="12.5" height="20" rx="2" fill="%s" opacity="%.3f"/>' % (160 + i * 14.5, ACC, 0.08 + 0.8 * 0.95 ** age)
s += text(456, 246, '← last 20 turns, newest right', fs=11.5, c=MUTE)
s += text(160, 270, 'shade = weight a turn keeps after ×0.95 per turn (half-life 13.5 turns)', fs=11.5, c=MUTE)
s += text(160, 286, 'a turn 256 back keeps 0.95' + sup('256') + ' ≈ 2 × 10' + sup('−6') + '; 62% of test questions are that old', fs=11.5, c=BAD)
s += '</svg>'
out = Path(__file__).resolve().parent / 'parts' / '03a_hero.svg.html'
out.write_text(s + '\n', encoding='utf-8')
print('hero', len(s), 'bytes; half-life', round(math.log(0.5) / math.log(0.95), 1), '; 0.95^256 =', '%.2e' % 0.95 ** 256)
