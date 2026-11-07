// ---- Scene, Fig. 1 (the idea in one screen): four allocators between a training job and the hardware; freed memory stops at the allocator (renderer v2) ----
// User space is a glass plate above the kernel's floor and the CUDA driver's. Each allocator is a plinth of blocks: live in its colour, held-but-free in orange.
// Steps 4 and 5 move the camera onto glibc's heap drawn to scale from the page's measurement (window.AD.frag.glibc, src/raw/frag.txt):
// live 1,562 KiB (6,250 survivors of 256 B), RSS after the frees, RSS after malloc_trim(0).
(function(){
  if(!document.getElementById('stg-hero')||!window.AD)return;const {cl,lerp}=S3;
  const F=AD.frag.glibc,RSS=F['freed all but every 64th'],TRIM=F['malloc_trim(0) returned 1'],LIVE=1562; // live: 6,250 x 256 B = 1,562.5 KiB (frag.c), the page's prose key frag.live
  const fk=v=>v.toLocaleString('en-US');
  const YU=1.6,YJ=3.15;
  // [name, x, palette key, live cells (of 12) at step 1, cells freed at step 3]
  const A=[['pymalloc',-4.3,'c4',[0,1,2,4,5,7,8,9,10],[1,4,8,9]],['glibc malloc',-1.75,'c5',[0,1,2,3,5,6,8,9,11],[0,2,3,6,9]],
           ['mimalloc in libc10',.8,'c1',[0,2,3,4,6,7,10],[2,6,7]],['CUDA caching allocator',4.1,'c3',[0,1,2,4,5,6,8,9,10],[1,2,5,9]]];
  const cell=(x,i)=>[x-.69+(i%4)*.46,YU+.12,-.42+Math.floor(i/4)*.42];
  const SL=11,SX=-5.5,SZ=2.9,sw=v=>SL*v/RSS; // the to-scale strip: 11 world units = RSS after the frees
  function draw(R,k,e){const P=R.P;R.grid(-6.4,6.4,-2.6,3.4,.5);
    const top=k<=2?1:.22;
    // the kernel's floor and the CUDA driver's, then the user-space plate
    R.quad([[-5.9,0,-1.7],[2.5,0,-1.7],[2.5,0,1.8],[-5.9,0,1.8]],{fill:P.paper,edge:true,ea:.35,dz:200,a:top>.5?1:.6});
    R.quad([[2.8,0,-1.7],[5.9,0,-1.7],[5.9,0,1.8],[2.8,0,1.8]],{fill:P.paper,edge:true,ea:.35,dz:200,a:top>.5?1:.6});
    R.label([-1.7,0,1.8],'kernel: 4 KiB pages',{dy:13,fs:12.5,b:1,c:P.c5,a:top>.5?1:0});
    R.label([4.35,0,1.8],'CUDA driver',{dy:13,fs:12.5,b:1,c:P.c3,a:top>.5?1:0});
    R.glass([-5.9,YU,-1.7],[11.8,0,0],[0,0,3.5],{c:P.c1,nu:14,nv:4,a:.42*top,dz:60,th:.02});
    R.label([-5.9,YU,1.8],'the process (user space)',{al:'left',dx:4,dy:12,fs:12.5,b:1,c:P.c1,grp:'side',a:top>.5?1:0});
    // the training job above
    R.box([0,YJ,0],[6.6,.32,.7],{fill:P.paper,a:top});
    R.label([0,YJ+.32,0],R.W<520?'training job':'training job: millions of malloc and free calls',{dy:-11,fs:12.5,b:1,a:top>.5?1:0});
    A.forEach(([nm,x,ck,live,freed])=>{const c=P[ck];
      R.box([x,YU,0],[2.1,.12,1.45],{fill:P.paper,a:top,dz:40});
      const nar=R.W<520,ai=A.findIndex(q=>q[0]===nm);const lo=nar&&ai%2;R.label(lo?[x,YU,.75]:[x,YU+.6,-.75],nar?['pymalloc','glibc','mimalloc','CUDA cache'][ai]:nm,{fs:12.5,b:1,c,dy:lo?14:-6,a:top>.5?1:0});
      // step 2: the big piece the allocator got, rising from the floor (or the driver's) into its plinth
      if(k===1){const y=lerp(0,YU-.02,e);R.box([x,y,0],[1.9,.1,1.3],{fill:P.paper,ec:c,a:cl(1-Math.abs(e-.5)*1.4,0,1),shadow:false});
        R.flowArc([x,0,.9],[x,YU,.9],.2,{c,a:Math.min(1,e*2),r:.07,n:6,top:1})}
      for(let i=0;i<12;i++){const isLive=live.includes(i),fr=freed.includes(i),p=cell(x,i);
        const held=k>=2&&fr;
        if(!isLive&&!(k>=1))continue;
        if(!isLive){R.box(p,[.38,.06,.32],{fill:P.paper,a:top*.8,shadow:false,lw:.6});continue}
        const t=k===2?cl(e*1.6,0,1):1;
        R.box(p,[.38,held?lerp(.24,.08,t):.24,.32],{fill:held?S3.mix(P.paper,P.c2,lerp(0,.75,k===2?t:1)):S3.mix(P.paper,c,.55),a:top,shadow:false,lw:.6})}
      // step 1: the job's calls stream down into every allocator
      if(k===0)R.flowArc([x*.55,YJ,0],[x,YU+.4,0],.25,{c,a:e,r:.06,n:7});
      // step 3: free calls stream down too, and stop at the plinth
      if(k===2)R.flowArc([x*.55,YJ,0],[x,YU+.3,0],.25,{c:P.c2,a:Math.min(1,e*1.5),r:.06,n:6});
    });
    if(k===1){R.label([-1.7,.9,1.2],'brk · mmap · madvise',{fs:12.5,mono:1,c:P.c5,b:1,a:e,wide:1});R.label([4.1,.9,1.2],'cudaMalloc · cuMemMap',{fs:12.5,mono:1,c:P.c3,b:1,a:e,wide:1})}
    if(k===2)R.label([-.5,YU,1.8],'free(): the block stays with its allocator',{fs:12.5,b:1,c:P.c2,a:e,wide:1});
    // ---- steps 4 and 5: glibc's heap after 98% freed, drawn to scale ----
    const sa=k<3?0:k===3?Math.min(1,e*1.4):1;
    if(sa>0){const lw=Math.max(.05,sw(LIVE)),held=k===4?lerp(sw(RSS),sw(TRIM),e):sw(RSS);
      R.box([SX+lw/2,0,SZ],[lw,.5,1],{fill:S3.mix(P.paper,P.c5,.75),a:sa});
      R.box([SX+lw+(held-lw)/2,0,SZ],[held-lw,.3,1],{fill:S3.mix(P.paper,P.c2,.6),a:sa});
      if(k===4){R.quad([[SX+held,.005,SZ-.5],[SX+SL,.005,SZ-.5],[SX+SL,.005,SZ+.5],[SX+held,.005,SZ+.5]],{fill:false,dash:[5,4],ec:P.c2,ea:.9,a:e,dz:-5});
        R.flowArc([SX+(held+SL)/2,.1,SZ],[1,0,1.2],.6,{c:P.c2,a:Math.min(1,e*1.6),r:.07,n:9,top:1})}
      R.label([SX,.5,SZ-.5],'live '+fk(LIVE)+' KiB',{al:'left',dy:-12,fs:12.5,b:1,c:P.c5,a:sa});
      R.label([SX+(k===4?lerp(sw(RSS),sw(TRIM),e):sw(RSS)),.3,SZ-.5],k===4&&e>.5?'RSS after malloc_trim(0): '+fk(TRIM)+' KiB':'RSS after the frees: '+fk(RSS)+' KiB',{al:k===4&&e>.5?'left':'right',dx:k===4&&e>.5?6:0,dy:-12,fs:12.5,b:1,c:P.c2,a:sa});
      R.label([0,0,SZ+.5],'glibc, 400,000 blocks of 256 B, then 98% freed: KiB to scale',{dy:14,fs:12,c:P.mute,a:sa})}
  }
  const full={cam:[.25,.5],bounds:[[-6,0,-1.8],[6,3.5,1.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · freed memory stops at the allocator',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k>=3?{cam:[0,.78],bounds:[[-5.7,0,2.3],[5.7,.6,3.5]]}:full,
    margin:w=>w<520?[14,8,26,8]:[18,14,26,14]});
})();
