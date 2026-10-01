// ---- Run it yourself: parameters from config.json, weights + KV cache against hardware ----
(function(){
  if(!$('t-fit'))return;
  const sel=$('ftM');Object.keys(MODELS).forEach(k=>{const o=document.createElement('option');o.value=k;o.textContent=MODELS[k].n;sel.appendChild(o)});sel.value='sco';$('ftW').value='0.5';
  const GB=1e9,g=v=>(v/GB).toFixed(v<10*GB?2:1)+' GB';
  const wParams=(m,p)=>m.vis?m.pub:p.total; // Llama 4: the vision encoder is not rebuilt here, so weights use Meta's published total
  const REP={
    l8:'The configuration gives 8.03B, the model\'s "8B". Its cache is 128 KiB per token (32 layers × 8 KV heads × 128 × 2 × 2 bytes), 16 GiB at 128K.',
    l70:'The configuration gives 70.55B, the model\'s "70B"; 320 KiB of cache per token, 40 GiB at 128K.',
    l33:'Same shape as Llama 3.1 70B (70.55B); the gain of 3.3 is post-training, not architecture.',
    l405:'The configuration gives 405.85B, the model\'s "405B". In BF16 the weights alone are 812 GB, more than one 8-GPU H100 host holds; at 1 byte they are 406 GB.',
    sco:'Meta\'s claim: at Int4, 109B parameters are 54.5 GB and fit one 80 GB H100 ("fitting in a single NVIDIA H100 GPU" with Int4, Llama 4 announcement); the text model rebuilt from the config is 107.8B, the rest is the vision encoder. The 10M-token context does not fit with it: the cache alone is about 481 GiB at 10M even though only 12 of 48 layers keep the whole context.',
    mav:'At 1 byte per parameter Maverick\'s 400B is 400 GB against the 640 GB of one 8-GPU H100 host, Meta\'s "single NVIDIA H100 DGX host" claim; the config rebuilds 400.7B for the text model.',
    gli:'In BF16, 29.6B parameters are 59.2 GB, the model card\'s "55GB+" and the page\'s "about 55 GiB" (59.2 × 10⁹ bytes = 55.1 GiB). At half a byte they are 14.8 GB; the shipped "K-Quant-17GB" is 17 GB because real 4-bit formats carry scales and keep some layers wider. The cache is small: 13 global layers with 2 KV heads, 13 KiB per token, 1.7 GiB at 131K.'};
  function draw(){const k=sel.value,m=MODELS[k],p=params(m),bw=+$('ftW').value,cap=+$('ftH').value*GB;
    const ctx=Math.round(Math.pow(2,+$('ftC').value)),ctxU=Math.min(ctx,m.ctx);$('ftCv').textContent=fmt(ctx)+' tokens'+(ctx>m.ctx?' (beyond this model\'s '+fmt(m.ctx)+'; capped)':'');
    const w=wParams(m,p)*bw,kv=kvBytes(m,ctxU),tot=w+kv,mx=Math.max(tot,cap)*1.05,ok=tot<=cap;
    $('ftBar').innerHTML='<div class="fitbar"><span style="width:'+(100*w/mx)+'%;background:var(--acc)">weights '+g(w)+'</span><span style="width:'+(100*kv/mx)+'%;background:var(--c5)">'+(kv/mx>0.12?'cache '+g(kv):'')+'</span><i style="left:'+(100*cap/mx)+'%" title="capacity"></i></div><div class="small mute">The black line is the hardware\'s memory: '+g(cap)+'.</div>';
    $('ftOut').innerHTML=stat('Weights',g(w),fmt(wParams(m,p)/1e9,1)+'B × '+bw+' bytes')+stat('KV cache',g(kv),fmt(ctxU)+' tokens; '+(m.glob<m.L?m.glob+' of '+m.L+' layers keep the whole context':'every layer keeps the whole context'))+stat('Total against memory',(100*tot/cap).toFixed(0)+'%',ok?'fits, before activations and overhead':'does not fit')+stat('Compute per token',fmt(2*p.active/1e9,1)+' GFLOPs','2 × '+fmt(p.active/1e9,2)+'B active');
    const r=(a,v,d)=>'<tr><td>'+a+'</td><td class="num">'+(v/1e9).toFixed(2)+'B</td><td>'+d+'</td></tr>';
    let t='<tr><th>Part</th><th class="num">Parameters</th><th>How</th></tr>'+r('Attention',p.att,m.L+' layers × ('+(m.gate?'q, gate and o ':'q and o ')+fmt(m.h)+' × '+fmt(m.nh*m.hd)+'; k and v '+fmt(m.h)+' × '+fmt(m.kv*m.hd)+')');
    if(m.moe)t+=r('Feed-forward (experts, shared experts, dense layers, routers)',p.ff,p.nMoE+' MoE layers of '+m.moe.E+' + 1 experts (3 × '+fmt(m.h)+' × '+fmt(m.moe.fe)+')'+(p.nMoE<m.L?', '+(m.L-p.nMoE)+' dense (3 × '+fmt(m.h)+' × '+fmt(m.ff)+')':''));
    else t+=r('Feed-forward',p.ff,m.L+' × 3 × '+fmt(m.h)+' × '+fmt(m.ff)+' (SwiGLU)');
    t+=r('Embeddings in and out',p.emb,'2 × '+fmt(m.V)+' × '+fmt(m.h));if(m.visP)t+=r('Perception encoder',p.vis,'about 1.8B (model card)');
    t+='<tr><td><b>Total rebuilt</b></td><td class="num"><b>'+(p.total/1e9).toFixed(2)+'B</b></td><td>published: '+m.pubs+'</td></tr><tr><td><b>Active per token</b></td><td class="num"><b>'+(p.active/1e9).toFixed(2)+'B</b></td><td>'+(m.moe?'attention, the shared expert and one routed expert (or the dense block), embeddings':'dense: every parameter')+'</td></tr>';
    $('ftTab').innerHTML=t;
    $('ftRep').innerHTML='<b>'+(k==='sco'||k==='mav'||k==='gli'?'Defaults reproduce':'Check')+':</b> '+REP[k]+' Rebuilt from '+A(m.cfg,'config.json')+'.';
    $('ftAll').innerHTML=Object.keys(MODELS).map(q=>{const mm=MODELS[q],pp=params(mm),c=Math.min(ctx,mm.ctx),ww=wParams(mm,pp)*bw,kk=kvBytes(mm,c),tt=ww+kk,f=tt<=cap;
      return '<div class="row'+(q===k?' hl':'')+'"><div class="nm">'+mm.n+'</div><div class="track"><div class="fill" style="width:'+Math.min(100,100*tt/(cap*2))+'%;background:'+(f?'var(--good)':'var(--bad)')+'"></div><div style="position:absolute;left:50%;top:0;bottom:0;width:2px;background:var(--ink)"></div></div><div class="val">'+g(tt)+'</div></div>'}).join('')+'<div class="small mute">Bars are drawn against twice the memory, so the black line in the middle is the hardware; green fits, red does not.</div>'}
  ['ftM','ftW','ftH'].forEach(id=>$(id).addEventListener('change',draw));$('ftC').addEventListener('input',draw);
  onTab('t-fit',draw);
})();
