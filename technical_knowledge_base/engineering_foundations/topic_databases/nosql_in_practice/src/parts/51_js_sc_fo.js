// ---- Scene, Fig. 2 (section 3): the measured Redis failover (inputs/redis.json, replication), renderer v2 ----
// One slab is 1,000 acknowledged writes of 10 KB; the replica's thin sliver is the 53 writes that reached it during the pause.
(function(){
  if(!document.getElementById('stg-fo')||!window.NQ||!NQ.redis)return;const {at,off,lerp,mix}=S3;
  const R0=NQ.redis.replication,f0=n=>Math.round(n).toLocaleString('en-US'),tot=R0.before_acked+R0.during_acked;
  const CL=[-3.4,0,1.3],PR=[-.9,0,0],RP=[2.6,0,0],SH=.3,GAP=.05,PER=1000;
  // a node: a plinth with a stack of slabs, one per 1,000 writes; a part slab for the remainder
  function stack(R,c,n,o){const P=R.P,full=Math.floor(n/PER),part=n/PER-full;
    for(let j=0;j<full;j++)R.box([c[0],.2+j*(SH+GAP),c[2]],[.95,SH,.95],{fill:o.fill(j),a:o.a(j),shadow:false,ec:o.ec?o.ec(j):null,lw:.8});
    if(part>0)R.box([c[0],.2+full*(SH+GAP),c[2]],[.95,Math.max(.02,SH*part),.95],{fill:o.fill(full),a:o.a(full),shadow:false})}
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-2.6,2.8,.5);
    const dead=k>=3,paused=k>=1&&k<=3,promo=k===4;
    // the client
    R.box(CL,[.8,.5,.6],{fill:mix(P.paper,P.c2,.2)});R.label([CL[0],.5,CL[2]],'clients',{fs:12.5,b:1,dy:-12});
    // plinths
    R.box(PR,[1.5,.2,1.5],{fill:dead?mix(P.paper,P.bad,.35*(k===3?e:1)):P.paper,ec:dead?P.bad:null});
    R.box(RP,[1.5,.2,1.5],{fill:paused?mix(P.paper,P.c5,.45):promo?mix(P.paper,P.good,.3*e):P.paper});
    // the primary's acknowledged writes: 1,000 before the pause, then 6,000 in all; gone after the kill
    const pn=k<2?R0.before_acked*(k===0?e:1):k===2?R0.before_acked+R0.during_acked*e:tot;
    stack(R,PR,pn,{fill:j=>dead?mix(P.paper,P.bad,.25):mix(P.paper,P.c1,j<1?.45:.75),a:j=>dead?(k===3?1-.75*e:.25):1,ec:j=>dead?P.bad:null});
    // the replica: 1,000 copied before the pause, plus the 53 that slipped through
    const rn=k===0?R0.before_on_replica*e:k===1?R0.before_on_replica:R0.before_on_replica+R0.during_survived*(k===2?e:1);
    stack(R,RP,rn,{fill:j=>mix(P.paper,promo&&j===0?P.good:P.c1,.45),a:()=>1});
    // flows: writes from the clients to the primary; OK back; copies to the replica (only while it is not paused)
    const top=.2+6*(SH+GAP)+.15;
    if(k===0||k===2){R.flowArc([CL[0]+.3,.5,CL[2]],[PR[0]-.2,.2+(k===2?5:1)*(SH+GAP)*Math.max(.3,k===2?e:1),PR[2]],.5,{c:P.c2,a:1,r:.07,n:k===2?12:6,speed:1.6});
      R.flowArc([PR[0]-.5,.3,PR[2]+.6],[CL[0]+.35,.25,CL[2]-.1],.25,{c:P.good,a:.9,r:.05,n:5,speed:1.3})}
    if(k===0)R.flowArc([PR[0]+.6,.45,PR[2]],[RP[0]-.6,.45,RP[2]],.45,{c:P.c1,a:e,r:.07,n:7});
    if(k===2)R.flowArc([PR[0]+.6,.45,PR[2]],[RP[0]-.6,.45,RP[2]],.45,{c:P.c1,a:.5,r:.035,n:2,speed:.4});
    if(paused&&!promo)R.arc([PR[0]+.6,.45,PR[2]],[RP[0]-.6,.45,RP[2]],.45,{c:P.line,w:1.4,dash:[5,4],a:.9});
    if(promo)R.flowArc([CL[0]+.3,.55,CL[2]],[RP[0]-.3,.6,RP[2]+.3],1.0,{c:P.c2,a:e,r:.06,n:8});
    // labels
    R.label([PR[0],0,PR[2]+.75],promo?'old primary':'primary',{fs:13,b:1,dy:16,c:dead?P.bad:P.ink});
    R.label([RP[0],0,RP[2]+.75],promo?'replica, now primary':'replica',{fs:13,b:1,dy:16,c:promo?P.good:paused?P.c5:P.ink});
    const pTop=.2+Math.ceil(pn/PER)*(SH+GAP);
    if(!promo)R.label([PR[0],pTop,PR[2]],dead?'killed: '+f0(tot)+' acknowledged writes gone':f0(Math.round(pn))+' acknowledged',{mono:true,fs:12.5,b:1,dy:-14,c:dead?P.bad:P.c1});
    R.label([RP[0],.2+Math.ceil(rn/PER)*(SH+GAP),RP[2]],promo?'has '+f0(rn)+' of '+f0(tot):paused?'paused · '+f0(Math.round(rn)):f0(Math.round(rn))+' copied',{mono:true,fs:12.5,b:1,dy:-14,c:promo?P.bad:paused?P.c5:P.c1});
    if(k===0)R.label([(PR[0]+RP[0])/2,.9,0],'copy after OK · WAIT returned '+R0.wait_before,{fs:12,c:P.mute,dy:-8,wide:1});
    if(k===2)R.label([1.6,2.5,0],'WAIT 1 500 returned '+R0.wait_during,{mono:true,fs:12.5,b:1,c:P.c5,dy:-8});
    if(promo)R.label([PR[0],pTop,PR[2]],f0(R0.lost)+' acknowledged writes lost',{fs:15,b:1,c:P.bad,dy:-14,a:e});
    if(k===0||k===2)R.label([CL[0],0,CL[2]+.3],'OK to every write',{fs:12,c:P.good,dy:16,wide:1});
  }
  const full={cam:[.28,.42],bounds:[[-3.9,0,-.9],[3.4,2.3,1.9]]};
  S3.stage({id:'stg-fo',list:'sx-fo',fig:'Fig. 2 · a failover, measured: 1 slab = 1,000 writes',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:4600,draw});
})();
