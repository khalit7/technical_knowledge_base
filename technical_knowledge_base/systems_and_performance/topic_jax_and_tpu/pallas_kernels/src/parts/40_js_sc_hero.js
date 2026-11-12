// ---- Scene, Fig. 1 (the idea): the bias + GELU kernel of section 3 on a TPU core's memory hierarchy (renderer v2: glass plates, flows, camera per step).
// HBM at the back holds the whole arrays: x and o [4,096 x 512] as 8 blocks of 512 rows each, b [1 x 512] as one thin strip.
// VMEM in the middle holds the tiles: two slots for x and two for o (double buffering), one for b (single-buffered, its window never moves).
// The TensorCore in front runs the body. Shapes, block shapes and copy counts are the kernel's own (PK.G.kernels bias_gelu, recorded by
// src/runs/pk_grid.py). Explained by #sx-hero. ----
// shared by the four scenes: on a phone (canvas under 520 px) every view looks down more steeply, so a wide scene's depth fills the card
window.S3PH=v=>innerWidth<520?{cam:[v.cam[0],Math.max(v.cam[1],1.02)],bounds:v.bounds}:v;
(function(){
  if(!document.getElementById('stg-hero')||!window.PK)return;const {at,off,mix}=S3,G=window.PK.G;
  const L=G.kernels.find(k=>k.name==='bias_gelu'),C=G.ix.bias_gelu.copies,N=L.grid[0];        // 8 steps; copies x 8, b 1, o 8
  const ox=L.ops[0],ob=L.ops[1];
  window.PK_SC=window.PK_SC||{};window.PK_SC.hero={steps:N,copies:C,x:ox.shape,block:ox.block,b:ob.shape};
  const BW=.44,XB=i=>-4.15+i*.5,OB=i=>.65+i*.5,ZH=-2.4,ZV=.1,ZC=2.1,DEP=1.2,BX=-.02;
  const SX=[-2.55,-1.95],SB=-1.05,SO=[1.15,1.75];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-5,5,-3.6,3,.5);
    const cX=P.c1,cO=P.c3,cB=P.c4,cV=P.c6;
    // what each step is about at full strength; the rest recedes
    const fH=k===0||k===5?1:k===4?.3:.55,fV=k===0?.25:k===4?.3:1,fC=k===0?.25:k===4||k===5?.3:1;
    // HBM: a glass floor holding the arrays
    R.glass([-4.6,.002,-3.15],[9.2,0,0],[0,0,1.5],{c:P.c5,a:.55*fH+.15,nu:1,nv:1,th:.02,dz:60});
    lab([-4.6,0,ZH],'HBM',{al:'right',dx:-8,b:1,c:P.mute});lab([-4.6,0,ZH],'whole arrays',{al:'right',dx:-8,dy:16,fs:12,c:P.mute,wide:1});
    // x bands: used (dim), in use, arriving
    const used=k===0?-1:k===1||k===2?0:k===3?2:N-1;
    for(let i=0;i<N;i++){let fill=mix(P.paper,cX,.35),a=fH;
      if(k===5)fill=mix(P.paper,cX,.18);else if(k>=1&&k<=3&&i===used)fill=mix(P.paper,cX,.85);else if(k===3&&i===3)fill=mix(P.paper,cX,.6);else if(k>=1&&i<used)fill=mix(P.paper,cX,.15);
      if(k===4)a=.25;
      R.box([XB(i),0,ZH],[BW,.1,DEP],{fill,a,lw:.6})}
    // o bands: written back one by one (empty outlines until then)
    const written=k<=2?0:k===3?1:k===4?0:N;
    for(let i=0;i<N;i++){const w=i<written,cur=k===3&&i===1;
      R.box([OB(i),0,ZH],[BW,w||cur?.1:.02,DEP],{fill:w?mix(P.paper,cO,.6):cur?mix(P.paper,cO,.35*e):P.paper,a:k===4?.2:w||cur?fH:.35*fH,fa:w||cur?1:.4,lw:.6,shadow:w})}
    // b: one thin strip [1 x 512]
    R.box([BX,0,ZH],[.09,.1,DEP],{fill:mix(P.paper,cB,.8),a:k===4?1:fH,lw:.6});
    if(k===0){lab([XB(3.5),.1,ZH-.6],'x [4,096 × 512] · 8 blocks of 512 rows',{dy:-12,c:cX,b:1,a:e,wide:1});lab([BX,.1,ZH+.6],'b [1 × 512]',{dy:16,c:cB,b:1,a:e});
      lab([OB(3.5),.1,ZH-.6],'o [4,096 × 512] · 8 blocks',{dy:-12,c:cO,b:1,a:e,wide:1});lab([0,0,ZC+.45],'grid=(8,): one block of rows per step',{dy:18,c:P.mute,a:e,wide:1})}
    // VMEM: a teal glass plate with five slots
    R.glass([-3.1,.002,ZV-.75],[5.4,0,0],[0,0,1.5],{c:cV,a:.8*fV,nu:1,nv:1,th:.02,dz:60});
    lab([-3.1,0,ZV-.75],'VMEM',{al:'right',dx:-8,b:1,c:cV,a:Math.max(.45,fV)});lab([-3.1,0,ZV-.75],'tiles, per core',{al:'right',dx:-8,dy:16,fs:12,c:cV,a:Math.max(.45,fV),wide:1});
    const slot=(x,w,fill,a,filled)=>R.box([x,0,ZV],[w,filled?.12:.02,DEP*.92],{fill:filled?fill:P.paper,a,fa:filled?1:.35,lw:.7,shadow:false});
    // x slots: A then B (double buffer); in step 4 (index 3) slot A holds block 2 (computing) and B receives block 3
    const xA=k>=1&&k!==5,xB=k===3;
    slot(SX[0],BW,mix(P.paper,cX,.85),k===4?.3:fV,xA);slot(SX[1],BW,mix(P.paper,cX,.55),k===4?.3:fV,xB);
    slot(SB,.09,mix(P.paper,cB,.8),k===4?1:fV,k>=1);
    slot(SO[0],BW,mix(P.paper,cO,.7),k===4?.3:fV,k>=2&&k!==5);slot(SO[1],BW,mix(P.paper,cO,.45),k===4?.3:fV,k===3);
    // the TensorCore
    R.box([0,0,ZC],[2.6,.45,.9],{fill:mix(P.paper,P.c2,.28),a:fC});
    lab([0,.45,ZC],'TensorCore · runs the body',{dy:-12,b:1,c:P.ink,a:Math.max(.4,fC)});
    // flows: copies in (HBM to VMEM), the body (VMEM to core to VMEM), write-backs (VMEM to HBM)
    const inArc=(fx,tx,c,a)=>R.flowArc([fx,.12,ZH+DEP/2],[tx,.14,ZV-.5],.75,{c,a,r:.1,speed:1.4});
    const outArc=(fx,tx,a)=>R.flowArc([fx,.14,ZV-.5],[tx,.12,ZH+DEP/2],.75,{c:cO,a,r:.1,speed:1.4});
    if(k===1){inArc(XB(0),SX[0],cX,1);inArc(BX,SB,cB,1);
      lab([SX[0],.12,ZV],'x block (0, 0)',{dy:-14,b:1,c:cX,a:e,grp:'s'});lab([SB,.12,ZV],'b block (0, 0)',{dy:-14,b:1,c:cB,a:e,grp:'s'})}
    if(k===2||k===3){R.flowArc([SX[0],.14,ZV+.5],[-.5,.45,ZC-.3],.35,{c:cX,r:.09,speed:1.2});R.flowArc([SB,.14,ZV+.5],[-.15,.45,ZC-.3],.3,{c:cB,r:.07,speed:1.2,n:4});
      R.flowArc([.5,.45,ZC-.3],[SO[0],.14,ZV+.5],.35,{c:cO,r:.09,speed:1.2});
      lab([0,.45,ZC],'o_ref[...] = gelu(x_ref[...] + b_ref[...])',{dy:22,fs:12,c:P.mute,a:k===2?e:1,wide:1})}
    if(k===2)lab([SX[0],.12,ZV],'block 0: computing',{dy:-14,b:1,c:cX,a:e,grp:'s'});
    if(k===3){inArc(XB(3),SX[1],cX,1);outArc(SO[1],OB(1),1);
      lab([-3.1,0,ZV+.45],'x block 2: computing',{al:'right',dx:-6,dy:-9,b:1,c:cX,wide:1});lab([-3.1,0,ZV+.45],'x block 3: copying in',{al:'right',dx:-6,dy:9,b:1,c:cX,wide:1});
      lab([2.3,0,ZV],'o block 2: being written',{al:'left',dx:6,dy:-9,b:1,c:cO,wide:1});lab([2.3,0,ZV],'o block 1: writing back',{al:'left',dx:6,dy:9,b:1,c:cO,wide:1})}
    if(k===4){lab([BX,.1,ZH],'index map: (0, 0) at every step',{dy:-16,b:1,c:cB});lab([SB,.12,ZV],'copied once · 1 buffer',{dy:-16,b:1,c:cB});
      R.flowArc([BX,.12,ZH+DEP/2],[SB,.14,ZV-.5],.75,{c:cB,a:.3,r:.08,n:3,speed:.5})}
    if(k===5){lab([XB(3.5),.1,ZH-.6],'x · '+C[0]+' copies in',{dy:-12,c:cX,b:1,a:e});lab([BX,.1,ZH+.6],'b · '+C[1]+' copy',{dy:16,c:cB,b:1,a:e});
      lab([OB(3.5),.1,ZH-.6],'o · '+C[2]+' write-backs',{dy:-12,c:cO,b:1,a:e})}
  }
  const full={cam:[.18,.78],bounds:[[-4.7,0,-3.2],[4.7,.6,2.6]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one grid step on a TPU core',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1500,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,20,16],
    view:k=>S3PH(k===2?{cam:[.18,.8],bounds:[[-3.3,0,-.9],[2.6,.6,2.7]]}:k===4?{cam:[.3,.72],bounds:[[-3.2,0,-3.2],[1.8,.5,1.3]]}:full)});
  (window.PKSTG=window.PKSTG||{})['stg-hero']=st;
})();
