// ---- Scene: Fig. 3, evals in the loop (renderer v2). The three runs this page scored (FOBS.scores.runs) as traces in one store; the rule-based
// scorer reads them and writes four scores back (bars on each trace: tests_pass, summary_complete, turns, cost_usd), the false pass on the
// local run, the trace promoted into a dataset, and the gate every change must pass before it ships new traces. ----
(function(){
  if(!document.getElementById('stg-loop'))return;const {mix}=S3;
  const RUNS=window.FOBS.scores.runs,NM={manual:'local run, hand-instrumented',pydantic_ai:'local run, Pydantic AI',cc_default:'Claude Code run'};
  const XS=-2.5,LEN=2.6,ZS=[1.45,0,-1.45],maxT=Math.max(...RUNS.map(r=>r.scores.turns));
  const EV=[.9,-1.1],DS=[3.5,-1.1],GT=[3.5,1.25],DP=[.9,1.25];
  const KEYS=[['tests_pass','c3'],['summary_complete','c3'],['turns','c1'],['cost_usd','c4']];
  const bh=(k,v)=>k==='turns'?.2+1.0*v/maxT:k==='cost_usd'?.6:.18+.5*v;
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4.8,4.6,-2.4,2.6,.5);
    const focus=i=>k===3||k===4?(i===0?1:.25):1;
    // the trace store: one slab per run, the root at its left end
    {const x0=XS-LEN/2-.25,x1=XS+LEN/2+.25;R.quad([[x0,.01,-2.05],[x1,.01,-2.05],[x1,.01,2.05],[x0,.01,2.05]],{fill:mix(P.paper,P.c1,.08),dz:1e4})} // the store's floor, under everything
    R.label([XS,.05,2.05],'trace store',{fs:13,b:1,c:P.acc,dy:16,a:k===2?0:1});
    RUNS.forEach((r,i)=>{const z=ZS[i],a=focus(i);
      R.box([XS,.05,z],[LEN,.16,.62],{fill:mix(P.paper,P.c1,.35),a,lw:.8});R.box([XS-LEN/2+.12,.05,z],[.18,.3,.62],{fill:mix(P.paper,P.c5,.6),a,lw:.7});
      R.label([XS-LEN/2-.05,.12,z],NM[r.key]||r.label,{al:'right',dx:-8,fs:12.5,c:P.ink,a:k===3||k===4?(i===0?1:0):1,grp:'runs'});
      if(nar)R.label([XS-LEN/2+.12,.35,z],['hand','Pydantic AI','Claude Code'][i],{fs:12,c:P.ink,dy:-10,a:k===3||k===4?(i===0?1:0):1});
      // the scores written back: four bars on the slab
      if(k>=2)KEYS.forEach(([key,ck],j)=>{const v=r.scores[key];if(v==null)return;const x=XS-.7+j*.56,g=k===2?e:1;
        const wrong=k>=3&&i===0&&key==='summary_complete',cl=wrong?P.bad:P[ck];
        R.box([x,.21,z],[.32,bh(key,v)*g,.32],{fill:mix(P.paper,cl,.6),a,lw:.7});
        const lab=key==='cost_usd'?'$'+v.toFixed(4):String(v);
        if(!nar||k>=3)R.label([x,.21+bh(key,v)*g,z],lab,{mono:true,fs:12,b:1,c:cl,dy:-10,a:(k===3||k===4)&&i>0?0:a*g});
        if(i===0&&k===2&&!nar)R.label([x,.21,z+.13],key,{mono:true,fs:12,c:P.mute,dy:14,a:fa*.9,grp:'keys'})});
      if(k===3&&i===0)R.label([XS-.7+.56,1.0,z],'summary_complete = 1, should be 0',{fs:13,b:1,c:P.bad,dy:-12,a:fa})});
    // the evaluator, the dataset, the gate, the deploy
    const on=(s)=>s.includes(k)?1:.2;
    R.box([EV[0],0,EV[1]],[.95,.6,.95],{fill:mix(P.paper,P.c5,.38),a:on([1,2]),lw:.8});R.label([EV[0],.6,EV[1]],'evaluator',{fs:13,b:1,c:mix(P.ink,P.c5,.4),dy:-12,a:on([1,2])>.5?1:k===0||k===3?0:.35});
    R.box([DS[0],0,DS[1]],[1,.42,1],{fill:mix(P.paper,P.c4,.3),a:on([4,5]),lw:.8});R.label([DS[0],.42,DS[1]],'dataset',{fs:13,b:1,c:P.c4,dy:-12,a:on([4,5])>.5?1:k===0||k===3?0:.35});
    if(k>=4)R.box([DS[0],.42,DS[1]],[.6,.12*(k===4?e:1),.6],{fill:mix(P.paper,P.c1,.5),a:1,lw:.7});
    R.glass([GT[0]-.6,.05,GT[1]],[1.2,0,0],[0,1,0],{c:P.c6,a:on([5]),nu:4,nv:4});R.label([GT[0],1.1,GT[1]],'gate',{fs:13,b:1,c:P.c6,dy:-12,a:k===5?1:k===0||k===3?0:.35});
    R.box([DP[0],0,DP[1]],[.9,.35,.9],{fill:mix(P.paper,P.c3,.35),a:on([5]),lw:.8});R.label([DP[0],.35,DP[1]],'deploy',{fs:13,b:1,c:P.c3,dy:-12,a:k===5?1:k===0||k===3?0:.35});
    if(k===1)RUNS.forEach((r,i)=>R.flowArc([XS+LEN/2-.2,.25,ZS[i]],[EV[0]-.3,.45,EV[1]],.3,{c:P.c1,a:fa,r:.06,speed:1.2,n:5}));
    if(k===2)RUNS.forEach((r,i)=>R.flowArc([EV[0]-.3,.5,EV[1]+.2],[XS+.4,.5,ZS[i]],.5,{c:P.c5,a:fa,r:.065,speed:1.1,n:6}));
    if(k===4){R.flowArc([XS+LEN/2,.3,ZS[0]],[DS[0]-.4,.5,DS[1]],.8,{c:P.c1,a:fa,r:.07,n:8,speed:1.1});
      R.label([DS[0],.55,DS[1]],'item: sourceTraceId, expected output',{fs:12.5,c:P.c4,dy:22,a:fa})}
    if(k===5){R.flow([[DS[0],.3,DS[1]+.5],[GT[0],.3,GT[1]-.1]],{c:P.c4,a:fa,r:.065,n:6});
      R.flow([[GT[0]-.1,.3,GT[1]],[DP[0]+.45,.3,DP[1]]],{c:P.c6,a:fa,r:.065,n:5});
      R.flowArc([DP[0]-.45,.25,DP[1]],[XS+LEN/2,.25,ZS[0]],.4,{c:P.c3,a:fa,r:.065,n:6});
      R.label([(DS[0]+DP[0])/2,0,GT[1]+.5],'every prompt, model, tool or harness change',{fs:12.5,c:P.mute,dy:18,a:fa,wide:1})}
  }
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 3 · three scored runs, one trace store, one loop',cam:[.25,.72],bounds:[[-4,0,-2.1],[4.1,1.1,2.1]],aspect:.52,dur:1300,hold:4800,draw,margin:w=>w<520?[14,10,14,10]:[16,14,14,190],
    view:k=>k===3?{cam:[.2,.55],bounds:[[-3.9,0,.8],[-1.1,1.2,2.1]]}:k<=0?{cam:[.2,.7],bounds:[[-3.9,0,-2.1],[-1.1,.8,2.1]]}:null});
})();
