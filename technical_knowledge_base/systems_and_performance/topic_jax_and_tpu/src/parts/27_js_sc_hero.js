// ---- Scene, Fig. 1 (the map): one JAX training step's life, from your Python to the TPU's matrix unit (renderer v2: a few large
// objects per step, the camera moving in close, flowing dots wherever the program or data moves). A map, not a mechanism: each step
// lights the layer one child page owns, and the step list links that child's own figure.
// Numbers from RDJ (22_js_rd_data.js, the running example measured by the Compiler and Training labs): jaxpr equations, StableHLO
// operations, kernels and fusions after XLA, the PyTorch twin's eager operators, compile times. The sharding labels are the page's own
// table in section 5 (src/shard/out/rd_collectives.json); the chip labels are section 6's v5e row and its MXU size; the Pallas block
// is the TPU and Pallas lab's interpreted matmul. Counts drawn (rows, cubes, boxes) are illustrative and the step list says so.
// Colours follow section 2's lanes: green your code, gold traced, purple compiler, blue compiled kernels, teal the mesh and its
// collectives, orange PyTorch's eager operators (and the MXU's operands on the chip).
(function(){
  if(!document.getElementById('stg-hero')||!window.RDJ)return;const {mix,lerp}=S3;const T=RDJ.trace,X=RDJ.xla;
  const f0=v=>Math.round(v).toLocaleString('en-US');
  const NEQ=f0(T.ops),NSH=f0(X.stages[1].v),NK=f0(T.kernels),NF=f0(T.fusions),NPT=f0(T.torchKernels),CS=X.compile_s.toFixed(1);
  const CX=-8.4,JX=-4.6,XX=-.5,MX=3.9,TX=8.7,ZP=3.0;
  // the eight devices of the 2 x 4 mesh, and a ring through them for the collective
  const DEV=[];[-.45,.45].forEach(z=>[0,1,2,3].forEach(i=>DEV.push([MX-1.2+.8*i,0,z])));
  const RING=[0,1,2,3,7,6,5,4,0].map(i=>[DEV[i][0],.42,DEV[i][2]]);
  // the station each step is about; the rest recedes
  const L=[['c','j','x','m','t'],['c'],['c','j'],['j','x'],['x','m'],['t'],['t','pl'],['c','j','x','m','t','cb','pt']];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-10.2,10.8,-2.4,4.4,.5);
    const lit=g=>{const A=j=>L[Math.max(0,j)].includes(g)?1:.2;return lerp(A(k-1),A(k),e)};
    const on=s=>k===s?e:0;
    const title=(p,t,c,a)=>R.label(p,t,{fs:12.5,b:1,dy:-12,c,a});
    // ---- the codebases: a pad under every station, joined (step 7) ----
    const aCB=k===7?e:0;
    if(aCB>0){[[CX,2.6,2],[JX,2.4,1.6],[XX,3.8,2.4],[MX,3.9,2.4],[TX,3.7,3]].forEach(([x,w,d])=>R.box([x,-.05,0],[w,.04,d],{fill:mix(P.paper,P.c3,.3),a:aCB,shadow:false}));
      R.flow([[CX+1.3,0,.0],[TX-1.85,0,0]],{c:P.c3,a:aCB*.7,r:.05,n:24,speed:.8});
      R.label([-9.9,0,-1.7],nar?'MaxText · Tunix · levanter':'MaxText, Tunix, levanter: one config assembles every layer',{al:'left',fs:12.5,b:1,c:P.c3,a:aCB,dy:-10})}
    // ---- station 1: your code, a stack of libraries around a pure function ----
    const aC=lit('c');
    [['grain · data',P.c6,0],['optax · orbax',P.c3,.3],['Flax NNX model',P.c3,.6]].forEach(([t,c,y],i)=>{
      R.box([CX,y,0],[1.9,.26,1.5],{fill:mix(P.paper,c,.22+.14*i),a:aC,shadow:i===0});
      if(k===1)R.label([CX-.95,y+.13,0],t,{al:'right',dx:-10,fs:12.5,b:i===2?1:0,c:P.ink,a:e,grp:'code'})});
    if(k===0)title([CX,.86,0],nar?'code':'your code',P.c3,e);
    if(k===1){R.flow([[CX-.9,1.1,0],[CX,.95,0],[CX+.9,1.1,0]],{c:P.c3,a:e,r:.07,n:5,speed:.6});
      R.label([CX,.86,0],nar?'f(params, batch)':'a pure function of (params, batch)',{fs:12.5,b:1,dy:-18,c:P.c3,a:e});
      R.label([CX,0,.75],nar?'826,368 parameters':'826,368 parameters, 9.9 MB with Adam state',{fs:12,dy:16,c:P.ink,a:e,wide:nar?1:0})}
    // ---- station 2: the jaxpr, a plate of typed equations, filled by tracers ----
    const aJ=lit('j'),NR=14;
    R.glass([JX-.85,.08,0],[1.7,0,0],[0,1.9,0],{c:P.c5,a:aJ,nu:1,nv:NR});
    const fill=k===2?Math.round(NR*e):k>2?NR:k===0?NR:0;
    for(let r=0;r<fill;r++){const y=1.9-(r+.5)*1.9/NR+.08,w=.5+((r*37)%9)/9*.95;
      R.line([[JX-.7,y,.03],[JX-.7+w,y,.03]],{c:mix(P.paper,P.c5,.85),w:3,a:aJ*(k===2&&r===fill-1?1:.85)})}
    if(k===0)title([JX,2,0],'jaxpr',P.c5,e);
    if(k===2){R.flowArc([CX+.5,.9,0],[JX-.85,1.3,0],.9,{c:P.c5,a:e,r:.08,n:8,speed:1.2});
      R.label([(CX+JX)/2,1.6,0],nar?'tracers':'tracers: shape and dtype, no values',{fs:12.5,b:1,dy:-12,c:P.c5,a:e});
      R.label([JX+.85,1.6,0],NEQ+' equations',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.ink,a:e});
      R.label([JX+.85,1.6,0],nar?'grad, vmap: new jaxprs':'grad and vmap rewrite it into new jaxprs',{al:'left',dx:8,dy:20,fs:12,c:P.mute,a:e,wide:1})}
    // ---- station 3: XLA, many operations become fewer fused kernels ----
    const aX=lit('x');
    const ops=[];for(let r=0;r<6;r++)for(let c=0;c<5;c++)ops.push([XX-1.55+.24*c,0,-.75+.3*r]);
    const fz=k===3?e:k>3||k===0?1:0;
    ops.forEach(p=>R.box(p,[.16,.16,.16],{fill:mix(P.paper,P.c4,.35),a:aX*(1-.55*fz),shadow:false,lw:.6}));
    const KER=[[XX+.55,0,-.62],[XX+.55,0,0],[XX+.55,0,.62],[XX+1.25,0,-.31],[XX+1.25,0,.31]];
    KER.forEach(p=>R.box(p,[.48,.34,.42],{fill:mix(P.paper,P.c1,.45),a:aX*Math.max(.15,fz)}));
    if(k===0)title([XX,.6,-.9],'XLA',P.c4,e);
    if(k===3){R.flow([[JX+.85,1,0],[XX-1.2,.5,0]],{c:P.c5,a:e,r:.07,n:6,speed:1});
      [0,2,4].forEach(i=>R.flowArc([XX-.9,.2,-.6+.6*i/2],[KER[i===4?3:i][0],.4,KER[i===4?3:i][2]],.35,{c:P.c4,a:e,r:.06,n:5,speed:1}));
      R.label([XX-1,.25,-.95],nar?NSH+' ops':'StableHLO · '+NSH+' operations',{fs:12.5,b:1,dy:-10,c:P.c4,a:e});
      R.label([XX+.9,.4,.95],nar?NK+' kernels':NK+' kernels, '+NF+' of them fusions',{fs:12.5,b:1,dy:18,c:P.c1,a:e});
      R.label([XX+.2,.6,-.9],'compiled once · '+CS+' s',{fs:12,dy:-24,c:P.mute,a:e,wide:1})}
    // ---- station 4: the mesh, one executable per device, a collective between them ----
    const aM=lit('m');
    R.glass([MX-1.65,.02,-.95],[3.3,0,0],[0,0,1.9],{c:P.c6,a:aM*.9,nu:4,nv:2,th:.03});
    DEV.forEach((p,i)=>R.box(p,[.5,.32,.5],{fill:mix(P.paper,k>=4||k===0?P.c1:P.ink,k>=4||k===0?.3:.08),a:aM,lw:.8}));
    if(k===0)title([MX,.5,-.95],'mesh',P.c6,e);
    if(k===4){DEV.forEach(p=>R.flowArc([XX+1.4,.35,0],[p[0],.35,p[2]],.6,{c:P.c1,a:e*.8,r:.05,n:4,speed:1}));
      R.flow(RING,{c:P.c6,a:e,r:.08,n:16,speed:1.1});
      R.label([MX,.4,-.95],nar?'2 × 4 devices':'Mesh (data, model): 2 × 4 devices',{fs:12.5,b:1,dy:-14,c:P.c6,a:e});
      R.label([MX,0,.95],nar?'1 all-reduce, 3.3 MB':'data parallel: 1 all-reduce, 3.3 MB',{fs:12.5,b:1,dy:18,c:P.ink,a:e});
      R.label([MX+1.7,.3,0],'FSDP: 0.4 MB of weights each',{al:'left',dx:8,fs:12,c:P.mute,a:e,wide:1})}
    // ---- station 5: one TPU chip, HBM beside it, VMEM, the MXU and the VPU on it, ICI to its neighbours ----
    const aT=lit('t'),dim=k===6?.35:1;
    R.box([TX,0,0],[3.1,.06,2.5],{fill:mix(P.paper,P.ink,.06),a:aT});
    const HBM=[[TX-1.2,.06,-.6],[TX-1.2,.06,.6],[TX+1.2,.06,-.6],[TX+1.2,.06,.6]];
    HBM.forEach(p=>R.box(p,[.45,k===5?.5:.36,.5],{fill:mix(P.paper,P.c1,.5),a:aT,shadow:false}));
    const VM=[TX,.06,.72],MXU=[TX-.15,.32,-.3];
    R.box(VM,[1.5,.12,.38],{fill:mix(P.paper,P.c6,.35),a:aT,shadow:false});
    R.box([TX+.62,.06,-.3],[.3,.22,.95],{fill:mix(P.paper,P.c4,.35),a:aT*dim,shadow:false});
    R.glass([MXU[0]-.5,MXU[1],MXU[2]-.5],[1,0,0],[0,0,1],{c:P.c2,a:aT*dim,nu:8,nv:8,th:.04});
    [[-1.55,0],[1.55,0],[0,-1.25],[0,1.25]].forEach(([dx,dz])=>R.line([[TX+dx,.05,dz],[TX+dx*1.35,.05,dz*1.45]],{c:P.c3,w:2,a:aT*.8}));
    if(k===0)title([TX,.6,-1.25],'TPU chip',P.c2,e);
    if(k===5){const a=e;
      HBM.forEach(p=>R.flowArc([p[0],.45,p[2]],[VM[0]+(p[0]<TX?-.5:.5),.2,VM[2]],.25,{c:P.c1,a,r:.05,n:4,speed:.8}));
      R.flowArc([VM[0],.2,VM[2]-.15],[MXU[0],.36,MXU[2]+.3],.25,{c:P.c6,a,r:.05,n:5,speed:.8});
      for(let i=0;i<4;i++){const z=MXU[2]-.38+.25*i,x=MXU[0]-.38+.25*i;
        R.flow([[MXU[0]-.62,.38,z],[MXU[0]+.62,.38,z]],{c:P.c2,a,r:.04,n:4,speed:.45});
        R.flow([[x,.38,MXU[2]-.62],[x,.38,MXU[2]+.62]],{c:P.c4,a,r:.04,n:4,speed:.45})}
      [[1.55,0],[-1.55,0]].forEach(([dx])=>R.flow([[TX+dx,.06,0],[TX+dx*1.35,.06,0]],{c:P.c3,a,r:.05,n:3,speed:.5}));
      R.label([MXU[0],.36,MXU[2]-.5],nar?'MXU 128 × 128':'MXU · 128 × 128 systolic array',{fs:12.5,b:1,dy:-12,c:P.c2,a});
      R.label([VM[0],.18,VM[2]+.2],nar?'VMEM':'VMEM · on-chip, managed by software',{fs:12.5,b:1,dy:16,c:P.c6,a});
      R.label([HBM[0][0],.5,HBM[0][2]],nar?'HBM':'HBM · 819 GB/s on v5e',{al:'right',dx:-8,fs:12.5,b:1,c:P.c1,a});
      R.label([TX+.62,.28,-.78],'VPU',{fs:12,dy:-10,c:P.c4,a,wide:1});
      R.label([TX+1.55*1.35,.06,0],'ICI',{al:'left',dx:6,fs:12,c:P.c3,a,wide:1})}
    // ---- step 6: Pallas, a block of the operand in HBM copied into VMEM for each grid step (the grid's last axis, K, innermost: the first 8 of 32 steps) ----
    if(k===6){const a=e,o0=[TX-1.45,1.0,-.8],nu=4,nv=8,bw=1.6/nu,bh=1.6/nv,c8=Math.min(7,Math.floor(e*8)),cur=Math.floor(c8/4),ck=c8%4;
      R.glass(o0,[1.6,0,0],[0,0,1.6],{c:P.c1,a,nu,nv,th:.03});
      R.box([o0[0]+bw*(ck+.5),o0[1]-.01,o0[2]+bh*(cur+.5)-bh*.45],[bw*.92,.05,bh*.9],{fill:mix(P.paper,P.c5,.8),a,shadow:false});
      R.flowArc([o0[0]+bw*(ck+.5),o0[1],o0[2]+bh*(cur+.5)],[VM[0]-.4,.2,VM[2]],.2,{c:P.c5,a,r:.06,n:7,speed:1.1});
      R.flowArc([VM[0],.2,VM[2]-.15],[MXU[0],.36,MXU[2]+.3],.2,{c:P.c6,a,r:.05,n:5,speed:.8});
      R.label([o0[0]+.8,o0[1],o0[2]],nar?'A in HBM':'A in HBM, cut into 512 × 128 blocks',{fs:12.5,b:1,dy:-12,c:P.c1,a});
      R.label([VM[0],.18,VM[2]+.2],nar?'one block per step':'grid (8, 1, 4): one block per step into VMEM',{fs:12.5,b:1,dy:24,c:P.c5,a})}
    // ---- step 7: PyTorch beside it, every operation dispatched from Python on every step ----
    if(k===7){const a=e;
      for(let i=0;i<34;i++)R.box([-8.6+i*.53,0,ZP],[.3,.18,.3],{fill:mix(P.paper,P.c2,.45),a,shadow:false,lw:.6});
      R.flow([[-9.2,.35,ZP],[9.4,.35,ZP]],{c:P.c2,a,r:.07,n:30,speed:1.4});
      R.label([-8.6,0,ZP+.5],nar?'PyTorch eager':'PyTorch eager: '+NPT+' operators from Python, every step',{al:'left',fs:12.5,b:1,dy:14,c:P.c2,a});
      R.label([XX+.9,.4,-.9],nar?NK+' kernels':'JAX: '+NK+' kernels, Python ran once',{fs:12.5,b:1,dy:-14,c:P.c1,a,wide:nar?1:0})}
    // ---- step 0: the program moving down the stack ----
    if(k===0)R.flow([[CX+.9,.9,0],[JX-.85,1.2,0],[JX+.85,1.2,0],[XX-1.6,.5,0],[XX+1.5,.5,0],[MX-1.6,.4,0],[MX+1.6,.4,0],[TX-1.5,.3,0]],{c:P.acc,a:e*.9,r:.07,speed:1.6});
  }
  // the overview turns the long chain into depth (more so on a phone) so its five parts draw larger
  const ph=()=>{const c=document.querySelector('#stg-hero canvas');return c&&c.clientWidth<520};
  const full={cam:[.62,.92],bounds:[[-9.9,0,-1.5],[10.3,2,1.6]]};
  const V=[full,
    {cam:[.42,.6],bounds:[[-11.2,0,-1],[-6.2,1.5,1.2]]},
    {cam:[.42,.58],bounds:[[-9.4,0,-1],[-2.4,2.1,1.2]]},
    {cam:[.42,.62],bounds:[[-5.6,0,-1.3],[1.6,2.1,1.4]]},
    {cam:[.45,.7],bounds:[[-1.4,0,-1.4],[6.2,1.2,1.5]]},
    {cam:[.4,.72],bounds:[[6.6,0,-1.5],[10.9,.9,1.5]]},
    {cam:[.4,.66],bounds:[[6.6,0,-1.3],[10.6,1.4,1.4]]},
    {cam:[.22,.8],bounds:[[-9.9,0,-1.9],[10.3,1.2,3.6]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one JAX train step, from your Python to the matrix unit',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:5200,draw,
    view:k=>k===0&&ph()?{cam:[.8,1.0],bounds:full.bounds}:V[k]||full,margin:w=>w<520?[22,8,16,8]:[26,20,20,20]});
})();
