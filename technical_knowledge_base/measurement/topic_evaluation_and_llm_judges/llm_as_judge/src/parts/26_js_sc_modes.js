// ---- Scene: Fig. 1, four judge modes (stg-modes, renderer v2) ----
// One released MT-Bench comparison (question 81, turn 1: GPT-3.5-turbo against Alpaca-13B) sent through four lanes: what the judge sees
// (answer slabs, a reference, checklist questions) flows through a glass judge plate into what it returns. Pointwise and pairwise use
// GPT-4's released verdicts for that comparison (window.MTB via LJ); step 3 draws both modes' agreement with the human votes on the
// 10 pairs without Vicuna (LJ.agree); the reference lane draws Zheng et al. Table 4 (failures of 20); the checklist lane's answers are illustrative.
(function(){
  if(!document.getElementById('stg-modes')||!window.S3||!window.LJ)return;const {at,mix,lerp}=S3,L=window.LJ;
  // the example comparison, found by its fields rather than its index
  const KI=L.K.findIndex(k=>k[0]===81&&k[1]===1&&k[2]===2&&k[3]===4),K=L.K[KI];
  const ex={i:L.nm(K[2]),j:L.nm(K[3]),si:K[6],sj:K[7],pv:K[4],hv:L.V.filter(v=>v[0]===KI).map(v=>v[1])};
  const P1=L.agree('P',{scope:'nov'}),S1=L.agree('S',{scope:'nov'}),H1=L.humans({scope:'nov'});
  const pc=x=>(100*x).toFixed(1)+'%';
  window.LJS=window.LJS||{};LJS.modes={score:ex.sj+' of 10',pair:ex.pv===0?ex.i:ex.pv===1?ex.j:'tie',humans:ex.hv.filter(h=>h===0).length+' of '+ex.hv.length,
    pa:pc(P1.agree),sa:pc(S1.agree),pk:P1.kappa.toFixed(3),sk:S1.kappa.toFixed(3),ha:pc(H1.agree),n:P1.n.toLocaleString('en-US')};
  const Z=[2.4,.8,-.8,-2.4],XP=-.6,XO=.5,H=1.2;
  const NAMES=['Pointwise','Pairwise','Reference-guided','Checklist'];
  // which lanes a step is about
  const FOC=[[0],[1],[0,1],[2],[3]];
  function slab(R,x,z,w,col,a,lab,show){R.box([x,0,z],[w,.5,.62],{fill:col,a});if(show)R.label([x,.5,z],lab,{fs:12.5,b:1,dy:-11,a})}
  function plate(R,z,a,show){const P=R.P;R.glass([XP,.06,z-.45],[0,0,.9],[0,.95,0],{c:P.acc,a,nu:4,nv:4});if(show)R.label([XP,1.01,z],'GPT-4 judge',{fs:12,dy:-10,c:P.acc,b:1,a})}
  function draw(R,k,e){const P=R.P,f=FOC[k];R.grid(-4,3.8,-3.4,3.4,.5);
    const A=i=>f.includes(i)?1:.18,on=i=>f.includes(i);
    NAMES.forEach((nm,i)=>R.label([-3.3,.25,Z[i]],nm,{al:'right',dx:-4,fs:13,b:on(i),c:on(i)?P.ink:P.mute,a:on(i)?1:.55,grp:'lane'}));
    // lane 0, pointwise: one answer, a score out of 10
    {const z=Z[0],a=A(0),s=on(0);slab(R,-2.3,z,.95,mix(P.paper,P.c6,.35),a,ex.j,s);plate(R,z,a,s);
      if(s&&k!==2){R.flowArc([-2.3,.5,z],[XP,.5,z],.35,{c:P.c6,r:.06});R.flow([[XP,.5,z],[XO,.32,z]],{c:P.acc,r:.06})}
      if(k!==2)for(let c=0;c<10;c++){const lit=c<ex.sj,t=k===0?at(k,e,0):1;R.box([XO+c*.21,0,z],[.17,lit?.22+.03*c:.05,.32],{fill:lit?mix(P.paper,P.c2,.75):P.paper,a:a*(lit?t:1),shadow:false})}
      if(s&&k===0)R.label([XO+2.35,.55,z],ex.sj+' / 10',{fs:13.5,b:1,c:P.c2,dy:-8,a:e})}
    // lane 1, pairwise: two answers, a verdict A, tie or B
    {const z=Z[1],a=A(1),s=on(1);slab(R,-2.75,z,.85,mix(P.paper,P.c1,.35),a,'A',s&&k===1);slab(R,-1.8,z,.85,mix(P.paper,P.c6,.35),a,'B',s&&k===1);
      if(s&&k===1)R.label([-2.3,0,z+.45],'A · '+ex.i+'   B · '+ex.j,{fs:12,dy:12,c:P.mute,wide:1});
      plate(R,z,a,s);
      if(s&&k!==2){R.flowArc([-2.75,.5,z],[XP,.55,z],.4,{c:P.c1,r:.06});R.flowArc([-1.8,.5,z],[XP,.45,z],.25,{c:P.c6,r:.06});R.flow([[XP,.5,z],[XO+.3,.35,z]],{c:P.acc,r:.06})}
      if(k!==2)['A','tie','B'].forEach((t,c)=>{const win=c===(ex.pv===2?1:ex.pv===0?0:2),lift=win&&k>=1?.35*(k===1?e:1):0;
        R.box([XO+.2+c*.75,0,z],[.5,.16+lift,.4],{fill:win?mix(P.paper,P.c1,.7):P.paper,a});if(s)R.label([XO+.2+c*.75,.16+lift,z],t,{fs:12.5,b:win,dy:-10,c:win?P.c1:P.mute,a})})}
    // step 3: both modes' agreement with the human votes on the same 10 pairs, against the human-human level
    if(k===2){const t=e;[[0,S1,'pointwise'],[1,P1,'pairwise']].forEach(([i,r,nm])=>{const z=Z[i],h=r.agree*H*t;R.flow([[XP,.5,z],[XO+.6,.4,z]],{c:P.acc,r:.06});
        R.box([XO+1,0,z],[.55,Math.max(.01,h),.5],{fill:mix(P.paper,i?P.c1:P.c2,.6)});R.label([XO+.7,h,z],nm+' '+pc(r.agree)+' · κ '+r.kappa.toFixed(3),{fs:12.5,b:1,al:'right',dx:-4,c:i?P.c1:P.c2,a:t})});
      const y=H1.agree*H;R.line([[XO+.55,y,Z[0]+.35],[XO+1.45,y,Z[0]+.35],[XO+1.45,y,Z[1]-.35],[XO+.55,y,Z[1]-.35],[XO+.55,y,Z[0]+.35]],{c:P.mute,w:1.3,dash:[5,4],a:e});
      R.label([XO+1.45,y,Z[0]+.35],'humans with each other '+pc(H1.agree),{al:'left',dx:10,dy:14,fs:12,c:P.mute,a:e,wide:1})}
    // lane 2, reference-guided: the answer and a reference; Zheng et al. Table 4, math failures out of 20
    {const z=Z[2],a=A(2),s=on(2);slab(R,-2.75,z,.85,mix(P.paper,P.c6,.35),a,'answer',s);slab(R,-1.8,z,.85,mix(P.paper,P.good,.45),a,'reference',s);plate(R,z,a,s);
      if(s){R.flowArc([-2.75,.5,z],[XP,.55,z],.4,{c:P.c6,r:.06});R.flowArc([-1.8,.5,z],[XP,.45,z],.25,{c:P.good,r:.06});R.flow([[XP,.5,z],[XO+.3,.35,z]],{c:P.acc,r:.06})}
      [['plain',14],['solve first',6],['reference',3]].forEach(([t,n],c)=>{const h=Math.max(.02,n/20*H*(k===3?e:1)),hi=c===2;
        R.box([XO+.2+c*.8,0,z],[.5,h,.4],{fill:mix(P.paper,P.bad,hi?.75:.4),a});if(s)R.label([XO+.2+c*.8,h,z],String(n),{fs:12.5,b:hi,dy:-11,c:hi?P.bad:P.ink,a});
        if(s)R.label([XO+.2+c*.8,0,z+.3],t,{fs:12,dy:12,c:P.mute,a,grp:'refx'})});
      if(s)R.label([XO+1,1.75,z],'wrong answers accepted, of 20',{fs:12,b:1,c:P.bad,a:k===3?e:1,wide:1})}
    // lane 3, checklist: the answer and five yes/no questions, each answered alone, summed by a program (answers illustrative)
    {const z=Z[3],a=A(3),s=on(3),yes=[1,1,0,1,1];slab(R,-2.75,z,.85,mix(P.paper,P.c6,.35),a,'answer',s);
      for(let q=0;q<5;q++){const qz=z-.6+q*.3;R.box([-1.8,0,qz],[.5,.28,.22],{fill:mix(P.paper,P.c4,.4),a,shadow:false});if(s)R.flowArc([-1.8,.28,qz],[XP,.3+q*.12,z],.2,{c:P.c4,r:.045,n:4})}
      if(s)R.label([-1.8,.28,z-.6],'q1 to q5',{fs:12,dy:-10,c:P.c4,b:1,a});plate(R,z,a,s);
      yes.forEach((y,q)=>{const qz=z-.6+q*.3,t=k===4?Math.min(1,Math.max(0,e*1.6-q*.15)):1;R.box([XO+.4,0,qz],[.5,y?.18+.3*t:.06,.22],{fill:y?mix(P.paper,P.good,.7):mix(P.paper,P.bad,.6),a,shadow:false});
        if(s)R.flow([[XP,.4,z],[XO+.1,.25,qz]],{c:P.acc,r:.04,n:3})});
      if(s){R.label([XO+.75,.5,z-.75],'yes · yes · no · yes · yes',{al:'left',dx:8,fs:12,c:P.ink,a:e});R.label([XO+.75,.5,z-.75],'4 of 5 (illustrative)',{al:'left',dx:8,dy:18,fs:12,b:1,c:P.good,a:e})}}
  }
  const lane=i=>[[-3.4,0,Z[i]-.75],[3.1,1.25,Z[i]+.75]];
  const full={cam:[.16,.78],bounds:[[-3.6,0,-3.2],[3.2,1.4,3.2]]};
  S3.stage({id:'stg-modes',list:'sx-modes',fig:'Fig. 1 · one MT-Bench comparison, four ways to judge it',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1400,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,16,120],
    // the one-lane close-ups turn the lane towards the reader, so it fills more of the card
    view:k=>k===2?{cam:[.18,.6],bounds:[[-3.4,0,Z[1]-.8],[3.6,1.4,Z[0]+.8]]}:{cam:[.62,.72],bounds:lane(FOC[k][0])}});
})();
