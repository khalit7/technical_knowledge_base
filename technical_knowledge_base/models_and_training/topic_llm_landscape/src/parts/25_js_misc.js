// ---- Where the thinking goes: one schematic per design ----
(function(){
  const $=id=>document.getElementById(id);
  const M={
    router:{who:'OpenAI GPT-5.x and GPT-6',where:'A per-request router decides whether to answer at once or reason first.',sees:'A tier and an effort setting; the reasoning is not returned.',cost:'Latency and cost vary per call, and choosing a tier (Astra, Sol, Luna) is a routing decision on top of the model\'s own ('+A('https://venturebeat.com/technology/openai-releases-gpt-6-sol-and-luna-models-slashing-api-costs-50-or-more','VentureBeat')+').'},
    effort:{who:'Anthropic Claude',where:'Thinking tokens; the caller sets an effort level and the model decides step by step how long to think. On Opus 5.5 thinking cannot be switched off.',sees:'A summary of the thinking, or nothing; never the raw chain of thought.',cost:'Every thinking token is billed as output, so the bill exceeds the visible text ('+A('https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf','Opus 5.5 system card')+').'},
    branch:{who:'Google Gemini Deep Think',where:'Several reasoning branches in parallel, then a selection among them.',sees:'A mode switch.',cost:'Several traces per query: better where the answer can be checked, more expensive per query.'},
    loop:{who:'OpenAI GPT-6 Astra (recurrent depth)',where:'Activations loop back through the model\'s own layers, so part of the deliberation is spent in latent space and never becomes text. Its use is reportedly limited ('+A('https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/','TechCrunch')+'); OpenAI\'s announcement does not describe the architecture ('+A('https://openai.com/index/gpt-6-astra/','OpenAI')+').',sees:'Nothing: the latent part leaves no transcript.',cost:'A safety monitor cannot read it ('+A('https://techcrunch.com/2026/09/02/openais-new-reasoning-technique-alarms-ai-safety-experts/','TechCrunch')+'), a harness cannot rebuild the working state from the transcript, and serving must keep the state between requests.'}
  };
  const box=(x,y,w,h,t,cls)=>'<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="7" fill="'+(cls||'var(--soft)')+'" stroke="var(--line)"/><text x="'+(x+w/2)+'" y="'+(y+h/2+5)+'" font-size="13" text-anchor="middle">'+t+'</text>';
  const arr=(x1,y1,x2,y2,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.5" marker-end="url(#ah)"'+(d?' stroke-dasharray="4 3"':'')+'/>';
  const tok=(x,y,n,col,label)=>{let s='';for(let i=0;i<n;i++)s+='<rect x="'+(x+i*15)+'" y="'+y+'" width="11" height="11" rx="2" fill="'+col+'"/>';return s+(label?'<text x="'+x+'" y="'+(y+26)+'" font-size="11.5" fill="var(--mute)">'+label+'</text>':'')};
  function svg(m){
    let s='<svg viewBox="0 0 640 190" role="img" aria-label="Schematic"><defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
    s+=box(10,75,90,40,'Request');s+=box(540,75,90,40,'Answer','var(--acc2)');
    if(m==='router'){s+='<polygon points="160,95 195,70 230,95 195,120" fill="var(--soft)" stroke="var(--line)"/><text x="195" y="100" font-size="12" text-anchor="middle">router</text>';s+=arr(100,95,158,95);s+=arr(195,70,420,40);s+=arr(195,120,420,150);s+=box(330,20,180,36,'answer at once');s+=box(330,132,180,36,'reason first');s+=tok(345,108,8,'var(--dim)','reasoning, not returned');s+=arr(510,38,540,85);s+=arr(510,150,540,105)}
    if(m==='effort'){s+=box(150,75,150,40,'Claude');s+='<text x="225" y="40" font-size="12" text-anchor="middle" fill="var(--acc)">caller sets effort</text>'+arr(225,46,225,73);s+=arr(100,95,148,95);s+=tok(320,88,10,'var(--c5)','thinking tokens: billed, returned as summary or empty');s+=arr(470,95,538,95)}
    if(m==='branch'){s+=arr(100,95,140,95);[35,75,115,155].forEach((y,i)=>{s+=arr(140,95,190,y+5);s+=tok(195,y,8,'var(--c5)','');s+=arr(320,y+5,380,95)});s+=box(380,75,110,40,'select');s+=arr(490,95,538,95);s+='<text x="255" y="185" font-size="11.5" text-anchor="middle" fill="var(--mute)">parallel branches</text>'}
    if(m==='loop'){s+=box(200,60,170,70,'');for(let i=0;i<4;i++)s+='<rect x="'+(212+i*38)+'" y="72" width="30" height="46" rx="3" fill="var(--acc2)"/>';s+='<text x="285" y="150" font-size="11.5" text-anchor="middle" fill="var(--mute)">layers, looped: no tokens emitted</text>';s+='<path d="M360,60 C410,10 160,10 210,60" fill="none" stroke="var(--bad)" stroke-width="2" marker-end="url(#ah)"/><text x="285" y="22" font-size="12" text-anchor="middle" fill="var(--bad)">recurrent state</text>';s+=arr(100,95,198,95);s+=arr(370,95,538,95)}
    return s+'</svg>';
  }
  function draw(m){const d=M[m];$('thSvg').innerHTML=svg(m);$('thKv').innerHTML='<dt>Who</dt><dd>'+d.who+'</dd><dt>Where it goes</dt><dd>'+d.where+'</dd><dt>Caller sees</dt><dd>'+d.sees+'</dd><dt>What it costs</dt><dd>'+d.cost+'</dd>'}
  document.querySelectorAll('#thM button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#thM button').forEach(x=>x.classList.toggle('on',x===b));draw(b.dataset.m)}));
  draw('router');
})();
// ---- Choosing ----
(function(){
  const $=id=>document.getElementById(id);
  const C=[
    ['A closed frontier model','Claude Opus 5.5 tops the index at 57.6, with GPT-6 Astra and Gemini 4 Argon near 52.7 ('+A(AA,'AA')+'), but each lab leads somewhere on its own table: Astra on Terminal-Bench-Science 0.1 ('+A('https://www-cdn.anthropic.com/fc1b44717c85dc068bc6ba5024219938094694bd/Claude%20Opus%205.5%20System%20Card.pdf','Anthropic')+'), Argon on AutomationBench at 51.3% ('+A('https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-4-argon/','Google')+'). Test on your own task.','The top of the range.','The most per task ($2 to $6 on the index), and the least view of the reasoning.'],
    ['A cheaper closed tier','GPT-6.1 Sol scores 51.8 for $0.72 a task, Claude Sonnet 5.5 at medium effort 40.7 for $0.59, Gemini 3.8 Flash 40.9 for $1.24 ('+A(AA,'AA')+').','Most of the capability at a fraction of the cost.','A gap on the hardest tasks; a model that takes more steps can erase its token-price advantage.'],
    ['Open weights','MiMo-V2.6-Pro scores 46.3 for $0.13 a task through its API ('+A(AA,'AA')+'). To self-host, total parameters set the memory you buy and active parameters the speed you get. Check the licence of the exact checkpoint: MIT and Apache 2.0 sit beside custom and non-commercial licences.','Control, custody of your data, fine-tuning, and the lowest prices.','The serving work, and about 11 points to the top closed model on the index.'],
    ['A fully open model','Ai2\'s OLMo and IFM\'s K2 Horizon publish the data and the recipe, which contamination audits, data ablations and training-dynamics studies need.','Reproducibility.','Distance from the capability frontier.'],
    ['A small dense or heavily quantised model','Bonsai 2 27B fits in 5.9GB at 1.76 bits per weight ('+A('https://prismml.com/news/bonsai-2-27b','Prism ML')+'); gpt-oss-120b fits one 80GB card ('+A('https://www.infoq.com/news/2025/08/openai-gpt-oss/','InfoQ')+'); Gemma 4 and Muse Glimmer target local use.','Privacy and no per-token cost.','Capability.']
  ];
  function draw(i){const c=C[i];$('chD').innerHTML='<h3>'+c[0]+'</h3><p>'+c[1]+'</p><dl class="kv"><dt>Buys</dt><dd>'+c[2]+'</dd><dt>Costs</dt><dd>'+c[3]+'</dd></dl>'}
  document.querySelectorAll('#chF button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('#chF button').forEach(x=>x.classList.toggle('on',x===b));draw(+b.dataset.c)}));
  draw(0);
})();
// ---- Nav highlight ----
(function(){
  const links=[...document.querySelectorAll('#nav a')];
  function on(){let cur=links[0];for(const a of links){const s=document.querySelector(a.getAttribute('href'));if(s&&s.getBoundingClientRect().top<120)cur=a}links.forEach(a=>a.classList.toggle('cur',a===cur))}
  addEventListener('scroll',on,{passive:true});on();
})();
