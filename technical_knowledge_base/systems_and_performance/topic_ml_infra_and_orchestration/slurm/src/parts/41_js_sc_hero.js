// ---- Scene, hero (The idea in one screen): one job's path through the lab cluster, from job 79's own log (window.SL.busy.events).
// Front: the controller's queue; middle: nodes c1 to c3 (4 fake GPUs and 4 CPUs each); back: slurmctld and slurmdbd.
// Step k shows one stretch of the recorded run: the blocker 78 holding every GPU, sbatch, backfill's plan, the allocation of c1 and c2
// together, the steps 79.batch and 79.0, and the record in slurmdbd. Positions and sizes are illustrative; times and numbers are the log's. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.SL||!window.SLG)return;const {at,off,lerp,mix}=S3,G=SLG,B=SL.busy,E=B.events;
  const ev=(k,last)=>{const a=E.filter(e=>e.k===k);return last?a[a.length-1]:a[0]};
  const clk=t=>{const h=Math.floor(t/3600),m=Math.floor(t%3600/60),s=t%60;return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0')+':'+s.toFixed(3).padStart(6,'0')};
  const blkEnd=E.find(e=>e.k==='blk'&&/ends/.test(e.txt)).t;
  const T={sub:ev('submit').t,plan:B.pstart,blkEnd,alloc:ev('alloc').t,trainS:ev('train').t,trainE:ev('train',1).t,epi:ev('epilog',1).t,step:ev('step').t};
  const prio=+/InitPrio=(\d+)/.exec(ev('submit').raw)[1];
  window.SL_HERO={T,clk,prio,nplan:B.nplan,gloss:B.gloss,early:T.plan-T.alloc,ms:Math.round((T.alloc-T.blkEnd)*1000)};
  const ZQ=2.75,ZC=-2.75,CTL=[-1.5,0,ZC],DBD=[3.0,0,ZC],USER=[-5.3,.3,ZQ];
  // where job 79's two halves wait in the queue, and where they land (GPUs 0 and 1 of c1 and c2)
  const QP=[[-1.25,.07,ZQ],[.05,.07,ZQ]],LP=[0,1].map(n=>[(G.gpuAt(n,0)[0]+G.gpuAt(n,1)[0])/2,G.SH+.4,.3]);
  function draw(R,k,e){const P=R.P,J=P.acc,BLK=mix(P.paper,P.c4,.5),lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));
    R.grid(-6,6,-3.8,3.8,.5);
    // the blocker holds every GPU and CPU until step 4 (it ends there)
    const blkA=k<3?1:k===3?Math.max(0,1-e*2.5):0,mine=k<3?0:k===3?Math.max(0,(e-.55)/.45):k===5?1-e*.7:1;
    const nodeA=k===1||k===2?.55:1;
    [0,1,2].forEach(n=>{const own=n<2&&mine>0,fill=g=>own&&g<2?mix(P.paper,J,Math.min(1,mine)):blkA>0?mix(P.paper,BLK,blkA):null;
      G.node(R,n,{a:nodeA,gpu:[0,1,2,3].map(fill),cpu:[0,1,2,3].map(fill)});
      lab([G.NX[n],0,G.SD/2+.05],G.NAMES[n]+' · slurmd',{dy:14,b:1,a:nodeA,c:P.mute})});
    if(blkA>0)lab([G.NX[0]-G.SW/2,G.SH+.2,.3],k===0&&R.W>=520?'job 78 · 12 GPUs':'job 78',{al:'right',dx:-8,b:1,a:blkA,c:P.c4,mono:true,fs:12});
    // the daemons at the back
    const dA=k<=2||k===5?1:k===4?.15:.5;
    R.box(CTL,[2.9,.8,1.1],{fill:mix(P.paper,J,.18),a:dA});lab([CTL[0],.8,ZC],'slurmctld',{dy:-12,b:1,a:k===4?0:k===3?dA*(1-e):dA,mono:true}); // faded out under step 4's allocation label and in step 5's close view
    R.box(DBD,[1.8,.6,1.1],{fill:mix(P.paper,P.c5,.3),a:k===5?1:dA*.8});lab([DBD[0],.6,ZC],'slurmdbd',{dy:-12,b:1,a:k===5?1:k===4?0:dA,mono:true});
    // the queue in front
    const qA=k===0?.35:k<=3?1:.35;
    R.box([-1.2,0,ZQ],[3.6,.07,1.1],{fill:mix(P.paper,P.ink,.05),a:qA,shadow:false});
    lab([-3.0,0,ZQ],'queue',{al:'right',dx:-8,mono:true,c:P.mute,a:k===4?0:qA,grp:'side'});
    // job 79: two halves, one per node, that move together
    const inQ=k===1?e:k===2?1:0;
    if(k>=1&&k<=2){QP.forEach(p=>R.box(p,[1.15,.42,.62],{fill:J,a:inQ}));R.glass([QP[0][0]-.68,.07,ZQ+.4],[QP[1][0]-QP[0][0]+1.36,0,0],[0,.5,0],{c:J,a:inQ*.8,nu:2,nv:1,th:.02});
      lab([(QP[0][0]+QP[1][0])/2,0,ZQ+.55],'79 · PD (Resources) · prio '+prio,{dy:16,mono:true,fs:12,b:1,c:J,a:inQ})}
    if(k===3&&e<.98){const u=Math.min(1,Math.max(0,(e-.25)/.7));if(u>0)QP.forEach((p,i)=>{const t=LP[i],pos=[lerp(p[0],t[0],u),lerp(p[1],t[1]-.4,u)+Math.sin(Math.PI*u)*.9,lerp(p[2],t[2],u)];
        R.box(pos,[1.15,.42,.62],{fill:J,a:1-u*.6,shadow:false});R.flowArc([CTL[0],.8,ZC],[t[0],t[1],t[2]],.9,{c:J,a:1-u*.5,r:.07,speed:1.6})})}
    // sbatch: the script goes to the controller, which queues it
    if(k===1){lab(USER,'sbatch train.sbatch',{mono:true,fs:12,b:1,al:'left',dx:-30,dy:-16,c:P.ink});
      R.flowArc(USER,[CTL[0]-.6,.8,ZC],1.2,{c:J,a:Math.min(1,e*2),r:.07,speed:1.6});R.flowArc([CTL[0]+.4,.8,ZC],[QP[0][0],.5,ZQ],1.0,{c:J,a:e,r:.06,speed:1.4})}
    // backfill's plan: a glass reservation over where 79 will go, at 78's limit
    const pA=k===2?e:k===3?off(k,e,3):0;
    if(pA>0){[0,1].forEach(n=>{const x0=G.gpuAt(n,0)[0]-.31;R.glass([x0,1.0,.3-.32],[1.24,0,0],[0,0,.64],{c:P.c5,a:pA,nu:2,nv:1})});
      R.flowArc([CTL[0]+.8,.8,ZC],[LP[0][0],1.0,.3],1.0,{c:P.c5,a:pA*.9,r:.06,speed:1.3});
      lab([(LP[0][0]+LP[1][0])/2,1.05,.3],'plan: start '+clk(T.plan).slice(0,8)+' (78\'s limit)',{dy:-34,mono:true,fs:12,b:1,c:P.c5,a:pA})}
    // the allocation: both halves at once
    if(k===3){lab([LP[0][0],LP[0][1]+.2,.3],clk(T.alloc)+' · c1 + c2 together',{dy:-40,b:1,mono:true,fs:12,c:J,a:Math.max(0,(e-.6)/.4)});
      lab([G.NX[2],G.SH+.4,.3],'free',{dy:-12,b:1,c:P.good,a:Math.max(0,(e-.6)/.4)})}
    // the steps: 79.batch on c1, then srun's 79.0 on both nodes, two ranks each, exchanging gradients
    const sA=k===4?e:0;
    if(sA>0){const yb=.95,ys=1.45,x1=G.NX[0]-1.1,x2=G.NX[1]+1.1;
      R.glass([G.NX[0]-1.05,yb,-.35],[2.1,0,0],[0,0,.7],{c:P.c4,a:sA,nu:2,nv:1});lab([G.NX[0]-1.05,yb,.35],'79.batch',{al:'right',dx:-6,mono:true,fs:12,b:1,c:P.c4,a:sA,grp:'st'});
      R.glass([x1,ys,-.35],[x2-x1,0,0],[0,0,.7],{c:J,a:sA,nu:4,nv:1});lab([x1,ys,.35],'79.0',{al:'right',dx:-6,mono:true,fs:12,b:1,c:J,a:sA,grp:'st'});
      R.flow([[G.NX[0],yb+.05,0],[G.NX[0],ys,0]],{c:P.c4,a:sA,r:.06,speed:.9,n:3});
      const rk=[[G.NX[0]-.45,ys+.12,0],[G.NX[0]+.45,ys+.12,0],[G.NX[1]-.45,ys+.12,0],[G.NX[1]+.45,ys+.12,0]];
      rk.forEach(p=>R.ball(p,.13,{c:P.c3,a:sA}));
      R.flowArc(rk[1],rk[2],.35,{c:P.c3,a:sA,r:.05,speed:1.4,n:6});R.flowArc(rk[2],rk[1],.55,{c:P.c3,a:sA*.8,r:.05,speed:1.4,n:6});
      lab([G.NX[1]-.1,ys+.3,0],'4 ranks · loss '+B.gloss.toFixed(4)+' at step 200',{dy:-30,mono:true,fs:12,c:P.c3,a:sA,wide:1})}
    // recorded: the usage goes to slurmdbd
    if(k===5){[0,1].forEach(n=>R.flowArc([LP[n][0],LP[n][1],.3],[DBD[0]-.4,.6,ZC],1.1,{c:P.c5,a:e,r:.06,speed:1.4}));
      lab([(QP[0][0]+QP[1][0])/2,0,ZQ+.55],'79 recorded: billing=5,cpu=4,gres/gpu=4,node=2',{dy:16,mono:true,fs:12,b:1,c:P.c5,a:e});
      lab([LP[0][0],LP[0][1]+.1,.3],'COMPLETED '+clk(T.epi).slice(0,8),{dy:-16,b:1,mono:true,fs:12,c:P.good,a:e})}
  }
  const full={cam:[.14,.9],bounds:[[-5.4,0,-3.3],[4.7,.9,3.35]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Hero · job 79 through the lab cluster, from its log',cam:full.cam,bounds:full.bounds,aspect:.52,dur:1500,hold:4800,draw,
    view:k=>k===4?{cam:[.24,.6],bounds:[[-5.2,0,-1.4],[2.4,1.7,1.6]]}:full,
    margin:w=>w<520?[16,10,16,10]:[22,16,20,16]});
  (window.SLSTG=window.SLSTG||{})['stg-hero']=st;
})();
