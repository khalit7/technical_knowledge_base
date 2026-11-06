// ---- Scene, Fig. 1 (top): one insert through a B-tree engine (left) and an LSM engine (right), renderer v2 ----
// Schematic: page, file and key counts are drawn to explain, not measured. The B-tree side changes three pages (the table page and two
// index leaves), as the one insert of section 3 did; the measured costs are in sections 3, 5 and 7.
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,mix}=S3;
  const BX=-3.3,LX=3.3,YR=1.55,ZW=2.15,ZR=-1.3;
  const rnd=(i,j)=>{const x=Math.sin(i*127.1+j*311.7)*43758.5453;return x-Math.floor(x)};
  // B-tree: buffer pool pages (3 x 5), the three changed by the insert, and where each lives in the files on disk
  const BP=[],DIRTY=[[0,1],[1,3],[2,2]],FILE=[[-1.36,.4],[-.4,1.16],[1.19,.58]];
  for(let r=0;r<3;r++)for(let c=0;c<5;c++)BP.push([BX-1.6+c*.8,YR,ZR-.25-r*.5,r,c]);
  const isD=(r,c)=>DIRTY.some(d=>d[0]===r&&d[1]===c);
  function wal(R,x0,n,a,newA,c){for(let i=0;i<n;i++)R.box([x0+i*.27,0,ZW],[.22,.14,.3],{fill:mix(R.P.paper,c,.35),a,shadow:false,lw:.6});
    if(newA>0){R.box([x0+n*.27,0,ZW],[.22,.14,.3],{fill:c,a:newA,lw:.8});R.glow([x0+n*.27,.1,ZW],.35,{c,a:newA*.6})}}
  function draw(R,k,e){const P=R.P;R.grid(-7,7,-3,3,.5);
    const aB=k===0||k===5?1:k<=2?1:.28,aL=k===0||k===5?1:k>=3?1:.28,src=[0,2.6,.3];
    R.label([BX,YR,ZR-1.55],'B-tree engine (Postgres, InnoDB)',{fs:13,b:1,a:aB,dy:-14,wide:1});
    R.label([LX,YR,ZR-1.55],'LSM engine (RocksDB, Cassandra)',{fs:13,b:1,a:aL,dy:-14,wide:1});
    R.ball(src,.16,{c:P.acc,a:k===0?1:.5});R.label(src,'one insert',{fs:12.5,b:1,c:P.acc,dy:-16,a:k===0?1:.5});
    // the log on each side (front row): one record appended and flushed, the commit
    const nA=at(k,e,0);wal(R,BX-1.7,9,aB,k===0?nA:aB,P.c1);wal(R,LX-1.7,9,aL,k===0?nA:aL,P.c1);
    R.label([BX-1.8,0,ZW],'log (WAL)',{al:'right',dx:-8,fs:12,c:P.c1,a:aB,grp:'l'});R.label([LX-1.8,0,ZW],'log',{al:'right',dx:-8,fs:12,c:P.c1,a:aL,grp:'r'});
    if(k===0){R.flowArc(src,[BX+.73,.2,ZW],.6,{c:P.c1,a:e});R.flowArc(src,[LX+.73,.2,ZW],.6,{c:P.c1,a:e});
      R.label([0,.2,ZW],'append, then flush = commit',{fs:12.5,b:1,c:P.c1,a:e,dy:18})}
    // ---- B-tree side: the buffer pool in RAM (glass), the table and index files on disk (back) ----
    R.glass([BX-2.05,YR-.02,ZR],[4.1,0,0],[0,0,-1.55],{c:P.c1,a:aB*.7,nu:5,nv:3,th:.03});
    R.label([BX-2.05,YR,ZR-.75],'buffer pool (RAM)',{al:'right',dx:-6,fs:12,c:P.mute,a:aB,grp:'l'});
    const dA=k===1?e:k>=2?1:0,clean=k===2?at(k,e,2):0;
    BP.forEach(([x,y,z,r,c])=>{const d=isD(r,c),hot=d&&dA>0&&k<5;R.box([x,y,z],[.58,.12,.4],{fill:hot?mix(P.paper,P.c2,lerp(.75,.15,clean)*dA):P.paper,a:aB,shadow:false,lw:.6})});
    // the files: table pages and index pages, one tile per page
    for(let i=0;i<4;i++)for(let j=0;j<7;j++)R.box([BX-2+j*.32,0,.02+i*.38],[.26,.06,.28],{fill:mix(P.paper,P.line,.3),a:aB*.9,shadow:false,lw:.5});
    for(let i=0;i<3;i++)for(let j=0;j<4;j++)R.box([BX+.55+j*.32,0,.2+i*.38],[.26,.06,.28],{fill:mix(P.paper,P.c6,.25),a:aB*.9,shadow:false,lw:.5});
    R.label([BX-2.15,0,.6],'table and index files (disk)',{al:'right',dx:-6,fs:12,c:P.mute,a:aB,grp:'l'});
    if(k===1){DIRTY.forEach(([r,c])=>{const b=BP[r*5+c];R.flowArc(src,[b[0],YR+.15,b[2]],.35,{c:P.c2,a:e,r:.06})});
      R.label([BX,YR+.2,ZR-.75],'3 pages changed in RAM',{fs:12.5,b:1,c:P.c2,a:e,dy:-26})}
    if(k===2){DIRTY.forEach(([r,c],i)=>{const b=BP[r*5+c],f=FILE[i];R.flow([[b[0],YR,b[2]],[BX+f[0],.1,f[1]]],{c:P.c2,a:1,r:.07,speed:1.2});
        R.box([BX+f[0],0,f[1]],[.3,.16,.32],{fill:P.c2,a:e});R.glow([BX+f[0],.1,f[1]],.4,{c:P.c2,a:e*.7})});
      R.label([BX,0,1.4],R.W<520?'checkpoint: random writes':'checkpoint: one random 8 KB write per page',{fs:12.5,b:1,c:P.c2,dy:16})}
    if(k>2&&k<5)FILE.forEach(f=>R.box([BX+f[0],0,f[1]],[.3,.16,.32],{fill:mix(P.paper,P.c2,.5),a:aB}));
    // ---- LSM side: the memtable in RAM (glass, sorted keys), the sorted files on disk in levels ----
    R.glass([LX-2.05,YR-.02,ZR],[4.1,0,0],[0,0,-1.55],{c:P.c4,a:aL*.7,nu:1,nv:1,th:.03});
    R.label([LX+2.05,YR,ZR-.75],'memtable (RAM, sorted)',{al:'left',dx:6,fs:12,c:P.mute,a:aL,grp:'r'});
    const memN=k<3?5:k===3?5+e:k===4?(e<.4?6:0):6,keys=[.2,.35,.5,.62,.8,.42];
    for(let i=0;i<Math.ceil(memN);i++){const a=i<5?1:(memN-5);R.box([LX-1.7+keys[i]*3.4,YR,ZR-.75],[.2,.22,.2],{fill:i===5?mix(P.paper,P.c4,.7):mix(P.paper,P.c4,.25),a:aL*Math.min(1,a),shadow:false,lw:.6})}
    const LV=[[.05,2,1.1],[.65,4,.9],[1.3,7,.62]]; // [z, files, width]: each level larger than the one above
    const newF=k===4?at(k,e*2,0):k>4?1:0;
    LV.forEach(([z,n,w],li)=>{for(let i=0;i<n;i++)R.box([LX-1.6+i*(w+.06)+w/2-.3,0,z],[w,.12,.32],{fill:mix(P.paper,P.c4,.18+.1*li),a:aL*.95,shadow:false,lw:.6});
      R.label([LX-1.9,0,z],'L'+li,{al:'right',dx:-6,fs:12,mono:true,c:P.mute,a:aL,grp:'r'})});
    if(k>=4){const fx=LX-1.6+2*1.16+.25;R.box([fx,0,.05],[1.1,.18,.32],{fill:mix(P.paper,P.c4,.55),a:aL*Math.min(1,newF+(k>4?1:0))})}
    if(k===3){R.flowArc(src,[LX-1.7+keys[5]*3.4,YR+.5,ZR-.75],.35,{c:P.c4,a:e,r:.06});R.label([LX,YR+.4,ZR-.75],'nothing on disk read or changed',{fs:12.5,b:1,c:P.c4,a:e,dy:-30})}
    if(k===4){const fx=LX-1.6+2*1.16+.25;
      if(e<.5)R.flow([[LX,YR,ZR-.75],[fx,.2,.05]],{c:P.c4,a:1,r:.07});
      else{const u=(e-.5)*2;[[.05,.65],[.65,1.3]].forEach(([z0,z1],i)=>{for(let j=0;j<3;j++)R.flowArc([LX-1.2+j*.9,.15,z0],[LX-1.4+j*1.1+i*.3,.15,z1],.25,{c:P.c2,a:u,r:.055,n:5})})}
      R.label([LX,0,-.35],e<.5?'flush: one sequential file':R.W<520?'compaction':'compaction: keys rewritten per level',{fs:12.5,b:1,c:e<.5?P.c4:P.c2,dy:-12})}
    // ---- reads go the other way ----
    if(k===5){const path=[[BX+1.03,.1,.2],[BX+.71,.1,.58],[BX+1.35,.1,.96]];path.forEach((p,i)=>{R.glow(p,.35,{c:P.acc,a:e});R.box(p,[.28,.14,.3],{fill:P.acc,a:e})});
      R.flow([...path,[BX,YR,ZR-.75]],{c:P.acc,a:e,r:.06});R.label([BX+1,0,.1],'about 3 pages, root to leaf',{fs:12.5,b:1,c:P.acc,a:e,dy:-26});
      const pr=[[LX-.5,YR+.2,ZR-.75],[LX-1.3,.1,.05],[LX-1.2,.1,.65],[LX-1.1,.1,1.3]];R.flow(pr,{c:P.acc,a:e,r:.06});
      pr.forEach((p,i)=>R.glow(p,.32,{c:i===3?P.acc:P.mute,a:e*(i===3?1:.5)}));R.label([LX,0,1.5],'memtable, then files newest first',{fs:12.5,b:1,c:P.acc,a:e,dy:20})}
  }
  const full={cam:[.12,.72],bounds:[[-6,0,-2.9],[6,1.7,2.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one insert, two engines',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,8,14,8]:[18,16,22,60],
    view:k=>k===1||k===2?{cam:[.2,.7],bounds:[[BX-2.3,0,-2.9],[BX+2.3,1.8,2.3]]}:k===3||k===4?{cam:[.04,.7],bounds:[[LX-2.3,0,-2.9],[LX+2.3,1.8,2.3]]}:full});
})();
