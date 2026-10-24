// ---- Reading tab: one repeating unit of four attention layers in Llama 3, Llama 4 and Muse Glimmer (static, drawn at the measured width) ----
(function(){
  const host=$('mlLayers');if(!host)return;
  // from the configs: [model, layers, units of four, KV heads, kinds of the four layers]; g = global RoPE, c = chunk 8,192 RoPE, w = window 2,048 RoPE, n = global NoPE
  const ROWS=[['Llama 3.1 8B',32,8,8,['g','g','g','g']],['Llama 4 Maverick',48,12,8,['c','c','c','n']],['Muse Glimmer 30B',52,13,2,['w','w','w','n']]];
  const K={g:['var(--acc)','global, RoPE','global','var(--bg)'],c:['var(--soft)','chunk 8,192','8,192','var(--ink)'],w:['var(--soft)','window 2,048','2,048','var(--ink)'],n:['var(--bad)','global, no PE','global','var(--bg)']};
  function draw(){
    const W=Math.max(300,Math.min(760,host.clientWidth||700)),narrow=W<560;
    const lw=narrow?0:150,rowH=narrow?86:56,cw=narrow?(W-12)/4-4:Math.min(96,(W-lw-210)/4-4),ch=30;
    let s='',y=8;
    ROWS.forEach(([n,L,u,kv,ks])=>{
      const ty=narrow?y+12:y+ch/2+4,cy=narrow?y+18:y,x0=narrow?0:lw;
      s+='<text x="0" y="'+ty+'" font-size="12.5" font-weight="600">'+n+'</text>';
      ks.forEach((k,i)=>{const x=x0+i*(cw+4),c=K[k];
        s+='<rect x="'+x+'" y="'+cy+'" width="'+cw+'" height="'+ch+'" rx="4" fill="'+c[0]+'" stroke="var(--line)"/>';
        s+='<text x="'+(x+cw/2)+'" y="'+(cy+ch/2+4)+'" font-size="11" text-anchor="middle" fill="'+c[3]+'">'+(cw>88?c[1]:c[2])+'</text>'});
      const ex=x0+4*(cw+4)+4,keep=(ks[0]==='g'?'all '+L:(L/4)+' of '+L)+' keep the context';
      if(narrow)s+='<text x="0" y="'+(cy+ch+16)+'" font-size="11" fill="var(--mute)">× '+u+' = '+L+' layers; '+kv+' KV heads; '+keep+'</text>';
      else s+='<text x="'+ex+'" y="'+(cy+12)+'" font-size="11.5">× '+u+' = '+L+' layers</text><text x="'+ex+'" y="'+(cy+26)+'" font-size="11" fill="var(--mute)">'+kv+' KV heads; '+keep+'</text>';
      y+=rowH});
    host.innerHTML=svgEl(W,y,s,'Attention layer pattern: Llama 3 all global with RoPE; Llama 4 three chunked layers of 8,192 tokens then one global layer without position encoding; Muse Glimmer three 2,048-token windows then one global layer without position encoding');
  }
  onTab('t-read',draw);draw();let rw=0;addEventListener('resize',()=>{const w=host.clientWidth;if(w&&Math.abs(w-rw)>30){rw=w;draw()}});
})();
