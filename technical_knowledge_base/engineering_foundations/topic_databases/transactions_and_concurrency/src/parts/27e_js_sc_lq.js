// ---- Scene, Fig. 6 (section 6): the table lock queue on messages, two recordings on PostgreSQL 16.2 (renderer v2) ----
// TXD.extras.traces.lock_queue (no timeout, steps 1 to 4) and lock_queue_timeout (step 5): A holds ACCESS SHARE, the migration B wants ACCESS EXCLUSIVE, C wants ACCESS SHARE.
(function(){
  if(!document.getElementById('stg-lq')||!window.TXD)return;const {mix,cl,lerp,lerp3,at,off}=S3,T=TXD.extras.traces,Q=T.lock_queue.tr,QT=T.lock_queue_timeout.tr;
  const ret=(tr,i)=>{for(const s of tr)for(const z of s.f||[])if(z.i===i)return z;return {}};
  const TB=[-3.3,0,0],GR=[[-1.1,0,-1.0],[-1.1,0,1.0]],SL=[[.85,0,1.0],[2.7,0,1.0]];
  function sess(R,p,name,mode,o){const P=R.P,a=o.a==null?1:o.a;if(a<=.01)return;
    const fill=o.err?mix(P.paper,P.bad,.45):o.wait?mix(P.paper,P.bad,.14):mix(P.paper,o.c,.32);
    R.box(p,[1.25,.42,.8],{fill,a,ec:o.wait?P.bad:undefined});R.label([p[0],.42,p[2]],name,{fs:12.5,b:1,dy:-11,a});
    R.label([p[0],0,p[2]+.4],mode,{fs:12,mono:true,dy:13,a,c:o.wait?P.bad:P.mute});if(o.sub)R.label([p[0],0,p[2]+.4],o.sub,{fs:12,dy:28,a,c:o.subC||P.mute,wide:1})}
  function draw(R,k,e){const P=R.P;R.grid(-5,4.4,-2.2,2.2,.5);
    R.box(TB,[1.5,.9,1.5],{fill:mix(P.paper,P.ink,.06)});R.label([TB[0],.9,TB[2]],'table messages',{fs:13,b:1,dy:-12});
    // the lock queue: a glass gate in front of the table; granted requests stand inside it, waiting ones queue outside
    R.glass([-2.15,0,-1.55],[0,0,3.1],[0,1,0],{c:P.c5,nu:6,nv:3,a:.55});R.label([-2.15,1,-1.55],'lock on messages',{fs:12,c:P.c5,b:1,dy:-8,wide:1});
    const A_ok='ACCESS SHARE',B_m='ACCESS EXCLUSIVE',t5=k===4;
    // A: the analytics transaction left open; granted from step 1, gone after its commit (step 4)
    const aA=k<3?at(k,e,0):k===3?1-e:cl(e*4,0,1);
    sess(R,GR[0],'A',A_ok,{c:P.c1,a:aA,sub:'granted · '+ret(Q,1).t});
    if(aA>.05&&k<3)R.flowArc([TB[0]+.6,.6,TB[2]-.4],[GR[0][0],.42,GR[0][2]],.4,{c:P.c1,a:aA,r:.06,n:5});
    if(!t5){
      // B: the migration; waits for A (steps 2 and 3), granted when A commits (step 4)
      const bIn=at(k,e,1),bp=k<3?SL[0]:lerp3(SL[0],GR[1],cl(e*2,0,1)),bDone=k===3&&e>.5;
      sess(R,bp,'B',B_m,{c:P.c2,a:bIn,wait:k<3||!bDone,sub:k<3?'waits for A':'granted · '+ret(Q,2).t,subC:k<3?P.bad:P.good});
      if(k>=1&&k<3)R.flowArc([bp[0]-.6,.3,bp[2]],[GR[0][0]+.6,.3,GR[0][2]],.3,{c:P.bad,a:bIn*.9,r:.05,n:5,speed:.8});
      // C: an ordinary read, which A's lock would allow: it queues behind B (step 3), runs after B (step 4)
      const cIn=at(k,e,2),cp=k<3?SL[1]:lerp3(SL[1],GR[0],cl(e*2-1,0,1)),cDone=k===3&&e>.9;
      sess(R,cp,'C',A_ok,{c:P.c3,a:cIn,wait:k===2||(k===3&&!cDone),sub:k<3?'waits behind B':cDone?'granted · '+ret(Q,3).t:'waits behind B',subC:cDone?P.good:P.bad});
      if(k===2)R.flowArc([cp[0]-.6,.3,cp[2]],[bp[0]+.6,.3,bp[2]],.3,{c:P.bad,a:cIn*.9,r:.05,n:5,speed:.8});
      if(k===3&&e>.5)R.flowArc([TB[0]+.6,.6,TB[2]+.3],[GR[1][0],.42,GR[1][2]],.4,{c:P.c2,a:cl(e*2-1,0,1),r:.06,n:5});
    }else{
      // with lock_timeout = 200ms: B waits, gives up with 55P03, and C is granted at once
      const z=ret(QT,2),bA=cl(e*4,0,1)*(1-.5*cl((e-.55)*3,0,1)),gave=e>.35;
      sess(R,SL[0],'B',B_m,{c:P.c2,a:bA,wait:!gave,err:gave,sub:gave?'55P03 after '+z.ms+' ms':'waits for A',subC:P.bad});
      const cp=lerp3(SL[1],GR[1],cl((e-.5)*3,0,1));sess(R,cp,'C',A_ok,{c:P.c3,a:cl((e-.3)*4,0,1),sub:e>.85?'granted · '+ret(QT,3).t:'',subC:P.good});
      if(e>.85)R.flowArc([TB[0]+.6,.6,TB[2]+.3],[GR[1][0],.42,GR[1][2]],.4,{c:P.c3,a:cl((e-.85)*6,0,1),r:.06,n:5})}
  }
  S3.stage({id:'stg-lq',list:'sx-lq',fig:'Fig. 4 · the lock queue on one table, recorded',cam:[-.25,.7],bounds:[[-4.2,0,-1.6],[3.5,1,1.8]],aspect:.55,dur:1800,hold:4800,draw,
    view:()=>innerWidth<520?{cam:[-.2,.9]}:null, // on a phone the camera looks down more, so the long scene uses the card's height
   
    margin:w=>w<520?[16,8,36,8]:[20,20,40,20]});
})();
