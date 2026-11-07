// ---- Scene, Fig. 1 (top of the Reading tab): one process, one picture (renderer v2) ----
// Far row: the running job's address space by kind of mapping (VM_DATA.root_maps.totals, the root's /proc/PID/maps recording; widths on a
// square-root scale). Middle: the TLB and the page tables. Near: physical frames from three places. Front: files and swap. Dashed: memory.max.
(function(){
  if(!document.getElementById('stg-hero')||!window.VM_DATA)return;const {at,lerp,mix}=S3;
  const T=VM_DATA.root_maps.totals,kb=k=>T[k]?T[k][1]:0;
  const hum=v=>v>=1048576?(v/1048576).toFixed(1)+' GiB':v>=1024?Math.round(v/1024)+' MiB':v.toLocaleString('en-US')+' KiB';
  // [name, KiB, colour key, where its frames come from]
  const RG=[['libraries',kb('exe')+kb('torch')+kb('numpy')+kb('clib')+kb('pyext'),'c1','pc'],['dataset',kb('dataset'),'c1','pc'],['heap',kb('heap'),'c3','an'],
    ['/dev/shm',kb('shm'),'c4','sh'],['anonymous',kb('anon')+kb('anon_res'),'c3','an'],['stack',kb('stack'),'c3','an']];
  const GAP=.22,TOT=8.6,sq=RG.map(r=>Math.max(.42,Math.sqrt(r[1]))),scale=(TOT-GAP*(RG.length-1))/sq.reduce((a,b)=>a+b,0);
  let x=-TOT/2;const X=RG.map((r,i)=>{const w=Math.max(.42,Math.sqrt(r[1])*scale);const c=x+w/2;x+=w+GAP;return {c,w}});
  const ZV=-2.3,ZT=-.75,ZF=.75,ZD=2.25;
  // the frames each kind gets: page cache under the files, anonymous frames under the heap, shmem under /dev/shm, the zero page under the untouched memory
  const FR=[];[[X[0].c,'c1',4],[X[1].c,'c1',2],[X[2].c,'c3',4],[X[3].c,'c4',1],[X[4].c-.9,'c3',3],[X[5].c,'c3',1]].forEach(([cx,c,n])=>{for(let i=0;i<n;i++)FR.push({x:cx+(i-(n-1)/2)*.42,c})});
  const ZP={x:X[4].c+.85};
  const lay=(L,k)=>k===4?(L===2||L===4?1:.3):L===k?1:L<k?.3:.12;
  function draw(R,k,e){const P=R.P,nar=R.W<520,A=L=>lerp(k>0?lay(L,k-1):lay(L,k),lay(L,k),e);R.grid(-5.4,5.4,-3.2,3.2,.5);
    // 1. the address space
    const a0=A(0);R.box([0,0,ZV],[TOT+.4,.06,1.0],{a:a0*.7,shadow:false});
    RG.forEach((r,i)=>{const p=X[i];R.box([p.c,.06,ZV],[p.w,.3,.7],{fill:mix(P.paper,P[r[2]],.5),a:a0});
      R.label([p.c,.36,ZV],r[0],{fs:12.5,b:1,dy:-10-(i%2)*16,a:Math.max(.35,a0),c:P.ink});
      R.label([p.c,.06,ZV+.35],hum(r[1]),{mono:true,fs:12,dy:12,a:a0,c:P.mute,wide:1})});
    R.label([-TOT/2-.2,.1,ZV],nar?'virtual':'virtual address space',{al:'right',dx:-6,fs:12.5,b:1,c:P.mute,a:Math.max(.35,a0),wide:1});
    // 2. translation: the TLB and the page tables
    const a1=A(1);R.box([-4.6,0,ZT],[.75,.42,.6],{fill:mix(P.paper,P.c2,.35),a:a1});R.label([-4.6,.42,ZT],'TLB',{fs:12.5,b:1,dy:-10,a:Math.max(.3,a1)});
    R.glass([-3.9,.38,ZT-.4],[8.3,0,0],[0,0,.8],{c:P.c5,nu:24,nv:2,a:a1});R.label([3.2,.38,ZT+.4],'page tables',{fs:12.5,b:1,dy:12,c:P.c5,a:Math.max(.3,a1)});
    if(k===1){const xd=X[1].c;R.flow([[xd,.36,ZV+.35],[xd,.45,ZT],[xd,.25,ZF-.1]],{c:P.c2,a:e,r:.07,speed:1.2});R.flowArc([xd,.45,ZT],[-4.6,.42,ZT],.5,{c:P.c2,a:e*.8,r:.05,n:7})}
    // 3. frames from three places
    const a2=A(2);FR.forEach(f=>R.box([f.x,0,ZF],[.32,.32,.32],{fill:mix(P.paper,P[f.c],.55),a:a2}));
    R.box([ZP.x,0,ZF],[.36,.36,.36],{fill:P.paper,a:a2});R.label([ZP.x,.36,ZF],'zero page',{fs:12,dy:-10,a:a2,c:P.ink});
    if(k>=2){[[0,'page cache'],[2,'anonymous'],[3,'shmem']].forEach(([i,t])=>R.label([X[i].c,.32,ZF],t,{fs:12,dy:-10-(i===3?14:0),c:P[RG[i][2]],a:a2,b:1}));
      if(k===2){[[1,'c1'],[2,'c3'],[3,'c4']].forEach(([i,c])=>R.flow([[X[i].c,.36,ZV+.35],[X[i].c,.45,ZT],[X[i].c,.34,ZF]],{c:P[c],a:e,r:.06,speed:1.1}));
        R.line([[X[4].c+.85,.3,ZV+.35],[ZP.x,.38,ZF]],{c:P.mute,w:1.2,dash:[4,4],a:e});
        R.label([X[4].c-.3,.3,ZV+.6],nar?'untouched':'most of it untouched: no frame',{fs:12,dy:16,c:P.mute,a:e,wide:1})}}
    // 4. below memory: files and swap
    const a3=A(3),xf=(X[0].c+X[1].c)/2,xs=(X[2].c+X[4].c)/2;
    R.box([xf,0,ZD],[2.6,.2,.7],{fill:mix(P.paper,P.mute,.3),a:a3});R.label([xf,.2,ZD],'files on disk',{fs:12.5,b:1,dy:-10,a:Math.max(.3,a3)});
    R.box([xs,0,ZD],[2.6,.2,.7],{fill:mix(P.paper,P.c5,.35),a:a3});R.label([xs,.2,ZD],'swap',{fs:12.5,b:1,dy:-10,a:Math.max(.3,a3)});
    if(k===3){R.flowArc([xf,.2,ZD-.3],[X[0].c,.3,ZF+.1],.5,{c:P.c1,a:e,r:.06});R.flowArc([X[2].c,.3,ZF+.1],[xs,.2,ZD-.3],.5,{c:P.c3,a:e,r:.06});
      R.label([xf,0,ZD+.35],'clean pages: drop, read again',{fs:12,dy:14,c:P.c1,a:e,wide:1});R.label([xs,0,ZD+.35],'anonymous pages: only to swap',{fs:12,dy:14,c:P.c3,a:e,wide:1})}
    // 5. the container's budget
    const a4=at(k,e,4);if(a4>0){const z0=ZF-.5,z1=ZF+.5,x0=-4.75,x1=4.75;R.quad([[x0,.01,z0],[x1,.01,z0],[x1,.01,z1],[x0,.01,z1]],{ec:P.bad,dash:[7,5],lw:1.6,a:a4});
      R.label([x1,0,z1],nar?'memory.max':'memory.max counts these frames',{al:'right',fs:12.5,b:1,dy:12,c:P.bad,a:a4})}
  }
  const full={cam:[.1,.62],bounds:[[-5.2,0,-2.9],[5.2,.6,2.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one process, one picture',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    view:k=>innerWidth<520?{cam:[.55,.7],bounds:full.bounds}:k===0?{cam:[.06,.5],bounds:[[-5,0,-3],[5,.6,-1.2]]}:k===1?{cam:[.1,.58],bounds:[[-5.2,0,-3],[5,.6,.4]]}:full,
    margin:w=>w<520?[22,8,18,8]:[30,14,22,14]});
})();
