// ---- Scene, Fig. 3 (section 6): one big Postgres against the same data sharded by user with Citus (3 workers, 32 shards), renderer v2 ----
// Shard placement (SC.citus.shardPort) and each shard's message count (SC.citus.shards, box height) are the measured cluster's;
// times are the measured medians (SC.citus.point, SC.citus.heavy). Which shard holds user 4242 is drawn on its real worker; the shard within it is illustrative.
(function(){
  if(!document.getElementById('stg-fan')||!window.SC)return;const {at,lerp,mix,cl}=S3;const C=SC.citus;
  const ports=[...new Set(C.shardPort)].sort(),W=ports.map(p=>C.shardPort.map((x,i)=>x===p?i:-1).filter(i=>i>=0));
  const mx=Math.max(...C.shards),tw=ports.indexOf(+C.user4242),tsh=W[tw][Math.floor(W[tw].length/2)];
  const ms=v=>v>=10?Math.round(v).toLocaleString('en-US'):v.toFixed(2);
  const T={ub:C.point.chat_list.big.p50,us:C.point.chat_list.citus.p50,mb:C.heavy.mention.big.ms,msd:C.heavy.mention.citus.ms};
  const APP=[0,0,2.7],CO=[0,0,1.15],WX=[-3,0,3],WZ=-1.15,BIG=[0,0,-.4],BS=[3.4,1.15,1.5];
  const pos=(w,j)=>[WX[w]-.78+(j%4)*.52,.12,WZ-.55+Math.floor(j/4)*.55];
  // keyed queries spread over the cluster (step 6): one shard on each of six different spots
  const KEYED=[[0,1],[1,6],[2,3],[0,9],[1,2],[2,8]];
  const half1=e=>cl(1-2*e,0,1),half2=e=>cl(2*e-1,0,1);
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,3.4,.5);
    R.box(APP,[1.6,.3,.6],{fill:mix(P.paper,P.ink,.06)});R.label([APP[0],.32,APP[2]],'application',{fs:12.5,b:1,dy:-12});
    // before: one Postgres holding all 10M messages
    const ba=k<=1?1:k===2?half1(e):0;
    if(ba>0){R.box(BIG,BS,{fill:mix(P.paper,P.c3,.32),a:ba});R.label([BIG[0],BS[1],BIG[2]],R.W<520?'one Postgres':'one Postgres · all 10M messages',{fs:12.5,b:1,dy:-14,a:ba,c:P.c3});
      const front=[BIG[0],BS[1]*.5,BIG[2]+BS[2]/2+.02];
      if(k===0){R.flowArc([APP[0]-.25,.3,APP[2]-.2],[front[0]-.25,front[1],front[2]],.35,{c:P.acc,a:e,r:.07,speed:1.2});
        R.flowArc([front[0]+.25,front[1],front[2]],[APP[0]+.25,.3,APP[2]-.2],.35,{c:P.good,a:e,r:.06,speed:1.2,n:5});
        R.glow([front[0]-.25,front[1],front[2]],.35,{c:P.acc,a:e*.8});
        R.label([BIG[0]+BS[0]/2,BS[1]*.5,BIG[2]],'index lookup · '+ms(T.ub)+' ms',{al:'left',dx:10,mono:true,fs:12,b:1,c:P.acc,a:e,wide:1})}
      if(k===1){R.flowArc([APP[0],.3,APP[2]-.2],[front[0],front[1],front[2]],.35,{c:P.acc,a:e,r:.07,speed:1.2});
        // three scanning processes (2 parallel workers plus the leader) sweep the whole table
        [-.45,0,.45].forEach(dz=>R.flow([[BIG[0]-BS[0]/2+.15,BS[1]+.04,BIG[2]+dz],[BIG[0]+BS[0]/2-.15,BS[1]+.04,BIG[2]+dz]],{c:P.c2,a:e,r:.075,speed:1.6,n:9}));
        R.label([BIG[0]+BS[0]/2,BS[1]*.5,BIG[2]],'full scan · '+ms(T.mb)+' ms',{al:'left',dx:10,mono:true,fs:12,b:1,c:P.c2,a:e,wide:1})}}
    // after: the coordinator and three workers with their 32 shards
    const sa=k===2?half2(e):k>2?1:0;
    if(sa>0){R.box(CO,[1.7,.3,.55],{fill:mix(P.paper,P.ink,.06),a:sa});R.label([CO[0],.32,CO[2]],'coordinator',{fs:12.5,b:1,dy:-12,a:sa});
      W.forEach((sh,w)=>{R.box([WX[w],0,WZ],[2.35,.12,1.85],{fill:mix(P.paper,P.ink,.05),a:sa,dz:4});
        R.label([WX[w],1.05,WZ-.95],(R.W<520?'w'+(w+1)+' · '+sh.length:'worker '+(w+1)+' · '+sh.length+' shards'),{fs:12,b:1,dy:-8,a:sa});
        sh.forEach((si,j)=>{const hit=k===3?si===tsh:k===4?true:k===5?KEYED.some(([a,b])=>a===w&&b===j):false;
          const recede=k===3||k===5?(hit?1:.35):1,h=.25+.75*C.shards[si]/mx;
          R.box(pos(w,j),[.4,h,.36],{fill:hit?mix(P.paper,P.c2,.55):mix(P.paper,P.c2,.2),a:sa*recede,lw:.7})})})}
    const cTop=[CO[0],.3,CO[2]];
    if(k>=3){R.flow([[APP[0],.3,APP[2]-.3],[CO[0],.3,CO[2]+.3]],{c:P.acc,a:k===3||k===4?e:.6,r:.07,speed:1.1})}
    if(k===3){const w=tw,j=W[tw].indexOf(tsh),p=pos(w,j),tp=[p[0],p[1]+.25+.75*C.shards[tsh]/mx,p[2]];
      R.flowArc([cTop[0]-.4,cTop[1],cTop[2]],tp,.6,{c:P.acc,a:e,r:.07,speed:1.3});R.flowArc([tp[0]+.15,tp[1],tp[2]],[cTop[0]-.2,cTop[1],cTop[2]],.6,{c:P.good,a:e,r:.06,speed:1.3,n:6});
      R.glow(tp,.45,{c:P.c2,a:e*.7});R.label([CO[0]+.85,.15,CO[2]],'Task Count: 1 · '+ms(T.us)+' ms',{al:'left',dx:8,mono:true,fs:12,b:1,c:P.acc,a:e,wide:1})}
    if(k===4){WX.forEach((x,w)=>{R.flowArc([cTop[0]+(w-1)*.4,cTop[1],cTop[2]],[x,.9,WZ+.3],.55,{c:P.acc,a:e,r:.07,speed:1.3});
        [-.27,.28].forEach(dz=>R.flow([[x-1,1.05,WZ+dz],[x+1,1.05,WZ+dz]],{c:P.c2,a:e,r:.06,speed:1.4,n:6}));
        R.flowArc([x+.2,.9,WZ+.3],[cTop[0]+(w-1)*.4+.15,cTop[1],cTop[2]],.55,{c:P.good,a:e,r:.055,speed:1.3,n:5})});
      R.label([CO[0]+.85,.15,CO[2]],'Task Count: 32 · '+ms(T.msd)+' ms',{al:'left',dx:8,mono:true,fs:12,b:1,c:P.acc,a:e,wide:1})}
    if(k===5){KEYED.forEach(([w,j],i)=>{const si=W[w][j],p=pos(w,j),tp=[p[0],p[1]+.25+.75*C.shards[si]/mx,p[2]];
        R.flowArc([cTop[0]+(i-2.5)*.18,cTop[1],cTop[2]],tp,.5,{c:P.acc,a:e*.85,r:.055,speed:1.2,n:6})});
      WX.forEach((x,w)=>R.flowArc([cTop[0]+(w-1)*.5,cTop[1],cTop[2]-.2],[x+.6,.95,WZ-.2],.75,{c:P.c2,a:e*.7,r:.06,speed:1.2,n:7}));
      R.label([CO[0]+.85,.15,CO[2]],'keyed: one shard each',{al:'left',dx:8,fs:12,b:1,c:P.acc,a:e,wide:1});R.label([CO[0]+.85,.15,CO[2]],'scatter: all 32',{al:'left',dx:8,dy:18,fs:12,b:1,c:P.c2,a:e,wide:1})}
  }
  const full={cam:[.18,.68],bounds:[[-4.4,0,-2.2],[4.4,1.3,2.9]]};
  S3.stage({id:'stg-fan',list:'sx-fan',fig:'Fig. 3 · one node against 32 shards',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    // steps 1 and 2 are about the one server; step 4 moves in on the one shard the keyed query reaches
    view:k=>k<=1?{cam:[.2,.55],bounds:[[-2.9,0,-1.3],[2.9,1.3,2.9]]}:k===3?{cam:[.3,.62],bounds:[[-4.4,0,-2.1],[1.4,1.2,2.9]]}:full});
})();
