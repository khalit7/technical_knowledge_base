#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then the scripts, tabs last.
# Links in the parts are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_anim.js parts/12_js_req.js parts/13_js_arc.js parts/14_js_oss_read.js parts/15_js_aa.js parts/16_js_line.js parts/16a_aa.js parts/17_js_cost.js parts/18_js_oss.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
pricing=>"https://developers.openai.com/api/docs/pricing",
astra=>"https://developers.openai.com/api/docs/models/gpt-6-astra",
sol61=>"https://developers.openai.com/api/docs/models/gpt-6.1-sol",
sol6=>"https://developers.openai.com/api/docs/models/gpt-6-sol",
luna=>"https://developers.openai.com/api/docs/models/gpt-6-luna",
sol56=>"https://developers.openai.com/api/docs/models/gpt-5.6-sol",
terra56=>"https://developers.openai.com/api/docs/models/gpt-5.6-terra",
luna56=>"https://developers.openai.com/api/docs/models/gpt-5.6-luna",
reason=>"https://developers.openai.com/api/docs/guides/reasoning",
cache=>"https://developers.openai.com/api/docs/guides/prompt-caching",
ultra=>"https://developers.openai.com/api/docs/guides/ultrafast-mode",
fast=>"https://developers.openai.com/api/docs/guides/fast-mode",
arc=>"https://arcprize.org/blog/astra",
card=>"https://deploymentsafety.openai.com/gpt-6-astra",
oss=>"https://arxiv.org/abs/2508.10925",
cfg120=>"https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
cfg20=>"https://huggingface.co/openai/gpt-oss-20b/blob/main/config.json",
mx=>"https://arxiv.org/abs/2310.10537",
rasoss=>"https://magazine.sebastianraschka.com/p/from-gpt-2-to-gpt-oss-analyzing-the",
will=>"https://simonwillison.net/2026/Jul/9/gpt-5-6/",
eden=>"https://www.edenai.co/post/openai-cuts-gpt-5-6-api-prices-luna-falls-80-terra-20-sol-holds",
robo=>"https://blog.roboflow.com/openai-gpt-5-6/",
tc=>"https://www.testingcatalog.com/first-outputs-from-gpt-6-astra-model-from-openai/",
wiki=>"https://en.wikipedia.org/wiki/GPT-6_Astra",
cellcog=>"https://cellcog.ai/blog/openai-astra-release-date/",
cso=>"https://www.csoonline.com/article/4218679/openai-launches-gpt-6-astra-its-first-model-to-cross-a-critical-cybersecurity-threshold.html",
vb6=>"https://venturebeat.com/technology/openai-releases-gpt-6-sol-and-luna-models-slashing-api-costs-50-or-more",
vb61=>"https://venturebeat.com/technology/openais-gpt-6-1-sol-offers-astra-like-performance-at-1-5th-price-a-new-ultrafast-tier-clocks-at-300-tokens-per-second",
thn=>"https://thehackernews.com/2026/09/openai-shelves-gpt-61-astra-after-tests.html",
decoder=>"https://the-decoder.com/openai-pauses-its-most-capable-models-after-agents-exploit-loopholes-and-leak-data/",
law=>"https://siliconangle.com/2026/09/17/openai-launches-astra-for-law-a-gpt-6-configuration-for-legal-research/",
live=>"https://community.openai.com/t/introducing-gpt-live-1-in-the-api/1396471",
ctx=>"https://www.contextstudios.ai/blog/openai-product-day-sept-10-agents-api-gpt-live-1-chatgpt-for-financial",
tt1=>"https://www.trendingtopics.eu/gpt-6-artificial-analysis/",
tt2=>"https://www.trendingtopics.eu/gpt-6-artificial-analysis-update/",
aa42=>"https://artificialanalysis.ai/articles/artificial-analysis-intelligence-index-v4-2",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
rswe=>"https://withspecific.com/benchmarks/real-swe",
devto=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
opus55=>"https://www.anthropic.com/claude-opus-5-5",
tcrunch=>"https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/",
fortune=>"https://fortune.com/2026/09/03/reports-openais-astra-model-uses-a-new-more-efficient-ai-architecture-alarms-ai-safety-experts-who-worry-the-method-makes-models-harder-to-control/",
hk=>"https://hidekazu-konishi.com/entry/openai_gpt_model_release_timeline.html",
gpt3=>"https://arxiv.org/abs/2005.14165",
igpt=>"https://arxiv.org/abs/2203.02155",
gpt2=>"https://openai.com/index/better-language-models/",
wgpt1=>"https://en.wikipedia.org/wiki/GPT-1",
l2r=>"https://openai.com/index/learning-to-reason-with-llms/",
g56=>"https://openai.com/index/gpt-5-6/",
annc=>"https://openai.com/index/gpt-6-astra/",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
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
wc -c ../index.html
