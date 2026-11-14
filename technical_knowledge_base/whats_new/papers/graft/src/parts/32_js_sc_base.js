// ---- Scene: Fig. 2, the routed baseline on one group (renderer v2: reward bars, a glass plane for the baseline, signed advantage bars on white plinths, flows into the adapters) ----
// Driven by the page's toy: one group of 16 sampled from the default GRAFT run's pre-ablation policy at step 15 (seed 1), with the engine's own
// advantages for the plain GRPO baseline and for GRAFT's baseline over the unflagged samples (src/toy_sweep.mjs writes TOYREF.stage.group).
(function(){
  if(!document.getElementById('stg-base')||!window.TOYREF||!TOYREF.stage)return;const {at,off,lerp,mix}=S3;
  const G=TOYREF.stage.group,S=G.samples,n=S.length,nU=S.filter(s=>!s.fl).length;
  const x=i=>(i-(n-1)/2)*.6+(S[i].fl?.3:-.3),RH=1.1,ZR=.9,ZA=-1.7,YA=1.45,AS=1.3/Math.max(...S.map(s=>Math.max(Math.abs(s.a_all),Math.abs(s.a_graft)))),ZP=-4.7;
  const sumU=k=>S.reduce((t,s)=>t+(s.fl?0:s[k]),0);
  function colOf(P,s){return s.t===0?(s.ok?P.c3:P.paper):s.t===1?P.c5:s.t===2?P.c2:mix(P.paper,P.c2,.5)}
  const nm=s=>s.t===0?(s.ok?'✓':'✗'):'h'+s.t;
  function draw(R,k,e){const P=R.P;R.grid(-6.6,7.4,-5.2,2,.5);
    const rA=k>=4?.3:1,flA=k===3?lerp(1,.3,e):k===4?.3:1;
    // 1. the rewards
    S.forEach((s,i)=>{const a=(s.fl?flA:1)*rA,h=Math.max(.04,s.r*RH);R.box([x(i),0,ZR],[.4,h,.4],{fill:colOf(P,s),a});
      R.label([x(i),0,ZR+.3],nm(s),{mono:true,fs:12,dy:12,c:s.fl&&k>=1?P.c5:P.ink,a:Math.max(.4,a),wide:1})});
    R.label([x(0)-.4,.5,ZR],'reward',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
    // 2. the monitor flags hack 1
    if(k>=1){const a=k===1?e:k>=4?.35:flA,xs=S.map((s,i)=>s.fl?x(i):null).filter(v=>v!=null),x0=Math.min(...xs)-.3,x1=Math.max(...xs)+.3;
      R.quad([[x0,.005,ZR-.35],[x1,.005,ZR-.35],[x1,.005,ZR+.35],[x0,.005,ZR+.35]],{fill:mix(P.paper,P.c5,.45),a,edge:false});
      if(k===1)S.forEach((s,i)=>{if(s.fl)R.glow([x(i),RH+.08,ZR],.18,{c:P.c5,a:e})});
      if(k===1)R.label([(x0+x1)/2,RH,ZR],'flagged by the monitor: '+(n-nU),{fs:12.5,b:1,c:P.c5,dy:-22,a})}
    // 3-4. the baseline as a glass plane over the samples it averages; the advantages as signed bars on plinths behind
    if(k>=2){const m=k===2?G.mean_all:k===3?lerp(G.mean_all,G.mean_unflagged,e):G.mean_unflagged,x0=k===2?x(0)-.3:lerp(x(0)-.3,x(0)-.3,e),x1=k===2?x(n-1)+.3:lerp(x(n-1)+.3,x(nU-1)+.3,k===3?e:1);
      const ga=(k===2?e:1)*(k>=4?.3:1);
      R.glass([x0,m*RH,ZR-.32],[x1-x0,0,0],[0,0,.64],{c:P.mute,a:ga,nu:16,nv:2,th:.02});
      R.label([x1,m*RH,ZR],(k===2?'mean of all 16 = ':'mean of the '+nU+' unflagged = ')+(k===2?G.mean_all:G.mean_unflagged).toFixed(2),{al:'left',dx:8,mono:true,fs:12,c:P.ink,a:k>=4?0:ga,wide:1});
      const aA=k===2?e:1,key=k===2?'a_all':'a_graft',t=k===3?e:1;
      S.forEach((s,i)=>{R.box([x(i),YA-.05,ZA],[.54,.05,.36],{a:aA,shadow:false});R.box([x(i),0,ZA],[.03,YA-.05,.03],{a:aA*.6})});
      S.forEach((s,i)=>{const v=k===2?s.a_all:lerp(s.a_all,s.a_graft,t),h=Math.max(.012,Math.abs(v)*AS),a=aA*(s.fl&&k>=3&&k<4?.55:1);
        R.box([x(i),v>=0?YA:YA-.05-h,ZA],[.3,h,.16],{fill:v>=0?colOf(P,s):mix(P.paper,P.bad,.55),a,shadow:false,lw:.7});
        if(Math.abs(v)>1)R.label([x(i)+.2,YA-.05-h,ZA],(v>0?'+':'')+v.toFixed(2),{al:'left',dx:4,mono:true,fs:12,c:P.bad,a})});
      R.label([x(0)-.4,YA,ZA],'advantage',{al:'right',dx:-6,mono:true,fs:12,c:P.mute,grp:'row'});
      // the sum over the unflagged answers, the only ones that reach the retain adapter
      const su=k===2?sumU('a_all'):lerp(sumU('a_all'),sumU('a_graft'),t),hs=Math.max(.015,Math.abs(su)*AS),xs=x(n-1)+1.1;
      R.box([xs,YA-.05,ZA],[.62,.05,.4],{a:aA,shadow:false});R.box([xs,su>=0?YA:YA-.05-hs,ZA],[.46,hs,.3],{fill:P.c1,a:aA,shadow:false});
      R.label([xs,YA,ZA],'Σ unflagged '+(Math.abs(su)<.005?'0.00':su.toFixed(2)),{mono:true,fs:12.5,b:1,c:P.c1,dy:-14,a:aA})}
    // 5. where each gradient goes: unflagged to both adapters, flagged to the forget adapter only, twice the dots
    if(k>=4){const pR=[-2.3,0,ZP],pF=[2.6,0,ZP];
      [[pR,P.c1,'θR retain'],[pF,P.c4,'θF forget']].forEach(([p,c,t])=>{R.box([p[0],0,p[2]],[2.6,.16,.4],{fill:P.paper,a:e});R.glass([p[0]-1.15,.16,p[2]],[2.3,0,0],[0,1.3,0],{c,a:e,nu:10,nv:6});R.label([p[0],1.5,p[2]],t,{fs:13,b:1,c,dy:-8,a:e})});
      S.forEach((s,i)=>{const v=Math.abs(s.a_graft),src=[x(i),YA+.1,ZA],r=.04+.025*Math.min(2,v),nd=Math.max(2,Math.round(2+2*Math.min(2,v)));
        if(!s.fl)R.flowArc(src,[pR[0]+(i/(nU-1)-.5)*1.8,1.25,ZP],.5,{c:P.c1,a:e*.9,r,n:nd,speed:1.1});
        R.flowArc(src,[pF[0]+((s.fl?i-nU:i)/(s.fl?n-nU-1:nU-1)-.5)*1.8,1.25,ZP],.5,{c:P.c4,a:e*.9,r,n:s.fl?nd*2:nd,speed:1.1})})}
  }
  const full={cam:[.07,.8],bounds:[[-5.6,0,-2.1],[7.2,1.6,1.5]]};
  S3.stage({id:'stg-base',list:'sx-base',fig:'Fig. 2 · the routed baseline on one group of the toy',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,16,14,96],
    // on a phone the long row turns into depth (a rotated camera), so the answers draw larger in the tall card
    view:k=>{const v=k===4?{cam:[.1,.74],bounds:[[-5.6,0,-4.9],[7.2,1.6,1.5]]}:full;return innerWidth<520?{cam:[v.cam[0]+.55,v.cam[1]+.05],bounds:v.bounds}:v}});
})();
