// ---- Hero figure (light pass 2026-10-25): the CombinedModel as model.py builds it, four parts in the order a token passes them,
// with the parameter counts recompute.py gives (inputs/recompute.json), drawn at the measured width. Wide: one row; narrow: stacked.
(function(){const el=$('heroSvg');if(!el)return;
  const S=[
    {h:'Qwen2-1.5B',c:'var(--mute)',l:['frozen; reads the query','passes its last hidden state'],n:'1,543.7M, no gradients'},
    {h:'Bridge (2 cross-attn layers)',c:'var(--c1)',l:['adapter and gate; trains','no causal mask as released'],n:'16.4M'},
    {h:'GPT-Neo-sized decoder',c:'var(--c1)',l:['random weights, not GPT-Neo','its input is the bridge output'],n:'86.6M'},
    {h:'New output layer',c:'var(--c1)',l:['768 to 151,646 tokens','Qwen2’s tokenizer'],n:'116.5M'}];
  fit(el,w=>{const wide=w>=800,g=wide?16:0,lh=17,pad=10,bw=wide?(w-3*g)/4:w,bh=pad*2+20+lh*3;let s='';
    S.forEach((b,i)=>{const x=wide?i*(bw+g):0,y=wide?0:i*(bh+22);const fr=i===0;
      s+=rc(x+.5,y+.5,bw-1,bh-1,fr?'var(--bg)':'var(--soft)',{s:b.c,sw:1.6,r:8,da:fr?'5 4':null});
      s+=tx(x+pad,y+pad+13,b.h,{fs:13,w:600,c:fr?'var(--ink)':b.c});
      b.l.forEach((t,j)=>{s+=tx(x+pad,y+pad+20+lh*(j+1),t,{fs:11.5,c:'var(--mute)'})});
      s+=tx(x+pad,y+pad+20+lh*3,b.n+(i?' trains':''),{fs:12,w:600});
      if(i<3){if(wide){s+='<path d="M'+(x+bw+2)+','+bh/2+' l'+(g-6)+',0" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>'}
        else{s+='<path d="M'+w/2+','+(y+bh+3)+' l0,14" stroke="var(--mute)" stroke-width="1.6" marker-end="url(#heroA)"/>'}}});
    const y0=wide?bh+14:4*bh+3*22+8;
    if(wide)s+=tx(0,y0+14,'Every generated token runs all four: 1.76B parameters; 219.5M of them train.',{fs:12.5,w:600});
    else{s+=tx(0,y0+14,'Every token runs all four: 1.76B parameters;',{fs:12.5,w:600});s+=tx(0,y0+32,'219.5M of them train.',{fs:12.5,w:600})}
    el.innerHTML=svgW(w,y0+(wide?22:40),'<defs><marker id="heroA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>'+s,'The CombinedModel as the released code builds it: frozen Qwen2-1.5B, a two-layer cross-attention bridge, a randomly initialised GPT-Neo-sized decoder and a new output layer; 1.76 billion parameters run per token')});
  onTab('t-read',()=>refit(el));
})();
