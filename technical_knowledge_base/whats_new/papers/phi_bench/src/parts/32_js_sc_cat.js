// ---- Scene: Table 2 as a bar field over Figure 4's task counts (renderer v2: one cube per task, bars on a white plinth per row, the
// standard-error bound as a glass column, flows weighted by task count into the Full column) ----
// Data: window.PAPER.tables (T2: the eight models' nine category scores and Full, as parsed from Table 2; F4: task counts by format and
// category, Figure 4) and window.PAPER.rc.cat_n (tasks per category). Columns are ordered by task count, rows by Full (best in front).
// window.PHICAT exposes the numbers for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-cat'))return;const {at,off,lerp,mix}=S3;
  const TB=window.PAPER.tables,MS=TB.models,CATS=TB.cats,N=window.PAPER.rc.cat_n;
  const ORD=CATS.map((c,i)=>i).sort((a,b)=>N[b]-N[a]||a-b);
  const SHORT={'Training':'Training','Inference & Serving':'Inference','Compression':'Compress.','Kernel':'Kernel','I/O':'I/O','Hardware & Edge':'HW, Edge','Data Infrastructure':'Data','System Optimization':'Sys. opt.','System Assurance':'Assurance'};
  const NAME={'Claude Opus 5':'Claude Opus 5','Kimi K3':'Kimi K3','Qwen3.8 Max':'Qwen3.8 Max','GPT 5.6 Sol':'GPT-5.6 Sol','GLM 5.2':'GLM-5.2','Claude Sonnet 5':'Claude Sonnet 5','Qwen3.7 Max':'Qwen3.7 Max','DeepSeek V4Pro':'DeepSeek-V4-Pro'};
  const MV={'Claude Opus 5':'--c2','Kimi K3':'--c6','Qwen3.8 Max':'--c4','GPT 5.6 Sol':'--ink','GLM 5.2':'--c1','Claude Sonnet 5':'--c5','Qwen3.7 Max':'--c7','DeepSeek V4Pro':'--c8'};
  const best=CATS.map((c,i)=>{let b=MS[0];MS.forEach(m=>{if(TB.T2[m][i]>TB.T2[b][i])b=m});return b});
  const HW=CATS.indexOf('Hardware & Edge'),hwBest=TB.T2[best[HW]][HW],hwSE=100*Math.sqrt(hwBest/100*(1-hwBest/100)/N[HW]);
  const wsum=m=>ORD.reduce((s,i)=>s+N[i]*TB.T2[m][i],0)/85;
  window.PHICAT={order:ORD.map(i=>CATS[i]),n:ORD.map(i=>N[i]),best:best.map((m,i)=>[CATS[i],NAME[m],TB.T2[m][i]]),hw:{n:N[HW],scores:MS.map(m=>[NAME[m],TB.T2[m][HW]]),se:hwSE},
    full:MS.map(m=>[NAME[m],TB.T2[m][9],wsum(m)]),opus:ORD.map(i=>[CATS[i],TB.T2['Claude Opus 5'][i]])};
  const cssv=n=>S3.rgb(getComputedStyle(document.body).getPropertyValue(n).trim()||'#888');
  const GX=c=>-4.8+c*1.2,RZ=r=>2.45-r*.7,HS=2.0/60,XF=GX(8)+1.6;
  // one cube per task: 2 x 2 per layer, KFC first, then LHI, then E2EO
  function tower(R,c,a,col,x,z){const i=ORD[c],F=[['KFC',col[0]],['LHI',col[1]],['E2EO',col[2]]],S=.26,G=.3;let q=0;
    F.forEach(([f,cc])=>{for(let t=0;t<TB.F4[f][i];t++,q++){const lay=Math.floor(q/4),r=q%4;R.box([x+((r%2)-.5)*G,lay*G,z+(Math.floor(r/2)-.5)*G],[S,S,S],{fill:mix(R.P.paper,cc,.6),a,shadow:false,lw:.6})}});
    return Math.ceil(N[i]/4)*G}
  function draw(R,k,e){const P=R.P,col=[P.c1,P.c4,P.c2];R.grid(-6.6,7.4,-3.2,3.2,.5);
    const MC=MS.map(m=>MV[m]==='--ink'?P.ink:MV[m]==='--c2'?P.c2:MV[m]==='--c6'?P.c6:MV[m]==='--c4'?P.c4:MV[m]==='--c1'?P.c1:MV[m]==='--c5'?P.c5:cssv(MV[m]));
    // step 1: the task towers; they leave during the first half of step 2
    const ta=k===0?1:k===1?Math.max(0,1-2*e):0,ba=k===0?0:k===1?Math.max(0,2*e-1):1;
    if(ta>.01)ORD.forEach((i,c)=>{const h=tower(R,c,ta*(k===0?Math.min(1,Math.max(0,e*10-c)):1),col,GX(c),0);R.label([GX(c),h,0],String(N[i]),{mono:true,fs:13,b:1,dy:-12,c:P.ink,a:ta})});
    // column labels and task counts, always
    ORD.forEach((i,c)=>R.label([GX(c),0,RZ(0)+.45],SHORT[CATS[i]]+(k===0?'':' · '+N[i]),{fs:12,dy:c%2?32:14,b:i===HW,c:i===HW?P.c2:P.ink,a:k===4&&i!==HW?0:1,wide:1}));
    if(ba>.01){
      MS.forEach((m,r)=>{const z=RZ(r),rowA=k===1?(r===0?1:0):k===2?Math.min(1,Math.max(0,e*9-r)):1;if(rowA<=.01)return;
        // the row's plinth
        R.box([(GX(0)+GX(8))/2,0,z],[GX(8)-GX(0)+.8,.04,.5],{fill:P.paper,a:ba*rowA*(k===4?.25:k>=3?.6:1),shadow:false});
        if(k>=1&&(r===0||k>=2))R.label([GX(0)-.5,0,z],NAME[m]+(k===3&&r===0?' · leads 5 of 9':''),{al:'right',dx:-6,fs:12,c:r===0?P.ink:P.mute,b:r===0,a:ba*rowA,grp:'rows'});
        ORD.forEach((i,c)=>{const v=TB.T2[m][i],isB=best[i]===m;let a=ba*rowA,fill=mix(P.paper,MC[r],.5);
          if(k===3){a*=isB?1:.22;if(isB)fill=mix(P.paper,MC[r],.8)}
          if(k===4){a*=i===HW?1:Math.max(0,.25*(1-1.5*e));if(i===HW&&isB)fill=mix(P.paper,MC[r],.8)}
          if(k===5)a*=.3;
          const h=Math.max(.012,v*HS*(k===1&&r===0?Math.min(1,Math.max(0,2*e-1)):1));
          R.box([GX(c),.04,z],[.5,h,.34],{fill,a,shadow:false,lw:.6});
          if(k===1&&r===0)R.label([GX(c),.04+h,z],v.toFixed(1),{mono:true,fs:12,b:1,dy:-10,c:MC[0],a:ba});
          if(k===3&&isB&&r>0){const L=m==='GLM 5.2';R.label([GX(c),.04+h,z],SHORT_M(m)+' '+v.toFixed(1),{mono:true,fs:12,b:1,dy:-10,al:L?'right':'left',dx:L?-6:6,c:MC[r],a:e})}
          if(k===4&&i===HW)R.label([GX(c)+.32,.04+h,z],v.toFixed(1),{al:'left',mono:true,fs:12,b:isB,dx:4,c:isB?MC[r]:P.ink,a:e});
          // step 6: the front row streams into Full, dots in proportion to the category's tasks
          if(k===5&&r===0)R.flowArc([GX(c),.1+h,z],[XF,.1+TB.T2[m][9]*HS,z],.5+.04*(8-c),{c:MC[0],a:1,r:.05,n:Math.max(1,Math.round(N[i]/2)),speed:1.2})});
        // the Full column
        if(k===5){const h=TB.T2[m][9]*HS;R.box([XF,.04,z],[.6,h*Math.min(1,e*1.3),.28],{fill:mix(P.paper,MC[r],.75),a:1,shadow:false});
          R.label([XF+.36,.04+h,z],TB.T2[m][9].toFixed(2),{al:'left',mono:true,fs:12,dx:4,b:r===0,c:r===0?MC[0]:P.ink,a:e,grp:'full'})}});
      if(k===5)R.label([XF,0,RZ(0)+.45],'Full',{fs:12.5,b:1,dy:14,c:P.ink,a:e});
      // step 5: the three Hardware and Edge tasks beside their column, and the bound on the best score as a glass column
      if(k===4){const c=ORD.indexOf(HW),rb=MS.indexOf(best[HW]);tower(R,c,e,col,GX(c),RZ(7)-.75);
        R.label([GX(c),.35,RZ(7)-.75],'3 tasks',{mono:true,fs:12.5,b:1,dy:-14,c:P.c2,a:e});
        const lo=Math.max(0,hwBest-hwSE),hi=hwBest+hwSE;R.box([GX(c),.04+lo*HS,RZ(rb)],[.62,(hi-lo)*HS,.5],{fill:P.mute,fa:.14,ea:.7,ec:P.mute,a:e,shadow:false});
        R.label([GX(c)-.34,.04+hi*HS,RZ(rb)],'± '+hwSE.toFixed(1),{al:'right',mono:true,fs:12,b:1,dx:-4,c:P.mute,a:e})}
    }
  }
  function SHORT_M(m){return {'Claude Opus 5':'Opus','Kimi K3':'Kimi','Qwen3.8 Max':'Qwen3.8','GPT 5.6 Sol':'GPT','GLM 5.2':'GLM','Claude Sonnet 5':'Sonnet','Qwen3.7 Max':'Qwen3.7','DeepSeek V4Pro':'DeepSeek'}[m]}
  const full={cam:[.06,1.02],bounds:[[-5.1,0,-2.6],[5.1,1.6,2.9]]},wide={cam:[.06,1.02],bounds:[[-5.1,0,-2.6],[XF+.8,1.6,2.9]]};
  const hwv=()=>{const c=ORD.indexOf(HW);return {cam:[.3,.6],bounds:[[GX(c)-1.6,0,RZ(7)-1.3],[GX(c)+1.6,.9,RZ(0)+.6]]}};
  S3.stage({id:'stg-cat',list:'sx-cat',fig:'3D · Table 2 over Figure 4',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1700,hold:5000,draw,
    margin:w=>w<520?[16,10,22,10]:[18,16,26,150],
    view:k=>k===4?hwv():k===5?wide:full});
})();
