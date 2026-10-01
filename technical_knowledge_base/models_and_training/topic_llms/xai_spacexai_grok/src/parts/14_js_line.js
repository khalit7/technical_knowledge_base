// ---- Lineage tab: lanes on one time axis, cards below ----
const U={wg:'https://en.wikipedia.org/wiki/Grok_(chatbot)',wsx:'https://en.wikipedia.org/wiki/SpaceXAI',s1:'https://www.sec.gov/Archives/edgar/data/1181412/000162828026036936/spaceexplorationtechnologi.htm',
 verge:'https://www.theverge.com/ai-artificial-intelligence/925469/xai-is-becoming-spacexai',bi:'https://www.businessinsider.com/xai-rebrand-spacexai-new-logo-x-handle-spacex-2026-7',
 sa46:'https://siliconangle.com/2026/08/12/spacexai-releases-flagship-grok-4-6-model-advanced-reasoning-capabilities/',mtp45:'https://www.marktechpost.com/2026/07/08/spacexai-releases-grok-4-5/',
 g1os:'https://x.ai/news/grok-os',g3:'https://x.ai/news/grok-3',g4:'https://x.ai/news/grok-4',g47:'https://x.ai/news/grok-4-7',g2:'https://huggingface.co/xai-org/grok-2',
 xdrn:'https://docs.x.ai/developers/release-notes',xdret:'https://docs.x.ai/developers/migration/may-15-retirement',adv:'https://adversa.ai/blog/cryptographic-context-injection-grok-data-theft/',aa47:'https://artificialanalysis.ai/articles/benchmarking-grok-4-7'};
(function(){
  if(!$('lnSvg'))return;
  const LANES=[['corp','Company'],['comp','Compute'],['flag','Flagship'],['fast','Fast, coding, agents'],['open','Open weights']];
  // d: ISO date; a: true when only the month is known; h: hollow (a passed target)
  const E=[
   ['corp','2023-03-09',0,'xAI incorporated','Founded by Elon Musk and 11 researchers; announced on 12 July 2023.','wsx'],
   ['flag','2023-11-03',0,'Grok-1','Previewed to X Premium users as "the best we could do with 2 months of training"; 314B MoE, pretraining finished in October 2023.','wg'],
   ['open','2024-03-17',0,'Grok-1 weights','Base weights and architecture released under Apache 2.0: 314B parameters, 8 experts, 2 active.','g1os'],
   ['flag','2024-03-29',0,'Grok-1.5','Announced with a 128,000-token context; released to all X Premium users on 15 May 2024. Grok-1.5V never shipped.','wg'],
   ['flag','2024-08-14',0,'Grok-2','Grok-2 and Grok-2 mini, with image generation through Flux.','wg'],
   ['fast','2024-08-14',0,'Grok-2 mini','The "small but capable sibling" released the same day.','wg'],
   ['comp','2024-12-01',1,'Colossus online','Fully operational in December 2024 after a 122-day build; the S-1 puts the first cluster at about 100,000 H100s and 130 MW.','s1'],
   ['flag','2025-02-17',0,'Grok 3','Think mode and DeepSearch; "10x the compute of previous state-of-the-art models". AIME 2025 headline at cons@64.','g3'],
   ['comp','2025-02-17',0,'200,000 GPUs','Grok 3\'s post: "preparing to train even larger models on our 200,000 GPU cluster".','g3'],
   ['corp','2025-03-28',0,'X Merger','xAI acquires X Holdings, owner of the X social network: the firehose becomes in-house data.','s1'],
   ['flag','2025-07-09',0,'Grok 4 and Heavy','RL "at a pretraining scale"; Heavy runs parallel attempts. ARC-AGI-2 15.9%; Heavy "first model to score 50%" on HLE (xAI\'s runs).','g4'],
   ['open','2025-08-23',1,'Grok 2 weights','Grok 2 (Wikipedia: Grok 2.5) opened in August 2025 under the xAI Community License, not Apache 2.0; about 500 GB, 8 GPUs.','g2'],
   ['fast','2025-08-28',0,'Grok Code Fast 1','Fast, cheap reasoning model for agentic coding. Retired 15 May 2026.','wg'],
   ['fast','2025-09-19',1,'Grok 4 Fast','September 2025; 2M context and about 40% fewer thinking tokens than Grok 4 (Artificial Analysis, via Wikipedia).','wg'],
   ['flag','2025-11-17',0,'Grok 4.1','After a two-week silent rollout; reduced hallucinations by xAI\'s account.','wg'],
   ['fast','2025-11-17',0,'Grok 4.1 Fast','Agentic, tool-calling variant with a 2M-token context and the Agent Tools API. Retired 15 May 2026.','wg'],
   ['comp','2025-12-30',0,'Toward 1 million GPUs','Third Memphis building bought; nearly 2 GW of training capacity planned and at least 1 million GPUs.','wsx'],
   ['flag','2025-12-31',0,'Grok 5 target: late 2025','A stated target that passed. Unconfirmed against a primary source here.','',1],
   ['corp','2026-02-02',0,'SpaceX acquires xAI','The S-1\'s "xAI Merger", effective 2 February 2026: all-stock, xAI at $250B, $1.25T combined (Wikipedia). Not yet SpaceXAI.','s1'],
   ['flag','2026-02-15',1,'Grok 4.20','February 2026 by Wikipedia (uncited there); on the API with a multi-agent version in March.','wg'],
   ['fast','2026-03-15',1,'Grok 4.20 Multi-agent','4 or 16 agents with a leader; every agent\'s tokens billed.','xdrn'],
   ['flag','2026-03-31',0,'Grok 5 target: Q1 2026','Passed. Unconfirmed against a primary source here.','',1],
   ['flag','2026-04-15',1,'Grok 4.3','April 2026: new pretrained model, December 2025 cutoff, 1M context, $1.25 / $2.50.','wg'],
   ['corp','2026-04-21',0,'Cursor option','SpaceX may buy Cursor for $60B later in 2026, or pay $10B for joint work.','wsx'],
   ['corp','2026-05-06',0,'"SpaceXAI" first used','In announcing the Anthropic compute deal, the company calls itself SpaceXAI for the first time The Verge had seen.','verge'],
   ['comp','2026-05-06',1,'Anthropic rents Colossus','May 2026: cloud services agreements across Colossus and Colossus II, $1.25B a month through May 2029.','s1'],
   ['fast','2026-05-14',1,'Grok Build and Build 0.1','May 2026: the terminal coding agent (beta) and a model trained for agentic coding.','xdrn'],
   ['fast','2026-05-15',0,'Retirements','Grok 4.1 Fast, 4 Fast, 4 (0709), Code Fast 1 and Grok 3 retired; slugs redirect to Grok 4.3 or Build 0.1 at their prices.','xdret'],
   ['corp','2026-05-20',0,'S-1 filed','Colossus build times, the Anthropic contract, and "Grok 5, which is currently being trained at COLOSSUS II".','s1'],
   ['corp','2026-06-03',0,'Injection reported','Adversa AI reports cryptographic context injection to xAI and HackerOne. No fix by 19 August.','adv'],
   ['corp','2026-06-15',1,'Nasdaq listing','June 2026: SpaceX lists via the largest IPO on record.','sa46'],
   ['flag','2026-06-30',0,'Grok 5 target: Q2 2026','Passed. In training at Colossus II per the S-1; no date. Target unconfirmed here.','',1],
   ['corp','2026-07-06',0,'Rebrand to SpaceXAI','New logo and X handle: xAI becomes SpaceXAI.','bi'],
   ['flag','2026-07-08',0,'Grok 4.5','First release under the SpaceXAI name; tens of thousands of GB300s, Cursor data, $2 / $6.','mtp45'],
   ['fast','2026-07-14',0,'Grok Build upload incident','Whole repositories uploaded to a SpaceXAI bucket despite the opt-out; disabled the same day.','wg'],
   ['fast','2026-08-11',0,'Grok Bot','Beta: durable agents on a persistent cloud computer. Grok 4.7 is trained for this harness.','wg'],
   ['flag','2026-08-12',0,'Grok 4.6','500K context, $2 / $6; index 61 on the pre-v4.2 scale, 44.3 on v4.3.','sa46'],
   ['corp','2026-08-14',0,'Cursor acquired','$60B all-stock acquisition closes; Cursor joins SpaceXAI.','wsx'],
   ['corp','2026-08-20',0,'Injection disclosed','Adversa publishes after 78 days without a fix: 40% of 20 attempts on Grok 4.5 Fast.','adv'],
   ['flag','2026-09-21',0,'Grok 4.7','Larger base, longer RL, native Grok Bot harness; Terminal-Bench 4.0 38.0% (xAI) or 33% (Artificial Analysis, Grok Build).','g47']
  ].map(r=>({l:r[0],d:r[1],a:r[2],t:r[3],x:r[4],s:r[5],h:!!r[6]}));
  const MO=['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dstr=e=>{const [y,m,d]=e.d.split('-').map(Number);return e.a?MO[m-1]+' '+y:d+' '+MO[m-1]+' '+y};
  const tv=s=>{const [y,m,d]=s.split('-').map(Number);return y+(m-1)/12+(d-1)/365};
  const isCorp=e=>e.l==='corp'||e.l==='comp';
  let range='all',filt='all',sel=null;
  function xs(W,pl,pr){if(range==='z'){const a=2026,b=2026+10/12;return v=>pl+(W-pl-pr)*(v-a)/(b-a)}
    const a=2023+2/12,mid=2026,b=2026+10/12,fr=0.5;return v=>v<mid?pl+(W-pl-pr)*(1-fr)*(v-a)/(mid-a):pl+(W-pl-pr)*((1-fr)+fr*(v-mid)/(b-mid))}
  function draw(){const W=Math.max(640,Math.min(900,($('lnSvg').clientWidth||880))),pl=118,pr=14,lh=58,top=26,H=top+LANES.length*lh+26,X=xs(W,pl,pr);let s='';
    const vis=E.filter(e=>(filt==='all'||(filt==='corp')===isCorp(e))&&(range==='all'||e.d>='2026'));
    const ticks=range==='z'?MO.slice(0,10).map((m,i)=>[2026+i/12,m.slice(0,3)]):[[2023+2/12,'Mar 2023'],[2024,'2024'],[2025,'2025'],[2026,'2026'],[2026.25,'Apr'],[2026.5,'Jul'],[2026+8/12,'Sep']];
    ticks.forEach(([v,l])=>{s+='<line x1="'+X(v)+'" x2="'+X(v)+'" y1="'+(top-6)+'" y2="'+(H-22)+'" stroke="var(--line)"/><text x="'+X(v)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+l+'</text>'});
    LANES.forEach(([k,n],i)=>{const y=top+i*lh+lh/2;s+='<text x="8" y="'+(y+4)+'" font-size="12" fill="var(--ink)">'+n+'</text><line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--dim)"/>'});
    const placed={};
    vis.forEach(e=>{const i=LANES.findIndex(l=>l[0]===e.l),y=top+i*lh+lh/2,x=X(tv(e.d)),c=e.l==='flag'?'var(--c2)':e.l==='open'?'var(--open)':e.l==='fast'?'var(--c1)':e.l==='comp'?'var(--c3)':'var(--closed)',on=sel===e;
      const key=e.l;placed[key]=(placed[key]||0)+1;const up=(placed[key]%2===0);
      s+='<g data-i="'+E.indexOf(e)+'" style="cursor:pointer"><title>'+e.t+', '+dstr(e)+'</title><circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="'+(on?8:6)+'" fill="'+(e.h?'var(--bg)':c)+'" stroke="'+(on?'var(--ink)':c)+'" stroke-width="'+(on?2.5:1.6)+'"'+(e.h?' stroke-dasharray="2 2"':'')+'/><circle cx="'+x.toFixed(1)+'" cy="'+y+'" r="13" fill="transparent"/>';
      if(!e.h&&(e.l==='flag'||(range==='z'&&e.l==='fast')))s+='<text x="'+x.toFixed(1)+'" y="'+(up?y+21:y-11)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+e.t.replace(/^Grok 5 target: /,'G5? ').replace(/ and Heavy/,'').slice(0,range==='z'?24:12)+'</text>';
      s+='</g>'});
    $('lnSvg').innerHTML=svgEl(W,H,s,'xAI lineage, '+vis.length+' events');
    $('lnSvg').querySelectorAll('g[data-i]').forEach(g=>g.addEventListener('click',()=>{sel=E[+g.dataset.i];draw();const c=document.getElementById('lnc'+g.dataset.i);if(c)c.scrollIntoView({block:'nearest'})}));
    $('lnCards').innerHTML=vis.slice().reverse().map(e=>'<div class="tl-item'+(sel===e?' sel':'')+'" id="lnc'+E.indexOf(e)+'"><h3>'+e.t+'</h3><div class="dt">'+dstr(e)+' · '+LANES.find(l=>l[0]===e.l)[1]+(e.h?' · passed target':'')+'</div><p style="margin:4px 0 0;font-size:14px">'+e.x+(e.s?' ('+A(U[e.s],'source')+')':' <span class="ill">unconfirmed</span>')+'</p></div>').join('')}
  segBind('lnR',v=>{range=v;draw()});
  const ch=$('lnF');ch.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{ch.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));filt=b.dataset.m;draw()}));
  onTab('t-line',draw);
})();
