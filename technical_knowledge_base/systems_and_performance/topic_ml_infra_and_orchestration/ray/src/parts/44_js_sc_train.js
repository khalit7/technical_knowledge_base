// ---- Scene, Fig. 4 (Ray Train): fit() on this cluster, run 1 of the crash test (renderer v2) ----
// A controller on the head, a placement group of four bundles (one per fake GPU), one RayTrainWorker per bundle, the gloo process group,
// reports and checkpoints, rank 3's crash and the restart from step 50. Times are window.RY.train.runs[0]; positions are schematic.
(function(){
  if(!document.getElementById('stg-train')||!window.RY||!window.RYG)return;const {at,off,lerp,mix}=S3;
  const Y=window.RY,G=window.RYG,r=Y.train.runs[0],f2=x=>x.toFixed(2),f1=x=>x.toFixed(1);
  const starts=r.ranks.map(x=>x.filter(e=>e.ev==='start'));
  const T={up:Math.min(...starts.map(s=>s[0].t)),reg50:r.ctl.find(c=>c.ev==='report'&&c.step===50).t,
    rep100:Math.max(...r.ranks.map(x=>x.find(e=>e.ev==='report'&&e.step===100).t)),crash:r.ranks[3].find(e=>e.ev==='crash'),
    exc:r.ctl.find(c=>c.ev==='exception').t,re:Math.min(...starts.map(s=>s[1].t)),from:starts[0][1].step};
  window.RY_TRAIN=T;
  const RK=k=>G.GPU(1+(k>>1),k&1),CTL=[G.NX[0]-.95,G.SH,.7],STO=[-1.95,0,-2.05],CK=j=>[STO[0]-.45+j*.9,.32,STO[2]];
  const HL=[0,0,2.4];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6.2,6.2,-2.8,2.2,.5);
    G.slab(R,0,{tint:P.c4});
    const gA=k===1?1:.3;R.box(G.GCS,[1.2,.55,.8],{fill:mix(P.paper,P.c4,.45),a:gA});lab([G.GCS[0],.75,G.GCS[2]],'GCS',{dy:-8,b:1,c:P.c4,a:Math.max(.5,gA)});
    R.box(G.DRV,[1.05,.5,.75],{fill:mix(P.paper,P.acc,.35),a:.35});lab([G.DRV[0],.2,G.DRV[2]+.4],'driver: fit()',{dy:12,c:P.acc,a:.7,wide:1});
    const cA=k===0||k===4||k===6?1:.45;R.box(CTL,[1.05,.55,.62],{fill:mix(P.paper,P.c6,.5),a:cA});lab([CTL[0],.75,CTL[2]],'controller',{dy:-8,b:1,c:P.c6,a:Math.max(.55,cA)});
    [1,2].forEach(i=>{G.slab(R,i);G.raylet(R,G.RL(i),{a:.3});G.store(R,i,{a:.3});G.gpus(R,i,{a:1});
      lab([G.NX[i]-G.SW/2+.1,0,G.SD/2],(i===1?'w1':'w2')+' · 2 fake_gpu',{al:'left',dy:14,b:1,a:.85})});
    lab([G.NX[0]-G.SW/2+.1,0,G.SD/2],'head',{al:'left',dy:14,b:1,c:P.c4,a:.85});
    // storage_path: the shared volume where rank 0 uploads checkpoints
    R.box(STO,[2,.3,.8],{fill:mix(P.paper,P.c1,.25),a:k>=4?1:.4,lw:.7});lab([STO[0],0,STO[2]+.4],'/shared/results',{dy:12,c:P.c1,a:k>=4?1:.5,wide:1});
    // 1. fit(): the controller asks for a placement group of four bundles
    if(k===0){R.flowArc([CTL[0]+.2,.6,CTL[2]],[G.GCS[0],.6,G.GCS[2]],.6,{c:P.c6,a:e,r:.07,n:6,speed:1.2});
      lab(HL,"Requesting resources: {'CPU': 1, 'fake_gpu': 1} * 4 · PACK",{b:1,c:P.c6,a:e,wide:1})}
    // 2. the GCS reserves all four bundles at once (two-phase commit with the raylets)
    const ba=k<1?0:k===1?e:1;
    for(let j=0;j<4;j++){const p=RK(j);R.box([p[0],p[1]+.05,p[2]],[.5,.08,.4],{fill:mix(P.paper,P.c6,.35),a:ba,shadow:false,lw:.6})}
    if(k===1){[1,2].forEach(i=>R.flowArc([G.GCS[0]+.3,.6,G.GCS[2]],[G.RL(i)[0],.4,G.RL(i)[2]],1.2+.6*(i-1),{c:P.c4,a:e,r:.07,n:10,speed:1.4}));
      lab(HL,'4 bundles reserved together (two-phase commit): 2 on w1, 2 on w2',{b:1,c:P.c4,a:e,wide:1})}
    // 3. one RayTrainWorker per bundle, with its rank and the rendezvous variables
    const wa=k<2?0:k===2?e:1;
    for(let j=0;j<4;j++){const p=RK(j),dead=j===3&&k===5&&e>.3,old=k===6;const a=old?(1-e)*.9+.1:wa;
      R.box([p[0],p[1]+.13,p[2]],[.46,.5,.36],{fill:dead?P.bad:mix(P.paper,P.c2,.5),a:a,lw:.7});
      lab([p[0],.85,p[2]],dead?'rank 3: exit 13':'rank '+j,{dy:-8,b:k===2||dead,c:dead?P.bad:P.ink,a:old?0:wa,grp:'rk'+(j>>1)})}
    if(k===2){for(let j=0;j<4;j++){const p=RK(j);R.flowArc([CTL[0]+.3,.6,CTL[2]],[p[0],.7,p[2]],1.1+.25*j,{c:P.c6,a:e,r:.055,n:6,speed:1.4})}
      lab(HL,'RANK, WORLD_SIZE 4, MASTER_ADDR (rank 0) · group running '+f1(T.up)+' s after fit()',{b:1,c:P.c2,a:e,wide:1})}
    // 4. the process group: gloo connects every rank to every other; DDP all-reduces gradients every step
    if(k===3||k===4){const ma=k===3?e:.45;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=RK(i),b=RK(j);R.flowArc([a[0],.75,a[2]],[b[0],.75,b[2]],.35+.2*Math.abs(i-j),{c:P.c4,a:ma*.85,r:.045,n:4,speed:1.1})}
      if(k===3)lab(HL,'init_process_group(env://), backend gloo, world_size 4 · DDP all-reduce every step',{b:1,c:P.c4,a:e,wide:1})}
    // 5. step 50: every rank reports, rank 0 uploads the checkpoint, the controller registers it
    const c50=k<4?0:k===4?e:1;
    if(c50>0){R.box(CK(0),[.7,.3,.5],{fill:mix(P.paper,P.good,.55),a:c50,shadow:false,lw:.7});lab([CK(0)[0]-.35,.62,CK(0)[2]],k>=6?'step 50: restored':'step 50: registered',{al:'right',dx:-4,dy:-8,b:1,c:P.good,a:c50})}
    if(k===4){for(let j=0;j<4;j++){const p=RK(j);R.flowArc([p[0],.75,p[2]],[CTL[0]+.2,.7,CTL[2]],1.2+.2*j,{c:P.c5,a:e*.8,r:.045,n:5,speed:1.3})}
      R.flowArc([RK(0)[0],.7,RK(0)[2]],[CK(0)[0],.6,CK(0)[2]],.8,{c:P.good,a:e,r:.07,n:7,speed:1.3});
      lab(HL,'step 50: 4 reports collected at a poll (every 2.0 s), registered at '+f2(T.reg50)+' s',{b:1,c:P.good,a:e,wide:1})}
    // 6. step 100: rank 0 uploads, all four report, then rank 3 dies before the next poll: 100 is never registered
    const c100=k<5?0:k===5?e:1;
    if(c100>0){R.box(CK(1),[.7,.3,.5],{fill:mix(P.paper,P.mute,.3),a:c100,shadow:false,lw:.7});lab([CK(1)[0]+.35,.62,CK(1)[2]],k>=6?'step 100: orphan':'step 100: not registered',{al:'left',dx:4,dy:-8,b:1,c:P.mute,a:c100})}
    if(k===5){R.flowArc([RK(0)[0],.7,RK(0)[2]],[CK(1)[0],.6,CK(1)[2]],.8,{c:P.mute,a:Math.min(1,e*2),r:.07,n:7,speed:1.3});
      lab(HL,'step 100 reported, then rank 3 exits at step '+T.crash.step+' ('+f2(T.crash.t)+' s), before the next poll',{b:1,c:P.bad,a:e,wide:1})}
    // 7. the poll sees the failure; a new group restores the last registered checkpoint, step 50
    if(k===6){for(let j=0;j<4;j++){const p=RK(j);R.box([p[0],p[1]+.13,p[2]],[.46,.5,.36],{fill:mix(P.paper,P.c2,.5),a:e,lw:.7});
        lab([p[0],.85,p[2]],'rank '+j,{dy:-8,b:1,a:e,grp:'nr'+(j>>1)});
        R.flowArc([CK(0)[0],.5,CK(0)[2]],[p[0],.7,p[2]],1+.15*j,{c:P.good,a:e,r:.05,n:6,speed:1.3})}
      lab(HL,'failure seen at '+f2(T.exc)+' s · new group at '+f2(T.re)+' s from step '+T.from+': 70 steps redone',{b:1,c:P.good,a:e,wide:1})}
  }
  const full={cam:[.12,.95],bounds:[[-5.7,0,-2.5],[5.7,1.2,2.5]]};
  const st=S3.stage({id:'stg-train',list:'sx-train',fig:'Fig. 4 · Ray Train on this cluster, run 1',cam:full.cam,bounds:full.bounds,aspect:.48,dur:1400,hold:5200,draw,
    view:k=>k===3?{cam:[.1,.85],bounds:[[-1.9,0,-1.5],[5.9,1.2,2.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.RYSTG=window.RYSTG||{})['stg-train']=st;
})();
