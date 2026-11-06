// ---- Scene, Fig. 6 (section 6): an LSM-tree's memtable, flushes, compaction and levels, on the measured RocksDB run (renderer v2) ----
// SE.m5: 4,000,000 random 16-byte keys with 100-byte values, then 4,000,000 overwrites; memtable 8 MB, level 0 compacts at 4 files,
// level multiplier 10, bloom filters 10 bits per key. Steps 1 to 3 are the mechanism (file counts illustrative); steps 4 to 7 draw the run's own
// files per level, bytes written and blocks read. One box is one SST file (8 MB target size).
(function(){
  if(!document.getElementById('stg-lsm')||!window.SE)return;const {at,off,lerp,mix}=S3;
  const D=SE.m5,C=D.config,run=(s,b)=>D.runs.find(r=>r.style===s&&r.bloom===b),LV=run('leveled',true),UN=run('universal',true),NB=run('leveled',false);
  const load=LV.phases[0],ow=LV.phases[1],uow=UN.phases[1],miss=r=>r.reads.find(x=>/absent/.test(x.gets)).data_blocks_per_get;
  const MB=v=>Math.round(v/1e6).toLocaleString('en-US')+' MB';
  const MX=-3.9,YM=2.1,ZM=-.9,SRC=[MX,3.1,1.2];
  const ZL={0:1.1,1:.55,4:-.15,5:-.15,6:-1.05},X0=-1.6,DX=.34,COLS=22;
  // files of a level laid out in rows of 22, from the front row backwards
  function files(R,lv,n,o){const P=R.P,z0=ZL[lv];for(let i=0;i<n;i++){const c=i%COLS,r=Math.floor(i/COLS);
    R.box([X0+c*DX,0,z0-r*.45],[.27,.16,.36],{fill:o.fill||mix(P.paper,P.c4,.2+.06*lv),a:o.a,shadow:false,lw:.55})}}
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6.5,-3.4,2.6,.5);
    // the memtable (RAM) and the log (disk)
    const memA=k<=2||k===5?1:.35;R.glass([MX-1.3,YM,ZM+.6],[2.6,0,0],[0,0,-1.2],{c:P.c4,a:memA*.75,nu:1,nv:1,th:.03});
    R.label([MX,YM,ZM-.6],'memtable · '+C.write_buffer_size+' (RAM, sorted)',{fs:12.5,b:1,c:P.c4,a:memA,dy:-14});
    const fill=k===0?e:k===1?1-Math.min(1,e*1.4):k===2?.35:k===5?.35:.35;
    for(let i=0;i<10;i++)R.box([MX-1.1+i*.245,YM,ZM],[.17,.2,.17],{fill:mix(P.paper,P.c4,.6),a:memA*Math.max(0,Math.min(1,fill*10-i)),shadow:false,lw:.5});
    for(let i=0;i<9;i++)R.box([MX-1.2+i*.3,0,2.15],[.24,.12,.3],{fill:mix(P.paper,P.c1,i===8&&k===0?.9:.3),a:k===0?1:.4,shadow:false,lw:.5});
    R.label([MX-1.3,0,2.15],'log',{al:'right',dx:-8,fs:12.5,c:P.c1,a:k===0?1:.5,grp:'v'});
    if(k===0){R.ball(SRC,.14,{c:P.acc});R.label(SRC,'writes',{fs:12.5,b:1,c:P.acc,dy:-14});R.flowArc(SRC,[MX+1.2,.15,2.15],.4,{c:P.c1,r:.06});R.flowArc(SRC,[MX,YM+.3,ZM],.3,{c:P.c4,r:.06})}
    // levels on disk
    let L;if(k<=2)L={0:k===0?3:k===1?3:k===2?Math.round(4*(1-e)):0,5:3};
    else if(k===6)L={0:uow.files_per_level[0],1:uow.files_per_level[1],4:uow.files_per_level[4],6:uow.files_per_level[6]};
    else L={0:0,5:load.files_per_level[5],6:load.files_per_level[6]};
    const lvA=k===4?.15:1;
    Object.keys(L).forEach(lv=>{lv=+lv;const n=L[lv];files(R,lv,Math.floor(n),{a:lvA});
      R.label([X0-.3,0,ZL[lv]],'L'+lv+(k>=3?' · '+L[lv]+' files':''),{al:'right',dx:-6,fs:12.5,mono:true,b:1,c:P.c4,a:lvA,grp:'v'})});
    // 2. a full memtable becomes one sorted file in level 0, written sequentially
    if(k===1){const nx=X0+3*DX;R.flow([[MX,YM,ZM],[nx,.3,ZL[0]]],{c:P.c4,r:.07,a:Math.min(1,e*1.5)});R.box([nx,0,ZL[0]],[.27,.16,.36],{fill:mix(P.paper,P.c4,.7),a:e});
      R.label([nx,.16,ZL[0]],R.W<520?'one sorted file':'one sorted file: blocks, index, bloom filter',{al:'left',dx:14,fs:12.5,b:1,c:P.c4,a:e})}
    // 3. level 0 at 4 files: merged with the overlapping files below, which are rewritten
    if(k===2){for(let i=0;i<3;i++)for(let j=0;j<3;j++)R.flowArc([X0+i*DX,.2,ZL[0]],[X0+j*DX,.2,ZL[5]],.35,{c:P.c2,r:.05,n:5,a:1-e*.5});
      for(let j=0;j<3;j++){R.glow([X0+j*DX,.1,ZL[5]],.35,{c:P.c2,a:.7})}
      R.label([X0+DX,.2,ZL[5]],R.W<520?'compaction':'compaction: merge, rewrite, drop old versions',{al:'left',dx:60,fs:12.5,b:1,c:P.c2})}
    if(k===3)R.label([X0+11*DX,0,1.7],R.W<520?'each level about 10× the one above':'after 4,000,000 keys: each level about 10 times the one above',{fs:12.5,b:1,c:P.c4,dy:30,a:e});
    // 5. the bill: bytes written per byte the application wrote
    if(k===4){const B=[['application',load.user_bytes,P.acc],['log',load.wal_bytes,P.c1],['flushes',load.flush_bytes,P.c4],['compaction',load.compact_write_bytes,P.c2]],mx=load.compact_write_bytes;
      B.forEach(([n,v,c],i)=>{const x=-1.2+i*1.7,h=2.3*v/mx*Math.min(1,e*1.3);R.box([x,0,1.5],[1.1,.06,.8],{shadow:false});R.box([x,.06,1.5],[.75,h,.5],{fill:mix(P.paper,c,.6)});
        R.label([x,.06+h,1.5],MB(v),{fs:12.5,b:1,mono:true,dy:-12});R.label([x,0,1.9],n,{fs:12.5,c:P.mute,dy:14})});
      R.label([2.2,2.5,1.5],R.W<520?'write amplification '+load.write_amp:'write amplification '+load.write_amp+' (flushes + compaction), '+load.write_amp_with_wal+' with the log',{fs:13,b:1,c:P.c2,a:e,dy:-6})}
    // 6. a lookup of a key that is not there: memtable, then each level; bloom filters answer "no" without reading
    if(k===5){const stops=[[MX,YM+.2,ZM],[X0+DX*4,.2,ZL[5]],[X0+DX*9,.2,ZL[6]],[X0+DX*15,.2,ZL[6]-.45]];R.flow(stops,{c:P.acc,r:.065,a:Math.min(1,e*1.5)});
      stops.slice(1).forEach(p=>{R.glow(p,.32,{c:P.good,a:e});R.label(p,'filter: no',{fs:12,b:1,c:P.good,dy:-16,a:e})});
      R.label([X0+DX*11,0,1.7],(R.W<520?'':'absent key: ')+miss(LV)+' blocks read (no filters: '+miss(NB)+')',{fs:12.5,b:1,c:P.acc,dy:30,a:e})}
    // 7. tiered (universal): fewer rewrites per key at scale, more runs, more space
    if(k===6)R.label([X0+11*DX,0,1.7],(R.W<520?'universal: ':'universal after the overwrites: ')+uow.space_amp+'x space (leveled '+ow.space_amp+'x)',{fs:12.5,b:1,c:P.c4,dy:30,a:e});
  }
  const full={cam:[.18,.55],bounds:[[-5.4,0,-2.1],[6,2.4,2.2]]};
  S3.stage({id:'stg-lsm',list:'sx-lsm',fig:'Fig. 6 · an LSM-tree, on the measured RocksDB run',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,14,8]:[22,20,18,90],
    view:k=>k<=2?{cam:[.2,.55],bounds:[[-5.4,0,-.6],[1.6,3.2,2.5]]}:k===4?{cam:[.12,.4],bounds:[[-2,0,1],[4.6,2.6,2]]}:full});
})();
