// ---- Scene, Fig. 2 (actors): three Counter actors from ry_core.py, a stateful process receiving calls in order, then killed (renderer v2) ----
// Numbers from window.RY: tasks.actor_create, actor_rtt, rtt, actor_batch and fault.actors (where each actor lived, what the next call returned).
(function(){
  if(!document.getElementById('stg-actor')||!window.RY||!window.RYG)return;const {at,off,lerp,mix}=S3;
  const Y=window.RY,G=window.RYG,T=Y.tasks,FA=Y.fault.actors,A1=FA.find(a=>a.case==='actor_restart_1'),A0=FA.find(a=>a.case==='actor_restart_0');
  const ni=h=>({'ray-head':0,'ray-w1':1,'ray-w2':2})[h];
  const f2=x=>x.toFixed(2);
  const HOME=ni(T.actor_create.host),K1=ni(A1.host_pid_before[0]),K1b=ni(A1.host_pid_after[0]),K0=ni(A0.host_pid_before[0]);
  window.RY_ACT={create:T.actor_create.secs,rtt:T.actor_rtt.median_ms,trtt:T.rtt.median_ms,batch:T.actor_batch.secs,first:T.actor_batch.first,last:T.actor_batch.last,before:A1.before[A1.before.length-1],after:A1.after,die:A1.die_call.type,dead:A0.after_error.type,homes:[HOME,K1,K1b,K0]};
  const HL=[0,0,2.4];
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6.2,6.2,-2.2,2.2,.5);
    G.slab(R,0,{tint:P.c4});
    R.box(G.GCS,[1.2,.55,.8],{fill:mix(P.paper,P.c4,.45),a:k===0||k===3?1:.3});lab([G.GCS[0],.75,G.GCS[2]],'GCS',{dy:-8,b:1,c:P.c4,a:k===0||k===3?1:.5});
    G.raylet(R,G.HRL,{a:.3});
    R.box(G.DRV,[1.05,.5,.75],{fill:mix(P.paper,P.acc,.35)});lab([G.DRV[0],.2,G.DRV[2]+.4],'driver',{dy:12,b:1,c:P.acc});
    [1,2].forEach(i=>{G.wnode(R,i,{dim:.35});lab([G.NX[i]-G.SW/2+.1,0,G.SD/2],(i===1?'w1':'w2')+' · 2 CPUs',{al:'left',dy:14,b:1,a:.8})});
    lab([G.NX[0]-G.SW/2+.1,0,G.SD/2],'head',{al:'left',dy:14,b:1,c:P.c4,a:.8});
    const act=(i,j,a,o)=>{o=o||{};if(a<=.01)return;const p=G.WK(i,j);R.box(p,[.56,.8,.6],{fill:o.dead?mix(P.paper,P.bad,.5):mix(P.paper,P.c2,.55),a,lw:.8});return p};
    // 1. Counter.remote(): the GCS places the actor and a dedicated process starts on w1
    const a1=k===0?e:k<=2?1:k===3?1-e*.8:0;
    const p1=G.WK(HOME,0);act(HOME,0,a1);
    if(k===0){R.flowArc([G.DRV[0]-.3,.5,G.DRV[2]],[G.GCS[0],.6,G.GCS[2]],.5,{c:P.c4,a:Math.min(1,e*2),r:.06,n:5,speed:1.2});
      R.flowArc([G.GCS[0]+.3,.6,G.GCS[2]],[p1[0],.9,p1[2]],1.4,{c:P.c4,a:e,r:.07,n:12,speed:1.5});
      lab(HL,'Counter.remote(): a process on w1 in '+f2(T.actor_create.secs)+' s · __init__ sets n = 0',{b:1,c:P.c2,a:e,wide:1})}
    const nlab=k===0?'n = 0':k===1?'n = 1 … 100':k===2?'n = '+T.actor_batch.first+' … '+T.actor_batch.last:'';
    if(nlab&&k<=2)lab([p1[0],.96,p1[2]],'Counter · '+nlab,{dy:-10,b:1,c:P.c2,a:a1});
    // 2. calls go straight from the driver to the actor's process, no scheduling decision
    if(k===1){R.flowArc([G.DRV[0]+.3,.55,G.DRV[2]],[p1[0],.9,p1[2]],1.2,{c:P.c2,a:e,r:.06,n:9,speed:1.6});
      lab(HL,'one call at a time: '+T.actor_rtt.median_ms.toFixed(2)+' ms round trip (a task: '+T.rtt.median_ms.toFixed(2)+' ms)',{b:1,c:P.c2,a:e,wide:1})}
    // 3. 1,000 calls queued at once: they wait in line and run one at a time, in submission order
    if(k===2){const q=10;for(let j=0;j<q;j++){const u=(j+1)/(q+1),x=lerp(G.DRV[0]+.6,p1[0]-.2,u),qa=e*(j<q*(1-e*.6)?1:.25);
        R.box([x,G.SH,lerp(G.DRV[2],p1[2],u)+.75],[.16,.16,.16],{fill:mix(P.paper,P.c2,.75),a:qa,shadow:false,lw:.5})}
      R.flowArc([G.DRV[0]+.3,.55,G.DRV[2]],[p1[0],.9,p1[2]],.8,{c:P.c2,a:e,r:.05,n:18,speed:2});
      lab(HL,'1,000 queued calls: '+f2(T.actor_batch.secs)+' s, values '+T.actor_batch.first+' to '+T.actor_batch.last+' in order',{b:1,c:P.c2,a:e,wide:1})}
    // 4. a second Counter, n at 3, is killed: the call in flight fails; max_restarts=1 brings up a new process, __init__ again
    if(k===3){const ka=e<.45?1:1-(e-.45)/.55*.65;const pk=act(K1,0,ka,{dead:e>.15});if(pk)lab([pk[0],.96,pk[2]],e<.15?'Counter · n = '+A1.before[A1.before.length-1]:'killed: '+A1.die_call.type,{dy:-10,b:1,c:e<.15?P.c2:P.bad,a:ka});
      const na=Math.max(0,(e-.4)/.6);const pn=act(K1b,1,na);if(pn){lab([pn[0],.96,pn[2]],'restarted · n = '+A1.after,{dy:-10,b:1,c:P.c2,a:na});
        R.flowArc([G.GCS[0]+.3,.6,G.GCS[2]],[pn[0],.9,pn[2]],1.5,{c:P.c4,a:na,r:.07,n:10,speed:1.5})}
      lab(HL,'max_restarts=1: new process on w1, __init__ again: the next call returns '+A1.after,{b:1,c:P.c2,a:e,wide:1})}
    if(k===4){act(K1b,1,.25);const pd=act(K0,0,1,{dead:e>.2});if(pd)lab([pd[0],.96,pd[2]],e<.2?'Counter · max_restarts=0':'dead: '+A0.after_error.type,{dy:-10,b:1,c:e<.2?P.c2:P.bad});
      lab(HL,'max_restarts=0 (the default): every later call raises '+A0.after_error.type,{b:1,c:P.bad,a:e,wide:1})}
  }
  const full={cam:[.12,.95],bounds:[[-5.7,0,-1.5],[5.7,1.4,2.5]]};
  const st=S3.stage({id:'stg-actor',list:'sx-actor',fig:'Fig. 2 · an actor is one process with state',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1400,hold:5000,draw,
    view:k=>k===1||k===2?{cam:[.2,.8],bounds:[[-5.7,0,-1.5],[1.9,1.4,2.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.RYSTG=window.RYSTG||{})['stg-actor']=st;
})();
