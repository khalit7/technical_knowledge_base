// ---- Scene, Fig. 1 (the hero, section 0; renderer v2, 2026-11-07): one small program's journey, each child's concept pinned where it acts ----
// Left to right on the floor: install (pyproject.toml, uv.lock, .venv), check (app.py under the type checker's glass plate), compile and run
// (the bytecode as a glass plate of instruction rows, the C evaluation loop), objects on the heap (the namespace plate, the list objects,
// the type object list), and in front the threads with the GIL token. The program is the three lines of Fig. 2, y = x; y.append(3); z = x + [4].
// Data: the hero's real run (es/outputs/h1_hero.txt, embedded by es/gen.py as #es-h1): the 15 instruction names of its dis listing, the
// reference counts (1, then 2 after y = x, and 1 for z) and the two methods found on the type. Everything else is a name, not a number.
// Steps (ol#sx-hero): 0 the whole journey, 1 install, 2 check, 3 compile and run, 4 names, 5 methods on the type, 6 one thread at a time.
(function(){
  const host=document.getElementById('stg-hero'),src=document.getElementById('es-h1');if(!host||!src)return;const {cl,mix,lerp}=S3;
  const T=JSON.parse(src.textContent),num=rx=>{const m=T.match(rx);return m?+m[1]:NaN};
  const REF={x0:num(/after x = \[1, 2\]: (\d+)/),xy:num(/after y = x:.*refs: (\d+)/),z:num(/refs to z: (\d+)/)};
  const ADD=(T.match(/x \+ \[4\] calls\s+-> <slot wrapper '(\w+)' of '(\w+)' objects>/)||[]).slice(1),APP=(T.match(/append is found on -> <method '(\w+)' of '(\w+)' objects>/)||[]).slice(1);
  const INS=[];let ln=0;T.split('bytecode of')[1].split('\n').forEach(l=>{const m=l.match(/^\s+(\d+)?\s+([A-Z_]+)\b/);if(!m)return;if(m[1]!=null)ln=+m[1];INS.push({op:m[2],ln})});
  const N=INS.length,KEY=['STORE_NAME','LOAD_ATTR','BINARY_OP'].map(op=>INS.findIndex(i=>i.op===op));
  // where things stand
  const XI=-7.0,XV=-5.5,XB=-3.6,XC0=-1.9,XL=.55,XN=2.2,XO=4.4,XT=6.3,ZTH=2.15,THX=[-.65,.55,1.75];
  const rowZ=i=>-1.1+2.2*(i+.5)/N;
  const zone=k=>[0,1,2,3,4,4,5][k];                 // which part of the floor a step is about: 1 install, 2 check, 3 run, 4 heap, 5 threads
  function draw(R,k,e){const P=R.P;R.grid(-8.4,7.4,-2.2,3.0,.5);
    const zk=zone(k),A=z=>k===0?.85:z===zk||(zk===5&&z===3)?1:.18;   // composition: the step's part at full strength, the rest recedes
    const lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o));
    // ---- 1. install: pyproject.toml and uv.lock resolve into .venv ----
    const a1=A(1),green=mix(P.paper,P.c3,.3);
    R.box([XI,0,-.75],[1.1,.1,.75],{a:a1});R.box([XI,0,.45],[1.1,.1,.75],{fill:green,a:a1});
    R.glass([XV-.7,.02,-1.1],[1.4,0,0],[0,0,2.2],{c:P.c3,a:a1,nu:2,nv:3});
    [-.65,0,.65].forEach(z=>R.box([XV,.04,z],[.6,.24,.42],{fill:green,a:a1,shadow:false}));
    if(k===1){lab([XI,.1,-.75],'pyproject.toml',{mono:true,dy:-12,a:Math.max(.5,a1),grp:'inst'});lab([XI,.1,.45],'uv.lock',{mono:true,dy:-12,c:P.c3,b:1,a:Math.max(.5,a1),grp:'inst'});
      lab([XV,.3,-1.0],'.venv',{mono:true,dy:-12,c:P.c3,b:1,a:Math.max(.5,a1),grp:'inst'})}
    if(k===1){lab([XV+.7,.2,.2],'uv sync: exactly the lock',{al:'left',dx:8,c:P.c3,wide:1})}
    if(k<=1){const f=k===0?.45:1;R.flowArc([XI,.12,-.75],[XI,.12,.45],.3,{c:P.c3,a:f,r:.06,n:5});
      [-.65,0,.65].forEach(z=>R.flowArc([XI+.5,.12,.45],[XV,.3,z],.35,{c:P.c3,a:f,r:.06,n:k?6:3}))}
    // ---- 2. check: app.py under the type checker's plate ----
    const a2=A(2);
    R.box([XB,0,0],[1.2,.12,1.4],{a:Math.max(a2,k>=3&&k<=3?.6:0)});
    [-.4,0,.4].forEach((z,i)=>R.box([XB-.05,.12,z],[.85-.15*i,.025,.12],{fill:mix(P.paper,P.ink,.35),a:Math.max(a2,k===3?.6:0),shadow:false}));
    R.glass([XB-.65,1.05,-.75],[1.3,0,0],[0,0,1.5],{c:P.c4,a:a2,nu:4,nv:3});
    if(k<=2)lab([XB,.12,.75],'app.py',{mono:true,dy:12,b:1,a:Math.max(.5,a2)});
    if(k===2){lab([XB,1.1,-.75],'type checker',{dy:-12,c:P.c4,b:1});lab([XB+.65,1.05,0],'ty · mypy · pyright · pyrefly',{al:'left',dx:8,c:P.c4,mono:true,fs:12,wide:1});
      [-.4,0,.4].forEach(z=>R.flow([[XB,.16,z],[XB,1.04,z]],{c:P.c4,r:.06,n:4,speed:.9}));
      R.line([[XB+.65,.1,0],[XC0-.1,.1,0]],{c:P.mute,w:1.4,dash:[5,4]});lab([(XB+XC0)/2+.3,.1,0],'run time: hints not checked',{dy:14,c:P.mute,fs:12,wide:1})}
    if(k===0)R.flow([[XB,.16,0],[XB,1.04,0]],{c:P.c4,a:.45,r:.06,n:3,speed:.9});
    // ---- 3. compile and run: the bytecode plate and the evaluation loop ----
    const a3=A(3),blue=P.c1;
    R.glass([XC0,.02,-1.1],[1.2,0,0],[0,0,2.2],{c:blue,a:a3,nu:1,nv:N});
    R.box([XL,0,0],[1.0,.55,1.0],{fill:mix(P.paper,P.acc,.25),a:a3});
    const ring=[];for(let i=0;i<=40;i++){const t=i/40*Math.PI*2;ring.push([XL+.85*Math.cos(t),.3,.85*Math.sin(t)])}
    if(k===0||k===3||k===6)R.flow(ring,{c:P.acc,a:k===0?.45:k===6?.5:1,r:.055,n:10,speed:1.2});
    if(k===0||k===3){const f=k===0?.45:1;R.flowArc([XB+.6,.14,0],[XC0+.1,.06,0],.45,{c:blue,a:f,r:.06,n:k?7:4});R.flowArc([XL+.5,.4,0],[XN+.05,.9,0],.6,{c:P.acc,a:f*.8,r:.06,n:k?6:4})}
    if(k===3){const cur=Math.min(N-1,Math.floor(e*N));
      R.box([XC0+.6,.03,rowZ(cur)],[1.15,.06,2.2/N*.8],{fill:mix(P.paper,blue,.55),shadow:false});
      R.flow([[XC0+1.2,.08,rowZ(cur)],[XL-.55,.28,0]],{c:blue,r:.055,n:4,speed:1});
      KEY.forEach(i=>{if(i<0)return;R.box([XC0+.6,.03,rowZ(i)],[1.15,.04,2.2/N*.7],{fill:mix(P.paper,blue,i<=cur?.4:.15),shadow:false});lab([XC0,.04,rowZ(i)],INS[i].op,{al:'right',dx:-8,mono:true,fs:12,b:i<=cur,c:i<=cur?blue:P.mute,grp:'ins'})});
      lab([XC0+.6,.04,1.1],'bytecode · '+N+' instructions',{dy:16,c:blue,b:1});lab([XL,.55,0],'evaluation loop (C)',{dy:-14,c:P.acc,b:1})}
    if(k===0){lab([XC0+.6,.04,1.1],'bytecode',{dy:16,c:blue,wide:1});lab([XL,.55,0],'evaluation loop',{dy:-14,c:P.acc,wide:1})}
    // ---- 4 and 5. the heap: names on the namespace plate, objects, the type ----
    const a4=A(4),teal=P.c6,orange=mix(P.paper,P.c2,.3);
    R.glass([XN,.9,-.95],[1.0,0,0],[0,0,1.9],{c:teal,a:a4,nu:1,nv:3});
    const NZ={x:-.63,y:0,z:.63};
    const hasZ=k>=5||k===0,hasY=!(k===4&&e<=.45);
    ['x','y','z'].forEach(n=>{if(n==='z'&&!hasZ)return;lab([XN+.5,.92,NZ[n]],n,{mono:true,fs:14,b:1,c:teal,a:k===0||k===4||k===5?Math.max(.5,a4):a4})});
    const AL=k>=5||k===0?'[1, 2, 3]':'[1, 2]';
    R.box([XO,0,-.45],[1.15,.42,.62],{fill:orange,a:a4});
    const aB=k===5?cl(e*1.8,0,1)*a4:k>5||k===0?a4:0;R.box([XO,0,.8],[1.3,.42,.62],{fill:orange,a:aB});
    R.box([XT,0,-.2],[.95,.95,.95],{fill:mix(P.paper,P.acc,.3),a:k===4?.25:a4});
    const fl=(a,b,c,al,n)=>R.flowArc(a,b,.25,{c,a:al,r:.06,n:n||5,speed:1});
    if(k>=4||k===0){const f=k===0?.45:k===6?.3:1;fl([XN+1.0,.92,NZ.x],[XO-.45,.42,-.45],teal,f);
      if(hasY)fl([XN+1.0,.92,NZ.y],[XO-.45,.42,-.35],teal,f*(k===4?cl((e-.45)*4,0,1):1));if(aB>.05)fl([XN+1.0,.92,NZ.z],[XO-.5,.42,.8],teal,f*aB/Math.max(a4,.01))}
    if(k===4){const r=e>.45?REF.xy:REF.x0;lab([XO,.42,-.45],AL+' · list · refs '+r,{mono:true,dy:-14,b:1,c:P.c2});
      lab([XN+.5,.92,-.95],'names',{dy:-12,c:teal,b:1,wide:1});lab([XO,.0,.2],'y = x: no copy',{dy:14,c:P.mute,wide:1})}
    if(k===5){lab([XO,.42,-.45],AL+' · refs '+REF.xy,{mono:true,dy:-14,b:1,c:P.c2,grp:'obj'});
      if(aB>.3)lab([XO,.42,.8],'[1, 2, 3, 4] · new · refs '+REF.z,{mono:true,dy:-14,b:1,c:P.c2,a:aB,grp:'obj'});
      lab([XT,.95,-.2],'type: '+(APP[1]||'list'),{dy:-14,c:P.acc,b:1,mono:true});
      lab([XT+.5,.62,-.2],(APP[0]||'append')+': changes the object',{al:'left',dx:8,mono:true,fs:12,c:P.acc,grp:'meth'});
      lab([XT+.5,.3,-.2],(ADD[0]||'__add__')+': builds a new one',{al:'left',dx:8,mono:true,fs:12,c:P.acc,grp:'meth'});
      R.flowArc([XO+.55,.3,-.45],[XT-.48,.5,-.2],.3,{c:P.acc,r:.06,n:6,speed:1.1});
      if(aB>.05)R.flowArc([XT-.48,.3,0],[XO+.62,.3,.8],.3,{c:P.acc,a:aB,r:.06,n:6,speed:1.1})}
    if(k===0){lab([XO,.42,-.45],'objects',{dy:-14,c:P.c2,wide:1});lab([XT,.95,-.2],'type',{dy:-14,c:P.acc,wide:1})}
    // ---- 6. who runs: three threads, one GIL token ----
    const a5=A(5),gold=P.c5;
    THX.forEach((x,i)=>R.box([x,0,ZTH],[1.0,.18,.36],{fill:mix(P.paper,gold,.18),a:k===6?1:a5}));
    if(k===6||k===0){const h=k===6?Math.min(2,Math.floor(e*3)):0,tp=[THX[h],.38,ZTH-.35];
      THX.forEach((x,i)=>{if(k===6)lab([x,.18,ZTH+.18],i===h?'thread '+(i+1)+' · runs':'thread '+(i+1)+' · waits',{dy:14,fs:12,c:i===h?P.ink:P.mute,b:i===h,grp:'thr'})});
      R.ball(tp,.13,{c:gold});R.glow(tp,.4,{c:gold,a:.6});if(k===6)lab(tp,'GIL',{dy:-16,b:1,c:gold});
      R.flow([[THX[h],.2,ZTH-.2],[XL,.3,.6]],{c:gold,a:k===6?1:.45,r:.06,n:5,speed:1});
      if(k===6)lab([XL,.55,0],'one thread at a time',{dy:-14,c:P.acc,b:1,wide:1})}
    if(k===0)lab([THX[1],.18,ZTH+.18],'threads',{dy:14,c:P.mute,wide:1});
    // the whole journey's parts, named once in the overview
    if(k===0)[[XI+.7,'installed'],[XB,'checked'],[(XC0+XL)/2+.3,'compiled and run'],[XO,'on the heap']].forEach(([x,t])=>lab([x,1.45,-1.3],t,{b:1,fs:13,c:P.ink,wide:1}));
  }
  const full={cam:[.3,.8],bounds:[[-8.0,0,-1.5],[7.0,1.3,2.6]]};
  const views=[full,{cam:[.3,.55],bounds:[[-7.9,0,-1.3],[-4.6,.9,1.3]]},{cam:[.32,.42],bounds:[[-4.5,0,-1.0],[-1.9,1.3,1.0]]},{cam:[.28,.6],bounds:[[-3.0,0,-1.3],[1.6,.9,1.3]]},
    {cam:[.3,.5],bounds:[[2.0,0,-1.1],[5.3,1.1,1.3]]},{cam:[.3,.5],bounds:[[2.0,0,-1.1],[7.2,1.1,1.4]]},{cam:[.3,.55],bounds:[[-1.4,0,-.9],[2.6,.8,2.6]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one program, from install to run',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    view:k=>views[k]||full,margin:w=>w<520?[16,10,14,10]:[22,40,16,40]});
})();
