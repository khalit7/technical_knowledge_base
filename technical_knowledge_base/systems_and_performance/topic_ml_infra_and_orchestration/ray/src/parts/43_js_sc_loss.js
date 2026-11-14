// ---- Scene, Fig. 3 (failures): one worker node killed, six fates decided by owner and lineage (renderer v2) ----
// Everything from window.RY.lineage: where A, B, C, D and the two actors were placed, the GCS log lines (health checks, node death),
// the re-executed task, and each ray.get's answer and time after the kill. Positions are schematic.
(function(){
  if(!document.getElementById('stg-loss')||!window.RY||!window.RYG)return;const {at,off,lerp,mix}=S3;
  const Y=window.RY,G=window.RYG,L=Y.lineage,g=k=>L.gets.find(x=>x.obj===k),f1=x=>x.toFixed(1);
  const HC=L.events.filter(x=>/health check failed/.test(x.what)).map(x=>x.t),DEAD=L.events.find(x=>x.what==='node marked dead').t,REC=L.events.find(x=>/lineage/.test(x.what)).t;
  const A=g('A_task_output'),B=g('B_task_output_no_retries'),C=g('C_put_inside_task'),D=g('D_small_inline'),a1=g('actor_max_restarts_1'),a0=g('actor_max_restarts_0');
  window.RY_LOSS={HC,DEAD,REC,A,B,C,D,a1,a0};
  const HL=[0,0,2.4],W=2;
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6.2,6.2,-2.2,2.2,.5);
    // the cluster; from step 2 on, w2 is gone (tinted, faded): nobody knows it yet until step 4
    // step 6 is a close view of w1 and w2: the head's labels, cut by the frame, fade out there
    const hd=k===5?1-e:k===6?e:1;
    G.slab(R,0,{tint:P.c4});
    const gA=k===2||k===3?1:.3;
    R.box(G.GCS,[1.2,.55,.8],{fill:mix(P.paper,P.c4,.45),a:gA});lab([G.GCS[0],.75,G.GCS[2]],'GCS',{dy:-8,b:1,c:P.c4,a:Math.max(.5,gA)*hd});
    G.raylet(R,G.HRL,{a:.3});
    R.box(G.DRV,[1.05,.5,.75],{fill:mix(P.paper,P.acc,.35)});lab([G.DRV[0],.2,G.DRV[2]+.4],'driver: owns A, B, D',{dy:12,b:1,c:P.acc,a:(k===0||k===1||k===4?1:.7)*hd});
    G.wnode(R,1,{dim:k===4||k===6?1:.35});
    const dead=k>=1,gone=k>=3;
    G.wnode(R,W,{dim:dead?.25:.6,dead:dead});
    lab([G.NX[0]-G.SW/2+.1,0,G.SD/2],'head',{al:'left',dy:14,b:1,c:P.c4,a:.8*hd});
    lab([G.NX[1]-G.SW/2+.1,0,G.SD/2],'w1',{al:'left',dy:14,b:1,a:.8});
    lab([G.NX[W]-G.SW/2+.1,0,G.SD/2],gone?'w2 · DEAD at '+f1(DEAD)+' s':dead?'w2 · killed at 0 s':'w2',{al:'left',dy:14,b:1,c:dead?P.bad:P.ink,a:dead&&k===1?e:1});
    // D: 1 KB, inline, in the driver's memory
    const dp=[G.DRV[0]+.75,G.SH,G.DRV[2]-.55];
    R.box(dp,[.26,.22,.26],{fill:k===1?mix(P.paper,P.good,.6):mix(P.paper,P.acc,.6),shadow:false,lw:.7});lab([dp[0]+.15,.3,dp[2]],k>=1?'D: returned at once':'D · 1 KB',{al:'left',dx:6,b:k===1,c:k===1?P.good:P.ink,a:k<=1?1:k<4?.6:0,grp:'d'});
    // A, B, C in w2's store; the two actors on w2's worker processes
    const objs=[['A',0],['B',1],['C',2]];
    objs.forEach(([n,j])=>{const p=G.OBJ(W,j);let c=mix(P.paper,P.c1,.75),a=1,t=n+' · 8 MB';
      if(dead){c=mix(P.paper,P.mute,.35);a=.55;t=n}
      if(n==='A'&&k>=4){a=.2}
      if((n==='B'||n==='C')&&k>=5){c=mix(P.paper,P.bad,.55);a=k===5?lerp(.55,1,e):1;t=k===5?(n==='B'?'B: '+B.type:'C: '+C.type):n+': lost'}
      G.obj(R,p,{c,a});lab([p[0]+.35,.4,p[2]],t,{al:'left',dx:6,b:k===5&&n!=='A',c:k>=5&&n!=='A'?P.bad:P.ink,a:n==='A'&&k>=4?.35:k===6?.6:1,grp:'w2'})});
    const acts=[[0,'max_restarts=1'],[1,'max_restarts=0']];
    acts.forEach(([j,t])=>{const p=G.WK(W,j);const fade=k===6&&j===0?.25:1;R.box(p,[.5,.7,.55],{fill:dead?(k===6&&j===1?mix(P.paper,P.bad,.55):mix(P.paper,P.mute,.35)):mix(P.paper,P.c2,.55),a:(dead?.6:1)*fade,lw:.7});
      if(k===0||k===6)lab([p[0],.9,p[2]],k===6?(j===0?'':'dead: '+a0.type):t,{dy:-8-14*j,b:k===6,c:k===6?P.bad:P.c2,a:k===6&&j===0?0:1,grp:'act'})});
    if(k===0)lab(HL,'before the kill: A, B, C in w2\'s store, two actors on w2; D inline in the driver',{b:1,a:e,wide:1});
    if(k===1){R.flowArc([dp[0],.25,dp[2]],[G.DRV[0],.6,G.DRV[2]],.3,{c:P.good,a:e,r:.05,n:3,speed:1});
      lab(HL,'docker kill at 0 s · ray.get(D) returns at once: it was never on w2',{b:1,c:P.good,a:e,wide:1})}
    // the GCS health checks: five failures, the first 11.7 s after the kill
    if(k===2||k===3){const n=k===2?Math.max(1,Math.ceil(e*HC.length)):HC.length;
      R.flowArc([G.GCS[0]+.2,.7,G.GCS[2]],[G.RL(W)[0],.4,G.RL(W)[2]],1.8,{c:P.c4,a:k===2?Math.min(1,e*2):1-e,r:.07,n:14,speed:1.4});
      for(let j=0;j<HC.length;j++)R.box([G.GCS[0]-.6+j*.3,G.SH,G.GCS[2]-.65],[.2,.2,.2],{fill:j<n?mix(P.paper,P.bad,.6):P.paper,shadow:false,lw:.6,a:1});
      lab([G.GCS[0],.4,G.GCS[2]-.65],'health checks failed '+n+' of 5',{dy:-16,b:1,c:P.bad,grp:'hc'});
      if(k===2)lab(HL,'failed checks at '+HC.map(f1).join(', ')+' s after the kill',{b:1,c:P.c4,a:e,wide:1});
      else lab(HL,'node declared dead at '+f1(DEAD)+' s: placement groups and actors rescheduled',{b:1,c:P.bad,a:e,wide:1})}
    // A rebuilt: the owner re-runs its task on w1 from the lineage it kept
    if(k>=4){const p=G.OBJ(1,0),ra=k===4?e:1;
      if(k===4){R.flowArc([G.DRV[0]+.3,.55,G.DRV[2]],[G.WK(1,0)[0],.6,G.WK(1,0)[2]],1.3,{c:P.acc,a:Math.min(1,e*2),r:.075,n:10,speed:1.6});
        R.flowArc([G.WK(1,0)[0]+.2,.5,G.WK(1,0)[2]],[p[0],.45,p[2]],.5,{c:P.good,a:e,r:.075,n:6,speed:1.2});
        lab(HL,'A rebuilt from lineage: task re-run on w1 at '+f1(REC)+' s, ray.get(A) returned after '+f1(A.secs)+' s',{b:1,c:P.good,a:e,wide:1})}
      G.obj(R,p,{c:mix(P.paper,P.good,.55),a:ra});lab([p[0]+.35,.4,p[2]],'A: rebuilt',{al:'left',dx:6,b:1,c:P.good,a:k===5?0:ra})}
    if(k===5)lab([3,0,HL[2]],'B: owner alive, retries off · C: owner died with w2 ('+f1(C.done_t)+' s)',{b:1,c:P.bad,a:e,wide:1});
    // the actors: the one with a restart comes back on w1 with fresh state; the other is dead
    if(k===6){const p=G.WK(1,1);R.box(p,[.5,.7,.55],{fill:mix(P.paper,P.c2,.55),a:e,lw:.7});
      R.flowArc([G.GCS[0]+.3,.6,G.GCS[2]],[p[0],.8,p[2]],1.5,{c:P.c4,a:e,r:.07,n:10,speed:1.5});
      lab([p[0],.9,p[2]],'restarted · next call: '+a1.value,{dy:-8,b:1,c:P.c2,a:e});
      lab(HL,'max_restarts=1: restarted on w1, __init__ again · max_restarts=0: '+a0.type,{b:1,c:P.c2,a:e,wide:1})}
  }
  const full={cam:[.12,.95],bounds:[[-5.7,0,-1.5],[5.7,1.4,2.5]]};
  const st=S3.stage({id:'stg-loss',list:'sx-loss',fig:'Fig. 3 · one node lost, six fates',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1400,hold:5200,draw,
    view:k=>k===4?{cam:[.18,.85],bounds:[[-5.7,0,-1.5],[1.9,1.4,2.5]]}:k===5?{cam:[.1,.85],bounds:[[-0.4,0,-1.5],[8,1.4,2.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.RYSTG=window.RYSTG||{})['stg-loss']=st;
})();
