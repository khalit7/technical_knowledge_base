// ---- Scene: Fig. 1, one run as one trace, and where its spans go (renderer v2). The local run of the running example (FOBS.run: 8 model
// calls with their real durations, prompt tokens and the tools they asked for): the root span, the chat spans (length = real seconds on the
// shared local server, height = prompt tokens), the tool spans (milliseconds, drawn at a minimum width), call 4's attributes up close, then
// the exporter, the collector (a glass gate), the backend (Langfuse) and an evaluator writing a score back. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  const F=window.FOBS,run=F.run,sc0=F.scores.runs.find(r=>r.key==='manual').scores;
  // the trace laid out on a time axis: x from X0, 0.05 world units a second, minimum widths so tool spans stay visible
  const X0=-6.2,U=.05,ZR=.62,ZC=-.25,GAP=.025,maxIn=Math.max(...run.map(c=>c.in));
  const ops=[];let x=X0;
  run.forEach(c=>{const w=Math.max(.1,c.secs*U);ops.push({k:'chat',c,x0:x,x1:x+w,h:.18+.72*c.in/maxIn});x+=w+GAP;
    c.tools.forEach(t=>{ops.push({k:'tool',name:t[0],from:ops.length-1,x0:x,x1:x+.08,h:.12});x+=.08+GAP})});
  const XE=x-GAP,c4=ops.find(o=>o.k==='chat'&&o.c.call===4),mid=o=>(o.x0+o.x1)/2;
  // the pipeline to the right of the app
  const XC=1.6,XB=3.4,XV=5.3,YF=.45;
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-6.6,6,-1.8,1.8,.5);
    const tr=k>=4?.35:1; // the trace recedes once the steps are about where it goes
    // the app platform that holds the trace
    {const x0=X0-.25,x1=XE+.25,z0=-1.15,z1=.85;R.quad([[x0,.01,z0],[x1,.01,z0],[x1,.01,z1],[x0,.01,z1]],{fill:mix(P.paper,P.acc,.08),dz:1e4})} // the floor of the app: drawn first, under everything
    R.label([X0-.1,.05,-1.1],'your app + SDK',{al:'left',fs:13,b:1,c:P.acc,dy:-12,a:k>=4?1:0});
    // 1. the root span
    R.box([(X0+XE)/2,.05,ZR],[XE-X0,.14,.34],{fill:mix(P.paper,P.c5,.55),a:tr});
    R.label([X0,.05,ZR+.17],'invoke_agent textstats-fixer (root)',{al:'left',fs:12.5,b:1,mono:true,c:mix(P.ink,P.c5,.4),dy:14,a:k===3?0:Math.max(.5,tr)});
    // 2. the chat spans, 3. the tool spans; parent links back to the root
    ops.forEach((o,i)=>{const isC=o.k==='chat',show=isC?(k===0?0:k===1?e:1):(k<2?0:k===2?e:1);if(show<=.01)return;
      const focus=k===3?(o===c4?1:.22):tr,a=show*focus;
      R.box([mid(o),.05,ZC],[o.x1-o.x0,o.h,.42],{fill:mix(P.paper,isC?P.c1:P.c3,isC?.5:.6),a,lw:.7});
      R.line([[mid(o),.05,ZC+.21],[mid(o),.12,ZR-.17]],{c:P.line,w:1,a:a*.7})});
    if(k===1){const L=(o,t)=>R.label([mid(o),o.h+.05,ZC],t,{mono:true,fs:12,c:P.c1,dy:-10,a:fa});
      [1,4,8].forEach(n=>{const o=ops.find(p=>p.k==='chat'&&p.c.call===n);L(o,'call '+n+(n===4?' · 78 s':n===1?' · '+o.c.in+' tok':n===8?' · '+o.c.in+' tok':''))})}
    if(k===2){ops.forEach(o=>{if(o.k!=='tool')return;const p=ops[o.from];R.flowArc([mid(p),p.h+.1,ZC],[mid(o),o.h+.1,ZC],.18,{c:P.c3,a:fa,r:.045,speed:.8,n:3})});
      const t1=ops.find(o=>o.k==='tool'),tl=ops.filter(o=>o.k==='tool').pop();
      R.label([mid(t1),.17,ZC],'execute_tool '+t1.name,{mono:true,fs:12,c:P.c3,dy:-30,al:'left',a:fa})}
    // 4. call 4 up close: its attributes, and its tokens as bars on a plinth
    if(k===3){const cx=mid(c4)-.45,gz=ZR+.75,hs=v=>v/maxIn*1.1;
      R.box([cx+.37,.05,gz],[1.9,.05,.36],{a:e,shadow:false});
      [['prompt',c4.c.in,P.c1],['cached',c4.c.cached,P.c6],['output',c4.c.out,P.c3]].forEach(([n,v,cl],i)=>{const bx=cx+i*.62-.25;
        R.box([bx,.1,gz],[.3,hs(v)*e,.24],{fill:mix(P.paper,cl,.65),a:e,lw:.7});R.label([bx,.1+hs(v)*e,gz],n+' '+v,{mono:true,fs:12,b:1,c:cl,dy:-10,a:e})});
      R.glass([mid(c4)-.2,c4.h+.18,ZC],[1.9,0,0],[0,.8,0],{c:P.c1,a:e*.9,nu:5,nv:4});
      const lx=mid(c4)-.12;[['gen_ai.operation.name = chat',.82],['gen_ai.request.model = Qwen3-4B',.6],['duration '+c4.c.secs.toFixed(1)+' s',.38]].forEach(([t,y])=>R.label([lx,c4.h+.18+y-.18,ZC],t,{mono:true,fs:12,al:'left',c:P.ink,a:e}))}
    // 5 to 8: the path the spans take
    const pa=k>=4?1:.18;
    const la=k>=4?1:0;
    R.box([XC,0,0],[.5,.05,1.7],{a:pa,shadow:false});R.glass([XC,.05,-.8],[0,0,1.6],[0,1.2,0],{c:P.c6,a:pa*(k===5?1:.75),nu:5,nv:4});
    R.label([XC,1.25,-.8],'collector',{fs:13,b:1,c:P.c6,dy:-12,a:la});
    for(let i=0;i<3;i++)R.box([XB,i*.36,0],[1.3,.3,1.3],{fill:mix(P.paper,P.c4,.25+.12*i),a:pa,lw:.8,shadow:i===0});
    R.label([XB,1.08,-.65],'backend',{fs:13,b:1,c:P.c4,dy:-12,a:la});if(!nar)R.label([XB,0,.65],'Langfuse',{fs:12,c:P.mute,dy:14,a:la,wide:1});
    R.box([XV,0,0],[1,.65,1],{fill:mix(P.paper,P.c5,.35),a:k>=7?1:.18,lw:.8});R.label([XV,.65,-.5],'evaluator',{fs:13,b:1,c:mix(P.ink,P.c5,.4),dy:-12,a:la});
    if(k>=4){R.flow([[XE+.05,YF,ZC],[XC-.05,YF,ZC*.4]],{c:P.c1,a:k===4?fa:.55,r:.065,speed:1.2,n:6});
      if(k===4)R.label([(XE+XC)/2,YF,ZC*.7],'OTLP',{mono:true,fs:12.5,b:1,c:P.c1,dy:-14,a:fa})}
    if(k>=5){R.flow([[XC+.05,YF,0],[XB-.55,YF,0]],{c:P.c1,a:k===5?fa:.55,r:.065,speed:1.2,n:5});
      if(k===5){R.label([XC,.05,.7],'sample · redact',{mono:true,fs:12.5,b:1,c:P.c6,dy:16,a:fa})}}
    if(k===6){R.label([XB,0,.65],'$0 · no price for a local model',{fs:12.5,b:1,c:P.c4,dy:34,a:fa})}
    if(k>=7){R.flowArc([XB+.4,1.05,-.15],[XV-.3,.65,-.15],.45,{c:P.c4,a:fa,r:.06,speed:1.1,n:6});
      R.flowArc([XV-.3,.65,.15],[XB+.4,1.05,.15],.7,{c:P.c5,a:fa,r:.07,speed:.9,n:5});
      R.box([XB+.35,1.08,.35],[.24,.34*e,.24],{fill:mix(P.paper,P.c5,.7),a:fa});
      R.label([XB+.35,1.08+.34*e,.35],'score tests_pass = '+sc0.tests_pass,{mono:true,fs:12.5,b:1,c:mix(P.ink,P.c5,.45),dy:-14,a:fa})}
  }
  // the wide steps turn the scene a little more on wide cards, so the pipeline fills more of them; phones keep the flatter angle (labels)
  const full={cam:[.45,.66],bounds:[[-6.3,0,-1.2],[5.9,1.5,1.2]]},fullN={cam:[.3,.66],bounds:full.bounds};
  const trace={cam:[.14,.62],bounds:[[-6.3,0,-.9],[XE+.2,1.05,1.2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the local run as one trace, and where it goes',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1400,hold:5200,draw,
    view:k=>k<=2?trace:k===3?{cam:[.2,.5],bounds:[[c4.x0-.4,0,-.6],[c4.x1+.3,1.6,1.7]]}:innerWidth<520?fullN:full});
})();
