// ---- Scene, Fig. 2 (section 4): the LayerNorm backward's grid, and why its row axis must be "arbitrary" (renderer v2).
// HBM at the back: x and dy [4,096 x 128] as 16 bands of 256 rows (with mu and rstd), dx as 16 bands, dscale and dbias as one [1 x 128] block each.
// One core: each step copies a band in and writes its dx band back; dscale and dbias stay in VMEM for the whole grid (zeroed at step 0,
// added to at every step, written back once). Two cores ("parallel" on a megacore chip): each has its own VMEM copy of the block.
// Data: PK.G.kernels ln_bwd and PK.G.ix.ln_bwd (pk_grid.py), PK.K.bugs[0] (pk_run.py: plain and TPU interpreter, two cores, three seeds).
// Which band goes to which core is illustrative (the interpreter shuffles parallel axes). Explained by #sx-ln. ----
(function(){
  if(!document.getElementById('stg-ln')||!window.PK)return;const {at,off,mix}=S3,PK=window.PK;
  const L=PK.G.kernels.find(k=>k.name==='ln_bwd'),C=PK.G.ix.ln_bwd.copies,N=L.grid[0],B=PK.K.bugs[0];
  window.PK_SC=window.PK_SC||{};window.PK_SC.ln={steps:N,copies:C,seeds:B.tpu_runs.map(r=>r.nan?'NaN':r.err),dx:B.tpu_runs.map(r=>r.dx_err),plain:B.plain_err,fixed:B.fixed_err,max:B.max_ref};
  const XB=i=>-4.3+i*.255,DB=i=>.47+i*.255,BW=.2,ZH=-2.35,DEP=1,ZV=.25,ZC=2.1,DS=[-.1,.1];
  const fmt=v=>v>=10?Math.round(v).toLocaleString('en-US'):PKU.e2(v);
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-5,5,-3.4,3,.5);
    const cX=P.c1,cD=P.c3,cA=P.c2,cV=P.c6;
    const a1=k<3?1:k===3?Math.max(0,1-2*e):0,a2=k<3?0:k===3?Math.max(0,2*e-1):1;   // one core, then two
    // HBM
    R.glass([-4.6,.002,-2.95],[9.2,0,0],[0,0,1.2],{c:P.c5,a:.6,nu:1,nv:1,th:.02,dz:60});
    lab([-4.6,0,-2.95],'HBM',{al:'left',dx:2,dy:-12,b:1,c:P.mute});
    const cur=k===0?Math.min(N-1,Math.floor(e*N)):N-1,done=k===0?cur+1:N;
    for(let i=0;i<N;i++){const now=k===0&&i===cur;R.box([XB(i),0,ZH],[BW,.1,DEP],{fill:mix(P.paper,cX,now?.85:k===0&&i>cur?.35:.18),a:k>=3?.45:1,lw:.5,shadow:false});
      const w=i<done&&k<3;R.box([DB(i),0,ZH],[BW,w?.1:.02,DEP],{fill:w||k>=3?mix(P.paper,cD,k>=3?.3:.6):P.paper,fa:w||k>=3?1:.4,a:k>=3?.45:1,lw:.5,shadow:false})}
    DS.forEach((x,j)=>R.box([x,0,ZH],[.07,k===2||k===4?.1:.02,DEP*.5],{fill:k===2||k===4?mix(P.paper,cA,.8):P.paper,fa:k===2||k===4?1:.45,lw:.6,shadow:false}));
    if(k===0){lab([XB(7.5),.1,ZH-.5],'x, dy (and mu, rstd) · 16 bands of 256 rows',{dy:-12,c:cX,b:1,a:e});lab([DB(7.5),.1,ZH-.5],'dx · 16 bands',{dy:-12,c:cD,b:1,a:e})}
    if(k===1||k===2)lab([0,.1,ZH+.25],'dscale, dbias [1 × 128]',{dy:16,c:cA,b:1});
    // one core: a band tile, the dx tile and the accumulator block in VMEM
    if(a1>0){R.glass([-2,.002,ZV-.7],[4,0,0],[0,0,1.4],{c:cV,a:.8*a1,nu:1,nv:1,th:.02,dz:60});lab([-2,0,ZV+.7],'VMEM',{al:'left',dx:2,dy:14,b:1,c:cV,a:a1});
      R.box([-1.2,0,ZV],[.5,.12,DEP*.9],{fill:mix(P.paper,cX,.8),a:a1,shadow:false,lw:.6});R.box([1.2,0,ZV],[.5,.12,DEP*.9],{fill:mix(P.paper,cD,.7),a:a1,shadow:false,lw:.6});
      const h=k===0?.03:k===1?.03+.5*e:.53;R.box([0,0,ZV],[.5,h,DEP*.5],{fill:mix(P.paper,cA,.8),a:a1,lw:.6});
      R.box([0,0,ZC],[2.4,.4,.8],{fill:mix(P.paper,P.c2,.2),a:a1*(k===0||k===1?1:.4)});lab([0,.4,ZC],'one TensorCore',{dy:-12,b:1,a:a1});
      if(k===0){R.flowArc([XB(cur),.12,ZH+DEP/2],[-1.2,.14,ZV-.45],.7,{c:cX,r:.1,speed:1.4});R.flowArc([1.2,.14,ZV-.45],[DB(Math.max(0,cur-1)),.12,ZH+DEP/2],.7,{c:cD,r:.1,speed:1.4});
        lab([0,0,ZV],'step '+(cur+1)+' of '+N,{dy:30,c:P.mute})}
      if(k===1){R.flowArc([-1.2,.14,ZV],[-.15,h,ZV],.35,{c:cA,r:.09,speed:1.1});lab([0,h,ZV],'+= this band\'s part',{dy:-14,b:1,c:cA});
        lab([0,0,ZV+.4],'zeroed at step 0',{dy:20,c:P.mute,a:e})}
      if(k===2){R.flowArc([0,.55,ZV-.25],[0,.12,ZH+.25],.9,{c:cA,r:.1,speed:1.2});lab([0,.55,ZV],'written back once, at the end',{dy:-14,b:1,c:cA,a:e})}
      if(k===2){lab([XB(0),.1,ZH-.5],'x '+C[0]+', dy '+C[1]+' copies',{al:'left',dy:-12,c:cX,b:1,a:e});lab([DB(15),.1,ZH-.5],'dx '+C[3]+' write-backs',{al:'right',dy:-12,c:cD,b:1,a:e})}}
    // two cores: each its own VMEM and its own copy of the block
    if(a2>0){[-1,1].forEach((s,c)=>{const x0=s*1.55;R.glass([x0-1.15,.002,ZV-.7],[2.3,0,0],[0,0,1.4],{c:cV,a:.8*a2,nu:1,nv:1,th:.02,dz:60});
        R.box([x0-.55,0,ZV],[.45,.12,DEP*.9],{fill:mix(P.paper,cX,.8),a:a2,shadow:false,lw:.6});
        const h=k===3?.03+.25*e:.28;R.box([x0+.45,0,ZV],[.45,h,DEP*.5],{fill:mix(P.paper,cA,c===1?.45:.8),a:a2,lw:.6});
        R.box([x0,0,ZC],[1.9,.4,.8],{fill:mix(P.paper,P.c2,.2),a:a2*.8});lab([x0,.4,ZC],'core '+c,{dy:-12,b:1,a:a2});
        lab([x0+.45,h,ZV],c===0?'runs step 0: zeroed':'never runs step 0: not zeroed',{dy:-14,b:1,c:cA,a:a2,grp:'acc'});
        // bands to each core (illustrative split: alternate bands)
        if(k===3)for(let i=c;i<N;i+=4)R.flowArc([XB(i),.12,ZH+DEP/2],[x0-.55,.14,ZV-.45],.6,{c:cX,a:a2*.8,r:.07,n:6,speed:1.2});
        if(k===4)R.flowArc([x0+.45,h+.02,ZV-.25],[DS[c],.12,ZH+.25],.9,{c:cA,r:.1,speed:1.2,a:a2})});
      lab([0,0,ZC+.4],'VMEM per core · HBM shared',{dy:26,c:cV,b:1,a:a2});
      if(k===4){const S=B.tpu_runs;lab([0,.1,ZH-.25],'one dscale block, two writers',{dy:-16,b:1,c:cA});
        S.forEach((r,i)=>lab([3.1,0,ZV+.75],'seed '+r.seed+': dscale '+(r.nan?'NaN':'off by '+fmt(r.err)),{al:'left',dy:18*i,c:r.nan?P.bad:P.ink,b:1,wide:1}))}}
  }
  const full={cam:[.16,.8],bounds:[[-4.6,0,-3],[4.6,.6,2.55]]};
  const st=S3.stage({id:'stg-ln',list:'sx-ln',fig:'Fig. 2 · one accumulator, one or two cores',cam:full.cam,bounds:full.bounds,aspect:.54,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,8,16,8]:[22,16,20,16],
    view:k=>S3PH(k===1?{cam:[.2,.8],bounds:[[-2.4,0,-1],[2.4,.7,2.6]]}:full)});
  (window.PKSTG=window.PKSTG||{})['stg-ln']=st;
})();
