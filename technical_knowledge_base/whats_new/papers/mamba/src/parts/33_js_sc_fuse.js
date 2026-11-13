// ---- Scene (The hardware-aware scan): where the scan's tensors live, naive against fused (renderer v2: HBM and SRAM as slabs, tensors as glass plates, flows for traffic) ----
// Counts are this page's HBM element count of one scan (the steps of Appendix D, batch 1), the same formula as recompute.py's io() and the
// calculator below, at Figure 8's setting (L = 2^14, D = 1,024, N = 16): PAPER.rc.io_fig8. A (B, L, D, N) tensor is drawn as a stack of N = 16 plates
// of the (B, L, D) size, so its height shows the factor N; B, C (L, N) and A (D, N) are drawn wider than to scale, so they stay visible.
(function(){
  if(!document.getElementById('stg-fuse'))return;const {at,off,lerp,mix}=S3;
  const F=PAPER.rc.io_fig8,L=F.L,D=F.D,N=F.N;
  // the naive scan's traffic, phase by phase (elements), and the fused kernel's
  const ph={read:2*L*D+2*L*N+D*N,disc:2*L*D*N,scan:2*L*D*N+L*D*N,out:L*D*N+L*N+L*D},naive=ph.read+ph.disc+ph.scan+ph.out,fused=3*L*D+2*L*N+D*N;
  window.__fuse={ph,naive,fused,ratio:+(naive/fused).toFixed(1)};
  const YH=.28,PW=1.15,PD=.8,SP=.045,SX=.75,SY=2.05,SZ=-.45;
  const at3=(x,z)=>[x,YH,z];
  // a tensor lying on HBM: a glass plate, or a stack of N plates for a (B, L, D, N) tensor
  function plate(R,x,z,w,d,c,a,stack){if(a<=.01)return;const n=stack?N:1;for(let i=0;i<n;i++)R.glass([x,YH+.01+i*SP,z],[w,0,0],[0,0,d],{c,a:a*(stack?.75:1),nu:stack?1:6,nv:stack?1:4,th:.012,dz:-60+i*.01})}
  function draw(R,k,e){const P=R.P;R.grid(-4.8,4.8,-2.6,2.6,.5);
    // the memory hierarchy: a large slow HBM slab on the floor, a small fast SRAM slab raised on a pillar
    R.box([0,0,0],[8.4,YH,3.2],{fill:mix(P.paper,P.mute,.12)});R.label([4.2,YH,1.6],R.W<520?'HBM':'GPU HBM · large, slow',{fs:12.5,mono:true,b:1,c:P.mute,al:'right',dx:-4,dy:14});
    R.box([SX,0,SZ],[.12,SY-.05,.12],{shadow:false,a:.8});R.box([SX,SY-.05,SZ],[1.7,.1,1.1],{fill:mix(P.paper,P.c3,.35)});
    R.label([SX+.85,SY+.05,SZ],R.W<520?'SRAM':'SRAM · small, fast',{fs:12.5,mono:true,b:1,c:P.c3,al:'left',dx:8});
    // inputs (always in HBM): x and Delta (B, L, D); B and C (B, L, N); A (D, N)
    const ina=k===4||k===5?.45:1;
    plate(R,-3.9,-1.2,PW,PD,P.c1,ina);R.label([-3.9+PW/2,YH,-1.2],'x',{fs:13,serif:true,b:1,c:P.c1,dy:-8});
    plate(R,-3.9,.2,PW,PD,P.c4,ina);R.label([-3.9+PW/2,YH,.2],'Δ',{fs:13,serif:true,b:1,c:P.c4,dy:-8});
    plate(R,-2.4,-1.2,PW,.14,P.c3,ina);R.label([-2.4+PW/2,YH,-1.2],'B',{fs:13,serif:true,b:1,c:P.c3,dy:-8});
    plate(R,-2.4,-.75,PW,.14,P.c5,ina);R.label([-2.4+PW/2,YH,-.75],'C',{fs:13,serif:true,b:1,c:P.c5,dy:-8});
    plate(R,-2.4,.2,.3,.3,P.c2,ina);R.label([-2.25,YH,.2],'A',{fs:13,serif:true,b:1,c:P.c2,dy:-8});
    const inputs=[[-3.9+PW/2,YH,-.8],[-3.9+PW/2,YH,.6],[-2.4+PW/2,YH,-1.1],[-2.4+PW/2,YH,-.7],[-2.25,YH,.35]],sram=[SX,SY+.06,SZ];
    // naive: Abar and Bbar, then h, each (B, L, D, N), written to HBM; then y
    const nA=k===1?e:k>=2&&k<=3?1:k===4?1-e:0,nH=k===2?e:k===3?1:k===4?1-e:0;
    plate(R,-.95,.1,PW,PD,P.c2,nA,true);plate(R,.55,.1,PW,PD,P.c3,nA,true);plate(R,2.2,.1,PW,PD,P.c1,nH,true);
    if(nA>.3){R.label([-.95+PW/2,YH+N*SP,.5],'Ā · 16×',{fs:12.5,mono:true,b:1,c:P.c2,dy:-10,a:nA,wide:1});R.label([.55+PW/2,YH+N*SP,.5],'B̄x · 16×',{fs:12.5,mono:true,b:1,c:P.c3,dy:-10,a:nA,wide:1})}
    if(nH>.3)R.label([2.2+PW/2,YH+N*SP,.5],'h · 16×',{fs:12.5,mono:true,b:1,c:P.c1,dy:-10,a:nH,wide:1});
    plate(R,-1.05,-1.45,PW,PD,P.c6,k===3?e:k===4?1-e:k===5?e:k===6?1:0);
    if((k===3&&e>.5)||k>=5)R.label([-1.05+PW/2,YH,-1.45],'y',{fs:13,serif:true,b:1,c:P.c6,dy:-8});
    // traffic: naive writes the big stacks through SRAM and reads them back; fused loads once and writes only y
    const big={r:.08,n:12,speed:1.6};
    if(k===1){inputs.forEach(p=>R.flowArc(p,sram,.4,{c:P.mute,r:.05,n:5}));R.flowArc(sram,[-.95+PW/2,YH+.4,.5],.3,{c:P.c2,...big});R.flowArc(sram,[.55+PW/2,YH+.4,.5],.3,{c:P.c3,...big})}
    if(k===2){R.flowArc([-.95+PW/2,YH+.4,.5],sram,.3,{c:P.c2,...big});R.flowArc([.55+PW/2,YH+.4,.5],sram,.3,{c:P.c3,...big});R.flowArc(sram,[2.2+PW/2,YH+.4,.5],.3,{c:P.c1,...big})}
    if(k===3){R.flowArc([2.2+PW/2,YH+.4,.5],sram,.3,{c:P.c1,...big});R.flowArc(inputs[3],sram,.4,{c:P.c5,r:.05,n:5});R.flowArc(sram,[-1.05+PW/2,YH,-1.05],.3,{c:P.c6,r:.06,n:6})}
    if(k===4)inputs.forEach((p,i)=>R.flowArc(p,sram,.4,{c:[P.c1,P.c4,P.c3,P.c5,P.c2][i],r:.06,n:7,a:e}));
    // fused: the state (D, N) is one small plate in SRAM, updated position by position, never written out
    const sa=k===4?e:k===5||k===6?1:0;
    if(sa>0){R.glass([SX-.45,SY+.07,SZ-.3],[.9,0,0],[0,0,.6],{c:P.c1,a:sa,nu:8,nv:4,th:.02});R.label([SX,SY+.1,SZ+.3],'h (D, N), per position',{fs:12,mono:true,c:P.c1,dy:16,a:sa,wide:1});
      if(k>=5){const pts=[];for(let i=0;i<=24;i++){const a=i/24*Math.PI*2;pts.push([SX+.55*Math.cos(a),SY+.25,SZ+.38*Math.sin(a)])}R.flow(pts,{c:P.c1,r:.045,n:8,speed:.9,a:k===5?1:.5})}}
    if(k===5)R.flowArc(sram,[-1.05+PW/2,YH,-1.05],.3,{c:P.c6,r:.06,n:6});
    if(k===6){inputs.forEach((p,i)=>R.flowArc(p,sram,.4,{c:[P.c1,P.c4,P.c3,P.c5,P.c2][i],r:.045,n:4,a:.7}));R.label(sram,'backward: recompute h here',{fs:12,b:1,c:P.c1,dy:-34})}
    // the bill: naive against fused HBM traffic, to scale, on two plinths at the front right
    if(k>=3){const hN=1.6,hF=hN*fused/naive,bx=3.45,an=k===3?e:1,fa=k===5?e:k===6?1:0;
      R.box([bx,YH,1.3],[.45,Math.max(.02,hN*an),.45],{fill:mix(P.paper,P.c2,.7),dz:-80});R.label([bx,YH+hN*an,1.3],'naive '+(naive/1e6).toFixed(0)+'M',{fs:12,mono:true,b:1,c:P.c2,dy:-10,al:'left',dx:14,a:an});
      if(fa>0){R.box([bx+.65,YH,1.3],[.45,Math.max(.02,hF),.45],{fill:mix(P.paper,P.c3,.75),a:fa,dz:-80});R.label([bx+.65,YH+hF,1.3],'fused '+(fused/1e6).toFixed(1)+'M',{fs:12,mono:true,b:1,c:P.c3,dy:-10,dx:14,a:fa})}}
  }
  const full={cam:[.3,.72],bounds:[[-4.3,0,-1.7],[4.3,2.3,1.7]]};
  S3.stage({id:'stg-fuse',list:'sx-fuse',fig:'One scan · HBM traffic counted',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1600,hold:4600,draw,
    view:k=>null});
})();
