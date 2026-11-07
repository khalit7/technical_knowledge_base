// ---- Scene, Fig. 1 (the idea in one screen): every wait ends in one of two kernel queues (renderer v2) ----
// User space is a glass plate above the kernel's floor. Left: three threads and one lock word; contended threads drop through the plate into the
// futex queue and rise when woken. Right: one event-loop thread, eight sockets, epoll's interest list and ready list.
// Costs are the page's measured values (window.CD.v): lk.S1.mutex.wall, pp.1cpu.futex.half, pp.2cpu.futex.half, ev.10000.epoll, ev.10000.poll_us.
(function(){
  if(!document.getElementById('stg-hero')||!window.CD)return;const {at,off,lerp,lerp3,mix,cl}=S3,V=window.CD.v,la=a=>a>.5?a:0; // labels of the half a step is not about are hidden
  const YU=1.7,WD=[-2.5,YU,-.75],TA=[-3.75,YU,.5],TB=[-2.5,YU,.5],TC=[-1.25,YU,.5],QB=[-3.1,.1,-.1],QC=[-1.9,.1,-.1],Q=[-2.5,0,-.1];
  const LOOP=[2.5,YU,.3],IL=[1.75,0,-.35],RL=[3.55,0,-.35],SK=i=>[.95+i*.5,0,1.4];
  // a thread: a block standing on the plate (or lying in a queue when asleep)
  function thr(R,p,name,c,a,o){o=o||{};const P=R.P,sl=o.sleep;
    R.box(p,sl?[.62,.3,.46]:[.62,.5,.46],{fill:sl?mix(P.paper,c,.18):mix(P.paper,c,.5),a,dz:p[1]<.5?120:0,ec:sl?c:undefined});
    R.label([p[0],p[1]+(sl?.3:.5),p[2]],name,{fs:12.5,b:1,dy:-10,a:la(a),c:sl?P.mute:P.ink})}
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-2,2,.5);
    const L=k===0?1:k<=3?1:.22,Rt=k===0?1:k>=4?1:.22;
    // the kernel floor (drawn first) and the user-space plate above it
    R.quad([[-5.1,0,-1.65],[5.1,0,-1.65],[5.1,0,1.9],[-5.1,0,1.9]],{fill:mix(P.paper,P.c5,.1),edge:false,dz:200});
    R.glass([-5.1,YU,-1.65],[10.2,0,0],[0,0,2.65],{c:P.c1,nu:12,nv:3,a:.5,dz:60,th:.02});
    R.label([-5.1,YU,1],'user space',{al:'left',dx:4,dy:-12,fs:12.5,b:1,c:P.c1,grp:'side'});
    R.label([-5.1,0,1.9],'kernel',{al:'left',dx:4,dy:12,fs:12.5,b:1,c:P.c5,grp:'side'});
    // ---- left: the lock word and its futex queue ----
    const w=k<1?0:k===1?(e<.5?0:1):k===2?(e<.3?1:2):2;
    R.box(WD,[.95,.34,.6],{fill:k===2&&e>.3?mix(P.paper,P.bad,.25):mix(P.paper,P.ink,.06),a:L});
    R.label([WD[0],YU+.34,WD[2]],'lock word w = '+w,{fs:12.5,b:1,mono:true,dy:-17,a:la(L),c:w===2?P.bad:P.ink});
    R.box(Q,[2.1,.08,.95],{fill:mix(P.paper,P.c5,.35),a:L,dz:130,shadow:false});
    R.label([Q[0],0,Q[2]+.5],'futex queue for w',{fs:12.5,b:1,dy:13,a:la(L),c:P.c5});
    // thread A holds the lock from step 2; B and C drop into the queue at step 3; B rises at step 4
    thr(R,TA,'A',P.c1,L);
    if(k>=1&&k<=2||k===3&&e<.5){const a=k===1?e:1;R.box([WD[0],YU+.34,WD[2]],[.95,.05,.6],{fill:P.c1,a:a*L*.9,shadow:false})}
    const dropB=k<2?0:k===2?cl(e*1.6,0,1):1-cl(e*1.6-.6,0,1),dropC=k<2?0:k===2?cl(e*1.6-.4,0,1):1;
    const pB=lerp3(TB,QB,dropB),pC=lerp3(TC,QC,dropC);
    thr(R,pB,dropB>.95?'B asleep':'B',P.c4,L,{sleep:dropB>.95});thr(R,pC,dropC>.95?'C asleep':'C',P.c3,L,{sleep:dropC>.95});
    if(k===3&&e>.5)R.box([WD[0],YU+.34,WD[2]],[.95,.05,.6],{fill:P.c4,a:cl(e*2-1,0,1)*L,shadow:false});
    if(k===1)R.flowArc([TA[0],YU+.5,TA[2]],[WD[0]-.3,YU+.34,WD[2]],.5,{c:P.c1,a:e,r:.06,n:6});
    if(k===1)R.label([-2.5,YU+1.05,0],'one CAS · '+V['lk.S1.mutex.wall']+' ns · no system call',{fs:12.5,c:P.good,b:1,a:e,wide:1});
    if(k===2){R.flowArc([WD[0],YU,WD[2]],[Q[0],.1,Q[2]],.15,{c:P.bad,a:Math.min(1,e*2),r:.06,n:7,speed:.9,top:1});
      R.label([-2.5,YU+1.05,0],'futex_wait(w, 2) · asleep, no CPU',{fs:12.5,b:1,c:P.bad,a:e,wide:1})}
    if(k===3){R.flowArc([TA[0],YU+.5,TA[2]],[WD[0]-.3,YU+.34,WD[2]],.5,{c:P.c1,a:1-e,r:.06,n:5});
      R.flowArc([QB[0],.3,QB[2]],[TB[0],YU+.3,TB[2]],.2,{c:P.good,a:Math.min(1,e*2),r:.07,n:7,top:1});
      R.label([-2.5,YU+1.05,0],'futex_wake(w, 1) · '+V['pp.1cpu.futex.half']+' µs same CPU, '+V['pp.2cpu.futex.half']+' µs across',{fs:12.5,b:1,c:P.good,a:e,wide:1})}
    // ---- right: one event loop, eight sockets, epoll's two lists ----
    thr(R,LOOP,'event loop',P.c6,Rt);
    for(let i=0;i<8;i++){const hot=k===5&&i===5;R.box(SK(i),[.36,.3,.36],{fill:hot?mix(P.paper,P.c6,.6):P.paper,a:Rt,dz:120});
      if(i===0||i===7||hot)R.label([SK(i)[0],.3,SK(i)[2]],String(i),{fs:12,dy:-9,a:la(Rt),b:hot,c:hot?P.c6:P.mute})}
    R.label([SK(0)[0]-.3,0,SK(0)[2]],'sockets',{al:'right',dx:-4,fs:12,c:P.mute,a:la(Rt),grp:'side'});
    R.box(IL,[1.25,.22,.7],{fill:mix(P.paper,P.ink,.06),a:Rt*(k>=4?1:.6),dz:120});R.label([IL[0],.22,IL[2]+.35],'interest list',{fs:12,dy:12,a:la(Rt),c:P.ink});
    R.box(RL,[1.25,.1,.7],{fill:mix(P.paper,P.c6,.3),a:Rt,dz:125,shadow:false});R.label([RL[0],.1,RL[2]+.35],'ready list',{fs:12,dy:12,a:la(Rt),b:1,c:P.c6});
    if(k===4){const a=Math.min(1,e*1.5);R.flowArc([LOOP[0],YU,LOOP[2]],[IL[0],.22,IL[2]],.1,{c:P.c6,a,r:.06,n:7,top:1});
      for(let i=0;i<8;i++)R.line([[IL[0],.12,IL[2]-.3],SK(i)],{c:P.c6,w:1,a:a*.45,dz:118});
      R.label([2.7,YU+1.05,0],'epoll_ctl(ADD) once each, then epoll_wait sleeps',{fs:12.5,c:P.c6,b:1,a:e,wide:1})}
    if(k===5){const s5=SK(5);R.flow([[s5[0],.3,s5[2]+1.2],[s5[0],.3,s5[2]]],{c:P.c6,a:cl(e*3,0,1),r:.06,n:4});
      R.flowArc([s5[0],.3,s5[2]],[RL[0],.15,RL[2]],.3,{c:P.c6,a:cl(e*3-.5,0,1),r:.06,n:6});
      R.box([RL[0],.1,RL[2]],[.3,.22,.3],{fill:mix(P.paper,P.c6,.6),a:cl(e*3-1,0,1),shadow:false,dz:115});R.label([RL[0],.32,RL[2]],'[5]',{fs:12,b:1,mono:true,dy:-9,c:P.c6,a:cl(e*3-1,0,1)});
      R.flowArc([RL[0],.3,RL[2]],[LOOP[0]+.2,YU+.2,LOOP[2]],.3,{c:P.c6,a:cl(e*3-1.4,0,1),r:.07,n:7,top:1});
      R.label([2.7,YU+1.05,0],'epoll_wait returns [5] · '+V['ev.10000.epoll']+' ns at 10,000 watched',{fs:12.5,c:P.c6,b:1,a:cl(e*2-.6,0,1),wide:1})}
  }
  const full={cam:[-.3,.4],bounds:[[-5.2,0,-1.7],[5.2,2.8,1.7]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · two kernel queues, measured costs',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    // the camera moves in on the half a step is about: the futex side (steps 2 to 4), then the I/O side (5 and 6)
    view:k=>k>=1&&k<=3?{cam:[-.38,.36],bounds:[[-4.5,0,-1.6],[-.3,2.8,1.6]]}:k>=4?{cam:[-.2,.36],bounds:[[.4,0,-1.6],[5.2,2.8,1.6]]}:full,
    margin:w=>w<520?[16,8,30,8]:[18,16,30,16]});
})();
