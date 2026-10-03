"""Save short verbatim extracts of the sources beyond the paper to inputs/extracts.txt (em dashes in sources
are marked [dash], not kept): the SoL-Pi blog, the repository README and config, the EdgeBench README,
a summary of the Z.ai Infra Agent post (z.ai renders its blog with script, so the text was read from explainx.ai).  usage: python3 fetch_extracts.py   (needs network; run 2026-10-03)"""
import html, re, urllib.request
def get(u):
    return urllib.request.urlopen(urllib.request.Request(u, headers={'User-Agent': 'Mozilla/5.0'}), timeout=60).read().decode('utf-8', 'replace')
def text(s):
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S); s = re.sub(r'<[^>]+>', ' ', s)
    s = html.unescape(s); return re.sub(r'\s+', ' ', s)
KEEP = {
 'https://nvlabs.github.io/SoL-Pi/': ['saves $8.75', 'savings range reflects', '152 proposed directions', 'C Context 24', 'one out of every forty', 'Humans supplied early priors', 'refactor its code', 'V2 was the only', '2,048-byte head', '11 tasks and two concurrent arms', 'Provider bill', '12.3% of cross-turn', '87.7% uptake', '28.3% to 100%', 'If all 149', 'roughly 94% of Pi', 'small losses it permits', 'two to twelve hours', 'ran sequentially', '17.5% fewer cycles', 'five to ten iterations'],
 'https://raw.githubusercontent.com/NVlabs/SoL-Pi/main/README.md': ['standalone extension for', 'opt-in and disabled by default', 'pi-coding-agent@0.85.1', 'Node.js 22.19', 'MIT License', 'Do not enable remote reduction', 'cacheWriteReadRatio'],
 'https://raw.githubusercontent.com/ByteDance-Seed/EdgeBench/main/README.md': ['134 real-world tasks', 'stop hooks prevent premature', 'best result across all submissions', 'five-figure spend', '| GPT-5.5 | 31.2'],
 'https://www.explainx.ai/blog/glm-5-3-infra-agent-dense-feedback-inference-2026': ['cannot explain why', 'not the model', '3.22'],
}
out = ['Extracts fetched 2026-10-03 by fetch_extracts.py. Each line: the source URL, then the sentence around a key phrase.\n']
for u, keys in KEEP.items():
    try: t = text(get(u)).replace('\u2014', '[dash]')
    except Exception as e: out.append('%s FAILED %s\n' % (u, e)); continue
    for k in keys:
        i = t.find(k)
        if i < 0: out.append('%s | NOT FOUND: %s\n' % (u, k)); continue
        out.append('%s | ...%s...\n' % (u, t[max(0, i - 220): i + 320].strip()))
open('inputs/extracts.txt', 'w').write('\n'.join(out))
print(sum('NOT FOUND' in x for x in out), 'not found;', len(out), 'lines')
