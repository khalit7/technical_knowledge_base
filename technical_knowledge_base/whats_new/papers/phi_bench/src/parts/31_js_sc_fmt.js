// ---- Scene: the three task formats on one drawn repository (renderer v2: file blocks on a glass base, flows where work and submissions move, cubes per task) ----
// Steps 1 to 4: the task package, then the editable scope of KFC (one file), LHI (a submodule) and E2EO (the whole repository). The repository's
// layout is illustrative; the task counts are Table 1's. Step 5: one cube per task by format and scoring type, counted from the released
// tasks_index.json as this page already holds it (window.PAPER.tables.tasks: b = kfc, lh or e2e; cls = p for a ratio score, i for pass or fail).
// window.PHIFMT exposes the counts for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-fmt'))return;const {at,off,lerp,mix}=S3;
  const TK=window.PAPER.tables.tasks,FM=[['kfc','KFC'],['lh','LHI'],['e2e','E2EO']];
  const CNT=FM.map(([b,n])=>({b,n,all:TK.filter(t=>t.b===b).length,perf:TK.filter(t=>t.b===b&&t.cls==='p').length,pf:TK.filter(t=>t.b===b&&t.cls!=='p').length}));
  window.PHIFMT={counts:CNT,total:TK.length,perf:TK.filter(t=>t.cls==='p').length};
  // the repository: 6 x 3 files; the submodule is columns 3 and 4; the KFC file sits inside it; the E2EO bottleneck outside (illustrative)
  const NC=6,NR=3,FX=i=>-2.75+i*1.05,FZ=j=>-1.05+j*1.05,FW=[.74,.3,.62];
  const inSub=(i,j)=>i===3||i===4,KF=[4,1],BN=[1,0];
  const SPEC=[-5.1,0,.75],WORK=[-5.1,0,-.75],HAR=[5.0,0,0];
  function draw(R,k,e){const P=R.P,col=[P.c1,P.c4,P.c2];R.grid(-6.2,6.2,-2.6,2.6,.5);
    // steps 1 to 4 show the package; step 5 fades it out in its first half, then the task cubes arrive
    const la=k<4?1:Math.max(0,1-2*e),ca=k<4?0:Math.max(0,2*e-1);
    if(la>.01){
      // glass base under the repository, then the files
      R.glass([FX(0)-.6,.01,FZ(0)-.55],[FX(NC-1)-FX(0)+1.2,0,0],[0,0,FZ(NR-1)-FZ(0)+1.1],{c:P.mute,a:la*.5,nu:6,nv:3});
      const scope=k===1?(i,j)=>i===KF[0]&&j===KF[1]:k===2?inSub:k===3?()=>true:()=>false,fc=k>=1&&k<=3?col[k-1]:P.c1;
      for(let i=0;i<NC;i++)for(let j=0;j<NR;j++){const on=scope(i,j),lift=on&&k===1?.18*e:0,a=k===0?1:on?1:.22;
        R.box([FX(i),.02+lift,FZ(j)],FW,{fill:on?mix(P.paper,fc,k===3?.38:.6):P.paper,a:la*a,shadow:true});
        if(k===3&&i===BN[0]&&j===BN[1])R.glow([FX(i),.4,FZ(j)],.55,{c:P.bad,a:la*.8*e})}
      R.label([FX(0)-.6,.05,FZ(NR-1)+.55],'repository',{al:'left',mono:true,fs:12,dy:14,c:P.mute,a:k===0?la:k===2?la*.6:0,wide:1});
      // the submodule outline (LHI) and the KFC file's interface line
      if(k===2)R.box([(FX(3)+FX(4))/2,0,FZ(1)],[FX(4)-FX(3)+.95,.55,FZ(2)-FZ(0)+.85],{fill:P.c4,fa:.07,ea:.85,ec:P.c4,a:la*e,shadow:false});
      // spec, workloads and tests: visible to the agent
      R.box(SPEC,[1.1,.14,.8],{fill:mix(P.paper,P.c3,.35),a:la*(k===0||k===1?1:.45)});
      R.label([SPEC[0],.14,SPEC[2]],'spec',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:k===1?0:la});
      R.box(WORK,[1.1,.14,.8],{fill:mix(P.paper,P.c5,.35),a:la*(k===0||k===3?1:.45)});
      R.label([WORK[0],.14,WORK[2]],'workloads, tests',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:k===1?0:la});
      // the hidden harness: faint until something is submitted to it
      const ha=k===0?.45:.8;
      R.box(HAR,[1.0,1.1,1.9],{fill:P.mute,fa:.1,ea:.55,ec:P.mute,a:la*ha,shadow:false});
      R.label([HAR[0],1.1,HAR[2]],k===0?'harness · hidden':'harness',{mono:true,fs:12.5,b:1,dy:-12,c:P.mute,a:la});
      // step 1: the agent reads the spec; steps 2 to 4: the work flows, then the submissions go to the harness (dots: one for KFC, many for up to 16)
      if(k===0){R.flowArc([SPEC[0]+.5,.15,SPEC[2]],[FX(0),.35,FZ(2)],.6,{c:P.c3,a:.8,r:.05,n:5});R.flowArc([WORK[0]+.5,.15,WORK[2]],[FX(0),.35,FZ(0)],.6,{c:P.c5,a:.8,r:.05,n:5})}
      if(k===1){const p=[FX(KF[0]),.5,FZ(KF[1])];R.flowArc([SPEC[0]+.5,.15,SPEC[2]],p,1.1,{c:P.c3,a:e,r:.06,n:9});
        R.flowArc(p,[HAR[0]-.5,.6,HAR[2]],.7,{c:col[0],a:e,r:.08,n:2,speed:.9});
        R.label(p,'one file · interface fixed',{mono:true,fs:12.5,b:1,dy:-26,c:col[0],a:e})}
      if(k===2){for(let j=0;j<NR;j++)R.flowArc([FX(3),.36,FZ(j)],[FX(4),.36,FZ((j+1)%NR)],.35,{c:col[1],a:e,r:.05,n:4,speed:1.4});
        R.flowArc([FX(4)+.3,.5,FZ(1)],[HAR[0]-.5,.6,HAR[2]],.7,{c:col[1],a:e,r:.06,n:8});
        R.label([(FX(3)+FX(4))/2,.55,FZ(2)+.4],'a submodule · several files',{mono:true,fs:12.5,b:1,dy:-14,c:col[1],a:e})}
      if(k===3){const path=[[WORK[0]+.55,.2,WORK[2]]];for(let i=0;i<NC;i++)path.push([FX(i),.42,FZ(i%2?2:0)]);path.push([HAR[0]-.5,.5,HAR[2]]);
        R.flow(path,{c:P.c5,a:e,r:.07,speed:1.5});R.flowArc([FX(NC-1)+.3,.5,FZ(1)],[HAR[0]-.5,.7,HAR[2]],.6,{c:col[2],a:e,r:.06,n:8});
        R.label([FX(BN[0]),.32,FZ(BN[1])],'bottleneck: find it',{mono:true,fs:12.5,b:1,dy:-22,c:P.bad,a:e,wide:1});
        R.label([FX(2.5),.32,FZ(2)+.5],'the whole repository · nothing named',{mono:true,fs:12.5,b:1,dy:-12,c:col[2],a:e,wide:1})}
    }
    if(ca>.01){
      // one cube per task, 5 wide and 2 deep per layer: ratio-scored first, pass or fail on top in grey
      const S=.24,G=.29,TX=[-2.6,0,2.6];
      CNT.forEach((c,f)=>{for(let q=0;q<c.all;q++){const lay=Math.floor(q/10),r=q%10,ix=r%5,iz=Math.floor(r/5);
          const show=Math.min(1,Math.max(0,ca*(c.all+4)-q)/4);if(show<=0)continue;
          const pf=q>=c.perf;R.box([TX[f]+(ix-2)*G,lay*G,(iz-.5)*G],[S,S,S],{fill:pf?mix(P.paper,P.mute,.45):mix(P.paper,col[f],.62),a:show,shadow:false,lw:.6})}
        const top=Math.ceil(c.all/10)*G;
        R.label([TX[f],top,0],c.n+' · '+c.all,{mono:true,fs:13,b:1,dy:-14,c:col[f],a:ca});
        R.label([TX[f],0,.5],c.perf+' ratio · '+c.pf+' pass/fail',{mono:true,fs:12,dy:14,c:P.mute,a:ca,wide:1});
        R.flowArc([HAR[0]-.5,.6,0],[TX[f],top+.1,0],.6+.1*(2-f),{c:col[f],a:ca*.8,r:.05,n:5,speed:1.3})});
      R.box(HAR,[1.0,1.1,1.9],{fill:P.mute,fa:.12,ea:.6,ec:P.mute,a:ca,shadow:false});
      R.label([HAR[0],1.1,HAR[2]],'harness',{mono:true,fs:12.5,b:1,dy:-12,c:P.mute,a:ca})}
  }
  const full={cam:[.32,.62],bounds:[[-5.8,0,-1.8],[5.6,1.2,1.8]]};
  S3.stage({id:'stg-fmt',list:'sx-fmt',fig:'3D · three formats, one repository',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,18,10]:[18,16,20,16],
    // step 2 moves in close on the one editable file; step 5 frames the task cubes and the harness
    view:k=>k===1?{cam:[.5,.55],bounds:[[FX(2)-.5,0,-1.6],[HAR[0]+.6,1.0,1.6]]}:k===4?{cam:[.32,.5],bounds:[[-4.0,0,-1.2],[5.6,1.9,1.2]]}:full});
})();
