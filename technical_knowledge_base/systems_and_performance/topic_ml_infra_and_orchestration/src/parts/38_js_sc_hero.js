// ---- Scene, Fig. 1 (the map): one training job's life on the topic's Slurm lab cluster (renderer v2: a few large objects per step,
// the camera moving in close, flowing dots wherever data moves). A map, not a mechanism: each step lights the part one child page owns,
// and the step list (sx-hero) links that child's own figure.
// The cluster drawn is the lab's: a controller (ctl) and three nodes c1 to c3 with four fake GPUs each, a shared volume, alice submitting
// (src/data/README.md). The job is the running example: 2 nodes x 2 ranks, gres gpu:2 per node.
// Numbers from the page's data: LA.times (submit to first step, medians of 5, per system), FL_DATA.scen 's-node' (c2 killed: DOWN,
// restarted on c[1,3], resumed), FL_DATA.ref (the step-200 loss), IO_D.anatomy (checkpoint bytes, parameters). Quoted in prose already:
// 450 against 50 GB/s (section 1), 0.98 TB and 16 GB/s (section 6), 90% x 40% = 36% (section 7). The meter and tracker boxes and the
// queue's other jobs are illustrative.
// Colours: orange the job and its ranks, gold the scheduler, blue the networks, green data, purple checkpoints, teal meters, red the failure
// (a fixed red: this page's --bad is orange, the job's colour).
(function(){
  if(!document.getElementById('stg-hero')||!window.LA||!window.FL_DATA||!window.IO_D)return;const {mix,lerp}=S3;
  const nf=(v,d)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const TT=s=>LA.times[s].summary.total.median,SN=FL_DATA.scen.find(s=>s.id==='s-node'),EV=SN.events;
  const tDown=EV.find(e=>/setting DOWN/.test(e[2]))[0],tRe=EV.find(e=>/starts job .* again/.test(e[2]))[0],tRes=SN.resume_s;
  const LOSS=FL_DATA.ref.gloss[FL_DATA.ref.gloss.length-1],CK=IO_D.anatomy.file_bytes;
  window.MI_HERO={slurm:TT('slurm'),k8s:TT('k8s'),ray:TT('ray'),down:tDown,restart:tRe,resume:tRes,redone:SN.steps_redone,loss:LOSS,ckpt:CK};
  // where things sit (schematic)
  const UZ=[-7.4,0,-2.2],CTL=[-4.4,0,-2.2],NX=[-1.7,1.5,4.7],NZ=0,SLOT=j=>(j-1.5)*.58,STO=[1.5,0,3.0],MET=[-4.8,0,1.9],TRK=[5.9,0,3.0];
  const slot=(n,j)=>[NX[n]+SLOT(j),.22,NZ];
  const RK=[[0,0],[0,1],[1,0],[1,1]];             // rank -> [node, slot]
  const RK2=[[0,0],[0,1],[2,0],[2,1]];            // after the failure: c1 and c3
  function draw(R,k,e){const P=R.P,nar=R.W<520,RED=P.dark?[236,104,94]:[196,48,43];R.grid(-9,9.4,-4,4.4,.5);
    const L=[['all'],['node','net'],['usr','ctl','q'],['ctl','node','job'],['node','job','rk'],['node','rk','sto'],['node','rk','sto'],['node','rk','sto','ctl'],['met'],['trk','sto','ctl']];
    const has=(j,g)=>{const s=L[Math.max(0,Math.min(L.length-1,j))];return s.includes('all')||s.includes(g)};
    const lit=g=>{const A0=j=>has(j,g)?1:.22;return lerp(A0(k-1),A0(k),e)};
    const lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));
    // ---- alice, the controller and its queue ----
    const au=lit('usr');R.box([UZ[0],0,UZ[2]],[.5,.05,.5],{a:au,shadow:false});R.ball([UZ[0],.26,UZ[2]],.18,{c:P.c2,a:au});
    const ac=lit('ctl');R.box(CTL,[1.5,.6,1.1],{fill:mix(P.paper,P.c5,.5),a:ac});
    const aq=Math.max(lit('q'),k===0?1:.22),QC=[P.c4,P.c6,P.c2,P.c3];
    QC.forEach((c,i)=>R.box([CTL[0]+1.25+i*.42,0,CTL[2]+.05],[.32,.22+.08*(i%2),.5],{fill:mix(P.paper,c,i===2?.75:.4),a:aq*(i===2?1:.7),shadow:false}));
    // ---- the three nodes, four GPU slots each ----
    const an=lit('node');
    NX.forEach((x,n)=>{const dead=k===7&&n===1,red=dead?Math.min(1,e*2):0;
      R.box([x,0,NZ],[2.7,.22,1.7],{fill:mix(mix(P.paper,P.ink,.06),RED,.45*red),a:Math.max(an,dead?1:0),dz:150});
      for(let j=0;j<4;j++){let fill=mix(P.paper,P.c1,.18);
        const used=(k>=3&&k<=6&&n<2&&j<2)||(k===7&&j<2&&(n===0||(n===2&&e>.55)))||(k>=8&&j<2&&n!==1);
        if(used)fill=mix(P.paper,P.c2,k===3?.35+.4*e:.6);
        if(dead&&j<2)fill=mix(P.paper,RED,.35+.4*red);
        R.box(slot(n,j),[.46,.4,.62],{fill,a:Math.max(an,dead?1:0)})}});
    // ---- the shared volume, the meters, the tracker ----
    const as=lit('sto');R.box(STO,[3.2,.5,1.2],{fill:mix(P.paper,P.c4,.38),a:as});
    for(let i=0;i<3;i++)R.glass([STO[0]-1.35+i*.95,.5,STO[2]-.35],[.8,0,0],[0,.55,0],{c:P.c4,a:as*.85,nu:4,nv:3});
    const am=lit('met');R.box(MET,[1.4,.5,1.0],{fill:mix(P.paper,P.c6,.45),a:am});
    const at=lit('trk');R.box(TRK,[1.4,.5,1.0],{fill:mix(P.paper,P.ink,.12),a:at});
    // ranks (balls on the job's slots) from step 4
    const rankAt=(r,after)=>{const [n,j]=(after?RK2:RK)[r];const p=slot(n,j);return [p[0],.84,p[2]]};
    const ar=k<4?0:k===4?e:1;
    if(k>=4&&k<=6)RK.forEach((_,r)=>R.ball(rankAt(r),.16,{c:r===0?P.c2:mix(P.paper,P.c2,.75),a:ar}));
    if(k===7){RK.forEach((_,r)=>{if(r>=2){if(e<.5)R.ball(rankAt(r),.16,{c:RED,a:1-e*2})}else R.ball(rankAt(r),.16,{c:r===0?P.c2:mix(P.paper,P.c2,.75)})});
      if(e>.55)[2,3].forEach(r=>R.ball(rankAt(r,1),.16,{c:mix(P.paper,P.c2,.75),a:Math.min(1,(e-.55)*3)}))}
    if(k>=8)RK2.forEach((_,r)=>R.ball(rankAt(r,1),.16,{c:r===0?P.c2:mix(P.paper,P.c2,.75),a:k===8?.6:.3}));
    // ---- step 0: the map, labelled ----
    if(k===0){const a=e;
      R.flowArc([UZ[0]+.2,.4,UZ[2]],[CTL[0]-.8,.5,CTL[2]],.6,{c:P.c2,a,r:.05,n:5,speed:1});
      R.flowArc([CTL[0]+.6,.6,CTL[2]+.4],[NX[0],.5,NZ-.6],.8,{c:P.c5,a,r:.05,n:5,speed:1});
      R.flowArc([NX[1],.4,NZ+.85],[STO[0],.6,STO[2]-.6],.5,{c:P.c3,a:a*.8,r:.05,n:4,speed:.9});
      lab([UZ[0],.45,UZ[2]],'alice',{b:1,dy:-12,c:P.c2,a});
      lab([CTL[0],.6,CTL[2]],nar?'controller':'controller: slurmctld',{b:1,dy:-12,c:P.ink,a});
      NX.forEach((x,n)=>lab([x,.52,NZ],'c'+(n+1),{b:1,dy:-14,a}));
      lab([STO[0],1.05,STO[2]],nar?'shared storage':'shared storage: /shared',{b:1,dy:-10,c:P.c4,a});
      lab([MET[0],.5,MET[2]],'meters',{b:1,dy:-12,c:P.c6,a});lab([TRK[0],.5,TRK[2]],nar?'tracker':'tracker and registry',{b:1,dy:-12,c:P.ink,a})}
    // ---- step 1: what a cluster is: GPUs in nodes, NVLink inside, a fabric between, storage on the network ----
    if(k===1){const a=e;
      NX.forEach(x=>{R.line([[x+SLOT(0),.62,NZ],[x+SLOT(3),.62,NZ]],{c:P.c4,w:4,a,top:1});R.flow([[x+SLOT(0),.66,NZ],[x+SLOT(3),.66,NZ]],{c:P.c4,a,r:.06,n:5,speed:.8,top:1})});
      for(let n=0;n<2;n++)R.flowArc([NX[n]+1.0,.3,NZ-.5],[NX[n+1]-1.0,.3,NZ-.5],.9,{c:P.c1,a,r:.075,n:7,speed:1.1});
      NX.forEach(x=>R.line([[x,.05,NZ+.85],[STO[0]+(x-STO[0])*.4,.05,STO[2]-.6]],{c:P.mute,w:1.2,a:a*.7,dash:[5,4]}));
      lab([NX[0],0,NZ+.85],nar?'NVLink inside':'inside a node: NVLink, 450 GB/s (H100)',{b:1,dy:16,c:P.c4,a});
      lab([(NX[1]+NX[2])/2,1.2,NZ-.5],nar?'fabric between':'between nodes: 50 GB/s per card',{b:1,dy:-8,c:P.c1,a});
      lab([STO[0],.5,STO[2]+.6],nar?'shared storage':'shared storage on the network',{dy:16,c:P.c4,a})}
    // ---- step 2: submit and queue ----
    if(k===2){const a=e;
      R.flowArc([UZ[0]+.2,.4,UZ[2]],[CTL[0]-.8,.55,CTL[2]],.7,{c:P.c2,a,r:.065,n:6,speed:1.1});
      R.glow([CTL[0]+1.25+2*.42,.3,CTL[2]+.05],.35,{c:P.c2,a});
      lab([UZ[0],.45,UZ[2]],'sbatch train.sbatch',{mono:true,b:1,dy:-12,c:P.c2,a});
      lab([CTL[0],.6,CTL[2]],'slurmctld',{mono:true,b:1,dy:-12,c:P.ink,a});
      lab([CTL[0]+1.9,0,CTL[2]+.3],nar?'the queue':'the queue: priority, backfill, fairshare',{dy:16,c:P.c5,a,b:1})}
    // ---- step 3: gang allocation: four GPUs on two nodes at once, or none ----
    if(k===3){const a=e;
      [0,1].forEach(n=>R.flowArc([CTL[0]+.6,.6,CTL[2]+.3],[NX[n]+SLOT(.5),.6,NZ-.2],1.0+.4*n,{c:P.c5,a,r:.085,n:9,speed:1.3,top:1}));
      lab([NX[1],0,NZ+.85],nar?'all 4 at once':'2 nodes x gpu:2: all at once or none',{b:1,dy:16,c:P.c2,a});
      lab([NX[2],.52,NZ-.5],nar?'c3 free':'c3 stays free',{dy:-14,c:P.mute,a,b:1})}
    // ---- step 4: launch and rendezvous: every rank reports to rank 0's store ----
    if(k===4){const a=e,s0=rankAt(0);
      [1,2,3].forEach(r=>{const p=rankAt(r);R.flowArc([p[0],p[1]+.1,p[2]],[s0[0],s0[1]+.15,s0[2]],.5+.25*r,{c:P.acc,a,r:.075,n:7,speed:1.3,top:1})});
      R.glow([s0[0],s0[1],s0[2]],.5,{c:P.c2,a});
      lab([s0[0],s0[1]+.2,s0[2]],nar?'store c1:29500':'rank 0 hosts the store: c1:29500',{mono:true,b:1,dy:-14,c:P.acc,a});
      lab([NX[1],0,NZ+.85],nar?'4 ranks, 2 per node':'srun starts torchrun on each node: 4 ranks',{dy:16,c:P.c2,a,b:1,wide:nar?1:0})}
    // ---- step 5: train: data streams in, gradients are all-reduced across the nodes ----
    if(k===5){const a=e;
      [0,1].forEach(n=>R.flowArc([STO[0]+(n?.6:-.6),.55,STO[2]-.5],[NX[n],.3,NZ+.75],.6,{c:P.c3,a,r:.075,n:7,speed:.9}));
      const ring=[0,1,3,2,0].map(r=>rankAt(r));
      for(let i=0;i<4;i++)R.flowArc([ring[i][0],ring[i][1]+.05,ring[i][2]],[ring[i+1][0],ring[i+1][1]+.05,ring[i+1][2]],.3+(i%2)*.5,{c:P.c1,a,r:.08,n:8,speed:1.2,top:1});
      lab([(NX[0]+NX[1])/2,1.3,NZ],nar?'all-reduce':'every step: all-reduce the gradients',{b:1,dy:-10,c:P.c1,a});
      lab([STO[0],0,STO[2]+.6],nar?'data in':'data streams in from /shared',{dy:16,c:P.c3,a,b:1})}
    // ---- step 6: checkpoint: rank 0 writes the state to shared storage ----
    if(k===6){const a=e,s0=rankAt(0);
      R.flowArc([s0[0],s0[1],s0[2]+.2],[STO[0]-.8,.9,STO[2]-.3],1.0,{c:P.c4,a,r:.09,n:11,speed:1.3,top:1});
      lab([STO[0],1.05,STO[2]],nar?nf(CK)+' bytes':'every 50 steps: '+nf(CK)+' bytes',{mono:true,b:1,dy:-10,c:P.c4,a});
      lab([STO[0],.0,STO[2]+.6],nar?'70B: ~0.98 TB':'at 70B: about 0.98 TB, 16 GB/s for one minute',{dy:16,c:P.ink,a})}
    // ---- step 7: a node dies; the job is requeued and resumes on c1 and c3 from the last checkpoint ----
    if(k===7){const a=e;
      lab([NX[1],1.15,NZ],nar?'c2 killed':'c2 killed: DOWN at '+tDown.toFixed(0)+' s',{b:1,dy:-14,c:RED,a:Math.min(1,e*2)});
      if(e>.5){const b=Math.min(1,(e-.5)*2);
        [0,2].forEach(n=>R.flowArc([STO[0]+(n?.8:-.8),.6,STO[2]-.5],[NX[n],.55,NZ+.6],.7,{c:P.c4,a:b,r:.08,n:8,speed:1.2,top:1}));
        lab([NX[2],1.15,NZ],nar?'c3 takes over':'restarted on c1 + c3 at '+tRe.toFixed(0)+' s',{b:1,dy:-14,c:P.c2,a:b});
        lab([STO[0],.0,STO[2]+.6],nar?'from step 100':'resumed from step 100 at '+tRes.toFixed(0)+' s, '+SN.steps_redone+' steps redone',{dy:16,c:P.c4,a:b,b:1})}}
    // ---- step 8: meters: paid, kept, useful ----
    if(k===8){const a=e,sc=1.5,bx=MET[0]+1.35,bz=MET[2]+.3;
      [0,2].forEach(n=>R.flowArc([NX[n],.4,NZ+.85],[MET[0]+.5,.5,MET[2]-.3],.7,{c:P.c6,a,r:.075,n:7,speed:1}));
      [[1,P.mute,'paid 100%'],[.9,P.c4,'goodput 90%'],[.36,P.acc,'useful 36%']].forEach(([v,c,t],i)=>{const x=bx+i*.7;
        R.box([x,0,bz],[.5,.04,.5],{a,shadow:false});R.box([x,.04,bz],[.36,v*sc,.36],{fill:mix(P.paper,c,.6),a});
        lab([x,.04+v*sc,bz],nar?t.split(' ')[1]:t,{mono:true,fs:12,dy:-10,b:1,c,a,grp:'bars'})});
      lab([MET[0]-.2,.5,MET[2]-.5],nar?'meters':'meters: accounting, GPU counters, the log',{b:1,dy:-14,c:P.c6,a})}
    // ---- step 9: the platform records which code, data and run made which model ----
    if(k===9){const a=e;
      R.flowArc([STO[0]+1.5,.5,STO[2]],[TRK[0]-.65,.4,TRK[2]],.6,{c:P.c4,a,r:.08,n:8,speed:1});
      R.flowArc([CTL[0]+.7,.6,CTL[2]],[TRK[0],.5,TRK[2]-.5],1.8,{c:P.c5,a:a*.8,r:.07,n:12,speed:1.2});
      lab([TRK[0],.5,TRK[2]],nar?'tracker':'tracker and registry',{b:1,dy:-12,c:P.ink,a});
      lab([TRK[0],0,TRK[2]+.5],nar?'run → model':'run, checkpoint, model: one chain',{dy:16,c:P.ink,a})}
  }
  const full={cam:[.3,.78],bounds:[[-7.9,0,-3.0],[6.9,1.3,3.7]]};
  const V=[full,
    {cam:[.25,.62],bounds:[[-3.4,0,-1.2],[6.4,1.3,3.8]]},
    {cam:[.3,.7],bounds:[[-8.2,0,-3.2],[-1.0,1.2,.4]]},
    {cam:[.3,.68],bounds:[[-5.4,0,-3.0],[6.2,1.2,1.2]]},
    {cam:[.25,.62],bounds:[[-3.4,0,-1.2],[6.4,1.6,1.4]]},
    {cam:[.25,.62],bounds:[[-3.4,0,-1.0],[6.4,1.6,3.8]]},
    {cam:[.25,.62],bounds:[[-3.4,0,-1.0],[6.4,1.6,3.8]]},
    {cam:[.25,.62],bounds:[[-3.4,0,-1.0],[6.4,1.6,3.8]]},
    {cam:[.3,.66],bounds:[[-6.4,0,-1.0],[2.4,1.8,3.4]]},
    {cam:[.3,.72],bounds:[[-5.6,0,-3.0],[7.2,1.2,3.8]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one training job on the lab cluster',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[18,8,16,8]:[24,20,20,20]});
})();
