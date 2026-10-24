// ---- Reading, top: the hero figure. SmolLM3's three stages from its configs (data/mx2_data.json recipes.smollm3) and DeepSeekMath's CPT mix (paper §2.3). Static: nothing moves ----
(function(){
  const el=document.getElementById('mx2-hero-plot');if(!el)return;
  const S=window.MX2.recipes.smollm3,pct=x=>Math.round(100*x)+'%';
  const G=[['web_en','English web','var(--c1)'],['multilingual','multilingual','var(--c6)'],['code','code','var(--c3)'],['math','maths','var(--c2)'],['other','other','var(--c5)']];
  // DeepSeekMath continued pretraining, 500B tokens (arXiv 2402.03300 §2.3): shares as stated
  const DSM=[['maths web corpus',0.56,'var(--c2)',1],['GitHub code',0.20,'var(--c3)',.85],['arXiv',0.10,'var(--c5)',.85],['Common Crawl',0.10,'var(--c1)',.85],['AlgebraicStack',0.04,'var(--c2)',.5]];
  function draw(){
    const W=RD.width(el),narrow=W<720,t=RD.t;
    const lw=narrow?W:Math.round(W*0.58),rw=narrow?W:W-lw-24,rx=narrow?0:lw+24;
    const top=76,bh=narrow?150:170,lH=top+bh+40,rTop=narrow?lH+46:top,H=narrow?rTop+bh+44:lH;
    const T=S[S.length-1].to_T,L=6,xs=v=>L+v/T*(lw-2*L);
    let g=t(L,13,'Pretraining: SmolLM3, 11.14T tokens, three stages',{fs:12,w:600});
    // learning-rate line (warmup-stable-decay shape; decay over the last stage)
    const ly=v=>top-6-v*30,d0=S[S.length-1].from_T;let p='';
    for(let k=0;k<=200;k++){const x=k/200*T,v=x<0.15?x/0.15:x<d0?1:Math.max(0,1-(x-d0)/(T-d0));p+=(k?'L':'M')+xs(x).toFixed(1)+' '+ly(v).toFixed(1)}
    g+='<path d="'+p+'" fill="none" stroke="var(--mute)" stroke-width="1.6"/>'+t(xs(T*0.42),ly(1)+14,'learning rate',{a:'middle',fs:11,fill:'var(--mute)'});
    S.forEach((s,j)=>{const x0=xs(s.from_T),w=xs(s.to_T)-x0;let y=top;
      G.forEach(([k,nm,c])=>{const h=(s.groups[k]||0)*bh;g+='<rect x="'+(x0+0.5).toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+(w-1).toFixed(1)+'" height="'+h.toFixed(1)+'" fill="'+c+'"/>';
        if(h>=14&&w>=34)g+=t(x0+w/2,y+h/2+4,pct(s.groups[k]||0),{a:'middle',fs:11,fill:'var(--bg)',w:600});
        if(j===0&&h>=14&&w>140)g+=t(x0+8,y+h/2+4,nm,{fs:11,fill:'var(--bg)'});y+=h});
      g+=t(x0+(j?w/2:4),top+bh+15,j===S.length-1?'decay':j===0?'stage 1 (stable)':'2',{a:j?'middle':'start',fs:11,fill:'var(--mute)'})});
    g+=t(xs(0),top+bh+30,'0',{fs:11,fill:'var(--mute)'})+t(xs(T),top+bh+30,T+'T tokens',{a:'end',fs:11,fill:'var(--mute)'});
    // markers 1 and 2
    const mk=(x,y,n)=>'<circle cx="'+x+'" cy="'+y+'" r="9.5" fill="var(--ink)" stroke="var(--bg)" stroke-width="2"/>'+t(x,y+4,n,{a:'middle',fs:11,fill:'var(--bg)',w:700});
    g+=mk(xs(S[0].to_T*0.78),top+bh*0.36-4,'1')+mk(xs((d0+T)/2),ly(0.45),'2');
    // right: the CPT mix
    const bx=rx+62,bw=narrow?110:Math.min(76,rw*0.3);
    g+=t(rx,narrow?rTop-30:13,'CPT: DeepSeekMath, 500B tokens',{fs:12,w:600});
    if(!narrow)g+=t(rx,31,'on a 7B code model (not to scale)',{fs:11,fill:'var(--mute)'});
    else g+=t(rx,rTop-15,'on a 7B code model (not to scale)',{fs:11,fill:'var(--mute)'});
    let y=rTop;DSM.forEach(([nm,v,c,o],i)=>{const h=v*bh;g+='<rect x="'+bx+'" y="'+y.toFixed(1)+'" width="'+bw+'" height="'+h.toFixed(1)+'" fill="'+c+'" opacity="'+o+'"/>';
      if(h>=14)g+=t(bx+bw/2,y+h/2+4,pct(v),{a:'middle',fs:11,fill:'var(--bg)',w:600});
      g+=t(bx+bw+8,y+Math.max(11,h/2+4),nm+(h<14?' '+pct(v):''),{fs:11});y+=h});
    // bracket for the non-domain 44%
    const yA=rTop+0.56*bh,yB=rTop+bh,xb=bx-6;
    g+='<path d="M'+xb+' '+yA+' h-5 V'+yB+' h5" fill="none" stroke="var(--ink)" stroke-width="1.4"/>';
    g+=mk(bx+bw-2,rTop-2,'3');
    g+='<path d="M'+xb+' '+rTop+' h-5 V'+(yA-2)+' h5" fill="none" stroke="var(--acc)" stroke-width="1.4"/>'+t(xb-9,rTop+bh*0.28-2,'domain',{a:'end',fs:11,fill:'var(--acc)',w:600});
    g+=t(xb-9,(yA+yB)/2+4,'kept',{a:'end',fs:11,w:600});
    el.innerHTML=RD.svg(W,H,g,'SmolLM3 stage mixtures with the learning-rate shape, and DeepSeekMath\'s continued-pretraining mix');
  }
  RD.onRender(draw);RD.onResize(draw);draw();
})();
