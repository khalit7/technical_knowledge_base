// ---- Scene (the top of the paper tab, Fig. 1): a merge is a decay schedule in disguise (renderer v2: the learning rate as a wall over the run,
// checkpoints as glass plates standing along it, merge weights as bars on white plinths, flowing dots wherever weights move) ----
// Everything is this page's own: the toy's branch (window.TOYDATA, 8 seeds: 1,600 steps at the flat peak rate, a checkpoint every 100 steps,
// the equivalence test against a run that really decayed), Theorem 3.1's weights from thm31() in 13_js_read.js, and Ling-mini's three
// matched-token scores from window.PAPER.rc.fig3 (Figure 3 read from the vector figure, Table 1). Replaces the static 2D hero of 14b_js_hero.js.
(function(){
  if(!document.getElementById('stg-merge')||!window.S3||!window.TOYDATA)return;const {at,off,lerp,mix}=S3;
  const T=window.TOYDATA,F=window.PAPER.rc.fig3,N=16,CK=T.defaults.CK,DUR=T.defaults.DUR,PEAK=T.defaults.peak;
  const mean=f=>T.runs.reduce((a,r)=>a+f(r),0)/T.runs.length,atS=(a,s)=>a.find(p=>p[0]===s)[1];
  const eq=r=>r.equiv.find(e=>e.m==='mean'&&e.n===N),rat=T.runs.map(r=>eq(r).dist/eq(r).moved);
  // the numbers the step list states (check_stages.mjs compares them with the list)
  const D=window.WSM_MERGE={N,CK,DUR,PEAK,
    cMean:thm31('mean',N).c,cSqrt:thm31('1-sqrt',N).c,wMean:thm31('mean',N).w,wSqrt:thm31('1-sqrt',N).w,
    cons:mean(r=>atS(r.cons,DUR)),wsd:mean(r=>atS(r.wsd['1-sqrt'],DUR)),merge:mean(r=>atS(r.merge.mean[String(N)],DUR)),decay:mean(r=>eq(r).decayRun),
    ratLo:Math.min(...rat),ratHi:Math.max(...rat),wins:T.runs.filter(r=>atS(r.merge.mean[String(N)],DUR)<atS(r.wsd['1-sqrt'],DUR)).length,
    ling:{wsd:F.WSD_best[0],merge:F.WSM_best_le400[0],raw:+(F.WSM_best_le400[0]-F.merge_over_raw_400).toFixed(2),best:F.WSM_best[0],bestAt:F.WSM_best[1]}};
  // layout: x is the branch's steps (0 to 1,600), z separates the walls, the plates and the bars
  const X0=-5.2,SX=8.2/DUR,xs=s=>X0+s*SX,ck=j=>(j+1)*CK,H=1.05,YB=.62,ZW=-.7,ZP=.25,ZB=1.05,ZD=-1.5,XM=4.25,BH=5,LB=12,XL=[5.5,6.85,8.2],Z6=2.3;
  const ckX=j=>xs(ck(j));
  // a staircase: the rate each update interval runs at, as a share of the peak; before the oldest checkpoint every update is kept in full
  function stairs(w){const p=[[xs(0),0],[xs(0),1],[ckX(0),1]];for(let i=1;i<N;i++){p.push([ckX(i-1),w[i-1]],[ckX(i),w[i-1]])}p.push([ckX(N-1),0]);return p}
  function wall(R,pts,z,o){const q=pts.map(([x,y])=>[x,YB+H*y,z]);R.quad(q,{fill:o.fill,fa:o.fa||.55,a:o.a,edge:false});R.line(q.slice(1,-1),{c:o.c,w:o.w||2,a:o.a,dash:o.dash})}
  function plate(R,x,z,w,h,c,a){if(a<=.01)return;R.glass([x-w/2,.06,z],[w,0,0],[0,h,0],{c,a,nu:3,nv:4})}
  function bar(R,x,z,v,s,c,a,lab,o){o=o||{};if(a<=.01)return;R.box([x,0,z],[o.pw||.36,.04,o.pd||.34],{a,shadow:false});const h=Math.max(.012,v*s);
    R.box([x,.04,z],[o.bw||.2,h,o.bd||.2],{fill:c,a,lw:.7,shadow:false});if(lab)R.label([x,.04+h,z],lab,{mono:true,fs:o.fs||12,b:o.b,c:o.lc,dy:-10,a,wide:o.wide})}
  function draw(R,k,e){const P=R.P;R.grid(-5.8,7.4,-2.5,2.4,.5);
    const cw=k<=3?D.cMean:k===4?D.cMean.map((v,j)=>lerp(v,D.cSqrt[j],e)):D.cSqrt,ww=k<=3?D.wMean:k===4?D.wMean.map((v,i)=>lerp(v,D.wSqrt[i],e)):D.wSqrt;
    const toy=k===5?.08:1,bk=k===3?.3:1;
    // 1. the rate actually used: flat at the peak for the whole branch
    wall(R,[[xs(0),0],[xs(0),1],[xs(DUR),1],[xs(DUR),0]],ZW,{fill:mix(P.paper,P.mute,.25),c:P.mute,a:(k===0?1:k===3?.25:.55)*toy,dash:k>=2?[5,4]:null});
    if(k<=1)R.label([xs(0),YB+H,ZW],'rate actually used: '+PEAK+', flat',{al:'left',fs:12.5,b:1,c:P.mute,dx:4,dy:-12,a:toy});
    if(k===0){R.label([xs(0),0,ZP+.4],'after 8,000 shared steps',{al:'left',mono:true,fs:12,c:P.mute,dy:16,wide:1});R.label([xs(DUR),0,ZP+.4],'step 1,600',{mono:true,fs:12,c:P.mute,dy:16,wide:1})}
    // the run moving forward, and its 16 checkpoints as plates standing along it (step 1 fills them in left to right)
    const shown=k===0?Math.ceil(N*e):N;
    if(k===0)R.flow([[xs(0),.03,ZP],[xs(DUR*e),.03,ZP]],{c:P.mute,a:.9,r:.06,speed:1.3});
    for(let j=0;j<N;j++){const a=(j<shown?1:0)*toy*(k===2&&j<3?.35:1);plate(R,ckX(j),ZP,.44,.5,P.c6,a*bk)}
    if(k===0)R.label([ckX(N-1),.58,ZP],'a checkpoint every '+CK+' steps',{al:'right',fs:12.5,b:1,c:P.c6,dx:-4,dy:-8,a:e});
    // 2. merge weights as bars in front of their plates, and the merged model they flow into
    if(k>=1){const a2=(k===1?e:1)*toy;
      for(let j=0;j<N;j++){const hi=k===2?(j>=3?1:.3):1;bar(R,ckX(j),ZB,cw[j],BH,P.c1,a2*hi*bk,(k===1&&(j===0||j===N-1))||(k===4&&(j===0||j===N-1))?cw[j].toFixed(3):null,{fs:12})}
      if(toy>.5)R.label([ckX(0)-.35,0,ZB],k>=4?'1-sqrt weights':'merge weights c',{al:'right',mono:true,fs:12,c:P.c1,dx:-6,grp:'mg',a:a2*bk});
      plate(R,XM,ZP,.8,.8,P.c1,(k===1?e:1)*toy);
      if(k===1||k===2||k===4)for(let j=0;j<N;j++){if((k===2&&j<3))continue;const n=Math.max(1,Math.round(cw[j]*48));R.flowArc([ckX(j),.47,ZP],[XM,.6,ZP],.25+.03*(N-j),{c:P.c1,a:.8*a2,r:.045+.12*cw[j],n,speed:1.2})}
      if(k<=4)R.label([XM,k===3?0:.86,ZP],'merged model',{fs:12.5,b:1,c:P.c1,dy:k===3?16:-10,a:toy})}
    // 3. the same merge read as a schedule: the weight each update interval keeps in the merged model, w_i = sum of the later bars
    if(k>=2){const a3=(k===2?e:1)*toy*(k===3?.45:1);wall(R,stairs(ww),ZW+.04,{fill:mix(P.paper,P.c1,.45),c:P.c1,a:a3,w:2.4,fa:.6});
      if(k===2){const i=3,xm=(ckX(i-1)+ckX(i))/2;R.glow([xm,YB+H*ww[i-1],ZW+.05],.28,{c:P.c1,a:e});
        for(let j=i;j<N;j++)R.flowArc([xm,YB+.02,ZW+.05],[ckX(j),.4,ZP],.1+.03*(j-i),{c:P.c1,a:.75*e,r:.05,n:4,speed:1.3});
        R.label([xm,YB+H*ww[i-1],ZW],'update 3: inside checkpoints 3 to 15, w = 13/16',{al:'left',fs:12.5,b:1,c:P.c1,dx:8,dy:-22,a:e})}
      if(k===2||k===4)R.label([xs(1000),YB+H*.12,ZW],k===2?'linear decay':'1 − √t',{al:'left',fs:12.5,b:1,c:P.c1,a:a3,wide:1})}
    // 4. a run that really decayed: from the oldest checkpoint, the rate at peak × w_i, the same batches (the toy's equivalence test)
    if(k===3||k===4){const a4=k===3?e:1-e;
      const run=[];for(let i=1;i<N;i++){run.push([ckX(i-1),YB+H*D.wMean[i-1]+.03,ZW+.06],[ckX(i),YB+H*D.wMean[i-1]+.03,ZW+.06])}
      R.line(run,{c:P.c2,w:2.6,a:a4,top:1});R.flow(run,{c:P.c2,a:.9*a4,r:.055,speed:1.6,n:20,top:1});
      R.flowArc([ckX(0),.55,ZP],run[0],.3,{c:P.c2,a:.8*a4,r:.05,n:5});R.flowArc(run[run.length-1],[XM,.5,ZD],.3,{c:P.c2,a:.8*a4,r:.05,n:5});
      if(k===3)R.label(run[0],'a real run at these rates, same batches',{al:'left',fs:12.5,b:1,c:P.c2,dy:-16,a:a4,wide:1});
      plate(R,XM,ZD,.8,.8,P.c2,a4);R.label([XM,.86,ZD],'decayed run',{fs:12.5,b:1,c:P.c2,dy:-10,a:a4});
      R.line([[XM-.42,.45,ZP],[XM-.42,.45,ZD]],{c:P.ink,w:1.4,dash:[4,4],a:a4});
      R.label([XM-.42,.45,(ZP+ZD)/2],Math.round(D.ratLo*100)+' to '+Math.round(D.ratHi*100)+'% apart',{al:'right',fs:12,mono:true,dx:-6,a:a4,wide:1});
      // excess held-out loss, mean of 8 seeds, beside what produced it (lower is better)
      const bo={pw:.5,pd:.5,bw:.32,bd:.32,b:1,wide:1};bar(R,XL[0],ZB,D.cons,LB,mix(P.paper,P.mute,.6),a4,D.cons.toFixed(4),{...bo,lc:P.mute});bar(R,XL[1],ZB,D.decay,LB,P.c2,a4,D.decay.toFixed(4),{...bo,lc:P.c2});
      bar(R,XL[2],ZB,D.merge,LB,P.c1,a4,D.merge.toFixed(4),{...bo,lc:P.c1});
      if(k===3)R.label([XL[1],0,ZB+.3],'loss · lower is better',{mono:true,fs:12,c:P.mute,dy:14,a:a4,wide:1})}
    // 6. what it bought on Ling-mini at 400B tokens (41-benchmark average; bars measured from 58)
    if(k===5){const L=D.ling,b=[['flat LR, no merge',L.raw,mix(P.paper,P.mute,.6),P.mute],['WSD: decay',L.wsd,P.c2,P.c2],['WSM: merge',L.merge,P.c1,P.c1]];
      b.forEach(([n,v,c,lc],i)=>{const x=-1.6+1.6*i;bar(R,x,Z6,v-58,.32,c,e,v.toFixed(2),{pw:.6,pd:.5,bw:.36,bd:.3,fs:13,b:1,lc});R.label([x,0,Z6+.3],n,{fs:12.5,b:1,c:lc,dy:14,a:e})});
      R.label([0,2.1,Z6],'Ling-mini, 400B tokens · bars from 58',{fs:12,mono:true,c:P.mute,dy:-8,a:e,wide:1})}
  }
  const full={cam:[-.06,.5],bounds:[[-5.5,0,-.8],[8.5,1.7,1.4]]};
  // on a phone the long row turns into depth (a rotated, steeper camera), so the plates and bars come out larger
  const ph=v=>innerWidth<520?{cam:[v.cam[0]-.62,Math.min(1.1,v.cam[1]+.28)],bounds:v.bounds}:v;
  S3.stage({id:'stg-merge',list:'sx-merge',fig:'Fig. 1 · a merge of 16 checkpoints is a decay applied to the updates',cam:full.cam,bounds:full.bounds,aspect:.36,dur:1500,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,18,124],
    view:k=>ph(k===1||k===2||k===4?{cam:[-.02,.34],bounds:[[-5.5,0,-.8],[4.8,1.7,1.3]]}:k===3?{cam:[-.04,.58],bounds:[[-5.5,0,-1.6],[8.5,1.7,1.4]]}:k===0?{cam:[-.04,.42],bounds:[[-5.4,0,-.8],[3.4,1.7,.9]]}:k===5?{cam:[-.15,.4],bounds:[[-2.4,0,1.8],[2.4,2.1,2.8]]}:full)});
})();
