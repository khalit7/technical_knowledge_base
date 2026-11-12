// ---- Scene, Fig. 2 (section 6): NCCL builds a communicator on the 2 x 2 job, in the order of the NCCL v2.30.7-1 and torch 2.14.1 source (renderer v2) ----
// Illustrative, not a run: nothing on this page has a GPU. The order and names are the eight steps of #sx-nc, each linked to its source line;
// node, GPU, NIC and network positions are schematic.
(function(){
  if(!document.getElementById('stg-nc'))return;const {at,off,lerp,mix}=S3;
  const HL=[0,0,3.55],NX=[-2.5,2.5],ZF=-2.3,ZD=2.75,STP=[0,2.3,-.6];
  const RK=r=>{const k=r>>1,j=r&1;return [NX[k]+(j?.9:-.9),.2,0]},NIC=k=>[NX[k],.2,1.25];
  const ring=[0,1,3,2]; // a ring that crosses each node boundary once: 0 to 1 inside node 0, 1 to 3 across, 3 to 2 inside node 1, 2 to 0 across
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6,6,-3.4,3.4,.5);
    const top=r=>{const p=RK(r);return [p[0],.62,p[2]]};
    // the two networks: the front-end (TCP, bootstrap) behind, the data network (InfiniBand or RoCE) in front
    const fa=k===3||k===4?1:.35;R.glass([-5,.02,ZF-.4],[10,0,0],[0,0,.8],{c:P.c5,a:fa,nu:20,nv:1});
    lab([-4.9,.05,ZF],'front-end network (TCP)',{al:'left',dx:4,c:P.c5,b:k===3||k===4,a:Math.max(.55,fa)});
    const da=k<6?0:k===6?e:1;R.glass([-5,.02,ZD-.4],[10,0,0],[0,0,.8],{c:P.c4,a:da,nu:20,nv:1});
    if(da>0)lab([4.9,.05,ZD],'data network (IB / RoCE)',{al:'right',dx:-4,c:P.c4,b:1,a:da});
    // nodes, NICs, GPUs (one rank each)
    [0,1].forEach(n=>{R.box([NX[n],0,.3],[3.6,.2,2.6],{fill:mix(P.paper,P.ink,.05),dz:200});lab([NX[n]-1.8,0,1.6],'node '+n,{al:'left',dy:14,b:1});
      const ni=k===6||k===5?1:.35;R.box(NIC(n),[.9,.28,.45],{fill:mix(P.paper,P.c4,.45),a:ni});lab([NIC(n)[0]+.5,.15,NIC(n)[2]],'NIC',{al:'left',dx:4,c:P.c4,a:Math.max(.5,ni)})});
    for(let r=0;r<4;r++){const p=RK(r),hot=(k===1&&r===0)||k===2||k===7;
      R.box(p,[1.25,.42,.9],{fill:k===0?mix(P.paper,P.ink,.04):hot?mix(P.paper,P.acc,.25):P.paper});
      lab([p[0],.62,p[2]],'rank '+r,{dy:-10,b:1,a:k===0?.6:1})}
    // 1. the store (PyTorch's, from the rendezvous)
    const sa=k===2?1:.3;R.box(STP,[1.6,.4,.7],{fill:mix(P.paper,P.acc,.45),a:sa});lab([STP[0],STP[1]+.4,STP[2]],'c10d store',{dy:-10,b:1,c:P.acc,a:Math.max(.45,sa)});
    if(k===0)lab(HL,'init_process_group returned; no communicator yet',{b:1,c:P.mute,wide:1});
    // 2. rank 0 makes the unique id: a random magic plus the bootstrap root's address
    if(k>=1&&k<=2){const g=k===1?e:1;R.glow([RK(0)[0],.9,0],.5,{c:P.acc,a:g});R.ball([RK(0)[0],.9,0],.12,{c:P.acc,a:g});
      if(k===1)lab([RK(0)[0],1.05,0],'unique id = magic + root address',{dy:-14,b:1,c:P.acc,a:e,wide:1})}
    // 3. the id travels through the store: rank 0 sets key "0", every rank reads it
    if(k===2){R.flowArc(top(0),[STP[0],STP[1]+.2,STP[2]],.5,{c:P.acc,a:e,r:.07,n:6,speed:1.4});
      [1,2,3].forEach(r=>R.flowArc([STP[0],STP[1]+.2,STP[2]],top(r),.5,{c:P.acc,a:e*.9,r:.06,n:5,speed:1.3}));
      lab([STP[0],STP[1]+.6,STP[2]],'key "0"',{dy:-14,b:1,c:P.acc,a:e})}
    // 4 and 5. the bootstrap ring over the front-end, then AllGather1 around it
    if(k===3||k===4){const c=k===3?P.c5:P.c2;
      for(let r=0;r<4;r++){const p=RK(r);R.line([[p[0],.2,p[2]-.45],[p[0],.04,ZF]],{c:P.c5,w:1.6,a:e})}
      ring.forEach((r,i)=>{const s=ring[(i+1)%4],a=RK(r),b=RK(s);R.flow([[a[0],.25,a[2]-.45],[a[0],.06,ZF],[b[0],.06,ZF],[b[0],.25,b[2]-.45]],{c,a:e,r:.06,n:7,speed:1.5})});
      if(k===3)lab(HL,'ring over TCP: each rank to the root, then to its next neighbour',{b:1,c:P.c5,a:e,wide:1});
      if(k===4){for(let r=0;r<4;r++){const p=RK(r);for(let j=0;j<4;j++)R.box([p[0]-.36+j*.24,.62,p[2]+.2],[.16,.12+.1*at(k,e,4),.16],{fill:mix(P.paper,P.c2,j===r?.75:.4),shadow:false})}
        lab(HL,'AllGather1: host hashes, GPU bus ids, who shares a machine',{b:1,c:P.c2,a:e,wide:1})}}
    // 6. topology: inside each node the GPUs, NVLink or PCIe and the NIC; one plan of rings and trees
    if(k===5){[0,1].forEach(n=>{const a=RK(2*n),b=RK(2*n+1);R.line([[a[0]+.62,.32,0],[b[0]-.62,.32,0]],{c:P.c3,w:3,a:e});
        R.line([[NX[n],.32,0],[NX[n],.25,NIC(n)[2]-.22]],{c:P.c3,w:2,a:e});lab([NX[n]+.3,0,1.6],'NVLink / PCIe',{al:'left',dy:14,fs:12,c:P.c3,a:e})});
      ring.forEach((r,i)=>{const s=ring[(i+1)%4];R.arc([RK(r)[0],.62,0],[RK(s)[0],.62,0],r>>1===s>>1?.4:1.1,{c:P.acc,w:2.2,t:e})});
      lab(HL,'graph of the machine, then rings and trees',{b:1,c:P.acc,a:e,wide:1})}
    // 7. the network plugin: verbs if any RDMA device is found, else sockets
    if(k===6)[0,1].forEach(n=>{R.line([[NX[n],.2,NIC(n)[2]+.22],[NX[n],.04,ZD]],{c:P.c4,w:2,a:e});lab([NX[n],.6,NIC(n)[2]],n?'else sockets, silently':'verbs: "Using network IB"',{dy:-12,b:1,c:P.c4,a:e,wide:1})});
    // 8. peers connect when the first collective needs them: data moves over the data network
    if(k===7){ring.forEach((r,i)=>{const s=ring[(i+1)%4],a=RK(r),b=RK(s);
        if(r>>1===s>>1)R.flowArc([a[0],.45,a[2]],[b[0],.45,b[2]],.35,{c:P.c4,a:e,r:.065,n:5,speed:1.3});
        else R.flow([[a[0],.25,a[2]+.45],[NX[r>>1],.04,ZD],[NX[s>>1],.04,ZD],[b[0],.25,b[2]+.45]],{c:P.c4,a:e,r:.07,n:9,speed:1.6})});
      lab(HL,'NCCL_RUNTIME_CONNECT=1: the data network is tried only now',{b:1,c:P.c4,a:e,wide:1})}
  }
  const full={cam:[.08,.95],bounds:[[-5,0,-2.8],[5,1.2,3.6]]};
  const st=S3.stage({id:'stg-nc',list:'sx-nc',fig:'Fig. 2 · NCCL start-up on 2 × 2 GPUs (from source, illustrative)',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1400,hold:5000,draw,
    view:k=>k===1?{cam:[.15,.85],bounds:[[-4.6,0,-1.4],[.6,1.4,3.6]]}:k===5?{cam:[.1,.85],bounds:[[-5,0,-1.2],[5,1.2,3.6]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.LDSTG=window.LDSTG||{})['stg-nc']=st;
})();
