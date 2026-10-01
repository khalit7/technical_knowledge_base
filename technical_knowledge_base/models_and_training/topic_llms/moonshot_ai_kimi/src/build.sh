#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, the error box, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/00_css_base.css parts/01_css_kimi.css parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_ns.js parts/12_js_qk.js parts/13_js_dr.js parts/14_js_kx.js parts/15_js_hr.js parts/16_js_qb.js parts/17_js_ar.js parts/18_js_par.js parts/19_js_line.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
k2=>"https://arxiv.org/abs/2507.20534",
kl=>"https://arxiv.org/abs/2510.26692",
ar=>"https://arxiv.org/abs/2603.15031",
muon=>"https://arxiv.org/abs/2502.16982",
kj=>"https://kellerjordan.github.io/posts/muon/",
k3rep=>"https://github.com/MoonshotAI/Kimi-K3/blob/main/k3_tech_report.pdf",
k3card=>"https://huggingface.co/moonshotai/Kimi-K3",
k3cfg=>"https://huggingface.co/moonshotai/Kimi-K3/blob/main/config.json",
k3mod=>"https://huggingface.co/moonshotai/Kimi-K3/blob/main/modeling_kimi_linear.py",
k3idx=>"https://huggingface.co/moonshotai/Kimi-K3/blob/main/model.safetensors.index.json",
k3lic=>"https://huggingface.co/moonshotai/Kimi-K3/blob/main/LICENSE",
k3blog=>"https://www.kimi.com/blog/kimi-k3",
k2cfg=>"https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/config.json",
k2lic=>"https://huggingface.co/moonshotai/Kimi-K2-Instruct/blob/main/LICENSE",
k2t=>"https://huggingface.co/moonshotai/Kimi-K2-Thinking",
klcfg=>"https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Instruct/blob/main/config.json",
hfk3=>"https://huggingface.co/api/models/moonshotai/Kimi-K3",
hfk2=>"https://huggingface.co/api/models/moonshotai/Kimi-K2-Instruct",
hforg=>"https://huggingface.co/moonshotai",
hfblog=>"https://huggingface.co/blog/ResterChed/kimi-k3-model-overview-mxfp4-quantization-open-wei",
aak3=>"https://artificialanalysis.ai/models/kimi-k3",
rswe=>"https://withspecific.com/benchmarks/real-swe",
rswe2=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
swe2=>"https://cognition.com/blog/swe-2",
icx=>"https://www.interconnects.ai/",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html
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
