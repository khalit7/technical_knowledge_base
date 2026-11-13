// ---- Scene, Fig. 1 (the hero, section 0): who runs Python bytecode on four CPU cores, six ways (renderer v2, 2026-11-07) ----
// Four cores on the floor, a thread on each; the interpreter is a glass plate above them and the GIL a gold token on the plate.
// Steps: GIL build CPU-bound (the token hops), I/O-bound (the token is free, the waits go to the OS), four processes (four plates,
// four tokens, pickles from the main process), four subinterpreters (the same inside one process), the free-threaded build
// (one plate, no token), asyncio (one thread, tasks suspended at await). The times in the labels are this page's runs (PA.k1, PB.interp).
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.PA||!window.PB)return;const {at,off,lerp,mix,cl}=S3;
  const XS=[-3,-1,1,3],YP=1.55,TH=.72,ZOS=2.2,ZM=2.2;
  const k1=(b,kind,how)=>PA.k1[b].find(r=>r[0]===kind&&r[1]===how)[2],IN=PB.interp.PY314;
  const sec=v=>v.toFixed(2)+' s';
  function draw(R,k,e){const P=R.P;R.grid(-5,5,-3.4,3.4,.5);
    const gold=P.c5,run=mix(P.paper,P.acc,P.dark?.92:.62),idle=mix(P.paper,P.ink,.04);
    // what each step shows (alpha of each part, crossfaded over the step)
    const one=k===0||k===1?1:k===2?1-e:k===4?e:k===5?1-e:0;              // the single interpreter plate
    const four=k===2?e:k===3?1:k===4?1-e:0;                               // four plates
    const os=k===1||k===5?e:0;                                          // the OS floor slab, at the front
    const mainA=k===2||k===3?(k===2?e:1):0;
    const asy=k===5?e:0;
    // the operating system at the back: where waits happen
    if(os>.01)R.box([0,0,ZOS],[8.2,.1,1],{fill:mix(P.paper,P.c6,.18),a:os,shadow:false});
    if(os>.5)R.label([4.1,.1,ZOS+.5],'operating system: sockets, timers, files',{al:'right',fs:12,b:1,c:P.c6,a:os,dy:12});
    // the four cores and their threads
    XS.forEach((x,i)=>{
      const coreA=k===5&&i>0?1-.75*e:1;
      R.box([x,0,0],[1.5,.12,1.5],{fill:idle,a:coreA});
      R.label([x,0,.75],'core '+(i+1),{fs:12,c:P.mute,dy:12,a:Math.max(.3,coreA)});
      // the thread's state at this step: running bytecode, ready (waiting for the GIL), waiting on I/O, or idle
      let fill=P.paper,fa=1,ta=1,h=TH,lab='T'+(i+1);
      if(k===0){const u=e*3,hold=Math.round(u);fill=i===hold?run:P.paper;fa=i===hold?1:.45}
      else if(k===1){fill=mix(P.paper,P.c6,.35*e);fa=1-.35*e;h=lerp(TH,.42,e)}
      else if(k===2||k===3||k===4){fill=run;if(k===2||k===3)lab='P'+(i+1);if(k===3)lab='I'+(i+1);if(k===4)lab='T'+(i+1)}
      else if(k===5){if(i>0){ta=1-.85*e}fill=i===0?mix(P.paper,P.c1,.55):P.paper}
      R.box([x,.12,0],[.8,h,.8],{fill,fa,a:ta,shadow:false});
      if(ta>.3)R.label([x,.12+h,0],lab,{fs:12.5,b:1,mono:true,dy:-10,a:ta,c:(k===0&&i!==Math.round(e*3))?P.mute:P.ink});
      // bytecode flowing from the interpreter into each thread that is running it
      const running=k===0?i===Math.round(e*3):k===2||k===3||k===4?true:k===5?i===0:false;
      if(running){const a=k===2?e:k===4?1:1;R.flow([[x,YP,0],[x,.12+h+.05,0]],{c:P.acc,a:a*.9,r:.06,n:5,speed:1})}
      // waits going down to the OS
      if(k===1)R.flowArc([x,.12+h,.3],[x,.12,ZOS-.2],.35,{c:P.c6,a:e*.85,r:.055,n:7,speed:.9});
    });
    // one interpreter, as a glass plate over the cores
    if(one>.01){ 
      R.glass([-4,YP,-1],[8,0,0],[0,0,2],{c:k===4?P.c3:P.c1,nu:16,nv:4,a:one*.9,th:.04});
      const t=k===4?'python3.14t: one interpreter, no GIL':'one interpreter (python3.14)';
      R.label([-4,YP,-1],t,{al:'left',fs:12.5,b:1,c:k===4?P.c3:P.c1,a:one,dy:-12,dx:2,wide:1})}
    // four interpreters, one per process (step 3) or subinterpreter (step 4)
    if(four>.01)XS.forEach((x,i)=>{R.glass([x-.85,YP,-.85],[1.7,0,0],[0,0,1.7],{c:P.c1,nu:4,nv:4,a:four*.9,th:.04})});
    // process outlines: one per worker (processes), one around everything (subinterpreters)
    const pA=k===2?e:k===3?1-e:0,sA=k===3?e:k===4?0:0;
    if(pA>.01)XS.forEach((x,i)=>{R.quad([[x-.95,.005,-.95],[x+.95,.005,-.95],[x+.95,.005,.95],[x-.95,.005,.95]],{a:pA,ec:P.mute,dash:[5,4],lw:1.2,ea:.9});
      if(i===0)R.label([x-.95,0,-.95],'process',{al:'left',fs:12,c:P.mute,a:pA,dy:-8,wide:1})});
    if(sA>.01){R.quad([[-4.2,.005,-1.15],[4.2,.005,-1.15],[4.2,.005,3.05],[-4.2,.005,3.05]],{a:sA,ec:P.mute,dash:[5,4],lw:1.2,ea:.9});
      R.label([4.2,0,3.05],'one process',{al:'right',fs:12,c:P.mute,a:sA,dy:12,dx:-4})}
    // the main process (or main interpreter) at the front; arguments and results cross as pickles
    if(mainA>.01){R.box([0,0,ZM],[1.9,.42,.7],{fill:mix(P.paper,P.c2,.25),a:mainA});
      R.label([0,.42,ZM],k===3?'main interpreter':'main process',{fs:12.5,b:1,a:mainA,dy:-10});
      XS.forEach((x,i)=>{const p0=[-.6+i*.4,.42,ZM-.2],p1=[x,.12+TH,.45];
        R.flowArc(p0,p1,.7,{c:P.c2,a:mainA*.85,r:.055,n:k===3?5:7,speed:1.1});
        R.flowArc([p1[0]+.18,p1[1],p1[2]],[p0[0]+.1,p0[1],p0[2]],.5,{c:P.c2,a:mainA*.45,r:.045,n:4,speed:1.1})})}
    // the GIL: one token for the single interpreter, one per plate for processes and subinterpreters, none on the free-threaded build
    const tok=(p,a)=>{R.glow(p,.42,{c:gold,a:a*.8});R.ball(p,.17,{c:gold,a})};
    if(k===0){const u=e*3,i=Math.min(2,Math.floor(u)),f=u-i,p=R.arcPt([XS[i],YP+.22,0],[XS[i+1],YP+.22,0],.45,cl(f*1.6-.3,0,1));tok(p,1);
      R.label(p,'GIL',{fs:12.5,b:1,c:gold,dy:-20})}
    else if(k===1){const p=R.arcPt([XS[3],YP+.22,0],[0,YP+.22,0],.35,e);tok(p,1);R.label(p,'GIL, free while they wait',{fs:12.5,b:1,c:gold,dy:-20})}
    else if(k===2||k===3){XS.forEach((x,i)=>{const a=k===2?e:1;tok([x,YP+.22,0],a);if(i===0)R.label([x,YP+.22,0],'one GIL each',{fs:12.5,b:1,c:gold,dy:-20,a})})}
    else if(k===4){XS.forEach(x=>tok([x,YP+.22,0],1-e));R.label([0,YP+.22,0],'no GIL',{fs:13,b:1,c:P.c3,dy:-22,a:e})}
    else if(k===5){R.glass([XS[0]-.85,YP,-.85],[1.7,0,0],[0,0,1.7],{c:P.c1,nu:4,nv:4,a:e*.9,th:.04});R.label([XS[0]-.85,YP,-.85],'the event loop',{al:'left',fs:12.5,b:1,c:P.c1,a:e,dy:-12})}
    // asyncio: three tasks on the one thread; A runs, B and C are suspended at await while the OS waits for them
    if(asy>.01){const T=[['A',P.c1,[XS[0],.12+TH,0],'running'],['B',P.c4,[-1.6,0,1.35],'await'],['C',P.c6,[-.4,0,1.35],'await']];
      T.forEach(([n,c,p,s],j)=>{const sz=j===0?[.5,.42,.5]:[.55,.45,.55];R.box(p,sz,{fill:mix(P.paper,c,.5),a:asy,shadow:j>0});
        R.label([p[0],p[1]+sz[1],p[2]],n+(j?': '+s:''),{fs:12.5,b:1,mono:true,c:c,dy:-10,a:asy});
        if(j)R.flowArc([p[0],.45,p[2]+.2],[p[0],.12,ZOS-.1],.3,{c,a:asy*.8,r:.05,n:6,speed:.8})})}
    // the measured result of the step, as a caption on the floor at the front
    const res=[['CPU job: '+sec(k1('gil','CPU','serial'))+' serial, '+sec(k1('gil','CPU','4 threads'))+' on 4 threads'],
      ['4 waits of 200 ms: '+sec(k1('gil','I/O','serial'))+' serial, '+(k1('gil','I/O','4 threads')*1000).toFixed(0)+' ms on 4 threads'],
      ['CPU job on 4 processes: '+sec(k1('gil','CPU','4 processes'))],
      ['start one: subinterpreter '+IN.startup_ms.subinterpreter.toFixed(1)+' ms, process '+IN.startup_ms.process_spawn.toFixed(1)+' ms'],
      ['CPU job on 4 threads, 3.14t: '+sec(k1('ft','CPU','4 threads'))],
      ['one thread, switching only at await']][k][0];
    const sm=R.W<520?[sec(k1('gil','CPU','serial'))+' serial, '+sec(k1('gil','CPU','4 threads'))+' on 4',(k1('gil','I/O','4 threads')*1000).toFixed(0)+' ms for 4 waits',sec(k1('gil','CPU','4 processes'))+' on 4 processes',
      'subinterpreter '+IN.startup_ms.subinterpreter.toFixed(1)+' ms to start',sec(k1('ft','CPU','4 threads'))+' on 4 threads, 3.14t','switches only at await'][k]:res;
    R.label([0,0,3.0],sm,{fs:13,b:1,mono:true,c:P.ink,dy:14,a:Math.max(.2,e)})}
  const full={cam:[-.32,.62],bounds:[[-4.4,0,-1.2],[4.4,2.1,3.1]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · who runs Python bytecode, six ways',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,24,8]:[18,14,30,14],
    view:k=>k===0?{cam:[-.25,.56],bounds:[[-4.4,0,-1.2],[4.4,2.2,3.1]]}:k===5?{cam:[-.35,.6],bounds:[[-4.4,0,-1.2],[2.4,2.1,3.1]]}:full});
})();
