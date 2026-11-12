// ---- Scene, Fig. 1 (the core idea): one training step through the four libraries as stations, left to right.
// grain: shuffled windows through two worker processes into a batch of 32 (the cells' colours are the real window indices of batch 0, TS.grain.G1.A2);
// Flax NNX: the model object splits at the nnx.jit boundary into its graphdef (170 nodes, static) and its state (69 leaves, 826,368 numbers: TS.nnx.E1);
// inside the step: loss, nnx.grad (Params only), optax's chain as glass walls the gradient passes through, the optimiser state (141 leaves: TS.nnx.E9);
// the new state is written back into the object; orbax saves four items asynchronously (TS.ckpt.save_call_s, save_total_s) while the next batch arrives.
// Six layer plates stand for the 69 leaves (embeddings, 4 blocks, final LayerNorm and head). Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.TSS||!window.TS)return;const {at,off,lerp,mix}=S3,{lab,plate,wall,frame,tint,legs,rec}=TSS;
  const D=TS,E1=D.nnx.E1,E9=D.nnx.E9,K=D.ckpt,B0=D.grain.G1.A2[0],NW=D.grain.n_windows;
  const ly=i=>.32+i*.27,TOP=ly(5);
  const OBJ=[-1.8,-2.5],ST=[-2.5,.35],GX=-.75,WX=[.25,.75,1.25,1.75],UX=2.45,STX=5.0;
  const fmt=n=>Math.round(n).toLocaleString('en-US');
  function draw(R,k,e){const P=R.P,ph=R.W<520;R.grid(-7.8,6.4,-3.4,2.2,.5);
    const focus=(s,lo)=>k===s?1:(lo==null?.22:lo);
    // ---------- grain: windows, shuffled, through two worker processes, into a batch of 32
    const gA=k===0?1:k===5?.7:.25;
    R.box([-7.0,0,-.5],[.7,1.25,.9],{fill:tint(P,P.c5,.3),a:gA});
    lab(R,[-7.0,1.25,-.5],fmt(NW)+' windows',{mono:true,fs:12,dy:-10,a:gA,wide:1});
    [-1.0,.25].forEach((z,i)=>{R.box([-5.85,0,z],[.62,.42,.62],{fill:tint(P,P.c5,.55),a:gA});lab(R,[-5.85,.42,z],'worker '+i,{mono:true,fs:12,dy:-9,a:gA,grp:'gw',wide:1});
      if(k===0){R.flow(legs([[-6.65,.6,-.5],[-6.2,.3,z],[-5.85,.25,z]]),{c:P.c5,r:.06,speed:1.1,a:e});R.flow(legs([[-5.55,.2,z],[-4.75,.12,.9]]),{c:P.c5,r:.06,speed:1.1,a:e})}});
    // the tray: 32 cells, 8 x 4, coloured by the real window indices of batch 0
    B0.forEach((id,j)=>{const cx=-5.3+(j%8)*.16,cz=.66+Math.floor(j/8)*.16;R.box([cx,0,cz],[.13,.09+.06*(k===0?e:1),.13],{fill:rec(P,id,NW),a:k===0?Math.max(.25,e):gA,shadow:false,lw:.5})});
    lab(R,[-4.74,.15,1.32],ph?'batch of 32':'batch: 32 windows',{mono:true,fs:12,dy:16,b:1,c:P.c5,a:Math.max(.5,gA)});
    if(k===0)lab(R,[-7.0,0,.0],'iterator state: {next_index: 80}',{mono:true,fs:12,dy:20,a:e,wide:1});
    // ---------- the compiled step: a box with nothing stored in it
    const jA=k===0?.3:1;
    R.box([-.35,.02,.42],[6.0,2.25,2.5],{fill:tint(P,P.acc,.05),fa:.08,a:jA*.9,shadow:false,lw:1});
    lab(R,[-3.3,0,1.67],'nnx.jit(train_step)',{mono:true,fs:13,b:1,al:'left',dy:14,c:P.acc,a:jA});
    // ---------- Flax NNX: the object, then its graphdef and its state
    const sp=k===1?e:k>=2&&k<4?1:k===4?1-e:0;             // 0: arrays inside the object, 1: state inside the step
    const oA=k===1||k===4?1:k===5?.85:.3;
    // the object's frame: solid while it holds its arrays, a dashed wire frame (the graphdef) while they are out
    if(sp<.98)R.box([OBJ[0],.05,OBJ[1]],[1.5,TOP+.35,1.0],{fill:tint(P,P.c1,.06),fa:.08,a:oA*(1-sp),shadow:false,lw:.8});
    if(sp>.02)frame(R,[OBJ[0],.05,OBJ[1]],[1.5,TOP+.35,1.0],{c:P.mute,dash:[5,4],a:Math.max(.35,oA)*sp});
    lab(R,[OBJ[0],TOP+.42,OBJ[1]],sp>.5?'graphdef':'model: nnx.Module',{mono:true,fs:12.5,b:1,dy:-10,c:sp>.5?P.mute:P.c1,a:Math.max(.45,oA)});
    if(k===1||k===2)lab(R,[OBJ[0]+.78,.5,OBJ[1]],E1.n_nodes+' nodes, static: keys the compile cache',{mono:true,fs:12,al:'left',dx:8,c:P.mute,a:k===1?e:.6,wide:1});
    const pA=k===1||k===4||k===5?1:k===2?.75:.4;
    for(let i=0;i<6;i++){const x=lerp(OBJ[0],ST[0],sp),z=lerp(OBJ[1],ST[1],sp),y=ly(i)+Math.sin(Math.PI*sp)*.35;
      plate(R,[x,y,z],1.05,.7,{c:k===4&&e>.5?mix(P.c1,P.c3,.25*(1-e)):P.c1,a:pA})}
    // the RNG stream: a key and a counter, carried with the state
    {const x=lerp(OBJ[0]+.55,ST[0]+.7,sp),z=lerp(OBJ[1]+.3,ST[1]+.55,sp);R.ball([x,.2,z],.1,{c:P.c4,a:pA});lab(R,[x,.2,z],'RngKey, RngCount',{mono:true,fs:12,al:'left',dx:12,c:P.c4,a:k===1?1:.0,wide:1})}
    if(k===1){lab(R,[ST[0],TOP+.6,ST[1]],'state: '+E1.num_leaves+' leaves, '+fmt(E1.n_params)+' numbers',{mono:true,fs:12.5,b:1,c:P.c1,a:e,wide:1});
      R.flow(legs([[OBJ[0],TOP*.6,OBJ[1]+.5],[ST[0],TOP*.6+.2,ST[1]-.3]]),{c:P.c1,r:.07,speed:1.2,a:e})}
    // ---------- inside the step: forward, loss, nnx.grad
    const lA=focus(2);
    if(k>=2&&k<=3){R.flow(legs([[-4.7,.2,.9],[ST[0]-.2,.25,.7]]),{c:P.c5,r:.06,speed:1.2,a:k===2?1:.3});
      R.flow(legs([[ST[0]+.3,TOP,ST[1]],[GX,TOP+.85,.35]]),{c:P.c1,r:.06,speed:1.1,a:k===2?1:.3})}
    R.ball([GX,TOP+.85,.35],.12,{c:P.c2,a:k>=2?lA:.0});lab(R,[GX,TOP+.85,.35],'loss',{mono:true,fs:12.5,al:'left',dx:12,c:P.c2,a:k>=2?Math.max(.5,lA):0});
    const gr=k===2?Math.min(1,e*1.4):k===3?1:k===4?off(k,e,4):0;
    if(gr>0){for(let i=0;i<6;i++)plate(R,[GX,ly(i),.35],.85,.6,{c:P.c2,a:gr*(k===3?.8:1)});
      lab(R,[GX,ly(0)-.05,.35],'grads: Params only',{mono:true,fs:12,dy:16,b:1,c:P.c2,a:gr,grp:'in',wide:1});
      if(k===2)R.flow(legs([[GX,TOP+.7,.35],[GX,ly(0),.35]]),{c:P.c2,r:.065,speed:1})}
    // ---------- optax: a chain of transformations the gradient passes through, reading and returning its own state
    const wA=k===3?1:k===2||k===4?.35:.22,WN=['clip','scale_by_adam','decay','×(−lr)'];
    WX.forEach((x,i)=>{wall(R,[x,.12,.35],1.0,1.25,{c:i===0?P.c2:P.c3,a:wA*(k===3?Math.min(1,e*1.5+.2):1)});
      lab(R,[x,1.42,.35],WN[i],{mono:true,fs:12,dy:-10,c:i===0?P.c2:P.c3,a:Math.max(.35,wA),grp:'ox'})});
    if(k===3){R.flow(legs([[GX+.45,.75,.35],[WX[0]-.05,.75,.35],[WX[3]+.05,.75,.35],[UX-.4,.75,.35]]),{c:P.c2,r:.07,speed:1.1});
      R.flow(legs([[WX[1],.2,.95],[1.0,.2,1.35]]),{c:P.c3,r:.06,speed:.9});R.flow(legs([[1.4,.2,1.35],[WX[2],.2,.95]]),{c:P.c3,r:.06,speed:.9})}
    const oS=k===3?1:k===5?.85:k===4?.6:.25;
    R.box([1.0,0,1.38],[1.5,.32,.45],{fill:tint(P,P.c3,.4),a:oS});
    if(k>=2&&k<=4)lab(R,[1.0,.32,1.62],'opt_state: '+E9.n_leaves+' leaves',{mono:true,fs:12,dy:14,b:1,c:P.c3,a:Math.max(.4,oS),wide:1});
    const uA=k===3?Math.min(1,e*1.2):k===4?off(k,e,4):0;
    if(uA>0){for(let i=0;i<6;i++)plate(R,[UX,ly(i),.35],.75,.55,{c:tint(P,P.c1,.55),a:uA});lab(R,[UX,TOP+.1,.35],'updates',{mono:true,fs:12.5,b:1,dy:-12,c:P.c1,a:uA})}
    // ---------- written back: the new state returns to the object; metrics stay on the device
    if(k===4){R.flowArc([UX,TOP,.2],[OBJ[0]+.4,TOP+.2,OBJ[1]+.3],1.0,{c:P.c1,r:.07,speed:1.3,a:Math.min(1,e*1.5)});
      lab(R,[(UX+OBJ[0])/2,TOP+1.25,-1.0],ph?'written back':'nnx.jit writes the new state back',{fs:13,b:1,a:e})}
    const mA=k===4?1:.25;R.box([UX,0,1.38],[.6,.24,.42],{fill:tint(P,P.c5,.25),a:mA});lab(R,[UX,.24,1.38],'metrics',{mono:true,fs:12,al:'left',dx:22,c:P.mute,a:Math.max(.4,mA),wide:1});
    // ---------- orbax: four items, written by a background thread while the next step runs
    const cA=k===5?1:.22,IT=[['model/',P.c1],['opt/',P.c3],['data/',P.c5],['meta/',P.mute]];
    IT.forEach(([n,c],i)=>{const y=.05+i*.42,a=k===5?Math.max(.25,Math.min(1,e*2-i*.25)):cA;R.box([STX,y,.2],[1.0,.34,.8],{fill:tint(P,c,.35),a,shadow:i===0});
      lab(R,[STX+.5,y+.17,.2],n,{mono:true,fs:12.5,b:1,al:'left',dx:8,c,a:Math.max(.35,a)})});
    lab(R,[STX,1.95,.2],'orbax checkpoint',{fs:13,b:1,dy:-8,c:P.c6,a:Math.max(.45,cA)});
    if(k===5){R.flowArc([OBJ[0]+.4,TOP,OBJ[1]],[STX-.4,.25,.0],1.1,{c:P.c1,r:.07,speed:1.3});
      R.flowArc([1.6,.3,1.38],[STX-.4,.65,.3],.6,{c:P.c3,r:.07,speed:1.2});
      R.flowArc([-5.85,.42,.25],[STX-.4,1.05,.4],1.6,{c:P.c5,r:.06,speed:1.5,n:10});
      R.flow(legs([[-4.7,.2,.9],[ST[0]-.2,.25,.7]]),{c:P.c5,r:.06,speed:1.2,a:.6});
      lab(R,[STX+.5,1.95,.2],'save() returned in '+K.save_call_s.toFixed(2)+' s; written by '+K.save_total_s.toFixed(2)+' s',{mono:true,fs:12,dy:-28,al:'right',a:e,wide:1});
      if(!ph)lab(R,[OBJ[0],TOP+.42,OBJ[1]],'graphdef: not saved',{fs:12,dy:-28,c:P.mute,a:e})}
  }
  const full={cam:[.1,.72],bounds:[[-7.6,0,-3.0],[6.0,2.0,1.9]]};
  const V=[{cam:[.32,.55],bounds:[[-7.6,0,-1.6],[-3.6,1.7,1.6]]},
    {cam:[.25,.5],bounds:[[-3.6,0,-3.1],[.3,2.4,1.2]]},
    {cam:[.18,.5],bounds:[[-3.4,0,-.7],[.6,2.4,1.5]]},
    {cam:[.1,.5],bounds:[[-1.6,0,-.6],[3.1,2.5,1.9]]},
    {cam:[.12,.58],bounds:[[-3.6,0,-3.1],[3.2,2.6,1.9]]},full];
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one training step through the four libraries',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[22,14,16,20],view:k=>V[k]});
  (window.TSSTG=window.TSSTG||{})['stg-hero']=st;
})();
