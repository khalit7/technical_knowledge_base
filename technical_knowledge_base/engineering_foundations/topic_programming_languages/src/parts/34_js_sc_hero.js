// ---- Scene, Fig. 1 (the map): the same program in four lanes, Python, C++, Rust and TypeScript, from source (back) to the machine (front) (renderer v2) ----
// A map, not a mechanism: each step compares the four lanes on one axis and the step list links to the section and the page that own it.
// Real numbers from this page's runs: instructions per character from section 2's disassembly (window.RD_RUN, set by 24_js_rd_run.js),
// ns per record from section 5's scans (RDD.mem), the shared counter's results from section 9 (RDD.conc), the Benchmark medians (RDD.bench.v).
// Colours: the page's language colours (Python c1, C++ c2, Rust c4, TypeScript c6); a mistake is drawn in --bad.
(function(){
  if(!document.getElementById('stg-hero')||!window.RDD)return;const {mix,lerp,at}=S3;const D=window.RDD;
  const RUN=window.RD_RUN||{};
  const fmt=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,',');
  const got=(t,re)=>{const m=String(t||'').match(re);return m?+m[1]:NaN};
  const C=D.conc||{},M=D.mem||{},B=(D.bench&&D.bench.v)||{};
  const CNT={py:got(C.py,/got (\d+)/),cpp:got(C.cpp_O0,/got (\d+)/),rs:got(C.rs_ok,/Mutex[^\n]*got (\d+)/),ts:got(C.js_async,/got (\d+)/)};
  const RSE=(String(C.rs_bad||'').match(/error\[(E\d+)\]/)||[0,'error'])[1];
  const NS={py:got(M.py_scan,/in order\s+[\d.]+ ms\s+([\d.]+) ns\/record/),cpp:got(M.cpp_scan,/contiguous[^\n]*?([\d.]+) ns\/record/)};
  const T={py:B.py314_loop,cpp:B.cpp_O2,rs:B.rust,ts:B.node_js};
  const secs=t=>t?(t.t<1?Math.round(t.t*1000)+' ms':t.t.toFixed(2)+' s'):'?';
  const L=[{k:'py',n:'Python',f:'tokens.py',x:-4.2,c:'c1'},{k:'cpp',n:'C++',f:'tokens.cpp',x:-1.4,c:'c2'},{k:'rs',n:'Rust',f:'tokens.rs',x:1.4,c:'c4'},{k:'ts',n:'TypeScript',f:'tokens.ts',x:4.2,c:'c6'}];
  const ZS=-3.0,ZE=-1.7,ZC=-.4,ZR=1.0,ZN=2.4,LW=2.1;
  const ROWS=[[ZE,'while you edit'],[ZC,'when it compiles'],[ZR,'when it runs'],[ZN,'no signal']];
  // where each lane's main catch is (step 2), and its fainter second moment
  const GATE={ts:[ZE,'tsc refuses'],rs:[ZC,'rustc refuses'],py:[ZR,'an exception'],cpp:[ZN,'undefined behaviour']};
  const FAINT={py:[ZE,'mypy, if run'],cpp:[ZC,'types only'],rs:[ZR,'a panic'],ts:[ZN,'JSON.parse']};
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-6,6,-3.6,3.2,.5);
    const col=l=>P[l.c];
    // composition: the lanes' sources stay; each step brings its own objects and lets the previous step's go
    const st=s=>k===s?e:0;                                          // this step's objects, fading in
    const bg=k===0?1:.35;                                            // the moment rows recede after the first two steps
    // the four lanes, their names and their source files
    L.forEach(l=>{const c=col(l);
      R.quad([[l.x-LW/2,.002,ZS-.5],[l.x+LW/2,.002,ZS-.5],[l.x+LW/2,.002,ZN+.6],[l.x-LW/2,.002,ZN+.6]],{fill:mix(P.paper,c,.07),ec:mix(P.paper,c,.4),lw:.8,a:.9});
      R.box([l.x,0,ZS],[1.6,.14,.7],{fill:mix(P.paper,c,.35)});
      R.label([l.x,.14,ZS-.35],l.n,{fs:13.5,b:1,dy:-12,c,a:k===5?0:1});
      if(!nar)R.label([l.x,0,ZS+.35],l.f,{mono:true,fs:12,dy:11,c:P.ink,a:k===0?1:0})});
    // the moments, front to back, named on the left
    if(k<5)ROWS.forEach(([z,t])=>{R.line([[-5.3,.01,z],[5.3,.01,z]],{c:P.mute,w:1,dash:[4,5],a:(k<=1?.8:.3)});
      R.label([-5.3,0,z],t,{al:'right',dx:-6,fs:12,c:P.mute,grp:'row',a:k<=1?1:.45})});
    // 1. the program moving from text to running code, in every lane
    if(k===0)L.forEach(l=>R.flow([[l.x,.15,ZS+.35],[l.x,.15,ZN+.5]],{c:col(l),a:e*.8,r:.06,n:9,speed:1}));
    // 2. the same mistake meets a different moment in each lane: the bug stops at the lane's main gate (C++ has none, it runs off the end)
    if(k===1)L.forEach(l=>{const c=col(l),[z,t]=GATE[l.k],[fz,ft]=FAINT[l.k];
      if(l.k!=='cpp')R.glass([l.x-LW/2+.1,0,z],[LW-.2,0,0],[0,.75,0],{c,a:e*.85,nu:6,nv:3});
      R.quad([[l.x-LW/2+.1,0,fz],[l.x+LW/2-.1,0,fz],[l.x+LW/2-.1,.5,fz],[l.x-LW/2+.1,.5,fz]],{fill:false,ec:c,dash:[4,4],lw:1,a:e*.5});
      R.flow([[l.x,.2,ZS+.6],[l.x,.2,l.k==='cpp'?ZN+.55:z-.08]],{c:P.bad,a:e,r:.1,n:8,speed:1.1});
      R.label([l.x,l.k==='cpp'?.2:.75,z],t,{fs:12.5,b:1,dy:-10,c:l.k==='cpp'?P.bad:c,a:e});
      if(!nar)R.label([l.x+LW/2-.15,0,fz],ft,{al:'right',fs:12,dy:12,c:P.mute,a:e*.9,wide:1})});
    // 3. how each lane turns text into machine code: what translates, what runs, and the instruction counts of section 2
    if(k===2){const a=e;
      L.forEach(l=>{const c=col(l),x=l.x;let tr,ru,tz=ZC;
        if(l.k==='py'){tr='bytecode';ru='interpreter loop'}
        if(l.k==='cpp'){tr='clang + LLVM';ru='machine code'}
        if(l.k==='rs'){tr='rustc + LLVM';ru='machine code'}
        if(l.k==='ts'){tr='tsc erases types';ru='V8: Ignition, then TurboFan';tz=ZE}
        if(l.k==='py')R.glass([x-.7,.02,tz-.3],[1.4,0,0],[0,0,.6],{c,a,nu:6,nv:3});else R.box([x,0,tz],[1.4,.3,.55],{fill:mix(P.paper,c,.3),a});
        if(l.k==='cpp'||l.k==='rs')R.glass([x-.7,.02,ZR-.3],[1.4,0,0],[0,0,.6],{c,a,nu:8,nv:3});else R.box([x,0,ZR],[1.4,l.k==='py'?.5:.4,.6],{fill:mix(P.paper,c,.3),a});
        R.box([x,0,ZN],[.8,.18,.6],{fill:mix(P.paper,P.mute,.25),a});
        R.label([x,.3,tz],tr,{fs:12,dy:-10,c:P.ink,a,wide:1});R.label([x,.5,ZR],ru,{fs:12,dy:-10,c:P.ink,a,wide:1});
        R.flow([[x,.2,ZS+.35],[x,.2,ZN-.3]],{c,a:a*.85,r:.065,n:9,speed:1.2})});
      R.label([L[0].x,.18,ZN],'CPU',{fs:12,dy:-8,c:P.mute,a,grp:'cpu'});
      // section 2's counts, two short lines under each lane's CPU
      const two=(i,t1,t2)=>{R.label([L[i].x,0,ZN+.3],t1,{mono:true,fs:12,dy:13,b:1,c:col(L[i]),a,wide:1});R.label([L[i].x,0,ZN+.3],t2,{mono:true,fs:12,dy:28,c:col(L[i]),a,wide:1})};
      if(RUN.py){two(0,RUN.py+' bytecodes','per character');two(1,RUN.cpp+' instr./byte','SIMD: '+RUN.cStep+' bytes');two(2,RUN.rs+' instr./byte','SIMD: '+RUN.rStep+' bytes');two(3,'JIT-compiled','after warm-up')}}
    // 4. who frees memory: scattered counted objects (Python), records side by side freed at a closing brace (C++, Rust), objects swept later (V8)
    if(k===3){const a=e;
      L.forEach(l=>{const c=col(l),x=l.x;
        if(l.k==='py'||l.k==='ts'){const sp=[[-.6,-.35],[.45,-.1],[-.2,.35],[.6,.45]];
          sp.forEach(([dx,dz])=>{R.box([x+dx,0,ZR+dz],[.36,.3,.3],{fill:mix(P.paper,c,.3),a});if(l.k==='py')R.ball([x+dx,.42,ZR+dz],.07,{c,a})});
          // V8: a collector sweeps the heap later; CPython: a list of pointers to separate objects, each with its count
          if(l.k==='ts')R.flow([[x-.95,.45,ZR-.65],[x+.95,.45,ZR-.65],[x+.95,.45,ZR+.75],[x-.95,.45,ZR+.75],[x-.95,.45,ZR-.65]],{c,a:a*.8,r:.055,n:12,speed:.9});
          else{R.box([x-.85,0,ZR-.75],[.5,.12,.2],{fill:mix(P.paper,c,.5),a});sp.forEach(([dx,dz])=>R.line([[x-.85,.12,ZR-.7],[x+dx,.3,ZR+dz]],{c,w:1,a:a*.6}))}}
        else{for(let i=0;i<4;i++)R.box([x-.6+i*.4,0,ZR],[.38,.3,.42],{fill:mix(P.paper,c,.3),a,lw:.8});
          R.quad([[x-.9,.005,ZR-.45],[x+.9,.005,ZR-.45],[x+.9,.005,ZR+.45],[x-.9,.005,ZR+.45]],{fill:false,ec:c,dash:l.k==='cpp'?[5,4]:null,lw:1.4,a})}
        R.label([x,.5,ZR-.4],{py:'reference counts',cpp:'destructors (RAII)',rs:'owner, checked',ts:'tracing GC'}[l.k],{fs:12.5,b:1,dy:-12,c,a})});
      if(isFinite(NS.py)){R.label([L[0].x,0,ZR+.7],NS.py.toFixed(1)+' ns per record',{mono:true,fs:12,dy:14,c:P.ink,a,wide:1});
        R.label([L[1].x,0,ZR+.7],NS.cpp.toFixed(2)+' ns per record',{mono:true,fs:12,dy:14,c:P.ink,a,wide:1})}}
    // 5. four threads add 1 to one counter a million times each: who gets 4,000,000
    if(k===4){const a=e;
      L.forEach(l=>{const c=col(l),x=l.x,cz=ZR+.9;
        R.box([x,0,cz],[.9,.32,.5],{fill:mix(P.paper,c,.35),a});
        const tz=ZC+.1;
        if(l.k==='ts'){R.box([x,0,tz],[.3,.5,.3],{fill:mix(P.paper,c,.4),a});
          const ring=[];for(let i=0;i<=32;i++){const t=i/32*2*Math.PI;ring.push([x+.55*Math.cos(t),.25,tz+.4*Math.sin(t)])}
          R.flow(ring,{c,a:a*.8,r:.05,n:10,speed:.9});R.flow([[x,.3,tz+.3],[x,.3,cz-.3]],{c,a,r:.06,n:5,speed:1})}
        else for(let i=0;i<4;i++){const tx=x-.66+i*.44;R.box([tx,0,tz],[.18,.5,.18],{fill:mix(P.paper,c,.4),a,shadow:false});
          if(l.k==='rs'){R.flow([[tx,.3,tz+.1],[tx,.3,ZR-.25]],{c:P.bad,a:a*.8,r:.05,n:3,speed:.8})}
          else R.flow([[tx,.3,tz+.1],[x+(tx-x)*.3,.3,cz-.25]],{c,a:a*(l.k==='py'&&i>0?.22:.9),r:.05,n:5,speed:1.1})}
        if(l.k==='py')R.glass([x-.85,0,ZR-.1],[1.7,0,0],[0,.6,0],{c,a:a*.7,nu:4,nv:2});
        if(l.k==='rs')R.glass([x-.85,0,ZR-.25],[1.7,0,0],[0,.6,0],{c:P.bad,a:a*.6,nu:4,nv:2})});
      const lab=(i,t,c,dy)=>R.label([L[i].x,.32,ZR+.9],t,{mono:true,fs:12.5,b:1,dy:dy||-12,c,a});
      lab(0,isFinite(CNT.py)?fmt(CNT.py):'?',col(L[0]));lab(1,isFinite(CNT.cpp)?fmt(CNT.cpp):'?',P.bad);lab(3,isFinite(CNT.ts)?fmt(CNT.ts):'?',col(L[3]));
      lab(2,RSE+' refused',P.bad);
      if(!nar){R.label([L[0].x,.6,ZR-.1],'GIL',{fs:12,b:1,dy:-8,c:col(L[0]),a});R.label([L[3].x,.5,ZC+.1],'one thread, event loop',{fs:12,dy:-10,c:col(L[3]),a,wide:1});
        R.label([L[1].x,0,ZR+1.15],'-O0: a data race',{fs:12,dy:14,c:P.bad,a,wide:1});R.label([L[2].x,0,ZR+1.15],'Arc<Mutex>: '+(isFinite(CNT.rs)?fmt(CNT.rs):'?'),{fs:12,dy:14,c:col(L[2]),a,wide:1})}}
    // 6. one task, measured: the Benchmark's median wall time for the 200,000-line log, as bar heights (linear)
    if(k===5){const a=e,mx=Math.max(...L.map(l=>T[l.k]?T[l.k].t:0))||1;
      L.forEach(l=>{const c=col(l),t=T[l.k];if(!t)return;const h=Math.max(.03,t.t/mx*2.4*e);
        R.box([l.x,0,ZR],[.9,h,.9],{fill:mix(P.paper,c,.55),a:1});R.label([l.x,h,ZR],secs(t),{mono:true,fs:13,b:1,dy:-12,c,a});R.label([l.x,0,ZR+.45],l.n,{fs:13,b:1,dy:13,c,a})});
      R.label([0,0,ZN+.4],'median wall time, 200,000 lines, Apple M1 Pro',{fs:12,dy:16,c:P.mute,a,wide:1})}
  }
  const full={cam:[0,1.0],bounds:[[-5.3,0,-3.6],[5.3,.9,3.0]]};
  const V=[full,{cam:[.1,.95],bounds:[[-5.3,0,-3.6],[5.3,.9,3.0]]},{cam:[-.1,.92],bounds:[[-5.3,0,-3.4],[5.3,.9,3.2]]},{cam:[0,.9],bounds:[[-5.3,0,-.3],[5.3,.8,2.0]]},
    {cam:[.08,.85],bounds:[[-5.3,0,-.8],[5.3,.8,2.4]]},{cam:[0,.42],bounds:[[-5.3,0,.3],[5.3,2.6,1.9]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one program, four lanes, six axes',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[16,8,14,8]:[22,16,16,118]});
})();
