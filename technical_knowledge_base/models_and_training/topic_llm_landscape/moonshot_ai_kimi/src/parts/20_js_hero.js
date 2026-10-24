// ---- Reading, hero: K2 and K3 as one square per layer, coloured by attention type, with K3's Attention Residuals blocks; drawn at the measured width from the configs ----
(function(){
  const el=document.getElementById('heroSvg');if(!el)return;
  // K2: 61 MLA layers (config). K3: 93 layers, full attention at 4, 8, ..., 92 and 93 (config full_attn_layers), AttnRes blocks of 12 (attn_res_block_size).
  const k3mla=i=>i%4===0||i===93;
  function draw(){
    const W=RD.width(el),narrow=W<560,cw=W/93,g=cw>6?1.2:0.6,sq=narrow?16:20;let s='',y=0;
    const strip=(n,col,yy)=>{let o='';for(let i=1;i<=n;i++)o+='<rect x="'+((i-1)*cw+g/2).toFixed(2)+'" y="'+yy+'" width="'+Math.max(cw-g,0.8).toFixed(2)+'" height="'+sq+'" rx="1.5" fill="'+col(i)+'"/>';return o};
    // K2 row
    s+=RD.t(0,y+14,'<tspan font-weight="600">Kimi K2</tspan><tspan fill="var(--mute)"> · Jul 2025 · the DeepSeek-V3 template</tspan>',{fs:12.5});
    if(narrow){s+=RD.t(0,y+30,'61 layers, every one caches (MLA)',{fs:12,fill:'var(--c2)',w:600});y+=36}else{s+=RD.t(W,y+14,'61 layers, every one caches (MLA)',{a:'end',fs:12.5,fill:'var(--c2)',w:600});y+=21}
    s+=strip(61,()=>'var(--c2)',y);y+=sq+22;
    // K3 row
    s+=RD.t(0,y+14,'<tspan font-weight="600">Kimi K3</tspan><tspan fill="var(--mute)"> · Jul 2026</tspan>',{fs:12.5});
    if(narrow){s+=RD.t(0,y+30,'<tspan fill="var(--acc)" font-weight="600">69 KDA layers keep a fixed state;</tspan>',{fs:12});s+=RD.t(0,y+45,'<tspan fill="var(--c2)" font-weight="600">24 Gated MLA layers cache</tspan>',{fs:12});y+=51}
    else{s+=RD.t(W,y+14,'<tspan fill="var(--acc)" font-weight="600">69 KDA layers keep a fixed state</tspan><tspan fill="var(--mute)">; </tspan><tspan fill="var(--c2)" font-weight="600">24 Gated MLA layers cache</tspan>',{a:'end',fs:12.5});y+=21}
    s+=strip(93,i=>k3mla(i)?'var(--c2)':'var(--acc)',y);
    // AttnRes brackets: blocks 1-12, 13-24, ..., 85-93
    const by=y+sq+5;
    for(let b=0;b<8;b++){const a=b*12,e=Math.min(93,a+12),x1=a*cw+1,x2=e*cw-1;
      s+='<path d="M'+x1.toFixed(1)+' '+by+'v5H'+x2.toFixed(1)+'v-5" fill="none" stroke="var(--c4)" stroke-width="1.3"/>';
      if(!narrow||b%2===0)s+=RD.t(((x1+x2)/2).toFixed(1),by+17,'B'+(b+1),{a:'middle',fs:10.5,fill:'var(--c4)'})}
    y=by+24;
    s+=RD.t(0,y+10,'<tspan fill="var(--c4)" font-weight="600">Attention Residuals</tspan><tspan fill="var(--mute)">: 8 blocks of up to 12 layers</tspan>',{fs:narrow?11.5:12});
    y+=16;
    el.innerHTML=RD.svg(W,y,s,'Kimi K2 has 61 MLA layers; Kimi K3 has 93 layers, three KDA layers then one Gated MLA layer, ending with an extra MLA layer, grouped into 8 Attention Residuals blocks');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
