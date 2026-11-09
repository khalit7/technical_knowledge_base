// ---- Scene: Fig. 1, the hero (stg-hero, renderer v2): one agentic run (task, agent = model on its harness, environment, checker behind a wall, score)
// and the four places where the same weights get a different number. Numbers: the nine Claude Opus 4.6 entries on the Terminal-Bench 2.0 board (window.HS,
// from inputs/tb2_same_model_agents_2026-10-05.json), pass^1 to pass^4 computed by PK.metric from GPT-5.2's released tau2-bench retail trials (window.AG),
// RDI's 100% on Terminal-Bench 2.0 (89 tasks, AG.survey), and OSWorld 2.0's official results row for Claude Opus 5 (44.33 binary, 77.67 partial; cited
// on the page in Computer use). The plain score bar of step 1 has no number: it only shows where the score sits. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.AG||!window.HS||!window.PK)return;
  const {mix,at,off,lerp,cl}=S3;
  const H=HS.models[0].a, run=AG.tau.find(s=>s.m==='GPT-5.2'&&s.dom==='retail'&&s.eff==='high');
  const PKV=[1,2,3,4].map(k=>PK.metric(run,k,'hat'));
  const OSW=[['binary',44.33],['partial',77.67]];
  window.AGN=window.AGN||{};AGN.hero={harness:H.map(a=>[a.h,a.v]),pk:PKV.map(v=>+v.toFixed(2)),tasks:AG.survey.tb2.n};
  const XT=-4.3,XA=-2.4,XE=.55,XW=2.0,XC=3.05,XS=4.95,BH=2.0; // x of task, agent, environment, wall, checker, score; bar height for 100%
  const win=(e,a,b)=>cl((e-a)/(b-a),0,1);
  // how strongly each object shows at each step (the rest recedes or leaves, so nothing is cut at the card's edge in the close views)
  const VIS=[{t:1,a:1,e:1,w:1,c:1},{t:0,a:1,e:0,w:0,c:0},{t:0,a:0,e:0,w:0,c:.35},{t:0,a:.6,e:.9,w:0,c:1},{t:0,a:0,e:0,w:0,c:.35}];
  // a label only when its anchor is on the canvas and it is visible enough to read
  function lab(R,p,t,o){const q=R.p(p);if((o.a!=null&&o.a<.15)||q[2]<=0||q[0]<-2||q[0]>R.W+2||q[1]<-2||q[1]>R.H+2)return;R.label(p,t,o)}
  function bars(R,list,x0,dx,col,a,o){o=o||{};const P=R.P;list.forEach(([nm,v,c],i)=>{const x=x0+i*dx,h=v/100*BH;
      R.box([x,0,0],[o.w||.3,Math.max(.01,h*(o.grow==null?1:o.grow)),o.d||.3],{fill:mix(P.paper,c||col,.55),a,shadow:false});
      lab(R,[x,h*(o.grow==null?1:o.grow),0],(o.fmt||(v=>v.toFixed(2)))(v),{mono:true,fs:12,b:1,dy:-10,c:c||col,a});
      if(nm)lab(R,[x,0,o.d?o.d/2:.15],nm,{fs:12,dy:13,c:P.ink,a})})}
  function draw(R,k,e,st){const P=R.P;R.grid(-5,6,-2,2,.5);
    const pk=st&&st.pk!=null?st.pk:k,V=n=>lerp(VIS[pk][n],VIS[k][n],e);
    // the task: a standing glass card
    const aT=V('t');R.glass([XT,.12,-.5],[0,0,1],[0,1.1,0],{c:P.c1,a:aT,nu:3,nv:4});lab(R,[XT,1.22,0],'task',{b:1,dy:-10,a:aT});
    lab(R,[XT,0,.5],'instruction · state · limits',{fs:12,dy:14,c:P.mute,a:aT,wide:1});
    // the agent: the model standing on its harness
    const aA=V('a');
    R.box([XA,0,0],[1.5,.28,1.2],{fill:mix(P.paper,P.bad,k===1?.45:.22),a:aA});
    R.box([XA,.28,0],[.75,.72,.7],{fill:mix(P.paper,P.c1,.35),a:aA});
    lab(R,[XA,1.0,0],'model',{b:1,dy:-10,a:aA});lab(R,[XA,0,.6],'harness',{dy:13,fs:12.5,b:k===1,c:k===1?P.bad:P.ink,a:aA});
    // the environment (the agent can change it)
    const aE=V('e');R.box([XE,0,0],[1.8,1.1,1.5],{fill:mix(P.paper,P.c6,.3),fa:.35,a:aE});lab(R,[XE,1.1,0],'environment',{b:1,dy:-10,a:aE});
    // the wall between the agent's world and the checker; at step 4 the checker sits inside the container instead
    const aW=V('w');R.glass([XW,0,-.95],[0,0,1.9],[0,1.45,0],{c:P.bad,a:aW,nu:4,nv:3});
    if(k!==3)lab(R,[XW,0,.95],"out of the agent's reach?",{fs:12,c:P.bad,dy:14,a:aW,wide:1});
    const xc=k===3?lerp(XC,XE+.35,win(e,.15,.7)):XC,aC=V('c');
    R.box([xc,0,k===3?lerp(0,.25,win(e,.15,.7)):0],[.8,.55,.7],{fill:mix(P.paper,P.c5,.4),a:aC});lab(R,[xc,.55,0],'checker',{b:1,dy:-10,a:aC,c:k===3?P.bad:P.ink});
    // what each step adds (flows, bars); the previous step's additions fade out while this step's come in
    const pk2=st&&st.pk!=null?st.pk:k;if(pk2!==k&&e<1)sp(R,pk2,1-win(e,0,.4),1);sp(R,k,pk2!==k?win(e,.45,1):1,pk2!==k?win(e,.35,1):e);
  }
  function sp(R,kk,A,e){const P=R.P;if(A<=.01)return;
    if(kk===0){const a=A*Math.min(1,e*1.6);
      R.flowArc([XT+.05,.7,0],[XA-.4,.8,0],.35,{c:P.c1,a,n:6});
      R.flowArc([XA+.4,.85,-.25],[XE-.6,.7,-.25],.4,{c:P.c2,a,n:8});R.flowArc([XE-.6,.45,.3],[XA+.4,.45,.3],.25,{c:P.c6,a,n:8});
      R.flow([[XE+.6,.4,0],[XC-.4,.35,0]],{c:P.c6,a,n:6});R.flow([[XC+.4,.3,0],[XS-.2,.3,0]],{c:P.acc,a,n:5});
      R.label([(XA+XE)/2,1.25,-.25],'actions',{fs:12,c:P.c2,a,wide:1});R.label([(XA+XE)/2,.2,.45],'observations',{fs:12,c:P.c6,a,wide:1});
      R.label([(XE+XW)/2+.3,.62,0],'end state',{fs:12,c:P.c6,dy:-8,a,wide:1});
    }
    // the score, per step
    if(kk===0){const a=A*Math.min(1,e*1.4);R.box([XS,0,0],[.45,BH*.5,.45],{fill:mix(P.paper,P.acc,.45),a});R.label([XS,BH*.5,0],'score',{b:1,dy:-10,a});
      R.label([XS,0,.25],'share of tasks rewarded',{fs:12,dy:13,c:P.mute,a,wide:1})}
    if(kk===1){const g=win(e,.1,.8);H.forEach((x,i)=>{const px=XA+1.15+i*.3,h=x.v/100*1.8*g,c=x.k==='own'?P.bad:x.k==='neutral'?P.c4:P.acc;
        R.box([px,0,0],[.19,Math.max(.01,h),.19],{fill:mix(P.paper,c,.6),a:A,shadow:false});lab(R,[px,h,0],x.v.toFixed(1),{mono:true,fs:12,dy:-9,c,wide:i>0&&i<H.length-1,a:A*win(e,.5,1)})});
      lab(R,[XA+1.15,0,.15],H[0].h,{fs:12,b:1,dy:14,al:'right',dx:8,wide:1,c:P.bad,a:A*win(e,.5,1)});lab(R,[XA+1.15+8*.3,0,.15],H[8].h,{fs:12,b:1,dy:14,al:'left',dx:-8,c:P.acc,a:A*win(e,.5,1)});
      R.flowArc([XA+.4,.6,0],[XA+1.15+4*.3,1.45,0],.3,{c:P.bad,a:A*.5,n:6,r:.05})}
    if(kk===2){const g=win(e,.1,.8);
      PKV.forEach((v,i)=>{const px=XS-.75+i*.5;R.flowArc([XC+.3,.4,0],[px,v/100*BH*g+.05,0],.3,{c:P.c1,a:A*(.35+.15*(4-i)),n:3+(4-i)*2,r:.05})});
      bars(R,PKV.map((v,i)=>['pass^'+(i+1),v,i===3?P.c2:P.c1]),XS-.75,.5,P.c1,A,{grow:g})}
    if(kk===3){const g=win(e,.45,1),ga=A*g;R.flowArc([XA+.4,.7,.2],[XE+.35,.55,.25],.35,{c:P.bad,a:ga,n:9});R.flow([[XE+.7,.3,.25],[XS-.2,.3,0]],{c:P.bad,a:ga,n:6});
      bars(R,[['exploit',100,P.bad]],XS,0,P.bad,ga,{grow:g,fmt:v=>v.toFixed(0)+'%'});lab(R,[XS,BH*g,0],'0 lines of solution',{fs:12,dy:-28,c:P.bad,a:ga,wide:1})}
    if(kk===4){const g=win(e,.1,.8);OSW.forEach(([nm,v],i)=>{R.flow([[XC+.4,.3,0],[XS-.35+i*.7,.25,0]],{c:P.c5,a:A*.6,n:4,r:.05})});
      bars(R,OSW.map(([nm,v],i)=>[nm,v,i?P.c4:P.acc]),XS-.35,.7,P.c5,A,{grow:g,w:.4,d:.4})}
    }
  const full={cam:[.28,.68],bounds:[[-4.9,0,-1.1],[5.6,1.9,1.5]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one run, four places the score moves',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[24,16,18,16],
    view:k=>k===1?{cam:[.12,.45],bounds:[[-3.3,0,-.8],[1.8,1.6,.8]]}:k===2||k===4?{cam:[.2,.5],bounds:[[2.5,0,-.7],[6.3,2.1,1]]}:k===3?{cam:[.28,.62],bounds:[[-3.4,0,-1],[5.8,2.1,1.4]]}:null});
})();
// charts inside closed blocks measure their width when the block opens
document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
