// ---- Scene: Fig. 1, one recorded run on the pipe (renderer v2). Run s1 (Haiku 4.5, our four in-process tools, a PreToolUse hook that allows the
// read-only tools, a PostToolUse hook and a can_use_tool callback): its 83 recorded wire lines grouped into seven stretches. Each stretch's flows
// are drawn from the lines it holds (FSDK.wire.s1_wire): green down stdin (your lines), purple up stdout (questions to your process),
// blue up stdout (messages relayed), orange over HTTPS (model calls). Dot counts follow the number of lines. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const F=window.FSDK,W=F.wire.s1_wire,s1=F.runs.s1_wire,r1=s1.results[0];
  // the seven stretches of the recording: [first line, last line + 1]
  const B=[[0,0],[0,10],[10,13],[13,20],[20,30],[30,80],[80,W.length]];
  const C=B.map(([a,b])=>{const s=W.slice(a,b),c=f=>s.filter(f).length;
    return {down:c(w=>w[1]==='in'),q:c(w=>w[1]==='out'&&w[2]==='control_request'),m:c(w=>w[1]==='out'&&w[2]!=='control_request'),
      hook:c(w=>w[3]==='hook_callback'),cut:c(w=>w[3]==='can_use_tool'),mcp:c(w=>w[3]==='mcp_message'),asst:c(w=>w[2]==='assistant'),t0:s.length?s[0][0]:0,t1:s.length?s[s.length-1][0]:0}});
  const T={down:W.filter(w=>w[1]==='in').length,up:W.filter(w=>w[1]==='out').length,q:W.filter(w=>w[1]==='out'&&w[2]==='control_request').length};
  // layout: your process (left), the Claude Code child (centre), the API (right); stdin and stdout as two lanes between the first two
  const XY=-3.7,XC=0,XA=3.4,PW=2.4,PD=1.8,YB=.12,BH=.7;
  const blk={you:{loop:[-.55,-.45,'query() loop'],hooks:[.55,-.45,'hooks'],cb:[-.55,.45,'can_use_tool'],tools:[.55,.45,'@tool server "repo"']},
             cc:{loop:[-.55,-.45,'agent loop'],perm:[.55,-.45,'permission check'],tools:[-.55,.45,'built-in tools'],sess:[.55,.45,'session file']}};
  const bp=(px,b)=>[px+b[0],YB+BH,b[1]];
  const ZI=-.3,ZO=.3,YL=.5,LX0=XY+PW/2+.02,LX1=XC-PW/2-.02;
  // which blocks a step is about (the rest recede)
  const ACT=[null,{you:['loop','tools'],cc:['loop']},{you:['loop'],cc:['loop'],api:1},{you:['hooks','tools'],cc:['perm']},{you:['hooks','cb','tools'],cc:['perm']},{you:['hooks','cb','tools','loop'],cc:['perm','loop'],api:1},{you:['loop'],cc:['loop','sess'],api:1}];
  function proc(R,px,set,act,title,sub,c,a0){const P=R.P;R.box([px,0,0],[PW,YB,PD],{a:a0,fill:mix(P.paper,c,.12)});
    Object.entries(set).forEach(([k,b])=>{const on=!act||act.includes(k),a=on?1:.22;R.box([px+b[0],YB,b[1]],[.9,BH,.62],{fill:mix(P.paper,c,on&&act?.42:.2),a:a*a0,lw:.8});
      if(on&&act)R.label(bp(px,b),b[2],{fs:12.5,b:1,dy:-12,c:mix(P.ink,c,.35)})});
    R.label([px,YB+BH+.1,-PD/2],title,{fs:14,b:1,c,dy:-16});R.label([px,0,PD/2],sub,{fs:12,c:P.mute,dy:16,wide:1})}
  function lane(z,x0,x1,c,a){const pts=[[x0,YL,z],[x1,YL,z]];return pts}
  function draw(R,k,e){const P=R.P,nar=R.W<520,act=ACT[k],c=C[k],fa=Math.min(1,e*1.6);R.grid(-5.4,4.8,-1.9,1.9,.5);
    proc(R,XY,blk.you,act&&act.you,'your process','Python SDK 0.2.163 · your code',P.good,1);
    proc(R,XC,blk.cc,act&&act.cc,'Claude Code (child)','2.1.286 · started by the SDK',P.acc,1);
    // the API with the model as a glass plate
    const aa=!act||act.api?1:.25,la=k===3||k===4?0:Math.max(.5,aa);R.box([XA,0,0],[1.5,YB,1.5],{a:aa,fill:mix(P.paper,P.c2,.12)});R.glass([XA-.55,YB,0],[1.1,0,0],[0,1.1,0],{c:P.c2,a:aa,nu:6,nv:6});
    R.label([XA,YB+1.15,0],'Anthropic API',{fs:14,b:1,c:P.c2,dy:-12,a:la});R.label([XA,0,.75],'Haiku 4.5',{fs:12,c:P.mute,dy:16,wide:1,a:la});
    // the pipe: two lanes, and HTTPS
    [[ZI,'stdin',P.good],[ZO,'stdout',P.acc]].forEach(([z,t,cl])=>{R.line([[LX0,YL,z],[LX1,YL,z]],{c:cl,w:2.2,a:.55});if(k===0)R.label([(LX0+LX1)/2,YL,z],t,{mono:true,fs:12,c:cl,dy:z<0?-12:14})});
    const HX0=XC+PW/2+.02,HX1=XA-.76;R.line([[HX0,.6,0],[HX1,.6,0]],{c:P.c2,w:2.2,a:.45});if(k===0)R.label([(HX0+HX1)/2,.6,0],'HTTPS',{mono:true,fs:12,c:P.c2,dy:-12});
    if(k===0){R.label([XC,YB+BH,-PD/2],'one child process per session',{fs:12.5,c:P.mute,dy:-40,wide:1});return}
    // flows: from a block of one process, along a lane, to a block of the other; n follows the stretch's line count
    const nn=v=>Math.max(3,Math.min(14,Math.round(3+v*.9)));
    const path=(from,z,to)=>[from,[from[0]>LX1?LX1:LX0,YL,z],[from[0]>LX1?LX0:LX1,YL,z],to];
    const yb=b=>bp(XY,blk.you[b]),cb=b=>bp(XC,blk.cc[b]);
    if(c.down){const tgt={1:'loop',3:'perm',4:'perm',5:'perm'}[k]||'loop',src=k===1?'tools':k===5?'cb':'hooks';
      R.flow(path(yb(src),ZI,cb(tgt)),{c:P.good,a:fa,r:.06,speed:1.3,n:nn(c.down)})}
    if(c.q){const src=k===1?'loop':'perm';const tg=k===1?['tools']:k===3?['hooks','tools']:k===4?['hooks','cb','tools']:['hooks','cb','tools'];
      tg.forEach((t,i)=>R.flow(path(cb(src),ZO+(i-1)*.07,yb(t)),{c:P.c4,a:fa,r:.06,speed:1.25,n:nn(c.q/tg.length)}))}
    if(c.m)R.flow(path(cb('loop'),ZO+.1,yb('loop')),{c:P.acc,a:fa*.85,r:.055,speed:1.1,n:nn(c.m)});
    if(c.asst){const a0=[HX0,.65,-.12],a1=[HX1,.65,-.12];R.flow([a0,a1],{c:P.c2,a:fa,r:.06,speed:1.2,n:4});R.flow([[HX1,.55,.12],[HX0,.55,.12]],{c:P.c2,a:fa,r:.06,speed:1.2,n:nn(c.asst)})}
    // what this stretch held, as counters by the lanes
    const sec=v=>Number(v).toFixed(v<10?2:1)+' s';
    if(!nar){if(c.down)R.label([(LX0+LX1)/2,YL,ZI],c.down+' down',{mono:true,fs:12.5,b:1,c:P.good,dy:-14,a:fa,grp:'ln'});
      if(c.q||c.m)R.label([(LX0+LX1)/2,YL,ZO],(c.q?c.q+' questions':'')+(c.q&&c.m?' + ':'')+(c.m?c.m+' messages':'')+' up',{mono:true,fs:12.5,b:1,c:c.q?P.c4:P.acc,dy:16,a:fa,grp:'ln'})}
    if(k<6&&!nar)R.label([XC,YB+BH,PD/2],sec(c.t0)+' to '+sec(c.t1),{mono:true,fs:12,c:P.mute,dy:34,a:fa,wide:1});
    if(k===6){R.label([XY,0,PD/2],'result: '+r1.subtype+' · $'+r1.cost.toFixed(4),{fs:13.5,b:1,c:P.good,dy:40,a:fa});
      R.label([XC,0,PD/2],nar?T.down+' down · '+T.up+' up':'in all: '+T.down+' lines down · '+T.up+' up · '+T.q+' questions',{mono:true,fs:12.5,b:1,c:P.ink,dy:40,a:fa})}
  }
  const full={cam:[.3,.55],bounds:[[-5,0,-1.1],[4.2,1.45,1.1]]},near={cam:[.4,.5],bounds:[[-5,0,-1],[1.3,1.3,1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · run s1 on the pipe, line by line',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:5200,draw,
    view:k=>k===3||k===4?near:k===2?{cam:[.25,.52],bounds:[[-2.5,0,-1],[4.2,1.45,1]]}:full});
})();
