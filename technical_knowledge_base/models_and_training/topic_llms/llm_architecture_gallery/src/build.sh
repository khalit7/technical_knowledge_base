#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then the scripts, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/15a_gal_data.js parts/11_js_atx.js parts/12_js_read.js parts/13_js_pos.js parts/15_js_cmp.js parts/16_js_ctx.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
gal=>"https://sebastianraschka.com/llm-architecture-gallery/",
kvc=>"https://sebastianraschka.com/llm-architecture-gallery/kv-cache-calculations/",
repo=>"https://github.com/rasbt/llm-architecture-gallery",
cmpart=>"https://magazine.sebastianraschka.com/p/the-big-llm-architecture-comparison",
gqa=>"https://arxiv.org/abs/2305.13245",
mqa=>"https://arxiv.org/abs/1911.02150",
dsv2=>"https://arxiv.org/abs/2405.04434",
g3=>"https://arxiv.org/abs/2503.19786",
gdn=>"https://arxiv.org/abs/2412.06464",
kl=>"https://arxiv.org/abs/2510.26692",
yarn=>"https://arxiv.org/abs/2309.00071",
l70=>"https://huggingface.co/unsloth/Meta-Llama-3.1-70B/raw/main/config.json",
l8=>"https://huggingface.co/unsloth/Meta-Llama-3.1-8B/raw/main/config.json",
gptoss=>"https://huggingface.co/openai/gpt-oss-120b/blob/main/config.json",
gptosscard=>"https://huggingface.co/openai/gpt-oss-120b",
zart=>"https://zartbot.github.io/blog/model_arch/dsv41flash_arch/en.html",
dsv3cfg=>"https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/main/config.json",
qncfg=>"https://huggingface.co/Qwen/Qwen3-Next-80B-A3B-Instruct/blob/main/config.json",
klcfg=>"https://huggingface.co/moonshotai/Kimi-Linear-48B-A3B-Base/blob/main/config.json",
mm2cfg=>"https://huggingface.co/MiniMaxAI/MiniMax-M2/blob/main/config.json",
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
a=s.index('id="t-read"');b=s.index('id="t-cmp"')
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
