// ---- Lineage: Kimi releases by date, sized by total parameters ----
(function(){
  const el=$('lnSvg');if(!el)return;
  const R=[
    {id:'chat',n:'Kimi chat',d:'2023-10-01',dl:'2023',open:false,P:null,src:null,
      t:'Long-context consumer assistant in China, the product the lab was first known for. The page gives the year only; size and architecture undisclosed.'},
    {id:'k15',n:'Kimi k1.5',d:'2025-01-20',dl:'20 January 2025',open:false,P:null,src:['arXiv 2501.12599','https://arxiv.org/abs/2501.12599'],
      t:'An early RL reasoning model, reported to match o1 without Monte Carlo tree search or process reward models. Its policy objective (the squared group-baseline loss on the Reading tab) and its colocated RL infrastructure carried into K2.'},
    {id:'ml',n:'Moonlight-16B-A3B',d:'2025-02-24',dl:'24 February 2025',open:true,P:16,act:3,lic:'MIT',src:['Muon is Scalable, arXiv 2502.16982','https://arxiv.org/abs/2502.16982'],
      t:'The Muon scaling study\'s model: 16B total, 3B active, 5.7T tokens. Showed Muon at about 2× AdamW\'s compute efficiency once weight decay and Adam-matched update scaling were added.'},
    {id:'k2',n:'Kimi K2',d:'2025-07-11',dl:'11 July 2025 (weights; report 28 July)',open:true,P:1040,act:32.6,lic:'Modified MIT',src:['K2 report','https://arxiv.org/abs/2507.20534'],
      t:'The breakout release: 1.04T total / 32.6B active MoE (384 experts, 8 active + 1 shared), MLA attention (the latent-cache design from DeepSeek-V2) with 64 heads, pretrained on 15.5T tokens with MuonClip and zero loss spikes; trained mostly at 4k context, then 32k, then extended to 128k with YaRN. Modified MIT licence: MIT terms plus a "Kimi K2" display requirement above 100 million monthly active users or 20 million US dollars in monthly revenue. On LMArena it ranked top open model and 5th overall (17 July 2025, report); Moonshot called it the strongest open agentic and coding model at release.'},
    {id:'kl',n:'Kimi Linear 48B-A3B',d:'2025-10-30',dl:'30 October 2025',open:true,P:48,act:3,lic:'MIT',src:['arXiv 2510.26692','https://arxiv.org/abs/2510.26692'],
      t:'The research model that introduced Kimi Delta Attention in a 3:1 hybrid with MLA, NoPE in the MLA layers, up to 75% less KV cache and up to 6× decoding throughput at 1M context. Its architecture was also the testbed for Attention Residuals.'},
    {id:'k2t',n:'Kimi K2 Thinking',d:'2025-11-04',dl:'November 2025 (repository 4 November)',open:true,P:1026,act:32,lic:'Modified MIT',src:['model card','https://huggingface.co/moonshotai/Kimi-K2-Thinking'],
      t:'Reasoning variant with native INT4 quantisation-aware training (a lossless 2× speed-up in low-latency mode) and a 256K context; interleaved thinking and tool calls over 200 to 300 steps. Its card claimed state-of-the-art results on Humanity\'s Last Exam and BrowseComp, briefly ahead of closed flagships on those agentic evaluations.'},
    {id:'k25',n:'Kimi K2.5',d:'2026-01-29',dl:'29 January 2026',open:true,P:1027,act:32,lic:'Modified MIT',src:['model card','https://huggingface.co/moonshotai/Kimi-K2.5'],
      t:'Natively multimodal K2 with a MoonViT vision encoder and Agent Swarm parallel execution. Still served.'},
    {id:'k26',n:'Kimi K2.6',d:'2026-04-14',dl:'April 2026 (repository 14 April)',open:true,P:1027,act:32,lic:'Modified MIT',src:['Hugging Face','https://huggingface.co/moonshotai/Kimi-K2.6'],
      t:'A rapid capability update, with the same 1.03T checkpoint size as K2.5.'},
    {id:'k27',n:'Kimi K2.7 Code',d:'2026-06-11',dl:'June 2026 (repository 11 June)',open:true,P:1027,act:32,lic:'Modified MIT',src:['Hugging Face','https://huggingface.co/moonshotai/Kimi-K2.7-Code'],
      t:'Coding specialist at K2 scale (a 1.03T checkpoint).'},
    {id:'k3',n:'Kimi K3',d:'2026-07-16',dl:'16 July 2026 (weights by 27 July)',open:true,P:2780,act:104.2,lic:'Kimi K3 License',src:['model card','https://huggingface.co/moonshotai/Kimi-K3'],
      t:'Current flagship: 2.8T total / 104B active, Stable LatentMoE (896 experts, 16 active, 2 shared), Kimi Delta Attention in 69 of 93 layers with Gated MLA in the other 24, Attention Residuals, 1M context, native vision, native MXFP4 checkpoint, Per-Head Muon. "The world\'s first open 3T-class model" (card). Led open weights on AA v4.1 (57.1, July); third among open weights on v4.3 (43.6, October). Cognition built SWE-2 on it (September 2026).'}];
  let sel='k3';
  const tm=s=>new Date(s+'T00:00:00Z').getTime(),t0=tm('2023-07-01'),t1=tm('2026-10-01');
  function draw(){
    const W=Math.max(560,Math.min(900,el.clientWidth||800)),H=260,pl=50,pr=20,pt=20,pb=46;
    const X=s=>pl+(W-pl-pr)*(tm(s)-t0)/(t1-t0),lo=Math.log10(8),hi=Math.log10(4000),Y=p=>p?pt+(H-pt-pb-26)*(1-(Math.log10(p)-lo)/(hi-lo)):H-pb-8;
    let s='';[[10,'10B'],[100,'100B'],[1000,'1T']].forEach(([v,l])=>{s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/><text x="'+(pl-6)+'" y="'+(Y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+l+'</text>'});
    s+='<text x="'+(pl-6)+'" y="'+(H-pb-4)+'" font-size="10" text-anchor="end" fill="var(--mute)">n/a</text>';
    ['2024','2025','2026'].forEach(y=>{const x=X(y+'-01-01');s+='<line x1="'+x+'" x2="'+x+'" y1="'+pt+'" y2="'+(H-pb)+'" stroke="var(--line)"/><text x="'+x+'" y="'+(H-pb+16)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+y+'</text>'});
    s+='<text x="'+((pl+W-pr)/2)+'" y="'+(H-8)+'" font-size="11" text-anchor="middle" fill="var(--mute)">release date · height: total parameters (log)</text>';
    R.forEach((r,i)=>{const x=X(r.d),y=Y(r.P),rad=r.P?4+Math.log10(r.P)*2:6,on=r.id===sel;
      s+='<g class="lnd" data-id="'+r.id+'" style="cursor:pointer"><circle cx="'+x+'" cy="'+y+'" r="'+(rad+6)+'" fill="transparent"/><circle cx="'+x+'" cy="'+y+'" r="'+rad+'" fill="'+(r.open?'var(--open)':'var(--bg)')+'" stroke="'+(r.open?'var(--open)':'var(--closed)')+'" stroke-width="2" fill-opacity="'+(on?1:.55)+'"/>'+(on?'<circle cx="'+x+'" cy="'+y+'" r="'+(rad+4)+'" fill="none" stroke="var(--ink)" stroke-dasharray="3 2"/>':'');
      const up=['k25','k26','kl','ml'].includes(r.id),k3=r.id==='k3';s+='<text x="'+(k3?x-rad-4:x)+'" y="'+(k3?y+4:up?y-rad-6:y+rad+13)+'" font-size="10.5" text-anchor="'+(k3?'end':'middle')+'">'+r.n.replace('Kimi ','')+'</text></g>'});
    el.innerHTML=svgEl(W,H,s,'Kimi release timeline');
    el.querySelectorAll('.lnd').forEach(g=>g.addEventListener('click',()=>{sel=g.dataset.id;draw()}));
    const r=R.find(x=>x.id===sel);
    $('lnCard').innerHTML='<h3>'+r.n+'</h3><div class="small mute">'+r.dl+' · '+(r.open?'open weights':'closed')+(r.P?' · '+(r.P>=1000?(r.P/1000).toFixed(r.P%1000?2:0)+'T':r.P+'B')+' total'+(r.act?' / '+r.act+'B active':''):'')+(r.lic?' · '+r.lic:'')+'</div><p style="margin:6px 0 0">'+r.t+'</p>'+(r.src?'<p class="small" style="margin:4px 0 0">Source: '+A(r.src[1],r.src[0])+'</p>':'');
  }
  onTab('t-line',draw);addEventListener('resize',()=>{if(!$('t-line').hidden)draw()});
})();
