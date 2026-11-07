// ---- Scene, Fig. 3 (section 4): glibc's 0/1/2 lock word and the kernel's futex queue, three threads (renderer v2) ----
// The protocol is lowlevellock.h's (glibc 2.36) as simplified in the section; the kernel side is futex_wait_setup's "lock the bucket, then compare" (v5.10).
// Costs are the page's measured values: lk.S1.futex.wall, pp.1cpu.futex.half, pp.2cpu.futex.half.
(function(){
  if(!document.getElementById('stg-fx')||!window.CD)return;const {at,lerp,lerp3,mix,cl}=S3,V=window.CD.v;
  const YU=1.7,W=[0,YU,-.75],TA=[-2.1,YU,.45],TB=[0,YU,.45],TC=[2.1,YU,.45],Q=[.35,0,-.1],BL=[-1.55,0,-.1],SB=[-.25,.1,-.1],SC=[.95,.1,-.1];
  function thr(R,p,name,c,a,sl){const P=R.P;R.box(p,sl?[.7,.3,.5]:[.7,.55,.5],{fill:sl?mix(P.paper,c,.18):mix(P.paper,c,.5),a,dz:p[1]<.5?120:0,ec:sl?c:undefined});
    R.label([p[0],p[1]+(sl?.3:.55),p[2]],name,{fs:12.5,b:1,dy:-10,a,c:sl?P.mute:P.ink})}
  // the word's value and its holder at step k, progress e
  function word(k,e){if(k===0)return e<.5?[0,null]:[1,'A'];if(k===1)return e<.4?[1,'A']:[2,'A'];if(k<=3)return [2,'A'];if(k===4)return e<.3?[2,'A']:[0,null];
    if(k===5)return e<.4?[0,null]:[2,'B'];return e<.3?[2,'B']:e<.6?[0,null]:[2,'C']}
  const CAP=[['CAS(w, 0, 1) · '+V['lk.S1.futex.wall']+' ns · no system call','good'],['xchg(w, 2) returned 1: not mine, but marked','bad'],
    ['futex_wait(w, 2): lock bucket, w is still 2, sleep','bad'],['C: w is 2, so futex_wait(w, 2) too','bad'],
    ['xchg(w, 0) returned 2 → futex_wake(w, 1)','good'],['B: xchg(w, 2) returned 0 → owns it, as 2','good'],['B unlocks, wakes C; C takes it','good']];
  function draw(R,k,e){const P=R.P,cols={A:P.c1,B:P.c4,C:P.c3};R.grid(-4.2,4.2,-2,2,.5);
    R.quad([[-3.7,0,-1.5],[3.7,0,-1.5],[3.7,0,1.6],[-3.7,0,1.6]],{fill:mix(P.paper,P.c5,.1),edge:false,dz:200});
    R.glass([-3.7,YU,-1.5],[7.4,0,0],[0,0,2.5],{c:P.c1,nu:10,nv:3,a:.5,dz:60,th:.02});
    R.label([-3.7,YU,1],'user space',{al:'left',dx:4,dy:-12,fs:12.5,b:1,c:P.c1,grp:'side'});R.label([-3.7,0,1.6],'kernel',{al:'left',dx:4,dy:12,fs:12.5,b:1,c:P.c5,grp:'side'});
    // the lock word, its value and its holder
    const [v,h]=word(k,e);
    R.box(W,[1.2,.4,.7],{fill:v===2?mix(P.paper,P.bad,.22):mix(P.paper,P.ink,.05)});
    if(h)R.box([W[0],W[1]+.4,W[2]],[1.2,.06,.7],{fill:cols[h],shadow:false});
    R.label([W[0],YU+.46,W[2]],'w = '+v,{fs:15,b:1,mono:true,dy:-16,c:v===2?P.bad:P.ink});
    R.label([W[0]+.6,YU+.2,W[2]],v===0?'free':v===1?'held, nobody waiting':'held, someone may wait',{al:'left',dx:8,fs:12,c:P.mute,wide:1});
    // the kernel: one hash bucket's wait queue, and the bucket lock the compare happens under
    R.box(Q,[2.6,.08,.85],{fill:mix(P.paper,P.c5,.35),dz:130,shadow:false});R.label([Q[0],0,Q[2]+.45],'futex wait queue (hash bucket for &w)',{fs:12.5,b:1,dy:13,c:P.c5});
    const bl=k===2&&e>.15&&e<.75;R.box(BL,[.5,.32,.5],{fill:bl?mix(P.paper,P.c5,.7):mix(P.paper,P.c5,.25),dz:120});R.label([BL[0],.32,BL[2]],bl?'bucket locked':'bucket lock',{fs:12,dy:-9,c:P.c5,b:bl,wide:1});
    // the threads: B sleeps at step 3 and wakes at 5; C sleeps at 4 and wakes at 7
    const dB=k<2?0:k===2?cl(e*1.5-.35,0,1):k===3?1:k===4?1-cl(e*1.6-.5,0,1):0;
    const dC=k<3?0:k===3?cl(e*1.5-.2,0,1):k<6?1:1-cl(e*1.6-.4,0,1);
    thr(R,TA,'A',P.c1,k>=5?.45:1,false);
    thr(R,lerp3(TB,SB,dB),dB>.95?'B asleep':'B',P.c4,1,dB>.95);thr(R,lerp3(TC,SC,dC),dC>.95?'C asleep':'C',P.c3,1,dC>.95);
    // data moving: atomics on the word, system calls into the kernel, wake-ups back up
    const up=p=>[p[0],p[1]+.55,p[2]],wtop=[W[0],YU+.4,W[2]];
    if(k===0)R.flowArc(up(TA),wtop,.5,{c:P.c1,a:e,r:.06,n:6});
    if(k===1)R.flowArc(up(TB),wtop,.4,{c:P.c4,a:e,r:.06,n:6});
    if(k===2){R.flowArc([TB[0],YU,TB[2]],[BL[0],.3,BL[2]],.2,{c:P.c4,a:cl(e*3,0,1)*(1-cl(e*2-1,0,1)),r:.06,n:6,top:1});
      R.flowArc([W[0]-.3,YU,W[2]],[BL[0]+.1,.32,BL[2]],.1,{c:P.c5,a:cl(e*3-.5,0,1)*(1-cl(e*2-1.2,0,1)),r:.05,n:5,top:1});
      R.label([BL[0]-.3,.8,BL[2]],'compare: w == 2',{al:'right',fs:12,b:1,c:P.c5,a:cl(e*3-.6,0,1),wide:1})}
    if(k===3)R.flowArc([TC[0],YU,TC[2]],[SC[0],.3,SC[2]],.15,{c:P.c3,a:Math.min(1,e*2),r:.06,n:6,top:1});
    if(k===4){R.flowArc(up(TA),wtop,.5,{c:P.c1,a:1-cl(e*2-.6,0,1),r:.06,n:5});R.flowArc([TA[0],YU,TA[2]],[BL[0],.3,BL[2]],.2,{c:P.good,a:cl(e*3-.4,0,1),r:.06,n:6,top:1});
      R.flowArc([SB[0],.3,SB[2]],[TB[0],YU+.2,TB[2]],.2,{c:P.good,a:cl(e*2-.4,0,1),r:.07,n:7,top:1});
      R.label([TB[0]+.5,YU+.8,TB[2]],V['pp.1cpu.futex.half']+' µs same CPU · '+V['pp.2cpu.futex.half']+' µs across',{al:'left',dx:6,fs:12,b:1,c:P.good,a:cl(e*2-.6,0,1),wide:1})}
    if(k===5)R.flowArc(up(TB),wtop,.4,{c:P.c4,a:Math.min(1,e*2),r:.06,n:6});
    if(k===6){R.flowArc([TB[0],YU,TB[2]],[BL[0],.3,BL[2]],.2,{c:P.good,a:cl(e*3,0,1)*(1-cl(e*2-1,0,1)),r:.06,n:5,top:1});
      R.flowArc([SC[0],.3,SC[2]],[TC[0],YU+.2,TC[2]],.2,{c:P.good,a:cl(e*2-.3,0,1),r:.07,n:7,top:1})}
    const [t,c]=CAP[k];R.label([0,YU+1.25,0],t,{fs:13,b:1,mono:true,c:c==='good'?P.good:P.bad,a:Math.min(1,e*1.5),wide:1});
  }
  const full={cam:[-.3,.42],bounds:[[-3.6,0,-1.5],[3.6,3,1.5]]};
  S3.stage({id:'stg-fx',list:'sx-fx',fig:'Fig. 3 · one lock word, one futex queue',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    // steps 3 and 4 are about the kernel side: the camera comes down towards the queue
    view:k=>k===2||k===3?{cam:[-.18,.34],bounds:[[-2.6,0,-1.4],[2.6,2.9,1.3]]}:full,
    margin:w=>w<520?[16,8,30,8]:[18,16,30,16]});
})();
