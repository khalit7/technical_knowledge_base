// ---- Scene: Fig. 1, the building blocks around one agent loop (renderer v2). A map, not a measurement: the blocks and paths are the page's
// structure (sections 1 to 9), each step adds one block and lets the rest recede; the step list sx-hero carries the owner page of each. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  // plan: providers at the back, the gateway in front of them, the loop in the middle with its tools, state on the left, traces on the right, your app in front
  const ZP=-2.4,ZG=-1.1,ZL=.5,ZW=1.95,ZA=3.15,YB=0;
  const PROV=[[-1.8,'Anthropic'],[0,'OpenAI'],[1.8,'a model you serve']];
  const LOOP=[0,YB,ZL],TOOLS=[2.25,YB,ZL],CK=[-2.25,YB,ZL],MEM=[-2.25,YB,ZW+.05],APP=[0,YB,ZA],TR=[4.05,YB,ZL];
  const WK=[[-.95,YB,ZW],[.95,YB,ZW]];
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-3.4,5,-3,3.7,.5);
    // how strongly each block shows at this step: the step's subject at 1, the loop at a middle strength, the rest receding
    const S=(s)=>k===s?1:k>s?.32:0;
    const loopA=k===0?1:.6,app=k===0||k===6?1:.4;
    // model providers: one at first, all three once the gateway exists
    PROV.forEach(([x,n],i)=>{const a=i===0?(k===0?1:k===4?1:.35):(k<4?.18:k===4?.2+.8*fa:.3);
      R.box([x,0,ZP],[1.3,.12,.9],{fill:mix(P.paper,P.c2,.12),a});R.glass([x-.48,.12,ZP],[.96,0,0],[0,.9,0],{c:P.c2,a,nu:5,nv:5});
      if(!nar&&(i===0||k>=4))R.label([x,1.02,ZP],n,{fs:12.5,b:k===0||k===4,c:P.c2,a:Math.max(.45,a),dy:-10})});
    if(k===0&&!nar)R.label([PROV[0][0],0,ZP+.45],'model provider',{fs:12,c:P.mute,dy:16});
    // your application in front: the job
    R.box(APP,[1.9,.32,.7],{fill:mix(P.paper,P.ink,.06),a:app});R.label(top(APP,.32),'your app: the job',{fs:12.5,b:1,c:P.ink,a:Math.max(.5,app),dy:-10});
    // the agent loop and its tools
    R.box(LOOP,[1.5,.55,1],{fill:mix(P.paper,P.acc,.35),a:loopA});R.label(top(LOOP,.55),'agent loop',{fs:13.5,b:1,c:P.acc,dy:-12});
    R.box(TOOLS,[1.3,.42,.9],{fill:mix(P.paper,P.good,.3),a:k===0?1:.45});R.label(top(TOOLS,.42),'tools',{fs:12.5,b:1,c:P.good,dy:-10,a:k===0?1:.6});
    // 1. the loop: task in, model call, tool call, result back, again
    const prov0=[PROV[0][0],.6,ZP+.2],gwOn=k>=4,lp=top(LOOP,.4);
    const vA=k===0?fa:k===6?0:.35;
    if(vA>0){R.flow([top(APP,.2),lp],{c:P.ink,a:vA,r:.06,n:3,speed:.9});
      if(!gwOn){R.flowArc(lp,prov0,.5,{c:P.c2,a:vA,r:.065,n:9,speed:1.3});R.flowArc([prov0[0]+.15,.5,prov0[2]],[lp[0]+.2,lp[1],lp[2]],.3,{c:P.acc,a:vA,r:.06,n:7,speed:1.2})}
      R.flowArc([lp[0]+.5,lp[1],lp[2]-.15],top(TOOLS,.35),.35,{c:P.good,a:vA,r:.06,n:5,speed:1.1});R.flowArc(top(TOOLS,.3),[lp[0]+.5,lp[1]-.1,lp[2]+.2],.25,{c:P.good,a:vA*.8,r:.055,n:5,speed:1.1})}
    // 2. orchestration: a glass plate over the loop and its tools, the layer that decides the next step and holds the run's state
    const oA=k===1?fa:k===2?.55:k>2&&k<6?.28:k===6?.5:0;
    if(oA>0){R.glass([-1.0,1.05,ZL-.55],[4.05,0,0],[0,0,1.1],{c:P.acc,a:oA,nu:8,nv:3});
      R.label([1.0,1.05,ZL-.55],nar?'orchestration':'orchestration: graph · typed loop · harness · crews',{fs:12.5,b:1,c:P.acc,a:Math.max(.4,oA),dy:-10});
      if(k===1){R.flowArc([0,1.1,ZL],[0,.62,ZL],.0,{c:P.acc,a:fa,r:.06,n:3,speed:.7});R.flowArc([.6,1.1,ZL],top(TOOLS,.45),.15,{c:P.acc,a:fa,r:.06,n:4,speed:.8})}}
    // 3. state: a checkpoint after every step (the stack grows), and memory across sessions beside it (dashed: another page owns it)
    const cA=S(2);if(cA>0){const nck=k===2?Math.max(1,Math.round(1+5*e)):6;
      for(let i=0;i<nck;i++)R.box([CK[0],.02+i*.1,CK[2]],[1.2,.08,.8],{fill:mix(P.paper,P.c5,.45),a:cA,shadow:i===0,lw:.7});
      if(k!==6)R.label([CK[0],.65,CK[2]],'checkpoints',{fs:12.5,b:k===2,c:P.c5,a:Math.max(.45,cA),dy:-8});
      if(k===2){R.flowArc([lp[0]-.6,lp[1],lp[2]],[CK[0]+.3,.62,CK[2]],.35,{c:P.c5,a:fa,r:.06,n:5,speed:1})}
      R.box(MEM,[1.2,.36,.8],{fill:mix(P.paper,P.c3,.25),a:cA*.75,fa:.55});
      if(!nar&&k!==6)R.label(top(MEM,.36),'memory (another page)',{fs:12,c:P.mute,a:Math.max(.4,cA),dy:-9})}
    // 4. several loops: two workers, each with its own context; tasks out, reports back
    const wA=S(3);if(wA>0)WK.forEach((w,i)=>{R.box(w,[1.05,.4,.7],{fill:mix(P.paper,P.acc,.2),a:wA});
      if(k===3){R.flowArc([lp[0]+(i?.3:-.3),lp[1],lp[2]+.4],top(w,.35),.35,{c:P.acc,a:fa,r:.06,n:4,speed:1});R.flowArc(top(w,.3),[lp[0]+(i?.5:-.5),lp[1]-.05,lp[2]+.45],.2,{c:P.c4,a:fa,r:.05,n:3,speed:.9})}
      if(k===3&&!nar)R.label(top(w,.4),'worker '+(i+1),{fs:12,c:P.acc,dy:-9})});
    // 5. the gateway: one endpoint in front of every provider (keys, budgets, retries, fallbacks)
    const gA=S(4);if(gA>0){R.box([0,0,ZG],[4.7,.3,.6],{fill:mix(P.paper,P.c6,.35),a:gA});if(k!==6)R.label([-2.35,.3,ZG],'gateway',{fs:12.5,b:k===4,c:P.c6,al:'right',dx:-6,a:Math.max(.45,gA)});
      const gp=[0,.32,ZG],va=k===4?fa:k===6?0:.3;
      if(va>0){R.flowArc(lp,gp,.3,{c:P.c2,a:va,r:.065,n:6,speed:1.2});
        PROV.forEach(([x],i)=>R.flowArc([gp[0]+(i-1)*.4,gp[1],gp[2]],[x,.55,ZP+.2],.25,{c:P.c2,a:va*(i===0?1:.55),r:i===0?.065:.05,n:i===0?6:3,speed:1.2}));
        R.flowArc([PROV[1][0]-.2,.5,ZP+.2],[gp[0]+.2,gp[1],gp[2]],.2,{c:P.acc,a:va*.8,r:.055,n:4,speed:1.1});R.flowArc([gp[0]+.3,gp[1],gp[2]+.1],[lp[0]+.25,lp[1],lp[2]],.2,{c:P.acc,a:va*.8,r:.055,n:4,speed:1.1})}}
    // 6. traces: every model call and tool call becomes a span; one run is a tree of spans
    const tA=S(5);if(tA>0){R.box([TR[0],0,TR[2]],[1.25,.12,1.6],{fill:mix(P.paper,P.c3,.15),a:tA});
      [[1.05,0],[.75,.15],[.5,.3],[.62,.15]].forEach(([w,dx],i)=>R.box([TR[0]-.52+dx+w/2,.12+i*.12,TR[2]-.55+i*.32],[w,.1,.24],{fill:mix(P.paper,P.c3,.55),a:tA,shadow:false,lw:.7}));
      R.label([TR[0],.65,TR[2]-.6],'trace: spans',{fs:12.5,b:k===5,c:P.c3,a:Math.max(.45,tA),dy:-8});
      if(k===5){[[lp,.5],[top(TOOLS,.42),.3],[[1.2,.32,ZG],.45]].forEach(([s,h])=>R.flowArc(s,[TR[0]-.3,.5,TR[2]],h,{c:P.c3,a:fa,r:.055,n:4,speed:1}))}}
    // 7. a hosted runtime: the vendor runs the loop, the tools' sandbox and the session; your app sends a task and receives events
    if(k===6){R.box([-.05,0,.98],[5.9,1.45,2.95],{fill:mix(P.paper,P.c4,.4),a:fa,fa:.16,shadow:false,lw:1.1,ec:P.c4});
      R.label([-2.95,1.45,-.5],"the vendor's servers",{fs:12.5,b:1,c:P.c4,a:fa,al:'left',dy:-10});
      R.flowArc(top(APP,.25),[-.3,1.45,2.4],.4,{c:P.ink,a:fa,r:.06,n:4,speed:1});R.flowArc([.3,1.45,2.4],[APP[0]+.4,.3,APP[2]],.4,{c:P.c4,a:fa,r:.06,n:6,speed:1});
      if(!nar)R.label([APP[0]+1.2,.3,APP[2]],'task in, events out',{fs:12,c:P.c4,al:'left',dx:6,a:fa})}
  }
  const full={cam:[.2,.66],bounds:[[-3.1,0,-2.9],[4.7,1.45,3.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the blocks around one agent loop',cam:full.cam,bounds:full.bounds,aspect:.64,dur:1400,hold:5200,draw,
    view:k=>k===3?{cam:[.15,.72],bounds:[[-3.1,0,-.3],[3.1,1.3,3.5]]}:k===4?{cam:[.2,.58],bounds:[[-3.1,0,-2.9],[3.1,1.3,1.2]]}:k===5?{cam:[.45,.62],bounds:[[-1.4,0,-1.8],[4.8,1.3,2.2]]}:full});
})();
