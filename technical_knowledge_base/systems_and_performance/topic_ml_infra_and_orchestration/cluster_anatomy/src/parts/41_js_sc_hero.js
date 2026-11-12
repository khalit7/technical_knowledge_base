// ---- Scene, Fig. 1 (the idea in one screen): the staircase climbed on Meta's Llama 3 cluster, from one GPU out to the hall.
// Numbers from window.CA.levels.llama3 (the Llama 3 report, section 3.3.1; HBM3 from NVIDIA): GPU 3,350 GB/s, server of 8 on NVLink 450, rack of 16 behind
// one rack switch at 50 GB/s per GPU, pod of 3,072 (192 racks) at 50 with full bisection, cluster of 24,576 (8 pods) at 1:7, 50 / 7 per GPU when a pod
// crosses at once (derived). Drawn small: 12 racks per pod, 8 pods; switch layers as plates. Steps are explained by #sx-hero on the left. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.CAG||!window.CA)return;const {mix,lerp,at}=S3,G=CAG,f=G.f;
  const L=CA.levels.llama3.lv,lv=k=>L.find(r=>r.k===k);
  const H={gpu:lv('gpu'),node:lv('node'),rack:lv('rack'),pod:lv('pod'),cl:lv('cluster')};
  window.CA_HERO={hbm:H.gpu.bw,nvl:H.node.bw,nic:H.rack.bw,pod:H.pod.bw,cl:H.cl.bw,nNode:H.node.n,nRack:H.rack.n,nPod:H.pod.n,nCl:H.cl.n,swRack:H.rack.sw,swPod:H.pod.sw,swCl:H.cl.sw,pods:H.cl.n/H.pod.n,racks:H.pod.n/H.rack.n};
  const PX=i=>((i%4)-1.5)*9,PZ=i=>i<4?2.8:-2.8,FP=1,YP=3.5,YT=5.0;
  const rackAt=(p,r)=>{const col=r%6,row=r<6?0:1;return [PX(p)+(col-2.5)*1.25,0,PZ(p)+(row?-1.3:1.3)]};
  const FR=2,RC=rackAt(FP,FR),FAR=11,RF=rackAt(FP,FAR),OP=6; // the focus rack, a far rack in the same pod, the pod messages cross to
  const OUT=1.9,GF=5; // how far the top server slides out of its rack, and the GPU the steps follow
  function draw(R,k,e,st){const P=R.P,pk=st.pk==null?k:st.pk,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-19,19,-6,7,1);
    // the top server of the focus rack is pulled out for steps 1 and 2 and slides back in at step 3
    const out=k<=1?1:k===2?1-e:0,tA=[RC[0],G.SY[1],RC[2]+OUT*out],tB=[RC[0],G.SY[0],RC[2]];
    const near=k<=1?.22:1; // the focus rack recedes while one server is the subject
    // other racks of the focus pod: faint until step 4, then full
    const podA=k<=2?.07:k===3?lerp(.07,1,e):1;
    for(let r=0;r<12;r++){if(r===FR)continue;G.rack(R,rackAt(FP,r),{a:podA,sw:k>=3?at(k,e,3):0})}
    // the other seven pods appear at step 5
    const othA=k===4?e:0;
    if(othA>.01)for(let p=0;p<8;p++){if(p===FP)continue;for(let r=0;r<12;r++)G.rack(R,rackAt(p,r),{a:othA*.85,sw:othA})}
    // the focus rack and its two servers
    G.rack(R,RC,{a:near,slab:false,sw:k>=2?(k===2?e:1):0,shadow:k>=2});
    const hlA={},hlB={};for(let g=0;g<8;g++){hlA[g]=k===0?(g===GF?P.acc:null):k>=1?mix(P.paper,P.c4,.55):null;hlB[g]=k>=2?mix(P.paper,P.c4,.55):null}
    if(k===0||k>=2)hlA[GF]=P.acc;if(k===2)hlB[GF]=P.acc;
    G.tray(R,tA,{a:1,ga:k===0?.35:1,hl:hlA,nvs:k===0?.25:k===1?1:.45,nic:k>=2?1:.3});
    G.tray(R,tB,{a:k<=1?.3:1,hl:hlB,nvs:.45,nic:k>=2?1:.3});
    // 1. HBM: five stacks beside the followed GPU, dots into the die
    const gA=G.gpu(tA,GF);
    if(k===0){for(let s=0;s<5;s++){const sx=s<3?-1:1,dz=((s%3)-1)*.075,hp=[gA[0]+sx*.105,gA[1],gA[2]+dz];
        R.box(hp,[.026,.05,.04],{fill:mix(P.paper,P.c6,.7),a:e,shadow:false,lw:.5});R.flow([[hp[0],hp[1]+.07,hp[2]],[gA[0],gA[1]+.08,gA[2]]],{c:P.c6,a:e,r:.007,n:4,speed:.12})}
      lab([gA[0],gA[1]+.1,gA[2]-.13],'1 GPU · HBM3 · '+f(H.gpu.bw)+' GB/s',{dy:-16,b:1,c:P.c6,a:e})}
    // 2. NVLink: the followed GPU to the other seven through the switch plate
    if(k===1){for(let g=0;g<8;g++){if(g===GF)continue;const a=G.gpu(tA,g),pts=[[gA[0],gA[1]+.08,gA[2]],[gA[0],gA[1]+.09,tA[2]],[a[0],a[1]+.09,tA[2]],[a[0],a[1]+.08,a[2]]];R.flow(pts,{c:P.c4,a:e,r:.012,n:6,speed:.35})}
      lab([tA[0],tA[1]+.2,tA[2]-.65],H.node.n+' GPUs · '+(R.W<520?'':'NVLink 4 · ')+f(H.node.bw)+' GB/s each way',{dy:-14,b:1,c:P.c4,a:e});
      lab([tA[0]+.45,tA[1]+.15,tA[2]+.05],'NVSwitch',{al:'left',dx:10,fs:12,c:P.c4,a:e,wide:1})}
    // 3. rack: GPU of the top server to its NIC, up to the rack switch, down to the bottom server
    const sw=[RC[0],G.SWY+.07,RC[2]];
    if(k===2){const nA=G.nic(tA,GF),nB=G.nic(tB,GF),fz=RC[2]+G.RD/2+.05,gB=G.gpu(tB,GF);
      R.flow([G.top(gA),G.top(nA),[nA[0],nA[1]+.1,fz],[sw[0],sw[1],fz],[nB[0],nB[1]+.1,fz],G.top(nB),G.top(gB)],{c:P.c2,a:e,r:.03,n:12,speed:.6});
      lab([sw[0],sw[1]+.12,sw[2]],'rack switch · '+H.rack.sw+' switch',{dy:-14,fs:12,c:P.c2,a:e});
      lab([RC[0]+.5,1.0,RC[2]+.7],H.rack.n+' GPUs · '+f(H.rack.bw)+' GB/s per GPU',{al:'left',dx:12,b:1,c:P.c2,a:e})}
    // 4. pod: the cluster-switch plate above the racks, a message from the focus rack to a far rack of the same pod
    const pa=k===3?e:k===4?.7:0;
    if(pa>.01){R.glass([PX(FP)-3.6,YP,PZ(FP)-2.2],[7.2,0,0],[0,0,4.4],{c:P.c3,a:pa*.8,nu:6,nv:3});if(k===3)lab([PX(FP)+3.6,YP,PZ(FP)],'cluster switches (CTSW)',{al:'left',dx:10,fs:12,c:P.c3,a:e,wide:1})}
    if(k===3){const sf=[RF[0],G.SWY+.07,RF[2]];R.flow([sw,[sw[0],YP,sw[2]],[sf[0],YP,sf[2]],sf],{c:P.c3,a:e,r:.06,n:12,speed:1.3});
      lab([PX(FP),YP+.1,PZ(FP)-2.2],H.pod.n.toLocaleString('en-US')+' GPUs · '+f(H.pod.bw)+' GB/s'+(R.W<520?'':' · '+H.pod.sw+' switches'),{dy:-16,b:1,c:P.c3,a:e});
      lab([RC[0],2.4,RC[2]+.7],'192 racks, drawn as 12',{dy:22,fs:12,c:P.mute,a:e,wide:1})}
    // 5. cluster: the other pods' plates, the 1:7 top layer, a sparse stream to a pod at the back
    if(k===4){for(let p=0;p<8;p++){if(p===FP)continue;R.glass([PX(p)-3.6,YP,PZ(p)-2.2],[7.2,0,0],[0,0,4.4],{c:P.c3,a:e*.45,nu:6,nv:3})}
      R.glass([-16.2,YT,-5.2],[32.4,0,0],[0,0,10.4],{c:P.bad,a:e*.45,nu:8,nv:2});
      const a0=[PX(FP),YP,PZ(FP)],b0=[PX(OP),YP,PZ(OP)];
      R.flow([[RC[0],G.SWY+.07,RC[2]],[RC[0],YP,RC[2]],[a0[0],YT,a0[2]],[b0[0],YT,b0[2]],[b0[0],YP,b0[2]],[b0[0]+1,G.SWY+.07,b0[2]-1.3]],{c:P.bad,a:e,r:.12,n:7,speed:2.2});
      lab([0,YT+.1,-5.2],(R.W<520?'1:7 · ':'top layer (ATSW) · 1:7 · ')+H.cl.bw.toFixed(2)+' GB/s per GPU'+(R.W<520?'':' when a pod crosses'),{dy:-14,b:1,c:P.bad,a:e});
      lab([PX(0)-4,0,PZ(0)+2.5],(H.cl.n/H.pod.n)+' pods · '+H.cl.n.toLocaleString('en-US')+' GPUs'+(R.W<520?'':' · '+H.cl.sw+' switches'),{al:'left',dy:20,b:1,c:P.ink,a:e})}
  }
  const full={cam:[.42,.5],bounds:[[-17,0,-5.6],[17,5.4,5.6]]};
  const tx=RC[0],tz=RC[2]+OUT,gx=G.gpu([tx,G.SY[1],tz],GF);
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · the staircase on the Llama 3 cluster',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1700,hold:4800,draw,
    view:k=>k===0?{cam:[.5,.8],bounds:[[gx[0]-.42,1.3,gx[2]-.5],[gx[0]+.42,1.62,gx[2]+.3]]}
      :k===1?{cam:[.5,.75],bounds:[[tx-.62,1.3,tz-.75],[tx+.62,1.62,tz+.75]]}
      :k===2?{cam:[.5,.32],bounds:[[tx-1.3,0,RC[2]-.9],[tx+2.6,2.5,RC[2]+1.2]]}
      :k===3?{cam:[.42,.45],bounds:[[PX(FP)-4.2,0,PZ(FP)-2.4],[PX(FP)+5.2,YP+.4,PZ(FP)+2.4]]}:full,
    margin:w=>w<520?[18,10,14,10]:[26,20,22,20]});
  (window.CASTG=window.CASTG||{})['stg-hero']=st;
})();
