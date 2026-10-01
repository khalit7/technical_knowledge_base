#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then the scripts (one <script> each), tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/15a_aa_data.js parts/11_js_read.js parts/12_js_hv.js parts/13_js_ij.js parts/14_js_line.js parts/15_js_pos.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
wg=>"https://en.wikipedia.org/wiki/Grok_(chatbot)",
wsx=>"https://en.wikipedia.org/wiki/SpaceXAI",
s1=>"https://www.sec.gov/Archives/edgar/data/1181412/000162828026036936/spaceexplorationtechnologi.htm",
verge=>"https://www.theverge.com/ai-artificial-intelligence/925469/xai-is-becoming-spacexai",
bi=>"https://www.businessinsider.com/xai-rebrand-spacexai-new-logo-x-handle-spacex-2026-7",
sa46=>"https://siliconangle.com/2026/08/12/spacexai-releases-flagship-grok-4-6-model-advanced-reasoning-capabilities/",
vb46=>"https://venturebeat.com/technology/spacexai-debuts-grok-4-6-overtaking-kimi-k3s-performance-and-matching-gpt-5-6-sol-for-worlds-third-best-on-artificial-analysis",
comet46=>"https://www.cometapi.com/grok-4-6-release-date/",
mtp45=>"https://www.marktechpost.com/2026/07/08/spacexai-releases-grok-4-5/",
mtp47=>"https://www.marktechpost.com/2026/09/21/spacexai-releases-grok-4-7/",
g1os=>"https://x.ai/news/grok-os",
g1gh=>"https://github.com/xai-org/grok-1",
g2=>"https://huggingface.co/xai-org/grok-2",
g2cfg=>"https://huggingface.co/xai-org/grok-2/blob/main/config.json",
g2lic=>"https://huggingface.co/xai-org/grok-2/blob/main/LICENSE",
g3=>"https://x.ai/news/grok-3",
g4=>"https://x.ai/news/grok-4",
g47=>"https://x.ai/news/grok-4-7",
xd47=>"https://docs.x.ai/developers/grok-4-7",
xdm=>"https://docs.x.ai/developers/models",
xdma=>"https://docs.x.ai/developers/model-capabilities/text/multi-agent",
xdrn=>"https://docs.x.ai/developers/release-notes",
xdret=>"https://docs.x.ai/developers/migration/may-15-retirement",
aa47=>"https://artificialanalysis.ai/articles/benchmarking-grok-4-7",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
op55=>"https://www.anthropic.com/claude-opus-5-5",
rswe=>"https://aitecharchive.com/articles/which-llm-is-best-for-coding-real-swe-benchmark-compared",
adv=>"https://adversa.ai/blog/cryptographic-context-injection-grok-data-theft/",
thn=>"https://thehackernews.com/2026/08/new-cryptographic-context-injection.html",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
wc -c ../index.html
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-line"')
t=re.sub(r'<script.*?</script>|<style.*?</style>','',s[a:b],flags=re.S);t=re.sub(r'<[^>]+>',' ',t)
w=len(t.split());m=round(w/230)
fr=s[s.index('<h3>Best resources</h3>'):]
tot=0
for x in re.findall(r'class="rt">\(([^)]*)\)',fr):
    h=re.search(r'(\d+)h',x);mm=re.search(r'(\d+) ?m(?:in)?\b',x)
    tot+=(int(h.group(1))*60 if h else 0)+(int(mm.group(1)) if mm else 0)
res='%dh %02dm'%(tot//60,tot%60)
s=s.replace('RT_MIN',str(m)).replace('RES_TIME',res)
open('../index.html','w').write(s)
print('reading words',w,'minutes',m,'resources',res)
PY
