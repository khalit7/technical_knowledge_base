// ---- Scene, Fig. 5 (section 6): a signal's life, from kill() to the handler and back (renderer v2) ----
// The counts are the page's recorded run (PD.sigq, src/runs/c/sigqueue.c): 1,000 SIGUSR1 and 1,000 SIGRTMIN sent while blocked, the handler's counts,
// and RLIMIT_SIGPENDING. Kernel functions at Linux v6.12 are named in the step list. The 20 queue boxes stand for the queued real-time signals.
(function(){
  if(!document.getElementById('stg-sig')||!window.PD)return;const {at,off,mix,cl,lerp}=S3;
  const Q=PD.sigq,fk=v=>v.toLocaleString('en-US');
  const YU=2.3,ZP=.55,BX=s=>-1.9+(s-1)*.135; // the 31 standard signals as bits; bit for signal s at BX(s)
  const SND=[-3.6,YU,-.7],MAIN=[.4,YU,-.7],HND=[2.7,YU,-.7],ENT=[-3.1,0,ZP],QX=3.0;
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.4,5.4,-2.2,2.4,.5);
    R.quad([[-4.6,0,-1.4],[4.4,0,-1.4],[4.4,0,1.6],[-4.6,0,1.6]],{fill:P.paper,edge:true,ea:.35,dz:200});
    R.label([-4.6,0,1.6],nar?'kernel':'kernel: the target process\'s record',{al:'left',dy:13,fs:12.5,b:1,c:P.c5});
    R.glass([-4.6,YU,-1.5],[9.0,0,0],[0,0,1.6],{c:P.c1,nu:10,nv:2,a:.34,dz:60,th:.02});
    R.label([4.4,YU,.1],'user space',{al:'right',dy:12,fs:12.5,b:1,c:P.c1});
    // processes and code on the plate
    const box=(c,s,f,lab,a,hl)=>{R.box(c,s,{fill:hl?mix(P.paper,P.c4,.4):f,a});R.label([c[0],c[1]+s[1],c[2]],lab,{fs:12.5,b:1,dy:-10,a:Math.max(.45,a),c:hl?P.c4:P.ink})};
    box(SND,[1.3,.45,.8],mix(P.paper,P.c1,.2),'sender',k===0?1:.5);
    box(MAIN,[1.6,.45,.8],mix(P.paper,P.c1,.2),nar?'main thread':'target: main thread',k>=4?1:.6,k===6);
    box(HND,[1.4,.45,.8],mix(P.paper,P.c1,.1),'handler()',k>=5?1:.45,k===5);
    // the kernel's side: entry, the ignored check, the pending bits, the real-time queue, the mask
    box(ENT,[1.0,.35,.7],mix(P.paper,P.c5,.3),nar?'send':'__send_signal_locked',k<=1?1:.5,false);
    // 1. kill(): the sender's call crosses down
    if(k===0){R.flow([[SND[0],YU,SND[2]],[ENT[0],.35,ENT[2]]],{c:P.c2,r:.07,n:6,a:e});R.label([SND[0],YU-.4,SND[2]+.2],'kill(pid, SIGTERM)',{fs:12.5,mono:true,b:1,c:P.c2,al:'left',dx:14,a:e})}
    // 2. ignored: dropped at once
    R.glass([-2.35,.02,ZP-.45],[0,.9,0],[0,0,.9],{c:P.bad,nu:1,nv:4,a:k===1?.9:.3});
    if(k===1){const t=e;R.ball([lerp(ENT[0]+.5,-2.35,cl(t*1.6,0,1)),.5,ZP],.1,{c:P.c4,a:t<.65?1:cl((1-t)*3,0,1),top:1});R.label([-2.35,.95,ZP],'ignored: dropped',{fs:12.5,b:1,dy:-10,c:P.bad,a:e})}
    // the pending set: one bit per standard signal
    const bitsA=k>=2?1:.35;for(let s=1;s<=31;s++){const on=(k>=2&&s===10)||(k>=5&&false);R.box([BX(s),0,ZP],[.11,on?.32:.08,.36],{fill:on?mix(P.paper,P.c4,.8):P.paper,a:bitsA,shadow:false,lw:.5})}
    R.label([BX(16),0,ZP+.2],nar?'pending bits':'pending: one bit per standard signal (1 to 31)',{fs:12,dy:13,c:P.mute,a:Math.max(bitsA,.5)});
    // 3. a thousand SIGUSR1 into one bit
    if(k===2){R.flow([[ENT[0]+.5,.3,ZP],[BX(5),.9,ZP],[BX(10),.32,ZP]],{c:P.c4,r:.06,n:14,speed:2.2,a:e});
      R.label([BX(10),.32,ZP],fk(Q.sent)+' SIGUSR1 sent: still 1 bit',{fs:12.5,b:1,dy:-34,c:P.c4,a:e})}
    // 4. real-time signals queue, each with its sender's information
    const qa=k<3?.25:k===3?1:.6,qn=k<3?0:k===3?Math.round(20*e):20;
    for(let i=0;i<20;i++)R.box([QX,i*.06,ZP],[.6,.05,.4],{fill:i<qn?mix(P.paper,P.c6,.6):P.paper,a:i<qn?qa:.18,shadow:i===0,lw:.5});
    R.label([QX,1.2,ZP],nar?'RT queue':'SIGRTMIN: a queue',{fs:12.5,b:1,dy:-10,c:P.c6,a:Math.max(qa,.5)});
    if(k===3){R.flow([[ENT[0]+.5,.3,ZP],[1.0,1.3,ZP],[QX,1.2,ZP]],{c:P.c6,r:.06,n:14,speed:2.2,a:e});
      if(!nar)R.label([QX,1.2,ZP],fk(Q.sent)+' sent, '+fk(Q.rt)+' handled; limit '+fk(Q.sigpending),{fs:12.5,b:1,dy:-30,al:'right',dx:40,c:P.c6,a:e})}
    // 5. the mask: a blocked signal stays pending; complete_signal wakes a thread that does not block it
    const ma=k===4?e:k>4?.35:0;
    if(ma>0){R.glass([BX(1)-.1,.42,ZP-.25],[BX(31)-BX(1)+.2,0,0],[0,0,.5],{c:P.c5,nu:31,nv:1,a:ma});
      R.label([BX(1),.42,ZP-.25],'mask: blocked here',{al:'left',dy:-10,fs:12.5,b:1,c:P.c5,a:ma});
      if(k===4)R.flowArc([BX(10),.4,ZP],[MAIN[0],YU,MAIN[2]],.4,{c:P.c4,r:.06,n:6,a:e})}
    // 6. delivered on the way back to user mode: a frame on the user stack, the program counter at the handler
    if(k===5){R.flowArc([BX(10),.35,ZP],[HND[0],YU+.2,HND[2]],.8,{c:P.c4,r:.075,n:9,a:e});
      R.label([HND[0],YU+.45,HND[2]],'frame on the user stack, pc = handler',{fs:12.5,b:1,dy:-30,c:P.c4,a:e,al:'right',dx:60})}
    // 7. the handler returns through a trampoline: rt_sigreturn restores the interrupted registers
    if(k===6){R.flowArc([HND[0],YU,HND[2]],[MAIN[0]+.5,.3,ZP-.6],.4,{c:P.c2,r:.065,n:6,a:e});R.flowArc([MAIN[0]+.2,.3,ZP-.6],[MAIN[0],YU,MAIN[2]],.4,{c:P.c2,r:.065,n:6,a:e});
      R.label([MAIN[0]+.5,.3,ZP-.6],'rt_sigreturn',{fs:12.5,mono:true,b:1,dy:-12,c:P.c2,a:e})}
  }
  S3.stage({id:'stg-sig',list:'sx-sig',fig:'Fig. 5 · a signal is recorded first, acted on later',cam:[.1,.62],bounds:[[-4.6,0,-1.5],[4.4,YU+.6,1.6]],aspect:.5,dur:1400,hold:5000,draw,
    margin:w=>w<520?[16,8,24,8]:[20,14,26,14]});
})();
