// ---- Scene, Fig. 2: one write through the whole stack, eleven steps, each owned by a child page (renderer v2) ----
// Schematic: the order of events is Postgres's documented behaviour (the step list); Ben's balance comes from the sample rows (window.RDD, user 2).
// Left: the application (app server, its pool, the Redis cache). Middle: Postgres as glass layers (SQL, locks and MVCC, planner, buffer pool in RAM)
// above the disk (write-ahead log in front, table and index files behind). Right: the copies (replica, column store, search index). Back: shards.
(function(){
  if(!document.getElementById('stg-write'))return;const {at,off,lerp,mix}=S3;
  const ben=(window.RDD&&RDD.credits.rows.find(r=>r[0]===2)||[2,1])[1];
  const APP=[-5.2,0,.4],PL=-3.75,RED=[-5.2,0,-2],X0=-2.2,X1=2.2,Z0=-1.15,Z1=1.05;
  const LY={sql:3.7,lock:2.85,plan:2.0,buf:1.15},WZ=1.95,REP=[4.6,0,-2],COL=[4.6,0,.25],SRC=[4.6,0,2.2],SHZ=-4.1,SHX=[-1.7,0,1.7];
  // buffer pool pages: 3 rows x 5; Ben's credits page and a messages index page
  const PG=[];for(let r=0;r<3;r++)for(let c=0;c<5;c++)PG.push([-1.6+c*.8,LY.buf,-.75+r*.7]);
  const BENP=PG[6],IDXP=PG[12],FILE=[.8,0,-.6];
  // which part each step is about: 0 app, 1 sql, 2 lock, 3 plan, 4 buf, 5 wal, 6 rep, 7 cache, 8 copies, 9 cleanup, 10 shards
  function draw(R,k,e){const P=R.P,narrow=R.W<520;R.grid(-6.5,6,-5,3,.5);
    const A=(on)=>on?1:.22,act=(...ks)=>ks.includes(k),pgA=k===10?.06:1;
    // labels only for the parts the current view frames (a label outside the view would be clamped to the canvas edge)
    const Z={app:[0,1,2,3,4,5,7,9,10],pg:[1,2,3,4,5,9],wal:[1,2,3,4,5,6,8,9],copy:[6,8]},zv=z=>Z[z].includes(k)?1:0;
    // ---- the application ----
    const aApp=A(act(0,7,10));
    R.box(APP,[1.2,.75,1],{fill:mix(P.paper,P.mute,.12),a:aApp});R.label([APP[0],.75,APP[2]],'app server',{fs:12.5,b:act(0),dy:-12,a:Math.max(.5,aApp)*zv('app')});
    [-.45,-.05,.35,.75].forEach((z,i)=>R.box([PL,0,z],[.22,.55,.22],{fill:i===1&&k===0?P.acc:mix(P.paper,P.c1,.2),a:A(act(0))}));
    if(k)R.label([PL,.55,-.55],'pool',{fs:12,c:P.mute,dy:-10,a:.4*zv('app'),grp:'pg'});
    R.box(RED,[1.2,.45,.9],{fill:mix(P.paper,P.c4,.3),a:A(act(7))});R.label([RED[0],.45,RED[2]],'Redis cache',{fs:12.5,b:act(7),c:P.c4,dy:-22,a:(act(7)?1:.45)*zv('app')});
    const cached=k<7?1:k===7?1-e:0;if(cached>0)R.box([RED[0],.45,RED[2]],[.6,.18,.45],{fill:P.c4,a:cached*A(act(7)),shadow:false});
    if(k===0){R.flowArc([APP[0]+.6,.45,APP[2]],[PL,.6,-.05],.3,{c:P.acc,a:e,r:.07,n:6});R.label([PL,.6,-.05],'a pooled connection',{fs:12,b:1,c:P.acc,dy:-26,a:e})}
    // ---- Postgres: four glass layers over the disk ----
    const plate=(y,c,on,nm,key)=>{R.glass([X0,y,Z0],[X1-X0,0,0],[0,0,Z1-Z0],{c,a:(on?.95:.28)*pgA,nu:5,nv:3,th:.03});
      R.label([X0,y,(Z0+Z1)/2],nm,{al:'right',dx:-8,mono:true,fs:12,b:on,c:on?c:P.mute,a:(on?1:.55)*zv('pg')*pgA,grp:'pg'})};
    plate(LY.sql,P.c2,act(1),'SQL, constraints');plate(LY.lock,P.c5,act(2),'locks, MVCC');plate(LY.plan,P.c6,act(3),'planner');plate(LY.buf,P.c1,act(4,9),'buffer pool (RAM)');
    R.label([0,LY.sql+.1,Z0],'Postgres',{fs:13,b:1,c:P.c1,dy:-14,a:act(1,2,3,4,5,9)?1:0});
    // the disk: write-ahead log in front, table and index files behind
    const nW=k<5?7:8;for(let i=0;i<nW;i++){const nu=i===7,a=nu?(k===5?e:1)*A(act(5,6,8)):A(act(5,6,8,9))*.9;
      R.box([-1.8+i*.42,0,WZ],[.34,.16,.36],{fill:nu?P.c2:mix(P.paper,P.c2,.3),a,lw:.6})}
    if(k===5)R.glow([-1.8+7*.42,.1,WZ],.45,{c:P.c2,a:e});
    R.label([X0,0,WZ],'write-ahead log',{al:'right',dx:-8,mono:true,fs:12,b:act(5),c:act(5)?P.c2:P.mute,a:(act(5,6,8)?1:.55)*zv('wal'),grp:'pg'});
    for(let i=0;i<3;i++)for(let j=0;j<6;j++)R.box([-1.75+j*.6,0,-1.2+i*.5],[.5,.08,.4],{fill:mix(P.paper,P.line,.35),a:A(act(9))*.9*pgA,shadow:false,lw:.5});
    R.label([X1,0,-.7],'table and index files',{al:'left',dx:8,mono:true,fs:12,c:P.mute,a:(act(9)?1:.5)*zv('pg')*pgA,grp:'disk'});
    // step 2: the statements arrive at the top layer
    if(k===1){R.flowArc([PL,.6,-.05],[-.9,LY.sql+.05,.2],.6,{c:P.c2,a:e,r:.07});
      R.box([-.9,LY.sql+.03,.2],[.9,.14,.5],{fill:mix(P.paper,P.c2,.5),a:e});R.box([1.1,LY.sql+.03,-.3],[.9,.14,.5],{fill:mix(P.paper,P.c2,.5),a:at(k,e,1)});
      R.label([-.9,LY.sql+.17,.2],'UPDATE credits',{mono:true,fs:12,b:1,dy:16,a:e});R.label([1.1,LY.sql+.17,-.3],'INSERT messages',{mono:true,fs:12,b:1,dy:-14,a:e,wide:1})}
    // step 3: Ben's credits row locked; a second tab waits at the edge
    if(k===2){const rp=[.2,LY.lock+.03,0];R.box(rp,[1,.18,.55],{fill:mix(P.paper,P.c5,.45)});R.box([rp[0],rp[1]+.18,rp[2]],[.28,.2,.22],{fill:P.c5,a:e});
      R.label([rp[0],rp[1]+.4,rp[2]],"Ben's credits row, locked",{fs:12,b:1,c:P.c5,dy:-12});
      R.flowArc([PL,.6,-.05],[-1.1,LY.lock+.2,.75],.5,{c:P.bad,a:e,r:.06,n:6});R.glow([-1.1,LY.lock+.2,.75],.35,{c:P.bad,a:e});R.label([-1.1,LY.lock+.2,.75],'second tab waits',{fs:12,c:P.bad,a:e,dy:20,wide:1})}
    // step 4: the planner picks the index on user_id over reading the whole table
    if(k===3){const y=LY.plan+.03,t=[[-.3,0],[-.75,.5],[.15,.5]];t.forEach(([x,dz],i)=>R.box([x,y,-.5+dz],[.36,.14,.3],{fill:mix(P.paper,P.c6,i?.35:.6),a:e}));
      R.line([[-.3,y+.07,-.5],[-.75,y+.07,0]],{c:P.c6,w:1.5,a:e});R.line([[-.3,y+.07,-.5],[.15,y+.07,0]],{c:P.c6,w:1.5,a:e});
      R.label([-.3,y+.14,-.5],'index on user_id',{fs:12,b:1,c:P.c6,dy:-12,a:e});
      R.box([1.3,y,.6],[1.3,.1,.35],{fill:mix(P.paper,P.line,.4),a:.35*e});R.label([1.3,y+.1,.6],'whole table: not chosen',{fs:12,c:P.mute,a:e,dy:-12,wide:1})}
    // the buffer pool's pages, Ben's row versions in one of them
    PG.forEach(p=>{const ben=p===BENP,ix=p===IDXP,hot=(ben||ix)&&k>=4&&k<9;R.box(p,[.62,.1,.52],{fill:hot?mix(P.paper,P.c1,.55):P.paper,a:A(act(4,9))*(hot?1:.9)*pgA,shadow:false,lw:.6})});
    const vOld=k<9?1:k===9?1-e:0,vNew=k<4?0:k===4?e:1;
    if(vOld>0)R.box([BENP[0]-.14,LY.buf+.1,BENP[2]],[.22,.24,.22],{fill:mix(P.paper,P.c1,.25),a:vOld*A(act(4,9))*pgA,shadow:false});
    if(vNew>0)R.box([BENP[0]+.14,LY.buf+.1,BENP[2]],[.22,.24,.22],{fill:P.c1,a:vNew*A(act(4,9))*pgA,shadow:false});
    if(k===4){R.flow([[-.9,LY.sql,.2],[-.3,LY.lock,.1],[BENP[0]+.14,LY.buf+.4,BENP[2]]],{c:P.c1,a:e,r:.07});R.glow([IDXP[0],LY.buf+.1,IDXP[2]],.4,{c:P.c1,a:e});
      R.label([BENP[0],LY.buf+.34,BENP[2]],'balance '+ben+' (old) · '+(ben-1)+' (new)',{mono:true,fs:12,b:1,c:P.c1,dy:-14});
      R.label([IDXP[0],LY.buf+.1,IDXP[2]],'new index entry',{fs:12,c:P.c1,dy:18,wide:1})}
    // step 6: the log record is flushed; only then "committed"
    if(k===5){R.flow([[BENP[0]+.14,LY.buf,BENP[2]],[1,.6,1.2],[-1.8+7*.42,.2,WZ]],{c:P.c2,a:1,r:.07});
      R.label([-1.8+7*.42,.16,WZ],'flushed: committed',{fs:12.5,b:1,c:P.c2,dy:22})}
    // ---- the copies ----
    const wEnd=[-1.8+7*.42,.2,WZ];
    R.box(REP,[1.2,.9,1],{fill:mix(P.paper,P.c1,.2),a:A(act(6))});R.label([REP[0],.9,REP[2]],'replica',{fs:12.5,b:act(6),dy:-12,a:(act(6)?1:.45)*zv('copy')});
    for(let i=0;i<5;i++)R.box([COL[0]-.5+i*.25,0,COL[2]],[.19,.45+.12*((i*37)%5)/4,.8],{fill:mix(P.paper,P.c3,.25+.06*i),a:A(act(8)),lw:.6});
    R.label([COL[0],.95,COL[2]],'column store',{fs:12.5,b:act(8),c:P.c3,dy:-12,a:(act(8)?1:.45)*zv('copy')});
    for(let i=0;i<3;i++)R.box([SRC[0],i*.17,SRC[2]],[1.1,.12,.8],{fill:mix(P.paper,P.c6,.2+.12*i),a:A(act(8)),shadow:i===0,lw:.6});
    R.label([SRC[0],.5,SRC[2]],'search index',{fs:12.5,b:act(8),c:P.c6,dy:-12,a:(act(8)?1:.45)*zv('copy')});
    if(k===6){R.flowArc(wEnd,[REP[0]-.4,.5,REP[2]],.9,{c:P.c1,a:1,r:.07,speed:.9});R.label([REP[0],.9,REP[2]],'replays the log, a little behind',{fs:12,c:P.c1,dy:-28,wide:1})}
    if(k===7){R.flowArc([APP[0],.75,APP[2]-.3],[RED[0],.6,RED[2]],.5,{c:P.c4,a:1,r:.07});R.label([RED[0],.45,RED[2]],'cached chat list deleted',{fs:12,b:1,c:P.c4,dy:22})}
    if(k===8){R.flowArc(wEnd,[COL[0]-.5,.5,COL[2]],.8,{c:P.c3,a:1,r:.06,speed:.7});R.flowArc(wEnd,[SRC[0]-.5,.4,SRC[2]],.5,{c:P.c6,a:1,r:.06,speed:.8});
      R.label([COL[0],0,(COL[2]+SRC[2])/2],'minutes or a second behind',{fs:12,c:P.mute,dy:20,wide:1})}
    // step 10: checkpoint writes the page to its file; vacuum removes the old version
    if(k===9){R.flow([[BENP[0],LY.buf,BENP[2]],FILE],{c:P.c1,a:1,r:.07});R.box(FILE,[.5,.14,.4],{fill:P.c1,a:e,shadow:false});R.glow([FILE[0],.1,FILE[2]],.4,{c:P.c1,a:e});
      R.label([FILE[0],.1,FILE[2]],'checkpoint',{fs:12,b:1,c:P.c1,al:'right',dx:-14});R.label([BENP[0]-.14,LY.buf+.34,BENP[2]],'vacuum removes the old version',{fs:12,c:P.mute,dy:-14,a:e,wide:1})}
    // step 11: shards, the write goes to the one that owns user 2
    const sa=k<10?.12:e;
    SHX.forEach((x,i)=>{const own=i===2;R.box([x,0,SHZ],[1.3,.8,1.1],{fill:mix(P.paper,P.c5,own&&k===10?.45:.15),a:Math.max(.12,sa*(own?1:.6))})});
    if(k===10){R.label([SHX[0],.8,SHZ],'shards',{fs:12.5,b:1,c:P.c5,dy:-12,a:e});R.flowArc([APP[0]+.4,.75,APP[2]-.4],[SHX[2],.85,SHZ],1.3,{c:P.c5,a:e,r:.07});
      R.label([SHX[2],.8,SHZ],narrow?'user 2':'the shard that owns user 2',{fs:12,b:1,c:P.c5,dy:-28,a:e})}
  }
  const full={cam:[.48,.45],bounds:[[-6,0,-4.8],[5.4,3.9,2.8]]};
  const pg={cam:[.42,.3],bounds:[[-2.6,0,-1.4],[2.5,3.9,2.3]]};
  const V=[{cam:[.5,.55],bounds:[[-6,0,-2.6],[-3.2,1.4,1.2]]},pg,pg,pg,pg,pg,{cam:[.5,.5],bounds:[[-1.2,0,-2.6],[5.4,1.6,2.6]]},
    {cam:[.5,.55],bounds:[[-6,0,-2.6],[-3.2,1.4,1.2]]},{cam:[.5,.5],bounds:[[-1.2,0,-.6],[5.4,1.4,2.8]]},pg,{cam:[.42,.5],bounds:[[-6,0,-4.8],[2.6,1,1]]}];
  S3.stage({id:'stg-write',list:'sx-write',fig:'Fig. 2 · one write through the stack',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1500,hold:5000,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,22,150],view:k=>V[k]||full});
})();
