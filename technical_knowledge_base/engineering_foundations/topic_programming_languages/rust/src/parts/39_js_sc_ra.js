// ---- Fig. 1, the hero (renderer v2): one Rust program's journey, from cargo to Python, each idea pinned where it acts and linked to its owner.
// Driven by RA_DATA: map.files (the tokstat crate's line counts), own.rs_log (the Vec run: size_of, capacities), gate (the refused and the accepted program).
// File heights are proportional to line counts; the Vec's fields and elements are drawn to scale in bytes (BW world units a byte).
// Steps 5 to 8 pin the children's subjects; their numbers are quoted from each child's own recorded runs and named in the step list (ol#sx-ra),
// which links each child's figure; check_stages.mjs confirms every quoted number is still on that child's built page.
// Steps: 0 cargo, 1 the borrow checker, 2 stack and heap, 3 growth, move, drop, 4 enums and traits, 5 Rc and threads, 6 tokio, 7 PyO3, 8 the map. ----
(function(){
  if(!document.getElementById('stg-ra')||!window.RA_DATA)return;const {cl,mix,lerp}=S3;
  const D=RA_DATA,F=D.map.files,LOG=D.own.rs_log;
  const num=(s,rx)=>{const m=String(s).match(rx);return m?+m[1]:NaN};
  const V={hdr:num(LOG,/= (\d+)/),cap1:num(LOG,/^1 v .* cap=(\d+)/m),cap2:num(LOG,/^3 v .* cap=(\d+)/m),el:4};   // Vec<u32>: 4-byte elements
  const ERR=(D.gate.err.out.match(/error\[(E\d+)\]/)||[])[1]||'error';
  // quoted from the children (see the step list): Option<&u64> and &dyn Tokenizer sizes (enums child), Rc handles and count (lifetimes child),
  // the task that changed threads (async child), the two crossings (PyO3 child)
  const C={opt:8,dyn:16,rcH:8,rcN:3,tA:'103.8 ms',copy:'72.7 ns',view:'9.4 ns'};
  const BW=.05;                                        // world units per byte
  const H=n=>.022*n;                                   // a source file's height from its line count
  // where things stand, left to right
  const XA=-8.0,XB=-5.9,XS=-3.4,YS=1.2,XH=-.2,XD=2.4,XE=5.0,XF=7.4,XG=9.0,XP=10.0;
  function draw(R,k,e){const P=R.P;R.grid(-9,11,-2.2,2.2,.5);
    const last=k===8;
    const A=(on,after)=>last?.55:on?1:after?.28:.14;   // a region: full while its step plays, faded otherwise
    // ---- 0. cargo: the crate's files on one glass plate ----
    const aA=A(k===0,k>0),files=[['Cargo.toml',-1.4],['src/lib.rs',-.7],['src/tokenize.rs',0],['src/tally.rs',.7],['src/main.rs',1.4]];
    R.glass([XA-.65,.02,-1.8],[1.3,0,0],[0,0,3.6],{c:P.c1,a:aA*.8,nu:2,nv:6});
    files.forEach(([f,z])=>{const l=F[f];R.box([XA,0,z],[.62,H(l),.42],{fill:mix(P.paper,P.c1,f==='Cargo.toml'?.15:.35),a:aA});
      if(k===0)R.label([XA-.31,H(l)*.5,z],f.replace('src/','')+' · '+l,{mono:true,fs:12,al:'right',dx:-8,grp:'src',c:P.c1,b:1})});
    if(k===0)files.forEach(([f,z])=>R.flow([[XA+.31,H(F[f])*.6,z],[XB-.1,.6,z*.6]],{c:P.c1,a:.85,r:.06,n:5}));
    if(k===0)R.label([XA,0,1.8],'one crate',{fs:13,b:1,c:P.c1,dy:16});
    // ---- 1. rustc and the borrow checker: a gate every program passes before it runs ----
    const aB=A(k<=1,k>1);
    R.glass([XB,0,-1.7],[0,0,3.4],[0,1.25,0],{c:P.acc,a:aB*.9,nu:6,nv:3});
    if(k<=1)R.label([XB,1.25,-1.7],'rustc · borrow checker',{fs:12.5,b:1,c:P.acc,dy:-10,al:'left'});
    if(k===1){const u=cl(e*1.4,0,1);
      // the refused program: it reaches the gate and stops
      R.box([lerp(XB-1.5,XB-.55,u),0,-.75],[.4,.4,.4],{fill:mix(P.paper,P.bad,.45)});
      R.label([lerp(XB-1.5,XB-.55,u),.4,-.75],'gate_err.rs',{mono:true,fs:12,dy:-8,c:P.bad,b:1,grp:'gate'});
      R.flow([[XB-1.9,.2,-.75],[XB-.1,.2,-.75]],{c:P.bad,a:.9,r:.06,n:5});
      R.label([XB,.75,-.75],ERR,{mono:true,fs:13,b:1,c:P.bad,al:'left',dx:10,a:u});
      // the accepted program: it passes through and becomes the binary
      R.box([lerp(XB-1.5,XB+.75,u),0,.75],[.4,.4,.4],{fill:mix(P.paper,P.good,.45)});
      R.label([lerp(XB-1.5,XB+.75,u),.4,.75],'gate_fix.rs',{mono:true,fs:12,dy:-8,c:P.good,b:1,grp:'gate'});
      R.flow([[XB-1.9,.2,.75],[XB+1.2,.2,.75]],{c:P.good,a:.9,r:.06,n:7})}
    // ---- 2 and 3. the running program: the stack and the heap ----
    const aM=A(k===2||k===3,k>3);
    R.glass([XS-1.2,YS,-1.1],[2.4,0,0],[0,0,2.2],{c:P.c1,a:aM,nu:6,nv:4});
    R.glass([XH-1.4,.04,-1.1],[2.8,0,0],[0,0,2.2],{c:P.c4,a:aM,nu:7,nv:4});
    [-1,1].forEach(sx=>[-1,1].forEach(sz=>R.line([[XS+sx*1.15,0,sz*1.05],[XS+sx*1.15,YS,sz*1.05]],{c:P.line,w:1,a:aM*.5})));
    if(k===2||k===3){R.label([XS-1.2,YS,1.1],'stack',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,grp:'pl'});R.label([XH+1.4,.04,1.1],'heap',{al:'left',dx:6,fs:12.5,b:1,c:P.c4,grp:'pl'})}
    const fw=V.hdr/3*BW,ew=V.el*BW,orange=i=>mix(P.paper,P.c2,i?.25:.5);
    const hdr=(x,z,a)=>{for(let i=0;i<3;i++)R.box([x-fw+fw*i,YS+.03,z],[fw*.92,.3,.42],{fill:orange(i),a,shadow:false})};
    const blk=(x,z,n,used,a,fill)=>{for(let i=0;i<n;i++)R.box([x-ew*n/2+ew*(i+.5),.07,z],[ew*.9,.3,.42],{fill:i<used?fill:P.paper,a,shadow:false})};
    const zv=-.45,zw=.5,x1=XH-.7,x2=XH+.55;
    if(k<=2||last){const a=k<2?.14:k===2?Math.min(1,e*1.6):.55;hdr(XS,zv,a);blk(x1,zv,V.cap1,3,a,mix(P.paper,P.c2,.55));
      if(k===2){R.flowArc([XS-fw,YS+.33,zv],[x1-ew,.4,zv],.45,{c:P.c2,a:cl(e*2-.3,0,1),r:.06,n:7,speed:1.2});
        R.label([XS+fw*1.5,YS+.2,zv],'v · '+V.hdr+' B',{mono:true,fs:12.5,al:'left',dx:10,b:1,c:P.c2});R.label([x1+ew*1.5,.2,zv],'cap '+V.cap1,{mono:true,fs:12.5,al:'left',dx:10,b:1,c:P.c2})}}
    if(k===3){const g=cl(e*2,0,1),m=cl(e*2-1,0,1);   // growth in the first half, the move in the second; drop(w) is in the step text
      // growth: a new block of capacity 6; the old one freed
      blk(x1,zv,V.cap1,3,1-g*.85,mix(P.paper,P.c2,.55));blk(x2,zw,V.cap2,4,g,mix(P.paper,P.c2,.55));
      if(g<1)R.flowArc([x1,.4,zv],[x2,.4,zw],.35,{c:P.c2,a:.9,r:.05,n:5});
      R.label([x2+ew*3,.2,zw],'cap '+V.cap2,{mono:true,fs:12.5,al:'left',dx:10,b:1,c:P.c2,a:Math.max(g,.01)});
      // the move: 24 bytes of header from v's slot to w's
      hdr(XS,zv,1-m*.75);hdr(XS,zw,m);
      if(m>0&&m<1)R.flow([[XS,YS+.35,zv],[XS,YS+.35,zw]],{c:P.c2,a:.95,r:.06,n:4,speed:1});
      if(m>.05)R.flowArc([XS-fw,YS+.33,zw],[x2-ew*2.5,.4,zw],.4,{c:P.c2,a:m,r:.06,n:6,speed:1.2});
      R.label([XS+fw*1.5,YS+.2,zv],m>.5?'v: moved, unusable':'v',{mono:true,fs:12.5,al:'left',dx:10,b:1,c:m>.5?P.mute:P.c2,grp:'mv'});
      R.label([XS+fw*1.5,YS+.2,zw],'w · '+V.hdr+' B copied',{mono:true,fs:12.5,al:'left',dx:10,b:1,c:P.c2,a:Math.max(m,.01),grp:'mv'})}
    // ---- 4. enums and traits: an 8-byte Option, a 16-byte fat pointer and its vtable ----
    const aD=A(k===4,k>4),green=mix(P.paper,P.c3,.45);
    R.box([XD-.6,0,-.7],[C.opt*BW,.34,.42],{fill:green,a:aD});R.box([XD+.6,0,-.7],[.42,.34,.42],{fill:mix(P.paper,P.c3,.2),a:aD});
    R.box([XD-.6-C.dyn*BW/4,0,.7],[C.dyn*BW/2*.94,.34,.42],{fill:green,a:aD});R.box([XD-.6+C.dyn*BW/4,0,.7],[C.dyn*BW/2*.94,.34,.42],{fill:mix(P.paper,P.c3,.3),a:aD});
    R.box([XD+.6,0,.95],[.42,.34,.42],{fill:mix(P.paper,P.c3,.2),a:aD});
    R.glass([XD+.95,0,.15],[.6,0,0],[0,1.0,0],{c:P.c3,a:aD,nu:1,nv:4});
    if(k===4){R.flowArc([XD-.6,.34,-.7],[XD+.6,.34,-.7],.35,{c:P.c3,a:.9,r:.055,n:5});
      R.flowArc([XD-.6-C.dyn*BW/4,.34,.7],[XD+.6,.34,.95],.35,{c:P.c3,a:.9,r:.055,n:5});
      R.flowArc([XD-.6+C.dyn*BW/4,.34,.7],[XD+1.25,.5,.15],.45,{c:P.c3,a:.9,r:.055,n:6});
      R.label([XD-.6,.34,-.7],'Option<&u64> · '+C.opt+' B',{mono:true,fs:12.5,b:1,c:P.c3,dy:-12,al:'right',dx:12,grp:'en'});
      R.label([XD-.6,.34,.7],'&dyn Tokenizer · '+C.dyn+' B',{mono:true,fs:12.5,b:1,c:P.c3,dy:-12,al:'right',dx:12,grp:'en'});
      R.label([XD+1.25,1.0,.15],'vtable',{fs:12.5,b:1,c:P.c3,dy:-10});R.label([XD+.81,.17,.95],'the value',{fs:12,al:'left',dx:6,c:P.mute,grp:'en2'});R.label([XD+.6,0,-.49],'u64',{mono:true,fs:12,dy:12,c:P.mute,grp:'en2'})}
    // ---- 5. shared ownership: three Rc handles, one counted block; a thread that only Arc may enter ----
    const aE=A(k===5,k>5),rcf=mix(P.paper,P.c4,.4);
    [-1.0,-.45,.1].forEach(z=>R.box([XE-.8,0,z],[C.rcH*BW,.3,.36],{fill:rcf,a:aE}));
    R.box([XE+.4,0,-.45],[.7,.5,.6],{fill:mix(P.paper,P.c4,.25),a:aE});
    R.glass([XE-.3,0,1.35],[1.4,0,0],[0,.9,0],{c:P.c5,a:aE*.8,nu:3,nv:2});
    if(k===5){[-1.0,-.45,.1].forEach(z=>R.flowArc([XE-.8,.3,z],[XE+.1,.45,-.45],.3,{c:P.c4,a:.85,r:.05,n:4}));
      R.label([XE+.4,.5,-.45],'count '+C.rcN,{mono:true,fs:12.5,dy:-10,b:1,c:P.c4});
      R.label([XE-.8,.3,-1.0],'3 Rc handles · '+C.rcH+' B',{mono:true,fs:12,al:'right',dx:-8,c:P.c4,b:1,grp:'rc'});
      const u=cl(e*1.5,0,1);R.flow([[XE-.8,.2,.4],[XE-.8+.6*u,.2,1.1]],{c:P.bad,a:.9,r:.055,n:3});
      R.label([XE-.2,.2,1.1],'Rc: E0277',{mono:true,fs:12,c:P.bad,b:1,al:'right',dx:-8,a:u,grp:'thr'});
      R.flow([[XE+.9,.2,.3],[XE+.5,.4,1.35]],{c:P.good,a:.9,r:.055,n:4});
      R.label([XE+.4,.9,1.35],'thread',{fs:12.5,b:1,c:P.c5,dy:-10,grp:'thr2'});R.label([XE+.95,.2,.3],'Arc',{mono:true,fs:12,b:1,c:P.good,al:'left',dx:8,grp:'thr'})}
    // ---- 6. tokio: tasks on a few worker threads; task A parks and resumes on another worker ----
    const aF=A(k===6,k>6),zt=[-1.3,-.45,.4,1.25];
    zt.forEach((z,i)=>{R.glass([XF-.55,.05,z-.3],[1.1,0,0],[0,0,.6],{c:P.c6,a:aF,nu:4,nv:1});
      for(let j=0;j<(i===1?1:2);j++)R.box([XF-.3+j*.3,.06,z],[.22,.18,.22],{fill:mix(P.paper,P.c6,.35),a:aF,shadow:false})});
    if(k===6){const u=cl(e*1.25,0,1),zA=lerp(zt[0],zt[1],u),yA=.06+Math.sin(u*Math.PI)*.55;
      R.box([XF+.3,yA,zA],[.24,.2,.24],{fill:mix(P.paper,P.c2,.6),shadow:false});
      R.label([XF+.3,yA+.2,zA],u<.5?'task A · thread 3':'resumed · thread 5 · '+C.tA,{mono:true,fs:12,dy:-8,b:1,c:P.c2,al:'left',dx:8});
      R.flowArc([XF+.3,.3,zt[0]],[XF+.3,.3,zt[1]],.6,{c:P.c6,a:.6,r:.05,n:5});
      R.label([XF-.55,.05,zt[3]],'workers',{fs:12.5,b:1,c:P.c6,al:'right',dx:-8,grp:'tk'})}
    // ---- 7. PyO3: Python's objects on their own heap; a copy or a view crosses the boundary ----
    const aG=A(k===7,false);
    R.glass([XG,0,-1.5],[0,0,3.0],[0,1.1,0],{c:P.c5,a:aG*.7,nu:4,nv:2});
    R.glass([XP-.5,.04,-1.2],[1.4,0,0],[0,0,2.4],{c:P.c5,a:aG,nu:3,nv:4});
    [-.7,0,.7].forEach(z=>R.box([XP+.2,.06,z],[.45,.3,.4],{fill:mix(P.paper,P.c5,.4),a:aG,shadow:false}));
    if(k===7){R.flow([[XP-.05,.2,-.7],[XG-.9,.2,-.7]],{c:P.c2,a:.95,r:.075,n:12,speed:.9});
      R.flow([[XP-.05,.2,.7],[XG-.9,.2,.7]],{c:P.c3,a:.95,r:.045,n:3,speed:1.6});
      R.label([XG-.9,.2,-.7],'copy · Vec<String> · '+C.copy,{mono:true,fs:12,al:'right',dx:-8,b:1,c:P.c2,grp:'py'});
      R.label([XG-.9,.2,.7],'view · &str · '+C.view,{mono:true,fs:12,al:'right',dx:-8,b:1,c:P.c3,grp:'py'});
      R.label([XP+.2,.36,-.7],'Python str objects',{fs:12.5,b:1,c:P.c5,dy:-10,al:'left',dx:6,wide:1});R.label([XG,1.1,-1.5],'the boundary',{fs:12.5,b:1,c:P.c5,dy:-10})}
    // ---- 8. the map: who owns which piece ----
    if(last){const la={fs:12.5,b:1,dy:-14,grp:'map'};
      R.label([(XA+XS)/2,1.75,0],'build · checker · ownership: this page',Object.assign({c:P.acc},la));
      R.label([XD,.95,0],'enums, traits',Object.assign({c:P.c3},la));
      R.label([XE,1.1,0],'Rc, threads, unsafe',Object.assign({c:P.c4},la));
      R.label([XF,.75,0],'tokio, axum',Object.assign({c:P.c6},la));
      R.label([XP,1.2,0],'PyO3',Object.assign({c:P.c5},la));
      R.flow([[XA+.4,.3,0],[XB,.3,0],[XS-1.2,YS*.6,0],[XH,.3,0],[XD,.3,0],[XE,.3,0],[XF,.3,0],[XG,.3,0]],{c:P.acc,a:.4,r:.05,n:14,speed:1.2})}
  }
  const views={crate:{cam:[.35,.5],bounds:[[-9.4,0,-1.9],[-5.5,1.5,1.9]]},gate:{cam:[.3,.5],bounds:[[-8.2,0,-1.9],[-4.4,1.4,1.9]]},
    mem:{cam:[.35,.55],bounds:[[-4.9,0,-1.2],[1.4,1.7,1.2]]},en:{cam:[.35,.55],bounds:[[1.2,0,-1.1],[3.9,1.1,1.4]]},
    rc:{cam:[.35,.55],bounds:[[3.6,0,-1.3],[6.2,1.0,1.6]]},tk:{cam:[.45,.6],bounds:[[6.4,0,-1.7],[8.8,.9,1.7]]},
    py:{cam:[.35,.55],bounds:[[7.6,0,-1.6],[11,1.2,1.6]]},full:{cam:[.55,.62],bounds:[[-9,0,-2],[11,1.8,2]]}};
  S3.stage({id:'stg-ra',list:'sx-ra',fig:'Fig. 1 · one Rust program, from cargo to Python',cam:views.full.cam,bounds:views.full.bounds,aspect:.62,dur:1400,hold:5200,draw,
    view:k=>[views.crate,views.gate,views.mem,views.mem,views.en,views.rc,views.tk,views.py,views.full][k],
    margin:w=>w<520?[16,10,12,10]:[22,40,14,40]});
})();
