// ---- Scene, Fig. 1 (section 2): maturin's build path, from the crate to import tokrs (renderer v2, 2026-11-07) ----
// Everything named or counted here is read from the recorded build through window.RB.build (src/rb/gen.py parses outputs/b1_develop.txt,
// b3_wheel.txt, b4_wheel_files.txt and ext/Cargo.toml): the dependencies, the compile time, the library's size, the wheel's files and name.
(function(){
  if(!document.getElementById('stg-build')||!window.S3||!window.RB||!RB.build)return;const {at,off,lerp,mix,cl}=S3;const B=RB.build;
  const XC=-4.9,XK=-1.7,XS=.9,XW=3.3,XV=6.0;          // crate, compiler, library, wheel, venv along x
  const FILES=['Cargo.toml','pyproject.toml','src/lib.rs'];
  const short=n=>n.replace(/^tokrs-0\.1\.0\.dist-info\//,'').replace(/^tokrs\//,'').replace(/^sboms\//,'');
  function draw(R,k,e){const P=R.P;R.grid(-7,7.6,-3,3,.5);
    const RS=P.c3,PY=P.c1;
    // the crate: a green glass plate with its three files and the stub; it recedes once compiled
    const ca=k===0?1:k===1?.85:k===2?.3:0;   // a thing out of the current view is not drawn at all (its labels would be clamped to the edge)
    R.glass([XC-1.25,.02,-1.35],[2.5,0,0],[0,0,2.7],{c:RS,a:ca,nu:5,nv:5,th:.04});
    R.label([XC,0,1.55],'crate tokrs/',{mono:true,fs:12.5,b:1,dy:14,c:RS,a:ca});
    FILES.forEach((f,i)=>{const z=-.85+i*.85;R.box([XC-.25,.06,z],[1.5,.42,.5],{fill:i===2?mix(P.paper,RS,.35):P.paper,a:ca});
      R.label([XC-.25,.48,z],f,{mono:true,fs:12,dy:-10,a:ca,b:i===2,wide:1})});
    R.box([XC+.85,.06,.85],[.45,.26,.4],{fill:mix(P.paper,P.c4,.3),a:ca*.9});R.label([XC+.85,.32,.85],'tokrs.pyi',{mono:true,fs:12,dy:-10,a:ca*.9,al:'left',dx:4,wide:1});
    // the dependencies cargo compiles once (from Cargo.toml), behind the crate
    const da=k===1?at(k,e,1):0;
    B.deps.forEach((d,i)=>{const x=XC-1.5+i*.95,z=-2.35;R.box([x,0,z],[.75,.34,.5],{fill:mix(P.paper,RS,.18),a:da});R.label([x,.34,z],d,{mono:true,fs:12,dy:-10,a:da,grp:'dep'});
      if(k===1)R.flowArc([x,.34,z],[XK-.4,.6,-.2],.55,{c:RS,a:da*.8,r:.05,n:6,speed:1.4})});
    // the compiler
    const ka=k===1?e:k===2?.6:0;
    R.box([XK,0,0],[1.4,.9,1.2],{fill:mix(P.paper,P.ink,.08),a:ka});R.label([XK,.9,0],'cargo · rustc --release',{mono:true,fs:12.5,b:1,dy:-11,a:ka});
    if(k===1){FILES.forEach((f,i)=>R.flowArc([XC+.5,.48,-.85+i*.85],[XK-.6,.6,0],.45,{c:RS,a:.9,r:.06,n:7,speed:1.3}));
      R.label([XK,0,.6],'Finished in '+B.compile_s+' s · '+B.real_s+' s real',{mono:true,fs:12.5,dy:16,c:RS,b:1,a:e})}
    // the shared library: machine code, no libpython inside
    const sa=k===2?e:k===3?.7:k===4?.3:0;
    R.box([XS,0,0],[1.0,.62,.9],{fill:mix(P.paper,RS,.55),a:sa});
    R.label([XS,.62,0],'tokrs.cpython-314-darwin.so',{mono:true,fs:12,dy:-11,b:1,a:sa,wide:1});
    R.label([XS,0,.45],(B.so_bytes/1e6).toFixed(2)+' MB · no libpython',{mono:true,fs:12,dy:14,a:sa*(k===2?1:.8),c:P.mute});
    if(k===2)R.flow([[XK+.7,.45,0],[XS-.5,.31,0]],{c:RS,a:e,r:.07,n:6,speed:1.2});
    // the wheel: a zip of the recorded files, one slab per file; the library is the big one
    const wa=k===3?e:k<3?0:k===4?.8:.35,F=B.files;
    R.glass([XW-1.0,.02,-1.1],[2.0,0,0],[0,0,2.2],{c:P.c5,a:wa,nu:4,nv:4,th:.04});
    F.forEach((f,i)=>{const so=/\.so$/.test(f[0]),z=-.9+i*(1.8/(F.length-1)),hgt=so?.55:.18;
      R.box([XW+(so?.1:-.25),.04,z],[so?1.1:.5,hgt,.16],{fill:so?mix(P.paper,RS,.55):P.paper,a:wa,shadow:false});
      if(k===3)R.label([XW+.75,.1,z],short(f[0]),{mono:true,fs:12,al:'left',dx:6,a:wa,grp:'whl',c:so?P.ink:P.mute})});
    R.label([XW,0,1.2],F.length+' files · .whl',{mono:true,fs:12.5,b:1,dy:16,c:P.c5,a:wa});
    if(k===3){R.flow([[XS+.5,.31,0],[XW-.4,.3,.1]],{c:P.c5,a:e,r:.07,n:6,speed:1.2});
      R.label([XW,.7,-1.1],B.wheel,{mono:true,fs:12,dy:-12,a:e,c:P.c5,b:1,wide:1})}
    // the virtual environment and the interpreter that imports it
    const va=k>=4?(k===4?e:1):0;
    R.glass([XV-1.0,.02,-1.3],[2.0,0,0],[0,0,2.6],{c:PY,a:va,nu:4,nv:5,th:.04});
    R.label([XV,0,1.4],'venv · site-packages',{mono:true,fs:12.5,b:1,dy:16,c:PY,a:va});
    R.box([XV,.04,-.55],[1.2,.36,.6],{fill:mix(P.paper,RS,.4),a:va});R.label([XV,.4,-.55],'tokrs/',{mono:true,fs:12,dy:-10,a:va});
    if(k===4)R.flowArc([XW+.6,.5,0],[XV-.3,.45,-.55],.6,{c:P.c5,a:e,r:.07,n:9,speed:1.3});
    const ia=k===5?e:0;
    R.box([XV,.04,.6],[1.2,.6,.6],{fill:mix(P.paper,PY,.35),a:ia});R.label([XV,.64,.6],'python 3.14',{mono:true,fs:12,dy:-10,b:1,a:ia,c:PY});
    if(k===5){R.flowArc([XV,.42,-.3],[XV,.66,.35],.35,{c:PY,a:e,r:.065,n:6,speed:1});R.label([XV+.75,.4,0],'import tokrs → PyInit_tokrs',{mono:true,fs:12.5,al:'left',dx:6,b:1,c:PY,a:e,wide:1})}
  }
  const full={cam:[.18,.72],bounds:[[-6.6,0,-2.8],[7.2,1.2,1.8]]};
  const V=[[-6.6,-2.9],[-6.6,-.6],[-2.8,2.2],[-.2,5.0],[2.0,7.4],[4.3,7.6]];
  S3.stage({id:'stg-build',list:'sx-build',fig:'Fig. 1 · from crate to import',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4600,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16],
    view:k=>({cam:[.18+.04*k,.66],bounds:[[V[k][0],0,-2.7],[V[k][1],1.1,1.7]]})});
})();
