#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, the error box, then one <script> per JS part, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_swa.js parts/12_js_moe.js parts/13_js_read.js parts/14_js_line.js parts/15_js_fit.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{my $hf="https://huggingface.co/mistralai/";my $mn="https://mistral.ai/news/";my $dc="https://docs.mistral.ai/models/model-cards/";%A=(
wiki=>"https://en.wikipedia.org/wiki/Mistral_AI",
tt=>"https://www.techtimes.com/articles/319798/20260706/mistral-ai-targets-frontier-gap-open-weight-model-entering-july-early-access.htm",
m7p=>"https://arxiv.org/abs/2310.06825", mixp=>"https://arxiv.org/abs/2401.04088", magp=>"https://arxiv.org/abs/2506.10910", ppo=>"https://arxiv.org/abs/1707.06347",
m7=>$mn."announcing-mistral-7b", mixn=>$mn."mixtral-of-experts", x22=>$mn."mixtral-8x22b", m3=>$mn."mistral-3", s4=>$mn."mistral-small-4",
m35post=>$mn."vibe-remote-agents-mistral-medium-3-5", dev2=>$mn."devstral-2-vibe-cli", large1=>$mn."mistral-large", large2=>$mn."mistral-large-2407",
cod=>$mn."codestral", mamba=>$mn."codestral-mamba", nemo=>$mn."mistral-nemo", pix=>$mn."pixtral-12b", pixl=>$mn."pixtral-large", ministraux=>$mn."ministraux",
small3=>$mn."mistral-small-3", small31=>$mn."mistral-small-3-1", med3=>$mn."mistral-medium-3", devn=>$mn."devstral", mag=>$mn."magistral", vox=>$mn."voxtral",
voxt2=>$mn."voxtral-transcribe-2", vtts=>$mn."voxtral-tts", lean=>$mn."leanstral", lean15=>$mn."leanstral-1-5", ocr4=>$mn."ocr-4", robo=>$mn."robostral-navigate",
shieldn=>$mn."shieldstral", compute=>$mn."mistral-compute", raise=>$mn."mistral-ai-raises-1-7-b-to-accelerate-technological-progress-with-ai",
vibe=>$mn."vibe-agent", forge=>$mn."forge", region=>$mn."regional-inference-open-models-new-compute", emmi=>$mn."accelerate-ai-native-industry",
munich=>$mn."hallo-deutschland", moz=>$mn."mistral-x-mozilla/", news=>"https://mistral.ai/news",
tc=>"https://techcrunch.com/2026/09/08/mistral-raises-e3b-as-sovereign-ai-becomes-big-business/",
gig=>"https://gigazine.net/gsc_news/en/20260917-firefox-ai-mozilla-mistral/",
models=>"https://docs.mistral.ai/models/overview", shield=>$dc."shieldstral-1-0", m35doc=>$dc."mistral-medium-3-5-26-04", l3doc=>$dc."mistral-large-3-25-12",
cod2508=>$dc."codestral-25-08", ocr41=>$dc."ocr-4-1",
l3card=>$hf."Mistral-Large-3-675B-Instruct-2512", s4card=>$hf."Mistral-Small-4-119B-2603", m35card=>$hf."Mistral-Medium-3.5-128B",
m35lic=>$hf."Mistral-Medium-3.5-128B/blob/main/LICENSE", shieldhf=>$hf."Shieldstral-1.0-3B", leanhf=>$hf."Leanstral-1.5-119B-A6B",
vttshf=>$hf."Voxtral-4B-TTS-2603", vrthf=>$hf."Voxtral-Mini-4B-Realtime-2602",
min3=>$hf."Ministral-3-3B-Instruct-2512", min8=>$hf."Ministral-3-8B-Instruct-2512", min14=>$hf."Ministral-3-14B-Instruct-2512",
cfg7=>$hf."Mistral-7B-v0.1/blob/main/config.json", cfgx7=>$hf."Mixtral-8x7B-v0.1/blob/main/config.json", cfgx22=>$hf."Mixtral-8x22B-v0.1/blob/main/config.json",
cfgl3=>$hf."Mistral-Large-3-675B-Instruct-2512/blob/main/params.json", cfgs4=>$hf."Mistral-Small-4-119B-2603/blob/main/params.json",
cfgm35=>$hf."Mistral-Medium-3.5-128B/blob/main/params.json", cfgd2=>$hf."Devstral-2-123B-Instruct-2512/blob/main/params.json",
cfgds2=>$hf."Devstral-Small-2-24B-Instruct-2512/blob/main/params.json", cfgmin3=>$hf."Ministral-3-3B-Instruct-2512/blob/main/params.json",
cfgmin8=>$hf."Ministral-3-8B-Instruct-2512/blob/main/params.json", cfgmin14=>$hf."Ministral-3-14B-Instruct-2512/blob/main/params.json",
dsv3=>"https://huggingface.co/deepseek-ai/DeepSeek-V3/blob/main/config.json",
apache=>"https://www.apache.org/licenses/LICENSE-2.0", llama=>"https://github.com/meta-llama/llama-models/blob/main/models/llama3_1/LICENSE",
h200=>"https://www.nvidia.com/en-us/data-center/h200/", h100=>"https://www.nvidia.com/en-us/data-center/h100/",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
benchlm=>"https://benchlm.ai/model-updates/providers/mistral", seren=>"https://serenitiesai.com/articles/mistral-ai-models-2026-complete-guide",
);}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);$u=$u=~m{^@(\w+)$}?($A{$1}||die "alias $1"):$u;$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; fi
wc -c ../index.html
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
