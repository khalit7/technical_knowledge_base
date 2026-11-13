// ---- Scene: the HarnessDev protocol (renderer v2: module columns as glass cases, the frozen harness behind glass, flowing dots for code, feedback and task runs) ----
// The seed's six empty slots; a creator writing into them; what the 18 Creation code harnesses ended up with (§4.2, Figure 5: complete
// implementations per job, as the Method section states them); the harness frozen and run by its own creator (Self-Eval, Opus 4.8's avg@3 row
// of Table 3), by Gemini 3.1 Pro (Unified-Eval, Table 4) and set beside the human references (Table 9). Every score comes from
// window.PAPER.tables at run time; window.HDPROTO exposes what the scene draws for check_stages.mjs.
(function(){
  if(!document.getElementById('stg-proto'))return;const {at,off,lerp,mix}=S3;
  const T=window.PAPER.tables,row=(t,n)=>T[t].rows.find(r=>r.row===n);
  const BK=['swe','term','mle','eq','bc'],BN=['SWE-Pro','Terminal','MLE-bench','EQ-Bench3','BrowseComp'],BS=['SWE','Term','MLE','EQ','BC'];
  const TASKS=BK.map((k,j)=>T.T2.rows[j].tasks),SELF=BK.map(k=>row('T3','Opus 4.8')[k]),UNI=BK.map(k=>row('T4','Opus 4.8')[k]);
  const REF=T.T9.rows.map(r=>parseFloat(r.score)),REFM=T.T9.rows.map(r=>r.model),STAR=T.T9.rows.map(r=>/\*/.test(r.score));
  // complete implementations among the 18 code harnesses (§4.2, Figure 5); context is not reported separately for code
  const MOD=[['E','execution loop',18],['T','tools',13],['C','context',null],['S','state',1],['L','lifecycle',13],['V','verification',15]];
  window.HDPROTO={tasks:TASKS,total:TASKS.reduce((a,b)=>a+b,0),self:SELF,uni:UNI,ref:REF,refModel:REFM,mods:MOD.map(m=>m[2])};
  const MX=i=>-3.1+i*.62,MC=(MX(0)+MX(5))/2,HM=1.7,BX=j=>1.3+j*1.05,HB=1.9,CR=[-5.4,0,0],EX=[-4.4,0,-.2],DEV=[-4.5,0,1.35];
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-6.4,6.3,-3,2.2,.5);
    // the creator: present while it builds (steps 2 and 3), gone once the harness is frozen
    const ca=k===1?e:k===2?1-.75*e:0;
    if(ca>.01){R.box(CR,[1.1,.8,.8],{fill:mix(P.paper,P.c4,.4),a:ca});R.label([CR[0],.8,CR[2]],'creator · Opus 4.8',{mono:true,fs:12.5,b:1,dy:-14,c:P.c4,a:ca});
      if(k===1)R.label([CR[0],0,CR[2]+.4],'in Claude Code',{mono:true,fs:12,dy:14,c:P.mute,a:ca,wide:1});
      // one to three development cases; their feedback flows back to the creator
      [0,1,2].forEach(i=>R.box([DEV[0]+i*.38-.38,0,DEV[2]],[.3,.06,.42],{fill:mix(P.paper,P.c5,.5),a:ca}));
      if(k===1)R.label([DEV[0],.06,DEV[2]+.2],'1 to 3 dev cases',{mono:true,fs:12,dy:14,c:P.c5,a:ca,wide:1});
      if(k===1){R.flowArc([DEV[0],.1,DEV[2]],[CR[0]+.2,.6,CR[2]+.3],.5,{c:P.c5,a:e,r:.05,n:5,speed:1.2});
        MOD.forEach((m,i)=>R.flowArc([CR[0]+.5,.75,CR[2]],[MX(i),.9,0],.7+.06*i,{c:P.c4,a:e,r:.055,n:6,speed:1.4}))}}
    // the harness: six module columns on one base; the seed's are empty, the built ones filled to their count of the 18 code harnesses
    const focusH=k<=2?1:.85;
    R.box([MC,0,0],[6*.62+.3,.08,.9],{fill:P.paper,a:1});
    const fill=k===2?e:k>2?1:0;
    MOD.forEach(([l,name,n],i)=>{const c=[MX(i),.08,0];
      R.box(c,[.46,HM,.46],{fill:mix(P.paper,P.c1,.25),fa:.1,ea:.3,shadow:false,a:focusH});
      if(n!=null&&fill>0){const h=Math.max(.03,n/18*HM)*fill,red=l==='S';R.box(c,[.4,h,.4],{fill:red?mix(P.paper,P.bad,.7):mix(P.paper,P.c1,.55),shadow:false,a:focusH});
        if(k===2)R.label([c[0],.08+h,0],n+'/18',{mono:true,fs:12,b:1,dy:-10,c:red?P.bad:P.c1,a:e})}
      if(n==null&&k===2&&!narrow)R.label([c[0],.9,0],'n/r',{mono:true,fs:12,c:P.mute,a:e});
      if(k===1)R.glow([c[0],.9,0],.35,{c:P.c4,a:.35*e});
      R.label([c[0],0,.45],l,{fs:13.5,b:1,dy:14,c:l==='S'&&k===2?P.bad:P.ink});
      if(k===2)R.label([c[0],0,.45],name,{mono:true,fs:12,dy:30,c:P.mute,a:k===0?e:1,wide:1})});
    R.label([MC,HM+.1,0],k===0?'the seed: six empty slots':k===1?'the creator writes the harness':k===2?'complete in the 18 code harnesses':'harness H, frozen',{mono:true,fs:12.5,b:1,dy:-12,c:k>=3?P.c1:P.ink,a:k===0||k===2?e:k===1||k===3?e:1,wide:k>=3?1:0});
    // frozen: a glass case around the harness from step 4 on
    const fz=at(k,e,3);
    if(fz>.01){const x0=MX(0)-.38,x1=MX(5)+.38,W=x1-x0;R.glass([x0,.08,.5],[W,0,0],[0,HM+.12,0],{c:P.c1,a:fz,nu:6,nv:4});R.glass([x0,HM+.2,-.5],[W,0,0],[0,0,1.0],{c:P.c1,a:fz*.6,nu:6,nv:2})}
    // the executor: the creator itself under Self-Eval, Gemini 3.1 Pro under Unified-Eval
    const xa=at(k,e,3);
    if(xa>.01){const gem=k===4,col=gem?P.c6:P.c4,tc=k===4?mix(P.c4,P.c6,e):k===5?mix(P.c6,P.c4,e):P.c4;
      R.box(EX,[1.25,.6,.7],{fill:mix(P.paper,tc,.4),a:xa});
      R.label([EX[0],.6,EX[2]],gem?'executor · Gemini 3.1 Pro':'executor · Opus 4.8',{dy:-14,mono:true,fs:12.5,b:1,c:col,a:xa});
      if(k===3||k===4)R.flowArc([EX[0]+.6,.5,EX[2]],[MX(0)-.2,.7,0],.4,{c:col,a:xa,r:.055,n:5,speed:1.2})}
    // five benchmarks of hidden tasks: plinths, Opus's bars, and the references beside them
    const ba=k===0?1:k===1||k===2?.25:1;
    BK.forEach((key,j)=>{const x=BX(j);R.box([x,0,0],[.8,.06,.85],{fill:P.paper,a:ba});
      if(ba>.5)R.label([x,0,.43],narrow?BS[j]:BN[j],{fs:12.5,b:1,dy:14,c:P.ink,a:ba});
      if(k===3||k===4)R.label([x,0,.43],TASKS[j].toLocaleString('en-GB')+' tasks',{mono:true,fs:12,dy:30,c:P.mute,a:k===3?e:1,wide:1});
      let v=0;if(k===3)v=SELF[j]*e;else if(k===4)v=lerp(SELF[j],UNI[j],e);else if(k===5)v=lerp(UNI[j],SELF[j],e);
      const col=k===4?P.c6:P.c4;
      if(k===0)R.label([x,.06,.18],'0',{mono:true,fs:12,b:1,dy:-10,c:P.mute,a:e});
      if(k>=3){const h=Math.max(.02,v/100*HB);R.box([x,.06,.18],[.32,h,.32],{fill:mix(P.paper,col,.55),shadow:false});
        const d=UNI[j]-SELF[j],lab=k===4?(d>0?'+':'−')+Math.abs(d).toFixed(1):v.toFixed(1);
        if(k<5&&!(narrow&&k===4&&j>0))R.label([x,.06+h,.18],lab,{mono:true,fs:12,b:1,dy:-10,c:k===4?(d<0?P.bad:P.good):col,a:k===4?e:1})}
      // tasks flow from the frozen harness to each benchmark, more dots where there are more tasks
      if(k===3||k===4)R.flowArc([MX(5)+.3,.9,0],[x,.5,.18],.6+.1*j,{c:k===4?P.c6:P.c4,a:k===3?e:1,r:.05,n:2+Math.round(TASKS[j]/150),speed:1.3});
      // the human reference: another harness with its own model
      if(k===5){const h=REF[j]/100*HB*e,newer=/Fable|Sol/.test(REFM[j]);R.box([x,.06,-.22],[.32,Math.max(.02,h),.32],{fill:mix(P.paper,P.mute,.35),shadow:false});
        R.label([x,.06+h,-.22],REF[j].toFixed(1)+(STAR[j]?'*':''),{mono:true,fs:12,b:1,dy:-10,c:P.ink,a:e,wide:1});
        R.label([x,0,.43],REFM[j].replace('Claude ',''),{fs:12,dy:30,c:newer?P.bad:P.mute,a:e,wide:1})}});
    if(k===3||k===4)R.label([BX(0)-.5,1.6,0],k===4?'Unified-Eval':'Self-Eval',{al:'left',mono:true,fs:12.5,b:1,c:k===4?P.c6:P.c4,wide:1});
  }
  const full={cam:[.28,.52],bounds:[[-5.1,0,-1.2],[6.0,1.95,1.7]]};
  S3.stage({id:'stg-proto',list:'sx-proto',fig:'3D · the protocol: build, freeze, run, score',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,26,10]:[18,16,30,16],
    // building moves out to show the creator; the module counts move in close on the harness; running and scoring show the harness and the benchmarks
    view:k=>{const v=k===1?{cam:[.35,.5],bounds:[[-6.2,0,-1.2],[-.4,1.9,1.9]]}:k===2?{cam:[.22,.42],bounds:[[-3.7,0,-.6],[.4,1.9,1.2]]}:full;return innerWidth<520&&k!==2?{cam:[v.cam[0],.72],bounds:v.bounds}:v}});
})();
