// ---- Lineage tab: lanes per tier plus API changes ----
(function(){
  const L={h:'Haiku',s:'Sonnet',o:'Opus',m:'Mythos class',g:'Before tiers',a:'API changes'};
  const LC={h:'var(--c6)',s:'var(--c1)',o:'var(--c4)',m:'var(--c2)',g:'var(--mute)',a:'var(--c3)'};
  const E=[
   ['2023-03-14','g','Claude 1 and Claude Instant','Anthropic\'s first public models; API in early access. 9K-token context.','','{{Anthropic|@n1}}'],
   ['2023-05-11','a','100K context','The context window grows from 9K to 100K tokens, well ahead of rivals.','','{{Anthropic|@k100}}'],
   ['2023-07-11','g','Claude 2','Better coding, maths and reasoning; 100K context.','','{{Anthropic|@n2}}'],
   ['2023-11-21','g','Claude 2.1','200K-token context, system prompts, tool use in beta.','','{{hidekazu-konishi|@hk}}'],
   ['2024-03-04','o','Claude 3 Opus, Sonnet, Haiku','The three-tier ladder from one training programme; vision on every tier. Haiku followed on 13 March.','','{{Anthropic|@n3}}'],
   ['2024-06-20','s','Claude 3.5 Sonnet','Beats 3 Opus on Anthropic\'s agentic coding test, 64% against 38%, at twice the speed. (Anthropic\'s post is dated 21 June.)','$3 / $15','{{Anthropic|@n35}}'],
   ['2024-10-22','a','Computer use (beta)','With the upgraded 3.5 Sonnet and 3.5 Haiku: screenshots in, mouse and keyboard actions out.','','{{Anthropic|@ncu}}'],
   ['2024-10-22','h','Claude 3.5 Haiku','The small tier of 3.5.','','{{Wikipedia|@wiki}}'],
   ['2025-02-24','s','Claude 3.7 Sonnet','Hybrid reasoning in one model; the caller sets budget_tokens, up to the 128K output limit. Claude Code research preview.','$3 / $15','{{Anthropic|@n37}}'],
   ['2025-05-22','o','Claude Opus 4 and Sonnet 4','72.5% (Opus) and 72.7% (Sonnet) on SWE-bench Verified; thinking with tool use in beta; memory files; Claude Code generally available.','$15 / $75 (Opus)','{{Anthropic|@n4}}'],
   ['2025-08-05','o','Claude Opus 4.1','Coding upgrade of Opus 4 (74.5% on SWE-bench Verified). Retired on the Claude API on 5 August 2026.','$15 / $75','{{Anthropic|@n41}}'],
   ['2025-08-12','a','1M context beta','Sonnet 4 accepts 1M tokens of context in beta.','','{{Anthropic|@n1m}}'],
   ['2025-09-29','s','Claude Sonnet 4.5','With the memory tool and context editing for long agent sessions.','$3 / $15','{{Anthropic|@ns45}}'],
   ['2025-10-15','h','Claude Haiku 4.5','First Haiku with extended thinking and computer use; the current Haiku.','$1 / $5','{{Anthropic|@nh45}}'],
   ['2025-11-24','o','Claude Opus 4.5','Opus price cut to a third; the effort parameter arrives: medium effort matches Sonnet 4.5\'s best SWE-bench Verified score with 76% fewer output tokens.','$5 / $25','{{Anthropic|@no45}}'],
   ['2026-02-05','o','Claude Opus 4.6','Adaptive thinking with effort low to max; budget_tokens deprecated; 1M context (beta at launch, standard price today).','$5 / $25','{{Anthropic|@no46}}'],
   ['2026-02-17','s','Claude Sonnet 4.6','Coding and computer-use gains; the last model on the old tokenizer.','$3 / $15','{{Anthropic|@ns46}}'],
   ['2026-04-07','m','Claude Mythos Preview','Withheld from general release for its vulnerability-finding ability; Project Glasswing partners only, $100M in credits.','$25 / $125','{{Anthropic|@glass}}'],
   ['2026-04-16','o','Claude Opus 4.7','xhigh effort; new tokenizer (about 30% more tokens); budget_tokens and non-default sampling parameters rejected; task budgets in beta.','$5 / $25','{{Anthropic|@no47}}'],
   ['2026-05-28','o','Claude Opus 4.8','Honesty and reliability in code review; the fallback model for Fable 5\'s and Opus 5.5\'s cyber safeguards.','$5 / $25','{{Anthropic|@no48}}'],
   ['2026-06-09','m','Fable 5 and Mythos 5','The Mythos class becomes a tier above Opus: one model, Fable with classifiers, Mythos without for approved partners. Access suspended 12 June to 1 July.','$10 / $50','{{Anthropic|@nf5}}'],
   ['2026-06-30','s','Claude Sonnet 5','Near-Opus capability at Sonnet cost; the introductory $2 / $10 became the standard price.','$2 / $10','{{Anthropic|@ns5}}'],
   ['2026-07-24','o','Claude Opus 5','"Close to the frontier intelligence of Claude Fable 5 at half the price", six weeks after Fable 5.','$5 / $25','{{Anthropic|@no5}}'],
   ['2026-08-31','a','Prefix check on by default','Preserved thinking\'s prefix check is enforced by default for accounts created from this date.','','{{preserved thinking|@pres}}'],
   ['2026-09-01','m','Fable 5.1 and Mythos 5.1','Long-horizon gains (Terminal-Bench 4.0 42.0% to 55.8%); cache reads cut 75% to $0.25; preserved thinking; Enterprise Frontier Safeguards.','$10 / $50','{{Anthropic|@fab51}}'],
   ['2026-09-22','o','Claude Opus 5.5','Beats Fable 5.1 on every row of Anthropic\'s table, three weeks later, at 40% of its price; thinking always on; default effort medium. Haiku 5.5 promised "in the coming weeks".','$4 / $20','{{Anthropic|@op55}}'],
   ['2026-09-28','s','Claude Sonnet 5.5','Close to Opus 5.5 at half the price; between_tools replaces disabled thinking; thinking blocks bound to the account.','$2 / $10','{{Anthropic|@so55}}'],
   ['2026-09-30','a','Sonnet 4.5 deprecated','Retires 30 November 2026, 61 days later; replacement Sonnet 5.5.','','{{model deprecations|@depr}}']
  ].map(([d,k,n,t,pr,src],i)=>({d:new Date(d+'T00:00:00Z'),k,n,t,pr,src,id:'ln'+i}));
  let range='all',filt='all';const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dlab=e=>e.d.getUTCDate()+' '+mon[e.d.getUTCMonth()]+' '+e.d.getUTCFullYear();
  const SH=n=>n.replace(/^Claude /,'').replace(' and Claude Instant','').replace(' Opus, Sonnet, Haiku','').replace('Opus 4 and Sonnet 4','4 (Opus, Sonnet)').replace(' and Mythos 5.1','').replace(' and Mythos 5','');
  function draw(){
    const narrow=$('lnSvg').clientWidth<560,W=narrow?560:880,pl=narrow?62:84,pr=14;
    const t0=range==='all'?Date.UTC(2023,1,1):Date.UTC(2026,0,1),t1=Date.UTC(2026,9,20),T26=Date.UTC(2026,0,1),split=range==='all'?0.45:0;
    const x=t=>{const w=W-pl-pr;if(range!=='all')return pl+w*(t-t0)/(t1-t0);return t<T26?pl+w*split*(t-t0)/(T26-t0):pl+w*(split+(1-split)*(t-T26)/(t1-T26))};
    const ev=E.filter(e=>+e.d>=t0&&(filt==='all'||(filt==='api')===(e.k==='a')));
    const lanes=['m','o','s','h','g','a'].filter(k=>range==='all'||k!=='g');const LH=46,top=18,H=top+lanes.length*LH+22;let s='';
    const tick=(xx,l)=>'<line x1="'+xx+'" x2="'+xx+'" y1="'+top+'" y2="'+(H-18)+'" stroke="var(--line)" stroke-dasharray="3 3"/><text x="'+(xx+3)+'" y="'+(H-5)+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';
    if(range==='all')[2024,2025,2026].forEach(y=>s+=tick(x(Date.UTC(y,0,1)),String(y)));else for(let m=1;m<=9;m++)s+=tick(x(Date.UTC(2026,m,1)),mon[m]);
    lanes.forEach((k,li)=>{const y=top+li*LH+LH/2;s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(y+4)+'" font-size="11" text-anchor="end" fill="'+LC[k]+'" font-weight="600">'+L[k]+'</text>'});
    // labels: alternate above and below the lane line, pushed apart
    const placed={};
    ev.sort((a,b)=>a.d-b.d).forEach(e=>{const li=lanes.indexOf(e.k);if(li<0)return;const y=top+li*LH+LH/2,xx=x(+e.d),lab=SH(e.n),lw=lab.length*5.6+6;
      const P=placed[e.k]=placed[e.k]||{up:[],dn:[]};let side=P.up.length<=P.dn.length?'up':'dn';
      const fits=arr=>!arr.some(([a,b])=>xx<b&&xx+lw>a);if(!fits(P[side])&&fits(P[side==='up'?'dn':'up']))side=side==='up'?'dn':'up';
      const end=xx+lw>W-4;P[side].push(end?[xx-lw,xx]:[xx,xx+lw]);const ty=side==='up'?y-8:y+16;
      s+='<g class="lnd" data-id="'+e.id+'" style="cursor:pointer"><circle cx="'+xx+'" cy="'+y+'" r="5.5" fill="'+LC[e.k]+'"/><text x="'+(xx+(end?-3:3))+'" y="'+ty+'" font-size="10.5"'+(end?' text-anchor="end"':'')+'>'+lab+'</text><title>'+dlab(e)+': '+e.n+'</title></g>'});
    $('lnSvg').innerHTML='<div class="tw">'+svgEl(W,H,s,'Claude releases and API changes on a time axis').replace('<svg ','<svg style="min-width:'+(narrow?520:600)+'px" ')+'</div>';
    $('lnSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{const c=$(g.dataset.id);if(!c)return;document.querySelectorAll('.tl-item').forEach(x=>x.classList.toggle('sel',x===c));c.scrollIntoView({block:'center',behavior:'smooth'})}));
    $('lnCards').innerHTML=ev.map(e=>'<div class="tl-item" style="border-left:4px solid '+LC[e.k]+'" id="'+e.id+'"><h3>'+e.n+'</h3><div class="dt">'+dlab(e)+' · '+L[e.k]+(e.pr?' · '+e.pr+' per 1M tokens':'')+' · '+e.src+'</div><p style="margin:4px 0 0;font-size:14px">'+e.t+'</p></div>').join('');
  }
  segBind('lnR',m=>{range=m;draw()});
  const F=$('lnF');F.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{F.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));filt=b.dataset.m;draw()}));
  onTab('t-line',draw);
})();
