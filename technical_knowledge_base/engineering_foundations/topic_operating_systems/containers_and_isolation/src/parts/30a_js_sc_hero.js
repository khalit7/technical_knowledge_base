// ---- Scene, Fig. 1 (the idea): one kernel floor, two containers as glass boxes, the four restrictions one at a time (renderer v2) ----
// The pair of containers is illustrative (a training job and a notebook); the numbers in labels are the page's measured ones
// (PID 68321 from runtime.txt, 6 image layers from image.txt, the EPERM from the seccomp probe).
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp,lerp3,mix,cl}=S3;
  const YB=1.75,YP=YB+7*.085,KT=.35,YG=1.05; // container base, where processes stand, kernel top, the gate plate
  const A={x:-2.35,w:3.7,d:2.8},B={x:2.45,w:2.6,d:2.8};
  const PA=[['python',-3.3,-.3,.72],['worker',-2.2,.45,.55],['worker',-1.25,.45,.55]],PB=[['jupyter',2.45,0,.7]];
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-3,3,.5);
    const rc=s=>k===s?1:k>s?.32:0; // a restriction is full strength on its own step, then recedes
    // the kernel floor
    const kh=k===5?mix(mix(P.paper,P.c5,.28),P.bad,.12*e):mix(P.paper,P.c5,.28);
    R.box([0,0,0],[10.4,KT,3.8],{fill:kh,shadow:false,ec:k===5?P.bad:undefined,lw:k===5?1.6:.9,dz:60});
    R.label([-5.2,KT,1.9],'one host Linux kernel',{al:'left',dx:6,dy:12,fs:13,b:1,c:k===5?P.bad:P.c5});
    // HAVE: an image under each container (six read-only layers plus the writable one); before its step a plain base plate
    [A,B].forEach(C=>{R.box([C.x,YB,0],[C.w-.3,.12,C.d-.3],{fill:mix(P.paper,P.ink,.05),a:k<3?1:k===3?1-e:.1,shadow:false});
      for(let i=0;i<7;i++){const la=k<3?0:k===3?cl(e*8-i,0,1):.1;R.box([C.x,YB+i*.085,0],[C.w-.3,.07,C.d-.3],{fill:i===6?mix(P.paper,P.c4,.55):mix(P.paper,P.c4,.18+.04*i),a:la,shadow:false,lw:.6})}});
    if(k===3){R.label([A.x,YB+.3,A.d/2],'image: 6 read-only layers + 1 writable',{fs:12.5,b:1,c:P.c4,a:e,dy:18});
      R.label([A.x,YB+1.95,0],'overlayfs merges them into its /',{fs:12.5,c:P.c4,a:e,wide:1})}
    // processes: blocks standing on the image
    PA.forEach(([n,x,z,w],i)=>{R.box([x,YP,z],[w,i?.55:.8,.6],{fill:mix(P.paper,P.c1,i?.25:.45),dz:-5});R.label([x,YP+(i?.55:.8),z],i?'':n,{fs:12.5,b:1,dy:-10})});
    R.label([-1.72,YP+.55,.45],'2 workers',{fs:12,dy:-10,c:P.mute});
    PB.forEach(([n,x,z,w])=>{R.box([x,YP,z],[w,.7,.6],{fill:mix(P.paper,P.c3,.4)});R.label([x,YP+.7,z],n,{fs:12.5,b:1,dy:-10})});
    if(k===0){R.label([A.x,YB+2,0],'container A: a training job',{fs:12.5,c:P.ink,a:e,b:1});R.label([B.x,YB+2,0],'container B: a notebook',{fs:12.5,c:P.ink,a:e,b:1})}
    // SEE: each container's namespaces as a tinted glass box around its processes
    const na=k===0?0:k===1?e:.3;
    [A,B].forEach(C=>{R.box([C.x,YB-.05,0],[C.w,2,C.d],{fill:mix(P.paper,P.c1,.35),fa:.07,ea:.55,ec:P.c1,a:na,shadow:false,dz:-30})});
    if(k===1){R.label([A.x-A.w/2,YB+1.6,-A.d/2],'namespaces: own PIDs, mounts, network, hostname',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,a:e,grp:'side'});
      R.label([-3.3,YP+.8,-.3],'PID 1 inside · 68321 on the host',{fs:12.5,b:1,c:P.c1,dy:-28,a:e,wide:1});
      R.label([B.x,YB+1.95,0],'its own view',{fs:12.5,c:P.c1,dy:-10,a:e})}
    // USE: the cgroup's ceiling over container A, and usage pushed back by it
    const ca=k<2?0:k===2?e:.3,YC=YB+1.85;
    R.glass([A.x-A.w/2+.1,YC,-A.d/2+.1],[A.w-.2,0,0],[0,0,A.d-.2],{c:P.c6,a:ca,nu:6,nv:4,dz:-40});
    if(k>=2){const u=k===2?cl(e*1.4,0,1):1,top=lerp(YP+.8,YC-.02,u),hit=k===2&&u>=1;
      const top2=lerp(YP,YC-.02,u),GX=-3.7,GZ=.6;R.box([GX,YP,GZ],[.36,Math.max(.01,top2-YP),.36],{fill:mix(P.paper,P.c6,.6),a:ca,shadow:false,lw:.7});
      if(k===2){R.label([GX,YP,GZ],'usage',{fs:12,c:P.c6,dy:12,b:1,a:e});R.flow([[-3.3,YP+.5,-.3],[GX,top2,GZ]],{c:P.c6,a:e*.8,r:.05,n:5,speed:.8});
        if(hit){R.glow([GX,YC,GZ],.5,{c:P.bad,a:.9});R.label([GX,YC,GZ],'pushed back at the limit',{al:'left',dx:12,fs:12.5,b:1,c:P.bad,dy:-12})}}}
    if(k===2)R.label([A.x,YC,-A.d/2],'cgroup: memory.max · cpu.max · io.max · pids.max',{fs:12.5,b:1,c:P.c6,a:e,dy:-16});
    // DO: the gate between every container and the kernel
    const ga=k<4?0:k===4?e:.45;
    R.glass([-5,YG,-1.8],[10,0,0],[0,0,3.6],{c:P.c2,a:ga,nu:14,nv:4,th:.03});
    if(k>=4)R.label([-5,YG,1.8],'gate: capabilities · seccomp · LSM',{al:'left',dx:6,dy:-12,fs:12.5,b:1,c:P.c2,a:k===4?e:.6,grp:'side2'});
    if(k===4){[[-3.3,-.3,1],[-2.25,.45,1],[2.45,0,1]].forEach(([x,z])=>R.flow([[x,YP,z],[x,YG,z],[x,KT,z]],{c:P.good,a:e,r:.06,n:6,speed:.9}));
      const x=-1.35,z=.45;R.flow([[x,YP,z],[x,YG+.04,z]],{c:P.bad,a:e,r:.06,n:4,speed:.7});R.glow([x,YG,z],.35,{c:P.bad,a:e});
      R.label([x,YG,z],'perf_event_open: EPERM',{al:'left',dx:14,dy:4,fs:12.5,b:1,c:P.bad,a:e})}
    // nothing else in between: allowed calls from both containers run the same kernel's code
    if(k===5){const pts=[[-3.3,-.3],[-2.25,.45],[2.45,0]];pts.forEach(([x,z])=>R.flow([[x,YP,z],[x,YG,z],[lerp(x,0,.3),KT+.02,lerp(z,0,.3)]],{c:P.bad,a:e,r:.065,n:7,speed:1}));
      R.glow([0,KT,0],1.1,{c:P.bad,a:.35*e});R.label([0,KT,0],'the same kernel answers both: no second kernel in between',{fs:12.5,b:1,c:P.bad,dy:22,a:e,wide:1})}
  }
  const full={cam:[.22,.34],bounds:[[-5.3,0,-1.9],[5.3,3.8,1.9]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one kernel, many containers',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    // steps 3 and 4 move in on container A (its cgroup and its image); the others show the whole machine
    view:k=>k===2||k===3?{cam:[.35,.3],bounds:[[-4.4,1.3,-1.5],[-.3,3.7,1.5]]}:full,
    margin:w=>w<520?[16,8,16,8]:[18,16,18,16]});
})();
