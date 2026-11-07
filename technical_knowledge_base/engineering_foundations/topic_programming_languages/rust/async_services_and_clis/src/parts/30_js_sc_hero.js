// ---- Scene, Fig. 1 (the idea): tokio's multi-thread runtime as its documentation describes it (renderer v2, 2026-11-07) ----
// Four workers on the floor, a local queue tray in front of each, the global queue, the I/O driver with its parked tasks and the
// blocking pool at the back. Seven steps follow the step list sx-hero: poll, Pending and parking, waking (onto another worker, as in
// the recorded 4-worker run), work stealing (half of a queue), a CPU loop holding a worker, spawn_blocking. The queue contents are
// illustrative (the page says so); the numbers in the step list are the docs' and this page's runs.
(function(){
  if(!document.getElementById('stg-hero')||!window.S3)return;const {lerp,mix}=S3;
  const WX=[-3.3,-1.1,1.1,3.3],WZ=.2,QZ=1.55,GZ=-2.2,DX=-3.2,BX=[2.7,3.3,3.9],BZ=-2.3;
  // where every task is at the end of each step (null: not there); L<w>:<slot> local queue, W<w> being polled, G global queue, D parked, B blocking pool
  const T={
    R:['L1:0','W1','D:0','W2','W2','W2','W2'],
    a:['L1:1','L1:0','W1','W1','W1','W1','W1'],
    b:['L1:2','L1:1','L1:0','L1:0','L1:0','L1:0','L1:0'],
    h:['L1:3','L1:2','L1:1','L1:1','L1:1','L1:1','L1:1'],
    i:['L1:4','L1:3','L1:2','L1:2','L4:0','L4:0','L4:0'],
    j:['L1:5','L1:4','L1:3','L1:3','L4:1','L4:1','L4:1'],
    c:['L2:0','W2','W2',null,null,null,null],
    d:['L3:0','W3','W3','W3','W3','W3','B:0'],
    e:['L3:1','L3:0','L3:0','L3:0','L3:0','L3:0','W3'],
    f:['G:0','W4','W4','W4',null,null,null],
    g:['G:1','G:0','G:0','G:0','G:0','G:0','G:0'],
    p:['D:1','D:1','D:1','D:1','D:1','D:1','D:1'],
    q:['D:2','D:2','D:2','D:2','D:2','D:2','D:2']};
  // what each step is about: everything else recedes
  const FOCUS=[null,['R','f','c','d','w1','w2','w3','w4','G'],['R','a','w1','D'],['R','c','w2','D'],['i','j','w1','w4','q1','q4'],['d','e','w3','q3'],['d','e','w3','B']];
  const inF=(k,id)=>!FOCUS[k]||FOCUS[k].includes(id);
  function pos(s){if(!s)return null;const [a,b]=s.split(':'),n=+b;
    switch(a[0]){case 'L':{const w=+a[1]-1;return [WX[w]-.72+n*.29,.02,QZ]}
      case 'W':return [WX[+a[1]-1],.5,WZ];case 'G':return [-.75+n*.34,.035,GZ];case 'D':return [DX-.45+n*.42,.02,-1.72];case 'B':return [BX[n],.45,BZ]}}
  function draw(R,k,e){const P=R.P,fx=id=>k===0?1:lerp(inF(k-1,id)?1:.28,inF(k,id)?1:.28,e);
    const fa=fx;R.grid(-5.5,5.5,-3.3,2.6,.5);
    // the four workers and their local queues
    WX.forEach((x,w)=>{const id='w'+(w+1),a=fx(id),hot=w===2&&k===5;
      R.box([x,0,WZ],[1.5,.5,.9],{fill:hot?mix(P.paper,P.bad,.3*e+.05):mix(P.paper,P.c1,.12),a});
      R.label([x,0,WZ+.45],'worker '+(w+1),{fs:12.5,b:1,dy:12,c:hot?P.bad:P.ink,a:Math.max(.45,a)});
      R.glass([x-.9,.01,QZ-.3],[1.8,0,0],[0,0,.6],{c:P.c1,nu:6,nv:1,th:.03,a:fx('q'+(w+1))*.9,dz:200})});
    R.label([WX[0]-.95,0,QZ],'local queues',{al:'right',fs:12,c:P.mute,dx:-4,wide:1});
    if(k===5)R.label([WX[2],.5,WZ],'no .await: worker held',{fs:12,b:1,c:P.bad,dy:-34,a:e});
    // the global queue
    R.glass([-1.05,.01,GZ-.33],[2.1,0,0],[0,0,.66],{c:P.c5,nu:6,nv:1,th:.03,a:fx('G'),dz:200});R.label([0,0,GZ+.33],'global queue',{fs:12,b:1,c:P.c5,dy:11,a:Math.max(.45,fx('G'))});
    // the I/O driver and timers: an upright glass plate with a tray of parked tasks in front
    {const a=fx('D');R.glass([DX-.95,0,-2.55],[1.9,0,0],[0,1.05,0],{c:P.c6,nu:6,nv:4,a});
      R.label([DX,1.05,-2.55],'I/O driver + timers',{fs:12.5,b:1,c:P.c6,dy:-10,a:Math.max(.5,a)});R.label([DX,1.05,-2.55],'epoll / kqueue via mio',{fs:12,c:P.mute,dy:-26,a:Math.max(.5,a),wide:1});
      R.quad([[DX-.75,.004,-2.0],[DX+.75,.004,-2.0],[DX+.75,.004,-1.45],[DX-.75,.004,-1.45]],{fill:mix(P.paper,P.c6,.12),ec:P.c6,ea:.5,a,dz:200});
      R.label([DX,0,-1.45],'parked at .await',{fs:12,c:P.c6,dy:11,a:Math.max(.45,a),wide:1})}
    // the blocking pool
    {const a=fx('B');BX.forEach(x=>R.box([x,0,BZ],[.5,.45,.5],{fill:mix(P.paper,P.c4,.18),a}));R.label([BX[1],.45,BZ],'blocking pool',{fs:12.5,b:1,c:P.c4,dy:-24,a:Math.max(.5,a)})}
    // the tasks: each glides from where it was at the end of the last step, data flowing along the move
    Object.entries(T).forEach(([id,L])=>{const s0=k>0?L[k-1]:L[0],s1=L[k],p0=pos(s0),p1=pos(s1);if(!p0&&!p1)return;
      const gone=!p1,born=!p0,pa=p0||p1,pb=p1||p0,moved=!gone&&!born&&Math.hypot(pa[0]-pb[0],pa[2]-pb[2],pa[1]-pb[1])>.05;
      const p=moved?R.arcPt(pa,pb,.6,e):pb,al=(gone?1-e:born?e:1)*fa(id),on=s1&&s1[0]==='W',red=id==='d'&&k>=5;
      const base=id==='R'?P.acc:red?P.bad:s1&&s1[0]==='D'?P.c6:P.c1,sz=on?.36:.24;
      R.box(p,[sz,sz,sz],{fill:mix(P.paper,base,id==='R'?.75:red?.6:.35),a:al,shadow:p[1]<.05});
      if(id==='R')R.label([p[0],p[1]+sz,p[2]],'request task',{fs:12,b:1,mono:true,c:P.acc,dy:-10,a:al,wide:!on});
      if(id==='e'&&k===5)R.label([p[0],p[1]+sz,p[2]],'waits',{fs:12,c:P.bad,dy:-10,a:e});
      if(moved)R.flowArc([pa[0],pa[1]+.25,pa[2]],[pb[0],pb[1]+.25,pb[2]],.7,{c:id==='R'?P.acc:red?P.bad:P.c1,a:.85*fa(id),r:.055,n:8})});
    if(k===4)R.label([WX[3],0,QZ+.3],'stole half of worker 1\'s queue',{fs:12,b:1,c:P.c1,dy:14,a:e});
  }
  const full={cam:[.18,.74],bounds:[[-4.7,0,-2.9],[4.5,1.2,2.0]]},left={cam:[.3,.66],bounds:[[-4.6,0,-2.8],[.4,1.2,2.0]]},right={cam:[.05,.66],bounds:[[-.2,0,-2.8],[4.5,1.2,2.0]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · tokio\'s multi-thread runtime',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>k===2||k===3?left:k===5||k===6?right:full,margin:w=>w<520?[14,8,14,8]:[24,16,18,16]});
})();
