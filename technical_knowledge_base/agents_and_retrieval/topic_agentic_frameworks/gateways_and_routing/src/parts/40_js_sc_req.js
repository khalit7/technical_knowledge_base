// ---- Scene: Fig. 1, one request through LiteLLM's proxy (renderer v2). Callers on the left, the gateway's stations in the order the code
// runs them, the upstreams on the right; three scenarios (first call, cache hit, chosen deployment fails), each with its own step list.
// The stations and their order are read from LiteLLM 1.104.0's source; the 0.083 s hit and the 5.5 s fallback are this page's recordings. ----
(function(){
  if(!document.getElementById('stg-req'))return;const {at,lerp,mix}=S3;
  const NM=['Auth','Budget','Limit','Route','Cache','Call','Log'],XS=[-3.9,-3.0,-2.1,-1.2,-0.3,0.6,1.5],SY=.08,SH=.34;
  // per scenario: the station each step is at
  const SEQ={miss:[0,1,2,3,4,5,6],hit:[0,1,2,3,4,5,6],fail:[0,1,2,3,4,5,5,5,6]};
  let mode='miss';
  const CAL=[[-5.6,-1.1,'agent','sk-team-a'],[-5.6,0,'batch job','sk-team-b'],[-5.6,1.1,'eval run','pins one provider']];
  // upstreams: in the fail scenario the recorded group "chat" has one deployment (C) and the fallback group holds A
  const UP=()=>mode==='fail'?{chat:[['C',-.9]],back:[['A',1.25]]}:{chat:[['A',-1.3],['B',-.45]],back:[['C',1.25]]};
  const UX=4.0,top=i=>[XS[i],SY+SH+.05,0];
  const full={cam:[.1,.78],bounds:[[-6.1,0,-2.3],[5.6,1.2,2.9]]};
  // the camera moves in on the station each step is about; route, call and fallback widen to include the upstreams
  function VIEW(k){const c=SEQ[mode][k];if(c===0)return {cam:[.25,.62],bounds:[[-6.3,0,-1.9],[-2.2,1.2,1.9]]};
    if(c>=1&&c<=2)return {cam:[.25,.6],bounds:[[XS[c]-2.3,0,-1.2],[XS[c]+2.3,1.4,1.2]]};
    if(c===4&&mode!=='hit')return {cam:[.25,.6],bounds:[[XS[4]-2.3,0,-1.2],[XS[4]+2.3,1.3,1.2]]};
    if(c===3||c===5)return {cam:[.22,.68],bounds:[[XS[c]-1.2,0,-2.3],[5.6,1.3,2.9]]};return full}
  function draw(R,k,e){const P=R.P,seq=SEQ[mode],cur=seq[k],nar=R.W<520,VB=VIEW(k).bounds,inV=x=>x>=VB[0][0]-.25&&x<=VB[1][0]+.25,la=x=>inV(x)?1:0;R.grid(-6.6,5.4,-3,3.2,.5);
    const skip=i=>mode==='hit'&&i===5&&k>=5;
    const sa=i=>skip(i)?.12:i===cur?1:seq.slice(0,k).includes(i)?.5:.22;
    // callers
    CAL.forEach(([x,z,n,key],j)=>{const a=j===0?1:.35;R.box([x,0,z],[.9,.42,.62],{a,fill:j===0?mix(P.paper,P.acc,.18):P.paper});
      R.label([x,.42,z],n,{fs:12.5,b:j===0,dy:-10,a:Math.max(.45,a)*la(x),grp:'cal'});if(j===0&&k===0)R.label([x,0,z+.31],key,{mono:true,fs:12,c:P.acc,dy:14})});
    // the gateway: a plinth with its stations
    R.box([-1.2,0,0],[6.4,SY,1.5],{a:.9,fill:mix(P.paper,P.acc,.06)});
    if(VB===full.bounds)R.label([-1.2,0,.75],'gateway (LiteLLM proxy)',{fs:12.5,b:1,c:P.acc,dy:16,a:.9});
    NM.forEach((n,i)=>{const a=sa(i),hot=i===cur;R.box([XS[i],SY,0],[.62,SH,.62],{a,fill:hot?mix(P.paper,(mode==='fail'&&i===5&&k>=5&&k<=6)?P.bad:P.acc,.3):P.paper});
      R.label([XS[i],SY+SH,-.31],n,{fs:hot?13:12,b:hot,c:hot?P.acc:P.mute,dy:-12,a:Math.max(.35,a)*la(XS[i])})});
    // the request travelling: from the caller (step 1) or the previous station
    const from=k===0?[-5.6,.5,-1.1]:top(seq[k-1]),to=top(cur);
    if(!(k>0&&seq[k-1]===cur))R.flowArc(from,to,.3,{c:P.acc,a:.9,r:.06,speed:1.4});
    R.glow(to,.16,{c:P.acc,a:.6});
    // 1. auth: the key card
    {const a=sa(0);R.box([XS[0],SY+SH,0],[.42,.04,.26],{fill:P.c5,a,shadow:false});if(cur===0)R.label([XS[0],SY+SH+.1,.2],'key → limits, budget',{fs:12,dy:20,c:P.mute,wide:1})}
    // 2. budget: a glass tank; the worst case is reserved (illustrative height), then settled to the real cost
    {const a=sa(1),x=XS[1],H=.85,y0=SY+SH,settled=cur===6||(k>=seq.indexOf(6)),res=k<1?0:k===1?e:settled?lerp(1,.08,cur===6?e:1):1;
      if(k>=1){R.box([x,y0,0],[.34,H*.75*res,.34],{fill:mix(P.paper,P.c5,.75),a,shadow:false});}
      R.glass([x-.21,y0,.21],[.42,0,0],[0,H,0],{c:P.c5,a:a*.8,nu:2,nv:6});
      if(cur===1)R.label([x,y0+H,0],'worst case reserved',{fs:12.5,b:1,c:P.c5,dy:-12});
      if(cur===6)R.label([x,y0+H*.2,0],'real cost replaces it',{fs:12,c:P.c5,dy:-28,wide:1})}
    // 3. rate limit: ten slots of this 60 s window (illustrative: three already used), the new request fills one
    {const a=sa(2),x=XS[2],y0=SY+SH;for(let j=0;j<10;j++){const on=j<3||(j===3&&k>=2);R.box([x,y0+j*.075,0],[.3,.06,.3],{fill:on?(j===3?mix(P.paper,P.acc,.7):mix(P.paper,P.c6,.55)):P.paper,a:a*(on?1:.5),shadow:false,lw:.6})}
      if(cur===2)R.label([x,y0+.8,0],'+1 in this window ≤ rpm_limit',{fs:12.5,b:1,c:P.c6,dy:-12})}
    // the upstreams
    const U=UP(),ua=cur>=3&&cur<=5?1:.4;
    R.glass([UX-.8,0,-1.75],[1.6,0,0],[0,0,1.6],{c:P.c1,a:ua*.6,nu:4,nv:4,th:.02});R.label([UX,0,-1.75],'group "chat"',{fs:12.5,b:1,c:P.c1,dy:-10,a:ua*la(UX)});
    R.glass([UX-.8,0,.85],[1.6,0,0],[0,0,.8],{c:P.c4,a:ua*.6,nu:4,nv:2,th:.02});R.label([UX,0,1.65],'fallback "chat-backup"',{fs:12.5,b:1,c:P.c4,dy:14,a:ua*la(UX),wide:1});
    const dep={};[...U.chat,...U.back].forEach(([n,z])=>{dep[n]=[UX,.55,z];const bad=mode==='fail'&&n==='C'&&k>=5;
      R.box([UX,0,z],[.62,.5,.5],{a:ua,fill:bad?mix(P.paper,P.bad,.45):n==='A'?mix(P.paper,P.c1,.25):P.paper});R.label([UX+.34,.25,z],'deployment '+n,{al:'left',dx:6,fs:12,a:ua*la(UX),grp:'dep'})});
    R.box([UX,0,2.55],[.62,.32,.4],{a:.3});R.label([UX+.34,.16,2.55],'OpenRouter: one more upstream',{al:'left',dx:6,fs:12,c:P.mute,a:.6*la(UX),grp:'dep'});
    // 4. route: dashed paths to every deployment of the group; the chosen one carries the request
    const pick=mode==='fail'?'C':'A';
    if(cur===3){U.chat.forEach(([n])=>R.arc(top(3),dep[n],.35,{c:n===pick?P.acc:P.mute,w:1.6,dash:[4,4],a:.8}));R.label(dep[pick],'picked: '+pick,{fs:12.5,b:1,c:P.acc,dy:-26})}
    // 5. cache: a glass memo; a hit sends the stored answer straight back
    {const a=sa(4),x=XS[4];R.glass([x-.24,SY+SH,0],[.48,0,0],[0,.5,0],{c:P.c3,a:a*.85,nu:3,nv:3});
      if(cur===4){if(mode==='hit'){R.flowArc([x,SY+SH+.3,0],[-5.6,.5,-1.1],.9,{c:P.good,a:.9,r:.065,speed:1.5});R.label([x,SY+SH+.55,0],'hit · 0.083 s · no tokens',{fs:12.5,b:1,c:P.good,dy:-12})}
        else R.label([x,SY+SH+.55,0],'miss',{fs:12.5,b:1,c:P.mute,dy:-12})}}
    // 6. the call, and in the fail scenario the retries and the fallback
    if(cur===5&&mode==='miss'){R.flowArc(top(5),dep.A,.5,{c:P.acc,a:.9,r:.06});R.flowArc(dep.A,top(5),.25,{c:P.good,a:at(k,e,5)*.9,r:.06,speed:1.2});R.label(dep.A,'answers in 1.1 to 3.6 s',{fs:12.5,b:1,c:P.good,dy:-26})}
    if(cur===5&&mode==='hit')R.label(top(5),'no provider call',{fs:12.5,c:P.mute,dy:-30});
    if(mode==='fail'&&k>=5&&k<=7){const tries=k===5?1:3;for(let j=0;j<tries;j++)R.flowArc(top(5),dep.C,.45+.2*j,{c:P.bad,a:.85,r:.055,speed:1.3});
      R.label(dep.C,k===5?'503':'503 × 3 · never cooled down',{fs:12.5,b:1,c:P.bad,dy:-26});
      if(k===7){R.flowArc(top(5),dep.A,.7,{c:P.acc,a:.9,r:.06});R.flowArc(dep.A,top(5),.35,{c:P.good,a:.9*e,r:.06,speed:1.2});R.label(dep.A,'fallback answers · 5.5 s per request',{fs:12.5,b:1,c:P.good,dy:22})}}
    // 7. settle and log: one usage row more, and the answer goes back to the caller
    {const a=sa(6),x=XS[6],n=cur===6?3+Math.round(e):3;for(let j=0;j<n;j++)R.box([x,SY+SH+j*.07,0],[.4,.05,.26],{fill:j===3?mix(P.paper,P.acc,.6):mix(P.paper,P.mute,.25),a,shadow:false,lw:.6});
      if(cur===6){R.flowArc(top(6),[-5.6,.5,-1.1],1.0,{c:P.good,a:.9,r:.065,speed:1.5});R.label([x,SY+SH+.35,0],mode==='hit'?'logged: cache hit, cost 0':'one usage event',{fs:12.5,b:1,c:P.acc,dy:-14})}}
  }
  const st=S3.stage({id:'stg-req',list:'sx-req-miss',fig:'Fig. 1 · one request through a LiteLLM gateway',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1300,hold:4400,draw,
    view:k=>VIEW(k)});
  const segEl=document.getElementById('fgw-reqmode');
  RD.seg(segEl,m=>{mode=m;['miss','hit','fail'].forEach(x=>document.getElementById('sx-req-'+x).hidden=x!==m);st.list('sx-req-'+m)});
})();
