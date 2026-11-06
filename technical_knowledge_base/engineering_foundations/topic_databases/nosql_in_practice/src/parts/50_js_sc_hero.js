// ---- Scene, Fig. 1 (top): the six families side by side, each laid out so one planned question reads one place (renderer v2) ----
// Step 1 shows all six; each later step glides in close on one family and plays its planned question: the part it reads turns orange and streams to the app.
// Shapes are illustrative; the numbers in the labels are this page's measurements (GET latency, the real shortest path from inputs/graph.json).
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const G=(window.NQ&&NQ.graph&&NQ.graph.neo4j&&NQ.graph.neo4j.shortest)||{path:['a','','','','b'],hops:4};
  const RG=(window.NQ&&NQ.redis)||{};
  const IS=[[-6,-2.4],[0,-2.4],[6,-2.4],[-6,2.4],[0,2.4],[6,2.4]];
  const TITLE=['Redis','DynamoDB','Document','Wide-column','Time series','Graph'];
  const appAt=(i)=>[IS[i][0]+2.05,0,IS[i][1]+1.25];
  function app(R,i,a,f){const P=R.P,p=appAt(i);R.box(p,[.55,.4,.45],{fill:mix(P.paper,P.c2,.25*f),a});if(f>.05)R.label([p[0],.4,p[2]],'app',{fs:12,dy:-10,c:P.mute,a:a*f})}
  // 1. Redis: keys pointing at data structures; one command on the sorted set
  function kv(R,a,f,lab){const P=R.P,[cx,cz]=IS[0],ks=[['user:7:bucket',-0.9],['lb',0],['jobs',0.9]];
    ks.forEach(([nm,dz],j)=>{const on=j===1;R.box([cx-1.55,0,cz+dz],[.8,.22,.45],{fill:on?mix(P.paper,P.c1,.5*f):P.paper,a});
      R.line([[cx-1.12,.11,cz+dz],[cx-.55,.11,cz+dz]],{c:P.mute,w:1.2,a:a*.8,head:5});if(lab)R.label([cx-1.55,.22,cz+dz],nm,{mono:true,fs:12,dy:-9,a:a*f,c:on?P.c1:P.ink})});
    // hash: two fields
    [0,1].forEach(j=>R.box([cx-.2+j*.62,0,cz-.9],[.52,.3,.45],{a}));
    // sorted set: members in score order
    const hs=[.18,.3,.42,.55,.7,.86];hs.forEach((h,j)=>{const on=j===3;R.box([cx-.25+j*.36,0,cz],[.28,h,.4],{fill:on?mix(P.paper,P.c2,f):P.paper,a,lw:.7})});
    // stream: an append-only log
    for(let j=0;j<5;j++)R.box([cx-.25+j*.38,0,cz+.9],[.1,.4,.42],{a,fill:mix(P.paper,P.c4,.25)});
    if(f>0){R.flowArc([cx-.25+3*.36,.6,cz],[appAt(0)[0],.45,appAt(0)[2]],.7,{c:P.c2,a:f,r:.06,n:7});
      if(lab){R.label([cx-.25+3*.36,.6,cz],'ZREVRANK lb: one atomic command',{fs:12.5,b:1,dy:-24,c:P.c2,a:f});
        R.label([cx,0,cz+1.45],'sorted set · hash · stream, all in memory',{fs:12,dy:14,c:P.mute,a:f,wide:1});
        if(RG.get_us)R.label([appAt(0)[0],0,appAt(0)[2]],'GET median '+RG.get_us.p50+' µs',{mono:true,fs:12,dy:16,c:P.mute,a:f,wide:1})}}
    app(R,0,a,f)}
  // 2. DynamoDB: the partition key hashed to a partition; one item collection sorted by sort key; a Query reads the newest items
  function ddb(R,a,f,lab){const P=R.P,[cx,cz]=IS[1],xs=[-1.5,-.5,.5,1.5];
    xs.forEach((dx,j)=>{const own=j===1;for(let s=0;s<6;s++){const top=own&&s>=3;
      R.box([cx+dx,s*.2+(top?.12*f:0),cz],[.72,.16,.9],{fill:own?mix(P.paper,top?P.c2:P.c1,top?f:.4*f):P.paper,a,lw:.6,shadow:s===0})}});
    if(f>0){const pk=[cx-.5,2.0,cz-.2];R.ball(pk,.1,{c:P.c1,a:f});R.flow([pk,[cx-.5,1.35,cz]],{c:P.c1,a:f,r:.05,n:4});
      R.flowArc([cx-.5,1.3,cz+.2],[appAt(1)[0],.45,appAt(1)[2]],.6,{c:P.c2,a:f,r:.06,n:8});
      if(lab){R.label(pk,'hash(PK = CHAT#7)',{mono:true,fs:12,dy:-14,b:1,c:P.c1,a:f});
        R.label([cx+1.5,1.2,cz],'other partitions',{fs:12,dy:-10,c:P.mute,a:f,wide:1});
        R.label([cx-.5,0,cz+.45],'CHAT#7, sorted by SK',{fs:12,dy:14,c:P.c1,a:f});
        R.label([appAt(1)[0],0,appAt(1)[2]],'Query, newest first: 1 request',{fs:12,dy:16,c:P.c2,b:1,a:f,wide:1})}}
    app(R,1,a,f)}
  // 3. Document: one chat document read whole, a bounded subset embedded, the messages referenced
  function doc(R,a,f,lab){const P=R.P,[cx,cz]=IS[2],dx=cx-.6,tint=c=>mix(P.paper,c,.25*f);
    R.box([dx,0,cz],[2.2,.14,1.9],{fill:mix(P.paper,P.c2,.7*f),a});
    R.box([dx-.6,.14,cz-.5],[.7,.16,.5],{fill:tint(P.c2),a,shadow:false});R.box([dx+.4,.14,cz-.5],[.9,.16,.5],{fill:tint(P.c2),a,shadow:false});
    R.box([dx,.14,cz+.35],[1.6,.08,.7],{fill:tint(P.c2),a,shadow:false});for(let j=0;j<3;j++)R.box([dx-.45+j*.45,.22,cz+.35],[.3,.18,.4],{fill:mix(P.paper,P.c2,.55*f),a,shadow:false,lw:.6});
    for(let j=0;j<4;j++){const p=[cx+1.25,0,cz-.95+j*.55];R.box(p,[.42,.12,.4],{a,lw:.6});R.line([[dx+1.1,.08,cz-.1+j*.1],[p[0]-.21,.06,p[2]]],{c:P.mute,w:1,a:a*.6,dash:[3,3]})}
    if(f>0){R.flowArc([dx,.4,cz],[appAt(2)[0],.45,appAt(2)[2]],.6,{c:P.c2,a:f,r:.06,n:8});
      if(lab){R.label([dx-.6,.3,cz-.5],'_id: 7',{mono:true,fs:12,dy:-10,a:f});R.label([dx+.4,.3,cz-.5],'title',{mono:true,fs:12,dy:-10,a:f});
        R.label([dx,.14,cz+.7],'last_3: [ ... ]',{mono:true,fs:12,dy:14,b:1,c:P.c2,a:f});
        R.label([cx+1.25,.12,cz-.95],'messages: one document each',{fs:12,dy:-12,c:P.mute,a:f,wide:1});
        R.label([dx,0,cz+.95],'read whole · at most 16 MiB',{fs:12,dy:14,c:P.c2,b:1,a:f})}}
    app(R,2,a,f)}
  // 4. Wide-column: the partition key hashed onto a ring of nodes, three replicas, rows sorted newest first
  function wide(R,a,f,lab){const P=R.P,[cx,cz]=IS[3],rx=cx-.7,r=1.15,ang=j=>-Math.PI/2+j*Math.PI/3,np=j=>[rx+r*Math.cos(ang(j)),0,cz+r*Math.sin(ang(j))];
    const pts=[];for(let i=0;i<=48;i++){const t=i/48*Math.PI*2;pts.push([rx+r*Math.cos(t),.02,cz+r*Math.sin(t)])}R.line(pts,{c:P.line,w:2,a});
    for(let j=0;j<6;j++){const rep=j>=1&&j<=3;R.box(np(j),[.38,.32,.38],{fill:rep?mix(P.paper,P.c1,.55*f):P.paper,a})}
    const tk=[rx+r*Math.cos(ang(.5)),.2,cz+r*Math.sin(ang(.5))];
    for(let s=0;s<5;s++){const top=s>=2;R.box([cx+1.35,s*.18,cz],[.9,.14,.7],{fill:top?mix(P.paper,P.c2,f):P.paper,a,lw:.6,shadow:s===0})}
    if(f>0){R.glow(tk,.3,{c:P.c1,a:f});[1,2,3].forEach(j=>R.flowArc(tk,[np(j)[0],.35,np(j)[2]],.25,{c:P.c1,a:f,r:.05,n:4}));
      R.flowArc([cx+1.35,.9,cz],[appAt(3)[0],.45,appAt(3)[2]],.4,{c:P.c2,a:f,r:.06,n:6});
      if(lab){R.label(tk,'token(7, 3)',{mono:true,fs:12,dy:-14,b:1,c:P.c1,a:f});R.label(np(2),'3 replicas',{fs:12,dy:18,c:P.c1,a:f});
        R.label([cx+1.35,.9,cz],'partition (7, 3), newest first',{fs:12,dy:-12,c:P.c2,b:1,a:f})}}
    app(R,3,a,f)}
  // 5. Time series: one chunk per day; the last hour reads today's chunk; retention drops whole old chunks
  function ts(R,a,f,lab){const P=R.P,[cx,cz]=IS[4],n=12,x=j=>cx-1.9+j*.31;
    for(let j=0;j<n;j++){const old=j<3,now=j===n-1;R.box([x(j),old?-.0:0,cz],[.24,.5,1.0],{fill:now?mix(P.paper,P.c2,f):P.paper,a:a*(old?1-.75*f:1),ec:old&&f>.3?P.bad:null,lw:.7})}
    if(f>0){R.flowArc([x(n-1),.55,cz],[appAt(4)[0],.45,appAt(4)[2]],.5,{c:P.c2,a:f,r:.06,n:6});
      R.line([[x(0)-.15,.03,cz+.62],[x(2)+.15,.03,cz+.62]],{c:P.bad,w:2.5,a:f});
      if(lab){R.label([x(1),0,cz+.62],'DROP old chunks',{fs:12,dy:14,c:P.bad,b:1,a:f});R.label([x(n-1),.55,cz],'last hour: one chunk',{fs:12,dy:-12,c:P.c2,b:1,a:f});
        R.label([x(6),.5,cz-.5],'one chunk per day, time runs left to right',{fs:12,dy:-12,c:P.mute,a:f,wide:1})}}
    app(R,4,a,f)}
  // 6. Graph: nodes and FRIEND relationships; the measured shortest path, followed pointer by pointer
  const GN=[[-1.8,.2],[-.9,-.7],[0,.1],[.9,-.6],[1.6,.4],[-1.1,.9],[.3,1.0],[-.1,-1.1],[1.1,-1.3]],PATH=[0,1,2,3,4],GE=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,2],[2,6],[6,4],[1,7],[7,3],[3,8],[5,6]];
  function graph(R,a,f,lab,e){const P=R.P,[cx,cz]=IS[5],np=j=>[cx-.4+GN[j][0]*.95,.35,cz+GN[j][1]*.95];
    GE.forEach(([u,v])=>{const on=PATH.indexOf(u)>=0&&PATH.indexOf(v)===PATH.indexOf(u)+1;R.line([np(u),np(v)],{c:on&&f>0?P.c2:P.line,w:on&&f>0?2.6:1.4,a})});
    GN.forEach((_,j)=>{const on=PATH.indexOf(j)>=0;R.box([np(j)[0],0,np(j)[2]],[.06,.3,.06],{a:a*.7,shadow:false});R.ball(np(j),.13,{c:on?mix(P.paper,P.c2,.3+.7*f):mix(P.paper,P.c1,.3),a})});
    if(f>0){const hp=Math.min(4,Math.floor(e*4.999));for(let h=0;h<=hp;h++)if(h<4)R.flow([np(PATH[h]),np(PATH[h+1])],{c:P.c2,a:f,r:.06,n:4});
      if(lab){R.label(np(0),G.path[0],{mono:true,fs:12,dy:-16,b:1,c:P.c2,a:f});R.label(np(4),G.path[G.path.length-1],{mono:true,fs:12,dy:-16,b:1,c:P.c2,a:f});
        R.label([cx-.4,0,cz+1.3],'shortest path: '+G.hops+' hops, pointer to pointer',{fs:12,dy:14,c:P.c2,b:1,a:f})}}}
  const FN=[kv,ddb,doc,wide,ts,graph];
  function draw(R,k,e){const P=R.P;R.grid(-9,9,-4.6,4.6,.5);
    FN.forEach((fn,i)=>{const foc=k===i+1,was=k>=1&&k-1!==i;let a=1;if(k>=1&&!foc)a=k===1?1-.8*e:.2;
      fn(R,a,foc?e:0,foc,e);
      if(k===0||(k===1&&!foc))R.label([IS[i][0],0,IS[i][1]+1.6],TITLE[i],{fs:13,b:1,dy:14,wide:1,a:k===0?1:1-e})});
  }
  const full={cam:[.18,.7],bounds:[[-8.4,0,-4],[8.4,1.2,4.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · six layouts, one planned question each',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4600,draw,
    // each family step moves in close on that family
    view:k=>{if(k===0)return full;const [cx,cz]=IS[k-1];return {cam:[.32,.62],bounds:[[cx-2.4,0,cz-1.8],[cx+2.5,1.6,cz+1.9]]}}});
})();
