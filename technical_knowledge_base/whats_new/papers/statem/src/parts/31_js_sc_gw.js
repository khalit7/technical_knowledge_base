// ---- Scene (Method): the checked goto on configure-git-webserver, a soft plan against StateM (renderer v2: the runbook's states as platforms,
// the exit gate as a glass plate on the edge to handoff, the live system as five service blocks, the context as a stack, flowing dots wherever the agent,
// the gate's host check or the verifier touches the system, the camera moving in close on the refused goto) ----
// Illustrative, as the 2D animation it replaces (2026-11-13): built only from the paper's description of the task (§4.6) and the gate of the released
// git_webserver_deploy runbook; no baseline trace is published, so the service that fails is this page's example. The steps, the world state and the
// counters are the old animation's data, unchanged; window.SMGW exposes them for src/check_stages.mjs.
(function(){
  if(!document.getElementById('stg-gw')||typeof S3==='undefined')return;const {at,off,lerp,mix}=S3;
  const W5=['bare repo','post-receive hook','sshd :22','nginx :8080','hello.html served'];
  // world: 0 absent, 1 up, 2 down; ctx: [plan, execution output, anchor] in illustrative proportions of the context
  const soft=[
    {w:[0,0,0,0,0],st:'',x:-3,ctx:[3,0],ev:''},
    {w:[1,1,1,1,0],st:'',x:-1.5,ctx:[3,40],ev:'build'},
    {w:[1,1,1,1,1],st:'',x:0,ctx:[3,70],ev:'test'},
    {w:[1,1,1,2,0],st:'',x:1.5,ctx:[3,90],ev:'tidy'},
    {w:[1,1,1,2,0],st:'stopped',x:3,ctx:[3,95],ev:'done'},
    {w:[1,1,1,2,0],st:'stopped',x:3,ctx:[3,95],ev:'verify',res:0}];
  const sm=[
    {w:[0,0,0,0,0],st:0,ctx:[3,0,1],ev:'',go:0,bl:0,ck:1},
    {w:[1,1,1,1,0],st:0,ctx:[3,40,1],ev:'build',go:0,bl:0,ck:1},
    {w:[1,1,1,1,0],st:1,ctx:[3,55,2],ev:'goto',go:1,bl:0,ck:3},
    {w:[1,1,1,2,0],st:1,ctx:[3,80,2],ev:'tidy',go:1,bl:0,ck:3},
    {w:[1,1,1,2,0],st:1,ctx:[3,85,2],ev:'refused',go:2,bl:1,ck:4},
    {w:[1,1,1,1,0],st:1,ctx:[3,92,2],ev:'repair',go:2,bl:1,ck:4},
    {w:[1,1,1,1,1],st:2,ctx:[3,96,3],ev:'goto',go:3,bl:1,ck:5},
    {w:[1,1,1,1,1],st:2,ctx:[3,96,3],ev:'verify',res:1,go:3,bl:1,ck:5}];
  window.SMGW={soft,sm,services:W5};
  let mode='sm';
  const SX=[-3,0,3],ZS=-1.45,ZW=1.55,GX=1.5,SVX=i=>-3.2+i*1.6,VER=[5.1,0,-.05],CX=-5.1;
  function draw(R,k,e){const P=R.P,narrow=R.W<520,D=mode==='sm'?sm:soft,S=D[k],Pv=D[Math.max(0,k-1)],close=mode==='sm'&&(k===4||k===5);R.grid(-6,6,-2.8,2.7,.5);
    const ink=P.ink,good=P.good,bad=P.bad;
    // the runbook: three states and the edges between them (StateM), or one loop with nothing to refuse a stop (soft plan)
    let ag;
    if(mode==='sm'){const nm=narrow?['solve','contract check','handoff']:['direct_solve','task_contract_check','handoff'];
      SX.forEach((x,i)=>{const on=S.st===i,seen=S.st>=i;R.box([x,0,ZS],[2.1,on?.2:.12,1],{fill:on?mix(P.paper,P.acc,.35):seen?mix(P.paper,P.soft,.6):P.paper,a:on?1:.75});
        if(!(close&&i===0))R.label([x,0,ZS+.5],nm[i],{mono:true,fs:12.5,dy:14,b:on,c:on?P.acc:P.mute})});
      [[-1.95,-1.05],[1.05,1.95]].forEach(([a,b])=>R.line([[a,.06,ZS],[b,.06,ZS]],{c:P.mute,w:1.6,head:7}));
      // where the agent stands: on its state; a goto carries it along an arc, a refused one bounces off the gate
      const from=SX[Pv.st],to=SX[S.st];
      if(S.ev==='refused'){const u=e<.5?e*2:2-e*2;ag=[lerp(SX[1],GX-.25,u),.42+.25*Math.sin(Math.PI*u),ZS]}
      else if(k>0&&S.st!==Pv.st){ag=R.arcPt([from,.42,ZS],[to,.42,ZS],.6,e);R.flowArc([from,.4,ZS],[to,.4,ZS],.6,{c:good,a:.9,r:.06})}
      else ag=[to,.42,ZS];
      // the exit gate: a glass plate across the edge to handoff, grey until it runs, red when it refuses, green when it passes
      const gc=k===4||k===5?bad:k>=6?good:P.mute,ga=k<=3?.55:1;
      R.glass([GX,0,ZS-.55],[0,0,1.1],[0,1.05,0],{c:gc,a:ga,nu:4,nv:4});
      R.label([GX,1.05,ZS],k===4?'✗ gate refuses':k>=6?'✓ gate passes':'exit gate',{mono:true,fs:12.5,b:k>=4,dy:-12,c:k===4||k===5?bad:k>=6?good:P.mute});
      if(k===4)R.glow([GX,.5,ZS],.9,{c:bad,a:.6*e})}
    else{R.box([0,0,ZS],[8.2,.14,1],{fill:S.st?mix(P.paper,bad,.12):P.paper});
      R.label([0,0,ZS+.5],S.st?'stopped: nothing re-checks':narrow?'one loop, plan as text':'one loop: the plan is text in the context',{mono:true,fs:12.5,dy:14,b:!!S.st,c:S.st?bad:P.mute});
      // where a gate would stand: nothing
      R.quad([[GX,.01,ZS-.55],[GX,.01,ZS+.55],[GX,1.05,ZS+.55],[GX,1.05,ZS-.55]],{ec:P.mute,dash:[4,4],a:.6});
      R.label([GX,1.05,ZS],'no gate',{mono:true,fs:12.5,dy:-12,c:P.mute});
      ag=[lerp(Pv.x,S.x,k?e:1),.42,ZS]}
    R.ball(ag,.2,{c:P.acc});R.glow(ag,.5,{c:P.acc,a:.35});R.label(ag,'agent',{mono:true,fs:12,al:'left',dx:13,dy:-13,c:P.acc,b:1,wide:1});
    // the live system: five services, dashed until built, green when up, red and low when down
    W5.forEach((n,i)=>{const v=S.w[i],x=SVX(i),was=Pv.w[i],h=v===1?.55:v===2?.18:0;
      if(v===0){R.quad([[x-.55,.01,ZW-.33],[x+.55,.01,ZW-.33],[x+.55,.01,ZW+.33],[x-.55,.01,ZW+.33]],{ec:P.mute,dash:[4,4],a:.7})}
      else{const hh=was===v||!k?h:lerp(was===1?.55:was===2?.18:0,h,e);R.box([x,0,ZW],[1.1,Math.max(.02,hh),.66],{fill:mix(P.paper,v===1?good:bad,v===1?.4:.5)});
        if(v===2)R.label([x,hh,ZW],'✗ down',{mono:true,fs:12,b:1,dy:-10,c:bad})}
      if(!close||i>=3)R.label([x,0,ZW+.33],n,{mono:true,fs:12,dy:14,c:v===2?bad:ink,a:v?1:.6,wide:1})});
    // the agent acting on the system (build, test, tidy) and the gate's host check (clone, push, curl from a fresh client)
    const top=i=>[SVX(i),.6,ZW];
    if(S.ev==='build')[0,1,2,3].forEach(i=>R.flowArc(ag,top(i),.5,{c:P.acc,a:.8,r:.06,n:6}));
    if(S.ev==='test')R.flowArc(ag,top(4),.6,{c:good,a:.9,r:.06});
    if(S.ev==='tidy')R.flowArc(ag,top(3),.6,{c:bad,a:.9,r:.06});
    if(S.ev==='repair')R.flowArc(ag,top(3),.6,{c:P.acc,a:.9,r:.06});
    if(mode==='sm'&&(k===4||k===6)){const g=[GX,1,ZS];[0,2,3,4].forEach(i=>R.flowArc(g,top(i),.45,{c:k===4?(i===3?bad:P.mute):good,a:k===4&&i!==3?.45:.9,r:.06,n:6}))}
    // the verifier: a fresh client runs clone, commit, push, curl once the agent has stopped
    const va=S.res!=null?(k===D.length-1?e:1):0;
    R.box(VER,[.8,.5,.6],{fill:mix(P.paper,P.c4,.3),a:Math.max(.25,va)});R.label([VER[0],.5,VER[2]],'verifier',{mono:true,fs:12,dy:-12,c:P.c4,a:Math.max(.35,va),wide:1});
    if(S.res!=null){[2,3,4].forEach(i=>R.flowArc([VER[0],.5,VER[2]],top(i),.5,{c:S.res?good:bad,a:va*.9,r:.06,n:6}));
      R.label([VER[0],.5,VER[2]],S.res?'PASS':'FAIL · score 0',{fs:15,b:1,dy:-34,c:S.res?good:bad,a:va})}
    // the context as a stack: the plan at the bottom, execution output piling on top, StateM's in_hook anchor last (most recent)
    if(close)return;
    const sc=1.9/100,pl=.16,ex=lerp(Pv.ctx[1],S.ctx[1],k?e:1)*sc;
    R.box([CX,0,0],[.8,pl,.8],{fill:mix(P.paper,P.acc,.55)});
    if(ex>.01)R.box([CX,pl,0],[.8,ex,.8],{fill:mix(P.paper,P.mute,.3),shadow:false});
    if(mode==='sm')R.box([CX,pl+ex,0],[.8,.14,.8],{fill:mix(P.paper,good,.6),shadow:false});
    R.label([CX,0,.4],'context',{mono:true,fs:12,dy:14,c:P.mute});
    R.label([CX-.4,pl/2,0],'plan',{mono:true,fs:12,al:'right',dx:-6,c:P.acc,grp:'ctx'});
    if(mode==='sm')R.label([CX-.4,pl+ex+.07,0],'state anchor',{mono:true,fs:12,al:'right',dx:-6,c:good,grp:'ctx'});
    else if(ex>.3)R.label([CX-.4,pl+ex,0],'output',{mono:true,fs:12,al:'right',dx:-6,c:P.mute,grp:'ctx'});
  }
  const full={cam:[.26,.8],bounds:[[-6.4,0,-2.2],[5.6,1.15,2.2]]};
  const st=S3.stage({id:'stg-gw',list:'sx-gw-sm',fig:'configure-git-webserver · illustrative',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,16,60],
    // the refused goto: the camera moves in on the gate and the service that is down
    view:k=>mode==='sm'&&(k===4||k===5)?{cam:[.42,.62],bounds:[[-1.2,0,-2.2],[4.4,1.3,2.2]]}:full});
  // the toggle swaps the step list and replays (the reader asked to see the other harness)
  const seg=document.getElementById('gwM');
  if(seg)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    mode=b.dataset.m;document.getElementById('sx-gw-sm').hidden=mode!=='sm';document.getElementById('sx-gw-soft').hidden=mode!=='soft';st.list('sx-gw-'+mode)}));
})();
