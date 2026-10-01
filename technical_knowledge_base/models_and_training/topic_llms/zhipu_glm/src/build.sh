#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, the error box, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_read.js parts/12_js_hya.js parts/13_js_sla.js parts/14_js_ctx.js parts/15_js_line.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
r45=>"https://arxiv.org/abs/2508.06471",
r5=>"https://arxiv.org/abs/2602.15763",
zblog=>"https://z.ai/blog",
wiki=>"https://en.wikipedia.org/wiki/Z.ai",
lab=>"https://www.labellerr.com/blog/glm-5-2-open-weight-ai-model/",
hf=>"https://huggingface.co/zai-org",
c53=>"https://huggingface.co/zai-org/GLM-5.3",
c52=>"https://huggingface.co/zai-org/GLM-5.2",
cfl=>"https://huggingface.co/zai-org/GLM-5.3-Flash",
c47=>"https://huggingface.co/zai-org/GLM-4.7",
c47f=>"https://huggingface.co/zai-org/GLM-4.7-Flash",
cfg45=>"https://huggingface.co/zai-org/GLM-4.5/blob/main/config.json",
cfg5=>"https://huggingface.co/zai-org/GLM-5/blob/main/config.json",
cfg53=>"https://huggingface.co/zai-org/GLM-5.3/blob/main/config.json",
cfgfl=>"https://huggingface.co/zai-org/GLM-5.3-Flash/blob/main/config.json",
lic53=>"https://huggingface.co/zai-org/GLM-5.3/blob/main/LICENSE",
b52=>"https://huggingface.co/blog/zai-org/glm-52-blog",
dfl=>"https://docs.z.ai/guides/vlm/glm-5.3-flash",
infra=>"https://z.ai/blog/glm-built-its-inference-infrastructure",
price=>"https://docs.z.ai/guides/overview/pricing",
plan=>"https://docs.z.ai/devpack/overview",
rel=>"https://docs.z.ai/release-notes/new-released",
slime=>"https://github.com/THUDM/slime",
atria=>"https://github.com/atria-asi/Atria-Dawn-Preview",
atriap=>"https://arxiv.org/abs/2609.15818",
atriahf=>"https://huggingface.co/internlm/Atria-Dawn-Preview",
sil=>"https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/",
mtpfl=>"https://www.marktechpost.com/2026/08/26/z-ai-releases-glm-5-3-flash-a-320b-a18b-natively-multimodal-moe-with-a-1m-token-context/",
rasch=>"https://sebastianraschka.com/blog/2026/glm-5-2-indexshare.html",
icache=>"https://arxiv.org/abs/2603.12201",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
aa53=>"https://artificialanalysis.ai/models/glm-5-3",
aafl=>"https://artificialanalysis.ai/models/glm-5-3-flash",
aak3=>"https://artificialanalysis.ai/models/kimi-k3",
aamimo=>"https://artificialanalysis.ai/models/mimo-v2-6-pro",
rswe=>"https://withspecific.com/benchmarks/real-swe",
rswed=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
g130=>"https://arxiv.org/abs/2210.02414",
cglm6=>"https://github.com/THUDM/ChatGLM-6B",
cglm2=>"https://huggingface.co/THUDM/chatglm2-6b",
cglm=>"https://arxiv.org/abs/2406.12793",
glm4gh=>"https://github.com/THUDM/GLM-4",
k2=>"https://arxiv.org/abs/2507.20534",
qwen2507=>"https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
# Reading time (230 words per minute over the Reading tab's visible text) and the resources total
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-ctx"')
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
