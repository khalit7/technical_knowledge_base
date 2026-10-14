// ---- Quality lab: the same shard before and after a quality filter (canvas, step animation) ----
(function(){
  const D=window.QD,Q=window.QL;if(!D||!document.getElementById('q-shard'))return;
  const N=D.docs.edu.length,CUT=D.cut;
  const pr=a=>{const r=Q.ranks(a);return r.map(v=>v/(a.length-1))}; // percentile rank 0..1
  const P={edu:pr(D.docs.edu),dclm:pr(D.docs.dclm),own:pr(D.docs.own),ppl:D.docs.ppl[0]==null?null:pr(D.docs.ppl.map(v=>v==null?1e9:-v))};
  const F={
    edu:{name:'FineWeb-Edu classifier, int_score ≥ 3',score:i=>P.edu[i],keep:i=>D.docs.edu[i]>=2.5},
    dclm:{name:'DCLM fastText, P(hq) ≥ '+CUT.toFixed(4),score:i=>P.dclm[i],keep:i=>D.docs.dclm[i]>=CUT},
    and:{name:'both must keep (intersection)',score:i=>Math.min(P.edu[i],P.dclm[i]),keep:i=>F.edu.keep(i)&&F.dclm.keep(i)},
    or:{name:'either keeps (union; Nemotron-CC takes the maximum)',score:i=>Math.max(P.edu[i],P.dclm[i]),keep:i=>F.edu.keep(i)||F.dclm.keep(i)},
    own:{name:'our fastText (trained here), P(hq) ≥ '+D.own_thr,score:i=>P.own[i],keep:i=>D.docs.own[i]>=D.own_thr}
  };
  if(P.ppl)F.ccnet={name:'CCNet perplexity, head bucket (< 340)',score:i=>P.ppl[i],keep:i=>D.docs.ppl[i]!=null&&D.docs.ppl[i]<340};
  const STEPS=['The shard','Score every document','Sort by score','Draw the cut-off','Drop','Compare with another filter'];
  const CAP=[
    'All '+Q.fmt(N)+' documents that survived run0 (extraction, English ID, Gopher, C4 and FineWeb rules, MinHash, PII), one square each, in crawl order. Nothing here has been judged for quality yet.',
    'The classifier scores every document. Darker means a higher score, coloured by rank so the two classifiers share one scale.',
    'Sorted from highest to lowest score. The order is all a percentile threshold uses: DCLM keeps a top slice of its pool, FineWeb-Edu a fixed score.',
    'The cut-off. Everything after the line is about to be removed.',
    'Dropped documents fall into the pile below. The counters say what survives, in documents and in words.',
    'Squares outlined in orange are kept by this filter but dropped by the comparison filter; squares outlined in purple in the pile were dropped here but kept by the comparison filter.'];
  let f='edu',g='dclm',showLab=false,layout=null,from=null,t0=0,raf=0,step=0;const cv=document.getElementById('q-shard');
  const ctx=cv.getContext('2d');let geo={};
  function geom(){const W=Q.width(cv.parentElement);const s=W<500?5:W<760?6:8,gap=1,cols=Math.floor((W-2)/(s+gap));return {W,s,gap,cols}}
  function order(){const ix=[...Array(N).keys()];ix.sort((a,b)=>F[f].score(b)-F[f].score(a)||a-b);return ix}
  function target(st){const {s,gap,cols}=geo,pos=new Array(N);const u=s+gap;
    if(st<2){for(let i=0;i<N;i++)pos[i]=[(i%cols)*u,Math.floor(i/cols)*u];return {pos,h:Math.ceil(N/cols)*u,cut:null}}
    const ix=order();if(st<4){ix.forEach((d,k)=>pos[d]=[(k%cols)*u,Math.floor(k/cols)*u]);const nk=ix.filter(F[f].keep).length;
      return {pos,h:Math.ceil(N/cols)*u,cut:st===3?nk:null}}
    const kept=ix.filter(F[f].keep),drop=ix.filter(i=>!F[f].keep(i));const kr=Math.ceil(kept.length/cols);
    kept.forEach((d,k)=>pos[d]=[(k%cols)*u,Math.floor(k/cols)*u]);const y0=kr*u+28;
    drop.forEach((d,k)=>pos[d]=[(k%cols)*u,y0+Math.floor(k/cols)*u]);return {pos,h:y0+Math.ceil(drop.length/cols)*u,cut:null,pile:kr*u+6}}
  function col(i,st){if(st<1)return Q.cv('--dim');const v=F[f].score(i);return 'hsl(150,'+Math.round(25+40*v)+'%,'+Math.round(82-52*v)+'%)'}
  function paint(p){
    const dpr=window.devicePixelRatio||1,{W,s}=geo,h=Math.max(layout.h,from?from.h:0)+4;
    cv.width=Math.round(W*dpr);cv.height=Math.round(h*dpr);cv.style.width=W+'px';cv.style.height=h+'px';ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,h);const e=p>=1?1:1-Math.pow(1-p,3);
    const bad=Q.cv('--bad'),c4=Q.cv('--c4'),ink=Q.cv('--ink');
    for(let i=0;i<N;i++){const a=layout.pos[i],b=from?from.pos[i]:a;const x=b[0]+(a[0]-b[0])*e,y=b[1]+(a[1]-b[1])*e;
      ctx.globalAlpha=(step>=3&&!F[f].keep(i))?0.45:1;ctx.fillStyle=col(i,step);ctx.fillRect(x,y,s,s);ctx.globalAlpha=1;
      if(step>=5&&p>=1){const k1=F[f].keep(i),k2=F[g].keep(i);if(k1&&!k2){ctx.strokeStyle=bad;ctx.lineWidth=1.4;ctx.strokeRect(x+.5,y+.5,s-1,s-1)}
        else if(!k1&&k2){ctx.strokeStyle=c4;ctx.lineWidth=1.4;ctx.strokeRect(x+.5,y+.5,s-1,s-1)}}
      if(showLab&&D.docs.lab[i]>=0){const L=D.labels[D.docs.lab[i]];ctx.fillStyle=L.k==='y'?Q.cv('--good'):L.k==='n'?bad:ink;ctx.beginPath();ctx.arc(x+s/2,y+s/2,Math.max(1.6,s/3),0,7);ctx.fill()}}
    if(layout.cut!=null&&p>=1){const {cols}=geo,u=geo.s+geo.gap,k=layout.cut,r=Math.floor(k/cols),c=k%cols;
      ctx.strokeStyle=ink;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(c*u-1,r*u);ctx.lineTo(c*u-1,(r+1)*u);ctx.moveTo(c*u-1,r*u);ctx.lineTo(W,r*u);
      ctx.moveTo(0,(r+1)*u);ctx.lineTo(c*u-1,(r+1)*u);ctx.stroke()}
    if(layout.pile!=null&&p>=1){ctx.fillStyle=Q.cv('--mute');ctx.font='12px system-ui,sans-serif';ctx.fillText('dropped',0,layout.pile+14)}
  }
  function go(st){step=st;geo=geom();const nl=target(st);from=layout&&layout.pos.length?layout:null;layout=nl;cancelAnimationFrame(raf);
    if(Q.RM||!from){paint(1)}else{t0=performance.now();const fr=()=>{const p=Math.min(1,(performance.now()-t0)/650);paint(p);if(p<1)raf=requestAnimationFrame(fr)};raf=requestAnimationFrame(fr)}
    stats();document.getElementById('q-shard-cap').innerHTML='<b>Step '+(st+1)+' of '+STEPS.length+': '+STEPS[st]+'.</b> '+CAP[st]}
  function stats(){let k=0,w=0,W=0,a=0;for(let i=0;i<N;i++){W+=D.docs.words[i];if(F[f].keep(i)){k++;w+=D.docs.words[i];if(F[g].keep(i))a++}}
    const el=document.getElementById('q-shard-stats');const s=step>=4;
    el.innerHTML='<div class="stat"><div class="k">documents kept</div><div class="v">'+(s?Q.fmt(k):'&ndash;')+'</div><div class="d">'+(s?Q.pct(k/N)+' of '+Q.fmt(N):'of '+Q.fmt(N))+'</div></div>'+
      '<div class="stat"><div class="k">words kept</div><div class="v">'+(s?Q.pct(w/W):'&ndash;')+'</div><div class="d">'+Q.fmt(W)+' words in the shard</div></div>'+
      '<div class="stat"><div class="k">also kept by the comparison</div><div class="v">'+(step>=5?Q.fmt(a):'&ndash;')+'</div><div class="d">'+(step>=5?(k?Q.pct(a/k):'n/a')+' of this filter\'s keeps':'step 6')+'</div></div>'}
  const A=Q.anim({card:'q-shard-card',ctl:'q-shard-ctl',n:STEPS.length,ms:2200,label:'Shard animation step',draw:i=>go(i)});
  const sel=document.getElementById('q-shard-f'),sel2=document.getElementById('q-shard-g');
  const opts=Object.keys(F).map(k=>'<option value="'+k+'">'+Q.esc(F[k].name)+'</option>').join('');sel.innerHTML=opts;sel2.innerHTML=opts;sel.value=f;sel2.value=g;
  sel.addEventListener('change',()=>{f=sel.value;if(g===f){g=f==='edu'?'dclm':'edu';sel2.value=g}layout=null;A.redraw()});
  sel2.addEventListener('change',()=>{g=sel2.value;A.redraw()});
  document.getElementById('q-shard-lab').addEventListener('change',e=>{showLab=e.target.checked;paint(1)});
  cv.addEventListener('click',e=>{if(!layout)return;const r=cv.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top,s=geo.s;
    for(let i=0;i<N;i++){const p=layout.pos[i];if(x>=p[0]-1&&x<=p[0]+s+1&&y>=p[1]-1&&y<=p[1]+s+1){if(window.QI)window.QI.show(i);return}}});
  Q.onResize(()=>{layout=null;A.redraw()});Q.onRender(()=>{layout=null;A.redraw()});
})();
