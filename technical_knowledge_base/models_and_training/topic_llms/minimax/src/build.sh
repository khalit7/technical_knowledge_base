#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, the error box, then each script in its own element, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_read_a.html parts/03_read_b.html parts/04_read_c.html parts/05_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  echo '</div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/10b_js_model.js parts/11_js_read.js parts/12_js_read2.js parts/13_js_anim.js parts/14_js_cost.js parts/15_js_line.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
wiki=>"https://en.wikipedia.org/wiki/MiniMax_Group",
wz=>"https://en.wikipedia.org/wiki/Z.ai",
p01=>"https://arxiv.org/abs/2501.08313",
pm1=>"https://arxiv.org/abs/2506.13585",
pm2=>"https://arxiv.org/abs/2605.26494",
pmsa=>"https://arxiv.org/abs/2606.13392",
c01=>"https://huggingface.co/MiniMaxAI/MiniMax-Text-01/raw/main/config.json",
cm2=>"https://huggingface.co/MiniMaxAI/MiniMax-M2/raw/main/config.json",
cm3=>"https://huggingface.co/MiniMaxAI/MiniMax-M3/raw/main/config.json",
mod01=>"https://huggingface.co/MiniMaxAI/MiniMax-Text-01/blob/main/modeling_minimax_text_01.py",
k01=>"https://huggingface.co/MiniMaxAI/MiniMax-Text-01",
km1=>"https://huggingface.co/MiniMaxAI/MiniMax-M1-80k",
km2=>"https://huggingface.co/MiniMaxAI/MiniMax-M2",
km25=>"https://huggingface.co/MiniMaxAI/MiniMax-M2.5",
km27=>"https://huggingface.co/MiniMaxAI/MiniMax-M2.7",
km3=>"https://huggingface.co/MiniMaxAI/MiniMax-M3",
rel=>"https://platform.minimax.io/docs/release-notes/models",
tg=>"https://platform.minimax.io/docs/guides/text-generation",
full=>"https://platform.minimax.io/docs/guides/text-m2-full-attention",
price=>"https://platform.minimax.io/docs/guides/pricing-paygo",
m3b=>"https://www.minimax.io/blog/minimax-m3",
fw=>"https://fireworks.ai/blog/minimax-m3-launch",
msagh=>"https://github.com/MiniMax-AI/MSA",
dn=>"https://datanorth.ai/news/minimax-releases-m3-1-flash-preview",
aa=>"https://artificialanalysis.ai/models/minimax-m3",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
ar=>"https://www1.hkexnews.hk/listedco/listconews/sehk/2026/0422/2026042202118.pdf",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
wc -c ../index.html
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-cost"')
t=re.sub(r'<script.*?</script>|<style.*?</style>|<math.*?</math>','',s[a:b],flags=re.S);t=re.sub(r'<[^>]+>',' ',t)
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
