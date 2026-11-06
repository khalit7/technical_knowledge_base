// ---- Scene: Fig. 1, one turn of an agent in seven steps (renderer v2). A map, not a measurement: the model makes one decision (step 2),
// the harness does the other six. Each step brings its own block to full strength and lets the rest recede; flows show what moves where.
// The step list sx-hero (20_read.html) names this page's section and the child page that owns each step. ----
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,mix}=S3;
  // plan (x right, z towards the reader): the request stack front left, the model at the back, the parsed call back right,
  // the gate on the right, the tool inside its sandbox front right, the loop's stop rule in the middle
  const REQ=[-2.7,0,1.25],MOD=[-.6,0,-1.75],ACT=[1.9,0,-1.35],GATE=[3.05,0,.35],TOOL=[1.75,0,2.05];
  const LAY=[['system prompt','ink',.2],['tool definitions','c6',.2],['memory files','c4',.12],['history','c3',.2]];
  const top=(p,h)=>[p[0],p[1]+h,p[2]];
  function draw(R,k,e){const P=R.P,nar=R.W<520,fa=Math.min(1,e*1.6);R.grid(-4,4.4,-3,3.4,.5);
    // strength of each block: the step's subject at 1, what it hands over to at .6, the rest receding
    const A=s=>k===s?1:k===6?.55:.28;
    // 1. the request: four slabs stacked in the order the harness assembles them; the history slab grows by one reply and result at step 6
    const ra=k===0?1:k===1?.85:k===5?.85:A(0);let y=0;
    LAY.forEach(([n,c,h],i)=>{const hh=i===3?h+(k>=5?.16*at(k,e,5):0):h,ai=k===0?at(0,Math.min(1,e*1.4),0)*(i<=Math.floor(e*4.2)?1:.15):ra;
      R.box([REQ[0],y,REQ[2]],[1.7,hh*.94,1.1],{fill:mix(P.paper,P[c],c==='ink'?.12:.42),a:ai,shadow:i===0,lw:.8});
      if(!nar)R.label([REQ[0]-.9,y+hh/2,REQ[2]+.55],n,{al:'right',dx:-6,fs:12,c:c==='ink'?P.mute:P[c],a:Math.max(.35,ai),grp:'req'});y+=hh});
    R.label(top(REQ,y),'request',{fs:13,b:1,c:P.acc,dy:-12,a:Math.max(.5,ra)});
    // 2. the model: the one decision; the request streams into it
    const ma=k===1||k===2?1:A(1);
    R.box(MOD,[1.6,.62,1.1],{fill:mix(P.paper,P.c2,.45),a:ma});R.label(top(MOD,.62),'model',{fs:13.5,b:1,c:P.c2,dy:-12,a:Math.max(.5,ma)});
    if(k===1||k===6){const a=k===1?fa:.4;R.flowArc(top(REQ,.75),top(MOD,.45),.7,{c:P.acc,a,r:.075,n:12,speed:1.4})}
    // 3. the reply stops at the tool call: a small block (name and JSON arguments) leaves the model and is parsed
    const aa=k===2?1:k>2?A(2):0;
    if(aa>0){const t=k===2?e:1,p=[MOD[0]+(ACT[0]-MOD[0])*t,0,MOD[2]+(ACT[2]-MOD[2])*t];
      R.box(p,[.9,.32,.6],{fill:mix(P.paper,P.c2,.25),a:aa});R.label(top(p,.32),k===2?'tool call: Bash {command}':'tool call',{fs:12,b:k===2,c:P.c2,dy:-10,a:Math.max(.45,aa)});
      if(k===2){R.flowArc(top(MOD,.5),top(ACT,.3),.35,{c:P.c2,a:fa,r:.065,n:6,speed:1.2});
        if(!nar)R.label([MOD[0]+.9,.5,MOD[2]],'turn ends here',{al:'left',dx:8,fs:12,c:P.mute,a:fa,wide:1})}}
    // 4. the permission gate: a plate the call must pass; allow, ask a person, or deny
    const ga=k===3?1:k>=4?A(3):k<3?.18:0;
    R.glass([GATE[0],0,GATE[2]-.75],[0,0,1.5],[0,1.05,0],{c:P.c5,a:ga,nu:4,nv:4});
    R.label([GATE[0],1.05,GATE[2]],'permission gate',{fs:12.5,b:k===3,c:P.c5,dy:-10,a:Math.max(.4,ga)});
    if(k===3){R.flowArc(top(ACT,.3),[GATE[0],.55,GATE[2]-.2],.3,{c:P.c2,a:fa,r:.065,n:6,speed:1.1});
      [['allow',P.good,.95],['ask',P.c5,.6],['deny',P.bad,.25]].forEach(([t,c,yy])=>R.label([GATE[0]+.25,yy,GATE[2]+.75],t,{al:'left',dx:6,fs:12.5,b:1,c,a:fa,wide:1}))}
    // 5. the tool runs inside a sandbox (a glass box around it) with a timeout
    const ta=k===4?1:k===5?.7:A(4);
    R.box(TOOL,[1,.42,.8],{fill:mix(P.paper,P.c3,.3),a:ta});R.label(top(TOOL,.42),'tool runs',{fs:12.5,b:k===4,c:P.c3,dy:-10,a:Math.max(.45,ta)});
    const sa=k===4?fa:k>4?.35:.12;R.box(TOOL,[1.7,.95,1.4],{fill:mix(P.paper,P.c6,.4),a:sa,fa:.14,shadow:false,ec:P.c6,lw:1.1});
    if(k===4){R.label([TOOL[0]+.85,.95,TOOL[2]],'sandbox · timeout',{al:'left',dx:6,fs:12,c:P.c6,a:fa});
      R.flowArc([GATE[0],.45,GATE[2]+.3],top(TOOL,.35),.3,{c:P.c2,a:fa,r:.065,n:6,speed:1.1})}
    // 6. the result (errors included, clipped with a note) goes back into the history
    if(k===5||k===6){const a=k===5?fa:.4;R.flowArc(top(TOOL,.3),[REQ[0]+.6,y-.1,REQ[2]+.2],.55,{c:P.c3,a,r:.07,n:12,speed:1.3});
      if(k===5&&!nar)R.label([(TOOL[0]+REQ[0])/2,.95,(TOOL[2]+REQ[2])/2+.4],'result: exit code, output, error',{fs:12,c:P.c3,a:fa,dy:-16})}
    // 7. stop or go again: no tool call, a turn or budget limit, or a hook ends it; otherwise the whole loop runs again
    if(k===6){R.box([0,0,.25],[1.2,.2,.8],{fill:mix(P.paper,P.ink,.08),a:fa});R.label([0,.2,.25],'stop? no tool call · limits · hook',{fs:12.5,b:1,c:P.ink,dy:-10,a:fa});
      R.flowArc(top(MOD,.5),top(ACT,.3),.35,{c:P.c2,a:.4,r:.055,n:4,speed:1.2});R.flowArc(top(ACT,.3),[GATE[0],.55,GATE[2]-.2],.3,{c:P.c2,a:.4,r:.055,n:4,speed:1.2});
      R.flowArc([GATE[0],.45,GATE[2]+.3],top(TOOL,.35),.3,{c:P.c2,a:.4,r:.055,n:4,speed:1.2})}
  }
  const full={cam:[.2,.8],bounds:[[-3.9,0,-2.4],[4,.9,2.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one turn of an agent',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1400,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,120],
    view:k=>k===1||k===2?{cam:[.15,.7],bounds:[[-3.7,0,-2.4],[3.1,.9,1.9]]}:full});
})();
