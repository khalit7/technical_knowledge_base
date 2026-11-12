// ---- Scene, Fig. 1 (the idea): one TPU chip as your program meets it (renderer v2: glass plates, flowing dots, camera per step) ----
// HBM at the back holds every array; VMEM in the middle is the compiler-filled scratch; in front, the TensorCore's three units:
// the scalar unit with SMEM, the VPU with one 8 x 128 register (drawn as 8 x 16), and the MXUs (4 of side 128 or 2 of side 256).
// Every number is the chosen generation's row of window.TQ.gens (gens.json): MXUs, MXU side, VMEM, HBM, bandwidth, bf16 peak, links,
// link and PCIe rates, DCN, chips per host, TensorCores. SMEM 1 MiB is tpu_info.py's. Schematic, not to scale. Explained by #sx-chip.
// shared by the page's scenes: on a phone (canvas under 520 px) every view looks down more steeply, so a wide scene's depth fills the card
window.TQPH=v=>innerWidth<520?{cam:[v.cam[0],Math.max(v.cam[1],.95)],bounds:v.bounds}:v;
(function(){
  if(!document.getElementById('stg-chip')||!window.TQU)return;const {at,mix}=S3,U=window.TQU,G=U.G,gl=U.label;
  let gen='v5e';
  const ZH=-2.7,ZV=-.75,ZC=1.35,XS=-3.55,XV=-1.85;
  const gbs=b=>U.sig(b/1e9,3)+' GB/s';
  // the MXUs' positions for a generation: 4 of side .8 (128) or 2 of side 1.15 (256)
  function mxus(g){const s=g.mxu===256?1.15:.8,gap=.18,n=g.mxus,x0=.25+s/2;return Array.from({length:n},(_,i)=>({x:x0+i*(s+gap),s}))}
  window.TQ_SC=window.TQ_SC||{};
  function draw(R,k,e){const P=R.P,g=G[gen],M=mxus(g),lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));
    R.grid(-5,5,-4.8,3,.5);
    const cH=P.c5,cV=P.c6,cM=P.acc,cS=P.c4;
    // what each step is about at full strength; the rest recedes
    const f={hbm:[1,1,.35,.3,.6,.45][k],vmem:[1,1,1,1,.6,.45][k],mxu:[1,.3,1,.3,.6,.45][k],vpu:[1,.3,.3,1,.6,.45][k],sc:[1,.3,.3,.3,1,.45][k]};
    // HBM: a gold glass floor with the arrays on it
    R.glass([-4.5,.002,ZH-.75],[9,0,0],[0,0,1.5],{c:cH,a:.5*f.hbm+.15,nu:1,nv:1,th:.02,dz:60});
    R.box([0,0,ZH],[8.4,.16,1.1],{fill:mix(P.paper,cH,.55),a:f.hbm,lw:.6});
    lab([-4.5,0,ZH],'HBM '+g.hbm_txt,{al:'right',dx:-8,b:1,c:cH,a:Math.max(.5,f.hbm),grp:'side'});
    if(k===0)lab([0,.16,ZH-.55],'weights, optimizer state, activations, KV cache',{dy:-14,c:P.mute,a:e,wide:1});
    // VMEM: a teal plate
    R.glass([-4.1,.002,ZV-.55],[8.2,0,0],[0,0,1.1],{c:cV,a:.75*f.vmem,nu:1,nv:1,th:.02,dz:60});
    R.box([0,0,ZV],[7.8,.08,.9],{fill:mix(P.paper,cV,.35),a:f.vmem,fa:.8,lw:.6,shadow:false});
    lab([-4.1,0,ZV],'VMEM '+U.fmt(g.vmem)+' MiB',{al:'right',dx:-8,b:1,c:cV,a:Math.max(.5,f.vmem),grp:'side'});
    // the TensorCore: a dashed outline on the floor around its three units
    const tcA=k===5?.45:.8;R.quad([[-4.25,0,ZC-.85],[4.25,0,ZC-.85],[4.25,0,ZC+.85],[-4.25,0,ZC+.85]],{fill:mix(P.paper,P.c1,.06),fa:.5,a:tcA,dash:[5,4],lw:1});
    lab([-4.25,0,ZC+.85],'TensorCore'+(g.tc===2?(gen==='7x'?' × 2 = 2 JAX devices':' × 2 = 1 JAX device (megacore)'):' = 1 JAX device'),{al:'left',dy:14,b:1,c:P.ink,a:tcA,wide:1});
    // scalar unit with SMEM
    R.box([XS,0,ZC],[.95,.5,.95],{fill:mix(P.paper,cS,.3),a:f.sc});R.box([XS,.5,ZC],[.6,.08,.6],{fill:mix(P.paper,cS,.6),a:f.sc,shadow:false});
    lab([XS,.6,ZC],'scalar unit',{dy:-14,b:1,c:cS,a:Math.max(.5,f.sc),grp:'top'});
    if(k===4)lab([XS,0,ZC+.5],'SMEM 1 MiB',{dy:14,c:cS,a:e});
    // VPU with one vector register on top: 8 sublanes x 128 lanes, drawn as 8 x 16
    R.box([XV,0,ZC],[1.7,.32,1.05],{fill:mix(P.paper,cV,.22),a:f.vpu});
    for(let r=0;r<8;r++)for(let c=0;c<16;c++)R.box([XV-.72+c*.096+.04,.32,ZC-.36+r*.096+.04],[.08,.03,.08],{fill:mix(P.paper,cV,.75),a:f.vpu,shadow:false,lw:.4,ea:.4});
    lab([XV,.4,ZC],'VPU',{dy:-14,b:1,c:cV,a:Math.max(.5,f.vpu),grp:'top'});
    // MXUs: a base and a gridded glass plate (one cell per 32 x 32 multiply-adds)
    M.forEach((m,i)=>{R.box([m.x,0,ZC],[m.s,.26,m.s],{fill:mix(P.paper,cM,.2),a:f.mxu});
      R.glass([m.x-m.s/2,.27,ZC-m.s/2],[m.s,0,0],[0,0,m.s],{c:cM,a:f.mxu,nu:g.mxu/32,nv:g.mxu/32,th:.02})});
    const mxC=(M[0].x+M[M.length-1].x)/2;
    lab([mxC,.3,ZC-.45],M.length+' MXUs, '+g.mxu+' × '+g.mxu,{dy:-16,b:1,c:cM,a:Math.max(.5,f.mxu),grp:'top'});
    // flows: where the data goes in each step
    const hv=(x,c,a,o)=>R.flowArc([x,.16,ZH+.55],[x,.09,ZV-.4],.7,Object.assign({c,a,r:.09,speed:1.3},o||{}));
    if(k===1){[-3,-1.5,0,1.5,3].forEach(x=>hv(x,cM,1));
      lab([4.2,.1,(ZH+ZV)/2],gbs(g.bw),{al:'left',dx:6,b:1,c:cM,fs:13,a:e});lab([4.2,.1,(ZH+ZV)/2],'HBM to VMEM, by DMA',{al:'left',dx:6,dy:17,c:P.mute,a:e,wide:1})}
    if(k===2){M.forEach(m=>{R.flowArc([m.x-.15,.09,ZV+.4],[m.x-.1,.3,ZC-m.s/2],.45,{c:cM,r:.08,speed:1.2});R.flowArc([m.x+.2,.09,ZV+.4],[m.x+.15,.3,ZC-m.s/2],.45,{c:P.c2,r:.06,speed:1.5,n:5})});
      lab([mxC,.3,ZC+.5],'bf16 in, float32 sum',{dy:20,c:P.mute,a:e});
      lab([mxC,.3,ZC-.45],U.fmt(g.bf16/1e12)+' TFLOP/s at peak',{dy:-34,b:1,c:cM,fs:13,a:e})}
    if(k===3){R.flowArc([XV-.3,.09,ZV+.4],[XV-.3,.34,ZC-.4],.4,{c:cV,r:.08,speed:1.2});R.flowArc([XV+.4,.34,ZC-.4],[XV+.4,.09,ZV+.4],.4,{c:cV,r:.06,speed:1.2,n:4});
      lab([XV,.32,ZC+.5],'8 × 128 float32 register',{dy:18,c:cV,b:1,a:e})}
    if(k===4){// the scalar unit issues the DMA and the vector and matrix instructions
      R.flowArc([XS,.5,ZC-.4],[-2.6,.1,ZH+.5],.9,{c:cS,r:.05,speed:1.6,n:7});R.flowArc([XS+.4,.3,ZC],[XV-.8,.32,ZC],.3,{c:cS,r:.05,speed:1.6,n:4});
      R.flowArc([XS,.5,ZC+.3],[M[0].x,.3,ZC+.3],.8,{c:cS,r:.05,speed:1.6,n:9});
      lab([XS,.6,ZC],'control flow, addresses, DMAs',{dy:-32,c:cS,b:1,a:e,wide:1})}
    if(k===5){// beyond the chip: the host over PCIe, ICI links to neighbouring chips, DCN to other slices
      R.box([-3,0,-4.25],[2.2,.6,.8],{fill:mix(P.paper,P.mute,.15),a:e});
      lab([-3,.6,-4.25],'host CPU: one JAX process, '+g.host_chips+' chips',{dy:-12,b:1,a:e});
      R.flowArc([-3,.3,-3.85],[-3,.17,ZH-.4],.4,{c:P.mute,r:.07,a:e,speed:1});lab([-1.8,.3,-3.65],'PCIe '+gbs(g.pcie),{al:'left',dx:4,c:P.mute,a:e});
      const ici=[[4.5,ZV,5.4,ZV],[-4.6,ZV,-5.4,ZV],[4.5,ZC,5.4,ZC],[-4.6,ZC-.4,-5.4,ZC-.4]];
      ici.forEach(([x0,z0,x1,z1])=>R.flow([[x0,.1,z0],[x1,.1,z1]],{c:P.c3,r:.07,a:e,speed:.9}));
      lab([5.4,.1,ZV],'ICI: '+g.links+' links × '+gbs(g.link1),{al:'right',dy:-14,b:1,c:P.c3,a:e});
      lab([0,0,2.6],'DCN '+gbs(g.dcn)+' per chip, to other slices',{dy:10,c:P.mute,a:e})}
    window.TQ_SC.chip={gen,step:k,mxus:M.length,side:g.mxu};
  }
  const full={cam:[.16,.72],bounds:[[-4.6,0,-3.4],[4.6,.6,2.3]]};
  const st=S3.stage({id:'stg-chip',list:'sx-chip',fig:'Fig. 1 · one TPU chip as your program meets it',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4800,draw,
    margin:w=>w<520?[18,8,16,8]:[20,12,18,92],
    view:k=>TQPH(k===2?{cam:[.2,.62],bounds:[[-.6,0,-1.4],[4.6,.7,2.3]]}:k===3||k===4?{cam:[.1,.66],bounds:[[-4.6,0,-1.6],[.6,.7,2.3]]}:
      k===5?{cam:[.16,.76],bounds:[[-5.6,0,-4.8],[5.6,.8,2.8]]}:full)});
  (window.TQSTG=window.TQSTG||{})['stg-chip']=st;
  // the generation chips on the left: redraw the scene and refill the numbers in the step list and counters
  const chips=document.getElementById('tq-hero-gen');
  function fill(){const g=G[gen];document.querySelectorAll('[data-tqg]').forEach(el=>{const f=el.dataset.tqg;
      el.textContent=f==='bw'?gbs(g.bw):f==='peak'?U.fmt(g.bf16/1e12)+' TFLOP/s':f==='ridge'?U.fmt(g.bf16/g.bw,1):f==='vmem'?U.fmt(g.vmem)+' MiB':f==='hbm'?g.hbm_txt:
        f==='mxu'?g.mxus+' MXUs of '+g.mxu+' × '+g.mxu:f==='gen'?gl(gen):f==='host'?String(g.host_chips):''});
    const c=document.getElementById('tq-hero-cnt');if(c)c.innerHTML=RD.stat('bf16 peak',U.fmt(g.bf16/1e12)+' TFLOP/s','all MXUs, per chip')+RD.stat('HBM bandwidth',gbs(g.bw),'per chip')+
      RD.stat('Ridge point',U.fmt(g.bf16/g.bw,1)+' FLOP/byte','peak &divide; bandwidth')+RD.stat('VMEM',U.fmt(g.vmem)+' MiB','per TensorCore')}
  if(chips){chips.innerHTML=U.GEN_ORDER.map(k=>'<button type="button" data-g="'+k+'"'+(k===gen?' class="on"':'')+'>'+gl(k)+'</button>').join('');
    chips.addEventListener('click',ev=>{const b=ev.target.closest('button');if(!b)return;gen=b.dataset.g;chips.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));fill();st.draw()})}
  fill();
})();
