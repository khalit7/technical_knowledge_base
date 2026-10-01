#!/bin/sh
# Assemble ../index.html from parts/: the head and CSS, the HTML parts in order, then the scripts, tabs last.
# Links in the HTML parts are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_think.js parts/12_js_media.js parts/13_js_strip.js parts/15_js_line.js parts/16a_aa_data.js parts/16_js_cost.js parts/17_js_gemma.js parts/18_js_roof.js parts/19_js_spec.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
pricing=>"https://ai.google.dev/gemini-api/docs/pricing",
think=>"https://ai.google.dev/gemini-api/docs/thinking",
media=>"https://ai.google.dev/gemini-api/docs/media-resolution",
tokens=>"https://ai.google.dev/gemini-api/docs/tokens",
log=>"https://ai.google.dev/gemini-api/docs/changelog",
models=>"https://ai.google.dev/gemini-api/docs/models",
g15=>"https://arxiv.org/abs/2403.05530",
g25=>"https://arxiv.org/abs/2507.06261",
g2=>"https://arxiv.org/abs/2408.00118",
g3=>"https://arxiv.org/abs/2503.19786",
g4r=>"https://arxiv.org/abs/2607.02770",
g4c=>"https://ai.google.dev/gemma/docs/core/model_card_4",
g4b=>"https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/",
g3n=>"https://ai.google.dev/gemma/docs/gemma-3n",
g3nb=>"https://developers.googleblog.com/en/introducing-gemma-3n-developer-guide/",
mc3=>"https://storage.googleapis.com/deepmind-media/Model-Cards/Gemini-3-Pro-Model-Card.pdf",
b36=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/",
b38=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/3-8-flash-and-3-8-flash-cyber/",
blive=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-8-live-gemini-3-8-live-extended-thinking/",
bargon=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/",
imo=>"https://deepmind.google/discover/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/",
reg=>"https://www.theregister.com/ai-and-ml/2026/09/02/with-gemini-38-flash-google-reminds-everyone-its-still-in-the-race/5294049",
dev=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
alpha=>"https://www.sec.gov/Archives/edgar/data/0001652044/000165204426000066/googexhibit991q22026.htm",
siri=>"https://aiweekly.co/alerts/apple-ships-siri-ai-in-beta-built-with-google-gemini-models",
wgem=>"https://en.wikipedia.org/wiki/Gemini_(language_model)",
wgemma=>"https://en.wikipedia.org/wiki/Gemma_(language_model)",
aa38=>"https://artificialanalysis.ai/models/gemini-3-8-flash",
aa37=>"https://artificialanalysis.ai/models/gemini-3-7-flash",
aa31=>"https://artificialanalysis.ai/models/gemini-3-1-pro-preview",
aaargon=>"https://artificialanalysis.ai/models/gemini-4-argon",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
cfg31=>"https://huggingface.co/google/gemma-4-31B-it/blob/main/config.json",
cfg26=>"https://huggingface.co/google/gemma-4-26B-A4B-it/blob/main/config.json",
cfg12=>"https://huggingface.co/google/gemma-4-12B-it/blob/main/config.json",
gallery=>"https://sebastianraschka.com/llm-architecture-gallery/",
kvnotes=>"https://sebastianraschka.com/llm-architecture-gallery/kv-cache-calculations/",
rh36=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-6-flash-3-5-flash-lite-3-5-flash-cyber/",
b15=>"https://blog.google/technology/ai/google-gemini-next-generation-model-february-2024/",
b20t=>"https://9to5google.com/2024/12/19/gemini-2-0-flash-thinking/",
sbinf=>"https://jax-ml.github.io/scaling-book/inference/",
sbtpu=>"https://jax-ml.github.io/scaling-book/tpus/",
v6e=>"https://docs.cloud.google.com/tpu/docs/v6e",
tpu7x=>"https://docs.cloud.google.com/tpu/docs/tpu7x",
lev=>"https://arxiv.org/abs/2211.17192",
specret=>"https://research.google/blog/looking-back-at-speculative-decoding/",
hfg4=>"https://huggingface.co/blog/gemma4",
b37=>"https://blog.google/innovation-and-ai/models-and-research/gemini-models/introducing-gemini-3-7-flash/",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
grep -c 'href=' ../index.html >/dev/null
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
wc -c ../index.html
# Reading time (230 words per minute over the Reading tab's visible text) and the resources total
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-line"')
t=re.sub(r'<script.*?</script>|<style.*?</style>','',s[a:b],flags=re.S);t=re.sub(r'<[^>]+>',' ',t)
w=len(t.split());m=round(w/230)
# external resources: the rt spans after the "Best resources" heading
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
