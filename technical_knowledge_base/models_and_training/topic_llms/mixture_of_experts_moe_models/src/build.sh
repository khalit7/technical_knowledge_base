#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below), n:<notion id>, or #t-<tab> for a tab link.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_fig.js parts/12_js_rc.js parts/13_js_rta.js parts/14_js_gb.js parts/15_js_ep.js parts/16_js_par.js parts/17_js_land.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</div></body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
topic=>"https://app.notion.com/p/3c65c17b0d0d812d9e00f6ec89965286",
mixp=>"https://arxiv.org/abs/2401.04088",
mixn=>"https://mistral.ai/news/mixtral-of-experts/",
mixcfg=>"https://huggingface.co/mistralai/Mixtral-8x7B-v0.1/blob/main/config.json",
v3r=>"https://arxiv.org/abs/2412.19437",
v3h=>"https://arxiv.org/html/2412.19437v1",
v3cfg=>"https://huggingface.co/deepseek-ai/DeepSeek-V3/raw/main/config.json",
v3gh=>"https://github.com/deepseek-ai/DeepSeek-V3",
sw=>"https://arxiv.org/abs/2101.03961",
st=>"https://arxiv.org/abs/2202.08906",
shz=>"https://arxiv.org/abs/1701.06538",
gsh=>"https://arxiv.org/abs/2006.16668",
dsm=>"https://arxiv.org/abs/2401.06066",
mb=>"https://arxiv.org/abs/2211.15841",
deepep=>"https://github.com/deepseek-ai/DeepEP",
eplb=>"https://github.com/deepseek-ai/EPLB",
dualpipe=>"https://github.com/deepseek-ai/DualPipe",
gb=>"https://arxiv.org/abs/2501.11873",
q3r=>"https://arxiv.org/abs/2505.09388",
q3b=>"https://qwenlm.github.io/blog/qwen3/",
q3cfg=>"https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json",
qnext=>"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct",
q38=>"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B",
q38fn=>"https://huggingface.co/Qwen/Qwen3.8-Flash-Next",
k2r=>"https://arxiv.org/abs/2507.20534",
k2cfg=>"https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json",
k2t=>"https://huggingface.co/moonshotai/Kimi-K2-Thinking",
k3=>"https://huggingface.co/moonshotai/Kimi-K3",
k3cfg=>"https://huggingface.co/moonshotai/Kimi-K3/blob/main/config.json",
k3files=>"https://huggingface.co/moonshotai/Kimi-K3/tree/main",
oss=>"https://arxiv.org/abs/2508.10925",
osscfg=>"https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
mav=>"https://huggingface.co/meta-llama/Llama-4-Maverick-17B-128E-Instruct",
mavcfg=>"https://huggingface.co/unsloth/Llama-4-Maverick-17B-128E-Instruct/blob/main/config.json",
glm52=>"https://huggingface.co/zai-org/GLM-5.2",
glmf=>"https://siliconangle.com/2026/08/26/z-ai-open-sources-ox-alpha-model-as-glm-5-3-flash/",
glmfd=>"https://docs.z.ai/guides/vlm/glm-5.3-flash",
glmfcfg=>"https://huggingface.co/zai-org/GLM-5.3-Flash/blob/main/config.json",
v4=>"https://api-docs.deepseek.com/news/news260424/",
v41=>"https://api-docs.deepseek.com/updates/",
v41hf=>"https://huggingface.co/deepseek-ai/DeepSeek-V4.1-Flash",
hy4=>"https://www.tencent.com/tencent-releases-and-open-sources-tencent-hy4-preview/",
step5=>"https://pandaily.com/stepfun-step-5-preview-600b-moe-1m-context",
mimo=>"https://www.unite.ai/xiaomis-new-flagship-model-leads-open-weight-rankings-with-a-score-of-46/",
gem4=>"https://blog.google/innovation-and-ai/technology/developers-tools/gemma-4/",
north=>"https://docs.cohere.com/changelog/north-mini-code-1-0",
mm35=>"https://huggingface.co/mistralai/Mistral-Medium-3.5-128B",
cmda=>"https://huggingface.co/CohereLabs/c4ai-command-a-03-2025",
neptune=>"https://neptune.ai/blog/mixture-of-experts-llms",
hfmoe=>"https://huggingface.co/blog/moe",
raschka=>"https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-\w+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-par"')
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
