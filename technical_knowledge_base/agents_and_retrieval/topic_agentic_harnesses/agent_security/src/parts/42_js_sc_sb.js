// ---- Scene: Fig. 3, the benign Seatbelt demonstration (section 6, renderer v2). Driven by HSEC.sandbox.cases, the five real runs of
// src/sec/sb_probe.py under sandbox-exec (6 Oct 2026): a benign probe opens a socket to a local listener and writes a file, with no profile,
// under (deny network*) and under the write profile. The sandbox is drawn as glass walls round the probe and its work directory; a refused
// operation stops at the wall. Step 4 shows what Claude Code's sandbox leaves outside (from its documentation, not measured here). ----
(function(){
  if(!document.getElementById('stg-sb'))return;const {at,mix}=S3;
  const cs=(window.HSEC&&HSEC.sandbox&&HSEC.sandbox.cases)||[];if(cs.length<5)return;
  const find=(op,prof)=>cs.find(c=>op.test(c.op)&&prof.test(c.profile))||{result:'?'};
  const short=c=>c.result.split(':')[0];
  const NET0=find(/connect/,/none/),NET1=find(/connect/,/deny network/),W0=find(/\/tmp/,/none/),W1=find(/\/tmp/,/subpath/),WIN=find(/inside the work dir/,/subpath/);
  const PR=[-1.3,0,-.3],WK=[-1.3,0,1.35],LS=[2.5,0,-1.05],TM=[2.5,0,1.05],X0=-2.55,X1=.55,Z0=-1.6,Z1=2.25,H=1.15;
  const OUT=[['file-edit tools',-2.05],['MCP servers',-.85],['hooks',.35]];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-3.6,4.2,-3.8,2.8,.5);
    // the probe and its work directory
    R.box(PR,[.95,.6,.85],{fill:mix(P.paper,P.c2,.25)});R.label([PR[0],.6,PR[2]],'benign probe',{fs:12.5,b:1,c:P.c2,dy:-11});
    R.box(WK,[.95,.32,.7],{fill:mix(P.paper,P.good,.2),a:k===2?1:.6});R.label([WK[0]-.55,.15,WK[2]],'work dir',{al:'right',dx:-6,fs:12,a:k===2?1:.7});
    // the two targets outside: a local listener (the only bytes ever sent: the marker /sandbox-demo-ping) and /tmp
    R.box(LS,[.95,.5,.75],{fill:P.paper,a:k===2||k===3?.5:1});if(!(nar&&k===2))R.label([LS[0]+.55,.25,LS[2]],'listener 127.0.0.1',{al:'left',dx:6,fs:12,a:k===2||k===3?.6:1});
    R.box(TM,[.95,.4,.75],{fill:P.paper,a:k===1||k===3?.5:1});R.label([TM[0]+.55,.2,TM[2]],'/tmp',{al:'left',dx:6,fs:12,mono:true,a:k===1||k===3?.6:1});
    // the sandbox walls: from step 2 on; a profile is written over the operation, not over the command
    const wa=at(k,e,1),hot=k===1||k===2?1:.45;
    if(wa>0){const c=P.c1,o={c,a:wa*hot,nu:6,nv:3,th:.03};R.glass([X0,0,Z0],[X1-X0,0,0],[0,H,0],o);R.glass([X0,0,Z0],[0,0,Z1-Z0],[0,H,0],o);
      R.glass([X1,0,Z0],[0,0,Z1-Z0],[0,H,0],o);R.glass([X0,0,Z1],[X1-X0,0,0],[0,H,0],{c,a:wa*hot*.6,nu:6,nv:3,th:.03});
      R.label([X1+.05,H,Z0],k===1?'profile: (deny network*)':k===2?'profile: writes only in WORK':"Claude Code: shell commands only",{al:'left',dx:6,fs:12.5,b:1,mono:k<3,c,dy:-6,a:wa})}
    const from=[PR[0]+.5,.4,PR[2]];
    function op(to,ok,res,a,lab){if(a<=.01)return;
      if(ok){R.flowArc(from,to,.3,{c:P.good,r:.06,n:7,a});R.label(to,res,{mono:true,fs:12,b:1,c:P.good,dy:-24,a})}
      else{const t=(X1-.06-from[0])/(to[0]-from[0]),end=[X1-.06,from[1]+(to[1]-from[1])*t,from[2]+(to[2]-from[2])*t];
        R.flow([from,end],{c:P.bad,r:.06,n:5,a});R.glow(end,.3,{c:P.bad,a});R.label(end,res,{mono:true,fs:12,b:1,c:P.bad,dy:-22,al:'left',dx:6,a,grp:lab?'res':undefined})}}
    // 1. no profile: both land
    if(k===0){op([LS[0]-.5,.4,LS[2]],true,short(NET0),1);op([TM[0]-.5,.3,TM[2]],true,short(W0),1)}
    // 2. (deny network*): the socket is refused at the wall
    if(k===1)op([LS[0]-.5,.4,LS[2]],false,short(NET1),e);
    // 3. the write profile: /tmp refused, the work directory allowed
    if(k===2){op([TM[0]-.5,.3,TM[2]],false,short(W1),e);R.flowArc([PR[0],.5,PR[2]+.45],[WK[0],.35,WK[2]-.2],.25,{c:P.good,r:.06,n:5,a:e});R.label([WK[0],.32,WK[2]],short(WIN),{mono:true,fs:12,b:1,c:P.good,dy:-14,a:e})}
    // 4. what Claude Code's sandbox does not wrap: it covers shell commands only, and is off by default
    const oa=at(k,e,3);
    if(oa>0){OUT.forEach(([t,x])=>{R.box([x,0,-3.15],[1.0,.45,.6],{fill:mix(P.paper,P.c5,.3),a:oa});R.label([x,.45,-3.15],t,{fs:12,b:1,dy:-11,a:oa,c:P.c5})});}
  }
  const full={cam:[.35,.72],bounds:[[-3.0,0,-3.5],[3.9,1.2,2.4]]};
  S3.stage({id:'stg-sb',list:'sx-sb',fig:'Fig. 3 · a benign probe, with and without a Seatbelt profile',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    margin:w=>w<520?[22,10,14,10]:[30,16,16,16]});
})();
