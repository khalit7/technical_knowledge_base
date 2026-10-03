// ---- Reading 1: feature scaling on the Wine data, raw units against standardised (or min-max), k = 20 nearest neighbours ----
(function(){
  const P=NID.wine.pts;// [proline, hue, class, train?]
  const K=20,svg=document.getElementById('sc-svg');if(!svg)return;
  const tr=P.filter(p=>p[3]===1),te=P.filter(p=>p[3]===0);
  const COL=['var(--c1)','var(--c2)','var(--c3)'],NAME=['cultivar 1','cultivar 2','cultivar 3'];
  let mode='std';
  // scaler fitted on the training wines only (population standard deviation, as StandardScaler)
  function fit(){const s={};for(const j of [0,1]){const v=tr.map(p=>p[j]);const n=v.length,mu=v.reduce((a,b)=>a+b,0)/n;
      const sd=Math.sqrt(v.reduce((a,b)=>a+(b-mu)*(b-mu),0)/n);s[j]={mu,sd,mn:Math.min(...v),mx:Math.max(...v)}}return s}
  const S=fit();
  const tf=(p,m)=>m==='raw'?[p[0],p[1]]:m==='std'?[(p[0]-S[0].mu)/S[0].sd,(p[1]-S[1].mu)/S[1].sd]:[(p[0]-S[0].mn)/(S[0].mx-S[0].mn),(p[1]-S[1].mn)/(S[1].mx-S[1].mn)];
  function knn(q,m){const a=tf(q,m);const d=tr.map((p,i)=>{const b=tf(p,m);const dx=a[0]-b[0],dy=a[1]-b[1];return {i,d:dx*dx+dy*dy,fx:dx*dx}});
    d.sort((u,v)=>u.d-v.d||u.i-v.i);const nb=d.slice(0,K);const c=[0,0,0];nb.forEach(o=>c[tr[o.i][2]]++);
    let best=0;for(let k=1;k<3;k++)if(c[k]>c[best])best=k;
    const share=nb.reduce((s,o)=>s+(o.d>0?o.fx/o.d:1),0)/K;return {nb:nb.map(o=>o.i),pred:best,votes:c,share}}
  function acc(m){let ok=0;te.forEach(q=>{if(knn(q,m).pred===q[2])ok++});return ok/te.length}
  const ACC={raw:acc('raw'),std:acc('std'),mm:acc('mm')};
  // query: first test wine misclassified in raw units and correct after scaling (by both scalers)
  let Q=te.find(q=>knn(q,'raw').pred!==q[2]&&knn(q,'std').pred===q[2]&&knn(q,'mm').pred===q[2])||te[0];
  // layouts in SVG coordinates
  let Wd=600,Ht=340;const pad={l:46,r:12,t:14,b:34};
  function frame(m){
    if(m==='raw'){const x0=200,x1=1800;const yc=(S[1].mn+S[1].mx)/2,h=(x1-x0)*(Ht-pad.t-pad.b)/(Wd-pad.l-pad.r);return {x0,x1,y0:yc-h/2,y1:yc+h/2}}
    if(m==='std')return {x0:-2.2,x1:3.4,y0:-2.6,y1:2.6};
    return {x0:-0.1,x1:1.15,y0:-0.05,y1:1.13}}
  function xy(p,m){const f=frame(m),a=tf(p,m);return [pad.l+(a[0]-f.x0)/(f.x1-f.x0)*(Wd-pad.l-pad.r),Ht-pad.b-(a[1]-f.y0)/(f.y1-f.y0)*(Ht-pad.t-pad.b)]}
  const fmt=(v,d)=>(+v).toFixed(d===undefined?2:d);
  // steps: 0 raw, 1 raw neighbours, 2 morph, 3 scaled neighbours, 4 all test wines
  const CAP=[
    ['Raw units, drawn to the same scale on both axes','Proline spans about 1,400 mg/L, hue about 1.2, so on equal axes every wine sits on a flat line: hue is invisible to anything that measures distance.'],
    ['20 nearest neighbours, raw','The ringed test wine collects its 20 nearest training wines. Most of the distance is proline, so the neighbours are a vertical stripe of wines with similar proline, whatever their hue, and the vote goes to the wrong cultivar.'],
    ['Standardise: subtract each feature\'s mean, divide by its standard deviation','Both features now have mean 0 and standard deviation 1 on the training wines. Nothing about the wines changed; only the units.'],
    ['20 nearest neighbours, standardised','Hue now counts as much as proline, the neighbourhood is a round patch, and the vote goes to the right cultivar.'],
    ['Every test wine','Each of the 54 test wines voted by its 20 neighbours, in raw units and after scaling; crosses mark the wrong votes in the current units.']];
  let morph=0,raf=0;
  function draw(i){
    Wd=Math.max(320,Math.min(600,RD.width(svg.parentNode)));Ht=Wd<500?300:340;svg.setAttribute('viewBox','0 0 '+Wd+' '+Ht);
    const m=mode,sc=i>=2;let t=i===2?morph:(sc?1:0);
    const pos=p=>{const a=xy(p,'raw'),b=xy(p,m);return [a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]};
    const um=sc?m:'raw',kq=knn(Q,um),nbset=new Set(i===1||i===3?kq.nb:[]);
    let h='';
    // axes
    const f=frame(sc?m:'raw');
    h+='<line x1="'+pad.l+'" y1="'+(Ht-pad.b)+'" x2="'+(Wd-pad.r)+'" y2="'+(Ht-pad.b)+'" stroke="var(--line)"/><line x1="'+pad.l+'" y1="'+pad.t+'" x2="'+pad.l+'" y2="'+(Ht-pad.b)+'" stroke="var(--line)"/>';
    if(t===0||t===1){const ticks=(a,b,n)=>{const s=(b-a)/n;const p=Math.pow(10,Math.floor(Math.log10(s)));const st=[1,2,5,10].map(k=>k*p).find(k=>k>=s);const o=[];for(let v=Math.ceil(a/st)*st;v<=b+1e-9;v+=st)o.push(+v.toFixed(6));return o};
      ticks(f.x0,f.x1,6).forEach(v=>{const X=pad.l+(v-f.x0)/(f.x1-f.x0)*(Wd-pad.l-pad.r);h+='<text x="'+X+'" y="'+(Ht-pad.b+14)+'" font-size="10" text-anchor="middle" fill="var(--mute)">'+v+'</text>'});
      ticks(f.y0,f.y1,5).forEach(v=>{const Y=Ht-pad.b-(v-f.y0)/(f.y1-f.y0)*(Ht-pad.t-pad.b);h+='<text x="'+(pad.l-4)+'" y="'+(Y+3)+'" font-size="10" text-anchor="end" fill="var(--mute)">'+v+'</text>'});
      h+='<text x="'+((Wd+pad.l)/2)+'" y="'+(Ht-4)+'" font-size="11" text-anchor="middle" fill="var(--mute)">'+(sc?(m==='std'?'proline, standardised':'proline, min-max'):'proline (mg/L)')+'</text>';
      h+='<text x="12" y="'+((Ht-pad.b+pad.t)/2)+'" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 12 '+((Ht-pad.b+pad.t)/2)+')">'+(sc?(m==='std'?'hue, standardised':'hue, min-max'):'hue, same units')+'</text>'}
    // neighbour lines
    if(nbset.size){const q=pos(Q);kq.nb.forEach(k=>{const p=pos(tr[k]);h+='<line x1="'+q[0]+'" y1="'+q[1]+'" x2="'+p[0]+'" y2="'+p[1]+'" stroke="var(--mute)" stroke-width=".6" opacity=".6"/>'})}
    tr.forEach((p,k)=>{const a=pos(p);const nb=nbset.has(k);h+='<circle cx="'+a[0].toFixed(1)+'" cy="'+a[1].toFixed(1)+'" r="'+(nb?4.2:2.8)+'" fill="'+COL[p[2]]+'" opacity="'+(nbset.size&&!nb?.25:.85)+'"'+(nb?' stroke="var(--ink)" stroke-width="1"':'')+'/>'});
    if(i===4){te.forEach(q=>{const a=pos(q);const ok=knn(q,um).pred===q[2];
      h+=ok?'<circle cx="'+a[0]+'" cy="'+a[1]+'" r="4" fill="none" stroke="'+COL[q[2]]+'" stroke-width="1.6"/>':'<path d="M'+(a[0]-4)+' '+(a[1]-4)+'l8 8m0 -8l-8 8" stroke="var(--bad)" stroke-width="2"/>'})}
    else{const a=pos(Q);h+='<circle cx="'+a[0]+'" cy="'+a[1]+'" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/><circle cx="'+a[0]+'" cy="'+a[1]+'" r="3.5" fill="'+COL[Q[2]]+'"/>'}
    svg.innerHTML=h;
    document.getElementById('sc-cap').innerHTML='<div class="t">'+(i+1)+' / 5 · '+CAP[i][0]+'</div><p>'+CAP[i][1]+'</p>';
    const kr=knn(Q,'raw'),ks=knn(Q,m),mn=m==='std'?'standardised':'min-max';
    document.getElementById('sc-cnt').innerHTML=
      RD.stat('Test wine','true: '+NAME[Q[2]],'proline '+Q[0]+', hue '+Q[1])+
      RD.stat('Its vote, raw',kr.votes.join(' / '),(kr.pred===Q[2]?'right':'wrong')+'; '+fmt(100*kr.share,0)+'% of the distance from proline')+
      (i>=3?RD.stat('Its vote, '+mn,ks.votes.join(' / '),(ks.pred===Q[2]?'right':'wrong')+'; '+fmt(100*ks.share,0)+'% from proline'):RD.stat('Its vote, '+mn,'&middot;','after step 4'))+
      (i>=4?RD.stat('Test accuracy','raw '+fmt(100*ACC.raw)+'%',mn+' '+fmt(100*ACC[m])+'% (54 wines)'):RD.stat('Test accuracy','&middot;','at step 5'));
  }
  document.getElementById('sc-leg').innerHTML=NAME.map((n,k)=>'<span><b class="dot" style="background:'+COL[k]+'"></b>'+n+'</span>').join('')+'<span>dots: 124 training wines; ring: test wine</span>';
  const A=RD.anim({card:'sc-card',ctl:'sc-ctl',n:5,ms:2600,label:'Feature scaling step',draw:i=>{
    cancelAnimationFrame(raf);
    if(i===2&&!RD.RM){morph=0;const t0=performance.now();const go=now=>{morph=Math.min(1,(now-t0)/1200);morph=morph*morph*(3-2*morph);draw(2);if(morph<1)raf=requestAnimationFrame(go)};raf=requestAnimationFrame(go)}
    else{morph=1;draw(i)}}});
  document.getElementById('sc-modes').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;mode=b.dataset.m;
    [...e.currentTarget.children].forEach(x=>x.classList.toggle('on',x===b));A.redraw()});
  window.NI_SCALE={ACC,knn,Q:()=>Q};
})();
