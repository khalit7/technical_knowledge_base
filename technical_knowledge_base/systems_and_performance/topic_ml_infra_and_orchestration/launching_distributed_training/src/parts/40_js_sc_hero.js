// ---- Scene, Fig. 1 (the idea): the six links of a launch on two nodes of two ranks, the Slurm run of the parent's Launch lab (renderer v2) ----
// Stage times are LD.stages.slurm (medians of 5 runs); the variables on each worker are LD.envrec.slurm (recorded on every rank);
// the timeouts are the defaults section 7 links. Positions of nodes, agents, store and ranks are schematic.
(function(){
  if(!document.getElementById('stg-hero')||!window.LD)return;const {at,off,lerp,mix}=S3;
  const D=window.LD,SG=D.stages.slurm.stages,EV=D.envrec.slurm,f2=x=>x.toFixed(2),f1=x=>x.toFixed(1);
  const T={sched:SG[0][1],srun:SG[1][1],imp:SG[2][1],rdzv:SG[3][1],spawn:SG[4][1],pg:SG[5][1],ddp:SG[6][1],first:SG[7][1],total:D.stages.slurm.total};
  window.LD_HERO=T;
  const HL=[0,0,2.45],NX=[-2.6,2.6],AG=k=>[NX[k]-.9,.2,-.8],ST=[NX[0]+.95,.2,-.8],SCH=[0,0,-3.3];
  const RK=r=>{const k=r>>1,j=r&1;return [NX[k]+(j?.95:-.95),.2,.85]};
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6,6,-4.4,2.8,.5);
    // composition: what the step is about at full strength, the rest recedes
    const dim=(on)=>on?1:.28;
    // 1. the scheduler and the two nodes it allocates
    const sa=k===0?1:.3;R.box(SCH,[2.6,.5,.8],{fill:mix(P.paper,P.c3,.45),a:sa});lab([SCH[0],.5,SCH[2]],'slurmctld',{dy:-12,b:1,c:P.c3,a:Math.max(.5,sa)});
    [0,1].forEach(n=>{const na=k===0?e:1;R.box([NX[n],0,0],[4.2,.2,3.1],{fill:mix(P.paper,P.ink,.05),a:na,dz:200});
      lab([NX[n]-2.1,0,1.55],'node '+n,{al:'left',dy:14,b:1,a:na*(k===0?1:.75)});
      if(k===0)R.flowArc([SCH[0]+(n?.6:-.6),.5,SCH[2]],[NX[n],.25,-1.2],.8,{c:P.c3,a:e,r:.06,n:6,speed:1.4})});
    if(k===0)lab(HL,'sbatch to batch script: '+f2(T.sched)+' s',{b:1,c:P.c3,a:e,wide:1});
    // 2. srun starts one torchrun agent per node
    const aa=k<1?0:k===1?e:1;
    [0,1].forEach(n=>{const p=AG(n);R.box(p,[1.35,.45,.8],{fill:mix(P.paper,P.c5,.5),a:aa*dim(k<=3)});
      lab([p[0],.65,p[2]],'torchrun agent',{dy:-10,fs:12,b:k===1||k===2,c:P.ink,a:aa*(k<=3?1:.5),grp:'ag'});
      if(k===1)R.flowArc([SCH[0]+(n?.6:-.6),.5,SCH[2]],[p[0],.65,p[2]],.9,{c:P.c5,a:e,r:.06,n:6,speed:1.4})});
    if(k===1)lab(HL,'srun '+f2(T.srun)+' s, then torchrun imports '+f2(T.imp)+' s',{b:1,c:P.c5,a:e,wide:1});
    // 3. the agents meet at the c10d store hosted by node 0's agent: node ranks and the number of nodes
    const sta=k<2?0:k===2?e:1;
    R.box(ST,[1.25,.5,.8],{fill:mix(P.paper,P.acc,.45),a:sta*dim(k===2||k===4)});
    lab([ST[0],.7,ST[2]],k>=4?'workers\' store :'+EV[0].MASTER_PORT:'c10d store :29500',{dy:-10,b:1,c:P.acc,a:sta*(k===2||k===4?1:.6),grp:'ag'});
    if(k===2){[0,1].forEach(n=>{const p=AG(n);R.flowArc([p[0],.65,p[2]],[ST[0],.7,ST[2]],n?1.3:.45,{c:P.acc,a:e,r:.065,n:7,speed:1.5});
        lab([p[0],.2,p[2]+.4],'GROUP_RANK '+EV[n*2].GROUP_RANK,{dy:16,b:1,c:P.acc,a:e})});
      lab(HL,'GROUP_WORLD_SIZE '+EV[0].GROUP_WORLD_SIZE+' · rendezvous '+f2(T.rdzv)+' s · join timeout 600 s',{b:1,c:P.acc,a:e,wide:1})}
    // 4. each agent spawns one worker per GPU and hands it its numbers
    const wa=k<3?0:k===3?e:1;
    for(let r=0;r<4;r++){const p=RK(r),hot=k===3||k===5;
      R.box(p,[1.3,.42,.9],{fill:hot?mix(P.paper,P.acc,.18):P.paper,a:wa});
      lab([p[0],.62,p[2]],'RANK '+EV[r].RANK,{dy:-10,fs:12,b:k===3,a:wa*(k>=3?1:.5)});lab([p[0],.2,p[2]+.45],'LOCAL_RANK '+EV[r].LOCAL_RANK,{dy:12,fs:12,c:P.mute,a:wa*(k===3?1:0)});
      if(k===3)R.flowArc([AG(r>>1)[0],.45,AG(r>>1)[2]+.4],[p[0],.45,p[2]-.45],.5,{c:P.c5,a:e,r:.055,n:5,speed:1.3})}
    if(k===3)lab(HL,'WORLD_SIZE '+EV[0].WORLD_SIZE+' · MASTER_ADDR '+EV[0].MASTER_ADDR+':'+EV[0].MASTER_PORT+' · '+f2(T.spawn)+' s',{b:1,c:P.c5,a:e,wide:1});
    // 5. init_process_group: each rank writes its gloo address to the store and connects to every other rank (a full mesh)
    if(k===4){for(let r=0;r<4;r++)R.flowArc([RK(r)[0],.45,RK(r)[2]-.45],[ST[0],.7,ST[2]],.6+.15*r,{c:P.acc,a:e*.8,r:.05,n:4,speed:1.3})}
    if(k>=4){const ma=k===4?e:k===5?.7:1;for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=RK(i),b=RK(j),h=.35+.18*Math.abs(i-j);
      R.flowArc([a[0],.42,a[2]+.2],[b[0],.42,b[2]+.2],h,{c:P.c4,a:ma*.85,r:.045,n:4,speed:1.1})}}
    if(k===4)lab(HL,'init_process_group '+(T.pg*1000).toFixed(0)+' ms · gloo: a full mesh of TCP',{b:1,c:P.c4,a:e,wide:1});
    // 6. the first step: DDP broadcasts rank 0's weights, then the first gradient all-reduce
    if(k===5){for(let r=1;r<4;r++)R.flowArc([RK(0)[0],.5,RK(0)[2]],[RK(r)[0],.5,RK(r)[2]],.9,{c:P.acc,a:e,r:.07,n:7,speed:1.6});
      lab(HL,'DDP wrapper '+f2(T.ddp)+' s, first step '+f2(T.first)+' s · submit to step 1: '+f1(T.total)+' s',{b:1,c:P.acc,a:e,wide:1})}
  }
  const full={cam:[.1,.95],bounds:[[-5,0,-3.8],[5,1.4,2.7]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · a launch on two nodes, measured on Slurm',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5200,draw,
    view:k=>k===2?{cam:[.2,.85],bounds:[[-4.4,0,-1.6],[3,1.4,2.6]]}:k===3?{cam:[.12,.85],bounds:[[-5,0,-1.4],[5,1.2,2.7]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.LDSTG=window.LDSTG||{})['stg-hero']=st;
})();
