// ---- Landscape tab: total against active for the MoE models in the knowledge base ----
(function(){
  if(!$('lnSvg'))return;
  // [name, short, year, total B, active B (or [prefill, decode]), layout, sources]
  const D=[
    ['Mixtral 8x7B','Mixtral',2023,46.7,12.9,'8 experts, top-2, no shared expert: the old "few big experts" style. Published as 47B / 13B in the paper, 46.7B / 12.9B by Mistral.','{{Mixtral paper|@mixp}}, {{Mistral|@mixn}}'],
    ['DeepSeek-V3/R1','V3',2024,671,37,'256 routed experts, top-8 + 1 shared; first 3 of 61 layers dense; sigmoid routing with bias balancing.','{{V3 report|@v3r}}, {{config|@v3cfg}}'],
    ['Llama 4 Maverick','Maverick',2025,400,17,'128 routed experts, top-1 + 1 shared, MoE in every second layer.','{{model card|@mav}}, {{config|@mavcfg}}'],
    ['Qwen3 235B','Qwen3',2025,235,22,'128 experts, top-8, no shared expert; global-batch balancing.','{{Qwen3 report|@q3r}}, {{config|@q3cfg}}'],
    ['Kimi K2','K2',2025,1040,32,'384 routed experts, top-8 + 1 shared; first layer dense. 1.04T in the report\'s architecture table (the abstract rounds to 1 trillion).','{{K2 report|@k2r}}, {{config|@k2cfg}}'],
    ['gpt-oss-120b','gpt-oss',2025,116.8,5.1,'128 experts, top-4, no shared expert; MXFP4 expert weights. 116.83B total and 5.13B active in the model card (input embedding not counted as active).','{{model card|@oss}}, {{config|@osscfg}}'],
    ['GLM-5.2','GLM-5.2',2026,744,40,'256 routed experts, top-8 + 1 shared, first 3 of 78 layers dense, with a sparse-attention indexer; MIT licence.','{{model card|@glm52}}'],
    ['DeepSeek-V4 Pro','V4 Pro',2026,1600,49,'Fine-grained experts plus compressed sparse attention.','{{DeepSeek V4 release|@v4}}'],
    ['DeepSeek-V4 Flash','V4 Flash',2026,284,13,'Fine-grained experts plus compressed sparse attention.','{{DeepSeek V4 release|@v4}}'],
    ['Qwen3.8-Max','Qwen3.8-Max',2026,2400,95,'512 routed experts, top-10 + 1 shared; hybrid attention, 69 of 92 layers linear.','{{model files|@q38}}'],
    ['Kimi K3','K3',2026,2800,104,'896 routed experts, top-16 + 2 shared; tokens are projected to a 3,584-wide latent for the routed experts ("Stable LatentMoE"); hybrid linear attention.','{{model card|@k3}}, {{config|@k3cfg}}'],
    ['GLM-5.3-Flash','GLM-5.3-Flash',2026,320,18,'288 routed experts, top-8 + 1 shared. 34 of its 45 layers use Kimi Delta Attention (linear, with a fixed-size state) and the other 11 sparse attention with IndexPool; its small KV cache comes from that whole design, not from IndexPool alone.','{{config|@glmfcfg}}, {{Z.ai docs|@glmfd}}, {{SiliconANGLE|@glmf}}'],
    ['Tencent Hy4 preview','Hy4',2026,770,49,'Conservative for the band; two reasoning levels.','{{Tencent|@hy4}}'],
    ['Qwen3.8-Flash-Next','Qwen3.8-FN',2026,125,6,'512 routed experts, top-10 + 1 shared; Gated DeltaNet in 36 of 48 layers plus QSA, the Qwen4 architecture preview.','{{model files|@q38fn}}'],
    ['Step 5 Preview','Step 5',2026,600,27,'Smallest active count in the frontier band here; weights promised, not yet published.','{{Pandaily|@step5}}'],
    ['MiMo-V2.6-Pro','MiMo',2026,1020,42,'Expert layout not recorded in this knowledge base; MIT licence, 1M-token context.','{{Unite.AI|@mimo}}'],
    ['DeepSeek V4.1-Flash','V4.1-Flash',2026,552,[8,16],'Encoder-decoder, so the active count differs by phase: 8B in prefill, 16B in decode.','{{DeepSeek changelog|@v41}}, {{model card|@v41hf}}']];
  const YC={2023:'var(--c4)',2024:'var(--c3)',2025:'var(--c2)',2026:'var(--c1)'};
  const act=r=>Array.isArray(r[4])?r[4][1]:r[4],ratio=r=>r[3]/act(r),actS=r=>Array.isArray(r[4])?r[4][0]+'B prefill, '+r[4][1]+'B decode':r[4]+'B',totS=v=>v>=1000?(v/1000).toFixed(v%1000?2:0).replace(/\.?0+$/,'')+'T':v+'B';
  const ratS=r=>Array.isArray(r[4])?(r[3]/r[4][0]).toFixed(1)+'x prefill, '+(r[3]/r[4][1]).toFixed(1)+'x decode':ratio(r).toFixed(1)+'x';
  const st={rank:'ratio',sel:'GLM-5.3-Flash'};
  function card(){const r=D.find(x=>x[0]===st.sel);if(!r)return;$('lnCard').innerHTML='<b>'+r[0]+'</b> ('+r[2]+'): '+totS(r[3])+' total, '+actS(r)+' active, '+ratS(r)+' total ÷ active, '+(100/ratio(r)).toFixed(1)+'% active. '+r[5]+' Sources: '+r[6]+'. Weights at 4 bits: about '+fmt(r[3]/2)+' GB.'}
  function scatter(){const W=Math.max(320,Math.min(760,$('lnSvg').clientWidth||700)),nar=W<520,H=nar?300:360;
    const f=logFrame({W,H,pl:50,pr:14,pt:10,pb:38,x:[3,150],y:[30,4000],xt:[[4,'4B'],[10,'10B'],[30,'30B'],[100,'100B']],yt:[[30,'30B'],[100,'100B'],[300,'300B'],[1000,'1T'],[3000,'3T']],xl:'active parameters per token',yl:'total parameters'});
    let s=f.s;[5,10,20,40,80].forEach(q=>{const a0=3,a1=150;let x0=a0,x1=a1;if(x0*q<30)x0=30/q;if(x1*q>4000)x1=4000/q;if(x0>=x1)return;s+='<line x1="'+f.lx(x0)+'" y1="'+f.ly(x0*q)+'" x2="'+f.lx(x1)+'" y2="'+f.ly(x1*q)+'" stroke="var(--line)" stroke-dasharray="4 3"/><text x="'+(f.lx(x0)+4)+'" y="'+(f.ly(x0*q)-4)+'" font-size="10" fill="var(--mute)">'+q+'x</text>'});
    D.forEach(r=>{const on=r[0]===st.sel,c=YC[r[2]];const pts=Array.isArray(r[4])?r[4]:[r[4]];
      if(pts.length>1)s+='<line x1="'+f.lx(pts[0])+'" y1="'+f.ly(r[3])+'" x2="'+f.lx(pts[1])+'" y2="'+f.ly(r[3])+'" stroke="'+c+'" stroke-width="2"/>';
      pts.forEach(a=>{s+='<circle data-n="'+r[0]+'" cx="'+f.lx(a)+'" cy="'+f.ly(r[3])+'" r="'+(on?7:5)+'" fill="'+c+'" stroke="'+(on?'var(--ink)':'var(--bg)')+'" stroke-width="'+(on?2:1)+'" style="cursor:pointer"><title>'+r[0]+': '+totS(r[3])+' / '+a+'B</title></circle>'});
      const L={V3:[-8,4,'end'],'Qwen3.8-Max':[-8,4,'end'],Hy4:[8,14,'start'],'GLM-5.2':[-8,-6,'end']}[r[1]]||[8,4,'start'];if(!nar||on)s+='<text x="'+(f.lx(pts[pts.length-1])+L[0])+'" y="'+(f.ly(r[3])+L[1])+'" font-size="10.5" text-anchor="'+L[2]+'" fill="var(--mute)" style="pointer-events:none">'+r[1]+'</text>'});
    $('lnSvg').innerHTML=svgEl(W,H,s,'Total against active parameters on log scales for MoE models');
    $('lnSvg').querySelectorAll('circle[data-n]').forEach(c=>c.addEventListener('click',()=>{st.sel=c.dataset.n;draw()}));
    $('lnLeg').innerHTML=Object.entries(YC).map(([y,c])=>'<span><i style="background:'+c+';width:10px;height:10px;border-radius:50%"></i>'+y+'</span>').join('')+'<span class="q">dashed: constant total ÷ active</span>'}
  function bars(){const key={ratio:[r=>Array.isArray(r[4])?r[3]/r[4][0]:ratio(r),'Ranked by total ÷ active (V4.1-Flash at its prefill count)',v=>v.toFixed(1)+'x',-1],act:[r=>Array.isArray(r[4])?r[4][0]:r[4],'Ranked by smallest active count',v=>v+'B',1],tot:[r=>r[3],'Ranked by total parameters',totS,-1]}[st.rank];
    const rows=D.slice().sort((a,b)=>key[3]*(key[0](a)-key[0](b))),mx=Math.max(...rows.map(key[0]));$('lnRankH').textContent=key[1];
    $('lnBars').innerHTML=rows.map(r=>{const v=key[0](r);return '<div class="row'+(r[0]===st.sel?' sel':'')+'" data-n="'+r[0]+'" style="cursor:pointer"><span class="l">'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*(st.rank==='act'?Math.log10(1+v)/Math.log10(1+mx):v/mx)).toFixed(1)+'%;background:'+YC[r[2]]+'"></span></span><span class="v">'+key[2](v)+'</span></div>'}).join('');
    $('lnBars').querySelectorAll('.row').forEach(e=>e.addEventListener('click',()=>{st.sel=e.dataset.n;draw()}))}
  function table(){let t='<tr><th>Model (year)</th><th>Total / active</th><th>Total ÷ active</th><th>Experts and notes</th><th>Sources</th></tr>';
    D.forEach(r=>{t+='<tr data-n="'+r[0]+'"'+(r[0]===st.sel?' class="sel"':'')+' style="cursor:pointer"><td>'+r[0]+' ('+r[2]+')</td><td class="num">'+totS(r[3])+' / '+actS(r)+'</td><td class="num">'+ratS(r)+'</td><td>'+r[5]+'</td><td>'+r[6]+'</td></tr>'});
    $('lnTab').innerHTML=t;$('lnTab').querySelectorAll('tr[data-n]').forEach(e=>e.addEventListener('click',ev=>{if(ev.target.closest('a'))return;st.sel=e.dataset.n;draw()}))}
  function draw(){scatter();bars();table();card()}
  segBind('lnRank',m=>{st.rank=m;bars()});
  let lw=0;addEventListener('resize',()=>{const w=$('lnSvg').clientWidth;if(w&&Math.abs(w-lw)>30){lw=w;scatter()}});
  onTab('t-land',()=>{lw=$('lnSvg').clientWidth;draw()});
})();
