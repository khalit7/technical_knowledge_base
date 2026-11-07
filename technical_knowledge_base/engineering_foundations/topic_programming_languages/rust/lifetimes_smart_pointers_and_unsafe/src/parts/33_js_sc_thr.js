// ---- Scene: the thread toolbox of threads.rs, and the Rc that may not cross (section 3; renderer v2) ----
// Driven by LSP_DATA.thr (ra/gen.py from threads.rs, rc_thread_err.rs and their recorded outputs): the docs each spawned thread is given,
// the printed results of all five tools, the number of threads and increments read from the source (8 x 100,000), and rustc's E0277 line.
// The Arc's strong count of 9 (1 + 8 clones) follows from the code; the program does not print it. Positions are illustrative.
(function(){
  if(!document.getElementById('stg-thr')||!window.LSP_DATA)return;const {at,off,cl,mix}=S3;
  const D=LSP_DATA.thr,N=D.n;
  const W=[...Array(N)].map((_,i)=>{const t=Math.PI+.32+i*(Math.PI-.64)/(N-1);return [3.1*Math.cos(t),0,.1+2.05*Math.sin(t)]});   // worker threads on an arc behind
  const M=[0,0,2.0],C=[0,0,-.2];                                                                                            // main thread in front; the shared value
  const box=(R,c,s,o)=>R.box(c,s,Object.assign({lw:.9},o));
  function worker(R,i,o){const P=R.P;box(R,W[i],[.78,.5,.6],{fill:mix(P.paper,o.c||P.c1,o.on?.5:.15),a:o.a});if(o.t!=null)R.label([W[i][0],.5,W[i][2]],o.t,{mono:true,fs:12.5,dy:-10,a:o.a,c:o.lc||P.ink})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-2.8,3,.5);
    // main thread, always
    box(R,M,[1.5,.42,.6],{fill:mix(P.paper,P.c3,.45)});R.label([M[0]-.8,.2,M[2]],'main thread',{al:'right',dx:-8,fs:12.5,b:1,c:P.c3});
    const res=t=>R.label([M[0],0,M[2]+.3],t,{mono:true,fs:12.5,b:1,dy:18,a:Math.min(1,e*1.6)});
    // the eight worker slots, faint when unused in a step
    const used=k===0?3:k===1?2:k===2?1:k===7?D.workers:N;
    for(let i=0;i<N;i++)if(i>=used)worker(R,i,{a:.18});
    if(k===0){D.docs.forEach((d,i)=>{worker(R,i,{on:1,a:1,t:'"'+d+'"'});R.flowArc([M[0]-.3+i*.3,.42,M[2]-.2],[W[i][0],.42,W[i][2]],.9,{c:P.c3,r:.065,n:8,a:cl(1-e*1.4+.4,0,1)*.9});
        R.flowArc([W[i][0],.42,W[i][2]+.2],[M[0]-.3+i*.3,.42,M[2]-.3],.6,{c:P.acc,r:.065,n:6,a:cl(e*2-.6,0,1)})});
      res('spawned: '+D.spawned)}
    if(k===1){box(R,[0,.42,M[2]],[1.3,.12,.42],{fill:mix(P.paper,P.c5,.6),shadow:false});R.label([.75,.5,M[2]],'data: borrowed, not moved',{al:'left',dx:8,fs:12.5,c:P.c5,b:1,wide:1});
      [0,1].forEach(i=>{const j=i?N-1:0;worker(R,j,{on:1,a:1,t:i?'right half':'left half'});R.flowArc([(i-.5)*.65,.55,M[2]],[W[j][0],.42,W[j][2]],1.0,{c:P.c5,r:.065,n:10,a:1});
        R.flowArc([W[j][0],.42,W[j][2]+.2],[(i-.5)*.3,.42,M[2]-.3],.5,{c:P.acc,r:.06,n:6,a:cl(e*2-.8,0,1)})});
      res('scoped sum: '+D.scoped)}
    if(k===2){R.glass([.2,0,.75],[3.0,0,0],[0,.9,0],{c:P.bad,a:.8,nu:6,nv:2});
      box(R,[1.7,0,1.6],[.8,.32,.45],{fill:mix(P.paper,P.bad,.35)});R.label([2.15,.16,1.6],'Rc<Vec<i32>>',{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.bad});
      const reach=Math.min(1,e*1.4);R.flow([[1.7,.35,1.6],[1.7,.6,1.2],[1.7,.55,.8]],{c:P.bad,r:.07,n:5,a:reach});worker(R,N-1,{on:0,a:.6,t:'thread::spawn'});
      R.label([1.7,.9,.75],D.rc_err.replace(/`/g,''),{mono:true,fs:12.5,b:1,c:P.bad,dy:-12,a:cl(e*2-.5,0,1)});
      R.label([1.7,.9,.75],'E0277 at compile time',{fs:12.5,c:P.bad,dy:-30,a:cl(e*2-.5,0,1),wide:1})}
    // Arc<Mutex<u64>>: one heap value, a lock around it, a strong count of 1 + N clones
    const mA=k>=3&&k<=5?(k===3?e:1):0;
    if(mA>.01){const handles=k===5?1-e:1,cnt=k===5?(e>.5?1:N+1):N+1;
      box(R,C,[.8,.36,.6],{fill:mix(P.paper,P.c2,.5),a:mA});
      R.glass([C[0]-.6,0,C[2]+.42],[1.2,0,0],[0,.75,0],{c:P.c2,a:mA*.9,nu:4,nv:3});R.glass([C[0]-.6,0,C[2]-.42],[1.2,0,0],[0,.75,0],{c:P.c2,a:mA*.6,nu:4,nv:3});
      R.label([C[0],.75,C[2]],k===5?'mutex counter: '+D.mutex+' (expected '+N*D.per+')':'Mutex<u64>',{mono:true,fs:12.5,b:1,dy:-12,c:k===5?P.ink:P.c2,a:mA});
      for(let i=0;i<cnt;i++)box(R,[C[0]+1.05,.06+i*.13,C[2]],[.36,.11,.36],{fill:mix(P.paper,P.c5,.75),a:mA,shadow:false,lw:.7});
      R.label([C[0]+1.05,0,C[2]+.3],'Arc strong count '+cnt,{mono:true,fs:12.5,b:1,c:P.c5,dy:14,a:mA,al:'left',dx:-10});
      const hold=k===4?Math.min(N-1,Math.floor(e*N*.999)):-1;
      for(let i=0;i<N;i++){const on=k!==4||i===hold;worker(R,i,{on:on&&k===4,a:mA*(k===4&&!on?.45:1)*(k===5?.4+.6*handles:1),t:k===4&&on&&R.W>=520?'holds the guard':null,lc:on&&k===4?P.c2:P.mute});
        if(k===3||(k===5&&handles>.05))R.flowArc([W[i][0],.42,W[i][2]],[C[0],.4,C[2]],.5,{c:P.c5,r:.05,n:6,a:mA*.55*handles});
        if(k===4&&on)R.flowArc([W[i][0],.42,W[i][2]],[C[0],.36,C[2]],.6,{c:P.c2,r:.075,n:9,speed:1.6,a:1})}
      if(k===5)R.flowArc([C[0],.4,C[2]+.3],[M[0],.42,M[2]-.3],.5,{c:P.acc,r:.065,n:7,a:e})}
    // an atomic: no lock; every thread adds at once
    if(k===6){box(R,C,[.8,.36,.6],{fill:mix(P.paper,P.c6,.5),a:e});R.label([C[0],.36,C[2]],'AtomicU64',{mono:true,fs:12.5,b:1,dy:-12,c:P.c6,a:e});
      R.label([C[0],.36,C[2]],N+' threads: fetch_add, no lock',{fs:12.5,c:P.c6,dy:-30,a:e});for(let i=0;i<N;i++){worker(R,i,{on:1,a:1,c:P.c6});R.flowArc([W[i][0],.42,W[i][2]],[C[0],.36,C[2]],.5,{c:P.c6,r:.06,n:7,speed:1.5,a:e})}
      res('atomic counter: '+D.atomic)}
    // a channel: three producers, one receiver on the main thread
    if(k===7){for(let i=0;i<D.workers;i++){worker(R,i,{on:1,a:1,c:P.c4,t:'tx '+i});R.flowArc([W[i][0],.42,W[i][2]],[M[0]-.4,.42,M[2]-.3],.8,{c:P.c4,r:.07,n:9,a:Math.min(1,e*2)})}
      R.label([M[0]+.8,.2,M[2]],'rx',{al:'left',dx:8,fs:12.5,b:1,mono:true,c:P.c4});res('channel: '+D.channel)}
  }
  const full={cam:[.0,.78],bounds:[[-3.7,0,-2.1],[3.7,.9,2.5]]};
  S3.stage({id:'stg-thr',list:'sx-thr',fig:'threads.rs: what may cross into a thread, and how it is shared',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    view:k=>k===2?{cam:[.2,.62],bounds:[[-1.2,0,-1.6],[3.9,1.2,2.5]]}:full,
    margin:w=>w<520?[18,10,40,10]:[20,24,44,24]});
})();
