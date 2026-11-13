// ---- Scene, Fig. 1 (the map): one kernel's life, from a PyTorch call on the CPU to the GPU and back to the profiler (renderer v2) ----
// A map, not a mechanism: each step lights the part one child page owns, and the step list links that child's own figure.
// Real numbers only, from RDC (src/read/code/summarize.py): the M1 Pro softmax runs and bandwidth, the divergence ratio,
// the vector add's registers from ptxas, the H100 SXM figures the page cites (132 SMs, 3.35 TB/s, 50 MB L2, 989.5 TFLOP/s).
// Counts drawn are illustrative and say so: 11 of the 132 SMs, 6 HBM stacks, 4 warps, 2 GPUs, the grid as a plate of cells.
// Colours: gold the CPU side and L2, purple PTX, orange SASS, the stream, the grid and registers, blue HBM and warps, teal shared memory, green the board and NCCL, the page accent for the featured SM.
(function(){
  if(!document.getElementById('stg-hero')||!window.RDC)return;const {mix,lerp}=S3;const D=RDC;
  const H=D.h100,SMS=H.sms,REG=D.ptxas.k1_vadd.regs,DIV=D.sim.div_ratio.toFixed(2),GB=Math.round(D.softmax.gbps_median);
  const msr=D.softmax.ms_runs.slice().sort((a,b)=>a-b),MED=msr[1].toFixed(1),FIRST=D.softmax.ms_runs[0].toFixed(2);
  const ROWS=D.softmax.rows.toLocaleString('en-US'),MIB=Math.round(D.softmax.bytes/2/1048576);
  // where things sit
  const CPU=[-5.6,0,.25],SRC=[-6.55,-5.9,-5.25,-4.6].map(x=>[x,0,-1.05]),CC=[-2.9,0,-.25];
  const SQ=[-4.2,-3.5,-2.8,-2.1,-1.4].map(x=>[x,0,1.5]);
  const GX=3.25,BX=[.25,6.25],FS=[1.85,.12,.85],FSZ=[1.3,.16,1.05];
  const BACK=[0,1,2,3,4,5].map(i=>[1.45+.75*i,.12,-.8]),FRONT=[0,1,2,3].map(i=>[3.05+.7*i,.12,.85]);
  const HBM=[];[.55,5.95].forEach(x=>[-.95,0,.95].forEach(z=>HBM.push([x,0,z])));
  const Z2=-4.3;                                                         // the second GPU, behind
  const TL=-2.25;                                                        // the profiler's timeline, an upright plate behind everything
  const HL=[['cpu','code'],['cpu','src'],['src','cc'],['cpu','sq','gpu'],['gpu','sm','grid'],['fsm','warp'],['hbm','l2','fsm','mem'],['fsm','tc'],['gpu','gpu2'],['gpu','cpu','prof']];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-7.2,6.8,-2.4,2.2,.5);
    const lit=g=>{const A=j=>HL[Math.max(0,j)].includes(g)?1:.18;return lerp(A(k-1),A(k),e)};
    const on=s=>k===s?e:0;
    const la=g=>{const a=lit(g);return k===0&&!nar?Math.max(.55,a):a>.6?a:0};
    // ---- the host: the CPU running Python, and the four places a kernel can come from ----
    R.box(CPU,[1.5,.5,1.15],{fill:mix(P.paper,P.c5,.28),a:Math.max(lit('cpu'),.35)});
    R.label([CPU[0],.5,CPU[2]],'CPU · Python, PyTorch',{fs:12.5,b:1,dy:-10,c:P.ink,a:Math.max(la('cpu'),k===3?1:0)});
    if(k===0){R.glass([CPU[0]-.8,.85,CPU[2]-.75],[1.6,0,0],[0,.8,0],{c:P.c5,nu:1,nv:3,a:e,th:.02});
      R.label([CPU[0],1.45,CPU[2]-.75],'p = torch.softmax(s, dim=-1)',{mono:true,fs:12.5,b:1,c:P.ink,a:e});
      R.label([CPU[0],1.45,CPU[2]-.75],'o = p @ v',{mono:true,fs:12.5,b:1,dy:18,c:P.ink,a:e});
      R.label([CPU[0],0,CPU[2]+.6],nar?'dispatch: nothing on the GPU yet':'the dispatcher picks a CUDA kernel; nothing runs on the GPU yet',{fs:12,dy:14,c:P.ink,a:e})}
    const SC=[['torch.compile',P.c5],['library',P.c4],['Triton',P.c6],['CUDA C++',P.acc]];
    SRC.forEach((p,i)=>{R.box(p,[.55,.3,.5],{fill:mix(P.paper,SC[i][1],.35),a:lit('src')});
      if(k===1||k===2)R.label([p[0],.3,p[2]],SC[i][0],{fs:12,dy:-10,c:P.ink,a:lit('src')>.6?1:0,grp:'src'})});
    if(k===1){SRC.forEach(p=>R.flowArc([CPU[0],.5,CPU[2]-.2],[p[0],.3,p[2]],.4,{c:P.c5,a:e,r:.05,n:4,speed:1.1}));
      R.label([-5.6,0,-1.35],nar?'four sources':'who writes the kernel: four sources',{fs:12.5,b:1,dy:-34,c:P.c5,a:e,wide:1})}
    // ---- the compiler: PTX (virtual), then SASS for one chip, packed in a fat binary ----
    const cc=lit('cc');
    R.glass([CC[0]-.6,1.55,CC[2]-.45],[1.2,0,0],[0,0,.9],{c:P.c4,nu:6,nv:4,a:cc,th:.03});
    R.glass([CC[0]-.6,.95,CC[2]-.45],[1.2,0,0],[0,0,.9],{c:P.c2,nu:6,nv:4,a:cc,th:.03});
    const AR=[['sm_80',P.c1],['sm_90a',P.c2],['sm_100a',P.c4],['sm_120',P.c6]];
    AR.forEach((s,i)=>R.box([CC[0]-.45+.3*i,0,CC[2]],[.26,.42,.8],{fill:mix(P.paper,s[1],.4),a:Math.max(cc,lit('gpu')*.5)}));
    if(k===2){SRC.forEach(p=>R.flowArc([p[0],.3,p[2]],[CC[0],1.6,CC[2]],.5,{c:P.c4,a:e,r:.05,n:4,speed:1.2}));
      R.flow([[CC[0],1.55,CC[2]],[CC[0],1.0,CC[2]]],{c:P.c4,a:e,r:.06,n:3,speed:.8});
      R.flow([[CC[0]+.15,.95,CC[2]],[CC[0]+.15,.45,CC[2]]],{c:P.c2,a:e,r:.06,n:3,speed:.8});
      R.label([CC[0]+.6,1.55,CC[2]],nar?'PTX':'PTX: virtual, any chip',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c4,a:e});
      R.label([CC[0]+.6,.95,CC[2]],nar?'SASS':'SASS: one chip\'s code',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c2,a:e});
      if(!nar)AR.forEach((s,i)=>R.label([CC[0]-.45+.3*i,.42,CC[2]+.4],s[0],{mono:true,fs:12,c:P.ink,a:e,grp:'arch',al:'left',dx:6}));
      R.label([CC[0],0,CC[2]+.4],nar?'fat binary':'fat binary · vector add: '+REG+' registers a thread (sm_90a)',{fs:12,dy:16,c:P.ink,a:e})}
    // ---- the stream: launches queue up and the CPU returns at once ----
    SQ.forEach((p,i)=>R.box(p,[.42,.22,.4],{fill:mix(P.paper,P.c2,.35),a:k===3?Math.min(1,e*2-.25*i+.6):lit('sq')*.6}));
    if(k===3){R.flow([[CPU[0]+.75,.25,CPU[2]+.4],[SQ[0][0]-.3,.11,1.5],[SQ[4][0]+.3,.11,1.5],[BX[0]+.1,.12,1.25]],{c:P.c2,a:e,r:.07,n:9,speed:1.3});
      R.label([SQ[2][0],.22,1.5],nar?'a stream':'a stream: each launch returns at once',{fs:12.5,b:1,dy:-12,c:P.c2,a:e});
      R.label([SQ[2][0],0,1.5],nar?'graph: 9.6 to 3.4 µs':'a CUDA graph: 9.6 to 3.4 µs per kernel (NVIDIA, V100)',{fs:12,dy:28,c:P.ink,a:e,wide:nar?0:1})}
    // ---- the GPU: board, HBM stacks either side of the die, L2 across the middle, the SMs ----
    const g=lit('gpu'),mem=lit('mem'),hb=Math.max(g,lit('hbm'));
    R.box([GX,0,0],[6.4,.06,3.5],{fill:mix(P.paper,P.c3,.12),a:Math.max(g,.3),shadow:true});
    R.box([GX,.06,0],[4.6,.06,2.75],{fill:mix(P.paper,P.ink,.06),a:Math.max(g,.3),shadow:false});
    HBM.forEach(p=>R.box([p[0],.06,p[2]],[.5,.42,.72],{fill:mix(P.paper,P.c1,.4),a:hb,shadow:false}));
    R.box([GX,.12,0],[4.1,.08,.36],{fill:mix(P.paper,P.c5,.45),a:Math.max(g,lit('l2')),shadow:false});
    const sm=Math.max(g,lit('sm'));
    BACK.concat(FRONT).forEach(p=>R.box(p,[.56,.2,.6],{fill:mix(P.paper,P.ink,.1),a:sm,shadow:false}));
    const fa=Math.max(sm,lit('fsm'));
    R.box(FS,FSZ,{fill:mix(P.paper,P.acc,.3),a:fa,shadow:false});
    if(k===4||k===3)R.label([k===3?1.8:GX,.12,1.75],nar?'the GPU':'the GPU: '+SMS+' SMs on an H100 SXM, 11 drawn',{fs:12.5,b:1,dy:16,c:P.ink,a:k===4?e:e*.8});
    // ---- the grid lands on the SMs: blocks in any order ----
    if(k===4){R.glass([1.2,2.1,-1.15],[4.1,0,0],[0,0,2.35],{c:P.c2,nu:16,nv:8,a:e*.6,th:.03});
      BACK.concat(FRONT,[FS]).forEach((p,i)=>R.flow([[p[0]+(i%2?.1:-.1),2.1,p[2]*.9],[p[0],.36,p[2]]],{c:P.c2,a:e,r:.055,n:4,speed:.9+.07*(i%4)}));
      R.label([FS[0]-.65,.28,FS[2]+.5],nar?'one SM, enlarged':'one SM, drawn enlarged',{al:'right',dx:-6,fs:12,c:P.acc,a:e,wide:1});
      R.label([5.3,2.1,-1.15],nar?ROWS+' blocks':'grid: '+ROWS+' blocks, one per row',{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:e})}
    // ---- one SM up close: warps of 32 lanes; a branch split inside one warp ----
    if(k===5){for(let j=0;j<4;j++){const z=FS[2]-.39+.26*j,y=FS[1]+FSZ[1],sp=j===3;
        for(let l=0;l<32;l++)R.box([FS[0]-.56+1.12*(l+.5)/32,y,z],[.027,sp?(l%2?.05:.12):.05,.13],{fill:sp?(l%2?mix(P.paper,P.c2,.65):mix(P.paper,P.c6,.65)):mix(P.paper,P.c1,.45),a:e,shadow:false,lw:.35,dz:-3})}   // dz: the lanes stand on the SM's top face, so they sort in front of it
      R.label([FS[0]+.65,FS[1]+FSZ[1],FS[2]-.13],nar?'warp: 32 lanes':'a warp: 32 lanes, one instruction',{al:'left',dx:8,fs:12.5,b:1,c:P.c1,a:e});
      R.label([FS[0]+.65,FS[1]+FSZ[1],FS[2]+.39],nar?'split: '+DIV+'× slower':'a branch split inside it: '+DIV+'× slower (M1 Pro)',{al:'left',dx:8,dy:14,fs:12.5,b:1,c:P.c2,a:e})}
    // ---- the memory ladder: fetched once from HBM, reused on chip ----
    if(k===6){const yS=.55,yR=.9;
      R.glass([FS[0]-.6,yS,FS[2]-.45],[1.2,0,0],[0,0,.9],{c:P.c6,nu:6,nv:4,a:e,th:.03});
      R.glass([FS[0]-.45,yR,FS[2]-.35],[.9,0,0],[0,0,.7],{c:P.c2,nu:8,nv:4,a:e,th:.03});
      R.flow([[.55,.48,.95],[.55,.3,.3],[1.3,.2,0],[FS[0],.22,.2],[FS[0],yS,FS[2]-.2]],{c:P.c1,a:e,r:.07,n:6,speed:.7});
      R.flow([[FS[0]-.3,yS+.02,FS[2]],[FS[0]-.3,yR,FS[2]],[FS[0]+.3,yR,FS[2]],[FS[0]+.3,yS+.02,FS[2]],[FS[0]-.3,yS+.02,FS[2]]],{c:P.c2,a:e,r:.06,n:12,speed:1.6});
      R.label([.55,.48,.95],nar?'HBM':'HBM · 3.35 TB/s',{al:'right',dx:-10,dy:-6,mono:true,fs:12.5,b:1,c:P.c1,a:e});
      R.label([GX-.4,.2,0],'L2 · '+H.l2_mb+' MB',{al:'left',dx:6,dy:-8,mono:true,fs:12,c:P.c5,a:e,wide:1});
      R.label([FS[0]+.6,yS,FS[2]+.45],nar?'shared memory':'shared memory + L1 · one SM',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c6,a:e});
      R.label([FS[0]+.45,yR,FS[2]-.35],nar?'registers':'registers · one thread',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c2,a:e});
      R.label([FS[0],0,FS[2]+.6],nar?'softmax: '+GB+' GB/s (M1 Pro)':'softmax reads '+MIB+' MiB and writes '+MIB+' MiB: '+GB+' GB/s on the M1 Pro',{fs:12,dy:16,c:P.ink,a:e})}
    // ---- tensor cores: two tiles in, one matrix instruction, an accumulator ----
    if(k===7){const T=[FS[0]+.25,FS[1]+FSZ[1],FS[2]];
      R.box(T,[.5,.28,.5],{fill:mix(P.paper,P.c4,.45),a:e,shadow:false});
      R.glass([FS[0]-.7,.75,FS[2]-.5],[.5,0,0],[0,0,.5],{c:P.c2,nu:4,nv:4,a:e,th:.03});
      R.glass([FS[0]-.7,.75,FS[2]+.1],[.5,0,0],[0,0,.5],{c:P.c4,nu:4,nv:4,a:e,th:.03});
      R.flowArc([FS[0]-.45,.75,FS[2]-.25],[T[0],T[1]+.28,T[2]],.25,{c:P.c2,a:e,r:.06,n:5,speed:1.1});
      R.flowArc([FS[0]-.45,.75,FS[2]+.35],[T[0],T[1]+.28,T[2]],.25,{c:P.c4,a:e,r:.06,n:5,speed:1.1});
      R.label([FS[0]-.45,.75,FS[2]-.5],'P tile',{mono:true,fs:12,dy:-10,c:P.c2,a:e});R.label([FS[0]-.45,.75,FS[2]+.6],'V tile',{mono:true,fs:12,dy:14,c:P.c4,a:e});
      R.label([T[0]+.3,T[1]+.28,T[2]],nar?'tensor core':'tensor core: mma → wgmma → tcgen05',{al:'left',dx:8,fs:12.5,b:1,c:P.c4,a:e});
      R.label([T[0]+.3,T[1],T[2]],nar?'≈15× float32':'H100: '+H.bf16_dense_tflops+' TFLOP/s BF16 dense, 67 float32',{al:'left',dx:8,dy:16,fs:12,c:P.ink,a:e})}
    // ---- several GPUs: a second board, NCCL moving gradients between them ----
    if(k===8){const a=e;R.box([GX,0,Z2],[6.4,.06,3.5],{fill:mix(P.paper,P.c3,.12),a});R.box([GX,.06,Z2],[4.6,.06,2.75],{fill:mix(P.paper,P.ink,.06),a,shadow:false});
      HBM.forEach(p=>R.box([p[0],.06,Z2+p[2]],[.5,.42,.72],{fill:mix(P.paper,P.c1,.4),a,shadow:false}));
      BACK.concat(FRONT,[FS]).forEach(p=>R.box([p[0],.12,Z2+p[2]],[.56,.2,.6],{fill:mix(P.paper,P.ink,.1),a,shadow:false}));
      R.flowArc([2.2,.3,-1.4],[2.2,.3,Z2+1.4],.9,{c:P.c3,a,r:.08,n:9,speed:1.4});R.flowArc([4.3,.3,Z2+1.4],[4.3,.3,-1.4],.9,{c:P.c3,a,r:.08,n:9,speed:1.4});
      R.label([GX,1.05,(Z2-1.4)/2-.2],nar?'NCCL':'NCCL: gradients between GPUs, overlapped with compute',{fs:12.5,b:1,c:P.c3,a})}
    // ---- checked: a timeline first, then the one kernel it convicts ----
    if(k===9){const a=e,x0=-6.4,x1=6.2,y0=.5,y1=2.3;
      R.glass([x0,y0,TL],[x1-x0,0,0],[0,y1-y0,0],{c:P.c3,nu:1,nv:2,a:a*.8,th:.02});
      const lane=(y,s,t,c)=>R.quad([[lerp(x0,x1,s),y,TL+.02],[lerp(x0,x1,t),y,TL+.02],[lerp(x0,x1,t),y+.28,TL+.02],[lerp(x0,x1,s),y+.28,TL+.02]],{fill:c,a});
      lane(1.75,.05,.12,mix(P.paper,P.c5,.6));lane(1.75,.14,.17,mix(P.paper,P.c2,.7));lane(1.75,.2,.62,mix(P.paper,P.mute,.3));
      lane(1.05,.2,.58,mix(P.paper,P.acc,.6));lane(1.05,.6,.66,mix(P.paper,P.c4,.6));
      R.label([x0,1.89,TL],'CPU',{al:'right',dx:-6,mono:true,fs:12,c:P.c5,a,wide:1});R.label([x0,1.19,TL],'GPU',{al:'right',dx:-6,mono:true,fs:12,c:P.acc,a,wide:1});
      R.label([lerp(x0,x1,.39),1.33,TL],nar?'softmax '+MED+' ms':'softmax kernel: '+MED+' ms (median of 3)',{fs:12.5,b:1,dy:-8,c:P.ink,a});
      R.label([lerp(x0,x1,.39),y1,TL],nar?'a timeline first':'Nsight Systems: a timeline first, then counters for one kernel',{fs:12.5,b:1,dy:-10,c:P.c3,a});
      R.flow([[GX,.3,-1.3],[GX-1,1.0,TL+.1]],{c:P.acc,a,r:.06,n:4,speed:.8});R.flow([[CPU[0],.5,CPU[2]-.4],[CPU[0]+.4,1.7,TL+.1]],{c:P.c5,a,r:.06,n:4,speed:.8});
      if(!nar)R.label([lerp(x0,x1,.72),.7,TL],'first run under load: '+FIRST+' ms; repeat runs, not trials',{fs:12,c:P.ink,a,wide:1})}
  }
  const full={cam:[.4,.42],bounds:[[-7,0,-2],[6.6,2.4,2]]};
  const V=[{cam:[.35,.38],bounds:[[-7,0,-1.2],[-3.8,1.9,1.4]]},{cam:[.4,.42],bounds:[[-7.1,0,-1.5],[-3.8,1.9,1.4]]},{cam:[.45,.42],bounds:[[-7,0,-1.5],[-1.2,2.1,1]]},
    {cam:[.35,.44],bounds:[[-6.6,0,-1],[3.2,1.2,2.1]]},{cam:[.35,.6],bounds:[[0,0,-1.8],[6.5,2.3,2]]},{cam:[.25,.95],bounds:[[1,0,.2],[4.4,.4,1.5]]},
    {cam:[.3,.48],bounds:[[0,0,-.4],[3.8,1.1,1.55]]},{cam:[.3,.55],bounds:[[.9,0,.1],[4.2,1.1,1.5]]},{cam:[.75,.6],bounds:[[0,0,Z2-1.8],[6.5,1.1,1.9]]},
    {cam:[.3,.6],bounds:[[-7,0,-2.2],[6.6,2.2,.8]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one kernel\'s life, and the page that owns each part',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[16,8,14,8]:[20,16,16,16]});
})();
