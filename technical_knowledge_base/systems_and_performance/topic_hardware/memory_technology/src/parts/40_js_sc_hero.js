// ---- Scene, Fig. 1 (the hero): one H100 server drawn from the die outward, one rung per step (renderer v2: few large objects per step,
// the camera gliding to each rung, flowing dots on every path data takes to the die). Numbers from window.MEMD: the on-die SRAM total
// (nums.h100_onchip_mb), HBM (chips h100: 80 GB, 3.35 TB/s), the PCIe Gen5 x16 host link (ladder: 128 GB/s both directions, so 64 each way),
// CXL (one DDR5-4800 channel: 4,800 MT/s x 8 bytes = 38.4 GB/s, derived, Pond), the 400 Gb/s NIC (ladder: 50 GB/s) and this laptop's SSD
// (meas.ssd.seq_GBs, measured). The ceiling on each rung is bandwidth / the BF16 weights of Llama 3.1 8B (models l8 wbytes), derived.
// Each stream's dot count is 4 x log10 of its bandwidth in GB/s, shared over its lanes. Positions, sizes and the DIMM count are illustrative.
(function(){
  if(!document.getElementById('stg-hero')||!window.MEMD)return;const {at,mix}=S3;
  const D=window.MEMD,h=D.chips.find(c=>c.id==='h100'),l8=D.models.find(m=>m.id==='l8'),lad=n=>D.ladder.find(r=>n.test(r.name)).gbs;
  const WB=l8.wbytes/1e9,f1=v=>v>=100||(v>=10&&Number.isInteger(v))?Math.round(v).toLocaleString('en-US'):v>=1?v.toFixed(1):v.toFixed(2);
  const RG=[{id:'sram',name:'SRAM on the die',cap:D.nums.h100_onchip_mb+' MB',gbs:null},
    {id:'hbm',name:'HBM3',cap:h.gb+' GB',gbs:h.tbs*1000},
    {id:'host',name:'host DRAM',cap:'terabytes',gbs:lad(/PCIe Gen5/)/2},
    {id:'cxl',name:'CXL memory',cap:'pooled',gbs:4800e6*8/1e9},
    {id:'node',name:'another node',cap:'its HBM',gbs:lad(/NIC/)},
    {id:'ssd',name:'NVMe SSD',cap:'terabytes',gbs:D.meas.ssd.seq_GBs}];
  RG.forEach(r=>{if(r.gbs){r.tps=r.gbs/WB;r.dots=Math.round(4*Math.log10(r.gbs))}});
  window.MT_HERO={rungs:RG.map(r=>({id:r.id,gbs:r.gbs,tps:r.tps,dots:r.dots})),wb:WB,sram:D.nums.h100_onchip_mb}; // checked by check/check_stages.mjs
  const SX=[-1.12,1.12],SZ=[-.8,0,.8],CPU=[5,0,0],CXL=[5,0,2.75],SSD=[5,0,-2.65],NODE=[0,0,-5.1];
  function pkg(R,c,sc,a,act){const P=R.P,[x,,z]=c;
    R.box([x,0,z],[3.2*sc,.06,2.6*sc],{fill:mix(P.paper,P.ink,.07),a,dz:100});
    R.box([x,.06,z],[1.4*sc,.12,1.6*sc],{fill:mix(P.paper,P.ink,.16),a});
    SX.forEach((sx,i)=>SZ.forEach((sz,j)=>{const used=!(i===1&&j===2),p=[x+sx*sc,.06,z+sz*sc];
      if(used)R.box(p,[.55*sc,.42*sc,.66*sc],{fill:mix(P.paper,P.c1,act?.55:.3),a});
      else R.quad([[p[0]-.27*sc,.07,p[2]-.33*sc],[p[0]+.27*sc,.07,p[2]-.33*sc],[p[0]+.27*sc,.07,p[2]+.33*sc],[p[0]-.27*sc,.07,p[2]+.33*sc]],{ec:P.mute,dash:[4,3],a:a*.9})}))}
  function draw(R,k,e){const P=R.P,last=k===6,on=i=>last||k===i?1:.22,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{}));
    R.grid(-3,8,-6.6,4,.5);
    const ea=i=>k===i?e:1;
    // the GPU package, always present; the SRAM plate on the die
    pkg(R,[0,0,0],1,1,k===1||last);
    R.glass([-.55,.2,-.65],[1.1,0,0],[0,0,1.3],{c:P.c3,a:on(0),nu:6,nv:6,th:.04});
    // host: the CPU and its DIMMs, the CXL expander, the SSD, another node
    R.box(CPU,[1.2,.16,1.2],{fill:mix(P.paper,P.c5,.45),a:on(2)*.9+.1});
    for(let j=0;j<8;j++)R.box([6.45,0,-1.05+j*.3],[1.0,.46,.07],{fill:mix(P.paper,P.c5,.6),a:on(2),shadow:false});
    R.box(CXL,[1.1,.3,.6],{fill:mix(P.paper,P.c4,.55),a:on(3)});
    R.box(SSD,[1.1,.07,.36],{fill:mix(P.paper,P.c2,.55),a:on(5)});
    pkg(R,NODE,.72,on(4),false);
    // the streams to the die (reads), dot count from the bandwidth
    const die=[0,.2,0],cpuT=[CPU[0]-.62,.18,0],flow=(pts,r,c,i,lanes)=>{if(!(last||k===i))return;R.flow(pts,{c,r:i===1?.065:.075,n:Math.max(2,Math.round(r.dots/lanes)),speed:1.1,a:ea(i)*(last?.85:1)})};
    // 1. HBM: three lanes per used stack, a few millimetres to the die edge
    SX.forEach((sx,i)=>SZ.forEach((sz,j)=>{if(i===1&&j===2)return;[-.18,0,.18].forEach(dz=>{const a0=[sx-Math.sign(sx)*.27,.44,sz+dz],b0=[Math.sign(sx)*.62,.2,sz*.9+dz],pts=[];for(let q=0;q<=10;q++)pts.push(R.arcPt(a0,b0,.12,q/10));flow(pts,RG[1],P.c1,1,15)})}));
    // 2. host DRAM over PCIe to the die
    const pcie=[cpuT,[3,.22,0],[1.2,.22,0],[.72,.2,0]];
    R.line(pcie,{c:P.line,w:2,a:.6});flow(pcie.concat(),RG[2],P.c5,2,1);
    // 3. CXL: through the host, then over PCIe
    const cxl=[[CXL[0],.2,CXL[2]-.32],[CPU[0],.2,.62]].concat(pcie.slice(1));R.line(cxl.slice(0,2),{c:P.line,w:2,a:.6});flow(cxl,RG[3],P.c4,3,1);
    // 4. another node over the NIC
    const nic=[[0,.2,NODE[2]+.6],[0,.2,-.85]];R.line(nic,{c:P.line,w:2,a:.6});flow(nic,RG[4],P.c6,4,1);
    // 5. the SSD, through the host
    const ssd=[[SSD[0],.1,SSD[2]+.2],[CPU[0],.2,-.62]].concat(pcie.slice(1));R.line(ssd.slice(0,2),{c:P.line,w:2,a:.6});flow(ssd,RG[5],P.c2,5,1);
    // labels: each step names its rung; the last step gives every ceiling
    const tl=r=>f1(r.tps)+' tokens/s';
    if(k===0){lab([0,.25,-.65],'SRAM · '+RG[0].cap,{dy:-16,b:1,c:P.c3,a:e});lab([0,.12,.8],'Llama 3.1 8B needs 16.06 GB: does not fit',{dy:22,fs:12,c:P.mute,a:e})}
    if(k===1){lab([-1.12,.45,-.8],'HBM3 · '+RG[1].cap+' · '+f1(RG[1].gbs)+' GB/s',{dy:-16,b:1,c:P.c1,a:e});lab([0,.12,1.3],'ceiling '+tl(RG[1]),{dy:18,b:1,a:e});lab([1.12,.07,.8],'unused site',{dy:-12,fs:12,c:P.mute,a:e})}
    if(k===2){lab([6.45,.46,-1.05],'host DRAM · '+RG[2].cap,{dy:-14,b:1,c:P.c5,a:e});lab([2.6,.22,0],'PCIe · '+f1(RG[2].gbs)+' GB/s',{dy:-14,fs:12,c:P.c5,a:e});lab([CPU[0],.16,.6],'CPU',{dy:16,fs:12,a:e});lab([2.6,.1,0],'ceiling '+tl(RG[2]),{dy:20,b:1,a:e})}
    if(k===3){lab([CXL[0],.3,CXL[2]],'CXL · '+f1(RG[3].gbs)+' GB/s · +70 ns',{dy:-16,b:1,c:P.c4,a:e});lab([CXL[0],0,CXL[2]+.3],'ceiling '+tl(RG[3]),{dy:16,b:1,a:e})}
    if(k===4){lab([0,.3,NODE[2]],'another node · '+f1(RG[4].gbs)+' GB/s',{dy:-22,b:1,c:P.c6,a:e});lab([0,.2,-2.6],'400 Gb/s NIC',{al:'left',dx:10,fs:12,c:P.c6,a:e});lab([0,.2,-3.4],'ceiling '+tl(RG[4]),{al:'left',dx:10,b:1,a:e})}
    if(k===5){lab([SSD[0],.07,SSD[2]],'NVMe SSD · '+f1(RG[5].gbs)+' GB/s measured',{dy:-16,b:1,c:P.c2,a:e});lab([SSD[0],0,SSD[2]+.2],'ceiling '+tl(RG[5]),{dy:18,b:1,a:e})}
    if(last){const g={grp:'all',fs:12,a:e};
      lab([-1.6,.45,-.8],'HBM '+tl(RG[1]),Object.assign({b:1,c:P.c1,dy:-14},g));lab([6.95,.46,-1.05],'host '+tl(RG[2]),Object.assign({c:P.c5,dy:-14},g));
      lab([CXL[0],.3,CXL[2]],'CXL '+tl(RG[3]),Object.assign({c:P.c4,dy:-14},g));lab([0,.3,NODE[2]],'node '+tl(RG[4]),Object.assign({c:P.c6,dy:-18},g));lab([SSD[0],.07,SSD[2]],'SSD '+tl(RG[5]),Object.assign({c:P.c2,dy:-14},g))}
  }
  const full={cam:[.42,.82],bounds:[[-2,0,-6.2],[7.3,.7,3.4]]};
  const views=[{cam:[.3,.9],bounds:[[-1.9,0,-1.5],[1.9,.5,1.6]]},{cam:[.36,.82],bounds:[[-2,0,-1.6],[2,.6,1.8]]},{cam:[.36,.8],bounds:[[-1.4,0,-1.6],[7.3,.6,1.6]]},
    {cam:[.42,.8],bounds:[[-1.4,0,-1.4],[7.3,.6,3.4]]},{cam:[.3,.8],bounds:[[-2.2,0,-6.2],[2.2,.6,1.6]]},{cam:[.42,.8],bounds:[[-1.4,0,-3.2],[7.3,.6,1.4]]},full];
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one H100 server, from the die outward',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>views[k]||full,margin:w=>w<520?[16,10,16,10]:[24,24,24,24]});
  (window.MTSTG=window.MTSTG||{})['stg-hero']=st;
})();
