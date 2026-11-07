// ---- Scene, Fig. 3 (section 2): a system call stays in the guest, a device register store exits to EL2 and out to QEMU and back (renderer v2) ----
// The guest's EL0 and EL1 plates on the left, the host's user space (QEMU's vCPU thread) on the right, EL2 (Hypervisor.framework) under both.
// Bars: the measured medians of src/exp/hvf_exits.c on the macOS host (VD.hvf: hvc, mmio, wfi, kick) and the root page's read() system call (0.316 µs).
(function(){
  if(!document.getElementById('stg-exit')||!window.VD)return;const {at,mix}=S3;
  const H=VD.hvf,SYS=.316;
  const YU=2.5,YK=1.5,YH=.45,GX=-1.75,QX=2.15;
  const POS={proc:[GX,YU+.38,0],gk:[GX,YK+.38,0],el2:[.2,YH+.38,0],qemu:[QX,YU+.38,0],thr:[QX+.1,YU+.38,-.85]};
  // the bar field in front: [label, value, colour, step it appears]
  const BARS=[['mmio',H.mmio_med,'c2',2,'str to a device register'],['hvc',H.hvc_med,'c2',3,'hvc #0'],['wfi',H.wfi_med,'c2',3,'wfi'],['kick',H.kick_med,'c4',4,'forced exit'],['read()',SYS,'c1',5,'read() system call']];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.4,4.4,-1.6,2.4,.5);
    // plates: guest EL0, guest EL1, host user space, EL2 under everything
    const pa=k>=3?.3:1;
    R.glass([-3.5,YU,-.9],[3.5,0,0],[0,0,1.6],{c:P.c1,a:pa*.9,nu:7,nv:3,th:.03});R.label([-3.5,YU,0],nar?'EL0':'EL0 · your process',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1});
    R.glass([-3.5,YK,-.9],[3.5,0,0],[0,0,1.6],{c:P.c1,a:pa,nu:7,nv:3,th:.03});R.label([-3.5,YK,0],nar?'EL1':'EL1 · guest kernel',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1});
    R.glass([.9,YU,-1.4],[2.6,0,0],[0,0,2.1],{c:P.c5,a:pa*.9,nu:5,nv:4,th:.03});R.label([3.5,YU,0],nar?'host EL0':'macOS user space',{al:'left',dx:8,fs:12.5,b:1,c:P.c5});
    R.glass([-3.5,YH,-1.4],[7,0,0],[0,0,2.1],{c:P.c2,a:pa,nu:12,nv:4,th:.03});R.label([3.5,YH,0],nar?'EL2':'EL2 · hypervisor',{al:'left',dx:8,fs:12.5,b:1,c:P.c2});
    if(k<3)R.label([GX,YU+.4,-.9],'the guest',{serif:true,fs:14,b:1,dy:-14});
    const hot=n=>(k===1&&(n==='proc'||n==='gk'))||(k===2&&n!=='proc'&&n!=='thr')||(k===4&&(n==='thr'||n==='el2'||n==='gk'));
    const obj=(n,s,lab,c)=>{const p=POS[n],on=hot(n);R.box([p[0],p[1]-.38,p[2]],s,{fill:mix(P.paper,c,on?.5:.18),a:k>=3&&!on?.5:1});
      if(k<3||on)R.label([p[0],p[1]-.38+s[1],p[2]],lab,{fs:12.5,b:1,mono:true,dy:-10,c:on?P.ink:P.mute})};
    obj('proc',[1.3,.32,.8],'process',P.c1);obj('gk',[1.4,.32,.8],'guest kernel',P.c1);obj('el2',[1.5,.3,.8],'exit handler',P.c2);obj('qemu',[1.3,.32,.8],'QEMU vCPU',P.c5);
    if(k===4)obj('thr',[1.3,.32,.7],'other thread',P.c4);
    // the device register the guest stores to: a small red box on the EL1 plate (an address with no memory behind it)
    const dr=[-.5,YK,.4];R.box(dr,[.4,.18,.35],{fill:mix(P.paper,P.bad,.45),a:k===2?1:.4});if(k===2)R.label([dr[0],dr[1]+.18,dr[2]],'device register',{fs:12,dy:-8,dx:-16,al:'right',c:P.bad,a:e});
    // 1. getpid(): EL0 to EL1 and back, the hypervisor untouched
    if(k===1){R.flowArc([GX-.2,YU+.05,.1],[GX-.2,YK+.35,.1],.12,{c:P.c1,a:e,r:.08,n:5});R.flowArc([GX+.25,YK+.35,.1],[GX+.25,YU+.05,.1],.12,{c:P.c1,a:e,r:.08,n:5});
      R.label([GX+.9,YK+.9,0],'getpid(): no exit',{al:'left',fs:13,b:1,c:P.c1,a:e,dx:6})}
    // 2. the exit loop: guest kernel to EL2, out to QEMU, back down, back into the guest
    const loop=[[GX+.6,YK+.2,0],[-.2,YH+.4,0],[.6,YH+.4,0],[QX-.4,YU+.15,0],[QX,YU+.15,0],[QX+.4,YU+.15,0],[.9,YH+.35,.3],[-.4,YH+.35,.3],[GX+.75,YK+.15,.3]];
    if(k>=2&&k!==4){R.flow(loop,{c:P.bad,a:k===2?e:.25,r:.1,speed:1.6,n:16});if(k===2)R.label([.2,YH,.4],'class 0x24 · '+H.mmio_med.toFixed(2)+' µs',{fs:13,b:1,mono:true,dy:26,c:P.bad,a:e})}
    // 4. a forced exit: another host thread pulls the running vCPU out
    if(k===4){R.flow([POS.thr,[.6,YH+.4,-.5],[GX+.5,YK+.2,-.3]],{c:P.c4,a:e,r:.085,speed:1.5});R.label([.4,YH+.7,-.5],'hv_vcpus_exit',{fs:12.5,b:1,mono:true,dy:-24,c:P.c4,a:e})}
    // 3 to 5: the measured costs as bars on a white plinth in front
    if(k>=3){const z=1.9,x0=-2.8,dx=1.4,sc=1.5,ba=k===3?e:1;R.box([x0+2*dx,0,z],[5*dx+.3,.06,.55],{a:ba,shadow:false});
      BARS.forEach(([l,v,c,s,lab],i)=>{if(k<s)return;const a=k===s?e:1,h=v*sc,x=x0+i*dx;
        R.box([x,.06,z],[.62,Math.max(.02,h*a),.38],{fill:mix(P.paper,P[c],.6),a:Math.max(a,.2),shadow:false});
        R.label([x,.06+h,z],v.toFixed(v<.5?3:2)+' µs',{fs:12.5,b:1,mono:true,dy:-10,c:P.ink,a});
        R.label([x,0,z+.3],l,{fs:12.5,mono:true,dy:12,c:P.mute,a})})}
    if(k===5)R.label([-.1,0,2.2],'one exit ≈ '+(H.mmio_med/SYS).toFixed(1)+' system calls',{fs:13.5,b:1,dy:40,c:P.ink,a:e})
  }
  const full={cam:[.3,.55],bounds:[[-3.6,0,-1.4],[3.6,3.0,1.0]]};
  S3.stage({id:'stg-exit',list:'sx-exit',fig:'Fig. 3 · one VM exit, measured',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1400,hold:4800,draw,
    view:k=>k===1?{cam:[.3,.45],bounds:[[-3.6,1.2,-1],[0,3.1,1.0]]}:k>=3?{cam:[.08,.42],bounds:[[-3.4,0,.4],[3.4,1.9,2.3]]}:full,
    margin:w=>w<520?[16,40,24,40]:[22,130,28,140]});
})();
