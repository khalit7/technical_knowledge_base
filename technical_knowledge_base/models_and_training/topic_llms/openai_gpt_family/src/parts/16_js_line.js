// ---- Lineage tab: every release on one axis, by lane, with the bet it made ----
(function(){
  const LANES=[['b','GPT base and omni'],['o','Reasoning (o-series)'],['u','GPT-5.x and GPT-6'],['w','Open weights'],['p','Products and harness'],['x','Prices and safety']];
  const E=[
    ['2018-06-11','b','GPT-1','117M parameters, decoder-only, unsupervised pretraining then fine-tuning.','117M','{{Wikipedia|@wgpt1}}'],
    ['2019-02-14','b','GPT-2','1.5B; one objective gives usable zero-shot behaviour; staged release, full model in November 2019.','1.5B','{{OpenAI|@gpt2}}'],
    ['2020-05-28','b','GPT-3','175B dense; in-context learning, "few-shot learners"; API from 11 June 2020.','175B','{{GPT-3 paper|@gpt3}}'],
    ['2022-03-04','b','InstructGPT','SFT, reward model, PPO with a KL penalty; a 1.3B tuned model preferred to the 175B base.','1.3B','{{paper|@igpt}}'],
    ['2022-11-30','p','ChatGPT','Free research preview on GPT-3.5; Plus followed in February 2023.','','{{timeline|@hk}}'],
    ['2023-03-14','b','GPT-4','Text and image input; nothing disclosed about parameters, architecture or data; long system card.','not disclosed','{{timeline|@hk}}'],
    ['2023-11-06','b','GPT-4 Turbo','128K context, lower price, JSON mode and the Assistants API at DevDay.','not disclosed','{{timeline|@hk}}'],
    ['2024-05-13','b','GPT-4o','"Omni": text, audio and image in one model; voice latency at conversational speed.','not disclosed','{{timeline|@hk}}'],
    ['2024-09-12','o','o1-preview','RL on checkable problems; hidden chain of thought billed as reasoning tokens; accuracy scales with thinking time.','not disclosed','{{Learning to reason|@l2r}}'],
    ['2025-01-31','o','o3-mini','Smaller reasoning model.','not disclosed','{{timeline|@hk}}'],
    ['2025-04-14','b','GPT-4.1','API-only, for long-context and instruction-following workloads.','not disclosed','{{timeline|@hk}}'],
    ['2025-04-16','o','o3, o4-mini','Reasoning with full tool use and thinking over images.','not disclosed','{{timeline|@hk}}'],
    ['2025-08-05','w','gpt-oss','120b and 20b, Apache 2.0: MoE, MXFP4 experts, alternating 128-token windows, attention sinks; one 80 GB GPU.','116.8B / 5.1B active','{{model card|@oss}}'],
    ['2025-08-07','u','GPT-5','A fast model, a thinking model and a real-time router deciding per request.','not disclosed','{{timeline|@hk}}'],
    ['2025-09-15','p','GPT-5-Codex','The line post-trained for long-horizon agentic coding; Codex models through GPT-5.3-Codex.','not disclosed','{{timeline|@hk}}'],
    ['2025-11-12','u','GPT-5.1','Instant and Thinking as named models, so the user can bypass the router.','not disclosed','{{timeline|@hk}}'],
    ['2025-12-11','u','GPT-5.2','Next GPT-5.x step.','not disclosed','{{timeline|@hk}}'],
    ['2026-03-05','u','GPT-5.4','Native computer use, a 1M-token context option, tool search.','not disclosed','{{timeline|@hk}}'],
    ['2026-04-23','u','GPT-5.5','From here the mainline models ship directly in Codex.','not disclosed','{{timeline|@hk}}'],
    ['2026-07-09','u','GPT-5.6 Sol, Terra, Luna','Three named tiers, 1.05M window; $5/$30, $2.50/$15, $1/$6.','not disclosed','{{Simon Willison|@will}}'],
    ['2026-07-30','x','5.6 price cut','Luna −80% to $0.20/$1.20, Terra −20% to $2/$12, Sol unchanged.','','{{Eden AI|@eden}}'],
    ['2026-09-03','u','GPT-6 Astra','Flagship, $10/$50; Critical cyber grade; reported recurrent depth; pretrained on more than 100,000 GPUs at Stargate, Texas. OpenAI\'s launch table (as copied by {{CellCog|@cellcog}}; OpenAI\'s own runs and settings): Agents\' Last Exam 59.3% (GPT-5.6 Sol 53.6%, Claude Opus 5 55.5%); OSWorld 2.0 offline set 72.6% (Sol 65.7%; about 40 minutes a task, roughly 47% less time than Sol); ScreenSpot-Pro without tools 92.7% (76.9%); Terminal-Bench 4.0 57.9% (37.3%; Claude Fable 5.1 55.8%); Terminal-Bench-Science 0.1 64.6% (Fable 5.1 52.6%); AutomationBench 41.4% (18.1%; Fable 5.1 31.4%); BenchCAD with tools 95.9% (83.3%; Fable 5.1 84.3%); GPQA Diamond 96.0% (94.6%); ExploitBench without safeguards 100% (78.5%). A 98% on FrontierMath Tier 4 quoted at launch could not be traced to a primary source (unconfirmed).','not disclosed','{{model docs|@astra}}, {{Wikipedia|@wiki}}'],
    ['2026-09-03','p','ARC-AGI-3: 62.7% or 99.9%','Same weights, standard harness against Provider Adapter.','','{{ARC Prize|@arc}}'],
    ['2026-09-10','p','GPT-Live-1, Agents API','Full-duplex voice at $0.05 a minute; the Codex harness as a managed service.','','{{forum|@live}}'],
    ['2026-09-10','x','Pro $200 sign-ups paused','No reason given.','','{{CellCog|@cellcog}}'],
    ['2026-09-17','p','Astra for Law','Astra plus a 230M-URL legal index with case law from the Free Law Project\'s CourtListener (the claim that it covers more than 99.9% of published US precedential case law is not in the source read: unconfirmed): 54% against 38.7% on Legal Research Bench. Available to selected firms through Trusted Access in ChatGPT and Codex; zero data retention on the API; Latham &amp; Watkins is working with OpenAI on governance for information permissions and ethical walls.','','{{SiliconANGLE|@law}}'],
    ['2026-09-22','u','GPT-6 Sol, GPT-6 Luna','Half the GPT-5.6 prices: $2/$10 and $0.10/$0.50. OpenAI\'s figures for Sol: 68.8% on DeepSWE v1.1 at max effort; 33.2% on AutomationBench 1.0.6 at xhigh for $0.27 a task (Claude Opus 5 26.9% at max, 11.1 times the cost per task); 60.5% on OSWorld 2.0 at xhigh; 56.4% on Agents\' Last Exam; about half as many mistakes as GPT-5.6 Sol on an internal factuality evaluation. Luna: 66.6% on DeepSWE v1.1, at a task cost 93% below the compared Opus 5 configuration and 96% below Fable 5.','not disclosed','{{VentureBeat|@vb6}}'],
    ['2026-09-26','x','Training and tool use paused','After an agent escaped through DNS and another leaked a GitHub token.','','{{The Decoder|@decoder}}'],
    ['2026-09-28','x','GPT-6.1 Astra withheld; AISI report','Scope and honesty regressions; Astra ran more unsanctioned attacks than GPT-5.6 Sol in simulation.','','{{The Hacker News|@thn}}'],
    ['2026-09-29','u','GPT-6.1 Sol','Near Astra on DeepSWE and OSWorld at a fifth of the price; Ultrafast launched for Astra.','not disclosed','{{VentureBeat|@vb61}}']
  ].map(([d,k,n,t,sz,src],i)=>({d:Date.parse(d+'T00:00:00Z'),ds:d,k,n,t,sz,src,id:'ln'+i}));
  const BETS=[['2018-06-01','2022-01-01','pretraining scale'],['2022-01-01','2024-09-01','post-training'],['2024-09-01','2025-08-01','inference compute'],['2025-08-01','2026-07-01','router'],['2026-07-01','2026-09-02','tiers'],['2026-09-02','2026-10-15','inside the network, behind the API']].map(([a,b,n])=>[Date.parse(a),Date.parse(b),n]);
  const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const dl=e=>{const d=new Date(e.d);return d.getUTCDate()+' '+mon[d.getUTCMonth()]+' '+d.getUTCFullYear()};
  let range='all';
  function draw(){
    const t0=range==='all'?Date.UTC(2018,3,1):Date.UTC(2026,5,15),t1=Date.UTC(2026,9,10),T25=Date.UTC(2025,0,1);
    const W=900,pl=128,pr=14,w=W-pl-pr;
    const x=t=>range!=='all'?pl+w*(t-t0)/(t1-t0):(t<T25?pl+w*.42*(t-t0)/(T25-t0):pl+w*(.42+.58*(t-T25)/(t1-T25)));
    const ev=E.filter(e=>e.d>=t0).sort((a,b)=>a.d-b.d);
    // greedy label rows per lane
    const sn=e=>e.n.length>22?e.n.slice(0,21)+'…':e.n;
    const lanes={};LANES.forEach(([k])=>lanes[k]=[]);const pos=[];
    ev.forEach(e=>{const xx=x(e.d),lw=sn(e).length*5.9+10,end=xx+lw>W-4,x0=end?xx-lw:xx,x1=end?xx:xx+lw,L=lanes[e.k];let r=0;while((L[r]||[]).some(([a,b])=>x0<b&&x1>a))r++;(L[r]=L[r]||[]).push([x0,x1]);pos.push({e,xx,r,end})});
    const top=30;let y=top;const ly={};LANES.forEach(([k])=>{const n=Math.max(1,lanes[k].length);ly[k]={y0:y,n};y+=18+n*15});const H=y+22;
    let s='';
    BETS.forEach(([a,b,n],i)=>{if(b<t0)return;const xa=x(Math.max(a,t0)),xb=x(Math.min(b,t1));s+='<rect x="'+xa+'" y="'+(top-4)+'" width="'+Math.max(0,xb-xa)+'" height="'+(H-top-18)+'" fill="'+(i%2?'var(--soft)':'var(--bg)')+'"/>';if(xb-xa>40)s+='<text x="'+(xa+3)+'" y="'+(top-8)+'" font-size="10" fill="var(--mute)">'+n+'</text>'});
    LANES.forEach(([k,n])=>{const L=ly[k];s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+(L.y0+8)+'" y2="'+(L.y0+8)+'" stroke="var(--line)"/><text x="6" y="'+(L.y0+12)+'" font-size="11" font-weight="600" fill="var(--mute)">'+n+'</text>'});
    const tick=(t,l)=>{const xx=x(t);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(top-4)+'" y2="'+(H-16)+'" stroke="var(--line)" stroke-dasharray="3 3"/><text x="'+(xx+2)+'" y="'+(H-4)+'" font-size="10.5" fill="var(--mute)">'+l+'</text>'};
    if(range==='all'){[2019,2020,2021,2022,2023,2024].forEach(yr=>tick(Date.UTC(yr,0,1),yr));tick(T25,'2025 (scale widened)');tick(Date.UTC(2026,0,1),'2026')}
    else{[6,7,8,9].forEach(m=>tick(Date.UTC(2026,m,1),mon[m]+' 2026'))}
    const C={b:'var(--c1)',o:'var(--c2)',u:'var(--closed)',w:'var(--open)',p:'var(--c6)',x:'var(--bad)'};
    pos.forEach(({e,xx,r,end})=>{const L=ly[e.k],yy=L.y0+8,ty=yy+14+r*15;
      s+='<g class="lnd" data-id="'+e.id+'" style="cursor:pointer"><circle cx="'+xx+'" cy="'+yy+'" r="5" fill="'+C[e.k]+'"/>'+(r?'<line x1="'+xx+'" x2="'+xx+'" y1="'+yy+'" y2="'+(ty-9)+'" stroke="'+C[e.k]+'" stroke-opacity=".4"/>':'')+'<text x="'+(xx+(end?-3:3))+'" y="'+ty+'" font-size="10.5"'+(end?' text-anchor="end"':'')+'>'+sn(e)+'</text><title>'+dl(e)+': '+e.n+'</title></g>'});
    $('lnSvg').innerHTML=svgEl(W,H,s,'OpenAI releases and events on one time axis, by lane');
    $('lnSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{const c=$(g.dataset.id);document.querySelectorAll('.tl-item').forEach(q=>q.classList.toggle('sel',q===c));c.scrollIntoView({block:'center',behavior:'smooth'})}));
    $('lnCards').innerHTML=ev.map(e=>'<div class="tl-item" style="border-left:4px solid '+C[e.k]+'" id="'+e.id+'"><h3>'+e.n+'</h3><div class="dt">'+dl(e)+' · '+LANES.find(l=>l[0]===e.k)[1]+(e.sz?' · size: '+e.sz:'')+' · '+e.src+'</div><p style="margin:4px 0 0;font-size:14px">'+e.t+'</p></div>').join('');
  }
  segBind('lnR',m=>{range=m;draw()});onTab('t-line',draw);
})();
