// ---- Reading: layer patterns drawn from each config.json (no_rope_layers, sliding_window_pattern, layer_types) ----
(function(){
  const D=window.PE_DATA;if(!document.querySelector('.lstrip'))return;
  const Ly=D.R.layers;
  // kinds: 'rl' RoPE with a local window, 'rg' RoPE with full attention, 'ng' no position, full attention, 'gb' RoPE full attention with a larger base
  function kinds(m){const a=[];
    if(m==='llama4'){Ly.llama4.rope.forEach(v=>a.push(v?'rl':'ng'))}
    else if(m==='smollm3'){Ly.smollm3.rope.forEach(v=>a.push(v?'rg':'ng'))}
    else if(m==='command_a'){for(let i=0;i<Ly.command_a.n;i++)a.push((i+1)%Ly.command_a.pattern?'rl':'ng')}
    else if(m==='gemma3'){for(let i=0;i<Ly.gemma3.n;i++)a.push((i+1)%Ly.gemma3.pattern?'rl':'gb')}
    else if(m==='gptoss'){Ly.gptoss.types.forEach(t=>a.push(t==='sliding_attention'?'rl':'rg'))}
    return a}
  const COL={rl:'var(--c1)',rg:'var(--c6)',ng:'var(--c2)',gb:'var(--c4)'};
  function draw(){document.querySelectorAll('.lstrip').forEach(el=>{const k=kinds(el.dataset.m),n=k.length,w=Math.max(3,Math.min(6,Math.floor(300/n)));
    let g='<svg viewBox="0 0 '+(n*w)+' 14" width="'+(n*w)+'" height="14" role="img" aria-label="'+n+' layers">';
    k.forEach((t,i)=>{g+='<rect x="'+(i*w)+'" y="'+(t==='rl'?4:0)+'" width="'+(w-1)+'" height="'+(t==='rl'?10:14)+'" fill="'+COL[t]+'"/>'});
    el.innerHTML=g+'</svg><span class="small mute"> '+n+' layers</span>'})}
  window.RD.onRender(draw);draw();
})();
