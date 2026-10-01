#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then each script in its own <script>, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04a_latent.html parts/04_read_b.html parts/05_read_c.html parts/05b_ctl.html parts/05c_end.html parts/06a_lab.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_anim.js parts/12_js_maths.js parts/13_js_read.js parts/14_js_curves.js parts/15_js_loop.js parts/16_js_lab.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
chen=>"https://arxiv.org/abs/2107.03374",
merrill=>"https://arxiv.org/abs/2310.07923",
wang=>"https://arxiv.org/abs/2203.11171",
gao=>"https://arxiv.org/abs/2210.10760",
snell=>"https://arxiv.org/abs/2408.03314",
s1=>"https://arxiv.org/abs/2501.19393",
yue=>"https://arxiv.org/abs/2504.13837",
brown=>"https://arxiv.org/abs/2407.21787",
schaeffer=>"https://arxiv.org/abs/2502.17578",
gema=>"https://arxiv.org/abs/2507.14417",
r1=>"https://arxiv.org/abs/2501.12948",
r1v1=>"https://arxiv.org/abs/2501.12948v1",
nature=>"https://www.nature.com/articles/s41586-025-09422-z",
dsm=>"https://arxiv.org/abs/2402.03300",
o1=>"https://openai.com/index/learning-to-reason-with-llms/",
rush=>"https://www.youtube.com/watch?v=6PEJ96k1kiw",
lambert=>"https://www.interconnects.ai/",
anthx=>"https://platform.claude.com/docs/en/build-with-claude/extended-thinking",
anths=>"https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost",
survey=>"https://arxiv.org/abs/2507.02076",
geiping=>"https://arxiv.org/abs/2502.05171",
ut=>"https://arxiv.org/abs/1807.03819",
ouro=>"https://arxiv.org/abs/2510.25741",
rlt=>"https://yifanzhang-pro.github.io/recurrent-looped-tranformer/",
mtp=>"https://www.marktechpost.com/2026/09/13/a-princeton-researcher-proposes-recurrent-looped-transformer-rlt/",
astra=>"https://openai.com/index/gpt-6-astra/",
tc=>"https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/",
card=>"https://deploymentsafety.openai.com/gpt-6-astra/cot-controllability",
rass=>"https://magazine.sebastianraschka.com/p/gpt-6-astra-looped-transformers-and",
rasb=>"https://sebastianraschka.com/blog/2026/openai-astra-looped-transformers.html",
gbs=>"https://www.lesswrong.com/posts/FG54euEAesRkSZuJN/ryan_greenblatt-s-shortform?commentId=Z4QvnxjSRJjZoPmQu",
gbl=>"https://www.lesswrong.com/posts/6m29SfjbittooYojj/latent-reasoning-architectures-would-likely-undermine-cot",
qwen3=>"https://qwenlm.github.io/blog/qwen3/",
c37=>"https://www.anthropic.com/news/claude-3-7-sonnet",
gem=>"https://ai.google.dev/gemini-api/docs/thinking",
gpt5=>"https://openai.com/index/introducing-gpt-5/",
cog=>"https://arxiv.org/abs/2602.12662",
ares=>"https://arxiv.org/abs/2603.07915",
grok4=>"https://x.ai/news/grok-4",
imo=>"https://deepmind.google/blog/advanced-version-of-gemini-with-deep-think-officially-achieves-gold-medal-standard-at-the-international-mathematical-olympiad/",
wei=>"https://x.com/alexwei_/status/1946477742855532918",
gpt56=>"https://openai.com/index/gpt-5-6/",
op5=>"https://www.anthropic.com/news/claude-opus-5",
arc=>"https://arcprize.org/blog/astra",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
wc -c ../index.html
python3 - <<'PY'
import re
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-samp"')
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
