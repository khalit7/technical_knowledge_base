// ---- Scene: the hero (renderer v2). One pool of five trajectories, packaged two ways, three arms; then the outcomes of the 528 paired triples
// as bars on plinths: success (Table 9), SC2 execution failures (sc_counts, from Figure 2 decoded), skill guidance misapplied and timeouts (Table 11).
// The pool is drawn as 1s4f (the worked example's mixture); the trajectories' order and the card's shape are illustrative.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const T=PAPER.tables,RC=PAPER.rc,N=528,ARMS=['raw','wf','skill'],NAME={raw:'Raw',wf:'Workflow Memory',skill:'Skill'};
  const row=m=>T.T11.find(r=>r.mode===m),SCK={raw:'Raw',wf:'Workflow Memory',skill:'Skill'};
  // the four metrics, in percent of the 528 triples per arm
  const MET=[
    {n:'success',v:ARMS.map((a,i)=>100*(+T.T9[i][0])/N)},
    {n:'SC2 failures',v:ARMS.map(a=>100*RC.sc_counts[SCK[a]].SC2/N)},
    {n:'misapplied',v:ARMS.map(a=>+row('skill_guidance_misapplied_or_ignored')[a])},
    {n:'timeout',v:ARMS.map(a=>+row('timeout_budget_exhaustion')[a])}];
  window.HERO_MET=MET;
  const AX={raw:-3.2,wf:0,skill:3.2},ZC=0,ZP=-2.7,HS=2.4/70,ZM=[1.6,3.0];
  const POOL=['s','f','f','f','f'],px=i=>(i-2)*1.15;
  function draw(R,k,e){const P=R.P,C={raw:P.mute,wf:P.c2,skill:P.c1};R.grid(-5.5,5.5,-3.6,4.4,.5);
    const back=k===3?1-e:k>3?0:1;   // the packaging recedes once the outcomes are shown
    // 1. the pool: five trajectories of one task
    const pa=k===0?1:k<=2?.9:back;
    POOL.forEach((o,i)=>{const c=o==='s'?P.good:P.bad;R.box([px(i),0,ZP],[.95,.14,.55],{fill:mix(P.paper,c,.55),a:pa});
      if(k===0)R.label([px(i),.14,ZP],o==='s'?'success':'failure',{fs:12,dy:-12,c:o==='s'?P.good:P.bad,a:e})});
    if(k<3)R.label([px(0)-.6,.07,ZP],'five runs of the task',{al:'right',dx:-6,fs:12.5,c:P.mute,a:pa,grp:'row'});
    // 2. three agents, each with its task instruction; Workflow Memory gets the five traces on top of it
    const ca=k===0?0:k>=3?back:1;
    ARMS.forEach(a=>{const x=AX[a],aa=k===0?0:a==='raw'&&k===1?.7:a==='raw'&&k===2?.3:a==='skill'&&k===1?0:a==='wf'&&k===2?.6:ca;
      R.box([x,0,ZC],[1.5,.16,1.0],{fill:mix(P.paper,C[a],.18),a:aa});
      if(k<3)R.label([x,.18,ZC+.5],NAME[a],{fs:13,b:1,c:C[a],dy:14,a:aa});
      if(k>=1&&k<=2)R.label([x,.16,ZC],'task instruction',{fs:12,c:P.mute,dy:-10,wide:1,a:aa*(a==='wf'?0:1)})});
    // the memory stack: one cleaned trace per source trajectory, appended after the instruction
    if(k>=1){const g=k===1?e:1;POOL.forEach((o,i)=>{const y=.16+i*.15,c=o==='s'?P.good:P.bad,ai=k===1?Math.min(1,Math.max(0,g*5-i)):ca;
        R.box([AX.wf,y,ZC],[1.3,.13,.85],{fill:mix(P.paper,c,.4),a:ai,shadow:false})});
      if(k===1){POOL.forEach((o,i)=>R.flowArc([px(i),.16,ZP],[AX.wf,.2+i*.15,ZC-.3],.6,{c:o==='s'?P.good:P.bad,r:.06,n:5,a:.85}));
        R.label([AX.wf,.95,ZC],'+ 5 cleaned traces',{fs:12.5,c:P.c2,b:1,dy:-10,a:e})}}
    // 3. the skill creator (a glass plate) distils the same five into one SKILL.md, placed in the environment beside the agent
    if(k>=2){const g=k===2?e:1,ga=k===2?1:back,gx=AX.skill-.75,gz=-1.45;
      R.glass([gx,.05,gz],[1.5,0,0],[0,1.0,0],{c:P.c1,a:ga*(k===2?1:.6),nu:6,nv:5});
      if(k===2){R.label([AX.skill,1.1,gz],'skill creator',{fs:12.5,c:P.c1,b:1,dy:-10,a:g});
        POOL.forEach((o,i)=>R.flowArc([px(i),.16,ZP],[AX.skill-.4+i*.2,.5,gz],.5,{c:o==='s'?P.good:P.bad,r:.055,n:4,a:.8}));
        R.flowArc([AX.skill,.55,gz+.05],[AX.skill+1.25,.6,ZC],.25,{c:P.c1,r:.065,n:6,a:g})}
      const cx=AX.skill+1.25,cz=ZC,lift=0;
      R.box([cx,lift,cz],[.08,1.05*Math.max(.05,g),.8],{fill:mix(P.paper,P.c1,.22),a:ga});
      [.3,.48,.66,.84].forEach(y=>{if(y<1.05*g)R.line([[cx-.05,y,cz-.3],[cx-.05,y,cz+.3]],{c:P.c1,w:1.4,a:ga*.8})});
      R.label([cx,1.05*g,cz],'SKILL.md',{mono:true,fs:12.5,b:1,c:P.c1,dy:-11,a:ga});
      if(k===2)R.label([cx,0,cz+.4],'in the environment',{fs:12,c:P.mute,dy:14,wide:1,a:g})}
    // 4 to 6: the outcomes over the 528 paired triples. One row of bars per arm morphs from metric to metric (success, then SC2 failures,
    // then misapplied); at the last step a second row rises in front of it for timeouts
    if(k>=3){const Z1=ZM[0],Z2=ZM[1],j=k-3,g=k===3?e:1,two=k===5;
      const cur=k===5?MET[2]:MET[j],prev=k===3?null:k===4?MET[0]:MET[1];
      ARMS.forEach((ar,i)=>{const x=AX[ar],v=prev?lerp(prev.v[i],cur.v[i],e):cur.v[i]*g,h=Math.max(.012,v*HS);
        R.box([x,0,Z1],[1.25,.05,.5]);R.box([x,.05,Z1],[.55,h,.3],{fill:C[ar],shadow:false,lw:.7});
        R.label([x,.05+h,Z1],v.toFixed(1)+'%',{mono:true,fs:12.5,b:ar==='skill',c:C[ar],dy:-11});
        if(k===3)R.flowArc([x,.25,ZC+.5],[x,.05+h,Z1-.1],.35,{c:C[ar],r:.05,n:5,a:.7});
        if(two){const t=MET[3].v[i],h2=Math.max(.012,t*HS*e);R.box([x,0,Z2],[1.25,.05,.5],{a:e});R.box([x,.05,Z2],[.55,h2,.3],{fill:mix(P.paper,C[ar],.55),shadow:false,lw:.7,a:e});
          R.label([x,.05+h2,Z2],t.toFixed(1)+'%',{mono:true,fs:12.5,b:ar==='wf',c:C[ar],dy:-11,a:e})}
        R.label([x,0,(two?Z2:Z1)+.3],NAME[ar],{fs:12.5,b:1,c:C[ar],dy:14})});
      R.label([AX.raw-.8,.1,Z1],cur.n,{al:'right',dx:-6,mono:true,fs:12.5,b:1,grp:'met'});
      if(two)R.label([AX.raw-.8,.1,Z2],'timeout',{al:'right',dx:-6,mono:true,fs:12.5,c:P.mute,grp:'met',a:e})}
  }
  const full={cam:[.3,.62],bounds:[[-5,0,-3.1],[5,1.9,3.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'One pool of experience, three arms',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    view:k=>k===0?{cam:[.3,.6],bounds:[[-3.1,0,-3.1],[3.1,.4,-2.3]]}:k===1?{cam:[.18,.62],bounds:[[-4.2,0,-3.2],[2,1.1,.8]]}:k===2?{cam:[-.25,.6],bounds:[[-1.4,0,-3.2],[5.2,1.2,.8]]}:{cam:[.12,.5],bounds:[[-4.1,0,1.25],[3.9,1.2,3.35]]},
    margin:w=>w<520?[16,10,14,10]:[18,14,14,120]});
})();
