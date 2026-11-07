// ---- Scene, Fig. 10 (section 9): one CUDA call down, the first in a process (eleven steps) against a launch in the training loop (five) (renderer v2) ----
// The layers as glass plates (user space above the dashed kernel boundary, nvidia.ko and GSP-RM below, the GPU at the bottom); on the right, the
// channel memory the first call maps into the process (pushbuffer, GPFIFO ring) and, on the GPU, the doorbell register. Steps from the open driver's
// interface (615.71.09); the order inside the closed libcuda is simplified, as the step lists say. Two step lists: sx-fc-first, sx-fc-steady.
(function(){
  if(!document.getElementById('stg-cuda'))return;const {at,mix}=S3;
  const X=-1.3,PW=2.6,PD=1.4,YP=4.3,YR=3.65,YC=3.0,YB=2.5,YK=1.95,YG=1.2;
  const L={py:[X,YP+.05,0],rt:[X,YR+.05,0],cu:[X,YC+.05,0],ko:[X,YK+.05,0],gsp:[X,YG+.05,0],pb:[1.55,YC+.32,-.2],gp:[1.55,YC+.15,.75],db:[-.35,.6,.35],gpu:[X-.4,.5,0]};
  // a step: at (where the call is), sys (enters the kernel), rpc (on to GSP-RM), dev (device files lit), map (channel memory appears), dma, mmio
  const M={first:[{at:'cu',sys:1,say:'openat, mmap'},{at:'cu',sys:1,dev:[0],say:'open /dev/nvidiactl'},{at:'cu',sys:1,say:'version check'},{at:'cu',sys:1,rpc:1,say:'RM_ALLOC, RM_CONTROL'},
      {at:'cu',sys:1,dev:[1,2],say:'open nvidia0, nvidia-uvm'},{at:'cu',sys:1,rpc:1,map:1,say:'allocate and map'},{at:'cu',sys:1,code:1,say:'load module'},
      {at:'pb',user:1},{at:'gp',user:1},{at:'db',mmio:1},{at:'gpu',dma:1}],
    steady:[{at:'cu',down:1},{at:'pb',user:1},{at:'gp',user:1},{at:'db',mmio:1},{at:'gpu',dma:1}]};
  let mode='first';
  const DEV=['nvidiactl','nvidia0','nvidia-uvm'];
  function draw(R,k,e){const P=R.P,nar=R.W<520,S=M[mode],st=S[k],first=mode==='first';R.grid(-4,4,-1.6,1.8,.5);
    const pl=(y,c,lab,a)=>{R.glass([X-PW/2,y,-PD/2],[PW,0,0],[0,0,PD],{c:P[c],a,nu:6,nv:3,th:.03});R.label([X-PW/2,y,0],lab,{al:'right',dx:-8,fs:12.5,b:1,c:P.ink,a:Math.max(.45,a)})};
    const kin=st.sys||st.code||(k===0&&!first);
    pl(YP,'c1','PyTorch',st.down?1:.45);pl(YR,'c4',nar?'runtime':'CUDA runtime',st.down?1:.45);pl(YC,'c4',nar?'libcuda':'libcuda (driver)',1);
    pl(YK,'c2','nvidia.ko',st.sys?1:.35);pl(YG,'c5',nar?'GSP-RM':'GSP-RM firmware',st.rpc?1:.3);
    // the kernel boundary
    const bx=[[-2.9,YB,-.85],[3.0,YB,-.85],[3.0,YB,1.2],[-2.9,YB,1.2],[-2.9,YB,-.85]];R.line(bx,{c:P.bad,w:1.3,dash:[5,4],a:.75});
    R.label([3.0,YB,1.2],'kernel boundary',{al:'left',dx:6,fs:12,c:P.bad,wide:1});
    // device files on nvidia.ko
    DEV.forEach((d,i)=>{const on=st.dev&&st.dev.indexOf(i)>=0,p=[X-.85+i*.85,YK,.35];R.box(p,[.7,.14,.4],{fill:mix(P.paper,P.c2,on?.6:.15),a:on?1:.45,shadow:false});
      if(on)R.label([p[0],p[1]+.14,p[2]],'/dev/'+d,{fs:12,b:1,mono:true,dy:-10,c:P.c2,a:e})});
    // the GPU and its doorbell register
    R.box([X,0,0],[2.4,.5,1.2],{fill:mix(P.paper,P.c3,st.dma?.6:.4)});R.label([X-1.2,.25,0],'GPU',{al:'right',dx:-8,fs:12.5,b:1});
    const mapped=!first||k>=5,ma=first&&k===5?e:1;
    R.box([L.db[0],.5,L.db[2]],[.4,.14,.32],{fill:mix(P.paper,P.c2,st.mmio?.8:.35),a:mapped?ma:.15,shadow:false});
    if(mapped&&(st.mmio||k===5&&first))R.label([L.db[0],.64,L.db[2]],'doorbell',{fs:12.5,b:1,dy:-10,dx:14,al:'left',c:P.c2,a:ma});
    // channel memory mapped into the process: pushbuffer and the GPFIFO ring
    if(mapped){R.box([L.pb[0],YC,L.pb[2]],[1.1,.3,.75],{fill:mix(P.paper,P.c6,st.at==='pb'?.6:.25),a:ma});R.label([L.pb[0]+.55,YC+.15,L.pb[2]],'pushbuffer',{al:'left',dx:6,fs:12.5,b:1,c:P.c6,a:ma});
      for(let i=0;i<6;i++)R.box([1.05+i*.22,YC,L.gp[2]],[.18,.14,.3],{fill:mix(P.paper,P.c6,st.at==='gp'&&i===2?.85:i<2?.45:.15),a:ma,shadow:false});
      R.label([2.4,YC+.07,L.gp[2]],'GPFIFO',{al:'left',dx:6,fs:12.5,b:1,c:P.c6,a:ma});
      R.line([[L.db[0]+.2,.64,L.db[2]],[.9,YC-.02,.35]],{c:P.c2,w:1,dash:[3,4],a:ma*.6})}
    // the call: a ball moving between places; streams on its path
    const prev=k===0?(first?L.rt:L.py):L[S[k-1].at],cur=L[st.at];
    if(st.down){R.flow([L.py,L.rt,L.cu],{c:P.acc,a:e,r:.08,speed:1.2})}
    else if(st.at!==(k?S[k-1].at:'')||k===0){R.flowArc(prev,cur,st.at==='db'?.3:.25,{c:st.mmio?P.c2:P.acc,a:e,r:.075,n:8,speed:1.3})}
    R.ball(R.arcPt(prev,cur,.25,e),.12,{c:P.acc,top:1});
    if(st.sys){const d=[X+.3,YK+.08,0];R.flow([[X+.3,YC,0],d],{c:P.bad,a:e,r:.08,n:5,speed:.9});R.flow([[X+.6,YK+.08,0],[X+.6,YC,0]],{c:P.bad,a:e*.7,r:.07,n:5,speed:.9});R.glow(d,.35,{c:P.bad,a:e*.7})}
    if(st.rpc)R.flowArc([X+.3,YK,0],[X+.3,YG+.05,0],.08,{c:P.c5,a:e,r:.08,n:5});
    if(st.code)R.flow([[X+.3,YK,0],[X+.1,.5,-.2]],{c:P.c3,a:e,r:.08,n:7});
    if(st.dma)R.flowArc([L.pb[0],YC,L.pb[2]],[X+.5,.5,0],.35,{c:P.c6,a:e,r:.09,n:10,speed:1.5});
    if(st.say)R.label([X+PW/2,YK+.2,0],st.say,{al:'left',dx:10,fs:12.5,b:1,mono:true,c:P.bad,a:e,wide:1});
    // the count of steps that entered the kernel so far
    const n=S.slice(0,k+1).filter(s=>s.sys).length;
    R.label([-2.9,YP+.5,-.7],'steps that entered the kernel: '+n,{al:'left',fs:13,b:1,mono:true,c:n?P.bad:P.good})
  }
  const st=S3.stage({id:'stg-cuda',list:'sx-fc-first',fig:'Fig. 10 · one CUDA call down',cam:[.42,.34],bounds:[[-2.8,0,-.7],[2.8,4.8,.9]],aspect:.8,dur:1300,hold:4600,draw,
    margin:w=>w<520?[16,10,16,60]:[22,120,22,130]});
  RD.seg(document.getElementById('fc-mode'),m=>{mode=m;['first','steady'].forEach(x=>{document.getElementById('sx-fc-'+x).hidden=x!==m});st.list('sx-fc-'+m)});
})();
