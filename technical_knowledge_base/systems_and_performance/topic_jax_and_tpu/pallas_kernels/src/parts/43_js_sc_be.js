// ---- Scene, Fig. 4 (section 12): one Pallas kernel, two lowerings (renderer v2). The fused softmax of section 3 on the scores [16,384 x 128] float32.
// Left, TPU (Mosaic): grid (32,) of 512-row blocks, one after another on one core, each copied into VMEM by its BlockSpec before the body runs.
// Right, GPU (Triton for an H100): grid (16,384 / 16 = 1,024,) of 16-row programs, all launched at once, each computing its own 16 x 128 addresses.
// Shapes and op names: PK.K.kernels.softmax_rows (grid, block, Mosaic op counts) and PK.T.backends (the printed Triton and Mosaic modules, pk_run.py).
// The array is drawn as 32 slabs of 512 rows on both sides; on the GPU side each slab stands for 32 programs. Explained by #sx-be. ----
(function(){
  if(!document.getElementById('stg-be')||!window.PK)return;const {at,off,mix}=S3,PK=window.PK;
  const S=PK.K.kernels.softmax_rows,NB=S.grid[0],OPS=S.lower.ops,TRI=PK.T.backends.triton;
  const gb=+((TRI.match(/tensor<(\d+)x128xf32>/)||[])[1]||0),M=NB*S.block[0],NP=gb?M/gb:0;   // 16 rows a program, 1,024 programs (derived)
  window.PK_SC=window.PK_SC||{};window.PK_SC.be={tpu_steps:NB,tpu_block:S.block[0],gpu_block:gb,gpu_programs:NP,rows:M,ops:OPS};
  const XS=i=>-3.6+i*.2,SW=.17,ZT=-1.1,ZG=1.3,DEP=1,XV=3.75,ZCO=-2.55,XK=-5;
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-5.6,5,-3.4,2.6,.5);
    const cT=P.c1,cG=P.c3,fT=k===3||k===4?.3:1,fG=k===1||k===2?.3:1;
    // the Python kernel and its two lowerings
    const fk=k===0||k===5?1:.4;R.box([XK,0,0],[.8,.35,1.8],{fill:mix(P.paper,P.c4,.35),a:fk});
    if(fk===1||k===1||k===3)lab([XK,.35,-.9],'softmax_kernel',{dy:-12,b:1,c:P.c4,a:Math.max(.5,fk)});
    if(k===0){R.flowArc([XK+.4,.2,-.5],[XS(0)-.1,.1,ZT],.5,{c:cT,r:.1});R.flowArc([XK+.4,.2,.5],[XS(0)-.1,.1,ZG],.5,{c:cG,r:.1});
      lab([XS(16),.06,ZT-.5],'TPU · Mosaic',{dy:-14,b:1,c:cT,a:e});lab([XS(16),.1,ZG+.5],'GPU · Triton (H100)',{dy:18,b:1,c:cG,a:e});
      lab([XS(16),0,(ZT+ZG)/2],'s [16,384 × 128] float32 on both sides',{c:P.mute,a:e,wide:1})}
    // TPU row: 32 blocks of 512 rows, swept one after another into VMEM and the core
    const cur=k===1?Math.min(NB-1,Math.floor(e*NB)):k>=2?NB-1:-1;
    for(let i=0;i<NB;i++){const now=i===cur&&k>=1&&k<=2,done=k>=1&&i<cur;
      R.box([XS(i),0,ZT],[SW,now?.16:.06,DEP],{fill:mix(P.paper,cT,now?.95:done?.5:.22),a:fT,lw:.4,shadow:false})}
    R.glass([XV-.7,.002,ZT-.6],[1.4,0,0],[0,0,1.2],{c:P.c6,a:fT*.85,nu:1,nv:1,th:.02});
    R.box([XV,0,ZT],[.5,.14,.9],{fill:mix(P.paper,cT,.85),a:k>=1?fT:.25*fT,lw:.5,shadow:false});
    R.box([XV,0,ZCO],[1.5,.4,.8],{fill:mix(P.paper,P.c2,.25),a:fT});if(k!==4)lab([XV,.4,ZCO],'one TensorCore',{dy:-12,b:1,a:Math.max(.4,fT)});
    if(k===1||k===2){R.flowArc([XS(cur),.1,ZT],[XV-.2,.14,ZT],.55,{c:cT,r:.1,speed:1.4});R.flowArc([XV,.14,ZT-.45],[XV,.4,ZCO+.4],.3,{c:cT,r:.08,n:5,speed:1})}
    if(k===1){lab([XV,.14,ZT+.6],'VMEM · block '+(cur+1)+' of '+NB,{dy:16,b:1,c:P.c6});lab([XS(0),.06,ZT-.5],'grid ('+NB+',) · '+S.block[0]+' rows a step, one after another',{al:'left',dy:-14,c:cT,b:1,wide:1})}
    if(k===2){lab([XV,.14,ZT+.6],'memref<512x128xf32, vmem>',{dy:16,b:1,c:P.c6});
      lab([XV,.4,ZCO],'vector.load ×'+OPS['vector.load']+' · multi_reduction ×'+OPS['vector.multi_reduction']+' · vector_store ×'+OPS['tpu.vector_store'],{dy:-30,fs:12,c:P.mute,wide:1})}
    // GPU row: every block at once; each drawn slab stands for 32 programs of 16 rows
    for(let i=0;i<NB;i++)R.box([XS(i),0,ZG],[SW,k>=3?.12:.06,DEP],{fill:mix(P.paper,cG,k>=3?.75:.22),a:fG,lw:.4,shadow:false});
    if(k===3)for(let i=0;i<NB;i+=2)R.flow([[XS(i),.14,ZG],[XS(i),1.1,ZG]],{c:cG,r:.08,n:3,speed:.8,a:.9});
    if(k===3){lab([XS(0),.12,ZG+.5],'grid ('+NP.toLocaleString('en-US')+',) · '+gb+' rows a program (32 per drawn block)',{al:'left',dy:18,c:cG,b:1,wide:1});lab([XS(16),1.1,ZG],'all launched at once',{dy:-14,b:1,c:cG})}
    if(k===4){R.glass([XS(2)-.4,.75,ZG-.4],[.8,0,0],[0,0,.8],{c:cG,a:1,nu:8,nv:8,th:.02});
      R.flowArc([XS(2),.75,ZG],[XS(0),.13,ZG],.15,{c:cG,r:.07,n:6,speed:.6});
      lab([XS(2),.75,ZG-.4],'one program: 16 × 128 addresses',{dy:-16,b:1,c:cG});lab([XS(2),0,ZG+.5],'tt.make_range · tt.addptr · tt.load',{dy:18,fs:12,c:P.mute})}
    if(k===5){lab([XS(16),.06,ZT-.5],'TPU: a loop, so blocks can stay and accumulate',{dy:-14,fs:12.5,c:cT,b:1,a:e,wide:1});lab([XS(16),.12,ZG+.5],'GPU: parallel, so sums across programs need atomics or a 2nd kernel',{dy:18,fs:12.5,c:cG,b:1,a:e,wide:1})}
  }
  const full={cam:[.1,.68],bounds:[[-5.5,0,-3],[4.6,1.1,1.9]]};
  const st=S3.stage({id:'stg-be',list:'sx-be',fig:'Fig. 4 · one kernel, two lowerings',cam:full.cam,bounds:full.bounds,aspect:.5,dur:2000,hold:4600,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,24,16],
    view:k=>S3PH(k===2?{cam:[.15,.7],bounds:[[1.6,0,-3],[4.6,.8,-.4]]}:k===4?{cam:[.1,.7],bounds:[[-4.8,0,.2],[-1.2,1,2.2]]}:full)});
  (window.PKSTG=window.PKSTG||{})['stg-be']=st;
})();
