// ---- Scene, Fig. 6 (section 10): what untrusted code talks to: a container, gVisor and a microVM on one host kernel (renderer v2) ----
// Not run here: the layers and the two Firecracker numbers are from the gVisor security model and the Firecracker design and specification documents linked in the section.
(function(){
  if(!document.getElementById('stg-sb'))return;const {at,off,lerp,lerp3,mix,cl}=S3;
  const XC=-3.4,XG=0,XV=3.4,KT=.35,YC=3.3,CW=2.4,CD=1.8;
  function layer(R,x,y,h,col,a,o){R.box([x,y,0],[CW,h,CD],Object.assign({fill:mix(R.P.paper,col,.35),a,shadow:false},o||{}))}
  function draw(R,k,e){const P=R.P;R.grid(-6,6,-2.6,2.6,.5);
    const A=i=>k===3?1:k===i?1:.18,hot=i=>k===i||k===3,LA=i=>k===3||A(i)<1?0:A(i); // labels of the parts hide on the comparison step, which names only the boundaries // each step is about one design; the last shows all three
    // the one host kernel under all three
    R.box([0,0,0],[10.6,KT,2.4],{fill:mix(P.paper,P.c5,.28),shadow:false,dz:60,ec:hot(0)?P.bad:undefined,lw:hot(0)?1.8:.9});
    R.label([-5.3,KT,1.2],'the host kernel',{al:'left',dx:6,dy:12,fs:12.5,b:1,c:P.c5});
    // the untrusted code on top of each column
    [[XC,0],[XG,1],[XV,2]].forEach(([x,i])=>{R.box([x,YC,0],[1.3,.5,.9],{fill:mix(P.paper,P.bad,.22),a:A(i),shadow:false});R.label([x,YC+.5,0],'untrusted code',{fs:12,dy:-10,c:P.bad,a:LA(i)})});
    // container: the gate of section 7, then straight into the host kernel
    R.glass([XC-CW/2,1.6,-CD/2],[CW,0,0],[0,0,CD],{c:P.c2,a:A(0)*.9,nu:5,nv:3,th:.03});
    R.label([XC,1.6,-CD/2],'seccomp · capabilities · LSM',{fs:12,dy:-10,c:P.c2,a:LA(0)});
    R.flow([[XC,YC,0],[XC,KT+.02,0]],{c:P.bad,a:A(0)*(k===0?e:1),r:.07,n:10,speed:1.2});R.flow([[XC-.35,YC,0],[XC-.35,KT+.02,0]],{c:P.bad,a:A(0)*(k===0?e:1),r:.07,n:10,speed:1.4});
    if(k===0)R.label([XC,KT,0],'about 340 allowed calls run host kernel code',{fs:12.5,b:1,c:P.bad,dy:24,a:e,wide:1});
    // gVisor: the Sentry answers; its own seccomp filter lets few host calls through
    layer(R,XG,2.0,.7,P.c1,A(1),{ec:hot(1)?P.bad:undefined,lw:hot(1)?1.8:.9});R.label([XG,2.7,CD/2],'the Sentry: Linux in Go, user space',{fs:12,dy:-8,c:P.c1,a:LA(1),b:1});
    R.glass([XG-CW/2,1.2,-CD/2],[CW,0,0],[0,0,CD],{c:P.c2,a:A(1)*.9,nu:5,nv:3,th:.03});R.label([XG,1.2,CD/2],'its own seccomp: a small, enumerated set',{fs:12,dy:14,c:P.c2,a:LA(1),wide:1});
    R.flow([[XG,YC,0],[XG,2.72,0]],{c:P.bad,a:A(1)*(k===1?e:1),r:.07,n:5,speed:1.2});R.flow([[XG-.35,YC,0],[XG-.35,2.72,0]],{c:P.bad,a:A(1)*(k===1?e:1),r:.07,n:5,speed:1.4});
    R.flow([[XG+.3,2.0,0],[XG+.3,KT+.02,0]],{c:P.c1,a:A(1)*(k===1?e:1),r:.055,n:3,speed:.8});
    // microVM: a guest kernel, KVM and virtio, the VMM process under seccomp and a jailer
    layer(R,XV,2.1,.55,P.c4,A(2));R.label([XV,2.65,CD/2],'a guest Linux kernel',{fs:12,dy:-8,c:P.c4,a:LA(2),b:1});
    R.glass([XV-CW/2,1.6,-CD/2],[CW,0,0],[0,0,CD],{c:P.c6,a:A(2),nu:5,nv:3,th:.05});if(hot(2))R.glow([XV,1.6,0],.9,{c:P.bad,a:.25*(k===2?e:1)});
    R.label([XV+CW/2,1.6,0],'KVM · virtio net and block',{al:'left',dx:6,fs:12,c:P.c6,a:LA(2),b:1,wide:1});
    R.box([XV+.6,.75,0],[.8,.4,.7],{fill:mix(P.paper,P.ink,.12),a:A(2),shadow:false});R.label([XV+1.0,.95,0],'VMM: seccomp, jailer',{al:'left',dx:6,fs:12,c:P.mute,a:LA(2),wide:1});
    R.flow([[XV,YC,0],[XV,2.67,0]],{c:P.bad,a:A(2)*(k===2?e:1),r:.07,n:5,speed:1.2});R.flow([[XV-.35,YC,0],[XV-.35,2.67,0]],{c:P.bad,a:A(2)*(k===2?e:1),r:.07,n:5,speed:1.4});
    R.flow([[XV+.4,2.1,0],[XV+.6,1.15,0],[XV+.6,KT+.02,0]],{c:P.c6,a:A(2)*(k===2?e:1),r:.055,n:3,speed:.8});
    if(k===2)R.label([XV,KT,0],'≤ 125 ms to /sbin/init · ≤ 5 MiB per VM',{fs:12.5,b:1,c:P.c4,dy:24,a:e,wide:1});
    // column titles, and the boundary in each (step 4)
    [[XC,'container (runc)',0],[XG,'gVisor (runsc)',1],[XV,'microVM (Firecracker, Kata)',2]].forEach(([x,t,i])=>R.label([x,YC+.5,0],t,{fs:13,b:1,dy:-28,a:A(i)<1?0:1,c:P.ink}));
    if(k===3){R.label([XC,KT,-1.2],'boundary: the host kernel',{fs:12.5,b:1,c:P.bad,dy:-6,a:e});R.label([XG,2.0,-CD/2],'boundary: the Sentry',{fs:12.5,b:1,c:P.bad,dy:-10,a:e});
      R.label([XV,1.6,-CD/2],'boundary: hardware virtualization',{fs:12.5,b:1,c:P.bad,dy:-10,a:e})}
  }
  const full={cam:[.12,.3],bounds:[[-5.4,0,-1.3],[5.4,4,1.3]]};
  S3.stage({id:'stg-sb',list:'sx-sb',fig:'Fig. 6 · another kernel in the way · not run here',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    view:k=>k===0?{cam:[.2,.3],bounds:[[-5.2,0,-1.3],[-1.6,4,1.3]]}:k===1?{cam:[.12,.3],bounds:[[-1.8,0,-1.3],[1.8,4,1.3]]}:k===2?{cam:[.05,.3],bounds:[[1.6,0,-1.3],[5.6,4,1.3]]}:full,
    margin:w=>w<520?[16,8,16,8]:[18,16,18,16]});
})();
