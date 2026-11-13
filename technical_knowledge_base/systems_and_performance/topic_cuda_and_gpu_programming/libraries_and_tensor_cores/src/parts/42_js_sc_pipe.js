// ---- Scene, Fig. 3 (section 6): one 128 x 128 BF16 output tile, one 64-wide K slice at a time, as an Ampere, a Hopper and a datacenter
// Blackwell kernel would issue it. Global memory on the left, the shared-memory stages as glass plates (each with a "full" and an "empty"
// barrier), the tensor core, registers and, on Blackwell, tensor memory; one cube per warp in front, lit when it works. Dots flow wherever
// data moves: a swarm of small ones for Ampere's 2,048 cp.async copies, two large ones for the two TMA instructions.
// Counters per K slice come from window.LT.tile (recompute.py: instruction shapes of the PTX ISA 9.4). The steps are the former 2D animation's,
// now written out in #sx-pa, #sx-ph and #sx-pb on the left. ----
(function(){
  if(!document.getElementById('stg-pipe'))return;const {at,off,lerp,mix}=S3,T=window.LT.tile,$=id=>document.getElementById(id);
  // per step: [arrows [from,to,label], active roles, counters patch, stage states (0 empty, 1 filling, 2 full, 3 read by the MMAs), barrier lit ('full'|'empty'|'')]
  const SEQ={
    ampere:{list:'sx-pa',stages:3,tmem:false,roles:[['warp 0',1],['warp 1',1],['warp 2',1],['warp 3',1]],note:'4 warps: each copies, loads fragments and issues MMAs',steps:[
      [[],[0,1,2,3],{},[2,2,0],''],
      [[['G','S','cp.async × '+T.ampere.copy,2]],[0,1,2,3],{copy:T.ampere.copy},[2,2,1],''],
      [[],[0,1,2,3],{},[2,2,1],'full'],
      [[['S','R','ldmatrix × '+T.ampere.ldsm,0]],[0,1,2,3],{ldsm:T.ampere.ldsm},[3,2,1],''],
      [[['R','X','mma.sync × '+T.ampere.mma],['X','R','accumulate']],[0,1,2,3],{mma:T.ampere.mma,iss:T.ampere.issuers,acc:T.ampere.acc_regs,where:'registers'},[3,2,1],''],
      [[['G','S','next slices',0]],[0,1,2,3],{},[1,2,2],'empty'],
      [[['R','G','store']],[0,1,2,3],{},[0,0,0],'']]},
    hopper:{list:'sx-ph',stages:4,tmem:false,roles:[['producer WG',4],['consumer WG 1',4],['consumer WG 2',4]],note:'warp-specialised: 1 producer warpgroup, 2 consumer warpgroups',steps:[
      [[],[0,1,2],{},[2,2,1,0],''],
      [[['G','S','TMA × '+T.hopper.copy,3]],[0],{copy:T.hopper.copy},[2,2,1,1],''],
      [[],[1,2],{},[2,2,1,1],'full'],
      [[['S','X','wgmma × '+T.hopper.mma,0],['X','R','accumulate']],[1,2],{mma:T.hopper.mma,iss:T.hopper.issuers,acc:T.hopper.acc_regs,where:'registers'},[3,2,1,1],''],
      [[['S','G','empty: refill',0,1]],[0,1,2],{},[0,2,2,1],'empty'],
      [[['G','S','next slices',0],['G','S','',3]],[0,1,2],{},[1,2,2,1],''],
      [[['R','S','stmatrix',1],['S','G','TMA store',1]],[1,2],{},[0,3,0,0],'']]},
    blackwell:{list:'sx-pb',stages:4,tmem:true,roles:[['TMA warp',1],['MMA warp',1],['epilogue warps',4]],note:'one warp copies, one thread of one warp issues MMAs, 4 warps run the epilogue',steps:[
      [[],[0,1,2],{},[2,2,1,0],''],
      [[['G','S','TMA × '+T.blackwell.copy,3]],[0],{copy:T.blackwell.copy},[2,2,1,1],''],
      [[['S','X','tcgen05.mma × '+T.blackwell.mma,0],['X','M','accumulate']],[1],{mma:T.blackwell.mma,iss:T.blackwell.issuers,acc:0,where:'tensor memory'},[3,2,1,1],'full'],
      [[['S','G','empty: refill',0,1]],[0,1],{},[0,2,2,1],'empty'],
      [[['G','S','next slices',0],['G','S','',3]],[0,1],{},[1,2,2,1],''],
      [[['M','R','tcgen05.ld']],[2],{},[2,2,1,1],''],
      [[['R','S','st.shared',1],['S','G','TMA store',1],['S','X','',2]],[1,2],{},[2,3,2,1],'']]}
  };
  window.LT_PIPE=SEQ;
  let mode='ampere';
  const XG=-4.3,XS=-1.5,XC=1.2,XM=2.9,XR=4.6,SY=i=>.22+i*.36;
  const node=(k,si)=>k==='G'?[XG,1.1,0]:k==='S'?[XS,SY(si||0)+.02,0]:k==='X'?[XC,.7,0]:k==='R'?[XR,.45,0]:[XM,.7,0];
  function draw(R,k,e){const P=R.P,W=R.W,H=R.H,S=SEQ[mode],st=S.steps[Math.min(k,S.steps.length-1)];R.grid(-6.5,6.5,-2.6,4.7,.5);
    const lab=(p,t,o)=>{const q=R.p(p);if(q[0]<4||q[0]>W-4||q[1]<4||q[1]>H-4)return;R.label(p,t,o)};
    const act=new Set();st[0].forEach(a=>{act.add(a[0]);act.add(a[1])});
    const on=n=>act.has(n)?1:.4,lin=Math.max(0,Math.min(1,2*e-.6));
    // the blocks
    R.box([XG,0,0],[1.5,1.1,2.2],{fill:mix(P.paper,P.c6,.25),a:on('G')});
    lab([XG,0,1.1],R.W<520?'HBM':'global memory',{mono:true,fs:12.5,b:1,dy:16,c:P.c6});lab([XG,0,1.1],'(HBM)',{mono:true,fs:12,dy:33,c:P.c6,wide:1});
    R.box([XC,0,0],[1.2,.7,1.2],{fill:mix(P.paper,P.c2,.35),a:on('X')});lab([XC,0,.6],R.W<520?'TC':'tensor core',{mono:true,fs:12.5,b:1,dy:16,c:P.c2});
    R.box([XR,0,0],[1.2,.45,1.2],{fill:mix(P.paper,P.c1,.35),a:on('R')});lab([XR,0,.6],R.W<520?'regs':'registers',{mono:true,fs:12.5,b:1,dy:16,c:P.c1});
    if(S.tmem){R.box([XM,0,0],[1.2,.7,1.2],{fill:mix(P.paper,P.c4,.4),a:on('M')});lab([XM,0,.6],'TMEM',{mono:true,fs:12.5,b:1,dy:16,c:P.c4})}
    // the shared-memory stages, each with its two barriers
    const ns=S.stages,ss=st[3];
    for(let i=0;i<ns;i++){const y=SY(i),v=ss[i],c=v===3?P.c2:P.c3,a=v===0?.28:v===1?.55:1;
      R.glass([XS-.85,y,-.85],[1.7,0,0],[0,0,1.7],{c,a,nu:8,nv:8,th:.03});
      const fullOn=st[4]==='full'&&i===0,emptyOn=st[4]==='empty'&&i===0;
      R.ball([XS+.95,y+.02,.6],.075,{c:fullOn?P.good:mix(P.paper,P.good,.35),a:1});R.ball([XS+.95,y+.02,.25],.075,{c:emptyOn?P.bad:mix(P.paper,P.bad,.35),a:1});
      if(fullOn)R.glow([XS+.95,y+.02,.6],.3,{c:P.good,a:lin});if(emptyOn)R.glow([XS+.95,y+.02,.25],.3,{c:P.bad,a:lin});
    }
    lab([XS,0,.85],R.W<520?'smem':'shared memory',{mono:true,fs:12.5,b:1,dy:16,c:P.c3});lab([XS,0,.85],ns+' stages',{mono:true,fs:12,dy:33,c:P.c3,wide:1});
    if(st[4])lab([XS,0,.85],st[4]==='full'?'"full" barrier lit':'"empty" barrier lit',{mono:true,fs:12,b:1,dy:50,c:st[4]==='full'?P.good:P.bad,a:lin,wide:1});
    // data on the move: Ampere's 2,048 copies are a swarm of small dots, a TMA load two large ones
    st[0].forEach(([f,t,l,si,sig],j)=>{const A=node(f,si),B=node(t,si),swarm=mode==='ampere'&&f==='G'&&t==='S',tma=mode!=='ampere'&&f==='G'&&t==='S'&&/TMA/.test(l||'');
      const col=f==='X'||t==='M'&&f==='X'?P.c2:f==='S'?P.c3:f==='G'?P.c6:f==='M'?P.c4:P.c1;
      if(sig){R.arc(A,B,.9,{c:P.bad,w:1.6,dash:[5,4],t:Math.min(1,e*1.4),a:.9});}
      else R.flowArc(A,B,f==='G'||t==='G'?1.0:f==='S'&&t==='R'?1.1:.55,{c:col,a:Math.min(1,e*1.6),r:swarm?.035:tma?.11:.07,n:swarm?28:tma?2:7,speed:swarm?1.6:1.2});
      if(l){const m=R.arcPt(A,B,f==='G'||t==='G'?1.0:f==='S'&&t==='R'?1.1:.55,.5);lab(m,l,{mono:true,fs:12.5,b:1,dy:-14,c:sig?P.bad:col,a:lin,grp:'arr'})}});
    // the warps, one cube each, lit when they work
    const groups=S.roles,nW=groups.reduce((s,r)=>s+r[1],0),pitch=.34,gap=1.5;let x=-((nW-1)*pitch+(groups.length-1)*gap)/2;
    groups.forEach(([nm,n],gi)=>{const lit=st[1].includes(gi),x0=x;for(let i=0;i<n;i++){R.box([x,0,3.8],[.24,.24,.24],{fill:lit?mix(P.paper,P.acc,.6):P.paper,a:lit?1:.45,lw:.6});x+=pitch}
      lab([(x0+x-pitch)/2,0,3.95],nm,{mono:true,fs:12.5,b:lit?1:0,dy:18,c:lit?P.acc:P.mute,wide:1});x+=gap-pitch+pitch});
  }
  function counters(k){const S=SEQ[mode],c={copy:0,ldsm:0,mma:0,iss:0,acc:0,where:'not yet'};for(let i=0;i<=k;i++)Object.assign(c,S.steps[i][2]);
    $('lt-pipe-cnt').innerHTML=RD.stat('MMA instructions per K slice',c.mma||'0')+RD.stat('Threads that issue them',c.iss||'0')+
      RD.stat('Accumulator registers per thread',c.where==='tensor memory'?'0':(c.acc||'0'),c.where==='not yet'?'':'accumulator in '+c.where)+
      RD.stat('Copy instructions per K slice',c.copy||'0',c.ldsm?'+ '+c.ldsm+' ldmatrix':'')}
  const full={cam:[.12,.5],bounds:[[-5.2,0,-1.0],[5.4,1.6,4.2]]};
  const st=S3.stage({id:'stg-pipe',list:'sx-pa',fig:'Fig. 3 · one tile, one K slice at a time',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    view:()=>document.getElementById('stg-pipe').clientWidth<520?{cam:[.7,.75],bounds:full.bounds}:null,   // on a phone the row turns into depth, so the parts draw larger
    margin:w=>w<520?[16,10,16,10]:[24,18,30,18],onStep:k=>{try{counters(k)}catch(err){}}});
  (window.LTSTG=window.LTSTG||{})['stg-pipe']=st;
  RD.seg($('lt-pipeMode'),m=>{mode=m;['ampere','hopper','blackwell'].forEach(g=>$(SEQ[g].list).hidden=g!==m);st.list(SEQ[m].list)});
})();
