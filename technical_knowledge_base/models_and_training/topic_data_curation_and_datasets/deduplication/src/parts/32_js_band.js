// ---- Band designer (Reading section 3, #rd-band; was tab t-band) ----
(function(){
  const B=DP.band,U=DPU,$=id=>document.getElementById(id);
  const masks=B.masks.map(m=>({j:m[0],u:U.b64(m[1])}));
  // all pairs' true Jaccard, for expected counts: masks' J, ones at 1, low pairs from the 0.001-bin histogram (bin centres), the rest 0
  const lowJ=[];B.jhist_lt001.forEach((c,i)=>{for(let k=0;k<c;k++)lowJ.push((i+0.5)/1000)});
  $('dp-bd-np').textContent=U.fmt(masks.length+B.ones);$('dp-bd-n1').textContent=B.ones;$('dp-bd-nm').textContent=masks.length;
  const PRE={fw:{b:14,r:8,t:0.75,k:112},d3:{b:26,r:11,t:0.8,k:286},nemo:{b:20,r:13,t:0.8,k:256},dsk:{t:0.9,k:128,opt:1},td:{t:0.7,k:250,opt:1},rw:{b:450,r:20,t:0.8,k:9000}};
  let st={t:0.75,K:112,w:0.5,mode:'man',b:14,r:8,pre:'fw'};
  const isCand=(u,b,r)=>{for(let k=0;k<b;k++){let all=1;for(let i=k*r;i<(k+1)*r;i++)if(!U.bit(u,i)){all=0;break}if(all)return 1}return 0};
  let optCache={};
  function choose(){if(st.mode==='opt'){const key=st.t+'|'+st.K+'|'+st.w;
      if(!optCache[key])optCache[key]=U.optimal(st.t,st.K,1-st.w,st.w);const o=optCache[key];st.b=o.b;st.r=o.r}}
  function render(){choose();const {b,r,t}=st,K=st.K;
    $('dp-bd-tv').textContent=t.toFixed(2);$('dp-bd-wv').textContent=st.w.toFixed(2);
    const bs=$('dp-bd-b'),rs=$('dp-bd-r');bs.max=Math.max(1,Math.min(1024,K));rs.max=Math.max(1,Math.min(64,K));
    if(b<=+bs.max)bs.value=b;if(r<=+rs.max)rs.value=r;$('dp-bd-bv').textContent=b;$('dp-bd-rv').textContent=r;
    const measurable=b*r<=B.K;
    // measured candidate rate per 0.05 bin
    const bins=[];for(let i=0;i<20;i++)bins.push({n:0,c:0});
    let miss=0,above=0,below=0,belowMeas=0;
    if(measurable)masks.forEach(m=>{const c=isCand(m.u,b,r),k=Math.min(19,Math.floor(m.j/0.05));bins[k].n++;bins[k].c+=c;
      if(m.j>=t){above++;if(!c)miss++}else if(c)belowMeas++});
    bins[19].n+=B.ones;bins[19].c+=B.ones;above+=B.ones;
    // expected over all pairs
    let expBelow=0,expAbove=0;masks.forEach(m=>{const p=U.P(m.j,b,r);if(m.j<t)expBelow+=p;else expAbove+=p});
    lowJ.forEach(j=>{expBelow+=U.P(j,b,r)});expAbove+=B.ones;
    // chart
    const el=$('dp-bd-plot'),w=Math.min(760,RD.width(el)),h=260;
    const F=U.frame(w,h,[0,1],[0,1],{xt:[0,0.2,0.4,0.6,0.8,1],xf:v=>v.toFixed(1),yt:[0,0.25,0.5,0.75,1],yf:v=>Math.round(100*v)+'%',xl:'true Jaccard similarity',yl:'candidate rate'});
    let g=F.g;const pts=[];for(let i=0;i<=250;i++){const s=i/250;pts.push([F.X(s),F.Y(U.P(s,b,r))])}
    g+='<rect x="'+F.X(0)+'" y="'+F.m.t+'" width="'+(F.X(t)-F.X(0))+'" height="'+(h-F.m.t-F.m.b)+'" fill="var(--bad)" opacity=".05"/>';
    g+='<line x1="'+F.X(t)+'" x2="'+F.X(t)+'" y1="'+F.m.t+'" y2="'+(h-F.m.b)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>'+RD.t(F.X(t)+4,F.m.t+12,'target '+t.toFixed(2),{fs:10.5});
    const th=U.thr(b,r);g+='<line x1="'+F.X(th)+'" x2="'+F.X(th)+'" y1="'+F.Y(0.5)+'" y2="'+(h-F.m.b)+'" stroke="var(--c4)" stroke-dasharray="2 2"/>';
    g+='<path d="'+U.path(pts)+'" fill="none" stroke="var(--bad)" stroke-width="2"/>';
    const mx=Math.max(...bins.map(x=>x.n));
    if(measurable)bins.forEach((x,i)=>{if(!x.n)return;const s=(i+0.5)*0.05,rad=2.5+5*Math.sqrt(x.n/mx);
      g+='<circle cx="'+F.X(s).toFixed(1)+'" cy="'+F.Y(x.c/x.n).toFixed(1)+'" r="'+rad.toFixed(1)+'" fill="var(--acc)" opacity=".8"><title>'+(i*0.05).toFixed(2)+' to '+((i+1)*0.05).toFixed(2)+': '+x.c+' of '+x.n+' pairs</title></circle>'});
    el.innerHTML=RD.svg(w,h,g,'S-curve with measured candidate rates');
    $('dp-bd-res').innerHTML='<b>'+b+' bands &times; '+r+' rows</b> = '+U.fmt(b*r)+' hashes'+(b*r<K&&K<9000?' ('+(K-b*r)+' of '+K+' unused)':'')+'; steepest near (1/<i>b</i>)<sup>1/<i>r</i></sup> = '+th.toFixed(3)+'; P(candidate) at '+t.toFixed(2)+' = '+U.pct(U.P(t,b,r))+', at 0.5 = '+U.pct(U.P(0.5,b,r),2)+(measurable?'':'. <b>More than 1,024 hashes: no measured dots, formula only.</b>');
    const s=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+d+'</div></div>';
    $('dp-bd-cnt').innerHTML=(measurable?s('pairs at or above target missed',miss+' of '+above,'measured on real pairs'):'')+
      (measurable?s('candidates below target, measured',U.fmt(belowMeas),'among the '+U.fmt(masks.length+B.ones)+' pairs with J &ge; 0.01'):'')+
      s('expected candidates below target',U.fmt(expBelow,1),'over all '+U.fmt(B.n_pairs)+' pairs (formula)')+
      s('signatures per 10<sup>9</sup> documents',U.bytes(1e9*b*r*8),'b &times; r &times; 8 bytes');
    $('dp-bd-note').innerHTML='Dashed black: the target; dotted purple: (1/<i>b</i>)<sup>1/<i>r</i></sup>; shaded: below the target, where candidates are false positives (to be removed, or caught by a Jaccard check). Expected counts use '+U.fmt(lowJ.length)+' pairs with 0 &lt; J &lt; 0.01 at their bin centre and '+U.fmt(B.n_none)+' pairs with no shared shingle (never candidates).'}
  function syncSeg(){[...$('dp-bd-pre').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x.dataset.m===st.pre));
    [...$('dp-bd-mode').querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x.dataset.m===st.mode))}
  RD.seg($('dp-bd-pre'),m=>{const p=PRE[m];st.pre=m;st.t=p.t;st.K=p.k;st.w=0.5;$('dp-bd-t').value=p.t;$('dp-bd-w').value=0.5;
    const ks=$('dp-bd-k');if(![...ks.options].some(o=>+o.value===p.k)){const o=document.createElement('option');o.textContent=p.k;ks.appendChild(o)}ks.value=p.k;
    if(p.opt){st.mode='opt'}else{st.mode='man';st.b=p.b;st.r=p.r}syncSeg();render()});
  RD.seg($('dp-bd-mode'),m=>{st.mode=m;st.pre='';syncSeg();render()});
  $('dp-bd-t').addEventListener('input',e=>{st.t=+e.target.value;st.pre='';syncSeg();render()});
  $('dp-bd-w').addEventListener('input',e=>{st.w=+e.target.value;st.pre='';syncSeg();render()});
  $('dp-bd-k').addEventListener('change',e=>{st.K=+e.target.value;st.pre='';if(st.b*st.r>st.K){st.r=Math.max(1,Math.floor(st.K/st.b))}syncSeg();render()});
  $('dp-bd-b').addEventListener('input',e=>{st.mode='man';st.pre='';st.b=+e.target.value;if(st.b*st.r>st.K)st.r=Math.max(1,Math.floor(st.K/st.b));syncSeg();render()});
  $('dp-bd-r').addEventListener('input',e=>{st.mode='man';st.pre='';st.r=+e.target.value;if(st.b*st.r>st.K)st.b=Math.max(1,Math.floor(st.K/st.r));syncSeg();render()});
  U.onTab('t-read',render);
  window.DPBAND={optimal:(t,K)=>U.optimal(t,K,0.5,0.5)};
})();
