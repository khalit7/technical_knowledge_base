// ---- Scene, Fig. 1 (the map): one PyTorch training step's life (renderer v2: a few large objects per step, the camera moving in
// close, flowing dots wherever a call, a gradient or bytes move). A map, not a mechanism: each step lights the layer one child page
// owns, and the step list links that child's own figure.
// Stations, left to right along the path a call takes: your loop (libraries around it), torch.compile's gate (Dynamo), the
// dispatcher's keys (a stack of plates), the autograd graph behind it, the kernel and the tensor's bytes (a header over a storage),
// then the ranks; the profiler's timeline runs along the front.
// Numbers from RDD (22_js_rd_data.js, the running example as the tabs measured it): the call counts per phase and the bytes added by
// forward (step), the CPU phase times and the optimizer's for-loop against fused times (phases, opt), the DDP buckets (dist.coll)
// and the collectives and memory per rank (dist), the custom-op graph counts (customop). Counts that only the prose carries (nodes,
// guards, launches) are written in the step list. Cubes, cells and nodes drawn stand for those counts, not one for one.
// Colours: green your loop, teal the libraries, purple compiled code, gold the dispatcher, the highlight autograd, blue the bytes and ranks.
(function(){
  if(!document.getElementById('stg-hero')||!window.RDD)return;const {mix,lerp}=S3;const D=RDD;
  const PH=D.phases.cpu,OP=D.opt.cpu,ST=D.step.plain,CO=D.customop,MEM=D.dist.mem,CD=D.dist.coll.ddp_w2.filter(c=>c.op==='all_reduce');
  const NF=D.dist.coll.fsdp_w2.length,f0=v=>Math.round(v).toLocaleString('en-US');
  const LX=-7.9,CX=-4.6,DX=-.3,SX=4.3,RX=8.4,ZT=2.7;
  const PLY=[2.45,1.85,1.25,.65],PLN=['AutocastCPU','AutogradCPU','Python','CPU kernel'];
  // which stations each step is about (the rest recedes): l loop, b libraries, c compile, d dispatcher, g graph, s storage, x extension, r ranks, p profiler
  const L=[['l','c','d','g','s','r','p'],['l','b'],['l','d'],['d','g'],['d','s'],['l','c','d'],['c','d','x'],['l','r'],['p']];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-10,10.4,-2.8,3.9,.5);
    const lit=g=>{const A=j=>L[Math.max(0,j)].includes(g)?1:.18;return lerp(A(k-1),A(k),e)};
    const title=(p,t,c,a)=>R.label(p,t,{fs:12.5,b:1,dy:-12,c,a});
    // ---- station 1: your loop, three slabs; the libraries a glass shell around them ----
    const aL=lit('l');
    [['model(x, y)',P.c3,1.0],['loss.backward()',P.c3,.6],['opt.step()',P.c3,.2]].forEach(([t,c,y],i)=>{
      R.box([LX,y-.2+.02,0],[2,.34,1.5],{fill:mix(P.paper,c,.2+.12*i),a:aL,shadow:i===2});
      if(k===1)R.label([LX-1,y,0],t,{al:'right',dx:-10,mono:true,fs:12.5,c:P.ink,a:e,grp:'loop'})});
    if(k===0)title([LX,1.3,0],nar?'loop':'your loop',P.c3,e);
    const aB=k===1?e:0;
    if(aB>0){R.box([LX,0,0],[2.6,1.75,2.1],{fill:mix(P.paper,P.c6,.35),fa:.16,a:aB,shadow:false});
      R.label([LX,1.75,0],nar?'libraries':'Trainer · Accelerate · Lightning · torchtitan',{fs:12.5,b:1,dy:-14,c:P.c6,a:aB});
      R.label([LX,0,1.05],nar?'3,186,944 parameters':'3,186,944 parameters · 12.75 MB of float32 weights',{fs:12,dy:16,c:P.ink,a:aB,wide:nar?1:0});
      R.flow([[LX-1.3,1.9,0],[LX,1.95,0],[LX+1.3,1.9,0]],{c:P.c6,a:aB,r:.06,n:6,speed:.6})}
    // ---- station 2: torch.compile's gate, a standing glass plate (Dynamo); eager calls left as small cubes, fused launches as big ones ----
    const aC=lit('c');
    R.glass([CX,.02,-1.1],[0,0,2.2],[0,2.5,0],{c:P.c4,a:aC*(k===5||k===6||k===0?.95:.6),nu:4,nv:5,th:.04});
    if(k===0)title([CX,2.55,0],nar?'compile':'torch.compile',P.c4,e);
    if(k===5){const fz=e;
      for(let r=0;r<2;r++)for(let c=0;c<7;c++)R.box([CX+.5+.32*c,0,-.45+.9*r],[.2,.2,.2],{fill:mix(P.paper,P.c2,.45),a:1-.8*fz,shadow:false,lw:.6});
      [[-.45],[.45]].forEach(([z])=>[0,1].forEach(j=>R.box([CX+.95+1.2*j,0,z],[.75,.42,.55],{fill:mix(P.paper,P.c4,.4),a:Math.max(.05,fz),lw:.9})));
      R.flow([[LX+1.1,.9,0],[CX-.05,1.3,0]],{c:P.c3,a:e,r:.07,n:6,speed:1});
      R.flow([[CX+.05,1.3,0],[CX+2.6,.6,0],[DX-1.1,PLY[3]+.1,0]],{c:P.c4,a:e,r:.08,n:7,speed:1.1});
      R.label([CX,2.5,-1.1],nar?'1 graph, 549 guards':'Dynamo: 1 graph of 59 ops, 549 guards',{fs:12.5,b:1,dy:-12,c:P.c4,a:e});
      R.label([CX+1.5,.25,-.9],nar?(fz<.5?'142 calls':'35 launches'):(fz<.5?'eager: 142 calls per forward':'compiled: 35 launches per forward'),{fs:12.5,b:1,dy:-18,c:fz<.5?P.c2:P.c4,a:e});
      R.label([CX+1.5,0,1],'Inductor fuses the element-wise chains',{fs:12,dy:16,c:P.mute,a:e,wide:1})}
    // ---- station 3: the dispatcher, a stack of key plates; a call drops through them to the kernel ----
    const aD=lit('d');
    PLY.forEach((y,i)=>{const hi=(k===3&&i===1)||(k===6&&(i===1||i===2));
      R.glass([DX-1.1,y,-.8],[2.2,0,0],[0,0,1.6],{c:i===1?P.acc:P.c5,a:aD*(hi?1:.85),nu:4,nv:3,th:.03})});
    R.box([DX,0,0],[1.3,.32,1],{fill:mix(P.paper,P.c1,.4),a:aD});
    if(k===0)title([DX,2.5,-.8],'dispatcher',P.c5,e);
    if(k===2){PLY.forEach((y,i)=>R.label([DX-1.1,y,0],PLN[i],{al:'right',dx:-10,mono:true,fs:12.5,b:i===1?1:0,c:i===1?P.acc:P.ink,a:e,grp:'keys'}));
      R.flow([[DX,3.2,0],[DX,.35,0]],{c:P.c5,a:e,r:.09,n:9,speed:1.3});
      R.flowArc([LX+1,1.1,0],[DX,3.1,0],1,{c:P.c3,a:e*.8,r:.06,n:10,speed:1.2});
      R.label([DX+1.1,2.45,0],nar?'923 calls a step':'every call walks the keys: '+f0(ST.n_fwd+ST.n_bwd+ST.n_opt)+' calls a step',{al:'left',dx:10,fs:12.5,b:1,c:P.c5,a:e});
      R.label([DX+1.1,2.45,0],f0(ST.n_fwd)+' forward · '+f0(ST.n_bwd)+' backward · '+f0(ST.n_opt)+' optimizer',{al:'left',dx:10,dy:20,fs:12,c:P.mute,a:e,wide:1})}
    // ---- the autograd graph, recorded behind the Autograd plate during forward and walked back in backward ----
    const aG=lit('g'),GN=[];for(let i=0;i<5;i++)GN.push([DX+.6+.55*i,.3,-2.7]);
    const nShow=k===3?Math.max(1,Math.round(5*Math.min(1,e*1.6))):5;
    for(let i=0;i<nShow;i++){R.ball(GN[i],.17,{c:P.acc,a:aG});R.box([GN[i][0]+.12,0,GN[i][2]-.45],[.26,.22+.12*(i%3),.26],{fill:mix(P.paper,P.c2,.45),a:aG*.9,shadow:false,lw:.6});
      if(i)R.line([GN[i-1],GN[i]],{c:P.acc,w:1.6,a:aG*.8})}
    if(k===0)R.label([GN[4][0],.3,-2.7],'autograd graph',{al:'left',dx:12,fs:12.5,b:1,c:P.acc,a:e});
    if(k===3){R.flowArc([DX+.6,PLY[1],-.8],[GN[4][0],.45,-2.7],.5,{c:P.acc,a:e,r:.06,n:6,speed:.9});
      R.flow(GN.slice().reverse().map(p=>[p[0],p[1]+.24,p[2]]),{c:P.c5,a:e,r:.07,n:9,speed:.9});
      R.label([GN[4][0],.5,-2.7],nar?'187 nodes':'187 nodes after one forward',{dy:-14,fs:12.5,b:1,c:P.acc,a:e});
      R.label([GN[4][0]+.12,0,-3.15],nar?'34.76 MB saved':'saved tensors: 34.76 MB, against 12.75 MB of weights',{al:'left',dx:14,fs:12.5,c:P.c2,a:e,wide:nar?1:0});
      R.label([GN[0][0],.45,-2.7],'backward walks it back',{al:'right',dx:-12,fs:12,c:P.c5,a:e,wide:1})}
    // ---- station 4: the kernel runs on bytes, a header (shape, strides, offset) over a flat storage ----
    const aS=lit('s'),NC=12;
    for(let i=0;i<NC;i++)R.box([SX-1.5+.27*i,0,.6],[.22,.18,.22],{fill:mix(P.paper,P.c1,.25+.05*(i%4)),a:aS,shadow:false,lw:.6});
    R.glass([SX-1.05,1.05,-.85],[1.8,0,0],[0,0,1.05],{c:P.c1,a:aS*.9,nu:4,nv:3,th:.03});
    R.glass([SX-.75,1.75,-.95],[1.05,0,0],[0,0,1.4],{c:P.c6,a:aS*(k===4?.95:.5),nu:3,nv:4,th:.03});
    if(k===0)R.label([SX,0,.75],nar?'bytes':'tensor bytes',{fs:12.5,b:1,dy:16,c:P.c1,a:e});
    if(k===4){R.flowArc([DX+.6,.3,0],[SX-1.5,.2,.6],.6,{c:P.c1,a:e,r:.07,n:8,speed:1});
      [0,4,8,1,5,9].forEach((c,j)=>R.flow([[SX-.75+.35*(j%3)+.1,1.75,-.8+.4*Math.floor(j/3)],[SX-1.5+.27*c,.2,.6]],{c:P.c6,a:e*.7,r:.04,n:3,speed:.7}));
      R.label([SX+.75,1.1,-.3],nar?'x: (3, 4)':'x: shape (3, 4), strides (4, 1)',{al:'left',dx:10,fs:12.5,b:1,c:P.c1,a:e});
      R.label([SX+.3,1.8,-.3],nar?'x.t(): (1, 4)':'x.t(): strides (1, 4), same bytes',{al:'left',dx:10,fs:12.5,b:1,c:P.c6,a:e});
      R.label([SX-.1,0,.75],nar?'one storage':'one storage: 12 cells, no copy',{fs:12,dy:16,c:P.ink,a:e});
}
    // ---- step 6: your own operator slots into the call path as one opaque node ----
    if(k===6){const a=e,OX=DX+2.1;
      R.box([OX,PLY[2]-.2,0],[.9,.5,.9],{fill:mix(P.paper,P.c6,.55),a,lw:1});
      R.flow([[CX+.05,1.4,0],[OX-.5,PLY[2]+.05,0]],{c:P.c4,a,r:.07,n:8,speed:1});
      R.flow([[OX,PLY[2]-.2,0],[OX,.3,0],[DX+.65,.2,0]],{c:P.c6,a,r:.06,n:5,speed:.8});
      R.label([OX,PLY[2]+.3,0],nar?'custom_op':'torch.library.custom_op',{fs:12.5,b:1,dy:-14,c:P.c6,a});
      R.label([OX+.45,PLY[2],0],nar?'1 graph, 0 breaks':'with a fake: '+CO.custom_op.graphs+' graph, '+CO.custom_op.breaks+' breaks',{al:'left',dx:10,fs:12.5,b:1,c:P.ink,a});
      R.label([OX+.45,PLY[2],0],'as plain Python: '+CO.plain.graphs+' graphs, '+CO.plain.breaks+' breaks',{al:'left',dx:10,dy:20,fs:12,c:P.mute,a,wide:1})}
    // ---- station 5: the ranks, the same step on each; DDP all-reduces gradients round the ring ----
    const aR=lit('r'),RK=[[RX-.6,0,-.6],[RX+.6,0,-.6],[RX+.6,0,.6],[RX-.6,0,.6]];
    RK.forEach((p,i)=>{R.box(p,[.95,.12,.95],{fill:mix(P.paper,P.ink,.06),a:aR,shadow:i===0});
      const sh=k===7?lerp(1,.25,Math.max(0,Math.min(1,(e-.5)*3))):1;
      R.box([p[0],.12,p[2]],[.62,.55*sh+.04,.62],{fill:mix(P.paper,P.c1,.4),a:aR,shadow:false})});
    if(k===0)title([RX,.8,-.6],'ranks',P.c1,e);
    if(k===7){const ddp=e<.55,ring=RK.concat([RK[0]]).map(p=>[p[0],.85,p[2]]);
      R.flow([[LX+1.1,.6,0],[RX-1.2,.5,0]],{c:P.c3,a:e*.6,r:.05,n:16,speed:1.4});
      R.flow(ring,{c:ddp?P.c1:P.c4,a:e,r:.08,n:14,speed:1.1});
      R.label([RX,.9,-.6],nar?(ddp?'DDP: full copy':'FSDP2: a quarter'):(ddp?'DDP: a full copy on each rank':'FSDP2: a quarter of every parameter'),{fs:12.5,b:1,dy:-14,c:ddp?P.c1:P.c4,a:e});
      R.label([RX,0,1.1],ddp?CD.length+' all-reduces a step':NF+' collectives a step',{fs:12.5,b:1,dy:16,c:P.ink,a:e});
      R.label([RX,0,1.1],'25.3M variant: '+(MEM.ddp_w2_big.total/1e6).toFixed(0)+' to '+(MEM.fsdp_w4_big.total/1e6).toFixed(0)+' MB',{dy:36,fs:12,c:P.mute,a:e*(ddp?0:1),wide:1})}
    // ---- the profiler: the step's time along the front, forward, backward, optimizer; then the same step with the fused optimizer ----
    const aP=lit('p'),X0=-8,SC=16/PH.step,Z2=ZT+1.3;
    const row=(z,parts,a,hgt,lab)=>{let x=X0;parts.forEach(([v,c,t])=>{const w=v*SC;R.box([x+w/2,0,z],[w-.05,hgt,.55],{fill:mix(P.paper,c,.45),a,shadow:false});
        if(lab)R.label([x+w/2,hgt,z],nar?v.toFixed(1):t+' '+v.toFixed(2)+' ms',{fs:12,b:1,dy:-10,c:P.ink,a:lab});x+=w});return x};
    row(ZT,[[PH.fwd,P.c1,'forward'],[PH.bwd,P.c2,'backward'],[PH.opt,P.c5,'optimizer']],aP*(k===8?1:.6),k===8?.3:.1,k===8?e:0);
    if(k===0)R.label([X0,0,ZT],'profiler',{al:'right',dx:-10,fs:12.5,b:1,c:P.c5,a:e});
    if(k===8){const a=Math.max(0,Math.min(1,(e-.35)*2.5));
      row(Z2,[[PH.fwd,P.c1,'forward'],[PH.bwd,P.c2,'backward'],[OP.fused,P.c5,'optimizer']],a,.3,0);
      R.label([X0+(PH.fwd+PH.bwd+OP.fused/2)*SC,.3,Z2],nar?OP.fused.toFixed(2):'fused '+OP.fused.toFixed(2)+' ms',{fs:12,b:1,dy:-10,c:P.ink,a});
      R.flow([[X0,.45,ZT-.45],[X0+16,.45,ZT-.45]],{c:P.c5,a:e*.7,r:.05,n:18,speed:1.2});
      R.label([X0,.1,ZT],nar?PH.step.toFixed(1)+' ms':'for-loop AdamW: '+PH.step.toFixed(2)+' ms',{al:'right',dx:-12,fs:12.5,b:1,c:P.c5,a:e});
      R.label([X0,.1,Z2],nar?'fused':'fused=True: '+(PH.fwd+PH.bwd+OP.fused).toFixed(2)+' ms',{al:'right',dx:-12,fs:12.5,b:1,c:P.good,a})}
    // ---- step 0: the call's path through every station ----
    if(k===0)R.flow([[LX+1,1,0],[CX,1.3,0],[DX,3,0],[DX,.4,0],[SX-1.5,.25,.6],[SX+1.6,.25,.6],[RX-1,.4,0]],{c:P.acc,a:e*.9,r:.07,speed:1.6});
  }
  const full={cam:[.3,.62],bounds:[[-9.6,0,-3],[10,2.8,3.4]]};
  const V=[full,
    {cam:[.4,.5],bounds:[[-10.6,0,-1.3],[-5.6,2.2,1.3]]},
    {cam:[.42,.45],bounds:[[-3.8,0,-1],[3.6,3.2,1]]},
    {cam:[.75,.5],bounds:[[-1.6,0,-3.5],[3.8,2.8,.9]]},
    {cam:[.36,.55],bounds:[[.2,0,-1.1],[7.6,2.2,1.2]]},
    {cam:[.38,.52],bounds:[[-6.4,0,-1.3],[1.6,2.9,1.3]]},
    {cam:[.4,.5],bounds:[[-5.4,0,-1.2],[4.6,3,1.2]]},
    {cam:[.4,.66],bounds:[[5.6,0,-1.3],[10.6,1.2,1.4]]},
    {cam:[0,1.05],bounds:[[-12.6,0,1.6],[8.4,.4,5]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one PyTorch training step, from your loop to the bytes',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[22,8,16,8]:[26,20,20,20]});
})();
