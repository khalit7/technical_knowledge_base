// ---- Scene, Fig. 6 (section 6): the bootstrap. One sample, resamples drawn from it with replacement and stacked in depth, their means
// landing on a value axis, the 4,000-resample distribution, then the truth (20,000 fresh samples) beside it (renderer v2).
// Data: SD.stage.boot (mk_stage.py: six resamples drawn with random.Random(2026) from each sample of sims_boot.json, and that file's
// 4,000 bootstrap means and 20,000 fresh-sample means), SD.boot (the standard errors). Two modes: the tiny model at n = 30 (works),
// a lognormal at n = 10 (fails). ----
(function(){
  if(!document.getElementById('stg-bs')||!window.STS)return;const {mix}=S3;
  const D=SD.stage.boot;let mode='tiny30';
  const mean=a=>a.reduce((s,v)=>s+v,0)/a.length;
  window.ST_BOOT={};Object.keys(D).forEach(k=>{const d=D[k];window.ST_BOOT[k]={means:d.res.map(r=>mean(r.idx.map(i=>d.x[i]))),left:d.res.map(r=>d.n-new Set(r.idx).size),mean:mean(d.x)}});
  const ZS=-2.4,ZR=j=>-1.55+j*.36,ZF=1.75,HS=.5,HR=.3;
  function geo(){const d=D[mode],n=d.n,pitch=n===30?.2:.58,xi=i=>(i-(n-1)/2)*pitch,bw=n===30?.15:.36;
    const lo=d.lo,hi=d.hi,c=(lo+hi)/2,sc=5.8/(hi-lo),X=v=>(v-c)*sc;
    const ws=d.hb.length>1?Math.abs(d.hb[1][0]-d.hb[0][0]):.03,fbw=Math.min(.22,ws*sc*.8);
    const R=SD.boot.R/SD.boot.B,mx=Math.max(...d.hb.map(h=>h[1]),...d.ht.map(h=>h[1]/R)),HF=1.45/mx;
    const tk=mode==='tiny30'?[.5,.75,1,1.25].filter(v=>v>=lo&&v<=hi):[1,2,3,4,5,6];
    const land=d.res.map((r,j)=>{const m=window.ST_BOOT[mode].means[j];return [X(m),.09+.17*window.ST_BOOT[mode].means.slice(0,j).filter(v=>Math.abs(X(v)-X(m))<.12).length]});
    return {d,n,xi,bw,X,HF,R,tk,land,fbw}}
  function draw(R,k,e){const P=R.P,G=geo(),d=G.d,b=SD.boot[mode],tiny=mode==='tiny30';R.grid(-3.6,3.6,-2.9,2.5,.5);
    const col=v=>tiny?STS.wc(P,STS.wordOf(v)):mix(P.paper,P.c1,.55),xs=d.x.map((_,i)=>G.xi(i));
    // 1. the one sample; at step 2 the points the first resample never drew fade out
    const r0=d.res[0],picked=d.x.map((_,i)=>r0.idx.filter(j=>j===i).length);
    const sa=k<=1?1:.3,ai=k===1?picked.map(c=>c?1:1-.8*e):null;
    STS.row(R,xs,d.x.map(v=>v*HS),ZS,{cols:d.x.map(col),a:sa,ai,bw:G.bw});
    if(k<=1)R.label([0,1.85,ZS],tiny?'your sample · 22 cat, 5 dog, 3 sat':'your sample · 10 draws from a lognormal',{mono:true,fs:12.5,b:1,c:P.ink,a:sa});
    if(k===0)R.label([0,1.85,ZS],'mean '+mean(d.x).toFixed(3),{dy:20,mono:true,fs:13,b:1,c:P.acc,a:e});
    if(k===1)picked.forEach((c,i)=>{if(c>=2)R.label([xs[i],d.x[i]*HS+.05,ZS],'×'+c,{dy:-9,mono:true,fs:12,b:1,c:P.acc,a:e,wide:1})});
    // 2. resample 1, then 3. resamples 2 to 6: each slot copies one point of the sample (dots flow from that point)
    const nr=k<1?0:k===1?1:d.res.length;
    for(let j=0;j<nr;j++){const appear=k===2&&j>0?Math.max(0,Math.min(1,e*6-j+1)):k===1?e:1;if(appear<=0)continue;
      const r=d.res[j],vals=r.idx.map(i=>d.x[i]),ra=k>=3?.15:k===2&&j<5?.55:1;
      STS.row(R,xs,vals.map(v=>v*HR),ZR(j),{cols:vals.map(col),a:ra*Math.min(1,appear*1.5),bw:G.bw,gi:i=>Math.max(0,Math.min(1,appear*1.6-i/G.n*.6))});
      if(appear<1&&(k===1||k===2))r.idx.forEach((i,s)=>{if(k===2&&s%3)return;R.flowArc([xs[i],d.x[i]*HS+.05,ZS],[xs[s],.15,ZR(j)],.35,{c:col(d.x[i]),n:2,r:.05,speed:1.6,a:.85})});
      if(k<=2)R.label([xs[G.n-1]+.15,.1,ZR(j)],(j===0?'resample 1 · mean ':'')+window.ST_BOOT[mode].means[j].toFixed(3),{al:'left',dx:6,mono:true,fs:12,c:P.acc,b:j===0,grp:'means',a:Math.max(.6,ra)*appear});
      if(k>=2){if(k===2&&appear<1&&appear>.3)R.flowArc([0,.4,ZR(j)],[G.land[j][0],G.land[j][1],ZF],.6,{c:P.acc,n:4,r:.06,speed:1.8});
        if(k>2||appear>.6)R.ball([G.land[j][0],G.land[j][1],ZF],.08,{c:P.acc,a:k>=3?.35:1})}}
    // the value axis at the front, with this sample's mean
    if(k>=2){STS.ticks(R,G.X,G.tk,ZF+.35,1);const m=mean(d.x);R.line([[G.X(m),.01,ZF-.6],[G.X(m),.01,ZF+.2]],{c:P.acc,w:1.6,dash:[4,4],a:.7})}
    // 4. the means of 4,000 resamples: the bootstrap distribution, centred on this sample's mean
    if(k>=3){const g=k===3?e:1;STS.hist(R,d.hb,G.X,ZF,G.HF,{c:mix(P.paper,P.acc,.6),a:1,grow:g,bw:G.fbw,d:.3});
      STS.bracket(R,G.X,mean(d.x),b.boot_sd,1.62,ZF,{a:k===3?e:1,text:'bootstrap SE '+b.boot_sd.toFixed(3)});
      if(k===3)R.label([G.X(mean(d.x)),.1,ZF+.35],'mean '+mean(d.x).toFixed(3),{dy:32,mono:true,fs:12,c:P.acc,a:e})}
    // 5. the truth: 20,000 fresh samples from the population (scaled to 4,000), drawn as orange glass behind the bootstrap bars
    if(k>=4){STS.hist(R,d.ht.map(([v,c])=>[v,c/G.R]),G.X,ZF,G.HF,{c:P.c2,a:e,fa:.45,ea:.6,bw:G.fbw,dz:-.5,d:.3});
      STS.truth(R,G.X(b.mu),ZF-.8,ZF+.2,2.05,{a:e,text:'truth '+b.mu.toFixed(3)});
      STS.bracket(R,G.X,b.mu,b.true_sd,1.9,ZF-.5,{a:e,c:P.c2,text:'true SE '+b.true_sd.toFixed(3)})}
  }
  const full={cam:[.14,.68],bounds:[[-3.1,0,-2.7],[3.1,1.4,2.3]]};
  const st=S3.stage({id:'stg-bs',list:'sx-bs',fig:'Fig. 6 · resampling one sample',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,10,26,10]:[18,84,26,16],
    view:k=>k===0?{cam:[.08,.5],bounds:[[-3.1,0,-2.8],[3.1,1.9,-1.9]]}:k===1?{cam:[.1,.62],bounds:[[-3.1,0,-2.8],[3.1,1.4,-1.1]]}:k===3?{cam:[.08,.36],bounds:[[-3,0,.6],[3,2,2.3]]}:k===4?{cam:[.08,.6],bounds:[[-3,0,.6],[3,2.2,2.3]]}:null});
  window.ST_BOOT_STAGE={set(m){mode=m;st.list(m==='tiny30'?'sx-bs':'sx-bs-ln')}};
})();
