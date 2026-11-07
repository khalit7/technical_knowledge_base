// ---- Scene, Fig. 7 (section 7): a passed-through GPU's DMA through the IOMMU into VM A's pages only; pinning; peer to peer under ACS (renderer v2) ----
// Not run here (no IOMMU in this VM): the mechanism from the kernel's VFIO documentation and NCCL's guide. Addresses and the page layout are illustrative.
(function(){
  if(!document.getElementById('stg-iommu'))return;const {at,mix}=S3;
  const OWN=['A','B','host','A','B','A','host','B','A','B','host','A'],N=OWN.length,PWD=.56,px=i=>-3.3+i*.6;
  const YR=0,YI=1.15,YS=2.25,YD=3.1,GPU=[-1.3,YD,0],NIC=[1.4,YD,0],SW=[0,YS,0];
  const TGT=3,BAD=7; // the host page backing VM A's 0x1000, and the B page a stray 0x9000 would hit
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.2,4.2,-1.4,1.6,.5);
    const oc=o=>o==='A'?P.c1:o==='B'?P.c4:P.mute;
    // host RAM, page by page
    OWN.forEach((o,i)=>{const hit=(k>=1&&k<=2&&i===TGT),pin=k===3&&o==='A';
      R.box([px(i),YR,0],[PWD-.06,.28,.8],{fill:mix(P.paper,oc(o),o==='host'?.12:hit?.75:.4),a:1,shadow:false});
      if(!nar||o!=='host')R.label([px(i),YR,.4],o,{fs:12,b:1,dy:11,c:oc(o)});
      if(pin)R.box([px(i),.28,0],[.3,.12*at(k,e,3),.3],{fill:P.ink,a:e,shadow:false})});
    R.label([px(0)-.3,.14,0],nar?'RAM':'host RAM',{al:'right',fs:12.5,b:1,dx:-6,c:P.ink});
    if(k===3)R.label([px(N-1)+.3,.4,0],'pinned: VM A',{al:'left',fs:12.5,b:1,dx:6,c:P.ink,a:e});
    // the IOMMU: VM A's domain table, a glass plate between the switch and RAM
    const ia=k===0?.35:1;R.glass([-3.6,YI,-.55],[7.2,0,0],[0,0,1.1],{c:P.c2,a:ia,nu:12,nv:2,th:.04});
    R.label([3.6,YI,0],nar?'IOMMU':'IOMMU · VM A\'s domain table',{al:'left',fs:12.5,b:1,dx:8,c:P.c2,a:Math.max(.5,ia)});
    // the PCIe switch, the GPU and the NIC
    R.box([SW[0],YS,0],[2.4,.3,.7],{fill:mix(P.paper,P.c6,.3),a:1});R.label([SW[0]+1.2,YS+.15,0],'PCIe switch',{al:'left',fs:12.5,b:1,dx:8,c:P.mute});
    R.box(GPU,[1.5,.45,.9],{fill:mix(P.paper,P.c3,.5),a:1});R.label([GPU[0],YD+.45,0],'GPU · VM A',{fs:12.5,b:1,dy:-10});
    R.box(NIC,[1.1,.35,.7],{fill:mix(P.paper,P.c6,.4),a:k===4?1:.3});R.label([NIC[0],YD+.35,0],'NIC',{fs:12.5,b:1,dy:-10,a:k===4?1:.4});
    [GPU,NIC].forEach(d=>R.line([[d[0],YD,0],[d[0]*.5,YS+.3,0]],{c:P.mute,w:1.2,a:.5}));R.line([[0,YS,0],[0,YI+.05,0]],{c:P.mute,w:1.2,a:.5});
    // 0. the guest's driver hands the GPU a guest-physical address
    if(k===0)R.label([GPU[0]-.75,YD+.2,0],'buffer at 0x1000 (guest-physical)',{al:'right',fs:12.5,b:1,mono:true,dx:-8,c:P.c2,a:e,wide:1});
    // 1. DMA to 0x1000: GPU, switch, the IOMMU entry, VM A's page
    const ent=[px(TGT),YI+.04,0];
    if(k===1||k===3){R.flow([[GPU[0],YD,0],[0,YS+.3,0],[0,YS,0],[ent[0],YI+.5,0],ent,[px(TGT),.3,0]],{c:P.c2,a:k===1?e:.5,r:.08,speed:1.5,n:14});
      R.box([ent[0],YI,0],[.5,.06,.5],{fill:P.c2,a:k===1?e:.5,shadow:false});
      if(k===1)R.label([ent[0],YI+.06,0],'0x1000 → A\'s page',{fs:12.5,b:1,mono:true,dy:-14,dx:-10,al:'right',c:P.c2,a:e})}
    // 2. DMA to 0x9000: no entry, blocked at the IOMMU
    if(k===2){const bx=[px(BAD),YI+.04,0];R.flow([[GPU[0]+.3,YD,0],[.1,YS+.3,0],[.1,YS,0],[bx[0],YI+.5,0],bx],{c:P.bad,a:e,r:.08,speed:1.5,n:12});
      R.glow(bx,.55,{c:P.bad,a:e});R.line([[bx[0]-.25,YI+.05,-.25],[bx[0]+.25,YI+.05,.25]],{c:P.bad,w:3,a:e,top:1});R.line([[bx[0]-.25,YI+.05,.25],[bx[0]+.25,YI+.05,-.25]],{c:P.bad,w:3,a:e,top:1});
      R.label([bx[0],YI,0],'0x9000: no entry, blocked',{fs:12.5,b:1,mono:true,dy:-30,c:P.bad,a:e})}
    // 4. peer to peer: the direct path is not allowed; ACS sends it up through the IOMMU and back
    if(k===4){R.line([[GPU[0]+.75,YD+.22,0],[NIC[0]-.55,YD+.18,0]],{c:P.bad,w:1.6,dash:[5,4],a:e});R.label([.05,YD+.25,0],'direct: off (ACS)',{fs:12.5,b:1,dy:-14,c:P.bad,a:e});
      R.flow([[GPU[0],YD,0],[-.2,YS+.3,0],[-.2,YI+.05,0],[.2,YI+.05,0],[.2,YS+.3,0],[NIC[0],YD,0]],{c:P.c6,a:e,r:.08,speed:1.4,n:14});
      R.glow([0,YI+.05,0],.45,{c:P.c6,a:e})}
  }
  const full={cam:[.3,.3],bounds:[[-3.7,0,-.8],[3.7,3.6,.9]]};
  S3.stage({id:'stg-iommu',list:'sx-iommu',fig:'Fig. 7 · DMA through the IOMMU',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,46,22,30]:[24,190,30,70]});
})();
