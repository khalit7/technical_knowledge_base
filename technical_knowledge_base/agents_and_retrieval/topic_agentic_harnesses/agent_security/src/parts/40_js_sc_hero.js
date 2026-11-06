// ---- Scene: Fig. 1, the trust boundary of one coding agent (renderer v2). Seven steps, one per item of ol#sx-hero:
// the task and the context, untrusted text flowing in, tool calls reaching files, secrets and the network (the three legs),
// then the controls outside the model one at a time: gate, sandbox walls, egress proxy, secrets moved to a broker, a monitor.
// Schematic: no data drives it; the numbers live in the sections each control points to. No attack route is drawn. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,mix,lerp,lerp3}=S3;
  const CX=-3.4,MX=-1.55,GX=-.35,RX=1.15,SB=[.35,3.45,-1.45,1.45],WH=1.25,PX=3.45,NX=5.25;
  const FILES=[2.55,0,-.75],SEC0=[2.55,0,.75],SEC1=[2.55,0,2.35],NET=[[NX,0,-1.45,'model API'],[NX,0,0,'registry'],[NX,0,1.45,'any other host']];
  const SRC=['README','issue','web page','tool output','tool definitions'];
  const srcX=i=>-5.7+i*.78,SZ=-2.15;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-6.4,6.4,-3,3,.5);
    // in a close view, labels of things outside it are not drawn (they would be clamped to the canvas edge)
    const vx=k===1?[-7.2,-.8]:k===3?[-2.7,2.1]:k===5?[.5,7]:[-9,9],lab=(p,t,o)=>{if(p[0]<vx[0]||p[0]>vx[1])return;if(nar&&!o.ph)return;R.label(p,t,o)};
    // on a phone only the labels of what the current step is about are drawn (ph); the step list names the rest
    const stake=k===0?.25:1;
    // the context window: four slabs, one token stream (system, tool definitions, your task, text read while working)
    const ctxA=k===1?1:k>=3?.55:1;
    [['system',P.paper],['tool definitions',mix(P.paper,P.c5,.35)],['your task',mix(P.paper,P.good,.35)],['text it read',mix(P.paper,P.bad,.4)]].forEach(([t,c],i)=>{
      const a=i===3?at(k,e,1)*ctxA:ctxA;R.box([CX,i*.21,0],[1.3,.19,1.7],{fill:c,a,shadow:i===0,lw:.7});
      if(k<=1&&!nar)lab([CX+.65,i*.21+.1,.85],t,{al:'left',dx:6,fs:12,c:i===3?P.bad:P.mute,a:i===3?at(k,e,1):1,grp:'ctx'})});
    lab([CX,0,.85],'context · one token stream',{ph:k<=1,fs:12.5,b:1,dy:k<=1?34:16,a:ctxA});
    // you and your task
    R.box([-5.6,0,1.65],[.75,.45,.6],{fill:mix(P.paper,P.good,.3),a:k>=2?.45:1});lab([-5.6,.45,1.65],'you',{ph:k===0,fs:13,b:1,c:P.good,dy:-11,a:k>=2?.6:1});
    if(k===0)R.flowArc([-5.3,.4,1.6],[CX-.4,.55,.4],.4,{c:P.good,r:.06,n:6,speed:1.1});
    // the model
    R.box([MX,0,0],[1.1,.9,1.3],{fill:mix(P.paper,P.c2,.3)});lab([MX,.9,0],'model',{fs:13.5,b:1,c:P.c2,dy:-12,ph:k<=3});
    if(k===0)R.flow([[CX+.6,.45,0],[MX-.5,.45,0]],{c:P.c2,r:.06,n:5,speed:1.2});
    // untrusted sources at the back, streaming into the context (leg: untrusted content)
    const sa=k===1?e:k>=2?.4:0;
    SRC.forEach((t,i)=>{if(sa<=.01)return;R.box([srcX(i),0,SZ],[.6,.42,.12],{fill:mix(P.paper,P.bad,.12),a:sa});
      if(k===1)lab([srcX(i),.42,SZ],t,{fs:12,dy:i%2?-28:-11,a:e,wide:1});
      if(k===1)R.flowArc([srcX(i),.3,SZ+.1],[CX,.62,-.5],.35,{c:P.bad,r:.055,n:5,speed:1.1,a:e})});
    if(sa>.01)lab([srcX(0)-.4,.2,SZ],'untrusted content',{ph:k===1,al:'right',dx:-6,fs:12.5,b:1,c:P.bad,a:Math.max(sa,k>=2?.75:0)});
    // tool calls leave the model
    const ta=at(k,e,2);
    R.box([RX,0,0],[.9,.65,.9],{fill:mix(P.paper,P.acc,.18),a:ta});lab([RX,.65,0],'tool runs',{ph:k===2,fs:12.5,b:1,dy:-11,a:ta});
    // the three stakes: project files, secrets, the network
    R.box(FILES,[1.05,.45,.8],{fill:P.paper,a:stake});lab([FILES[0],.45,FILES[2]],'project files',{fs:12,dy:-11,a:stake});
    const sp=k>=6?lerp3(SEC0,SEC1,e):SEC0,brokerA=at(k,e,6);
    if(brokerA>0){R.box(SEC1,[1.05,.5,.75],{fill:mix(P.paper,P.good,.25),a:brokerA});lab([SEC1[0]-.6,.25,SEC1[2]],'broker · §8',{ph:1,al:'right',dx:-6,fs:12.5,b:1,c:P.good,a:brokerA})}
    R.box([sp[0],k>=6?.5*e:0,sp[2]],[.42,.3,.32],{fill:mix(P.paper,P.c5,.7),a:stake});lab([sp[0]+.25,.3+(k>=6?.5*e:0),sp[2]],'secrets',{al:'left',dx:4,fs:12,c:P.c5,a:stake});
    NET.forEach(([x,y,z,t],i)=>{const ok=i<2&&k>=5;R.box([x,y,z],[1.0,.45,.8],{fill:ok?mix(P.paper,P.good,.2):P.paper,a:stake*(i===2&&k>=5?.55:1)});lab([x+.55,.2,z],t,{al:'left',dx:6,fs:12,a:stake})});
    // the legs, marked in red while present, green once removed
    if(k>=2){const da=k===2?e:1,dataGone=k>=6,outGone=k>=5;
      lab(dataGone?[SEC1[0],0,SEC1[2]+.4]:[SEC0[0],0,SEC0[2]+.3],dataGone?'private data · out of reach':'private data',{ph:k===2,fs:12.5,b:1,c:dataGone?P.good:P.bad,dy:14,a:da});
      lab([NX,0,2.0],outGone?'a way out · closed':'a way out',{ph:k===2,fs:12.5,b:1,c:outGone?P.good:P.bad,dy:14,a:da})}
    // step 3: with nothing in between, calls reach everything
    if(k===2){R.flow([[MX+.55,.45,0],[RX-.42,.45,0]],{c:P.c2,r:.06,n:5,speed:1.2,a:e});
      R.flowArc([RX+.3,.5,-.2],[FILES[0]-.3,.45,FILES[2]],.35,{c:P.bad,r:.055,n:5,a:e});R.flowArc([RX+.3,.5,.2],[SEC0[0]-.2,.3,SEC0[2]],.35,{c:P.bad,r:.055,n:5,a:e});
      NET.forEach(([x,y,z])=>R.flowArc([RX+.4,.55,0],[x-.45,.4,z],.7,{c:P.bad,r:.055,n:8,a:e}))}
    // step 4: the gate between the model and the tools
    const ga=at(k,e,3),gHot=k===3?1:.5;
    if(ga>0){R.glass([GX,.02,-1.25],[0,0,2.5],[0,1.15,0],{c:P.acc,a:ga*gHot,nu:4,nv:4});lab([GX,1.17,-1.25],'gate · §4, §5',{ph:k===3,fs:12.5,b:1,c:P.acc,dy:-10,a:ga})}
    if(k===3){R.flow([[MX+.55,.45,-.2],[GX-.06,.45,-.2]],{c:P.c2,r:.06,n:5,speed:1.2});R.flow([[GX+.06,.45,-.2],[RX-.42,.45,-.2]],{c:P.good,r:.06,n:4,speed:1.2,a:e});
      R.flowArc([GX-.08,.5,.35],[MX+.5,.5,.35],.4,{c:P.bad,r:.06,n:4,speed:1,a:e});lab([GX,.2,1.25],'allow · ask · deny',{fs:12,c:P.acc,dy:14,a:e})}
    if(k>=4)R.flow([[MX+.55,.45,0],[RX-.42,.45,0]],{c:P.c2,r:.05,n:5,speed:1.2,a:.35});
    // step 5: the sandbox walls around everything the agent starts
    const wa=at(k,e,4),wHot=k===4?1:.55,[x0,x1,z0,z1]=SB;
    if(wa>0){const c=P.c1,o={c,a:wa*wHot,nu:6,nv:3,th:.03};R.glass([x0,0,z0],[x1-x0,0,0],[0,WH,0],o);R.glass([x0,0,z0],[0,0,z1-z0],[0,WH,0],o);
      R.glass([x0,0,z1],[x1-x0,0,0],[0,WH,0],{c,a:wa*wHot*.7,nu:6,nv:3,th:.03});R.glass([x1,0,z0],[0,0,z1-z0],[0,WH,0],o);
      lab([x0+.1,WH,z0],'sandbox · §6',{ph:k===4,al:'left',fs:12.5,b:1,c,dy:-10,a:wa})}
    if(k===4){R.flowArc([RX+.3,.5,-.2],[FILES[0]-.3,.45,FILES[2]],.35,{c:P.good,r:.055,n:5});
      NET.forEach(([x,y,z])=>{const end=[x1-.05,.55,z*.85];R.flow([[RX+.4,.55,0],end],{c:P.bad,r:.055,n:5,a:e});R.glow(end,.22,{c:P.bad,a:e})});lab([x1,.2,1.45],'no network of its own',{fs:12,c:P.bad,dy:16,a:e,wide:1})}
    // step 6: the one way out is a proxy that decides by destination
    const pa=at(k,e,5);
    if(pa>0){R.box([PX,0,0],[.5,.85,.7],{fill:mix(P.paper,P.acc,.45),a:pa});lab([PX,.85,0],'egress proxy · §7',{ph:k===5,fs:12.5,b:1,c:P.acc,dy:-11,a:pa})}
    if(k===5){R.flow([[RX+.4,.55,0],[PX-.27,.55,0]],{c:P.c2,r:.055,n:5});
      NET.forEach(([x,y,z],i)=>{if(i<2)R.flow([[PX+.27,.5,0],[x-.45,.4,z]],{c:P.good,r:.055,n:5,a:e});else{const end=[PX+.75,.45,.75];R.flow([[PX+.27,.45,.25],end],{c:P.bad,r:.06,n:4,a:e});R.glow(end,.3,{c:P.bad,a:e});lab(end,'denied',{ph:1,fs:12.5,b:1,c:P.bad,dy:16,a:e})}})}
    // step 7: the real secret held outside the sandbox; the agent gets results only. A monitor watches every layer.
    if(k===6){R.flowArc([RX+.2,.5,.35],[SEC1[0]-.4,.45,SEC1[2]-.2],.3,{c:P.c2,r:.05,n:5,a:e});R.flowArc([SEC1[0]-.5,.45,SEC1[2]],[RX+.1,.5,.45],.3,{c:P.good,r:.05,n:5,a:e});
      const M=[-.5,0,2.25];R.box(M,[1.0,.5,.6],{fill:mix(P.paper,P.c4,.25),a:e});lab([M[0]-.6,.25,M[2]],'monitor · §9',{ph:1,al:'right',dx:-6,fs:12.5,b:1,c:P.c4,a:e});
      [[GX,.9,1.2],[x0+.6,WH*.8,z1],[PX,.85,.3]].forEach(p=>R.line([[M[0],.5,M[2]],p],{c:P.c4,w:1.2,dash:[4,4],a:e*.8}));
      lab([M[0],0,M[2]+.3],'alerts; stops nothing',{fs:12,c:P.c4,dy:16,a:e,wide:1})}
  }
  const full={cam:[.22,.82],bounds:[[-6.9,0,-2.6],[6.6,1.0,2.6]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the trust boundary of one coding agent',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,16,16],
    // step 2 moves in close on the sources and the context; steps 4 and 6 on the gate and the proxy; the rest show the whole boundary
    view:k=>k===1?{cam:[.32,.72],bounds:[[-6.9,0,-2.6],[-1,1.0,2.1]]}:k===3?{cam:[.25,.7],bounds:[[-2.6,0,-1.6],[2,1.2,1.6]]}:k===5?{cam:[.25,.75],bounds:[[.6,0,-2],[6.6,1.0,2.2]]}:full});
})();
