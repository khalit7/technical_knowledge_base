// ---- Scene, Fig. 4 (section 3): one insert through the write-ahead log, renderer v2 ----
// The records, their sizes and the pages they name are the measured ones (SE.m2.one_insert, pg_walinspect on PostgreSQL 16.2: page images off
// for steps 2 to 5, on for step 6, the catalog's Heap2 housekeeping records left out); the commit time is the pgbench run (SE.m2.commit).
// Positions of pages in the buffer pool and in the files are drawn to explain.
(function(){
  if(!document.getElementById('stg-wal')||!window.SE)return;const {at,off,lerp,mix}=S3;
  const W=SE.m2,own=x=>x.filter(r=>r.rm!=='Heap2'),OFF=own(W.one_insert.off.first),ON=own(W.one_insert.on.first);
  const lat=(W.commit.runs.find(r=>r.synchronous_commit==='on'&&r.clients===1)||{}).latency_ms;
  const blk=r=>r.blk;
  const sum=a=>a.reduce((s,r)=>s+r.len,0),TOFF=sum(OFF),TON=sum(ON);
  const YR=1.5,BE=[-5.4,0,1.5],SEG=[2.1,0,1.6];
  // the three pages the insert changes: the table page, the primary-key leaf, the chat_id leaf (block numbers from the records)
  const PG=[[-3.4,-.85,'table page '+blk(OFF[0]),'c3',[-3.7,1.05]],[-1.55,-.85,'pkey leaf '+blk(OFF[1]),'c6',[-1.1,1.4]],[.3,-.85,'chat_id leaf '+blk(OFF[2]),'c6',[.5,.9]]];
  const OTH=[[-2.5,-1.6],[-.65,-1.6],[-3.4,-1.6],[.3,-1.6]];
  const recX=i=>2.5+i*.62;
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6.5,-3,3,.5);
    // backend, buffer pool (RAM), WAL buffers (RAM), data files and pg_wal/ (disk)
    R.box(BE,[1,.55,.7],{fill:mix(P.paper,P.acc,.2)});R.label([BE[0],.55,BE[2]],'backend: INSERT',{fs:12.5,b:1,dy:-12});
    R.glass([-4.2,YR-.02,-.35],[5.1,0,0],[0,0,-1.75],{c:P.c1,a:.6,nu:6,nv:2,th:.03});R.label([-4.2,YR,-1.95],'buffer pool',{al:'right',dx:-6,fs:12.5,c:P.mute,grp:'l'});
    R.glass([2.05,YR-.02,-.35],[2.75,0,0],[0,0,-1.75],{c:P.c1,a:.6,nu:1,nv:1,th:.03});R.label([4.8,YR,-1.2],'WAL buffers',{al:'left',dx:6,fs:12.5,c:P.mute,wide:1});
    OTH.forEach(([x,z])=>R.box([x,YR,z],[1,.12,.5],{a:.7,shadow:false,lw:.6}));
    const dirty=k===0?e:k<=3?1:k===4?1-e:1;
    PG.forEach(([x,z,l,c],i)=>{R.box([x,YR,z],[1,.14,.5],{fill:mix(mix(P.paper,P[c],.25),P.c2,.75*dirty),shadow:false,lw:.8});
      R.label([x,YR+.14,z],l,{fs:12,c:P[c],b:1,dy:i===1?-30:-12,a:k===5?.4:1,wide:1})});
    // the files on disk: a grid of pages each; the three target pages
    [[-3.7,'messages (table)'],[-1.1,'messages_pkey'],[.5,'chat_id index']].forEach(([x,l],f)=>{for(let i=0;i<3;i++)for(let j=0;j<4;j++)R.box([x-.48+j*.32,0,.6+i*.38],[.26,.05,.28],{fill:mix(P.paper,f?P.c6:P.line,.25),a:.9,shadow:false,lw:.45});
      R.label([x,0,1.75],l,{fs:12,c:P.mute,dy:14,wide:1})});
    for(let i=0;i<4;i++)R.box([SEG[0]+i*.75,0,SEG[2]],[.66,.28,.5],{fill:mix(P.paper,P.c1,i===3?.25:.12),lw:.7});
    R.label([SEG[0]+1.1,0,SEG[2]+.25],'pg_wal/ (16 MB files)',{fs:12,c:P.c1,dy:16});
    // 1. the insert changes three pages in RAM
    if(k===0){PG.forEach(([x,z])=>R.flowArc([BE[0]+.3,.6,BE[2]],[x,YR+.15,z],.6,{c:P.c2,a:e,r:.06}));R.label([-1.5,YR,-.35],R.W<520?'3 pages changed in RAM':'3 pages changed in RAM, nothing written',{fs:12.5,b:1,c:P.c2,a:e,dy:24})}
    // 2. one record per change, appended to the WAL buffers; height is bytes
    const recs=k===5?ON:OFF,sc=k===5?1.9/Math.max(...ON.map(r=>r.len)):.45/Math.max(...OFF.map(r=>r.len)),ra=k===1?e:k>=1?1:0;
    recs.forEach((r,i)=>{const h=Math.max(.025,r.len*sc*(k===5?Math.min(1,e*1.3):1)),x=recX(i),col=r.rm==='Transaction'?P.acc:r.rm==='Heap'?P.c3:P.c6;
      R.box([x,YR,-1.15],[.48,h,.48],{fill:mix(P.paper,col,.6),a:ra,shadow:false});
      if(k>=1)R.label([x,YR+h,-1.15],r.len.toLocaleString('en-US'),{fs:12,mono:true,b:1,dy:-11,a:ra});
      if(k===1&&i<3)R.flowArc([PG[i][0],YR+.15,PG[i][1]],[x,YR+.3,-1.15],.5,{c:col,a:e,r:.055,n:6})});
    if(k>=1&&k<5)R.label([3.42,YR,-.35],(R.W<520?'':OFF.map(r=>r.len).join(' + ')+' = ')+TOFF+' bytes',{fs:12.5,b:1,mono:true,c:P.c1,a:ra,dy:20});
    // 3. the commit flushes the log, then answers
    if(k===2){const u=Math.min(1,e*1.6);R.flow([[3.4,YR,-1.1],[3.4,.6,.6],[SEG[0]+2.25,.3,SEG[2]]],{c:P.c1,a:u,r:.07});R.box([SEG[0]+2.25,0,SEG[2]],[.66,.3,.5],{fill:P.c1,a:u});
      if(e>.5)R.flowArc([SEG[0]+2,.35,SEG[2]],[BE[0]+.4,.6,BE[2]],1.1,{c:P.acc,a:(e-.5)*2,r:.06,n:12});
      R.label([SEG[0]+1.1,0,SEG[2]+.25],(R.W<520?'':'fsync, then COMMIT · ')+lat.toFixed(1)+' ms per commit here',{fs:12.5,b:1,c:P.c1,dy:36,a:u})}
    // 4. the pages wait in RAM; each may be written only once the log is flushed past its LSN
    if(k===3){PG.forEach(([x,z])=>{R.glow([x,YR+.1,z],.6,{c:P.c2,a:e*.7});R.line([[x,YR,z],[SEG[0]+2.25,.3,SEG[2]]],{c:P.mute,w:1.2,dash:[4,4],a:e*.7})});
      R.label([-1.5,YR,-.35],R.W<520?'dirty pages wait for the log':'dirty pages wait: written only after the log is flushed past their LSN',{fs:12.5,b:1,c:P.c2,a:e,dy:24})}
    // 5. the checkpoint writes each dirty page to its own place: random writes
    if(k===4){PG.forEach(([x,z,,,f])=>{R.flow([[x,YR,z],[f[0],.1,f[1]]],{c:P.c2,a:1,r:.07,speed:1.3});R.box([f[0],0,f[1]],[.3,.16,.32],{fill:P.c2,a:e});R.glow([f[0],.1,f[1]],.4,{c:P.c2,a:e*.7})});
      R.label([-1.5,0,1.75],'checkpoint: three random 8 KB writes',{fs:12.5,b:1,c:P.c2,dy:34})}
    // 6. the first change to each page after a checkpoint logs the whole page
    if(k===5){R.label([3.42,YR,-.35],TOFF+' → '+TON.toLocaleString('en-US')+' bytes'+(R.W<520?'':': three page images'),{fs:12.5,b:1,mono:true,c:P.c2,a:e,dy:20})}
  }
  const full={cam:[.2,.62],bounds:[[-6,0,-2.3],[5.3,1.7,2.1]]};
  S3.stage({id:'stg-wal',list:'sx-wal',fig:'Fig. 4 · one insert through the WAL',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,20,18,84],
    view:k=>k===1||k===5?{cam:[.1,.5],bounds:[[-3.6,0,-2.2],[5,2.6,.2]]}:full});
})();
