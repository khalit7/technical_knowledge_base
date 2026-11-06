// ---- Scene: Fig. 3, the layers of control around a tool call (renderer v2). A map, not a measurement: the gate in front of the call,
// the sandbox around what runs, the disposable machine around both, the one path out with the credentials added outside, then the lethal trifecta.
// Each step brings its layer to full strength; the step list sx-safe (20_read_c.html) names the owner sections. ----
(function(){
  if(!document.getElementById('stg-safe'))return;const {at,mix}=S3;
  const LOOP=[-3.1,0,0],GATE=-1.75,TOOL=[.2,0,.2],REPO=[.2,0,-1.05],PROXY=[2.65,0,-1.2],NET=[4.2,0,-1.2],KEY=[3.9,0,.55],WEB=[-2.9,0,-2.2];
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4.4,5,-3.2,2.4,.5);
    const S=s=>k===s?1:k>s?.4:.15;
    // the agent loop and its tool call
    R.box(LOOP,[1.2,.5,1],{fill:mix(P.paper,P.acc,.35)});R.label(top(LOOP,.5),'agent loop',{fs:13,b:1,c:P.acc,dy:-11});
    // 1. the gate: allow, ask, deny before anything starts
    const ga=S(0);R.glass([GATE,0,-.8],[0,0,1.6],[0,1.1,0],{c:P.c5,a:ga,nu:4,nv:4});R.label([GATE,1.1,0],'permission gate',{fs:12.5,b:k===0,c:P.c5,dy:-10,a:Math.max(.4,ga),wide:k!==0});
    if(k===0){R.flowArc(top(LOOP,.35),[GATE-.05,.55,0],.3,{c:P.c2,a:fa,r:.07,n:6,speed:1.1});
      [['allow',P.good,.95],['ask a person',P.c5,.6],['deny',P.bad,.25]].forEach(([t,c,y])=>R.label([GATE+.15,y,.8],t,{al:'left',dx:6,fs:12.5,b:1,c,a:fa,wide:1}))}
    else R.flowArc(top(LOOP,.35),top(TOOL,.3),.45,{c:P.c2,a:k===4?.25:.45,r:.06,n:6,speed:1.1});
    // the tool and the repository it works on
    R.box(TOOL,[.9,.4,.7],{fill:mix(P.paper,P.c3,.3)});R.label(top(TOOL,.4),'tool runs',{fs:12.5,c:P.c3,dy:-10,wide:k!==0});
    R.box(REPO,[1.1,.3,.6],{fill:mix(P.paper,P.ink,.1),a:k===4?1:.8});R.label(top(REPO,.3),k===4?'private data: repo, keys':'repo',{fs:12,b:k===4,c:k===4?P.c4:P.mute,dy:-9,wide:k!==4});
    // 2. the sandbox: an OS boundary around what does run
    const sa=k===1?fa:k>1?.45:0;if(sa>0){R.box([TOOL[0],0,TOOL[2]-.35],[1.7,1,2.2],{fill:mix(P.paper,P.c6,.45),a:sa,fa:.13,shadow:false,ec:P.c6,lw:1.1});
      R.label([TOOL[0]-.85,1,TOOL[2]+.75],'sandbox',{al:'left',fs:12.5,b:k===1,c:P.c6,dy:-9,a:Math.max(.5,sa),wide:k!==1});
      if(k===1){R.label([TOOL[0]+.9,.75,TOOL[2]+.4],'writes: the work folder only',{al:'left',dx:8,fs:12,c:P.c6,a:fa,wide:1});R.label([TOOL[0]+.9,.45,TOOL[2]+.4],'network: allowed hosts only',{al:'left',dx:8,fs:12,c:P.c6,a:fa,wide:1})}}
    // 3. a machine you can throw away: the blast radius is the box
    const ma=k===2?fa:k>2?.4:0;if(ma>0){R.box([.45,0,-.45],[3.6,1.45,3.3],{fill:mix(P.paper,P.c4,.4),a:ma,fa:.09,shadow:false,ec:P.c4,lw:1.2});
      R.label([-1.35,1.45,-2.1],'disposable machine: container or cloud VM',{al:'left',fs:12.5,b:k===2,c:P.c4,dy:-10,a:Math.max(.5,ma)})}
    // 4. egress and secrets: one path out through a proxy, credentials added outside the machine
    const ea=k===3?fa:k===4?1:0;if(ea>0){R.box(PROXY,[.6,.6,.6],{fill:mix(P.paper,P.c5,.5),a:ea});R.label(top(PROXY,.6),'egress proxy',{fs:12.5,b:k===3,c:P.c5,dy:-10,a:ea});
      R.box(NET,[.8,.35,.8],{fill:mix(P.paper,P.ink,.06),a:ea});R.label(top(NET,.35),'allowed hosts',{fs:12,c:P.mute,dy:-9,a:ea});
      const cut=k===4?Math.min(1,Math.max(0,e*2-.6)):0;
      R.flowArc(top(TOOL,.3),top(PROXY,.35),.35,{c:P.c2,a:ea*(1-cut),r:.06,n:6,speed:1});R.flowArc(top(PROXY,.35),top(NET,.25),.25,{c:k===4?P.bad:P.c2,a:ea*(1-cut),r:.06,n:5,speed:1});
      if(k===3){R.box(KEY,[.55,.3,.45],{fill:mix(P.paper,P.good,.45),a:ea});R.label(top(KEY,.3),'credentials (never in the box)',{fs:12,c:P.good,dy:-9,a:ea});
        R.flowArc(top(KEY,.25),top(PROXY,.4),.3,{c:P.good,a:ea,r:.055,n:4,speed:.9})}
      if(cut>0){R.line([[PROXY[0]+.45,.15,PROXY[2]-.3],[PROXY[0]+.95,.75,PROXY[2]+.3]],{c:P.bad,w:3,a:cut,top:1});R.line([[PROXY[0]+.45,.75,PROXY[2]+.3],[PROXY[0]+.95,.15,PROXY[2]-.3]],{c:P.bad,w:3,a:cut,top:1});
        R.label([NET[0],1.2,NET[2]],'remove one leg: no way out',{fs:12.5,b:1,c:P.bad,dy:-16,a:cut})}}
    // 5. the lethal trifecta: untrusted content comes in, private data is inside, a way out is open
    if(k===4){R.box(WEB,[.9,.35,.6],{fill:mix(P.paper,P.c2,.3),a:fa});R.label(top(WEB,.35),'untrusted content: a page, an issue',{fs:12,b:1,c:P.c2,dy:-9,a:fa});
      R.flowArc(top(WEB,.3),top(LOOP,.4),.4,{c:P.bad,a:fa,r:.06,n:6,speed:1});
      if(!nar)R.label([PROXY[0],.05,PROXY[2]+.55],'a way out',{fs:12,b:1,c:P.c5,dy:12,a:fa})}
  }
  const full={cam:[.25,.72],bounds:[[-3.8,0,-3],[4.7,1.5,1.6]]};
  S3.stage({id:'stg-safe',list:'sx-safe',fig:'Fig. 3 · layers of control around a tool call',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1400,hold:5000,draw,
    view:k=>k<=1?{cam:[.3,.6],bounds:[[-3.8,0,-1.8],[2.4,1.3,1.5]]}:full});
})();
