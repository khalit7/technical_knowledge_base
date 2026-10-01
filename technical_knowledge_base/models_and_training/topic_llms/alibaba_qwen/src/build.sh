#!/bin/sh
# Assemble ../index.html from parts/: head, CSS and header, the HTML parts in order, the error box, then one <script> per JS part, tabs last.
# Links in any HTML part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_read_a.html parts/03_read_b.html parts/04_read_c.html parts/05_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_moe.js parts/12_js_hx.js parts/13_js_small.js parts/14_js_cfg.js parts/15_js_line.js parts/16_js_lic.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
q3r=>"https://arxiv.org/abs/2505.09388",
fnp=>"https://arxiv.org/abs/2608.30320",
nxb=>"https://www.alibabacloud.com/blog/602580",
nxc=>"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct",
nxcfg=>"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct/blob/main/config.json",
gbl=>"https://arxiv.org/abs/2501.11873",
gat=>"https://arxiv.org/abs/2505.06708",
gdn=>"https://arxiv.org/abs/2412.06464",
c235=>"https://huggingface.co/Qwen/Qwen3-235B-A22B/blob/main/config.json",
c35=>"https://huggingface.co/Qwen/Qwen3.5-397B-A17B",
c35cfg=>"https://huggingface.co/Qwen/Qwen3.5-397B-A17B/blob/main/config.json",
c27=>"https://huggingface.co/Qwen/Qwen3.8-27B",
c27cfg=>"https://huggingface.co/Qwen/Qwen3.8-27B/blob/main/config.json",
c24=>"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B",
c24cfg=>"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B/blob/main/config.json",
c24lic=>"https://huggingface.co/Qwen/Qwen3.8-2.4T-A95B/blob/main/LICENSE",
fn=>"https://huggingface.co/Qwen/Qwen3.8-Flash-Next",
fncfg=>"https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/main/config.json",
fnlic=>"https://huggingface.co/Qwen/Qwen3.8-Flash-Next/blob/main/LICENSE",
img21=>"https://huggingface.co/Qwen/Qwen-Image-2.1/blob/main/LICENSE",
ali38=>"https://www.alibabagroup.com/en-US/document-2021044032125272064",
tn0902=>"https://technode.com/2026/09/02/alibaba-upgrades-qwen38-max-with-new-0902-snapshot/",
tnfn=>"https://technode.com/2026/08/26/alibabas-qwen-to-open-source-qwen3-8-flash-next-previewing-qwen4-architecture/",
tnglm=>"https://technode.com/2026/08/27/zhipu-identifies-ox-alpha-as-glm-5-3-flash-and-releases-model-weights/",
hy4=>"https://huggingface.co/tencent/Hy4-preview",
mtpcmp=>"https://www.marktechpost.com/2026/08/28/glm-5-3-flash-vs-qwen3-8-flash-next-two-chinese-ai-labs-independently-converge-on-the-same-model-architecture/",
mtpcoder=>"https://www.marktechpost.com/2025/07/22/qwen-releases-qwen3-coder-480b-a35b-instruct-its-most-powerful-open-agentic-code-model-yet/",
coderc=>"https://huggingface.co/Qwen/Qwen3-Coder-480B-A35B-Instruct/blob/main/config.json",
mtp3max=>"https://www.marktechpost.com/2025/09/24/alibabas-qwen3-max-production-ready-thinking-mode-1t-parameters-and-day-one-coding-agentic-bench-signals/",
mtp36=>"https://www.marktechpost.com/2026/04/16/qwen-team-open-sources-qwen3-6-35b-a3b-a-sparse-moe-vision-language-model-with-3b-active-parameters-and-agentic-coding-capabilities/",
mtp37max=>"https://www.marktechpost.com/2026/05/21/qwen-introduces-qwen3-7-max-a-reasoning-agent-model-with-a-1m-token-context-window/",
mtp37plus=>"https://www.marktechpost.com/2026/06/02/alibabas-qwen-team-launches-qwen3-7-plus-adding-vision-deep-reasoning-tool-invocation-and-autonomous-iteration-on-the-bailian-platform/",
i2507=>"https://huggingface.co/Qwen/Qwen3-235B-A22B-Instruct-2507",
t2507=>"https://huggingface.co/Qwen/Qwen3-235B-A22B-Thinking-2507",
fla=>"https://github.com/QwenLM/FlashQLA",
sw=>"https://simonwillison.net/2026/Aug/16/qwen-38-27b/",
xda=>"https://www.xda-developers.com/qwen-3-8-27b-reverse-engineering-job-frontier-model/",
pres=>"https://presenc.ai/research/alibaba-qwen-model-lineage-and-roadmap-2026",
qblog=>"https://qwen.ai/blog",
qhf=>"https://huggingface.co/Qwen",
fnblog=>"https://qwen.ai/blog?id=qwen3.8-flash-next",
aa=>"https://artificialanalysis.ai/leaderboards/models",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -o '.\{30\}—.\{30\}' ../index.html | head; fi
# Reading time (230 words per minute over the Reading tab's visible text) and the resources total
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-cfg"')
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
