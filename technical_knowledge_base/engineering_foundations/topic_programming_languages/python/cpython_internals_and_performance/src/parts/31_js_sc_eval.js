// ---- Scene, Fig. 3 (section 1): the evaluation loop running total(xs): its frame, its value stack and the six real loop instructions (renderer v2, 2026-11-07) ----
// The instruction names are the real dis listings (PA.dis, from i1_dis.txt on 3.14.8): the loop body is the rows from FOR_ITER (label L1) to
// JUMP_BACKWARD. Values are those of the fourth pass of the script's warm-up call total(list(range(1000))): s = 0 + 1 + 2 = 3, the next item 3.
// Stack effects as dis.stack_effect reports them (src/pa/outputs/stack_effects.txt). Steps 6 and 7 swap in listings 2 and 3.
(function(){
  if(!document.getElementById('stg-eval')||!window.S3||!window.PA||!PA.dis)return;const {at,off,lerp,lerp3,mix,cl}=S3;
  const i0=PA.dis[0].ins.findIndex(r=>r[1]==='L1:'),LOOP=PA.dis.map(b=>b.ins.slice(i0,i0+6));
  const arg=r=>{const m=(r[3]||'').match(/\(([^)]*)\)/);return m&&!/^to /.test(m[1])?' ('+m[1]+')':''};
  const TX=-2.5,TZ=k=>-1.5+k*.6,SX=.45,SZ={xs:-1.05,s:0,x:1.05},KX=2.3,KH=.42,KY=n=>.1+n*(KH+.05);
  // the frame's locals and the stack before each step (fourth pass of the warm-up call)
  function draw(R,k,e){const P=R.P;R.grid(-4.8,4.6,-2.4,2.4,.5);
    const back=k>=5?(k===5?1-.7*e:.3):1;                                          // steps 6 and 7 are about the instructions: the data recedes
    // the code: the loop body's six instructions, the current one lit, an instruction pointer beside it
    const ip=k===0?(e>.6?0:-1):k===1?(e<.5?0:1):k===2?2:k===3?3:k===4?(e<.55?4:e<.8?5:0):-1;
    const lis=k<5?LOOP[0]:k===5?(e<.45?LOOP[0]:LOOP[1]):(e<.5?LOOP[1]:LOOP[2]);
    R.glass([TX-1.25,.005,TZ(0)-.4],[2.5,0,0],[0,0,TZ(5)-TZ(0)+.8],{c:P.c1,nu:5,nv:6,a:.8,th:.02});
    lis.forEach((r,j)=>{const prev=k===5?LOOP[0][j]:k===6?LOOP[1][j]:null,ch=prev&&prev[2]!==r[2],fresh=ch&&(k===5?e>=.45:e>=.5);
      const guard=k===6&&j===3&&e<.5;                                             // the int guard failing on a float
      let fill=j===ip?mix(P.paper,P.acc,.55):P.paper;if(fresh)fill=mix(P.paper,k===6?P.c4:P.good,.55);if(guard)fill=mix(P.paper,P.bad,.35+.4*Math.sin(Math.PI*cl(e*2,0,1)));
      const lift=fresh?.08*Math.sin(Math.PI*cl((k===5?(e-.45)/.55:(e-.5)/.5),0,1)):0;
      R.box([TX,lift,TZ(j)],[2.1,.14,.42],{fill,shadow:false});
      R.label([TX-1.1,.07,TZ(j)],r[2]+arg(r),{al:'right',dx:-8,mono:true,fs:12,b:j===ip||fresh||guard,c:guard?P.bad:fresh?(k===6?P.c4:P.good):j===ip?P.ink:P.mute,grp:'ins'})});
    R.label([TX-1.25,0,TZ(0)-.4],k>=5?'the loop, rewritten in place':'bytecode: the loop body',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12,a:1,wide:1});
    if(ip>=0){const p=[TX+1.25,.2,TZ(ip)];R.glow(p,.35,{c:P.acc,a:.8});R.ball(p,.12,{c:P.acc})}
    if(k===4&&e>.75){const a=cl((e-.75)*4,0,1);R.flowArc([TX+1.15,.16,TZ(5)],[TX+1.15,.16,TZ(0)],.6,{c:P.acc,a:a*.9,r:.06,n:7,speed:1.4})}
    if(R.W<520){const t=k<5?(ip>=0?lis[ip][2]+arg(lis[ip]):''):k===5?'specialised after 1,000 ints':'re-specialised for floats';R.label([0,2.05,0],t,{mono:true,fs:12.5,b:1})}
    // the frame: three local slots with their values
    R.glass([SX-.75,.005,-1.7],[1.5,0,0],[0,0,3.4],{c:P.c3,nu:3,nv:3,a:.75*back,th:.02});
    R.label([SX,0,1.7],'frame of total(xs)',{fs:12.5,b:1,c:P.c3,dy:14,a:back<.5?0:back,wide:1});
    const loc={xs:'list',s:k<4||(k===4&&e<.5)?'3':'6',x:k===0||(k===1&&e<.75)?'2':'3'};
    Object.entries(SZ).forEach(([n,z])=>{R.box([SX,0,z],[1.0,.1,.7],{fill:mix(P.paper,P.c3,.25),a:back,shadow:false});
      R.label([SX-.5,.05,z],n,{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c3,a:back<.5?0:back});
      const out=(n==='x'&&k===1&&e>=.5&&e<.75)||(n==='s'&&k===4&&e<.5&&e>.3);
      if(n==='xs')R.box([SX,.1,z],[.6,.3,.45],{fill:mix(P.paper,P.c6,.35),a:back});else if(!out)R.box([SX,.1,z],[.45,.45,.45],{fill:mix(P.paper,P.c2,.55),a:back});
      if(!out)R.label([SX,n==='xs'?.4:.55,z],loc[n],{mono:true,fs:12.5,b:1,dy:-10,a:back<.5?0:back})});
    // the value stack: the iterator at the bottom, then what the instructions push
    R.box([KX,0,0],[1.3,.1,1.0],{fill:mix(P.paper,P.ink,.06),a:back});
    R.label([KX,0,.5],'value stack',{fs:12.5,b:1,dy:14,a:back<.5?0:back});
    const cube=(n,v,a,hot)=>{R.box([KX,KY(n),0],[.8,KH,.6],{fill:n===0?mix(P.paper,P.c6,.35):mix(P.paper,P.c2,hot?.8:.55),a:a*back,shadow:false});
      R.label([KX,KY(n)+KH/2,.3],v,{mono:true,fs:12.5,b:1,a:back<.5?0:a*back})};
    cube(0,'iterator',1);
    // a value travelling from p to q on an arc, with a stream of dots along the path
    const mv=(p,q,u,v,lab)=>{if(u<=0||u>=1)return;const t=u;R.flowArc(p,q,.55,{c:P.c2,a:back*Math.sin(Math.PI*t)*.9,r:.06,n:6,speed:1.6});
      const c=R.arcPt(p,q,.55,S3.ease(t));R.box([c[0],c[1]-.2,c[2]],[.42,.42,.42],{fill:mix(P.paper,P.c2,.8),a:back,shadow:false});R.label([c[0],c[1],c[2]+.21],v,{mono:true,fs:12.5,b:1,a:back})};
    const top=n=>[KX,KY(n)+KH/2,0],slot=n=>[SX,.33,SZ[n]];
    if(k===1){if(e<.5)mv([KX,KY(0)+KH,0],top(1),e*2,0,'3');else if(e<.75)mv(top(1),slot('x'),(e-.5)*4,0,'3')}
    if(k===2){mv(slot('s'),top(1),e*1.6,0,'3');mv(slot('x'),top(2),(e-.35)*1.6,0,'3');if(e>=.625)cube(1,'3',1);if(e>=.975)cube(2,'3',1)}
    if(k===3){if(e<.5){const t=S3.ease(e*2);R.box([KX,lerp(KY(2),KY(1),t),0],[.8,KH,.6],{fill:mix(P.paper,P.c2,.55),a:(1-t)*back,shadow:false});cube(1,'3',1-t)}
      else{cube(1,'6',cl((e-.5)*3,0,1),true);R.glow(top(1),.6,{c:P.c2,a:back*(1-e)*1.4})}}
    if(k===4&&e<.5)mv(top(1),slot('s'),e*2,0,'6');
  }
  const full={cam:[-.12,.66],bounds:[[-3.7,0,-1.9],[3.0,1.5,2.0]]};
  S3.stage({id:'stg-eval',list:'sx-eval',fig:'Fig. 3 · total(xs) in the evaluation loop',cam:full.cam,bounds:full.bounds,aspect:.46,dur:2400,hold:4600,draw,
    margin:w=>w<520?[34,10,16,10]:[20,14,22,250],
    view:k=>k>=5?{cam:[-.2,.72],bounds:[[-3.6,0,-1.95],[-.6,.4,1.95]]}:full});
})();
