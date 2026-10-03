// ---- Reading: three endpoints, three ways (cosine re-run per length, WSD branches, schedule-free) on the noisy quadratic ----
(function(G){
  const TS=[250,500,1000],TM=1000;
  const grid=[];for(let k=-24;k<=2;k++)grid.push(Math.pow(10,k/8));
  function best(f){let b=grid[0],bl=Infinity;for(const lr of grid){const v=f(lr);if(v<bl){bl=v;b=lr}}return b}
  // cosine: re-tuned for every length (its advantage: one run per length, each tuned for it)
  const cos=TS.map(T=>{const lr=best(lr=>NQM.sgd('cosine',T,lr)[T]);return{T,lr,L:NQM.sgd('cosine',T,lr)}});
  // WSD: one constant run; one learning rate (tuned for the 1,000-step branch); a cooldown branch per length
  const wlr=best(lr=>NQM.sgd('wsd',TM,lr)[TM]);const wsd=TS.map(T=>({T,lr:wlr,L:NQM.sgd('wsd',T,wlr)}));
  const constL=NQM.sgd('const',TM,wlr);
  // schedule-free SGD: one run, one learning rate (tuned for 1,000 steps), read at each endpoint
  const slr=best(lr=>NQM.sf(TM,lr)[TM]);const sfL=NQM.sf(TM,slr);
  // constant LR without decay, tuned for 1,000 steps
  const clr=best(lr=>NQM.sgd('const',TM,lr)[TM]);const conL=NQM.sgd('const',TM,clr);
  const R={cos,wsd,wlr,slr,sfL,clr,conL,constL};G.END_RES=R;
  if(typeof document==='undefined')return;
  const card=document.getElementById('en-card');if(!card)return;
  const svg=document.getElementById('en-plot'),cap=document.getElementById('en-cap'),cnt=document.getElementById('en-cnt'),tab=document.getElementById('en-tab');
  let mode='cos';const F=60;
  // segments in the order the compute is spent: [curve, from, to, colour, endpoint T or null]
  function segs(m){
    if(m==='cos')return cos.map((c,i)=>({L:c.L,a:0,b:c.T,c:['var(--c1)','var(--c4)','var(--c2)'][i],end:c.T}));
    if(m==='wsd'){const s=[];let at=0;TS.forEach((T,i)=>{const st=T-Math.round(0.2*T);if(st>at){s.push({L:constL,a:at,b:st,c:'var(--c5)',end:null});at=st}
      s.push({L:wsd[i].L,a:st,b:T,c:['var(--c1)','var(--c4)','var(--c2)'][i],end:T})});return s}
    return [{L:sfL,a:0,b:TM,c:'var(--c3)',end:null,marks:TS}]}
  const total=m=>segs(m).reduce((a,s)=>a+s.b-s.a,0);
  const fmt=v=>v.toFixed(4);
  function draw(i){const S=segs(mode),tot=total(mode),budget=Math.round(tot*i/(F-1));
    const W=RD.width(svg.parentNode),H=230,ml=44,mr=18,mt=10,mb=28;const lo=Math.log10(0.0008),hi=Math.log10(1.5);
    const x=t=>ml+t/TM*(W-ml-mr),y=v=>mt+(hi-Math.log10(Math.max(v,1e-9)))/(hi-lo)*(H-mt-mb);
    let s='';[1,0.1,0.01,0.001].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(v)+4)+'" font-size="10.5" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
    [0,250,500,750,1000].forEach(t=>{s+='<text x="'+x(t)+'" y="'+(H-8)+'" font-size="10.5" text-anchor="middle" fill="var(--mute)">'+t+'</text>'});
    // reference: constant LR, no decay
    s+='<path d="'+[...conL].map((v,t)=>(t?'L':'M')+x(t).toFixed(1)+','+y(v).toFixed(1)).join('')+'" fill="none" stroke="var(--dim)" stroke-width="1.4"/>';
    let used=0,done=[];
    S.forEach(g=>{const len=g.b-g.a;const k=Math.max(0,Math.min(len,budget-used));used+=len;if(k<=0)return;
      let d='';for(let t=g.a;t<=g.a+k;t++)d+=(t===g.a?'M':'L')+x(t).toFixed(1)+','+y(g.L[t]).toFixed(1);
      s+='<path d="'+d+'" fill="none" stroke="'+g.c+'" stroke-width="2"/>';
      if(g.end&&k===len){done.push(g.end);s+='<circle cx="'+x(g.end)+'" cy="'+y(g.L[g.end])+'" r="4" fill="'+g.c+'"/>'}
      if(g.marks)g.marks.forEach(T=>{if(g.a+k>=T){done.push(T);s+='<circle cx="'+x(T)+'" cy="'+y(g.L[T])+'" r="4" fill="'+g.c+'"/>'}})});
    svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('width',W);svg.setAttribute('height',H);svg.innerHTML=s;
    cnt.innerHTML=RD.stat('optimiser steps spent',budget.toLocaleString('en-US'),'of '+tot.toLocaleString('en-US')+' for all three endpoints')+RD.stat('endpoints ready',done.length+' of 3',done.length?done.join(', ')+' steps':'')+
      RD.stat('learning rate',mode==='cos'?cos.map(c=>c.lr.toPrecision(2)).join(', '):(mode==='wsd'?wlr:slr).toPrecision(2),mode==='cos'?'one per length, each tuned':'one, tuned for 1,000 steps');
    const T1={cos:'Cosine must know its length: each endpoint is a separate run from step 0, tuned for that length. Three endpoints cost 250 + 500 + 1,000 = 1,750 steps.',
      wsd:'WSD runs one constant-rate trunk (gold) and branches a 1−sqrt cooldown over the last 20% of each length off it. The trunk is shared, so three endpoints cost 800 + 50 + 100 + 200 = 1,150 steps.',
      sf:'Schedule-free SGD keeps a constant rate and averages its iterates on the fly: one run of 1,000 steps, read at 250, 500 and 1,000, with no cooldown at all.'};
    cap.innerHTML='<div class="t">'+{cos:'Cosine, one run per length',wsd:'WSD, one trunk and three cooldowns',sf:'Schedule-free, one run'}[mode]+'</div><p>'+T1[mode]+'</p>'}
  // endpoint table (all methods, exact expected loss)
  tab.innerHTML='<table><thead><tr><th>Method</th><th class="num">loss at 250</th><th class="num">at 500</th><th class="num">at 1,000</th><th class="num">steps for all three</th></tr></thead><tbody>'+
    '<tr><td>Cosine to zero, re-run and re-tuned per length</td>'+cos.map(c=>'<td class="num">'+fmt(c.L[c.T])+'</td>').join('')+'<td class="num">1,750</td></tr>'+
    '<tr><td>WSD, 1−sqrt cooldown over the last 20%, branched</td>'+wsd.map(c=>'<td class="num">'+fmt(c.L[c.T])+'</td>').join('')+'<td class="num">1,150</td></tr>'+
    '<tr><td>Schedule-free SGD (momentum 0.9), one run</td>'+TS.map(T=>'<td class="num">'+fmt(sfL[T])+'</td>').join('')+'<td class="num">1,000</td></tr>'+
    '<tr><td class="mute">Constant rate, no decay (grey line)</td>'+TS.map(T=>'<td class="num mute">'+fmt(conL[T])+'</td>').join('')+'<td class="num mute">1,000</td></tr></tbody></table>';
  const an=RD.anim({card:'en-card',ctl:'en-ctl',n:F,ms:120,draw,label:'Steps spent'});
  document.querySelectorAll('#en-mode button').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.v;document.querySelectorAll('#en-mode button').forEach(x=>x.classList.toggle('on',x===b));an.reset(F);an.play()}));
  addEventListener('resize',()=>an.redraw());
})(typeof window!=='undefined'?window:globalThis);
