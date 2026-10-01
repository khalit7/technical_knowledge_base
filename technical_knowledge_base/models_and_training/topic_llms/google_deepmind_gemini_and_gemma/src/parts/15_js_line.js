// ---- Lineage tab ----
(function(){
  const E=[
    ['2023-12-06','g','Gemini 1.0','Ultra, Pro and Nano (1.8B and 3.25B on device); natively multimodal from pretraining.','{{Wikipedia|@wgem}}'],
    ['2024-02-15','g','Gemini 1.5 Pro','Sparse MoE, 1M-token window (2M for every developer by mid-2024), &gt;99% retrieval to at least 10M tokens.','{{Gemini 1.5 report|@g15}}'],
    ['2024-02-21','o','Gemma','First open Gemma, 2B and 7B, under Google\'s Gemma terms.','{{Wikipedia|@wgemma}}'],
    ['2024-06-27','o','Gemma 2','2B, 9B, 27B; 2B and 9B distilled from a teacher; local and global layers 1:1, window 4,096.','{{Gemma 2 report|@g2}}'],
    ['2024-12-19','g','Gemini 2.0 Flash Thinking','Google\'s first reasoning model, showing its thoughts (Gemini 2.0, December 2024).','{{9to5Google|@b20t}}'],
    ['2025-03-12','o','Gemma 3','1B to 27B, 5:1 local:global with a 1,024 window, 128K context, SigLIP image input, 2T to 14T tokens.','{{Gemma 3 report|@g3}}'],
    ['2025-03-25','g','Gemini 2.5 Pro','Thinking by default with a thinking budget; Flash and below distilled; trained on 8,960-chip TPU v5p pods.','{{Gemini 2.5 report|@g25}}'],
    ['2025-04-15','o','T5Gemma','Encoder-decoder models adapted from decoder-only Gemma checkpoints (April 2025).','{{Encoder-Decoder Gemma and T5Gemma 2|n:3d45c17b0d0d81a9a22ffaada508db5c}}'],
    ['2025-06-26','o','Gemma 3n','E2B and E4B for phones: Per-Layer Embeddings (E2B runs with 1.91B resident) and MatFormer nesting.','{{developer guide|@g3nb}}'],
    ['2025-07-21','g','Deep Think, IMO gold','35 of 42 points, 5 of 6 problems, in natural language within 4.5 hours (July 2025).','{{Google DeepMind|@imo}}'],
    ['2025-11-18','g','Gemini 3 Pro (preview)','Sparse MoE, 1M in and 64K out; introduced thinking levels and media-resolution controls.','{{release notes|@log}}'],
    ['2025-12-03','g','Gemini 3 Deep Think','Parallel reasoning as a mode in the Gemini app.','{{Wikipedia|@wgem}}'],
    ['2025-12-17','g','Gemini 3 Flash (preview)','The Flash tier of Gemini 3.','{{release notes|@log}}'],
    ['2025-12-15','o','T5Gemma 2','Encoder-decoder on Gemma 3; RULER 32K 81.7 against Gemma 3 4B\'s 66.8; base of EmbeddingGemma (December 2025).','{{Encoder-Decoder Gemma and T5Gemma 2|n:3d45c17b0d0d81a9a22ffaada508db5c}}'],
    ['2026-02-19','g','Gemini 3.1 Pro (preview)','Replaced 3 Pro; the current Pro tier, still a preview.','{{release notes|@log}}'],
    ['2026-03-09','x','3 Pro Preview shut down','gemini-3-pro-preview now points to 3.1 Pro, under four months after launch.','{{release notes|@log}}'],
    ['2026-04-02','o','Gemma 4','E2B, E4B, 26B A4B (MoE, 8 of 128 experts plus 1 shared), 31B dense; first Gemma under Apache 2.0.','{{Google|@g4b}}'],
    ['2026-05-07','g','3.1 Flash-Lite (GA)','The cheapest model open to new projects, $0.25 / $1.50 (preview from 3 March).','{{release notes|@log}}'],
    ['2026-05-19','g','3.5 Flash','GA at Google I/O, $1.50 / $9.00.','{{release notes|@log}}'],
    ['2026-06-03','o','Gemma 4 12B Unified','Dense and encoder-free: 48 by 48 pixel patches through one 35M-parameter matrix.','{{Wikipedia|@wgemma}}'],
    ['2026-07-21','g','3.6 Flash, 3.5 Flash-Lite','17% fewer output tokens than 3.5 Flash; Flash-Lite at 350 tokens per second; sampling parameters deprecated.','{{Google|@b36}}'],
    ['2026-08-13','g','3.7 Flash','GA; improvements in software engineering and agents. 39.1 on the index at $0.93 per task.','{{release notes|@log}}'],
    ['2026-09-02','g','3.8 Flash and Flash Cyber','"Works harder": 40.9 at $1.24 per task; Cyber through Fairwind only.','{{Google|@b38}}'],
    ['2026-09-15','g','3.8 Live, Live Extended Thinking','Voice agents; Extended Thinking reasons and speaks at once; 97 languages.','{{Google|@blive}}'],
    ['2026-09-18','x','2.5 restricted','Gemini 2.5 served only to projects that already used it.','{{release notes|@log}}'],
    ['2026-09-30','g','Gemini 4 Argon','Gated frontier model, 1M output; $2 / $10 introductory; 52.6 on the index.','{{Google|@bargon}}']
  ].map(([d,k,n,t,src],i)=>({d:new Date(d+'T00:00:00Z'),ds:d,k,n,t,src,id:'ln'+i}));
  let range='all';
  const mon=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTH_ONLY=/^(T5Gemma|T5Gemma 2|Deep Think, IMO gold|Gemini 2.0 Flash Thinking)$/;
  const dlab=e=>{const dd=e.d;return (MONTH_ONLY.test(e.n)?'':dd.getUTCDate()+' ')+mon[dd.getUTCMonth()]+' '+dd.getUTCFullYear()};
  function draw(){
    const t0=range==='all'?Date.UTC(2023,9,1):Date.UTC(2026,0,1),t1=Date.UTC(2026,9,15);
    const ev=E.filter(e=>+e.d>=t0);
    const W=880,pl=20,pr=20,T26=Date.UTC(2026,0,1),split=range==='all'?0.5:0;
    const x=t=>{const w=W-pl-pr;if(range!=='all')return pl+w*(t-t0)/(t1-t0);return t<T26?pl+w*split*(t-t0)/(T26-t0):pl+w*(split+(1-split)*(t-T26)/(t1-T26))};
    const SH={'3.8 Live, Live Extended Thinking':'3.8 Live','3.8 Flash and Flash Cyber':'3.8 Flash','3.6 Flash, 3.5 Flash-Lite':'3.6 Flash','Gemini 2.0 Flash Thinking':'2.0 Thinking','3 Pro Preview shut down':'3 Pro shut down','Deep Think, IMO gold':'Deep Think IMO','Gemma 4 12B Unified':'Gemma 4 12B','3.1 Flash-Lite (GA)':'3.1 Flash-Lite','2.5 restricted':'2.5 restricted'};
    const sn=e=>(SH[e.n]||e.n).replace(/ \(.*\)/,'').replace(/^Gemini /,'');
    // place each label in the first row where its estimated extent does not overlap
    const rows={up:[],dn:[]},pos=[];
    ev.sort((a,b)=>a.d-b.d).forEach(e=>{const up=e.k!=='o',xx=x(+e.d),lane=up?rows.up:rows.dn,lw=sn(e).length*6.2+8,end=xx+lw>W-4;
      const x0=end?xx-lw:xx,x1=end?xx:xx+lw;let r=0;while((lane[r]||[]).some(([a,b])=>x0<b&&x1>a))r++;(lane[r]=lane[r]||[]).push([x0,x1]);pos.push({e,xx,r,up,end})});
    const nu=rows.up.length,nd=rows.dn.length,mid=30+nu*19,H=mid+30+nd*19;
    let s='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+mid+'" y2="'+mid+'" stroke="var(--mute)"/>';
    s+='<text x="'+pl+'" y="14" font-size="11" fill="var(--closed)" font-weight="600">Gemini (closed)</text><text x="'+(W-pr)+'" y="'+(H-4)+'" font-size="11" text-anchor="end" fill="var(--open)" font-weight="600">Gemma (open)</text>';
    const tick=(xx,l)=>'<line x1="'+xx+'" x2="'+xx+'" y1="20" y2="'+(H-16)+'" stroke="var(--line)" stroke-dasharray="3 3"/><text x="'+(xx+3)+'" y="'+(H-4)+'" font-size="10.5" fill="var(--mute)">'+l+'</text>';
    if(range==='all'){[2024,2025,2026].forEach(y=>{s+=tick(x(Date.UTC(y,0,1)),y+(y===2026?' (scale widened)':''))})}
    else{for(let m=1;m<=8;m++)s+=tick(x(Date.UTC(2026,m,1)),mon[m])}
    pos.forEach(({e,xx,r,up,end})=>{const y=up?mid-16-r*19:mid+20+r*19,c=e.k==='o'?'var(--open)':e.k==='x'?'var(--bad)':'var(--closed)';
      s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+mid+'" y2="'+(up?y+4:y-10)+'" stroke="'+c+'" stroke-opacity=".5"/>';
      s+='<g class="lnd" data-id="'+e.id+'" style="cursor:pointer"><circle cx="'+xx+'" cy="'+mid+'" r="5" fill="'+c+'"/><text x="'+(xx+(end?-3:3))+'" y="'+y+'" font-size="11"'+(end?' text-anchor="end"':'')+'>'+sn(e)+'</text><title>'+dlab(e)+': '+e.n+'</title></g>'});
    $('lnSvg').innerHTML=svgEl(W,H,s,'Gemini and Gemma releases on a time axis');
    $('lnSvg').querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{const c=$(g.dataset.id);document.querySelectorAll('.tl-item').forEach(x=>x.classList.toggle('sel',x===c));c.scrollIntoView({block:'center',behavior:'smooth'})}));
    $('lnCards').innerHTML=ev.map(e=>'<div class="tl-item '+(e.k==='o'?'o':'c')+'" id="'+e.id+'"><h3>'+e.n+'</h3><div class="dt">'+dlab(e)+' · '+(e.k==='o'?'Gemma, open':'Gemini, closed')+' · '+e.src+'</div><p style="margin:4px 0 0;font-size:14px">'+e.t+'</p></div>').join('');
  }
  segBind('lnR',m=>{range=m;draw()});onTab('t-line',draw);
})();
