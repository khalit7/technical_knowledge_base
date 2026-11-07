// ---- Scene, Fig. 5 (section 8): one input through four I/O designs (renderer v2) ----
// Eight connections; data arrives on 2, then 5, 2, 7. The program sits on the user-space plate, sockets and the kernel's lists on the floor.
// The counters are the same event-by-event bookkeeping the page used before (one frame per kernel event, grouped here into five explained steps);
// the measured numbers in the step lists come from window.CD (conns, ev, ur).
(function(){
  if(!document.getElementById('stg-ev')||!window.CD)return;const {at,lerp,lerp3,mix,cl}=S3,C=window.CD.conns;
  const N=8,ARR=[2,5,2,7],YU=1.6;
  // frames: d = counter increments {sys, kchk (descriptors the kernel checked), uscan (entries the program scanned), ctx (thread wake-ups)}
  function frames(mode){const F=[],add=d=>F.push(Object.assign({sys:0,kchk:0,uscan:0,ctx:0},d||{}));
    if(mode==='threads'){add({sys:8});ARR.forEach(()=>{add();add({ctx:1});add({sys:1,ctx:1})})}
    else if(mode==='poll'){add();ARR.forEach(()=>{add({sys:1,kchk:8});add({kchk:8,ctx:1});add({uscan:8});add({sys:1})})}
    else if(mode==='epoll'){add({sys:9});ARR.forEach(()=>{add({sys:1});add({kchk:1,ctx:1});add();add({sys:1})})}
    else{add({sys:2});ARR.forEach(()=>{add({sys:1});add({kchk:1,ctx:1});add({uscan:1});add()})}
    return F}
  // the last frame each explained step reaches
  const MAP={threads:[0,2,3,12,12],poll:[0,1,3,4,16],epoll:[0,1,3,4,16],uring:[0,1,2,4,16]};
  const ARRSTEP={threads:3,poll:4,epoll:4,uring:4};
  let mode='threads';
  const X=i=>(i-(N-1)/2)*.8,SK=i=>[X(i),0,1.45],TH=i=>[X(i),YU,.55],LOOP=[0,YU,.55],CHK=i=>[X(i),0,.45],LST=i=>[X(i),YU,-.45];
  const IL=[-1.5,0,-.55],RL=[1.5,0,-.55],RING=(cx,i)=>{const a=Math.PI/2-i/N*Math.PI*2;return [cx+.6*Math.cos(a),YU-.3+.6*Math.sin(a),-.75]};
  function counters(k){const F=frames(mode),j=MAP[mode][k],s={sys:0,kchk:0,uscan:0,ctx:0};for(let i=0;i<=j;i++)for(const x in s)s[x]+=F[i][x];return s}
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-2,2.6,.5);
    R.quad([[-3.6,0,-1.4],[3.6,0,-1.4],[3.6,0,2.1],[-3.6,0,2.1]],{fill:mix(P.paper,P.c5,.1),edge:false,dz:200});
    R.glass([-3.6,YU,-1.4],[7.2,0,0],[0,0,2.5],{c:P.c1,nu:9,nv:3,a:.5,dz:60,th:.02});
    R.label([-3.6,YU,1.1],'your program',{al:'left',dx:4,dy:-12,fs:12.5,b:1,c:P.c1,grp:'side'});R.label([-3.6,0,2.1],'kernel',{al:'left',dx:4,dy:12,fs:12.5,b:1,c:P.c5,grp:'side'});
    const arr=k===ARRSTEP[mode],hot=arr?[5,2,7]:(mode==='threads'?(k===1||k===2):(k===2||k===3))?[2]:[];
    // the eight sockets; data arriving streams in from the front
    for(let i=0;i<N;i++){const h=hot.includes(i);
      R.box(SK(i),[.5,.32,.45],{fill:h?mix(P.paper,P.c6,.55):P.paper,dz:120});R.label([SK(i)[0],.32,SK(i)[2]],String(i),{fs:12,b:h,dy:-9,c:h?P.c6:P.mute})}
    const inflow=(i,a)=>R.flow([[X(i),.25,2.5],[X(i),.25,SK(i)[2]+.2]],{c:P.c6,a,r:.06,n:4});
    const dataStep=mode==='threads'?1:2;
    if(k===dataStep)inflow(2,cl(e*3,0,1));if(arr)[5,2,7].forEach(i=>inflow(i,.8));
    const up=(i,a,c,to)=>R.flowArc([X(i),.32,SK(i)[2]],to,.3,{c:c||P.c6,a,r:.06,n:7,top:1});
    const S=counters(k);
    R.label([0,YU+1.75,0],'system calls '+S.sys+' · thread wake-ups '+S.ctx,{fs:12.5,mono:true,b:1,c:P.ink});
    R.label([0,YU+1.75,0],'kernel checked '+S.kchk+' · program scanned '+S.uscan,{fs:12.5,mono:true,dy:18,c:P.mute});
    if(mode==='threads'){
      for(let i=0;i<N;i++){const awake=(k===1||k===2)&&i===2&&!(k===2&&e>.7)||arr&&[5,2,7].includes(i)&&e<.8;
        R.box(TH(i),awake?[.5,.5,.45]:[.5,.3,.45],{fill:awake?mix(P.paper,P.c3,.6):mix(P.paper,P.c3,.15),ec:awake?undefined:P.c3});
        if(i===0||i===7||awake)R.label([TH(i)[0],YU+(awake?.5:.3),TH(i)[2]],awake?'runs':'zz',{fs:12,dy:-9,c:awake?P.c3:P.mute})}
      if(k===0)for(let i=0;i<N;i++)R.flowArc([X(i),YU,.55],[X(i),.32,SK(i)[2]],.15,{c:P.c3,a:.6*e,r:.04,n:4});
      if(k===1)up(2,cl(e*3-.6,0,1),P.c6,[X(2),YU,.55]);
      if(k===2)R.flowArc([X(2),YU,.55],[X(2),.32,SK(2)[2]],.15,{c:P.c3,a:Math.min(1,e*2),r:.05,n:5,top:1});
      if(arr)[5,2,7].forEach(i=>up(i,.8,P.c6,[X(i),YU,.55]));
      if(k===4)R.label([0,YU+1.75,0],(C.threads.threads).toLocaleString('en-US')+' threads · '+C.threads.vsz.toLocaleString('en-US')+' MiB virtual · '+C.threads.rss_added+' MiB more resident',{fs:12.5,b:1,dy:38,wide:1,c:P.c3});
    }else{
      const asleep=(mode==='epoll'||mode==='uring')&&k===1||mode==='poll'&&k===1&&e>.6;
      R.box(LOOP,asleep?[1.1,.32,.6]:[1.1,.55,.6],{fill:asleep?mix(P.paper,P.c3,.15):mix(P.paper,P.c3,.55),ec:asleep?P.c3:undefined});
      R.label([0,YU+(asleep?.32:.55),LOOP[2]],asleep?'one thread, asleep':'one thread',{fs:12.5,b:1,dy:-10,c:asleep?P.mute:P.ink});
      const L=[0,YU,LOOP[2]];
      if(mode==='poll'){
        // the kernel checks every descriptor on every call; the program then scans its whole list
        const kc=k===1||k===2||arr,us=k===2||arr;
        for(let i=0;i<N;i++){R.box(CHK(i),[.5,.08,.35],{fill:kc?mix(P.paper,P.c2,.6):mix(P.paper,P.c2,.12),dz:110,shadow:false});
          R.box(LST(i),[.45,.1,.35],{fill:us?mix(P.paper,P.c4,.55):mix(P.paper,P.c4,.12),shadow:false})}
        R.label([X(0)-.3,0,CHK(0)[2]],'kernel checks',{al:'right',dx:-4,fs:12,c:P.c2,grp:'side'});R.label([X(0)-.3,YU,LST(0)[2]],'your list',{al:'right',dx:-4,fs:12,c:P.c4,grp:'side'});
        if(k===1||arr)for(let i=0;i<N;i++)R.flowArc(L,[X(i),.08,CHK(i)[2]],.2,{c:P.c2,a:.55,r:.04,n:4,top:1});
        if(k===2)up(2,cl(e*2-.4,0,1),P.c6,L);if(k===3)up(2,1,P.c3,L);if(arr)[5,2,7].forEach(i=>up(i,.7,P.c6,L));
        if(k===4)R.label([0,YU+1.75,0],'10,000 watched: one poll '+window.CD.v['ev.10000.poll_us']+' µs',{fs:12.5,b:1,dy:38,wide:1,c:P.c2});
      }else if(mode==='epoll'){
        // the interest list is registered once; the callback puts only the ready socket on the ready list
        R.box(IL,[1.6,.3,.7],{fill:mix(P.paper,P.ink,.06),dz:110});R.label([IL[0],.3,IL[2]],'interest list · 8',{fs:12,b:1,dy:-10});
        R.box(RL,[1.6,.1,.7],{fill:mix(P.paper,P.c6,.3),dz:115,shadow:false});R.label([RL[0],.1,RL[2]],'ready list',{fs:12,b:1,dy:-10,c:P.c6});
        for(let i=0;i<N;i++)R.line([[IL[0],.15,IL[2]+.35],[X(i),.05,SK(i)[2]-.22]],{c:P.c5,w:1,a:k===0?.6*e:.25,dz:118});
        if(k===0)R.flowArc(L,[IL[0],.3,IL[2]],.15,{c:P.c5,a:e,r:.06,n:7,top:1});
        const items=k===2||k===3&&e<.5?[2]:arr?[5,2,7]:[];
        items.forEach((i,j)=>{R.box([RL[0]-.45+j*.45,.1,RL[2]],[.36,.24,.36],{fill:mix(P.paper,P.c6,.6),dz:112,shadow:false});R.label([RL[0]-.45+j*.45,.34,RL[2]],String(i),{fs:12,b:1,dy:-8,c:P.c6})});
        if(k===2||arr)(arr?[5,2,7]:[2]).forEach(i=>R.flowArc([X(i),.32,SK(i)[2]],[RL[0],.15,RL[2]],.3,{c:P.c6,a:.8,r:.05,n:6,top:1}));
        if(k===2||arr)R.flowArc([RL[0],.3,RL[2]],L,.2,{c:P.c6,a:cl(e*2-.5,0,1),r:.06,n:6,top:1});
        if(k===3)up(2,1,P.c3,L);
        if(k===4)R.label([0,YU+1.75,0],'10,000 watched: one epoll_wait '+window.CD.v['ev.10000.epoll']+' ns',{fs:12.5,b:1,dy:38,wide:1,c:P.c6});
      }else{
        // io_uring: two rings in memory shared by program and kernel
        const sqC=-2.3,cqC=2.3,used=k===2||k===3&&e<.4?[2]:arr?[5,2,7]:[];
        for(let i=0;i<N;i++){const pend=k>=0&&!(used.includes(i)&&k!==3);R.box(RING(sqC,i),[.26,.26,.26],{fill:pend?mix(P.paper,P.c2,.55):P.paper,a:k===0?e:1,shadow:false});
          const cq=used.includes(i);R.box(RING(cqC,i),[.26,.26,.26],{fill:cq?mix(P.paper,P.c6,.65):P.paper,shadow:false})}
        R.label([sqC,YU-.95,-.75],'submission ring',{fs:12,b:1,dy:12,c:P.c2});R.label([cqC,YU-.95,-.75],'completion ring',{fs:12,b:1,dy:12,c:P.c6});
        if(k===0)R.flowArc(L,[sqC,YU-.3,-.75],.2,{c:P.c2,a:e,r:.06,n:7,top:1});
        if(k===2||arr)(arr?[5,2,7]:[2]).forEach(i=>{R.flowArc([X(i),.32,SK(i)[2]],[cqC,YU-.85,-.75],.4,{c:P.c6,a:.75,r:.05,n:6,top:1});R.flowArc([X(i),.32,SK(i)[2]],[X(i)*.3,YU,LOOP[2]],.3,{c:P.c3,a:.6,r:.05,n:5,top:1})});
        if(k===3){R.flowArc([cqC,YU-.3,-.75],L,.2,{c:P.c6,a:Math.min(1,e*2),r:.06,n:6,top:1});R.flowArc(L,[sqC,YU-.3,-.75],.2,{c:P.c2,a:cl(e*2-.6,0,1),r:.06,n:6,top:1})}
        if(k===4)R.label([0,YU+1.75,0],'cached reads: '+window.CD.v['ur.enter']+' io_uring_enter calls, not '+(+window.CD.v['ur.pread_calls']).toLocaleString('en-US')+' preads',{fs:12.5,b:1,dy:38,wide:1,c:P.c2});
      }
    }
  }
  const st=S3.stage({id:'stg-ev',list:'sx-ev-threads',fig:'Fig. 5 · eight connections, four designs',cam:[-.22,.44],bounds:[[-3.4,0,-1.3],[3.4,3.4,2.3]],aspect:.66,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,26,8]:[16,16,26,16]});
  RD.seg(document.getElementById('ev-mode'),m=>{mode=m;['threads','poll','epoll','uring'].forEach(x=>{document.getElementById('sx-ev-'+x).hidden=x!==m});st.list('sx-ev-'+m)});
})();
