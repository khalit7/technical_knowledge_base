"""Read the article's interactive results chart into inputs/chart.json (the numbers it prints, plus the spread of each point).

usage (from this src/ folder):
  curl -sL -A 'Mozilla/5.0' https://danluu.com/interactive/agentic-testing/average-cost-vs-perfect-37.html -o <scratch>/chart.html   # never into the repo
  python3 -I decode_chart.py <scratch>/chart.html 2026-11-27

What it reads:
  - each condition's accessible label, e.g. "Default: Medium cost $3.31, 63.8% perfect, n=80; XHigh cost $5.92, 81.2% perfect, n=80."
    (printed values, kept at their printed precision);
  - each condition's 50% bootstrap ellipse (the chart draws one per condition and effort, <ellipse id="cov-k" rx ry rotate(a)>),
    converted to data units with the wide chart's axis ticks ($1 = 211.78 px across, 5 points = 84.11 px down) and to one standard
    deviation by dividing by sqrt(chi2_2(0.5)) = sqrt(2 ln 2) = 1.1774. These are "read from figure" values: the chart's own
    bootstrap, not ours. Their correctness spread is checked against the binomial formula in recompute.py.
"""
import html, json, math, re, sys

src = open(sys.argv[1], encoding='utf-8').read()
fetched = sys.argv[2] if len(sys.argv) > 2 else 'unknown date'

# axis calibration from the wide chart's printed tick labels: x ticks $3.00 at 135.53 ... $8.00 at 1194.42; y ticks 55.0% at 541.71 ... 85.0% at 37.02
wide = src[src.index('class="chart wide"'):src.index('class="chart mid"')]
xt = [(float(v), float(x)) for x, v in re.findall(r'<text class="axis" x="([\d.]+)" y="623" text-anchor="middle">\$([\d.]+)</text>', wide)]
yt = [(float(v), float(y)) for y, v in re.findall(r'<text class="axis" x="64" y="([\d.]+)" text-anchor="end">([\d.]+)%</text>', wide)]
px_per_dollar = (xt[-1][1] - xt[0][1]) / (xt[-1][0] - xt[0][0])
px_per_point = (yt[0][1] - yt[-1][1]) / (yt[-1][0] - yt[0][0])
k50 = math.sqrt(2 * math.log(2))

ell = {}
for i, cx, cy, rx, ry, a in re.findall(r'<ellipse id="cov-(\d+)"[^>]*cx="([-\d.]+)" cy="([-\d.]+)" rx="([\d.]+)" ry="([\d.]+)" transform="rotate\(([-\d.]+)', src):
    t = math.radians(float(a)); rx, ry = float(rx), float(ry)
    vx = (rx * math.cos(t)) ** 2 + (ry * math.sin(t)) ** 2  # variance along screen x of the rotated ellipse, px^2 (times k50^2)
    vy = (rx * math.sin(t)) ** 2 + (ry * math.cos(t)) ** 2
    ell['cov-' + i] = (math.sqrt(vx) / k50 / px_per_dollar, math.sqrt(vy) / k50 / px_per_point)
use = {}
for cond, eff, ref in re.findall(r'class="[^"]*condition-covariance" data-condition="([^"]+)" data-effort="([^"]+)"[^>]*href="#(cov-\d+)"', src):
    use[(cond, eff)] = ell[ref]

rows = []
for cid, lab in re.findall(r'<g class="trajectory-group" data-condition="([^"]+)"[^>]*aria-label="([^"]+)"', wide):
    lab = html.unescape(lab)
    m = re.match(r'(.+?): Medium cost \$([\d.]+), ([\d.]+)% perfect, n=(\d+); XHigh cost \$([\d.]+), ([\d.]+)% perfect, n=(\d+)\.', lab)
    name, mc, mp, mn, xc, xp, xn = m.groups()
    r = {'id': cid, 'label': name}
    for eff, c, p, n in (('medium', mc, mp, mn), ('xhigh', xc, xp, xn)):
        sd = use[(cid, eff)]
        r[eff] = {'cost': c, 'pct': p, 'n': int(n), 'cost_sd': round(sd[0], 3), 'pct_sd': round(sd[1], 2)}
    rows.append(r)
ov = re.search(r'Equal-condition overall: Medium cost \$([\d.]+), ([\d.]+)% perfect; XHigh cost \$([\d.]+), ([\d.]+)% perfect', src).groups()
out = {'source': 'https://danluu.com/interactive/agentic-testing/average-cost-vs-perfect-37.html (the chart embedded in the article; values are its printed labels, sds read from its 50% bootstrap ellipses)',
       'fetched': fetched, 'metric': 'share of runs passing all 37 hidden tests', 'model': 'GPT-5.6 Sol in Codex',
       'overall': {'medium': {'cost': ov[0], 'pct': ov[1]}, 'xhigh': {'cost': ov[2], 'pct': ov[3]}},
       'conditions': rows}
json.dump(out, open('inputs/chart.json', 'w'), indent=1)
print(len(rows), 'conditions; px per $', round(px_per_dollar, 2), 'px per point', round(px_per_point, 3))
