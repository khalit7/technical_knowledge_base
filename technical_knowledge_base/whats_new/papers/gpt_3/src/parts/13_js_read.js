// ---- The paper tab: Figure 1.3 recomputed (beside The scaling pattern), data mix, compute, predict reveals, tokens per parameter ----
(function(){
  // Fig. 2 (in-context against fine-tuning) is the 3D stage in 32_js_sc_icl.js; Fig. 1 (the eight sizes) is 31_js_sc_hero.js

  // Data mix: tokens available against share of the 300B mix, to scale
  fit($('mixSvg'),W=>{const M=RC.mix,cols=['var(--c1)','var(--c3)','var(--c5)','var(--c4)','var(--c2)'],narrow=W<520;let s='';const tot=M.reduce((a,m)=>a+m.tokens,0),wt=M.reduce((a,m)=>a+m.weight,0);
    const row=(y,lab,vals,sum,txt)=>{s+=tx(0,y-6,lab,{fs:12,w:600});let x=0;vals.forEach((v,i)=>{const w=(W-2)*v/sum;s+=rc(x,y,w,22,cols[i],{r:2,op:.9});if(w>(narrow?44:60))s+=tx(x+4,y+15,txt(i),{fs:11,c:'var(--bg)',w:600});x+=w})};
    row(20,'tokens available (499B)',M.map(m=>m.tokens),tot,i=>(100*M[i].tokens/tot).toFixed(0)+'%');
    row(72,'share of the 300B training tokens',M.map(m=>m.weight),wt,i=>Math.round(100*M[i].weight)+'%');
    let lx=0,ly=112;M.forEach((m,i)=>{const t=m.name.replace(' (filtered)','')+' '+m.epochs_printed+' ep',w=t.length*6.6+22;if(lx+w>W){lx=0;ly+=16}s+=rc(lx,ly-9,10,10,cols[i],{r:2})+tx(lx+14,ly,escH(t),{fs:11});lx+=w});
    $('mixSvg').innerHTML=svgW(W,ly+8,s,'Table 2.2 data mix')});

  // Figure 2.2 from Table D.1, log scale
  fit($('cmpSvg'),W=>{const C=RC.compute,narrow=W<520,lw=narrow?96:118,pr=60,rh=narrow?19:18,H=C.length*rh+30,lg=Math.log10,lo=0,hi=lg(5000),X=v=>lw+(W-lw-pr)*(lg(v)-lo)/(hi-lo);let s='';
    [1,10,100,1000].forEach(t=>{s+=ln2(X(t),4,X(t),C.length*rh+6,'var(--line)')+tx(X(t),C.length*rh+20,fmt(t),{fs:11,a:'middle',c:'var(--mute)'})});
    C.forEach((c,i)=>{const y=6+i*rh,g=c.name.startsWith('GPT-3');s+=tx(lw-6,y+12,c.name,{fs:11,a:'end',w:c.name==='GPT-3 175B'?600:null});s+=rc(lw,y+2,Math.max(1,X(Math.max(1,c.pfd))-lw),rh-6,g?'var(--c1)':'var(--dim)',{r:2});s+=tx(X(Math.max(1,c.pfd))+4,y+12,c.pfd>=100?fmt(c.pfd):c.pfd.toFixed(1),{fs:11})});
    $('cmpSvg').innerHTML=svgW(W,H,s,'training compute in petaflop/s-days')});

  // Predict reveals
  // The scaling pattern: Figure 1.3 recomputed from Table H.1 (mean of the 41 accuracy rows), with the few-minus-zero gap marked at both ends
  fit($('f13Svg'),W=>{const A=RC.agg;let svg=sizeChart(W,{ylab:'mean accuracy (%)',dom:[15,62],series:[{y:A.f,c:SETC.f,n:'few-shot'},{y:A.o,c:SETC.o,n:'one-shot'},{y:A.z,c:SETC.z,n:'zero-shot'}]});
    // the gap brackets: same scale as sizeChart (pl 40, pt 10, pb 34, H 250 or 280)
    const narrow=W<520,pl=40,pr=narrow?58:88,pt=10,pb=34,H=narrow?250:280,x0=LX[0]-.08,x1=LX[7]+.08,X=v=>pl+(W-pl-pr)*(v-x0)/(x1-x0),Y=v=>pt+(H-pt-pb)*(1-(v-15)/(62-15));
    const halo=t=>t.replace('<text','<text stroke="var(--bg)" stroke-width="4" paint-order="stroke"');
    const br=(i,dx,lab,anc,ly)=>{const x=X(LX[i])+dx,ya=Y(A.f[i]),yb=Y(A.z[i]);return ln2(x,ya,x,yb,'var(--ink)',{sw:1.4})+ln2(x-3,ya,x+3,ya,'var(--ink)',{sw:1.4})+ln2(x-3,yb,x+3,yb,'var(--ink)',{sw:1.4})+halo(tx(x+(anc==='end'?-4:8),ly(ya,yb),lab,{fs:11,a:anc,w:600}))};
    const add=br(0,-10,'gap '+RC.agg_gap[0].toFixed(1),'start',(ya,yb)=>yb+17)+br(7,-12,'gap '+RC.agg_gap[7].toFixed(1)+' points','end',(ya,yb)=>ya-6);
    $('f13Svg').innerHTML=svg.replace('</svg>',add+'</svg>')});
  function arith(m){const T=RC.tasks.filter(t=>t.cat.startsWith('Arithmetic'));const cs=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)','var(--mute)','var(--bad)','var(--good)'];
    fit($('arSvg'),W=>{$('arSvg').innerHTML=sizeChart(W,{title:'Arithmetic, '+SETN[m]+' (Table H.1)',ylab:'exact-match accuracy (%)',dom:[0,100],series:T.map((t,i)=>({y:t[m],c:cs[i],n:t.name,sw:1.6}))})})}
  PRED_REVEAL.pAr=()=>{arith('f');const t=RC.tasks.find(x=>x.name==='3D+');$('arNote').innerHTML='3-digit addition few-shot: '+t.f.map((v,i)=>SZ[i]+' '+v).join(', ')+'. Everything below 13B is near zero; the jump comes in the last step (Figure 3.10). Exact match is all or nothing: an answer with one wrong digit scores 0, which is why '+A('https://arxiv.org/abs/2304.15004','Schaeffer et al. (2023)')+' argue such jumps partly reflect the metric. A straight line through the seven smaller models in log(parameters) predicts '+(()=>{const F=linfit(LX.slice(0,7),t.f.slice(0,7));return (F.a+F.b*LX[7]).toFixed(1)})()+'% for 175B (<a href="#" data-tab="t-run">refit it</a>).';
    document.querySelectorAll('#arNote a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();document.querySelector('#tabs button[data-t=t-run]').click()}))};
  segBind('arM',m=>arith(m));
  PRED_REVEAL.pCo=()=>{fit($('coSvg'),W=>{$('coSvg').innerHTML=contamChart(W)});const n2=RC.c1.filter(c=>Math.abs(c.rel_recomputed)<=2).length;
    $('coNote').innerHTML=n2+' of '+RC.c1_n+' benchmarks move by 2% or less (shaded band) on the clean subset; the big moves are the ones the authors examined: DROP and QuAC are over 90% flagged but only the passages, not the questions, were in training; the word tasks lose their trivial items (palindromes) when cleaned. Rebuilt from Table C.1 (Figure 4.2).'};

  // Tokens per parameter, log scale
  fit($('tppSvg'),W=>{const D=[['GPT-3 175B (2020)',300e9,175e9,'var(--c2)'],['Chinchilla 70B (2022)',1.4e12,70e9,'var(--c1)'],['Chinchilla Table 3: optimal 175B',3.7e12,175e9,'var(--c1)'],['LLaMA 65.2B (2023)',1.4e12,65.2e9,'var(--c3)'],['LLaMA 6.7B (2023)',1.0e12,6.7e9,'var(--c3)'],['Llama 3 405B (2024)',15.6e12,405e9,'var(--c4)']];
    const narrow=W<520,lw=narrow?0:220,pr=50,rh=narrow?34:20,H=D.length*rh+30,lg=Math.log10,lo=0,hi=lg(300),X=v=>lw+(W-lw-pr)*(lg(v)-lo)/(hi-lo);let s='';
    [1,10,100].forEach(t=>{s+=ln2(X(t),4,X(t),D.length*rh+6,'var(--line)')+tx(X(t),D.length*rh+20,t,{fs:11,a:'middle',c:'var(--mute)'})});s+=ln2(X(20),4,X(20),D.length*rh+6,'var(--c1)',{da:'3 3'})+tx(X(20),D.length*rh+20,'≈20',{fs:11,a:'middle',c:'var(--c1)'});
    D.forEach((d,i)=>{const y=6+i*rh,v=d[1]/d[2],by=narrow?y+15:y+2;s+=narrow?tx(0,y+11,d[0],{fs:11}):tx(lw-6,y+12,d[0],{fs:11,a:'end'});s+=rc(lw,by,Math.max(1,X(v)-lw),13,d[3],{r:2,op:.85})+tx(X(v)+4,by+11,v<10?v.toFixed(1):fmt(v),{fs:11})});
    $('tppSvg').innerHTML=svgW(W,H,s,'training tokens per parameter')});
})();
