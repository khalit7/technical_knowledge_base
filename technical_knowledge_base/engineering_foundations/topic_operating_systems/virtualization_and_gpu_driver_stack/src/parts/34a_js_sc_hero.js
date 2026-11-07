// ---- Scene, Fig. 1 (the idea): two stacks as glass plates, the direct paths streaming through them and the crossings that cost (renderer v2) ----
// Left, the VM this page ran in (QEMU 5.2 on Hypervisor.framework, an M1 Pro); right, one CUDA call as the open kernel modules 615.71.09 lay it out.
// The exit cost is the page's measured median (VD.hvf.mmio_med); everything else is structure from sections 2 and 9.
(function(){
  if(!document.getElementById('stg-hero')||!window.VD)return;const {at,mix}=S3;
  const XV=-2.25,XC=2.25,PW=2.5,PD=1.5,ex=VD.hvf.mmio_med.toFixed(2);
  // [label, short label (phone), y, colour key]
  const VM=[['your process · EL0','process',3.0,'c1'],['guest kernel · EL1','guest kernel',2.1,'c1'],['hypervisor · EL2, QEMU','hypervisor',1.2,'c2']];
  const CU=[['PyTorch','PyTorch',3.3,'c1'],['CUDA runtime','runtime',2.75,'c4'],['user-mode driver libcuda','libcuda',2.2,'c4'],['kernel driver nvidia.ko','nvidia.ko',1.45,'c2'],['GSP firmware (GSP-RM)','GSP-RM',.9,'c5']];
  // labels sit beside their tower (VM on the left, CUDA on the right) and only while that tower is in view
  function plate(R,x,y,c,a,lab,side,la){const P=R.P;R.glass([x-PW/2,y,-PD/2],[PW,0,0],[0,0,PD],{c:P[c],a,nu:6,nv:4,th:.03});
    if(la)R.label([x+side*PW/2,y,0],lab,{fs:12.5,b:1,al:side<0?'right':'left',dx:side*8,c:P.ink,a:Math.max(.45,a)})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.4,4.4,-1.6,1.6,.5);
    const av=k===0?1:k<=2?1:.22,ac=k===0?1:k>=3?1:.22,lv=k<=2,lc=k===0||k>=3;
    // the VM tower
    VM.forEach(([l,s,y,c],i)=>{let a=av;if(k===1&&i===2)a=.3;if(k===2&&i===0)a=.4;plate(R,XV,y,c,a,nar?s:l,-1,lv)});
    R.box([XV,0,0],[1.9,.42,1.1],{fill:mix(P.paper,P.c3,.45),a:av});if(lv)R.label([XV-.95,.21,0],nar?'CPU':'CPU and memory · M1 Pro',{fs:12.5,b:1,al:'right',dx:-8});
    if(lv)R.label([XV,3.0,-PD/2],'the VM',{serif:true,fs:15,b:1,dy:-16,c:P.ink});
    // the CUDA tower and the kernel boundary between libcuda and nvidia.ko
    CU.forEach(([l,s,y,c],i)=>{let a=ac;if(k===3&&(i===3||i===4))a=.3;if(k===4&&i<2)a=.4;plate(R,XC,y,c,a,nar?s:l,1,lc)});
    R.box([XC,0,0],[1.9,.42,1.1],{fill:mix(P.paper,P.c3,.45),a:ac});if(lc)R.label([XC+.95,.21,0],'GPU',{fs:12.5,b:1,al:'left',dx:8});
    const yb=1.82,bx=[[XC-1.45,yb,-.9],[XC+1.45,yb,-.9],[XC+1.45,yb,.9],[XC-1.45,yb,.9],[XC-1.45,yb,-.9]];
    R.line(bx,{c:P.bad,w:1.3,dash:[5,4],a:ac*.8});if(k>=3&&!nar)R.label([XC-1.45,yb,.9],'kernel boundary',{al:'right',dx:-6,fs:12,c:P.bad});
    if(lc)R.label([XC,3.3,-PD/2],'one CUDA call',{serif:true,fs:15,b:1,dy:-16,c:P.ink});
    // 1. guest code runs directly: a stream from the process straight through to the CPU
    if(k===1){R.flow([[XV+.3,3.02,.1],[XV+.3,.45,.1]],{c:P.acc,a:e,r:.09,speed:1.3});
      R.label([XV+PW/2,1.65,0],'runs directly: no exit',{al:'left',fs:12.5,b:1,c:P.acc,a:e,dx:8})}
    // 2. a VM exit: from the guest kernel down to the hypervisor and back
    if(k===2){const g=[XV-.1,2.12,0],h=[XV+.5,1.22,0];R.flowArc(g,h,.2,{c:P.bad,a:e,r:.09,n:7,speed:1.2});R.flowArc([h[0]+.1,h[1],h[2]],[g[0]+.8,g[1],g[2]],.2,{c:P.bad,a:e,r:.075,n:7,speed:1.2});
      R.glow([XV+.5,1.22,0],.5,{c:P.bad,a:e*.8});R.label([XV+PW/2,1.65,0],'VM exit · '+ex+' µs',{al:'left',fs:13,b:1,dx:8,c:P.bad,a:e})}
    // 3. a launch: stores from libcuda through to the GPU, no kernel on the way
    if(k===3){R.flow([[XC-.3,2.22,.1],[XC-.3,.45,.1]],{c:P.acc,a:e,r:.09,speed:1.3});
      R.label([XC-PW/2,1.2,0],nar?'stores + doorbell':'stores + doorbell: no system call',{al:'right',fs:12.5,b:1,c:P.acc,a:e,dx:-8})}
    // 4. start-up, allocation, errors: an ioctl into nvidia.ko, then an RPC to GSP-RM on the GPU
    if(k===4){const u=[XC-.3,2.22,0],d=[XC-.3,1.47,0],g=[XC+.4,.92,0];R.flow([u,d],{c:P.bad,a:e,r:.09,n:6,speed:.9});R.flowArc(d,g,.15,{c:P.c5,a:e,r:.085,n:6});
      R.glow(d,.4,{c:P.bad,a:e*.7});R.glow(g,.4,{c:P.c5,a:e*.6});R.label([XC-PW/2,1.85,0],'ioctl: start-up, allocation, errors',{al:'right',fs:12.5,b:1,c:P.bad,a:e,dx:-8,wide:1});R.label([XC-PW/2,1.15,0],'RPC to the GPU',{al:'right',fs:12.5,b:1,c:P.c5,a:e,dx:-8,wide:1})}
  }
  const full={cam:[.16,.34],bounds:[[-5.3,0,-.95],[5.3,3.4,.95]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two stacks, one rule',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:4800,draw,
    view:k=>k===1||k===2?{cam:[.2,.32],bounds:[[XV-3.1,0,-.95],[XV+3.0,3.2,.95]]}:k>=3?{cam:[.12,.32],bounds:[[XC-3.4,0,-.95],[XC+2.9,3.4,.95]]}:full,
    margin:w=>w<520?[16,8,16,8]:[20,14,20,14]});
})();
