#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/01b_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11a_data.js parts/11_js_read.js parts/12_js_ot.js parts/13_js_agent.js parts/14_js_line.js parts/15_js_fit.js parts/16_js_explore.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
mc4=>"https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct",
wmsl=>"https://en.wikipedia.org/wiki/Meta_Superintelligence_Labs",
l1=>"https://arxiv.org/abs/2302.13971",
l2=>"https://arxiv.org/abs/2307.09288",
l3=>"https://arxiv.org/abs/2407.21783",
l3h=>"https://arxiv.org/html/2407.21783v3",
l33=>"https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct",
l32=>"https://ai.meta.com/blog/llama-3-2-connect-2024-vision-edge-mobile-devices/",
l4=>"https://ai.meta.com/blog/llama-4-multimodal-intelligence/",
reg=>"https://www.theregister.com/2025/04/08/meta_llama4_cheating/",
verdent=>"https://www.verdent.ai/guides/what-is-muse-spark",
vbspark=>"https://venturebeat.com/technology/goodbye-llama-meta-launches-new-proprietary-ai-model-muse-spark-first-since",
coders=>"https://codersera.com/blog/muse-spark-complete-guide-2026/",
wspark=>"https://en.wikipedia.org/wiki/Muse_Spark",
agentrep=>"https://the-agent-report.com/2026/07/meta-ai-mango-avocado-open-source-retreat-2026/",
vbglim=>"https://venturebeat.com/technology/meta-returns-to-open-source-with-muse-glimmer-an-apache-2-0-licensed-30b-parameter-ai-model-optimized-for-agents-available-now",
glim=>"https://huggingface.co/meta-models/Muse-Glimmer-30B",
glimcfg=>"https://huggingface.co/meta-models/Muse-Glimmer-30B/blob/main/config.json",
tt=>"https://www.trendingtopics.eu/meta-muse-spark-13/",
aaart=>"https://artificialanalysis.ai/articles/muse-spark-1-3",
aam=>"https://artificialanalysis.ai/models/muse-spark-1-3",
aaglim=>"https://artificialanalysis.ai/models/muse-glimmer",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
ms13=>"https://research.meta.ai/blog/introducing-muse-spark-1-3",
rswe=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
rsweh=>"https://withspecific.com/benchmarks/real-swe",
vt=>"https://9to5mac.com/2026/09/01/meta-launches-muse-voice-transcribe-for-real-time-voice-dictation-on-mac/",
agent=>"https://about.fb.com/news/2026/09/introducing-muse-personal-ai-agent/",
sec=>"https://research.meta.ai/blog/security-and-safety-for-ai-agents-our-approach-with-muse",
csn=>"https://cybersecuritynews.com/metas-muse-ai-agent-0-day-vulnerability/",
verge=>"https://www.theverge.com/meta/717033/meta-superintelligence-labs-ai-mark-zuckerberg",
chin=>"https://arxiv.org/abs/2203.15556",
sard=>"https://arxiv.org/abs/2401.00448",
epoch=>"https://arxiv.org/abs/2404.10102",
sc4=>"https://huggingface.co/unsloth/Llama-4-Scout-17B-16E-Instruct/blob/main/config.json",
mv4=>"https://huggingface.co/unsloth/Llama-4-Maverick-17B-128E-Instruct/blob/main/config.json",
c8=>"https://huggingface.co/unsloth/Meta-Llama-3.1-8B/blob/main/config.json",
c70=>"https://huggingface.co/unsloth/Meta-Llama-3.1-70B/blob/main/config.json",
c405=>"https://huggingface.co/unsloth/Meta-Llama-3.1-405B-Instruct-bnb-4bit/blob/main/config.json",
hfl4=>"https://github.com/huggingface/transformers/blob/main/src/transformers/models/llama4/modeling_llama4.py",
ssmax=>"https://arxiv.org/abs/2501.19399",
h100=>"https://www.nvidia.com/en-us/data-center/h100/",
lcpp=>"https://github.com/ggml-org/llama.cpp",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
wc -c ../index.html
# Reading time (230 words per minute over the Reading tab's visible text) and the resources total
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
