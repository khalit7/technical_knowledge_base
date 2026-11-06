// ---- Scene: Fig. 1, four kinds of question and the structure that answers each (renderer v2). Schematic shapes on the topic's own examples:
// the HotpotQA bridge question of section 2 (paragraph A the 1945 film, B Shirley Temple), and Spider's concert_singer, whose singer table has
// window.GR.kuzu.counts.Singer rows (the one count drawn). Chunk, community and bead counts are layout, said on the page. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.GR)return;const {mix,at}=S3;
  const NS=(GR.kuzu&&GR.kuzu.counts&&GR.kuzu.counts.Singer)||6,SX=[-6,-2,2,6];
  const CL=[[-.7,-1.2],[.75,-1.25],[-.85,.05],[.8,0],[0,-.55]];   // five community clusters around the global station (layout)
  const BEAD=[[0,0],[.22,.1],[-.2,.14],[.08,-.22],[-.14,-.18]];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-8,8,-2.8,2.6,.5);
    // k 0: all four; k 1..4: one station in close-up, the rest recede
    const on=i=>k===0?1:i===k-1?1:.18,act=i=>k===i+1,ea=i=>act(i)?e:k>i+1?1:0;
    // station floors: the three this page builds carry the highlight colour
    SX.forEach((x,i)=>{const c=i?P.acc:P.mute;R.quad([[x-1.8,0,-2.2],[x+1.8,0,-2.2],[x+1.8,0,1.95],[x-1.8,0,1.95]],{fill:c,fa:.05,ec:c,ea:.3,a:on(i)});
      R.label([x,0,1.95],['Local','Multi-hop','Global','Aggregate'][i],{fs:13.5,b:1,dy:15,c:i?P.acc:P.ink,a:on(i)>.5?1:.3})});
    const lab=(i,pt,t,o)=>{if(k>0&&!act(i))return;R.label(pt,t,k===0?Object.assign({wide:1},o):o)};
    const qb=(x,a)=>{R.glow([x,1.55,-1.9],.32,{c:P.c2,a});R.ball([x,1.55,-1.9],.1,{c:P.c2,a});if(a>.5)R.label([x,1.55,-1.9],'question',{mono:true,fs:12,dy:-16,c:P.c2,a,wide:1})};
    // 1. local: a ranked list of chunks; the two that resemble the question rise
    {const x=SX[0],a=on(0),u=ea(0);qb(x,a);
      for(let j=0;j<7;j++){const top=j<2,lift=top?.28*u:0,z=-1.45+j*.48;R.box([x,lift,z],[2.1,.1,.32],{fill:top&&u>0?mix(P.paper,P.c1,.55*u+.15):P.paper,a:a*(top?1:1-.45*u),shadow:!lift});
        if(top&&act(0))R.flowArc([x,1.45,-1.9],[x+(j?.5:-.5),lift+.12,z],.3,{c:P.c1,a:u,r:.06,n:6})}
      if(act(0))R.label([x+1.1,.4,-1.45],'top k: similar chunks',{al:'left',dx:6,fs:12,c:P.c1,a:u,wide:1})}
    // 2. multi-hop: A names the bridge entity; B is about it and shares no word with the question
    {const x=SX[1],a=on(1),u=ea(1),A=[x-1.05,0,.75],B=[x+1.05,0,.75],N=[x,.95,-.45];qb(x,a);
      R.box(A,[1.15,.12,.75],{fill:mix(P.paper,P.c3,.35),a});R.box(B,[1.15,.12,.75],{fill:mix(P.paper,P.c2,.35),a});
      lab(1,[A[0],.12,A[2]],'A · Kiss and Tell',{fs:12,dy:20,a});lab(1,[B[0],.12,B[2]],'B · Shirley Temple',{fs:12,dy:20,a});
      R.line([[A[0],.12,A[2]],N],{c:P.acc,w:2,a:a*(k===0?1:.35+.65*u)});R.line([N,[B[0],.12,B[2]]],{c:P.acc,w:2,a:a*(k===0?1:.35+.65*u)});
      R.glow(N,.3,{c:P.acc,a:a*(.5+.5*u)});R.ball(N,.13,{c:P.acc,a});lab(1,N,'Shirley Temple',{fs:12.5,b:1,c:P.acc,dy:-18,a});
      if(act(1)){R.flowArc([x,1.45,-1.9],[A[0],.15,A[2]],.4,{c:P.c2,a:u,r:.06,n:6});
        R.flow([[A[0],.14,A[2]],N,[B[0],.14,B[2]]],{c:P.acc,a:Math.max(0,u*2-1),r:.07,n:9,speed:1.2})}}
    // 3. global: communities of nodes, each summarised by a report (glass); the question is mapped over every report, the points reduced
    {const x=SX[2],a=on(2),u=ea(2),cols=[P.c1,P.c3,P.c5,P.c4,P.c6],RD=[x,0,1.25];qb(x,a);
      CL.forEach(([dx,dz],i)=>{const c=cols[i],cx=x+dx,cz=dz;BEAD.forEach(([bx,bz])=>R.ball([cx+bx,.09,cz+bz],.075,{c,a}));
        R.glass([cx-.32,.42,cz],[.64,0,0],[0,.42,0],{c,a:a*.9,nu:3,nv:3});
        if(act(2)){R.flowArc([x,1.45,-1.9],[cx,.86,cz],.25,{c:P.c2,a:Math.min(1,u*2),r:.05,n:5,speed:1.3});
          R.flowArc([cx,.63,cz],[RD[0],.5,RD[2]],.35,{c:P.acc,a:Math.max(0,u*2-1),r:.05,n:5,speed:1.1})}});
      R.box(RD,[.6,.5*(k===0?1:Math.max(.15,u)),.42],{fill:mix(P.paper,P.acc,.35),a});lab(2,[RD[0],.5,RD[2]],'reduce',{mono:true,fs:12,dy:-12,a,c:P.acc});
      if(act(2))R.label([x+.75,.86,0],'a report per community',{al:'left',dx:30,fs:12,c:P.mute,a:u,wide:1})}
    // 4. aggregate: the schema goes in the prompt, SQL comes out, and the database reads every row of singer
    {const x=SX[3],a=on(3),u=ea(3),CT=[x+.95,0,1.2];qb(x,a);
      R.glass([x-1.45,.05,-1.15],[.9,0,0],[0,.75,0],{c:P.c4,a:a*.9,nu:2,nv:5});lab(3,[x-1,.82,-1.15],'schema',{mono:true,fs:12,dy:-10,c:P.c4,a});
      R.box([x+.25,0,-1.35],[1.3,.08,.3],{fill:mix(P.paper,P.ink,.12),a});lab(3,[x+.25,.08,-1.35],'singer',{mono:true,fs:12,dy:-10,a});
      for(let j=0;j<NS;j++){const z=-.95+j*.36;R.box([x+.25,0,z],[1.3,.08,.26],{fill:act(3)?mix(P.paper,P.acc,.35*u):P.paper,a});
        if(act(3))R.flowArc([x+.25,.1,z],[CT[0],.45,CT[2]],.25,{c:P.acc,a:Math.max(0,u*2-1),r:.05,n:4,speed:1.1})}
      if(act(3))R.flowArc([x,1.45,-1.9],[x-1,.8,-1.15],.2,{c:P.c2,a:Math.min(1,u*2),r:.06,n:5});
      R.box(CT,[.55,.45*(k===0?1:Math.max(.15,u)),.45],{fill:mix(P.paper,P.acc,.35),a});lab(3,[CT[0],.45,CT[2]],'COUNT(*)',{mono:true,fs:12,dy:-12,c:P.acc,a});
      if(act(3))R.label([x+.9,.1,-.95],NS+' rows, all read',{al:'left',dx:8,fs:12,c:P.acc,a:u,wide:1})}
  }
  const full={cam:[0,.78],bounds:[[-8,0,-2.3],[8,1.8,2.1]]},near=i=>({cam:[.18,.62],bounds:[[SX[i]-2.1,0,-2.3],[SX[i]+2.1,1.8,2.15]]});
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · four questions, four structures (schematic)',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[12,8,22,8]:[16,14,26,14],view:k=>k===0?full:near(k-1)});
})();
