// ---- Scene, Fig. 1 (the idea in one screen): the ladder climbed on two HGX H100 servers, rails and a spine. Bandwidths per GPU, each direction,
// from window.IC.ladder (HBM 3,350, NVLink 4 450, PCIe 5.0 x16 63, 400 Gb/s NIC 50 GB/s); the spine's 1:7 is Meta's oversubscription between pods
// (section 5), so traffic crossing it gets 50 / 7 GB/s per GPU when every GPU sends (derived). HBM: 3,350 GB/s over the H100's 5 used stacks.
// Pipe cross-section area is proportional to bandwidth (ICG.pipe). Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.ICG||!window.IC)return;const {mix,lerp}=S3,G=ICG;
  const bwOf=re=>IC.ladder.find(r=>re.test(r.nm)).bw;
  const BW={hbm:bwOf(/HBM/),nvl:bwOf(/NVLink 4/),pcie:bwOf(/PCIe/),nic:bwOf(/400 Gb\/s NIC/),over:7};BW.spine=BW.nic/BW.over;BW.stack=BW.hbm/5;
  window.IC_HERO=BW; // checked by check/check_stages.mjs
  const S0=G.server(2,1),S1=G.server(-2,-1),f=n=>Number(n).toLocaleString('en-US');
  const A=[ // per step: the alpha of each part, so a step shows what it is about and the rest recedes
    {gpu:1,hbm:1,nvs:.2,pci:.2,nic:.2,cpu:.2,s1:0,leaf:0,spine:0,nvl:0,pcie:0,rail:0,up:0},
    {gpu:1,hbm:.35,nvs:1,pci:.25,nic:.25,cpu:.25,s1:0,leaf:0,spine:0,nvl:1,pcie:0,rail:0,up:0},
    {gpu:1,hbm:.3,nvs:.3,pci:1,nic:1,cpu:1,s1:0,leaf:0,spine:0,nvl:.25,pcie:1,rail:0,up:0},
    {gpu:.7,hbm:.25,nvs:.3,pci:.35,nic:1,cpu:.3,s1:1,leaf:1,spine:0,nvl:.2,pcie:.35,rail:1,up:0},
    {gpu:.6,hbm:.25,nvs:.3,pci:.3,nic:.6,cpu:.3,s1:1,leaf:1,spine:1,nvl:.25,pcie:.3,rail:.45,up:1}];
  const HG=3; // the GPU the steps follow
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,a=n=>lerp(A[pk][n],A[k][n],e),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-7.5,7.5,-4,4,.5);
    // servers: server 0 in front (NICs facing the viewer), server 1 behind it, its NICs facing the rails between them
    const s1=a('s1');
    [[S0,1],[S1,s1]].forEach(([S,m])=>{if(m<=.01)return;
      G.drawServer(R,S,{tray:m,gpu:a('gpu')*m,hbm:a('hbm')*m,nvs:a('nvs')*m,pci:a('pci')*m,nic:a('nic')*m,cpu:a('cpu')*m,hl:{[HG]:P.acc,0:k===1?P.acc:null}});
      G.links(R,S,BW,{nvl:a('nvl')*m,pcie:a('pcie')*m})});
    // 1. HBM: five stacks around the die of GPU 3, each a fat pipe into it
    const g=S0.gpu(HG),die=[g[0],.32,g[2]];
    if(k===0||pk===0){const m=k===0?Math.min(1,e*1.4):1-e;
      // each used stack joins the die by a bridge whose square cross-section has the area of a 670 GB/s pipe (side = D * sqrt(pi) / 2)
      const sd=G.D(BW.stack)*.886;
      for(let s=0;s<5;s++){const sx=s<3?-1:1,z=g[2]+((s%3)-1)*.27,x0=g[0]+sx*.29,x1=g[0]+sx*.23;
        R.box([(x0+x1)/2,.16+.12-sd/2,z],[Math.abs(x0-x1)+.02,sd,Math.min(sd,.24)],{fill:mix(P.paper,P.c4,.8),a:m,shadow:false,fa:.85});
        R.flow([[g[0]+sx*.37,.42,z],[g[0]+sx*.12,.42,z]],{c:P.c4,a:m,r:.05,n:2,speed:.35})}
      lab([g[0],.45,g[2]-.45],'HBM3 · '+f(BW.hbm)+' GB/s',{dy:-14,b:1,c:P.c4,a:m});lab([g[0],.1,g[2]+.45],'5 stacks · '+f(BW.stack)+' GB/s each',{dy:16,fs:12,c:P.c4,a:m})}
    // 2. NVLink: GPU 0 to GPU 3 through the switch layer
    if(k===1){const z=S0.nvs(0)[2],p=[[G.XG(0),.36,S0.z0],[G.XG(0),.38,z],[G.XG(HG),.38,z],[G.XG(HG),.36,S0.z0]];
      R.flow(p,{c:P.c3,a:e,r:.09,n:12,speed:1.4});
      lab([G.XS(0),.4,z],'4 NVSwitch chips',{dy:-14,fs:12,c:P.c3,a:e});lab([G.XG(1.5),.36,S0.z0-.5],'NVLink 4 · '+BW.nvl+' GB/s each way',{dy:-18,b:1,c:P.c3,a:e});
      lab([G.XG(0),.3,S0.z0],'GPU 0',{dy:22,fs:12,a:e});lab([G.XG(HG),.3,S0.z0],'GPU 3',{dy:22,fs:12,a:e})}
    // 3. PCIe: GPU 3 to its PCIe switch and NIC; the switch also leads to a CPU
    if(k===2){const pc=G.top(S0.pci(1)),nc=G.top(S0.nic(HG));R.flow([[g[0],.22,g[2]],pc,nc],{c:P.c5,a:e,r:.06,n:6,speed:.9});
      lab(nc,'NIC',{dy:18,fs:12,c:P.c2,a:e});lab(pc,'PCIe switch',{al:'left',dx:10,dy:-6,fs:12,c:P.c5,a:e});lab(G.top(S0.cpu(0)),'CPU',{dy:-14,fs:12,a:e});
      lab([G.XG(0),.2,S0.z0+.8],'PCIe 5.0 x16 · '+BW.pcie+' GB/s each way',{dy:-18,b:1,c:P.c5,a:e})}
    // 4 and 5: rails and spine
    const la=a('leaf'),sa=a('spine'),ra=a('rail'),ua=a('up');
    if(la>.01)for(let r=0;r<8;r++){const L=G.leaf(r);R.box([L[0],L[1]-.15,L[2]],[.9,.3,.6],{fill:mix(P.paper,P.c2,r===HG?.75:.45),a:la,shadow:false});
      [S0,S1].forEach(S=>G.pipe(R,G.top(S.nic(r)),[L[0],L[1]-.15,L[2]],BW.nic,{c:P.c2,a:ra*(r===HG&&k===3?1:.85)}))}
    if(sa>.01)for(let s=0;s<4;s++){const Sp=G.spine(s);R.box([Sp[0],Sp[1]-.18,Sp[2]],[1.5,.36,.75],{fill:mix(P.paper,P.bad,.55),a:sa,shadow:false});
      for(let r=0;r<8;r++){const L=G.leaf(r);G.pipe(R,[L[0],L[1]+.15,L[2]],[Sp[0],Sp[1]-.18,Sp[2]],BW.spine,{c:P.bad,a:ua*.8})}}
    if(k===3){const L=G.leaf(HG);R.flow([G.top(S0.nic(HG)),[L[0],L[1]-.15,0],G.top(S1.nic(HG))],{c:P.c2,a:e,r:.08,n:12,speed:1.2});
      lab([L[0],L[1]+.15,0],'rail 3 · '+BW.nic+' GB/s each way',{dy:-14,b:1,c:P.c2,a:e});lab([G.XG(7),G.YL,0],'8 rail leaves',{al:'left',dx:30,fs:12,c:P.c2,a:e,wide:1});
      lab(G.top(S0.nic(HG)),'server 0 · GPU 3',{dy:18,fs:12,a:e});lab(G.top(S1.nic(HG)),'server 1 · GPU 3',{dy:-14,fs:12,a:e,wide:1})}
    if(k===4){const L0=G.leaf(0),L5=G.leaf(5),Sp=G.spine(1);
      R.flow([G.top(S0.nic(0)),[L0[0],L0[1]-.15,0],[L0[0],L0[1]+.15,0],[Sp[0],Sp[1]-.18,0],[L5[0],L5[1]+.15,0],[L5[0],L5[1]-.15,0],G.top(S1.nic(5))],{c:P.bad,a:e,r:.06,n:18,speed:1.3});
      lab([0,G.YS+.2,0],'spine · 1:7 oversubscribed · ≈'+BW.spine.toFixed(1)+' GB/s per GPU',{dy:-16,b:1,c:P.bad,a:e});
      lab(G.top(S0.nic(0)),'GPU 0, server 0',{dy:18,fs:12,a:e,wide:1});lab(G.top(S1.nic(5)),'GPU 5, server 1',{dy:-14,fs:12,a:e,wide:1})}
  }
  const full={cam:[.42,.36],bounds:[[-7.2,0,-3.6],[7.2,5.6,3.6]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the ladder on two HGX H100 servers',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.5,.62],bounds:[[G.XG(HG-1)-.6,0,1.1],[G.XG(HG+1)+.6,.5,2.9]]}:k<=2?{cam:[.35,.62],bounds:[[-6.9,0,.6],[G.XG(HG)+1.3,.5,3.6]]}:k===3?{cam:[.4,.3],bounds:[[-7.2,0,-3.6],[7.2,3.2,3.6]]}:full,
    margin:w=>w<520?[18,10,14,10]:[24,20,20,20]});
  (window.ICSTG=window.ICSTG||{})['stg-hero']=st;
})();
