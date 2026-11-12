// ---- Scene, Fig. 4 (section 2): a Mac's unified pool against a PC with a discrete GPU, memory to scale (one glass cell = 1 GB on the pool and the card).
// Machines from LO.hw (this M1 Pro: 16 GB, 200 GB/s; RTX 5090: 32 GB, 1,792 GB/s, NVIDIA's figures); the file is Fig. 1's Qwen3-4B Q4_K_M with an
// importance matrix (LO.q.m4) and its F16 KV cache at 40,960 tokens. The 43 GB model is section 9's 70B at about 4.8 bits; PCIe x8 at about 32 GB/s each way
// is section 9's figure for two cards on a desktop CPU. System RAM is drawn without a size (machines differ). ----
(function(){
  if(!document.getElementById('stg-mem')||!window.LO||!LO.q||!LO.q.m4)return;const {at,off,lerp,mix}=S3;
  const mac=LO.hw.find(h=>h.k==='m1pro16'),gpu=LO.hw.find(h=>h.k==='r5090'),it=LO.q.m4.items.find(x=>x.id==='Q4_K_M+i'),M=LO.models.find(m=>m.k==='q4');
  const W8=it.bytes/1e9,KV=M.kv_tok_f16*40960/1e9,WS=parseFloat(LO.facts.wsGB),BIG=43;
  (window.LOSC=window.LOSC||{}).mem={W8,KV,ceil:gpu.bw/W8,ratio:gpu.bw/mac.bw,spill:BIG-gpu.mem};
  const U=.2,Z0=-.8,Z1=.8;
  // the Mac on the left; the PC on the right: system RAM, then the card's memory
  const MX0=-7.4,mx=g=>MX0+g*U,MCPU=[-6.8,0,-2.3],MGPU=[-4.8,0,-2.3];
  const RX0=-2.7,RX1=-.5,VX0=.6,vx=g=>VX0+g*U,PCPU=[-1.6,0,-2.5],PGPU=[vx(16),0,-2.5];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-9,8,-3.6,1.8,.5);
    const ma=k===0||k===5?1:.25,pa=k===0?.2:1,mla=k===0||k===5?1:0,pla=k===0?0:1;
    // ---- the Mac
    R.glass([MX0,.01,Z0],[mac.mem*U,0,0],[0,0,Z1-Z0],{c:P.acc,nu:mac.mem,nv:1,a:ma*.9,th:.03});
    R.box(MCPU,[1.3,.45,.8],{fill:mix(P.paper,P.mute,.25),a:ma});R.box(MGPU,[1.3,.45,.8],{fill:mix(P.paper,P.c1,.35),a:ma});
    R.box([mx(W8/2),.03,0],[W8*U,.42,1.3],{fill:mix(P.paper,P.c1,.72),a:ma});R.box([mx(W8+KV/2),.03,0],[KV*U,.28,1.3],{fill:mix(P.paper,P.c2,.65),a:ma});
    lab([mx(mac.mem/2),0,Z1],'Mac · one pool · 16 GB at 200 GB/s',{dy:20,b:1,c:P.acc,a:mla});
    lab([MCPU[0],.45,MCPU[2]],'CPU',{dy:-11,b:1,a:mla});lab([MGPU[0],.45,MGPU[2]],'GPU',{dy:-11,b:1,c:P.c1,a:mla});
    if(k===0){R.flowArc([mx(1),.45,0],[MGPU[0],.45,MGPU[2]],.6,{c:P.c1,r:.06,n:8,speed:1.2});R.flowArc([mx(7),.3,0],[MGPU[0]+.3,.45,MGPU[2]],.7,{c:P.c2,r:.05,n:7,speed:1.2});
      R.flowArc([mx(11),.05,0],[MCPU[0],.45,MCPU[2]],.6,{c:P.mute,r:.05,n:5,speed:1})}
    // ---- the PC
    R.glass([RX0,.01,Z0],[RX1-RX0,0,0],[0,0,Z1-Z0],{c:P.mute,nu:4,nv:1,a:pa*.9,th:.03});
    R.glass([VX0,.01,Z0],[gpu.mem*U,0,0],[0,0,Z1-Z0],{c:P.c1,nu:gpu.mem,nv:1,a:pa*.9,th:.03});
    R.box(PCPU,[1.3,.45,.8],{fill:mix(P.paper,P.mute,.25),a:pa});R.box(PGPU,[1.6,.45,.8],{fill:mix(P.paper,P.c1,.35),a:pa});
    // the PCIe link: a thin rail from the CPU to the card
    R.box([(PCPU[0]+PGPU[0])/2,.12,-2.5],[PGPU[0]-PCPU[0]-1.4,.1,.16],{fill:mix(P.paper,P.c5,.5),a:pa,shadow:false});
    lab([(RX0+RX1)/2,0,Z1],'system RAM',{dy:20,b:1,c:P.mute,a:pla});
    lab([vx(gpu.mem/2),0,Z1],'RTX 5090 · 32 GB GDDR7 at 1,792 GB/s',{dy:20,b:1,c:P.c1,a:pla});
    lab([PCPU[0],.45,PCPU[2]],'CPU',{dy:-11,b:1,a:pla});lab([PGPU[0],.45,PGPU[2]],'GPU',{dy:-11,b:1,c:P.c1,a:pla});
    lab([(PCPU[0]+PGPU[0])/2,.12,-2.5],'PCIe · about 32 GB/s each way at x8',{dy:16,c:P.c5,b:1,a:k===1||k===2?1:0});
    // steps 3 and 4: the small file; step 3 copies it from system RAM over PCIe, step 4 reads it every token
    if(k===2||k===3){const t=k===2?e:1,x=lerp((RX0+RX1)/2,vx(W8/2),t),zz=lerp(0,0,t);
      R.box([x,.03,zz],[W8*U,.42,1.3],{fill:mix(P.paper,P.c1,.72)});lab([x,.45,zz],'weights '+W8.toFixed(2)+' GB',{dy:-12,b:1,c:P.c1});
      if(k===2)R.flow([[PCPU[0]+.6,.2,-2.5],[PGPU[0]-.8,.2,-2.5]],{c:P.c1,r:.07,n:9,speed:1.4,a:e});
      if(k===3){for(let i=0;i<3;i++)R.flowArc([vx(W8*(i+.5)/3),.45,-.3+.3*i],[PGPU[0]-.3+.3*i,.45,PGPU[2]],.7,{c:P.c1,r:.07,n:8,speed:2.4,a:Math.min(1,e*1.5)});
        lab([PGPU[0]+.9,.45,PGPU[2]],'ceiling '+Math.round(gpu.bw/W8)+' tok/s',{al:'left',dx:8,b:1,c:P.c1,a:e})}}
    // step 5: a 43 GB model: 32 GB on the card, the rest left in system RAM and run by the CPU
    if(k===4){const a=e,inV=gpu.mem,sp=BIG-gpu.mem;
      R.box([vx(inV/2),.03,0],[inV*U,.42*a,1.3],{fill:mix(P.paper,P.c4,.6)});R.box([(RX0+RX1)/2,.03,0],[RX1-RX0-.2,.42*a,1.3],{fill:mix(P.paper,P.c4,.6)});
      lab([vx(inV/2),.45,0],'70B · 32 of 43 GB on the card',{dy:-12,b:1,c:P.c4,a});lab([(RX0+RX1)/2,.45,0],sp+' GB of layers',{dy:-12,b:1,c:P.c4,a});
      for(let i=0;i<3;i++)R.flowArc([vx(inV*(i+.5)/3),.45,-.2+.2*i],[PGPU[0]-.3+.3*i,.45,PGPU[2]],.7,{c:P.c4,r:.07,n:8,speed:2.4,a});
      R.flowArc([(RX0+RX1)/2,.45,0],[PCPU[0],.45,PCPU[2]],.5,{c:P.c4,r:.06,n:3,speed:.35,a})}
    if(k===5){lab([mx(mac.mem/2),0,Z1],'fits more: up to 512 GB',{dy:38,b:1,c:P.acc,a:e});lab([vx(gpu.mem/2),0,Z1],'streams faster: '+(gpu.bw/mac.bw).toFixed(0)+' times the bandwidth',{dy:38,b:1,c:P.c1,a:e})}
  }
  const full={cam:[.06,.9],bounds:[[-7.9,0,-3],[7.3,.9,1.5]]};
  const st=S3.stage({id:'stg-mem',list:'sx-mem',fig:'Fig. 4 · one pool against two memories',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5000,draw,
    view:k=>k===0?{cam:[.2,.85],bounds:[[-7.9,0,-3],[-3.6,.9,1.5]]}:k>=1&&k<=4?{cam:[.1,.85],bounds:[[-3.1,0,-3],[7.3,.9,1.5]]}:full,
    margin:w=>w<520?[18,8,18,8]:[24,16,22,16]});
  (window.LOSTG=window.LOSTG||{})['stg-mem']=st;
})();
