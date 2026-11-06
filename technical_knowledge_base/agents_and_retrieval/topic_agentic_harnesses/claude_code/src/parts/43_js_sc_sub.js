// ---- Scene: Fig. 4, a subagent's own window (section 7, renderer v2). Run "subagent": every height is the run's own record. The parent's
// column grows by its eight model calls (input tokens per call, from usage); each subagent instance's column grows by its progress records
// (total_tokens), and its report is the task_notification. Costs: the parent's calls at Haiku 4.5 list prices, the rest of total_cost_usd for
// the subagents. Steps (ol#sx-sub): launch, the two windows, the eight calls, the report, the second instance, the cost. ----
(function(){
  if(!document.getElementById('stg-sub')||!window.HCCR)return;const {mix,at}=S3;
  const r=HCCR.run('subagent');if(!r)return;const fmt=HCCR.fmt,callIn=HCCR.callIn;
  const PIN=r.calls.map(callIn),PT=r.calls.map(c=>c[8]);
  const tasks=r.ev.filter(e=>e.k==='task'),starts=tasks.filter(e=>e.sub==='task_started').map(e=>e.t);
  const inst=starts.map((t0,i)=>{const t1=starts[i+1]||1e9,ev=tasks.filter(e=>e.t>=t0&&e.t<t1);
    return {prog:ev.filter(e=>e.sub==='task_progress').map(e=>e.tok),done:(ev.find(e=>e.sub==='task_notification')||{}).tok,t0}});
  const S1=inst[0],S2=inst[1];
  const P={in:1,cw:2,cr:.1,out:5},main=r.calls.reduce((s,c)=>s+(c[0]*P.in+c[1]*P.cw+c[2]*P.cr+c[3]*P.out)/1e6,0),sub=r.cost-main;
  const XP=-2.7,X1=.3,X2=2.4,XR=-1.2,ZR=-1.3,ZB=1.95,K=2.2/20000,W=[.95,.95];
  // the parent's calls before the first report, and before the second launch
  const nBefore=PT.filter(t=>t<S1.t0+1).length,nMid=PT.filter(t=>t<S2.t0).length;
  // a context window as a stack: the first record as the base, each later record as a slab on top
  function col(R,x,vals,n,c,a,lab,cur){const P=R.P;if(n<=0||a<=.01)return 0;R.box([x,0,0],[1.25,.06,1.15],{fill:mix(P.paper,P.soft,.5),a});
    let y=.06;for(let i=0;i<n;i++){const h=(i?vals[i]-vals[i-1]:vals[0])*K;R.box([x,y,0],[W[0],Math.max(.012,h),W[1]],{fill:mix(P.paper,c,i?.5:.25),a,lw:.7,shadow:i===0});y+=h}
    if(lab)R.label([x,y,0],lab,{fs:12.5,b:cur,c:mix(P.ink,c,.3),dy:-12,a:Math.max(.5,a)});return y}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.4,4.6,-1.4,2.6,.5);
    // the repository both windows read from
    const ra=k===2||k===3?1:.3;R.box([XR,0,ZR],[.8,.42,.6],{fill:mix(P.paper,P.c5,.3),a:ra});R.label([XR,.42,ZR],'repo files',{fs:12.5,c:P.c5,b:1,dy:-10,a:Math.max(.5,ra),wide:1});
    // the parent
    const np=k<=1?1:k===2?2:k===3?nMid:PIN.length,pa=k===5?.3:1;
    const top=col(R,XP,PIN,np,P.c1,pa,'parent · '+fmt(PIN[np-1]),k!==2);
    
    // instance 1: opens at step 1, grows through its eight calls at step 3, reports at step 4
    const n1=k===0?1:k===1?1:S1.prog.length,a1=k>=4?.3:1;
    if(k>=0){const v=k>=3?S1.prog.concat([S1.done]):S1.prog,n=k>=3?v.length:n1;
      const t1=col(R,X1,v,n,P.c3,k===0?at(k,e,0):a1,'subagent 1 · '+fmt(v[n-1]),k>=1&&k<=3);
      if(k===0)R.flowArc([XP,top,0],[X1,.3,0],.9,{c:P.c2,r:.07,n:8,speed:1.3,a:e});
      if(k===0)R.label([(XP+X1)/2+.3,top+.45,0],'Agent: "run the tests"',{mono:true,fs:12.5,b:1,c:P.c2,dy:-6,al:'left',a:e});
      if(k===2){R.flowArc([XR,.42,ZR],[X1,t1*.6,-.4],.5,{c:P.c5,r:.06,n:10,speed:1.2,a:e});R.label([X1+.6,t1*.5,0],S1.prog.length+' tool calls',{fs:13,b:1,c:P.c3,al:'left',dx:8,a:e})}
      if(k===3){R.flowArc([X1,t1,0],[XP,top,0],.5,{c:P.c3,r:.075,n:5,speed:1.1,a:1});R.flowArc([XR,.42,ZR],[XP,top*.7,-.4],.4,{c:P.c5,r:.05,n:7,speed:1.2,a:e});
        R.label([(XP+X1)/2,Math.max(top,t1)+.25,0],'only the report comes back',{fs:12.5,b:1,c:P.c3,a:e,wide:1})}}
    // instance 2
    if(k>=4){const v=S2.prog.concat([S2.done]),a2=k===5?.3:1;const t2=col(R,X2,v,v.length,P.c3,k===4?Math.min(1,e*1.4):a2,'subagent 2 · '+fmt(S2.done),k===4);
      if(k===4){R.flowArc([XP,top,0],[X2,.3,0],1.1,{c:P.c2,r:.065,n:8,speed:1.3,a:e});R.flowArc([X2,t2,0],[XP,top,0],.7,{c:P.c3,r:.07,n:5,speed:1.1,a:e})}}
    // the cost, as bars on plinths in front: only the totals hold the subagents' share
    if(k===5){const H=1.25/r.cost,bars=[[XP,main,P.c1,'parent, 8 calls'],[(X1+X2)/2,sub,P.c3,'subagents, 2 runs'],[4.0,r.cost,P.ink,'total_cost_usd']];
      bars.forEach(([x,v,c,t])=>{R.box([x,0,ZB],[.9,.05,.7],{fill:P.paper,shadow:false});R.box([x,.05,ZB],[.6,v*H*e+.01,.45],{fill:mix(P.paper,c,.6)});
        R.label([x,.05+v*H*e,ZB],'$'+v.toFixed(3),{mono:true,fs:13,b:1,c,dy:-12});R.label([x,0,ZB+.35],t,{fs:12,c:P.mute,dy:16,wide:1})});
      R.label([(X1+X2)/2,.05+sub*H,ZB],Math.round(100*sub/r.cost)+'% of the run',{fs:12.5,b:1,c:P.c3,dy:-30,a:e})}
  }
  const full={cam:[.3,.55],bounds:[[-3.9,0,-1.7],[3.5,2.3,.9]]};
  S3.stage({id:'stg-sub',list:'sx-sub',fig:'Fig. 4 · run subagent, windows to scale',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>k===1?{cam:[.45,.42],bounds:[[-3.6,0,-.7],[1.6,2.0,.8]]}:k===2||k===3?{cam:[.35,.5],bounds:[[-3.8,0,-1.7],[1.9,2.2,.8]]}:k===5?{cam:[.3,.5],bounds:[[-3.5,0,.6],[4.7,1.6,2.6]]}:full,
    margin:w=>w<520?[18,10,14,10]:[24,16,16,16]});
})();
