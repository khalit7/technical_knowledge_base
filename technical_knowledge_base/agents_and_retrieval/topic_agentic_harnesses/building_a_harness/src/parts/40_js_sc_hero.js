// ---- Scene: Fig. 1, one turn of the loop, then the run around it (renderer v2). Data: HB.tok, the recorded run careful_s1 rendered through the
// local model's own template and tokenizer: the context column is that run's prompt, token by token, coloured by kind (system and markup, tool
// definitions, task, model replies, tool results) and cut where each of its five calls ended (486, 865, 926, 1,252, 1,531 tokens). ----
(function(){
  if(!document.getElementById('stg-hero')||!window.HB||!HB.tok)return;const {at,mix,lerp}=S3;
  const T=HB.tok,reg=T.reg,cuts=T.cuts,N=cuts[cuts.length-1];
  // runs of one kind, in prompt order: [kind, first token, last token + 1]
  const runs=[];for(let i=0;i<N;i++){const r=runs[runs.length-1];if(r&&r[0]===reg[i])r[2]=i+1;else runs.push([reg[i],i,i+1])}
  const cnt=(c,k)=>{let n=0;for(let i=0;i<c;i++)if(reg[i]===k)n++;return n};
  const CX=-3.45,CW=1.25,HS=3.0/N,MX=-1.45,BX=-.1,PX=1.05,GX=1.95,EX=3.35,VZ=-2.05;
  const fmt=n=>Math.round(n).toLocaleString('en-GB');
  function colOf(P,k){return {S:mix(P.paper,P.mute,.45),T:P.c5,U:P.c1,G:P.c3,R:P.c4}[k]}
  // the prompt column up to token c (fractional allowed)
  function column(R,c,a){const P=R.P;
    R.box([CX,0,0],[CW,N*HS,CW],{a:.1*a,shadow:false,fa:.05});            // the full run's prompt, faint: the frame the column fills
    runs.forEach(([k,s,e])=>{if(s>=c)return;const e2=Math.min(e,c);R.box([CX,s*HS,0],[CW,Math.max(.006,(e2-s)*HS),CW],{fill:colOf(P,k),a,shadow:s===0,lw:.6})})}
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4.6,4.6,-2.4,1.6,.5);
    const dim=k===1||k===2?.08:.22,on=s=>s.includes(k)?1:dim;
    // the prompt this call reads
    const c=k<5?cuts[0]:k===5?lerp(cuts[0],cuts[1],e):(()=>{const t=e*3,j=Math.min(2,Math.floor(t));return lerp(cuts[1+j],cuts[2+j],Math.min(1,t-j))})();
    column(R,c,on([0,5,6]));
    if(k<6&&!nar)R.label([CX,N*HS,-CW/2],'by call 5: '+fmt(N),{fs:12,mono:true,c:P.mute,dy:-10,a:k>=1&&k<=4?0:.8});
    const top=c*HS;
    R.label([CX,top,-CW/2],k>=5?'prompt · '+fmt(c)+' tokens':'call 1 · '+fmt(cuts[0])+' tokens',{fs:13,b:1,dy:-14,c:P.ink,a:k>=1&&k<=4?0:on([0,5,6])});
    if(k===0)R.label([CX,0,CW/2],nar?'tools '+cnt(cuts[0],'T')+' of '+fmt(cuts[0]):'tool definitions '+cnt(cuts[0],'T')+' · system and markup '+cnt(cuts[0],'S')+' · task '+cnt(cuts[0],'U'),{fs:12,mono:true,dy:20,c:P.c5,a:fa});
    // the model, as a glass plate the prompt passes through
    const ma=on([0,1,6]);R.glass([MX,.25,-.75],[0,0,1.5],[0,1.5,0],{c:P.c2,a:ma,nu:6,nv:6});R.label([MX,1.75,0],'model',{fs:14,b:1,c:P.c2,dy:-10,a:Math.max(.45,ma)});
    // the action boundary: where the model's turn must end
    const ba=k===2?1:on([1,2]);R.glass([BX,.25,-.65],[0,0,1.3],[0,1.25,0],{c:k===2?P.acc:mix(P.paper,P.acc,.5),a:ba,nu:1,nv:8});
    R.label([BX,1.5,0],'<|im_end|>',{mono:true,fs:12.5,b:k===2,c:P.acc,dy:-10,a:Math.max(.4,ba)});
    // the harness: parser, gate, the workspace with its two tools, the verifier
    const pa=on([3]);R.box([PX,0,0],[.75,.55,.9],{fill:mix(P.paper,P.c1,.25),a:pa});R.label([PX,.55,.45],'parse',{fs:12.5,b:1,dy:-12,c:P.ink,a:Math.max(.45,pa)});
    const ga=on([4]);R.glass([GX,.05,-.75],[0,0,1.5],[0,1.05,0],{c:P.good,a:ga,nu:4,nv:4});R.label([GX,1.1,0],'gate',{fs:12.5,b:1,dy:-10,c:P.good,a:Math.max(.45,ga)});
    const ea=on([4,5]);R.box([EX,0,0],[1.7,.9,1.9],{fa:.06,a:ea*.9,shadow:false,fill:mix(P.paper,P.c6,.2)});
    [[-.45,'read_file core.py'],[.45,'read_file test_core.py']].forEach(([z,t])=>{R.box([EX,0,z],[.95,.42,.55],{fill:mix(P.paper,P.c6,.35),a:ea});if(k===4&&!nar)R.label([EX+.5,.42,z],t,{fs:12,mono:true,al:'left',dx:8,c:P.ink,grp:'tools',a:fa})});
    R.label([EX,0,.95],k===4&&!nar?'workspace · cwd = repo · 60 s timeout':'workspace',{fs:12.5,b:1,dy:18,c:P.c6,a:Math.max(.45,ea)});
    const va=k===6?at(k,e,6)*Math.min(1,Math.max(0,e*2-1))+dim*(1-Math.min(1,Math.max(0,e*2-1))):dim;
    R.box([EX,0,VZ],[1.2,.45,.6],{fill:mix(P.paper,P.good,.3),a:va});R.label([EX,.45,VZ],'verifier',{fs:12.5,b:1,dy:-12,c:P.good,a:Math.max(.45,va)});
    const Y=.95,colTop=[CX+CW/2,Math.min(top,1.6)*.6+.2,0],mIn=[MX,Y,0];
    // 1. the request: the whole prompt streams into the model
    if(k===0||k===6)R.flow([colTop,mIn],{c:P.c2,a:k===0?fa:.8,r:.07,speed:1.3,n:k===0?9:6});
    // 2. generation: the reply's tokens leave the model and run to the boundary
    if(k===1||k===2)R.flow([mIn,[BX-.02,Y,0]],{c:P.c3,a:k===1?fa:1,r:.07,speed:1.1,n:6});
    if(k===1)R.label([(MX+BX)/2,Y,0],T.usage1.completion_tokens+' tokens · 2 × <tool_call>',{mono:true,fs:12.5,b:1,c:P.c3,dy:-18,a:fa});
    // 3. the boundary: nothing after it is generated; let past it, the model wrote the user's turn
    if(k===2){R.box([BX+.75,.3,0],[.7,.55,.9],{fill:mix(P.paper,P.bad,.35),a:.25*fa,shadow:false,fa:.25});
      R.line([[BX+.42,.3,-.42],[BX+1.08,.85,.42]],{c:P.bad,w:2,a:.7*fa});R.line([[BX+.42,.85,-.42],[BX+1.08,.3,.42]],{c:P.bad,w:2,a:.7*fa});
      R.label([BX+.75,.85,0],nar?'user turn · 5 of 18':'let past it: a user turn, 5 of 18 samples',{fs:12.5,c:P.bad,dy:-14,a:fa,b:1})}
    // 4. the two calls travel to the parser
    if(k===3)[-.18,.18].forEach((z,i)=>{const t=Math.min(1,Math.max(0,e*1.3-i*.2));R.ball([lerp(BX+.1,PX-.2,t),.8-.15*t,z],.11,{c:P.c3});});
    if(k===3)R.label([PX,0,.45],'json.loads → 2 tool_calls',{mono:true,fs:12.5,b:1,c:P.c1,dy:18,a:fa});
    // 5. gate, then run: both reads are read-only, so they run side by side
    if(k===4)[-.45,.45].forEach(z=>R.flow([[PX+.38,.3,z*.4],[GX,.4,z],[EX-.48,.25,z]],{c:P.c3,a:fa,r:.065,speed:1.2,n:6}));
    if(k===4)R.label([GX,1.1,0],nar?'read-only: in parallel':'read-only batch: run in parallel',{fs:12.5,b:1,c:P.good,dy:-28,a:fa});
    // 6. results return as one user turn and the prompt grows
    if(k===5||k===6)[-.45,.45].forEach(z=>R.flowArc([EX-.2,.45,z],[CX,top+.05,z*.3],1.5,{c:P.c4,a:k===5?fa:.8,r:.065,speed:1.2,n:9}));
    if(k===5)R.label([1.6,2.1,0],'results as one user turn, in call order',{fs:12.5,b:1,c:P.c4,a:fa});
    // 7. around again until a reply has no tool call, then the verifier
    if(k===6){const j=Math.min(4,2+Math.floor(e*3));R.label([MX,.25,.75],'call '+(j+1)+(j===4?' · no tool call':''),{fs:12.5,mono:true,b:1,dy:18,c:P.ink});
      if(e>.66)R.flow([[MX+.1,.6,-.5],[EX-.6,.25,VZ]],{c:P.good,a:Math.min(1,(e-.66)*3),r:.065,speed:1.2,n:6});
      if(e>.8)R.label([EX,.45,VZ],'tests pass → done',{fs:12.5,b:1,c:P.good,dy:-30,a:Math.min(1,(e-.8)*5)})}
  }
  const full={cam:[.32,.62],bounds:[[-4.3,0,-2.4],[4.4,3.1,1.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one turn of the loop, run careful_s1',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,14],
    view:k=>k===1||k===2?{cam:[.42,.5],bounds:[[-2.4,0,-1],[1.6,1.9,1]]}:k===3||k===4?{cam:[.3,.55],bounds:[[-.6,0,-1.3],[4.4,1.5,1.3]]}:full});
})();
