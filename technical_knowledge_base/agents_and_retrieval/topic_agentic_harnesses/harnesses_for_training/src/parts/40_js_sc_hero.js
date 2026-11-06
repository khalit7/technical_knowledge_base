// ---- Scene: Fig. 1, one episode and the four uses of its record (renderer v2). Data: HT, the recorded rollout sdk-haiku_bash_T01_r1
// (Haiku 4.5, bash only, task T01): its calls' input tokens, its 17 events (calls and observations) and the verifier's 20 check results. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.HT)return;const {at,mix,lerp}=S3,HT=window.HT;
  const run=HT.runs.find(x=>x.m==='haiku'&&x.h==='bash'&&x.vis&&!x.bin&&HT.traj[x.id]);if(!run)return;
  const tr=HT.traj[run.id],inp=tr.filter(e=>e[0]==='c').map(e=>e[1]),nEv=tr.length;
  // events in order, and how many there are once call j has had its observation
  const evAfter=j=>{let c=0,n=0;for(const e of tr){if(e[0]==='c'){if(c===j)break;c++}n++}return n};
  const checks=HT.checks.map((c,i)=>({vis:c.n[0]==='v',ok:run.res[i]==='1',n:c.n}));
  const fmt=n=>Math.round(n).toLocaleString('en-GB');
  const TX=-4.4,MX=-2.5,HX=-.5,CX=1.7,SX=3.85,VZ=-2.4,UZ=2.45,SH=.075;
  function draw(R,k,e){const P=R.P,fa=Math.min(1,e*1.6),nar=R.W<520,lab=a=>(nar||k===5)&&a<.5?0:Math.max(.45,a);R.grid(-5.2,5.2,-3.4,3.4,.5);
    const rec=k===4||k===5?.22:1;
    // the task and its buggy repository
    const ta=k===0?1:.28;R.box([TX,0,0],[1.05,.5,1.05],{fill:mix(P.paper,P.c5,.35),a:ta});
    R.label([TX,.5,0],'task T01',{fs:13,b:1,dy:-12,c:P.c5,a:lab(ta)});
    if(k===0)R.label([TX,0,.55],'buggy repo + issue',{fs:12,mono:true,dy:16,c:P.mute,a:fa});
    // the model: a glass plate (the policy)
    const ma=k===1||k===2?1:k===5?.6:.3*rec+.05;R.glass([MX,.2,-.7],[0,0,1.4],[0,1.35,0],{c:P.c2,a:ma,nu:6,nv:6});
    R.label([MX,1.55,0],'model (policy)',{fs:13,b:1,dy:-10,c:P.c2,a:lab(ma)});
    // the harness: the page's highlight
    const ha=k<=3?1:.3;R.box([HX,0,0],[1.05,.8,1.15],{fill:mix(P.paper,P.acc,.38),a:ha});
    R.label([HX,.8,0],'harness',{fs:13.5,b:1,dy:-12,c:P.acc,a:lab(ha)});
    if(k===0&&!nar)R.label([HX,0,.6],'one bash tool · 16-call cap',{fs:12,mono:true,dy:16,c:P.mute,a:fa});
    // the container and the workspace inside it
    const ca=k<=2||k===4?1:.28;R.box([CX,0,0],[1.6,1.05,1.65],{fill:mix(P.paper,P.c6,.18),fa:.07,a:ca*.9,shadow:false});
    const edited=k>=2&&!(k===2&&e<.4);
    R.box([CX,0,0],[.85,.38,.85],{fill:edited?mix(P.paper,P.c3,.45):mix(P.paper,P.c6,.4),a:ca});
    R.label([CX,1.05,0],'container',{fs:13,b:1,dy:-12,c:P.c6,a:lab(ca)});
    if(k===0||k===2)R.label([CX,0,.85],k===0?'no network · /work':'core.py: [a-z]+ → [a-z\']+',{fs:12,mono:true,dy:16,c:k===0?P.mute:P.c3,a:fa});
    // reset: a fresh copy of the repository goes into the container
    if(k===0){R.flowArc([TX+.3,.5,0],[CX,.4,0],1.4,{c:P.c5,a:fa,r:.07,speed:1.4,n:12})}
    // act and observe: the model's calls run through the harness into the container; observations come back
    if(k===1||k===2){const Y=.82;
      R.flow([[MX,Y,.28],[HX,Y,.28],[CX-.45,.3,.28]],{c:P.c3,a:fa,r:.07,speed:1.3,n:9});
      R.flow([[CX-.45,.2,-.28],[HX,Y-.15,-.28],[MX,Y-.15,-.28]],{c:P.c4,a:fa,r:.07,speed:1.3,n:9});
      const j0=k===1?0:5,j1=k===1?5:8,j=Math.min(j1-1,j0+Math.floor(e*(j1-j0)));
      R.label([(MX+HX)/2,Y,.28],'call '+(j+1)+' · '+fmt(inp[j])+' tokens read',{fs:12.5,mono:true,b:1,dy:-22,c:P.c3});
      if(!nar)R.label([(HX+CX)/2,.15,-.28],k===1?'observation · clipped output':'tests: 9 of 9 visible pass',{fs:12,mono:true,dy:20,c:P.c4,a:fa})}
    // the trajectory: the harness records every call and observation as one slab
    const sa=k>=3?1:k>=1?.9:0;
    const nS=k===0?0:k===1?Math.round(lerp(0,evAfter(5),e)):k===2?Math.round(lerp(evAfter(5),evAfter(8),e)):nEv;
    for(let i=0;i<nS;i++)R.box([SX,i*SH,0],[.95,SH*.82,.95],{fill:tr[i][0]==='c'?mix(P.paper,P.c3,.55):mix(P.paper,P.c4,.45),a:sa*(k===4?.3:1),shadow:i===0,lw:.6});
    if(k>=1)R.box([SX,0,0],[.95,nEv*SH,.95],{fa:0,a:.18,shadow:false});
    if(k===1||k===2)R.flowArc([HX+.3,.8,0],[SX,nS*SH+.05,0],1.1,{c:P.acc,a:fa*.85,r:.06,speed:1.2,n:10});
    if(k>=1)R.label([SX,nEv*SH,0],k>=3?'trajectory · '+nEv+' events':'trajectory',{fs:13,b:1,dy:-12,c:P.ink,a:k===4?lab(.3):1});
    if(k===3)R.label([SX,0,.5],fmt(inp.reduce((a,b)=>a+b,0))+' input tokens · '+inp.length+' calls',{fs:12,mono:true,dy:16,c:P.mute,a:fa});
    if(k===3)R.label([MX,.2,.7],'call '+inp.length+': no tool call → stop',{fs:12.5,mono:true,b:1,dy:18,c:P.c2,a:fa});
    // the verifier: textstats/ only, a fresh read-only container, 20 checks (visible ones low, held-out ones taller)
    const va=k===4?1:k>=5?.25:0;
    if(va>0){R.box([CX,0,VZ],[1.7,.45,1.25],{fill:mix(P.paper,P.good,.22),a:va});
      checks.forEach((c,i)=>{const col=i%5,row=Math.floor(i/5),show=k>4||at(k,e,4)*20>i;if(!show)return;
        R.box([CX-.6+col*.3,.45,VZ-.45+row*.3],[.22,c.vis?.06:.16,.22],{fill:c.ok?P.good:P.bad,a:va,shadow:false,lw:.6})});
      R.label([CX,.6,VZ-.62],'verifier · fresh container',{fs:13,b:1,dy:-12,c:P.good,a:lab(va)})}
    if(k===4){R.flowArc([CX,.4,-.4],[CX,.62,VZ+.3],.6,{c:P.c6,a:fa,r:.06,speed:1.1,n:7});
      const ok=checks.filter(c=>c.ok).length,bad=checks.filter(c=>!c.ok).map(c=>c.n);
      R.label([CX+.95,.5,VZ],ok+' of 20 pass · '+bad.join(', ')+' fails',{fs:12.5,mono:true,al:'left',dx:8,c:P.bad,b:1,a:fa,wide:1});
      R.label([CX,0,VZ+.62],'reward '+run.bin+' · partial '+run.part.toFixed(2),{fs:13,mono:true,b:1,dy:18,c:P.bad,a:fa});
      R.label([CX,1.05,.3],'own tests: 1',{fs:12,mono:true,dy:-30,c:P.mute,a:fa,wide:1})}
    // four uses of the one record
    if(k===5){const U=[[-3.4,'ruler','score of model + harness',P.c1],[-1.15,'gym','advantages → new weights',P.c2],[1.15,'dataset','redact, filter, imitate',P.c3],[3.4,'search','edit harness, re-score',P.acc]];
      U.forEach(([x,t,s,c],i)=>{const a=Math.min(1,Math.max(0,e*1.8-i*.18));if(a<=0)return;
        R.flowArc([SX,nEv*SH*.6,.3],[x,.5,UZ],.9+.1*i,{c,a,r:.06,speed:1.2,n:8});
        if(i===0)[.45,.8,.6].forEach((h,j)=>R.box([x+(j-1)*.3,0,UZ],[.22,h,.4],{fill:j===1?c:mix(P.paper,c,.3),a}));
        if(i===1){R.glass([x-.45,.15,UZ],[.9,0,0],[0,.8,0],{c,a,nu:5,nv:5});R.flowArc([x,.95,UZ],[MX,1.2,0],.8,{c,a:a*.8,r:.055,speed:1.1,n:8})}
        if(i===2)for(let j=0;j<6;j++)R.box([x,j*.11,UZ],[.85,.08,.6],{fill:mix(P.paper,c,.45),a,shadow:j===0,lw:.6});
        if(i===3)[-.32,0,.32].forEach((dx,j)=>R.box([x+dx,0,UZ],[.26,j===1?.75:.45,.4],{fill:j===1?mix(P.paper,c,.5):mix(P.paper,c,.18),a}));
        R.label([x,1.15,UZ],t,{fs:13.5,b:1,c,dy:-6,a});if(!nar)R.label([x,0,UZ+.4],s,{fs:12,mono:true,dy:16,c:P.mute,a})})}
  }
  const full={cam:[.28,.6],bounds:[[-5,0,-3],[4.5,1.9,3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one episode, one record, four uses',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[18,14,14,14],
    view:k=>k===3?{cam:[.3,.55],bounds:[[-3,0,-1],[4.4,1.6,1]]}:k===1||k===2?{cam:[.3,.5],bounds:[[-3.2,0,-1],[4.4,1.7,1]]}:k===4?{cam:[.45,.62],bounds:[[.4,0,-3.1],[3.6,1.2,.9]]}:k===5?{cam:[.2,.55],bounds:[[-4,0,-.8],[4.3,1.7,3.5]]}:full});
})();
