// ---- Scene, Fig. 4 (section 5): the storage tiers on one scalable unit of NVIDIA's DGX SuperPOD (32 nodes, two per rack), and a job's data moving through
// them. Numbers as section 5 states them (window.CA.tiers and the SuperPOD storage guidance): HBM 640 GB at 3.35 TB/s per GPU, DRAM 2 TB over PCIe at about
// 63 GB/s per GPU, local NVMe 30.72 TB (bandwidth not given), the file system 40 GB/s of read per 32 nodes (standard tier), write at least half of read,
// the object store as Llama 3's Tectonic (a different cluster: 240 PB, 2 TB/s sustained, 7 TB/s peak). Box sizes are not to scale. Steps: #sx-sto. ----
(function(){
  if(!document.getElementById('stg-sto')||!window.CAG||!window.CA)return;const {mix,lerp}=S3,G=CAG;
  const T=CA.tiers,num=(i,re)=>{const m=T[i][re[0]].match(re[1]);return m?m[1]:'?'};
  const D={hbm:num(0,['cap',/= ([\d,.]+ GB)/]),hbmBw:num(0,['bw',/^([\d.]+ TB\/s)/]),dram:num(1,['cap',/^([\d.]+ TB)/]),pcie:num(1,['bw',/about (\d+) GB/]),nvme:num(2,['cap',/= ([\d.]+ TB)/]),
    pfsStd:40,pfsEnh:125,nodes:32};
  D.perNode=D.pfsStd/D.nodes;D.write=D.pfsStd/2;
  window.CA_STO=D;
  const RX=i=>(i%8-3.5)*1.25,RZ=i=>i<8?2.3:.7,FR=3,ZP=-2.1,ZO=-5.4,OUT=2.2;
  function draw(R,k,e,st){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-7,7,-7,6,.5);
    const out=k===0?1:k===1?1-e:0,fc=[RX(FR),G.SY[0],RZ(FR)+OUT*out];
    // 16 racks of two nodes; the focus rack's lower node slides out for step 1
    const ra=k===0?.2:1;
    for(let i=0;i<16;i++){const c=[RX(i),0,RZ(i)];G.rack(R,c,{a:ra*.5,fa:.05,slab:false,sw:0,shadow:false});
      G.SY.forEach((y,s)=>{if(i===FR&&s===0)return;R.box([c[0],y,c[2]],[G.TW,.22,G.TD],{fill:mix(P.paper,P.ink,.1),a:ra,shadow:false,lw:.6})})}
    // the focus node: GPUs with their HBM at the back, DRAM in the middle, the NVMe drives at the front
    R.box(fc,[G.TW,G.TH,G.TD],{fill:mix(P.paper,P.ink,.07),shadow:false,lw:.7,dz:200});
    const gp=g=>[fc[0]+(g-3.5)*.1,fc[1]+G.TH,fc[2]-.4],dr=[fc[0],fc[1]+G.TH,fc[2]],nv=d=>[fc[0]+(d-3.5)*.1,fc[1]+G.TH,fc[2]+.42];
    for(let g=0;g<8;g++)R.box(gp(g),[.07,.12,.16],{fill:mix(P.paper,P.c6,.6),shadow:false,lw:.5});
    R.box(dr,[.7,.06,.2],{fill:mix(P.paper,P.c1,.45),shadow:false,lw:.5});
    for(let d=0;d<8;d++)R.box(nv(d),[.07,.05,.14],{fill:mix(P.paper,P.c3,.55),shadow:false,lw:.5});
    // the shared file system and the object store behind it
    const pa=k===0?.25:1,oa=k<=1?.25:1;
    for(let i=0;i<4;i++)for(let j=0;j<2;j++)R.box([(i-1.5)*1.1,j*.55,ZP],[.95,.5,1.1],{fill:mix(P.paper,P.c3,.4),a:pa,shadow:j===0&&pa>.5,lw:.7});
    R.box([0,0,ZO],[9,1.4,2.2],{fill:mix(P.paper,P.c5,.35),a:oa,shadow:oa>.5});
    if(k>0){lab([2.4,.8,ZP],'parallel file system',{al:'left',dx:10,a:Math.max(.5,pa),b:pa>.5});lab([4.5,1.1,ZO],'object store',{al:'left',dx:10,a:Math.max(.5,oa),b:oa>.5});lab([4.6,1.2,RZ(0)],'32 nodes',{al:'left',dx:10})}
    const pfsTop=[0,1.12,ZP],objTop=[0,1.45,ZO],rk=i=>[RX(i),G.RH,RZ(i)],fl=(a,b,h,o)=>R.flowArc(a,b,h,Object.assign({a:e},o));
    if(k===0){const up=(p,h)=>[p[0],p[1]+h,p[2]];
      for(let d=0;d<8;d+=2)R.flow([up(nv(d),.06),up(dr,.08),up(gp(d),.14)],{c:P.c3,a:e,r:.008,n:5,speed:.25});
      for(let g=1;g<8;g+=2)R.flow([up(dr,.08),up(gp(g),.14)],{c:P.c1,a:e,r:.008,n:4,speed:.25});
      lab(up(gp(0),.14),'HBM · '+D.hbm+' · '+D.hbmBw+' per GPU',{al:'right',dx:-10,b:1,c:P.c6,a:e,grp:'t'});
      lab(up(dr,.08),'DRAM · '+D.dram+' · about '+D.pcie+' GB/s per GPU',{al:'right',dx:-10-.0,b:1,c:P.c1,a:e,grp:'t'});
      lab(up(nv(0),.06),'NVMe · '+D.nvme+' · RAID 0',{al:'right',dx:-10,b:1,c:P.c3,a:e,grp:'t'})}
    if(k===1){for(let i=0;i<16;i++)fl(pfsTop,rk(i),1.2,{c:P.c3,r:.07,n:5,speed:.6});
      lab([0,2.6,ZP],(R.W<520?'':'40 GB/s for 32 nodes · ')+D.perNode.toFixed(2)+' GB/s each',{dy:-14,b:1,c:P.c3,a:e})}
    if(k===2){fl(objTop,pfsTop,1,{c:P.c5,r:.1,n:14,speed:2});lab([0,2.4,(ZO+ZP)/2],R.W<520?'2 TB/s sustained':'Tectonic (Llama 3) · 2 TB/s sustained · 7 TB/s peak',{dy:-14,b:1,c:P.c5,a:e})}
    if(k===3){fl(objTop,pfsTop,1,{c:P.c5,r:.08,n:10,speed:1.6});for(let i=0;i<16;i+=3)fl(pfsTop,rk(i),1.2,{c:P.c3,r:.05,n:4,speed:1});
      R.flow([[fc[0]+.3,fc[1]+.2,fc[2]+.42],[fc[0]+.3,fc[1]+.25,fc[2]-.4]],{c:P.acc,a:e,r:.03,n:8,speed:.5});
      lab([RX(FR),G.RH+.2,RZ(FR)],'stage once, read locally',{dy:-12,b:1,c:P.acc,a:e})}
    if(k===4){for(let i=0;i<16;i++)fl(rk(i),pfsTop,1.2,{c:P.bad,r:.06,n:9,speed:.35});lab([0,2.6,ZP],(R.W<520?'write ':'every GPU at once · write ')+D.write+' GB/s'+(R.W<520?'':' per 32 nodes'),{dy:-14,b:1,c:P.bad,a:e})}
    if(k===5){for(let i=0;i<16;i++){const c=rk(i);R.flow([[c[0],G.RH-.1,c[2]],[c[0],.9,c[2]]],{c:P.acc,a:e,r:.05,n:4,speed:1.6})}
      for(let i=0;i<16;i+=4)fl(rk(i),pfsTop,1.2,{c:P.c3,r:.05,n:3,speed:.35});lab([0,2.6,ZP],R.W<520?'write near, drain later':'write near, drain in the background',{dy:-14,b:1,c:P.acc,a:e})}
  }
  const full={cam:[.3,.9],bounds:[[-5.4,0,-6.6],[6.4,2.6,3.2]]};
  const st=S3.stage({id:'stg-sto',list:'sx-sto',fig:'Fig. 4 · the storage tiers of one scalable unit',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:[.45,.75],bounds:[[RX(FR)-.6,.5,RZ(FR)+OUT-.75],[RX(FR)+.6,.85,RZ(FR)+OUT+.75]]}:null,
    margin:w=>w<520?[18,10,14,10]:[26,110,20,20]});
  (window.CASTG=window.CASTG||{})['stg-sto']=st;
})();
