// ---- Scene, Fig. 4 (section 6): the recorded Python deadlock as a cycle of threads and locks (renderer v2) ----
// deadlock.py (src/runs/py): logger takes metrics_lock then ckpt_lock (lines 11, 13); saver the opposite (19, 21). Steps 5 and 6 read the recording
// window.CD.raw.deadlock (py-spy dump, then /proc state and wait channel per thread, then the --ordered run).
(function(){
  if(!document.getElementById('stg-dl')||!window.CD)return;const {at,lerp,lerp3,mix,cl}=S3,RAW=window.CD.raw.deadlock;
  // where py-spy found each thread (its first frame in deadlock.py), how many threads sleep on a futex, and the --ordered run's last line
  const where={};RAW.split(/\nThread /).slice(1).forEach(b=>{const n=(b.match(/"(\w+)"/)||[])[1],f=(b.match(/\(deadlock\.py:(\d+)\)/)||[])[1];if(n&&f)where[n]='deadlock.py:'+f});
  const nfx=(RAW.match(/state S wchan futex_wait_queue_me/g)||[]).length,fin=RAW.trim().split('\n').pop().trim();
  const YU=1.6,LM=[-1.9,YU,-.65],LK=[1.9,YU,-.65],TL=[-1.9,YU,.75],TS=[1.9,YU,.75],TM=[0,YU,1.25],QM=[-1.9,0,-.2],QK=[1.9,0,-.2];
  const SL=[QK[0],.1,QK[2]],SS=[QM[0],.1,QM[2]];
  function thr(R,p,name,c,a,sl,sub){const P=R.P;R.box(p,sl?[.95,.28,.5]:[.95,.5,.5],{fill:sl?mix(P.paper,c,.2):mix(P.paper,c,.5),a,dz:p[1]<.5?120:0,ec:sl?c:undefined});
    R.label([p[0],p[1]+(sl?.28:.5),p[2]],name,{fs:12.5,b:1,dy:-10,a,c:sl?P.mute:P.ink});if(sub)R.label([p[0],p[1]+(sl?.28:.5),p[2]],sub,{fs:12,mono:true,b:1,dy:-27,a,c:P.bad,wide:1})}
  function lock(R,p,name,holder,a){const P=R.P;R.box(p,[1.3,.36,.62],{fill:mix(P.paper,P.ink,.05),a});if(holder)R.box([p[0],p[1]+.36,p[2]],[1.3,.06,.62],{fill:holder,a,shadow:false});
    R.label([p[0],p[1]+.36,p[2]],name,{fs:12.5,b:1,mono:true,dy:-12,a})}
  function draw(R,k,e){const P=R.P,cL=P.c1,cS=P.c4;R.grid(-4,4,-2,2,.5);
    R.quad([[-3.4,0,-1.4],[3.4,0,-1.4],[3.4,0,1.8],[-3.4,0,1.8]],{fill:mix(P.paper,P.c5,.1),edge:false,dz:200});
    R.glass([-3.4,YU,-1.4],[6.8,0,0],[0,0,3.1],{c:P.c1,nu:9,nv:4,a:.5,dz:60,th:.02});
    R.label([-3.4,YU,1.7],'user space',{al:'left',dx:4,dy:-12,fs:12.5,b:1,c:P.c1,grp:'side'});R.label([-3.4,0,1.8],'kernel',{al:'left',dx:4,dy:12,fs:12.5,b:1,c:P.c5,grp:'side'});
    [[QM,'futex queue: metrics_lock'],[QK,'futex queue: ckpt_lock']].forEach(([q,t])=>{R.box(q,[1.5,.08,.75],{fill:mix(P.paper,P.c5,.35),dz:130,shadow:false});R.label([q[0],0,q[2]+.4],t,{fs:12,dy:13,c:P.c5,wide:1})});
    const ord=k===5,old=ord?1-cl(e*2.5,0,1):1,nw=ord?cl(e*2.5-1,0,1):0;
    if(!ord||old>.01){const a=old;
      // steps 1 and 2: each takes its first lock; 3 and 4: each asks for the other's and parks under it
      const hM=k>=0&&(k>0||e>.5)?cL:null,hK=k>=1&&(k>1||e>.5)?cS:null;
      lock(R,LM,'metrics_lock',hM,a);lock(R,LK,'ckpt_lock',hK,a);
      const dL=k<2?0:k===2?cl(e*1.5-.3,0,1):1,dS=k<3?0:k===3?cl(e*1.5-.3,0,1):1;
      const rec=k>=4;
      thr(R,lerp3(TL,SL,dL),'logger',cL,a,dL>.95,rec&&where.logger?where.logger:'');thr(R,lerp3(TS,SS,dS),'saver',cS,a,dS>.95,rec&&where.saver?where.saver:'');
      if(k>=3)thr(R,TM,'MainThread',P.mute,a*(k===3?e:1),false,rec&&where.MainThread?'join() · '+where.MainThread:'');
      const top=p=>[p[0],p[1]+.36,p[2]];
      if(k===0)R.flowArc([TL[0],YU+.5,TL[2]],top(LM),.4,{c:cL,a:e,r:.06,n:6});
      if(k===1)R.flowArc([TS[0],YU+.5,TS[2]],top(LK),.4,{c:cS,a:e,r:.06,n:6});
      if(k===2)R.flowArc([TL[0],YU,TL[2]],[SL[0],.3,SL[2]],.4,{c:P.bad,a:Math.min(1,e*2)*(1-cl(e*2-1.2,0,1)),r:.06,n:7,top:1});
      if(k===3)R.flowArc([TS[0],YU,TS[2]],[SS[0],.3,SS[2]],.4,{c:P.bad,a:Math.min(1,e*2)*(1-cl(e*2-1.2,0,1)),r:.06,n:7,top:1});
      // the cycle: each sleeper waits for the lock above it, whose holder is the other sleeper
      if(k>=3&&k<=4||ord){const ca=(k===3?cl(e*2-1,0,1):1)*a;
        R.flow([[SL[0],.35,SL[2]],[LK[0],YU,LK[2]]],{c:P.bad,a:ca,r:.06,n:6,speed:.8});R.flow([[LK[0]-.4,YU+.2,LK[2]],[SS[0]+.3,.3,SS[2]]],{c:cS,a:ca*.8,r:.05,n:8,speed:.8});
        R.flow([[SS[0],.35,SS[2]],[LM[0],YU,LM[2]]],{c:P.bad,a:ca,r:.06,n:6,speed:.8});R.flow([[LM[0]+.4,YU+.2,LM[2]],[SL[0]-.3,.3,SL[2]]],{c:cL,a:ca*.8,r:.05,n:8,speed:.8});
        R.glow([0,YU*.55,-.4],2.4,{c:P.bad,a:ca*.22});
        R.label([0,YU+1.15,0],k===4?nfx+' threads in state S on futex_wait_queue_me · 0% CPU':'a cycle: nobody can move',{fs:13,b:1,c:P.bad,a:ca,wide:1})}
      if(k===2)R.label([0,YU+1.15,0],'logger waits for ckpt_lock, holding metrics_lock',{fs:12.5,b:1,c:P.bad,a:e,wide:1});
    }
    if(ord&&nw>.01){const a=nw;
      // --ordered: saver also asks for metrics_lock first and waits holding nothing; logger takes both, finishes; then saver
      const t=cl(e*2.5-1,0,1);lock(R,LM,'metrics_lock',t<.7?cL:cS,a);lock(R,LK,'ckpt_lock',t<.7?cL:null,a);
      const dS=t<.7?cl(t*3,0,1):1-cl((t-.7)*5,0,1);
      thr(R,TL,'logger',cL,a*(t<.75?1:.4),false,'');thr(R,lerp3(TS,SS,dS),'saver',cS,a,dS>.95,'');
      R.label([0,YU+1.15,0],t<.7?'saver waits holding nothing: no cycle':'--ordered: "'+fin+'"',{fs:13,b:1,c:P.good,a,wide:1})}
  }
  S3.stage({id:'stg-dl',list:'sx-dl',fig:'Fig. 4 · a recorded deadlock, then one lock order',cam:[-.28,.42],bounds:[[-3.2,0,-1.4],[3.2,2.9,1.7]],aspect:.62,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,8,30,8]:[18,16,30,16],view:()=>innerWidth<520?{cam:[-.28,.72]}:null});
})();
