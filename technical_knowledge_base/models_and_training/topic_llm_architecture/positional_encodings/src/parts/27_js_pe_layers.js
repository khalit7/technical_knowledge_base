// ---- Reading: layer patterns drawn from each config.json (no_rope_layers, sliding_window_pattern, layer_types) ----
(function(){
  const D=window.PE_DATA;if(!document.querySelector('.pe-lstrip'))return;
  const Ly=D.R.layers;
  // kinds: 'rl' RoPE with a local window, 'rg' RoPE with full attention, 'ng' no position, full attention, 'gb' RoPE full attention with a larger base
  function kinds(m){const a=[];
    if(m==='llama4'){Ly.llama4.rope.forEach(v=>a.push(v?'rl':'ng'))}
    else if(m==='smollm3'){Ly.smollm3.rope.forEach(v=>a.push(v?'rg':'ng'))}
    else if(m==='command_a'){for(let i=0;i<Ly.command_a.n;i++)a.push((i+1)%Ly.command_a.pattern?'rl':'ng')}
    else if(m==='gemma3'){for(let i=0;i<Ly.gemma3.n;i++)a.push((i+1)%Ly.gemma3.pattern?'rl':'gb')}
    else if(m==='gptoss'){Ly.gptoss.types.forEach(t=>a.push(t==='sliding_attention'?'rl':'rg'))}
    else if(m==='gemma4'){Ly.gemma4.types.forEach(t=>a.push(t==='sliding_attention'?'rl':'gb'))}
    else if(m==='qwen35'){Ly.qwen35.types.forEach(t=>a.push(t==='full_attention'?'gb':'li'))}
    else if(m==='kimik3'){const f=new Set(Ly.kimik3.full);for(let i=1;i<=Ly.kimik3.n;i++)a.push(f.has(i)?'ng':'li')}
    return a}
  const COL={rl:'var(--c1)',rg:'var(--c6)',ng:'var(--c2)',gb:'var(--c4)',li:'var(--dim)'};
  // the figure in section 4: one row per model, strips drawn at the measured width
  const FIG=[['gemma3','Gemma 3 27B','5 local (1,024 window, base 10,000) : 1 global (base 1,000,000, PI ×8)'],
    ['gptoss','gpt-oss-120b','alternating 128-token windows and full attention, all RoPE (YaRN ×32)'],
    ['llama4','Llama 4 Scout','3 RoPE layers in 8,192-token chunks : 1 NoPE layer with a query temperature'],
    ['command_a','Command A','3 sliding-window RoPE : 1 full-attention NoPE'],
    ['smollm3','SmolLM3-3B','RoPE removed from every 4th layer; all layers attend fully'],
    ['qwen35','Qwen3.5','3 Gated DeltaNet (no positions) : 1 full attention with a quarter of each head rotated'],
    ['gemma4','Gemma 4 31B','5 local : 1 global with proportional RoPE (64 of 256 pairs, fast ones only)'],
    ['kimik3','Kimi K3','no RoPE anywhere: 69 linear layers carry order, 24 MLA layers run NoPE']];
  function fig(){const el=document.getElementById('pe-lsFig');if(!el)return;const W=Math.max(120,window.RD.width(el)-(window.RD.width(el)>=520?160:0));
    el.innerHTML='';FIG.forEach(([m,nm,nt])=>{const k=kinds(m),n=k.length,w=W/n;
      let g='';k.forEach((t,i)=>{g+='<rect x="'+(i*w).toFixed(2)+'" y="'+(t==='rl'?6:0)+'" width="'+Math.max(1,w-1).toFixed(2)+'" height="'+(t==='rl'?12:18)+'" fill="'+COL[t]+'"/>'});
      el.insertAdjacentHTML('beforeend','<div class="pe-ls"><div class="nm">'+nm+' <span class="small mute">('+n+' layers)</span></div><div>'+window.RD.svg(W,18,g,nm+': '+n+' layers')+'</div><div class="nt">'+nt+'</div></div>')})}
  function draw(){document.querySelectorAll('.pe-lstrip').forEach(el=>{const k=kinds(el.dataset.m),n=k.length,w=Math.max(3,Math.min(6,Math.floor(300/n)));
    let g='<svg viewBox="0 0 '+(n*w)+' 14" width="'+(n*w)+'" height="14" role="img" aria-label="'+n+' layers">';
    k.forEach((t,i)=>{g+='<rect x="'+(i*w)+'" y="'+(t==='rl'?4:0)+'" width="'+(w-1)+'" height="'+(t==='rl'?10:14)+'" fill="'+COL[t]+'"/>'});
    el.innerHTML=g+'</svg><span class="small mute"> '+n+' layers</span>'})}
  window.RD.onRender(draw);window.RD.onRender(fig);window.RD.onResize(fig);draw();fig();
})();
