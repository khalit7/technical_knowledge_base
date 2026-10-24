// ---- Reading, hero figure (static): what share of each published pretraining mix came from each kind of source ----
// Data: PC.composition, written by src/make_composition.py from each source's table. Filtered Common Crawl in the page's highlight colour.
(function(){
  const el=document.getElementById('pc-hero');if(!el||!window.PC||!PC.composition)return;
  const D=PC.composition,esc=RD.esc;
  const COL={cc:'var(--acc)',cur:'var(--c6)',code:'var(--c3)',math:'var(--c5)',papers:'var(--c4)',books:'var(--c2)',wiki:'var(--mute)',other:'var(--dim)'};
  const SH={cc:'Web (CC)',cur:'Curated web',code:'Code',math:'Maths',papers:'Papers',books:'Books',wiki:'Wiki',other:'Other'};
  function draw(){
    const W=RD.width(el),nar=W<560,lw=nar?0:150,x0=lw,bw=W-x0-(nar?2:8),bh=nar?24:26,gap=nar?26:12;
    let s='',y=4;
    for(const m of D.mixes){
      if(nar){s+=RD.t(0,y+11,esc(m.name)+', '+m.year,{w:600});y+=15}
      else{s+=RD.t(0,y+12,esc(m.name),{w:600})+RD.t(0,y+24,String(m.year),{fill:'var(--mute)'})}
      let x=x0;const tot=Object.values(m.cats).reduce((a,b)=>a+b,0);
      for(const [k] of D.cats){const v=m.cats[k];if(!v)continue;const w=bw*v/Math.max(100,tot);
        s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+Math.max(.5,w-1).toFixed(1)+'" height="'+bh+'" fill="'+COL[k]+'"'+(k==='cc'?'':' fill-opacity=".8"')+'><title>'+esc(SH[k])+' '+v+'%</title></rect>';
        const lab=k==='cc'?(w>110?'Filtered CC '+Math.round(v)+'%':w>46?Math.round(v)+'%':''):(w>74?SH[k]+' '+Math.round(v)+'%':w>30?Math.round(v)+'%':'');
        if(lab)s+=RD.t((x+4).toFixed(1),y+bh/2+4,lab,{fill:k==='cc'?'var(--bg)':'var(--ink)',w:k==='cc'?600:400});
        x+=w}
      y+=bh+gap}
    el.innerHTML=RD.svg(W,y,s,'Share of each published pretraining mix by kind of source');
    const lg=document.getElementById('pc-hero-leg');
    if(lg&&!lg.dataset.done){lg.dataset.done=1;lg.innerHTML=D.cats.map(([k,n])=>'<span><i style="background:'+COL[k]+'"></i>'+esc(n)+'</span>').join('')}
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
