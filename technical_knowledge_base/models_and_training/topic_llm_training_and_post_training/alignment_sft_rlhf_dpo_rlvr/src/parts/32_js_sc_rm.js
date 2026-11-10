// ---- Scene (section 3): a reward model from one ranking of four answers (renderer v2) ----
// The ranking A > B > C > D is illustrative; the six pairs, the Bradley-Terry fit (four scalars from 0, InstructGPT's loss averaged over
// the six comparisons, 200 steps of gradient descent) and every score drawn come from window.AL_DATA.stage (recompute.py).
(function(){
  if(!document.getElementById('stg-rm')||!window.S3||!window.AL_DATA)return;const {at,off,lerp,mix,ease}=S3;
  const ST=AL_DATA.stage,CK=ST.rm_ck,TS=Object.keys(CK).map(Number).sort((a,b)=>a-b),L=['A','B','C','D'];
  const X=i=>-2.7+i*1.8,ZC=-1.7,ZP=-.3,ZS=1.5,YB=1.2,SC=.2;
  const pairs=[];for(let w=0;w<4;w++)for(let l=w+1;l<4;l++)pairs.push([w,l]);
  // the scores at training step t, interpolated between the recorded checkpoints
  function rAt(t){let j=0;while(j<TS.length-2&&TS[j+1]<t)j++;const a=TS[j],b=TS[j+1],u=Math.max(0,Math.min(1,(t-a)/(b-a)));return CK[a].r.map((v,i)=>lerp(v,CK[b].r[i],u))}
  const lossOf=r=>pairs.reduce((s,[w,l])=>s+Math.log1p(Math.exp(-(r[w]-r[l]))),0)/pairs.length;
  const s2=x=>(x<0?'−':'')+Math.abs(x).toFixed(2);
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-2.4,2.4,.5);
    // 1. four answers, ranked: upright cards at the back, the rank written on each
    L.forEach((c,i)=>{const a=k===0?Math.min(1,e*1.5):k>=3?.3:k===2?1-.6*e:1;
      R.box([X(i),0,ZC],[1.0,1.25,.08],{fill:mix(P.paper,P.c1,.08*(4-i)),a,lw:.8});
      for(let j=0;j<4;j++)R.box([X(i)-.05,.32+j*.2,ZC+.05],[.7-.18*((i+j)%3),.035,.01],{fill:mix(P.paper,P.mute,.5),a:a*.8,shadow:false,edge:false});
      R.label([X(i),1.25,ZC],c+' · '+['1st','2nd','3rd','4th'][i],{fs:13,b:1,dy:-11,c:P.ink,a})});
    if(k===0)R.label([0,1.7,ZC],'labeller: A > B > C > D',{mono:true,fs:13,b:1,c:P.c1,a:e});
    // 2. six comparisons: a stream from each winner to its loser
    if(k===1||k===2){const a=k===1?Math.min(1,e*1.4):1-e;pairs.forEach(([w,l],j)=>{R.flowArc([X(w),1.3,ZC],[X(l),1.3,ZC],.35+.22*(l-w),{c:P.c1,a:a*.9,r:.06,n:4+2*(l-w),speed:1.2});
        R.arc([X(w),1.3,ZC],[X(l),1.3,ZC],.35+.22*(l-w),{c:P.c1,w:1.2,a:a*.35})});
      R.label([0,2.25,ZC],'K(K−1)/2 = 6 pairs, one batch element',{mono:true,fs:12.5,b:1,c:P.c1,a})}
    // 3. the reward model: one glass plate that every answer passes through, a scalar out of each
    const ga=k<2?0:k===2?e:k===3?1:.55;
    if(ga>0){R.glass([-3.6,.05,ZP],[7.2,0,0],[0,.95,0],{c:P.c4,a:ga,nu:12,nv:3});
      R.label([-3.6,.95,ZP],'reward model · the SFT model with a scalar head',{al:'left',fs:12.5,b:1,dy:-9,c:P.c4,a:k===2?ga:0,wide:1});
      if(k===2||k===3)L.forEach((_,i)=>R.flow([[X(i),.7,ZC+.1],[X(i),.75,ZP],[X(i),YB,ZS-.1]],{c:P.c4,a:ga*.9,r:.06,n:5,speed:1.1}))}
    // 4. the scores: signed bars on white plinths in front, zero at the plinth
    if(k>=2){const r=k===2?[0,0,0,0]:k===3?rAt(200*ease(e)):rAt(200),lift=k===4?e:0,a=k===2?e:1;
      L.forEach((c,i)=>{const v=r[i]+lift,hgt=Math.max(.012,Math.abs(v)*SC);
        R.box([X(i),YB-.04,ZS],[.9,.04,.42],{a,shadow:false});
        R.box([X(i),0,ZS],[.03,YB-.04,.03],{a:a*.8,shadow:false});
        R.box([X(i),v>=0?YB:YB-.04-hgt,ZS],[.5,hgt,.3],{fill:mix(P.paper,v>=0?P.good:P.bad,.7),a,shadow:false});
        R.label([X(i),v>=0?YB+hgt:YB-.04-hgt,ZS],'r('+c+') = '+s2(v),{mono:true,fs:12.5,b:1,dy:v>=0?-11:13,c:v>=0?P.good:P.bad,a})});
      if(k===3){const t=Math.round(200*ease(e));R.label([0,0,ZS+.3],'step '+t+' of 200 · loss '+lossOf(r).toFixed(3),{mono:true,fs:12.5,b:1,c:P.ink,wide:1,dy:16})}
      // 5. only the difference counts: the A to D margin, unchanged by a common shift
      if(k===4){const ya=YB+(r[0]+lift)*SC,yd=r[3]+lift>=0?YB+(r[3]+lift)*SC:YB-.04+(r[3]+lift)*SC;
        R.line([[X(0)+.4,ya,ZS],[X(3)+.4,ya,ZS]],{c:P.mute,w:1,dash:[4,4]});R.line([[X(3)+.45,ya,ZS],[X(3)+.45,yd,ZS]],{c:P.acc,w:2.4,head:7});
        R.label([X(3)+.5,(ya+yd)/2,ZS],'margin '+ST.rm_margin_ad.toFixed(2),{al:'left',dx:6,mono:true,fs:12.5,b:1,c:P.acc,wide:1});
        R.label([0,0,ZS+.3],'every score +1: P(A over D) = σ('+ST.rm_margin_ad.toFixed(2)+') = '+(100*ST.rm_p_ad).toFixed(2)+'%, loss '+ST.rm_loss_end.toFixed(3),{mono:true,fs:12.5,b:1,c:P.ink,a:e,wide:1,dy:16})}}
  }
  const full={cam:[0,.5],bounds:[[-3.8,0,-1.8],[3.8,1.6,1.9]]};
  S3.stage({id:'stg-rm',list:'sx-rm',fig:'Fig. 3 · four answers, six pairs, one score each',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,10,14,10]:[20,20,14,20],
    view:k=>k<=1?{cam:[.1,.45],bounds:[[-3.5,0,-1.8],[3.5,2.3,-1.1]]}:k>=3?{cam:[0,.5],bounds:[[-3.6,0,-1.4],[4.4,2.5,2.0]]}:full});
})();
