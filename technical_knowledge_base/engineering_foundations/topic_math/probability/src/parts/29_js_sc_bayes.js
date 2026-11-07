// ---- Scene, Fig. 4 (section 5): Bayes' rule as bars, on the toxicity filter: prior (base rate) times likelihood (the flag)
// gives the unnormalised posterior, which the evidence P(flag) rescales to sum to 1; then the same filter at a 20% base rate (renderer v2) ----
// Sensitivity 0.95, false positive rate 0.05 (the section's illustrative filter). Every product and ratio is computed here.
// Layout: the factors run left to right (prior, likelihood, posterior); the two classes are rows in depth (clean in front, toxic behind).
(function(){
  if(!document.getElementById('stg-bayes')||!window.PMS)return;const {mix,lerp}=S3;
  const TPR=.95,FPR=.05,lik=[TPR,FPR];
  const run=b=>{const pr=[b,1-b],prod=[pr[0]*lik[0],pr[1]*lik[1]],ev=prod[0]+prod[1];return {pr,prod,ev,post:prod.map(v=>v/ev)}};
  const A=run(.01),B=run(.2);window.PM_BAYES={A,B};
  const XP=-2.3,XL=0,XQ=2.3,ZR=[-.9,.9],S=2.2,HN=['toxic','clean'];
  function draw(R,k,e){const P=R.P;R.grid(-3.6,3.6,-2.4,2.6,.5);
    const T=k===4?{pr:A.pr.map((v,i)=>lerp(v,B.pr[i],e)),prod:A.prod.map((v,i)=>lerp(v,B.prod[i],e)),post:A.post.map((v,i)=>lerp(v,B.post[i],e))}:A;
    const cols=[P.bad,P.c6],f=(v,d)=>v.toFixed(d);
    const bar=(x,i,v,c,a,lab)=>{if(a<=.01)return;const h=Math.max(.012,v*S);R.box([x,0,ZR[i]],[.7,h,.6],{fill:mix(c,P.paper,.18),a});R.label([x,h,ZR[i]],lab,{mono:true,fs:12.5,b:1,dy:-10,c,a})};
    // 1. the prior: the base rate
    const pa=k===0?1:k===1?.4:k===2?1:k===3?.25:1;
    [0,1].forEach(i=>bar(XP,i,T.pr[i]*(k===0?e:1),cols[i],pa,f(T.pr[i],2)));
    // 2. the likelihood of the evidence: P(flag | class)
    const la=k===0?0:k===1?e:k===2?1:k===3?.25:.5;
    [0,1].forEach(i=>bar(XL,i,lik[i]*(k===1?e:1),P.c4,la,f(lik[i],2)));
    // 3. multiply, class by class: dots stream from both factors into the product; 4. divide by the evidence so the two add to 1
    const qa=k<2?0:k===2?e:1;
    if(qa>.01){const g=k===3?e:k===4?1:0;
      [0,1].forEach(i=>{const v=lerp(T.prod[i],T.post[i],g);bar(XQ,i,v,cols[i],qa,k===2||(k===3&&e<.5)?f(T.prod[i],4):f(T.post[i],3))});
      if(k===2)[0,1].forEach(i=>{R.flowArc([XP,T.pr[i]*S,ZR[i]],[XQ,T.prod[i]*S+.05,ZR[i]],.9,{c:cols[i],r:.05,n:Math.round(4+T.pr[i]*10),a:e});
        R.flowArc([XL,lik[i]*S,ZR[i]],[XQ,T.prod[i]*S+.05,ZR[i]],.45,{c:P.c4,r:.05,n:Math.round(3+lik[i]*10),a:e})});
      if(k===3)R.label([XQ,1.2,0],'÷ P(flag) = '+f(A.ev,3),{mono:true,fs:13,b:1,c:P.acc,a:e});
      if(k===4)R.label([XL+.9,2.2,0],'÷ P(flag) = '+f(B.ev,3),{mono:true,fs:13,b:1,c:P.acc,a:e})}
    // column and row names
    [[XP,'prior',pa],[XL,'× likelihood P(flag | ·)',Math.max(la,.3)],[XQ,k>=3?'= posterior':'= prior × likelihood',Math.max(qa,.3)]].forEach(([x,t,a])=>R.label([x,0,ZR[1]+.45],t,{fs:12.5,b:1,c:P.mute,dy:16,a}));
    HN.forEach((h,i)=>R.label([XQ+.5,0,ZR[i]],h,{al:'left',dx:8,fs:13,b:1,c:cols[i]}));
    if(k===4)R.label([XP,2.2,0],'base rate 20%',{mono:true,fs:13,b:1,c:P.ink,a:e});
  }
  const full={cam:[.42,.5],bounds:[[-2.9,0,-1.4],[3.4,2.3,1.6]]};
  S3.stage({id:'stg-bayes',list:'sx-bayes',fig:'Fig. 4 · posterior ∝ likelihood × prior',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,14,16],
    view:k=>k===3?{cam:[.55,.42],bounds:[[1,0,-1.4],[3.6,2.2,1.6]]}:null});
})();
