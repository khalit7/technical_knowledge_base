#!/bin/sh
# Assemble ../index.html from parts/: head and CSS, the HTML parts in order, then the scripts, tabs last.
# Links in any part are written {{text|url}}; url may be an alias (@name, below) or n:<notion id>.
# They expand to <a href="url" target="_blank" rel="noopener noreferrer">text</a>.
cd "$(dirname "$0")"
{ cat parts/00_top.html parts/01_css.html parts/02_header.html parts/03_read_a.html parts/04_read_b.html parts/05_read_c.html parts/06_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_read.js parts/12_js_sim.js parts/13_js_line.js parts/14_js_cost.js parts/15a_aa_data.js parts/15_js_aa.js parts/16a_metr_data.js parts/16_js_metr.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } | perl -CSD -pe '
BEGIN{%A=(
fab51=>"https://www.anthropic.com/claude-fable-and-mythos-5-1",
vb=>"https://venturebeat.com/technology/anthropics-claude-fable-5-1-and-mythos-5-1-arrive-with-a-75-cost-reduction-for-fable-cache-reads",
op55=>"https://www.anthropic.com/claude-opus-5-5",
so55=>"https://www.anthropic.com/claude-sonnet-5-5",
vel=>"https://www.vellum.ai/blog/claude-opus-5-5-benchmarks-explained",
aaop=>"https://artificialanalysis.ai/models/claude-opus-5-5-medium",
aalb=>"https://artificialanalysis.ai/leaderboards/models",
aameth=>"https://artificialanalysis.ai/methodology/intelligence-benchmarking",
models=>"https://platform.claude.com/docs/en/models/overview",
pricing=>"https://platform.claude.com/docs/en/about-claude/pricing",
think=>"https://platform.claude.com/docs/en/build-with-claude/thinking",
effort=>"https://platform.claude.com/docs/en/build-with-claude/effort",
cache=>"https://platform.claude.com/docs/en/build-with-claude/prompt-caching",
pres=>"https://platform.claude.com/docs/en/build-with-claude/preserved-thinking",
depr=>"https://platform.claude.com/docs/en/about-claude/model-deprecations",
ctxw=>"https://platform.claude.com/docs/en/build-with-claude/context-windows",
cu=>"https://platform.claude.com/docs/en/agents-and-tools/tool-use/computer-use-tool",
cc=>"https://code.claude.com/docs/en/overview",
cai=>"https://arxiv.org/abs/2212.08073",
hk=>"https://hidekazu-konishi.com/entry/anthropic_claude_model_release_timeline.html",
toloka=>"https://toloka.ai/blog/claude-models-explained/",
wiki=>"https://en.wikipedia.org/wiki/Claude_(language_model)",
wanth=>"https://en.wikipedia.org/wiki/Anthropic",
n1=>"https://www.anthropic.com/news/introducing-claude",
k100=>"https://www.anthropic.com/news/100k-context-windows",
n2=>"https://www.anthropic.com/news/claude-2",
n21=>"https://www.anthropic.com/news/claude-2-1",
n3=>"https://www.anthropic.com/news/claude-3-family",
n35=>"https://www.anthropic.com/news/claude-3-5-sonnet",
ncu=>"https://www.anthropic.com/news/3-5-models-and-computer-use",
n37=>"https://www.anthropic.com/news/claude-3-7-sonnet",
n4=>"https://www.anthropic.com/news/claude-4",
n41=>"https://www.anthropic.com/news/claude-opus-4-1",
n1m=>"https://www.anthropic.com/news/1m-context",
ns45=>"https://www.anthropic.com/news/claude-sonnet-4-5",
nctx=>"https://www.anthropic.com/news/context-management",
nh45=>"https://www.anthropic.com/news/claude-haiku-4-5",
no45=>"https://www.anthropic.com/news/claude-opus-4-5",
no46=>"https://www.anthropic.com/news/claude-opus-4-6",
ns46=>"https://www.anthropic.com/news/claude-sonnet-4-6",
no47=>"https://www.anthropic.com/news/claude-opus-4-7",
no48=>"https://www.anthropic.com/news/claude-opus-4-8",
glass=>"https://www.anthropic.com/glasswing",
nf5=>"https://www.anthropic.com/news/claude-fable-5-mythos-5",
ns5=>"https://www.anthropic.com/news/claude-sonnet-5",
no5=>"https://www.anthropic.com/news/claude-opus-5",
efs=>"https://www.anthropic.com/news/enterprise-frontier-safeguards",
threat=>"https://www.anthropic.com/threat-intelligence-report-september-2026",
rswe=>"https://dev.to/shaam_ai/fable-51-vs-gpt-6-astra-vs-gemini-38-flash-on-real-swe-16k3",
circ=>"https://transformer-circuits.pub/2025/attribution-graphs/methods.html",
intro=>"https://transformer-circuits.pub/2025/introspection/index.html",
metr=>"https://metr.org/time-horizons",
metry=>"https://metr.org/assets/benchmark_results_1_1.yaml",
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
