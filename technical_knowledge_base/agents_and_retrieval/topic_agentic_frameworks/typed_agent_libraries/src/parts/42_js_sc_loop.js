// ---- Scene: Fig. 3, the four loops side by side (renderer v2). One lane per library: model, action, the test that ends the run, and the
// way round again; the default caps are read from each library's source. Step 5 draws ADK's four recorded runs of the running example
// as stacks of events, one slab per model request (FT.mech.adk_task_*), green when the tests passed afterwards. ----
(function(){
  if(!document.getElementById('stg-loop'))return;const {mix}=S3;
  const M=window.FT.mech,adk=Object.keys(M).filter(k=>k.startsWith('adk_task')).sort().map(k=>({n:M[k].wire.length,pass:!!(M[k].tests&&M[k].tests.pass)}));
  // [library, action, end test, cap]
  const L=[['Pydantic AI','tools + final_result','final_result valid?','50 requests'],['Agents SDK','tools, handoffs','no tool call?','10 turns'],
    ['smolagents','run the code','final_answer()?','20 steps'],['Google ADK','function calls','no function call?','500 model calls']];
  const Z=i=>(i-1.5)*1.45,XM=-2.7,XA=0,XG=2.5;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.6,5.6,-3,3,.5);
    const cur=k>=1?k-1:-1;
    L.forEach(([nm,act,end,cap],i)=>{const z=Z(i),on=cur<0||cur===i,a=on?1:.13,c=[P.c1,P.c2,P.c3,P.c4][i];
      R.box([XM,0,z],[1.0,.55,.9],{fill:mix(P.paper,P.c4,.2),a});
      R.box([XA,0,z],[1.25,.42,.9],{fill:mix(P.paper,c,.25),a});
      R.glass([XG,.02,z-.42],[0,0,.84],[0,.75,0],{c:P.acc,a:on?1:.15,nu:3,nv:3});
      if(on){R.label([XM-.55,.3,z],nm,{fs:13.5,b:1,c,al:'right',dx:-6,grp:cur<0?'lib':null});
        if(cur===i||!nar)R.label(i===3&&cur===3?[XG,.77,z]:[XG+.3,.4,z],'cap: '+cap,i===3&&cur===3?{fs:12.5,b:1,c:P.acc,dy:-28}:{fs:12.5,b:1,c:P.acc,al:'left',dx:8,grp:cur<0?'cap':null})}
      if(cur===i){R.label([XA,.42,z],act,{fs:12.5,c:P.ink,dy:-10});R.label([XG,.77,z],end,{fs:12.5,b:1,c:P.acc,dy:-10});}
      // the loop: model to action to the test, then round again (counts toward the cap)
      if(on){const fa=cur<0?.55:1,y=.32;R.flow([[XM+.5,y,z],[XA-.62,y,z]],{c:P.c4,r:.05,n:4,a:fa});R.flow([[XA+.62,y,z],[XG-.05,y,z]],{c:c,r:.05,n:4,a:fa});
        R.flowArc([XG-.05,.6,z+.18],[XM+.3,.6,z+.18],.5,{c:P.mute,r:.04,n:8,a:fa*.8,speed:1.6})}});
    // Pydantic AI: the result type is one more tool, a glass plate beside the others
    if(k===1){const z=Z(0);R.glass([XA+.1,.45,z-.35],[0,0,.7],[0,.5,0],{c:P.c2,a:e,nu:3,nv:3});R.label([XA+.1,.95,z],'final_result = Triage schema',{fs:12.5,b:1,c:P.c2,dy:-8,a:e,wide:1});
      R.flow([[XG+.1,.3,z],[XG+1.1,.3,z-.6]],{c:P.good,r:.06,n:4,a:e})}
    // Agents SDK: a handoff tool switches the agent and the loop goes on
    if(k===2){const z=Z(1);R.box([XA,0,z-1.05],[.8,.35,.5],{fill:mix(P.paper,P.c2,.35),a:e});R.label([XA,.35,z-1.05],'fixer agent',{fs:12.5,c:P.c2,dy:-10,a:e});
      R.flowArc([XA,.42,z-.4],[XA,.35,z-.85],.25,{c:P.c2,r:.05,n:4,a:e})}
    // smolagents: the action is a program; generation stops at </code>, the executor runs it, printed output comes back
    if(k===3){const z=Z(2);R.glass([XA-1.3,.5,z-.35],[0,0,.7],[0,.55,0],{c:P.c3,a:e,nu:2,nv:4});R.label([XA-1.3,1.05,z],'<code> ... </code>',{mono:true,fs:12.5,b:1,c:P.c3,dy:-8,a:e});
      R.label([XA,0,z+.45],'LocalPythonExecutor: rules, not a sandbox',{fs:12,c:P.bad,dy:16,a:e,wide:1});
      R.flowArc([XA-.2,.42,z-.2],[XM+.4,.55,z-.2],.45,{c:P.c3,r:.05,n:6,a:e})}
    // ADK: every reply, call and result is an event appended to the session; the four recorded runs as stacks of request slabs
    if(k===4){const z=Z(3);adk.forEach((r,j)=>{const x=XG+1.2+j*.55;for(let s=0;s<r.n;s++)R.box([x,s*.085,z],[.4,.06,.5],{fill:mix(P.paper,r.pass?P.good:P.c4,.45),a:Math.min(1,e*1.5),shadow:s===0});
        R.label([x,r.n*.085*Math.min(1,e*1.5),z],String(r.n),{fs:12.5,b:1,c:r.pass?P.good:P.ink,dy:-9,a:e})});
      R.label([XG+2.0,0,z+.25],'requests per recorded run',{fs:12,c:P.mute,dy:16,a:e,wide:1});
      R.flow([[XA+.4,.3,z+.2],[XG+1.2,.3,z+.2]],{c:P.c4,r:.05,n:5,a:e})}
  }
  const full={cam:[.85,.62],bounds:[[-4.2,0,-2.6],[4.6,1.0,2.6]]};
  const lane=i=>({cam:[.85,.5],bounds:[[-3.6,0,Z(i)-1.1],[i===3?5.3:3.9,1.1,Z(i)+.7]]});
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 3 · four loops, four stopping rules',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,10,14,10]:[22,20,14,140],
    view:k=>k===0?full:lane(k-1)});
})();
