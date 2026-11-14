// ---- Scene, Fig. 2 (section 3): one 16-GPU job's life on a cluster laid out as NVIDIA's DGX SuperPOD (schematic): a login node, the controller and a
// registry on the front-end, two 8-GPU nodes (GPUs, NVSwitch plate, 8 compute NICs, local NVMe, BMC), a compute leaf, the storage servers on the storage
// fabric, every BMC on the out-of-band network. Which machines and networks each step lights comes from the step list itself (#sx-job, data-on and
// data-net), so the drawing and the text cannot disagree. Positions are illustrative. ----
(function(){
  if(!document.getElementById('stg-job')||!window.CAG)return;const {mix,lerp}=S3;
  const LI=[...document.querySelectorAll('#sx-job li')].map(li=>({on:(li.dataset.on||'').split(' ').filter(Boolean),net:(li.dataset.net||'').split(' ').filter(Boolean)}));
  const NX={A:-3.2,B:3.2},ZF=-2.5,ZS=-1.75,ZO=1.85,ZB=-3.4,ZL=2.75,XS=9.2;
  const back={you:[-7,'you'],login:[-4.3,'login node'],ctl:[-1.2,'controller (head)'],reg:[2.2,'registry']};
  const gpu=(n,g)=>[NX[n]+((g%4)-1.5)*.85,.25,g<4?-.5:.2],nic=(n,g)=>[NX[n]+(g-3.5)*.48,.25,.85];
  const nvme=n=>[NX[n]-1.45,.25,-.95],bmc=n=>[NX[n]+1.75,.25,-.95];
  const up=(p,h)=>[p[0],p[1]+(h||.2),p[2]];
  function draw(R,k,e,st){const P=R.P,S=LI[k],on=x=>S.on.includes(x),net=x=>S.net.includes(x),lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));
    const C={inb:P.c1,cmp:P.c2,sto:P.c3,oob:P.c5,nvl:P.c4};
    R.grid(-9,11,-5,4,.5);
    const A=x=>on(x)?1:.28;
    // the networks: always drawn faintly, in full colour when the step uses them
    const wire=(pts,n,w)=>R.line(pts,{c:net(n)?C[n]:mix(P.paper,C[n],.45),w:net(n)?(w||3):1.4,a:net(n)?1:.6,dz:50});
    wire([[-7.6,.04,ZF],[3.2,.04,ZF]],'inb');Object.values(back).forEach(([x])=>wire([[x,.04,ZB+.5],[x,.04,ZF]],'inb'));['A','B'].forEach(n=>wire([[NX[n],.04,ZF],[NX[n],.04,-1.2]],'inb'));
    wire([[-5.2,.04,ZS],[XS-1,.04,ZS]],'sto');['A','B'].forEach(n=>wire([nvme(n),[nvme(n)[0],.04,ZS]],'sto'));
    wire([[-1.2,.04,ZB],[-8.3,.04,ZB],[-8.3,.04,ZO],[6,.04,ZO]],'oob',2.4);['A','B'].forEach(n=>wire([[bmc(n)[0],.04,ZO],[bmc(n)[0]+.45,.04,ZO-.6],[bmc(n)[0]+.45,.04,-.95],bmc(n)],'oob',2.4));
    ['A','B'].forEach(n=>{for(let g=0;g<8;g++)wire([up(nic(n,g),.08),[lerp(nic(n,g)[0],0,.75),.4,ZL-.45]],'cmp',2)});
    // the back row: you, the login node, the controller, the registry
    Object.entries(back).forEach(([key,[x,nm]])=>{const a=A(key);R.box([x,0,ZB],key==='you'?[.7,.9,.7]:[1.9,.55,1.1],{fill:key==='you'?mix(P.paper,P.ink,.15):key==='reg'?mix(P.paper,P.ink,.08):mix(P.paper,P.c1,.35),a,shadow:a>.5});
      lab([x,key==='you'?.9:.55,ZB],nm,{dy:-12,a:Math.max(.5,a),b:a>.5,wide:1})});
    // the two nodes
    ['A','B'].forEach(n=>{const a=A(n),lit=x=>on(n)&&on(x);
      R.box([NX[n],0,-.05],[4.5,.25,2.5],{fill:mix(P.paper,P.ink,.06),a,shadow:a>.5,dz:200});
      for(let g=0;g<8;g++)R.box(gpu(n,g),[.6,.32,.5],{fill:lit('gpu')||(k===6&&on(n))?P.acc:mix(P.paper,P.acc,.3),a,shadow:false});
      R.glass([NX[n]-1.6,.62,-.2],[3.2,0,0],[0,0,.38],{c:P.c4,a:a*(net('nvl')?1:.4),nu:4,nv:1,th:.03});
      for(let g=0;g<8;g++)R.box(nic(n,g),[.3,.14,.24],{fill:lit('nic')?C.cmp:mix(P.paper,P.c2,.45),a,shadow:false});
      R.box(nvme(n),[1.1,.24,.4],{fill:lit('nvme')?C.sto:mix(P.paper,P.c3,.35),a,shadow:false});
      R.box(bmc(n),[.5,.2,.4],{fill:lit('bmc')?C.oob:mix(P.paper,P.c5,.4),a,shadow:false});
      lab([NX[n]-2.25,.3,.6],'node '+n,{al:'right',dx:-8,a:Math.max(.5,a),b:a>.5});
      if(lit('bmc')&&k!==8)lab(up(bmc(n),.2),'BMC',{fs:12,dy:-10,c:P.c5,wide:1});});
    // the compute leaf and the storage servers
    {const a=A('leaf');R.box([0,0,ZL],[2.6,.45,.9],{fill:mix(P.paper,P.c2,.55),a,shadow:a>.5});lab([1.3,.3,ZL],R.W<520?'leaf':'leaf switch (compute)',{al:'left',dx:10,a:Math.max(.5,a),b:a>.5})}
    {const a=A('sto');for(let i=0;i<3;i++)R.box([XS,i*.42,ZS],[1.6,.38,1.3],{fill:mix(P.paper,P.c3,.4),a,shadow:i===0&&a>.5});lab([XS,1.26,ZS],R.W<520?'storage':'storage servers',{dy:-12,a:Math.max(.5,a),b:a>.5})}
    // network names along their wires (wide screens)
    lab([-7.6,.04,ZF],'front-end',{al:'right',dx:-6,c:C.inb,a:net('inb')?1:.55,grp:'net'});lab([-5.2,.04,ZS],'storage fabric',{al:'right',dx:-6,c:C.sto,a:net('sto')?1:.55,grp:'net'});
    lab([-8.3,.04,ZO],'out-of-band',{al:'right',dx:-6,c:C.oob,a:net('oob')?1:.55,grp:'net'});
    // what moves at each step
    const fl=(pts,c,o)=>R.flow(pts,Object.assign({c,a:e,r:.09,speed:2.2},o||{}));
    const via=(x,z)=>[x,.12,z],bk=key=>[back[key][0],.3,ZB],nd=n=>[NX[n],.3,-1.2];
    if(k===1){fl([bk('you'),via(back.you[0],ZF),via(back.login[0],ZF),bk('login')],C.inb);fl([bk('login'),via(back.login[0],ZF),via(back.ctl[0],ZF),bk('ctl')],C.inb);lab([back.login[0]+.9,.1,ZF],'sbatch',{dy:16,b:1,c:C.inb,a:e})}
    if(k===2)['A','B'].forEach(n=>fl([bk('ctl'),via(back.ctl[0],ZF),via(NX[n],ZF),nd(n)],C.inb));
    if(k===3){['A','B'].forEach(n=>{fl([bk('reg'),via(back.reg[0],ZF),via(NX[n],ZF),nd(n)],C.inb);fl([[XS,.3,ZS],via(nvme(n)[0],ZS),up(nvme(n))],C.sto)});lab([back.reg[0]+.6,.1,ZF],'image',{dy:16,b:1,c:C.inb,a:e})}
    if(k===4)['A','B'].forEach(n=>lab([NX[n],.6,-.15],'8 ranks',{dy:-16,b:1,c:P.acc,a:e}));
    if(k===5){fl([nd('A'),via(NX.A,ZF),via(NX.B,ZF),nd('B')],C.inb);fl([nd('B'),via(NX.B,ZF),via(NX.A,ZF),nd('A')],C.inb,{speed:1.6});lab([0,.2,ZF],'TCP: exchange addresses',{dy:-14,b:1,c:C.inb,a:e})}
    if(k===6){['A','B'].forEach(n=>{for(let g=0;g<4;g++)fl([up(gpu(n,g),.35),[gpu(n,g)[0],.68,-.01],[gpu(n,g+4)[0],.68,-.01],up(gpu(n,g+4),.35)],C.nvl,{r:.06,n:4,speed:1.2})});
      [0,3,4,7].forEach(g=>fl([up(gpu('A',g),.35),up(nic('A',g)),[lerp(nic('A',g)[0],0,.75),.45,ZL-.45],[lerp(nic('B',g)[0],0,.75),.45,ZL-.45],up(nic('B',g)),up(gpu('B',g),.35)],C.cmp,{r:.08}));
      lab([0,.6,ZL-.4],'RDMA all-reduce',{dy:-14,b:1,c:C.cmp,a:e})}
    if(k===7)['A','B'].forEach(n=>{fl([up(gpu(n,1),.35),up(nvme(n))],C.sto,{r:.07,speed:1});fl([up(gpu(n,2),.35),[nvme(n)[0]+.4,.12,ZS],[XS-1,.12,ZS],[XS,.4,ZS]],C.sto,{n:14})});
    if(k===7)lab([XS-1.5,.4,ZS+.7],'checkpoint burst',{dy:12,b:1,c:C.sto,a:e});
    if(k===8){['A','B'].forEach(n=>fl([nd(n),via(NX[n],ZF),via(back.ctl[0],ZF),bk('ctl')],C.inb,{n:5,speed:1.4}));
      fl([bk('ctl'),[-8.3,.12,ZB],[-8.3,.12,ZO],[bmc('B')[0]+.45,.12,ZO],[bmc('B')[0]+.45,.12,-.95],up(bmc('B'))],C.oob,{r:.08});lab(up(bmc('B'),.2),'BMC: power-cycle',{al:'left',dx:10,dy:-10,b:1,c:C.oob,a:e})}
  }
  const PHT=.7,PHP=1.0;
  const st=S3.stage({id:'stg-job',list:'sx-job',fig:'Fig. 2 · one job, four networks',cam:[.22,.86],bounds:[[-8.6,0,-4],[10.2,1.4,3.3]],aspect:.46,dur:1400,hold:5200,draw,
    view:k=>{const v=k===1||k===2?{cam:[.25,.8],bounds:[[-8.4,0,-4],[4,1,-.4]]}:k===4||k===6?{cam:[.25,.8],bounds:[[-6.2,0,-1.6],[7.4,1,3.3]]}:null;
      return innerWidth<520?{cam:[(v?v.cam[0]:.22)+PHT,PHP],bounds:v?v.bounds:[[-8.6,0,-4],[10.2,1.4,3.3]]}:v},
    margin:w=>w<520?[16,10,16,10]:[22,18,22,100]});
  (window.CASTG=window.CASTG||{})['stg-job']=st;
})();
