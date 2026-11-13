// ---- Scene, Fig. 1 (the idea in one screen): the recorded job as processes on a user-space glass plate over the kernel's floor (renderer v2) ----
// Driven by the page's /proc snapshot (PD.proc, src/runs/out/proc_snapshot.txt): the ps tree (PID, PPID, number of threads) and the pipe inodes
// the trainer and its worker share; the crossing cost is PD.sysc.plain_ns (getppid through glibc, src/runs/c/sysc.c).
// Colours used on every scene of this page: orange a system-call crossing, purple a signal, teal data moving, blue user space, gold the kernel's records.
(function(){
  if(!document.getElementById('stg-hero')||!window.PD)return;const {at,off,mix,cl}=S3;
  // the ps lines of the snapshot: PID PPID PGID SID TT STAT NLWP COMMAND
  const ps=PD.proc.split('== MAIN')[0].split('\n').filter(l=>/^\s*\d+\s+\d+/.test(l)).map(l=>l.trim().split(/\s+/)).filter(r=>r[7]!=='ps')
    .map(r=>({pid:+r[0],ppid:+r[1],nlwp:+r[6],comm:r[7]}));
  const sh=ps.find(r=>r.pid===1),py=ps.find(r=>r.comm==='python'),wk=ps.filter(r=>r.ppid===py.pid);
  const pipes=[...new Set((PD.proc.split('== WORKER')[0].match(/(?:^|\n)[4-8] -> pipe:\[(\d+)\]/g)||[]).map(s=>s.match(/\d+(?=\])/)[0]))]; // fds 4 to 8 of the main process
  const YU=2.5;
  const PR=[{r:sh,x:-4.4,w:1.2,c:'c1'},{r:py,x:-1.2,w:2.1,c:'c1'},{r:wk[0],x:2.0,w:1.5,c:'c1'},{r:wk[1],x:4.4,w:1.5,c:'c1'}];
  const name=(p,nar)=>nar?(p.r.comm==='pt_data_worker'?'worker '+p.r.pid:p.r.comm+' '+p.r.pid):p.r.comm+' · PID '+p.r.pid+(p.r.pid===1?'':'');
  // a record on the kernel floor under process p: one task per thread, and the three tables they share
  function record(R,p,a,big){const P=R.P,n=p.r.nlwp,tw=big?.17:.13,gap=big?.23:.18,x0=p.x-(n-1)*gap/2,zT=-1.05,zS=.75,sw=big?.62:.42;
    const S=[['mm',p.x-(big?.8:.5)],['files',p.x],['sighand',p.x+(big?.8:.5)]];
    for(let i=0;i<n;i++){const x=x0+i*gap;R.box([x,0,zT],[tw,.3,.3],{fill:mix(P.paper,P.c5,.5),a,shadow:false,lw:.6});
      if(a>.3)S.forEach(([,sx])=>R.line([[x,.02,zT+.15],[sx,.02,zS-.2]],{c:P.c5,w:.8,a:a*.35}))}
    S.forEach(([nm,sx])=>{R.box([sx,0,zS],[sw,.22,.4],{fill:mix(P.paper,P.c5,.25),a});if(big)R.label([sx,0,zS+.2],nm,{fs:12,mono:true,dy:11,a,c:P.c5})});
    return {files:[p.x,.22,zS],sig:[p.x+(big?.8:.5),.22,zS],task:[x0,.3,zT]}}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-6.4,6.4,-2.6,2.6,.5);
    // the kernel's floor, then user space as a glass plate above it
    R.quad([[-5.9,0,-1.6],[5.9,0,-1.6],[5.9,0,1.6],[-5.9,0,1.6]],{fill:P.paper,edge:true,ea:.35,dz:200});
    R.label([5.9,0,1.6],nar?'kernel':'kernel: one record per process, one task per thread',{al:'right',dx:-2,dy:13,fs:12.5,b:1,c:P.c5});
    R.glass([-5.9,YU,-1.6],[11.8,0,0],[0,0,3.2],{c:P.c1,nu:14,nv:4,a:.4,dz:60,th:.02});
    R.label([-5.9,YU,1.6],'user space',{al:'left',dx:2,dy:12,fs:12.5,b:1,c:P.c1,grp:'side'});
    // 1. the processes and the tree that links them
    const focus=i=>k===1||k===2?(i===1?1:.25):k===3?(i===0?.25:1):1;
    PR.forEach((p,i)=>{const a=focus(i),h=i===1?.42:.32;
      R.box([p.x,YU,0],[p.w,h,1.0],{fill:mix(P.paper,P.c1,.22),a});
      // one thin tile per thread on top of each process
      const n=p.r.nlwp,g=Math.min(.2,(p.w-.3)/n);for(let t=0;t<n;t++)R.box([p.x-(n-1)*g/2+t*g,YU+h,0],[g*.7,.16,.5],{fill:mix(P.paper,P.c1,.55),a,shadow:false,lw:.5});
      R.label([p.x,YU+h+.16,-.25],name(p,nar),{fs:12.5,b:1,dy:-10,a:Math.max(a,.45),c:P.ink});
      if(!nar)R.label([p.x,YU,.5],p.r.nlwp+(p.r.nlwp>1?' threads':' thread'),{fs:12,dy:12,a:Math.max(a,.45),c:P.mute,mono:true})});
    // the tree: parent to child, drawn as arcs over the plate
    [[0,1,.35],[1,2,.35],[1,3,.75]].forEach(([a,b,h])=>R.arc([PR[a].x+.2,YU+(a===1?.42:.32),0],[PR[b].x-.2,YU+.32,0],h,{c:P.mute,w:1.4,a:.75,head:6}));
    // 2. the records under the plate
    const ra=k===0?.2:k===1?Math.max(.2,e):1; // faint from the first step, so the floor is never empty
    if(ra>0){const rp=record(R,PR[1],ra*(k===3?.35:1),true);record(R,PR[0],ra*.3,false);
      if(k>=3){const ra2=k===3?e:1;const r2=record(R,PR[2],ra2,false),r3=record(R,PR[3],ra2,false);
        // the pipes the trainer and its workers share (fds 4 to 8 of both point at them)
        pipes.forEach((ino,j)=>{const pc=[.3+j*1.1,0,1.3];R.box(pc,[.8,.2,.34],{fill:mix(P.paper,P.c6,.45),a:ra2});
          if(!nar&&j===0)R.label([.85,.2,1.47],'pipes '+pipes.join(', '),{fs:12,mono:true,dy:12,c:P.c6,a:ra2});
          [rp,r2,r3].forEach((r,q)=>R.line([r.files,[pc[0],.2,pc[2]-.1]],{c:P.c6,w:1.1,a:ra2*.7}));
          if(k===3)R.flow([r2.files,[pc[0],.25,pc[2]],rp.files],{c:P.c6,a:ra2,r:.055,n:6,speed:1})});
        if(k===3)R.label([3.2,0,-1.25],'fork: copied records, the same pipes',{fs:12.5,b:1,dy:-24,c:P.c6,a:ra2,wide:1})}
      if(k===1)R.label([-1.2,.3,-1.2],py.nlwp+' tasks, one tgid '+py.pid,{fs:12.5,b:1,dy:-14,c:P.c5,a:e});
      // 3. the door: one crossing down and one back
      if(k===2){const top=[-1.45,YU+.02,.1],bot=[rp.files[0]-.25,.25,.55],top2=[-.95,YU+.02,.1],bot2=[rp.files[0]+.25,.25,.55];
        R.flow([top,bot],{c:P.c2,a:e,r:.075,n:5,speed:1.4});R.flow([bot2,top2],{c:P.c2,a:e,r:.075,n:5,speed:1.4});
        R.glow([-1.2,YU,.1],.45,{c:P.c2,a:e*.8});
        R.label([-1.2,YU*.55,.55],nar?'svc #0':'svc #0 · about '+Math.round(PD.sysc.plain_ns)+' ns a crossing',{fs:12.5,b:1,mono:true,al:'left',dx:28,c:P.c2,a:e})}
      // 4. signals: SIGTERM from outside, SIGCHLD from a worker, both into the trainer's handler table
      if(k===4){const sig=rp.sig;R.flow([[-5.6,YU+1.1,.3],[-3.0,YU+.6,.4],[sig[0],sig[1]+.1,sig[2]]],{c:P.c4,a:e,r:.075,n:7,speed:1.3});
        R.label([-5.6,YU+1.1,.3],nar?'SIGTERM':'SIGTERM from docker stop',{fs:12.5,b:1,al:'left',dy:-12,c:P.c4,a:e});
        R.flowArc([PR[2].x,0.3,-1.05],[sig[0]+.1,sig[1],sig[2]],.9,{c:P.c4,a:e,r:.06,n:7,speed:1.1});
        R.label([PR[2].x,.3,-1.05],'SIGCHLD',{fs:12.5,b:1,mono:true,dy:-14,c:P.c4,a:e})}}
  }
  const full={cam:[.3,.4],bounds:[[-5.9,0,-1.7],[5.9,3.3,1.8]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the recorded job: processes above, records below',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:5200,draw,
    view:k=>k===1||k===2?{cam:[.5,.32],bounds:[[-3.2,0,-1.5],[.8,3.3,1.3]]}:full,
    margin:w=>w<520?[14,8,24,8]:[18,14,26,14]});
})();
