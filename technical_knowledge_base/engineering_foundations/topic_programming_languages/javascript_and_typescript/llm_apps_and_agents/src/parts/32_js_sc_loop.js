// ---- Scene: Fig. 3, the hand-written loop of c1_agent_loop.ts in its four recorded runs (section 4; renderer v2). Data: window.TL.agent.
// One step per model call. Left: your loop with messages[] as a stack of plates (one per message, the real count) and a cost meter
// (cumulative mock input tokens); right: the model API, and the two tools behind a zod gate (a glass plate: safeParse before a tool runs).
// Each step: the whole array goes to the model, the reply comes back, its tool calls cross the gate together (Promise.all) and the results,
// errors included, come back and are appended as one user message. The loop itself is owned by Topic: agentic-harnesses; this is its guards. ----
(function(){
  if(!document.getElementById('stg-loop')||!window.TL||!TL.agent)return;const {at,cl,mix}=S3;
  const A=TL.agent,run=s=>A.runs.find(r=>r.scenario===s);let mode='happy';
  const MAXIN=Math.max(...A.runs.map(r=>r.tot.in));
  const LX=-2.9,MX=2.5,MZ=-1.7,GX=.2,TX=2.7,TZ={count_tokens:.75,user_profile:2.0},PH=.085;
  const fmt=n=>n.toLocaleString('en-GB');
  // the messages after call k, by kind: the task, then per call the assistant reply and (if it asked for tools) one user message of results
  function msgs(r,k,e){const M=[{c:'task'}];for(let i=0;i<k;i++){M.push({c:'asst'});const s=r.steps[i];if(s.stop==='tool_use')M.push({c:s.results.some(x=>x.is_error)?'err':'res'})}
    const s=r.steps[k];if(e>=.42)M.push({c:'asst'});if(e>=.9&&s.stop==='tool_use')M.push({c:s.results.some(x=>x.is_error)?'err':'res'});return M}
  function draw(R,k,e){const P=R.P,r=run(mode),s=r.steps[k];if(!s)return;const calls=s.content.filter(b=>b.type==='tool_use');R.grid(-5,4.5,-2.8,3,.5);
    const inV=p=>{const q=R.p(p);return q[0]>20&&q[0]<R.W-20&&q[1]>10&&q[1]<R.H-10},ph2=cl((e-.3)/.22,0,1),ph3=cl((e-.52)/.33,0,1),done=e>=.9,last=k===r.steps.length-1;
    // your loop: a plinth carrying messages[], one plate per message (task grey, replies blue, results green, results with an error orange)
    R.box([LX,0,.3],[1.5,.12,1.4],{fill:mix(P.paper,P.acc,.1)});R.label([LX,0,1],'your loop',{fs:12.5,b:1,c:P.acc,dy:16});
    const M=msgs(r,k,e),col={task:P.mute,asst:P.c1,res:P.good,err:P.bad};
    M.forEach((m,i)=>R.box([LX,.12+i*PH,.3],[1.05,PH*.8,.9],{fill:mix(P.paper,col[m.c],.5),shadow:false,lw:.7}));
    R.label([LX,.14+M.length*PH,.3],'messages[] · '+M.length,{mono:true,fs:12.5,b:1,dy:-14});
    // the cost meter: cumulative input tokens (the mock's estimate), against the largest of the four runs
    const tin=(k?r.steps[k-1].tot.in:0)+(e>=.42?s.usage.in:0),tout=(k?r.steps[k-1].tot.out:0)+(e>=.42?s.usage.out:0),usd=e>=.42?s.tot.usd:(k?r.steps[k-1].tot.usd:0);
    const MXm=LX-1.35,mh=1.5*tin/MAXIN;R.glass([MXm,0,0],[0,0,.6],[0,1.5,0],{c:P.mute,nu:1,nv:6,a:.45});if(mh>.01)R.box([MXm,0,.3],[.14,mh,.5],{fill:mix(P.paper,P.c5,.65),shadow:false});
    R.label([MXm,0,.6],fmt(tin)+' in · $'+usd.toFixed(5),{mono:true,fs:12,b:1,c:P.c5,dy:16,wide:1});
    // the model API
    R.box([MX,0,MZ],[1.3,.8,1.0],{fill:mix(P.paper,P.ink,.07)});if(inV([MX,.8,MZ]))R.label([MX,.8,MZ],'Model API (mock)',{fs:12.5,b:1,dy:-12});
    // 1. the whole array goes out (the dot count follows the messages sent)
    const top=[LX+.3,.2+M.length*PH,0];
    R.flowArc(top,[MX-.65,.55,MZ],.8,{c:P.c1,a:e<.32?1:.15,r:.07,n:Math.min(18,4+2*s.sent),speed:1.5});
    R.label([-.4,1.35,-1.1],'call '+s.step+': '+s.sent+' message'+(s.sent>1?'s':'')+' out · '+fmt(s.usage.in)+' tokens',{mono:true,fs:12.5,b:1,c:P.c1,a:e<.32?1:.5,wide:1});
    // 2. the reply comes back: its stop_reason and the tools it asks for (names; the arguments are in the step list)
    if(e>=.3){R.flowArc([MX-.65,.4,MZ+.3],[LX+.7,.45,0],.4,{c:P.c4,a:ph2<1?1:.2,r:.06,n:6,speed:1.6});
      const nm={};calls.forEach(c=>nm[c.name]=(nm[c.name]||0)+1);
      if(inV([MX,0,MZ+.5]))R.label([MX,0,MZ+.5],s.stop+(calls.length?' · '+Object.entries(nm).map(([n,c])=>n+(c>1?' ×'+c:'')).join(', '):''),{mono:true,fs:12.5,b:1,c:s.stop==='tool_use'?P.c4:P.good,a:ph2,dy:16,wide:1})}
    // the zod gate (arguments are model output: safeParse before any tool runs) and the two tools
    R.glass([GX,0,.25],[0,0,2.4],[0,1,0],{c:P.c4,nu:4,nv:3,a:.8});R.label([GX,1,.25],'zod safeParse',{fs:12.5,b:1,c:P.c4,dy:-10});
    Object.entries(TZ).forEach(([n,z])=>{const used=calls.some(c=>c.name===n);R.box([TX,0,z],[1.1,.5,.8],{fill:mix(P.paper,P.c6,used?.35:.08),a:used?1:.4});
      if(inV([TX,.5,z]))R.label([TX,.5,z],n,{mono:true,fs:12.5,b:used,c:used?P.ink:P.mute,dy:-10})});
    // 3. the calls cross the gate together and the results come back (errors are results too)
    if(e>=.52&&calls.length){calls.forEach((c,i)=>{const z=TZ[c.name],res=s.results[i],bad=!!res.is_error,off=(i-(calls.length-1)/2)*.28;
        R.flow([[LX+.75,.35,.5+off],[GX,.45,z+off],[TX-.55,.3,z+off]],{c:P.c4,a:ph3<1?1:.3,r:.065,n:8,speed:1.6});
        if(ph3>.5)R.flow([[TX-.55,.15,z+off+.12],[GX,.2,z+off+.12],[LX+.75,.2,.7+off]],{c:bad?P.bad:P.good,a:1,r:.065,n:8,speed:1.4});
        if(inV([TX+.55,.25,z+off]))R.label([TX+.55,.25,z+off],(bad?res.content:'ok')+' · '+res.ms+' ms',{al:'left',dx:8,mono:true,fs:12,b:bad,c:bad?P.bad:P.good,a:cl((ph3-.4)*3,0,1),grp:'r'})});
      if(calls.length>1)R.label([GX,1,2.45],'Promise.all: '+s.wall+' ms for the step',{mono:true,fs:12.5,b:1,c:P.c4,a:cl((ph3-.5)*3,0,1),dy:-10})}
    // 4. the end of the run
    if(last&&done){const t=r.outcome==='answered'?'answered after '+r.steps.length+' calls':r.outcome;
      R.label([LX,.14+M.length*PH,.3],t,{fs:13,b:1,c:r.outcome==='answered'?P.good:P.bad,dy:-34})}
  }
  const full={cam:[.55,.66],bounds:[[-4.4,0,-2.3],[3.4,1.4,2.5]]};
  const st=S3.stage({id:'stg-loop',list:'sx-lp-happy',fig:'Fig. 3 · four recorded runs of one loop',cam:full.cam,bounds:full.bounds,aspect:.66,dur:2600,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,150,14,16],
    // the last call of a run: in close on the loop, its messages[] and the meter
    view:k=>k>=run(mode).steps.length-1?{cam:[.45,.72],bounds:[[-4.4,0,-1.2],[.9,1.6,2.7]]}:full});
  const C=document.getElementById('tl-lp-mode');
  if(C)C.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;C.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    mode=b.dataset.m;document.querySelectorAll('ol[id^="sx-lp-"]').forEach(l=>l.hidden=l.id!=='sx-lp-'+mode);st.list('sx-lp-'+mode)});
})();
