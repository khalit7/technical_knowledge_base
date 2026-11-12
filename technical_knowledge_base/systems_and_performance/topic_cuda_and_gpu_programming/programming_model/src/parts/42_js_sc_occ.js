// ---- Scene, Fig. 3 (section 5): occupancy as one H100 SM's two budgets filled by resident 256-thread blocks: 64 warp slots and 65,536 registers
// (drawn as 64 cells of 1,024, one warp's worth at 32 registers per thread). The three heavy kernels' real register counts on sm_90a (ptxas -v,
// window.PM.occ) and blocks per SM from the page's port of NVIDIA's cuda_occupancy.h (window.PMOCC, checked against the header on 1,155 values).
// Spill stores per thread from the same ptxas reports. Steps are explained by #sx-occ on the left. ----
(function(){
  if(!document.getElementById('stg-occ')||!window.PMOCC)return;const {at,off,mix}=S3;
  const O=window.PMOCC,D=window.PM.occ.sm_90a,ARCH='sm_90a',B=256,WPB=8;
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2','#e15759','#9c755f'].map(S3.rgb);
  const K=['heavy_plain','heavy_lb1024','heavy_lb256x8'];
  const C=K.map(k=>{const r=D[k],o=O.blocks(ARCH,r.regs,0,B,0,1024),perWarp=Math.ceil(r.regs*32/256)*256;
    return {k,regs:r.regs,n:o.n,lim:o.lim,cells:perWarp*WPB/1024,warps:o.n*WPB,occ:o.n*WPB/64,spill:r.spill_st}});
  window.PM_OCC=C; // the step list's numbers are checked against these by check/check_stages.mjs
  const CW=.34,XS=-2.1,XR=2.1,cell=(x0,i)=>[x0+((i%8)-3.5)*CW,0,(Math.floor(i/8)-3.5)*CW];
  function draw(R,k,e){const P=R.P,H=P.acc,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));R.grid(-6,6,-3.2,3.4,.5);
    // the two budgets as glass trays
    R.glass([XS-1.5,.005,-1.5],[3,0,0],[0,0,3],{c:P.c1,a:.5,nu:8,nv:8,th:.03});R.glass([XR-1.5,.005,-1.5],[3,0,0],[0,0,3],{c:P.c4,a:.5,nu:8,nv:8,th:.03});
    lab([XS,0,-1.55],'64 warp slots',{b:1,dy:-14});lab([XR,0,-1.55],'65,536 registers',{b:1,dy:-14});
    if(k===0){lab([XR,0,1.6],'one cell = 1,024 registers',{dy:14,fs:12,c:P.mute,a:e,wide:1});lab([XS,0,1.6],'one cell = one warp of 32 threads',{dy:14,fs:12,c:P.mute,a:e,wide:1})}
    const c=k>=1?C[k-1]:null;
    // empty cells, then the resident blocks: block b takes 8 warp slots and its registers
    for(let i=0;i<64;i++){R.box(cell(XS,i),[.27,.03,.27],{fill:P.paper,a:.5,shadow:false,lw:.4});R.box(cell(XR,i),[.27,.03,.27],{fill:P.paper,a:.5,shadow:false,lw:.4})}
    if(c){for(let b=0;b<c.n;b++){const t=Math.max(0,Math.min(1,e*1.25*c.n-b)),col=TAB[b%8],fill=mix(P.paper,col,.62);
        for(let w=0;w<WPB;w++)R.box(cell(XS,b*WPB+w),[.27,.3*t,.27],{fill,a:t,shadow:false,lw:.5});
        for(let j=0;j<c.cells;j++)R.box(cell(XR,b*c.cells+j),[.27,.3*t,.27],{fill,a:t,shadow:false,lw:.5});
        if(t>0&&t<1)R.flowArc([-5.2,.3,0],cell(XS,b*WPB+3),.8,{c:col,a:.9,r:.06,n:5,speed:1.6})}
      // the next block waits: nothing left of the resource that ran out
      const full=c.n*WPB>=64;
      if(!full){R.box([-5.2,0,0],[.6,.45,.6],{fill:mix(P.paper,P.bad,.35),a:at(k,e,k)*.95});lab([-5.2,.45,0],'block '+(c.n+1)+' waits',{dy:-14,fs:12.5,b:1,c:P.bad,a:e})}
      lab([XS,0,1.6],c.warps+' of 64 warps · '+Math.round(c.occ*100)+'%',{dy:14,fs:12.5,b:1,c:H,a:e});
      lab([XR,0,1.6],c.n+' blocks × '+(c.cells*1024).toLocaleString('en-US')+' = '+(c.cells*c.n*1024).toLocaleString('en-US'),{dy:14,fs:12.5,b:1,a:e});
      // spills: values that did not fit go to local memory, in DRAM behind the caches
      if(c.spill){const a=e;R.glass([XR-1.4,-.001,2.5],[2.8,0,0],[0,0,.7],{c:P.bad,a:a*.6,nu:8,nv:2,th:.03});
        for(let x=-1;x<=1;x+=.5)R.flow([[XR+x,.3,1.2],[XR+x,.05,2.8]],{c:P.bad,a:a*.85,r:.05,n:3,speed:.9});
        lab([XR,0,3.2],'spills '+c.spill.toLocaleString('en-US')+' B to local memory',{dy:14,fs:12.5,b:1,c:P.bad,a,wide:1})}}
  }
  const full={cam:[.2,.82],bounds:[[-5.8,0,-1.9],[3.8,.4,3.4]]};
  const st=S3.stage({id:'stg-occ',list:'sx-occ',fig:'Fig. 3 · one H100 SM, 256-thread blocks',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[26,40,30,30]});
  (window.PMSTG=window.PMSTG||{})['stg-occ']=st;
})();
