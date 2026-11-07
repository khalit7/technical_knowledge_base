// ---- Scene, Fig. 5 (section 7): a system call travelling down through three gates (seccomp at entry, a capability inside the call, the object check) to the kernel (renderer v2) ----
// Data: the seccomp probe and capability runs (window.CT_DATA.sc_probe, caps), the per-call cost (sc_cost: ns per getppid, median of 3 runs) and the io_uring rows.
(function(){
  if(!document.getElementById('stg-sc')||!window.CT_DATA)return;const {at,off,lerp,lerp3,mix,cl}=S3,D=window.CT_DATA,C=D.sc_cost;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v};
  set('rd-sc-pass',C.default['0'].toFixed(1));set('rd-sc-c0',C.unconfined['0'].toFixed(1));set('rd-sc-c1',C.default['0'].toFixed(1));set('rd-sc-c8',C.default['8'].toFixed(1));
  const YP=3.7,G1=2.75,G2=1.85,G3=.95,KT=.25,X0=-3.4,GW=6.8,Z0=-1.2,GD=2.4;
  // four calls, one lane each: where each stops (0 = reaches the kernel), and what it got
  const L=[{x:-2.55,n:'getppid',stop:0,c:'good'},{x:-.85,n:'perf_event_open',stop:1,why:'EPERM: not in the allowlist'},{x:.85,n:'nice -5',stop:2,why:'Permission denied: no CAP_SYS_NICE'},{x:2.55,n:'cat /etc/shadow',stop:3,why:'Permission denied: the real root\'s file'}];
  const GY=[0,G1,G2,G3];
  function draw(R,k,e){const P=R.P;R.grid(-5,5.5,-2.4,2.4,.5);
    // the kernel and the process
    R.box([0,0,0],[GW+.4,KT,GD+.2],{fill:mix(P.paper,P.c5,.28),shadow:false,dz:60});R.label([X0,KT,GD/2],'kernel code',{al:'right',dx:-8,fs:12.5,b:1,c:P.c5,grp:'g'});
    R.box([0,YP,0],[GW,.32,1],{fill:mix(P.paper,P.c1,.35),shadow:false});R.label([X0,YP+.16,GD/2+Z0],'the process · root, Docker defaults',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,grp:'g'});
    // the three gates
    const ga=[0,k===4?1:.8,k===4?.3:.8,k===4?.3:.8];
    R.glass([X0,G1,Z0],[GW,0,0],[0,0,GD],{c:P.c2,a:ga[1],nu:10,nv:3,th:.03});R.label([X0,G1,GD/2+Z0],'1 seccomp filter · at entry',{al:'right',dx:-8,fs:12.5,b:1,c:P.c2,grp:'g'});
    R.glass([X0,G2,Z0],[GW,0,0],[0,0,GD],{c:P.c1,a:ga[2],nu:10,nv:3,th:.03});R.label([X0,G2,GD/2+Z0],'2 capability · inside the call',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,grp:'g'});
    R.glass([X0,G3,Z0],[GW,0,0],[0,0,GD],{c:P.c4,a:ga[3],nu:10,nv:3,th:.03});R.label([X0,G3,GD/2+Z0],'3 object · permissions, LSM',{al:'right',dx:-8,fs:12.5,b:1,c:P.c4,grp:'g'});
    // step 5: eight more filters stacked on gate 1; every one of them runs on every call
    if(k===4)for(let i=1;i<=8;i++)R.glass([X0,G1+i*.07,Z0],[GW,0,0],[0,0,GD],{c:P.c2,a:e*.55,nu:1,nv:1,th:.01});
    // the four calls: the step's own call at full strength, earlier ones receding
    L.forEach((l,i)=>{if(k<i||k>=4&&i>0)return;const now=k===i,a=now?1:k>=4?1:.3,end=l.stop?GY[l.stop]+.04:KT+.02,col=l.stop?P.bad:P.good;
      R.flow([[l.x,YP,0],[l.x,end,0]],{c:col,a:now?e:a,r:now?.075:.06,n:Math.round((YP-end)*3),speed:1.1});
      if(now||(k===4&&i===0))R.label([l.x,YP+.32,0],l.n,{fs:12.5,mono:true,b:now,dy:-12,a:Math.max(.45,a),c:now?col:P.ink});
      if(l.stop){R.glow([l.x,GY[l.stop],0],.42,{c:P.bad,a:now?e:.4});if(now)R.label([l.x,GY[l.stop],0],l.why,{fs:12.5,b:1,c:P.bad,dy:18,a:e})}
      else if(now||k===4)R.label([l.x,KT,0],k===4?'':'reaches the kernel',{fs:12.5,b:1,c:P.good,dy:14,a:now?e:1})});
    if(k===3)R.label([L[3].x,G1,0],'that run: no filter',{fs:12,c:P.mute,dy:-12,a:e,wide:1});
    // step 5: what one allowed call costs, bars on the floor beside the kernel (ns per getppid, measured)
    if(k===4){const B=[['no filter',C.unconfined['0'],P.mute],['Docker\'s filter',C.default['0'],P.c2],['+ 8 filters',C.default['8'],P.bad]];
      B.forEach(([t,v,c],i)=>{const h=v/C.default['8']*2.2,x=4.4,z=.8-i*.8;R.box([x,0,z],[.5,h*e,.5],{fill:mix(P.paper,c,.45)});R.label([x+.25,h*e,z],v.toFixed(0)+' ns · '+t,{al:'left',dx:6,fs:12,b:1,c,a:e,grp:'bars'})})}
    // step 6: io_uring: one io_uring_enter goes through gate 1; the operations in the shared rings never do
    if(k===5){const RX=3.95,RZ=0;R.glass([RX-.6,.9,RZ-.6],[1.2,0,0],[0,0,1.2],{c:P.c6,a:e,nu:4,nv:4});R.label([RX,.9,RZ+.6],'shared rings (SQ, CQ)',{fs:12.5,b:1,c:P.c6,dy:14,a:e});
      R.flow([[2.6,YP,0],[RX,1.0,RZ]],{c:P.c6,a:e,r:.07,n:9,speed:1.1});R.flow([[RX,.9,RZ],[RX-.4,KT+.02,RZ]],{c:P.c6,a:e,r:.07,n:4,speed:1.1});
      R.flow([[-2.55,YP,0],[-2.55,KT+.02,0]],{c:P.good,a:e,r:.06,n:6,speed:1.1});R.label([-2.55,YP+.32,0],'io_uring_enter: one call',{fs:12.5,mono:true,b:1,dy:-12,c:P.good,a:e});
      R.label([RX,YP-.6,RZ],'reads, writes, sockets: not seen by the filter',{al:'right',dx:-6,fs:12.5,b:1,c:P.c6,a:e,wide:1})}
  }
  const full={cam:[.22,.34],bounds:[[-3.5,0,-1.3],[5.4,4.1,1.3]]};
  S3.stage({id:'stg-sc',list:'sx-sc',fig:'Fig. 5 · three gates on one system call',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[18,16,18,190]});
})();
