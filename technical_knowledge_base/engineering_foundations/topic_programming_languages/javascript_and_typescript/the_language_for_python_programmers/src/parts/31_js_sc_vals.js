// ---- Scenes (renderer v2, 2026-11-07): Fig. 1 the hero (section 0), Fig. 2 copies (section 2), Fig. 3 closures (section 3), Fig. 4 prototype lookups (section 4) ----
// One visual vocabulary for all four: variables are blocks on a blue binding plate at the front; objects sit behind it; an object's own
// properties and each prototype are glass plates stacked upwards; a scope a closure keeps is a green plate; pointers are arcs, and dots flow
// along a pointer while a step is about it. Every printed value comes from the page's recorded runs (window.JL.out, written by ja/gen.py from
// ja/outputs: c1_objects, c4_copy, d2_closures, e1_classes, e2_prototype); the property names are those of the scripts. The explanation of each
// step is the step list on the left of each stage (check_stages.mjs checks one item per step and the printed values against JL.out).
(function(){
  if(!window.S3||!window.JL||!JL.out)return;const {at,off,lerp,lerp3,mix}=S3,$=id=>document.getElementById(id),O=JL.out,ln=(n,i)=>O[n].split('\n')[i];
  const plate=(R,x0,x1,z0,z1,y,c,a,o)=>R.glass([x0,y,z0],[x1-x0,0,0],[0,0,z1-z0],Object.assign({c,a,nu:4,nv:3,th:.04},o||{}));
  const L=(R,p,t,o)=>{if((o.a==null?1:o.a)>=.3)R.label(p,t,o)};  // a receding part (alpha under .3) loses its labels
  // a point a fraction t of the way along a polyline (by length)
  function along(pts,t){const d=[];let T=0;for(let i=1;i<pts.length;i++){const s=Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1],pts[i][2]-pts[i-1][2]);d.push(s);T+=s}
    let r=Math.max(0,Math.min(1,t))*T,j=0;while(j<d.length-1&&r>d[j]){r-=d[j];j++}return lerp3(pts[j],pts[j+1],d[j]?Math.min(1,r/d[j]):1)}
  // a variable: a block on the binding plate with its name on top
  function bind(R,x,z,name,a,o){o=o||{};const P=R.P;R.box([x,0,z],[o.w||.9,.26,.5],{fill:mix(P.paper,P.c1,o.hot?.42:.2),a,shadow:false});L(R,[x,.26,z+.25],name,{mono:true,fs:12.5,b:1,a,dy:-9})}
  // a pointer from a to b: a thin arc, and dots flowing along it while it matters
  function ptr(R,a,b,h,o){const P=R.P;R.arc(a,b,h,{c:o.c||P.mute,w:1.3,a:(o.a||0)*.7,head:6});if(o.flow)R.flowArc(a,b,h,{c:o.c||P.acc,a:o.flow,r:.06,n:o.n||7,speed:1.2})}
  // a chain link between two stacked plates
  function link(R,x,y0,y1,z,a,fl,c){const P=R.P;R.line([[x,y0+.05,z],[x,y1-.03,z]],{c:P.mute,w:1.3,a:a*.7,head:6});if(fl)R.flow([[x,y0+.05,z],[x,y1,z]],{c:c||P.acc,a:fl,r:.06,n:4,speed:1.1})}
  // a plate holding an object's properties: a few small blocks, the plate's name and its property names as two labels at its left edge
  function obj(R,x0,x1,z0,z1,y,name,props,c,a,o){o=o||{};const P=R.P;if(a<=.01)return;plate(R,x0,x1,z0,z1,y,c,a*(o.dim?.45:1));
    const n=o.blocks==null?(props?props.split(',').length:0):o.blocks;for(let i=0;i<n;i++)R.box([x0+.25+i*.32,y+.04,(z0+z1)/2],[.22,.1,.22],{fill:o.hot&&o.hot.indexOf(i)>=0?mix(P.paper,P.acc,.55):mix(P.paper,c,.3),a,shadow:false});
    L(R,[x0,y,z1],name,{al:'right',dx:-6,dy:-7,fs:12.5,b:1,c,a:a*(o.dim?.6:1)});if(props)L(R,[x0,y,z1],props,{al:'right',dx:-6,dy:9,mono:true,fs:12,c:P.ink,a:a*(o.dim?.6:1),wide:1})}  // property names hide on a phone; the step text names them

  // ---------- Fig. 1: the hero ----------
  if($('stg-hero')){
    const e1=ln('e1_classes',0).split(' '),TOTAL=e1[2],KEYS=(ln('e1_classes',1).match(/\[([^\]]*)\]/)||['',''])[1].trim(),MISS=ln('e1_classes',1).split('] ')[1].split(' ')[0],N=ln('d2_closures',0).split(' ')[0];
    const PRIM=['number','bigint','string','boolean','undefined','null','symbol'],ZB=1.75,ZH=-.9;
    const C={x0:.9,x1:2.3},M={x0:-1.0,x1:.2},Y={own:.3,top:1.0,cnt:1.7,obj:2.4,nul:3.05};
    const path=(ys)=>ys.map(y=>[1.6,y+.12,ZH]);
    function draw(R,k,e){const P=R.P;R.grid(-4.8,4.4,-2.4,2.6,.5);
      const f=(s)=>k===s?1:.25;                           // the step's subject at full strength, the rest receding
      // the binding plate, primitives on its left
      plate(R,-4.6,4.0,ZB-.6,ZB+.65,0,P.c1,.55,{nu:10,nv:2});if(k<=1)L(R,[-4.6,0,ZB+.65],'bindings: what a variable holds',{al:'left',dx:2,dy:12,fs:12.5,b:1,c:P.c1});
      const pa=k===0?1:.35;PRIM.forEach((t,i)=>{const x=-4.15+(i%4)*.95,z=ZB-.25+Math.floor(i/4)*.6;R.box([x,0,z],[.74,.22,.36],{fill:mix(P.paper,P.c5,k===0?.38:.2),a:k===0?at(k,e,0)*.9+.1:pa,shadow:false});
        if(k===0)L(R,[x,.22,z],t,{mono:true,fs:12,a:Math.max(.3,e),dy:-8,wide:1})});
      // three variables that hold references: msg (section 2), c (section 4), c1 (section 3)
      const ba=k===0?.25*off(0,e,0):1,va=k>=1?1:0;
      bind(R,-.4,ZB,'msg',k===0?0:f(1)*va+(k===1?0:.4),{hot:k===1});bind(R,1.6,ZB,'c',k===0?0:Math.max(f(1),k>=2&&k<=4?1:.35),{hot:k===1||(k>=3&&k<=4)});bind(R,3.4,ZB,'c1',k===0?0:Math.max(f(1),f(5)),{hot:k===1||k===5});
      // the objects they point at
      const oa=k>=1?(k===1?e:1):0;
      obj(R,M.x0,M.x1,ZH-.55,ZH+.55,Y.own,'msg\'s own','role, text, …',P.c1,oa*(k===1||k===2?1:k===5?.2:.35));
      obj(R,C.x0,C.x1,ZH-.55,ZH+.55,Y.own,'c\'s own',KEYS.replace(/'/g,''),P.c1,oa*(k===5?.22:1));
      R.box([3.4,0,ZH],[.9,.34,.6],{fill:mix(P.paper,P.c3,.3),a:oa*(k===5||k===1?1:.35)});L(R,[3.4,.34,ZH+.3],'{ inc, get }',{mono:true,fs:12,a:oa*(k===5||k===1?1:.35),dy:-8});
      ptr(R,[-.4,.26,ZB-.25],[-.4,Y.own,ZH+.5],.5,{a:oa*(k===1?1:.4),flow:k===1?e:0});
      ptr(R,[1.6,.26,ZB-.25],[1.6,Y.own,ZH+.5],.5,{a:oa*(k===1||k===3||k===4?1:.4),flow:k===1?e:0});
      ptr(R,[3.4,.26,ZB-.25],[3.4,.34,ZH+.3],.45,{a:oa*(k===1||k===5?1:.4),flow:k===1||k===5?1:0,c:k===5?P.c3:null});
      // every object has a prototype: c's chain of three, msg's of one, all ending at the same Object.prototype, then null
      const ca=k>=2?(k===2?e:1):0,cd=k===5?.22:1;
      obj(R,C.x0,C.x1,ZH-.5,ZH+.5,Y.top,'TopCounter.prototype','add',P.c4,ca*at(k,e,2)*cd);
      obj(R,C.x0,C.x1,ZH-.5,ZH+.5,Y.cnt,'Counter.prototype','add, total, toString',P.c4,ca*cd,{hot:k===3?[1]:null});
      obj(R,M.x0,C.x1,ZH-.55,ZH+.55,Y.obj,'Object.prototype','hasOwnProperty, toString, …',P.mute,ca*cd);
      if(ca>.01){[[Y.own,Y.top],[Y.top,Y.cnt],[Y.cnt,Y.obj]].forEach(([a,b])=>link(R,1.6,a,b,ZH,ca*cd,0));link(R,-.4,Y.own,Y.obj,ZH,ca*cd,0);
        L(R,[1.6,Y.nul,ZH],'null',{mono:true,fs:13,b:1,c:P.mute,a:ca*cd});R.line([[1.6,Y.obj+.05,ZH],[1.6,Y.nul-.12,ZH]],{c:P.mute,w:1.3,a:ca*cd*.7,head:6,dash:[4,4]})}
      // a property read climbs the chain: c.total stops at Counter.prototype; c.counts reaches null
      if(k===3||k===4){const pts=path(k===3?[Y.own,Y.top,Y.cnt]:[Y.own,Y.top,Y.cnt,Y.obj,Y.nul-.2]),p=along(pts,e);
        R.flow(pts,{c:P.acc,a:.9,r:.06,n:k===3?5:8,speed:1.1});R.glow(p,.32,{c:P.acc,a:.9,top:1});R.ball(p,.09,{c:P.acc,top:1});
        if(e>.97)L(R,p,k===3?'c.total → '+TOTAL:'c.counts → '+MISS,{al:'left',dx:14,mono:true,fs:13,b:1,c:k===3?P.good:P.bad})}
      // a closure: each function keeps the scope it was made in (n, after two calls of c1.inc)
      if(k===5){const sa=e;plate(R,2.95,3.85,ZH-1.25,ZH-.55,1.05,P.c3,sa);L(R,[3.85,1.05,ZH-.9],'its scope: n = '+N,{al:'left',dx:6,mono:true,fs:12.5,b:1,c:P.c3,a:sa});
        R.flowArc([3.4,.34,ZH-.1],[3.4,1.05,ZH-.9],.35,{c:P.c3,a:sa,r:.06,n:6,speed:1})}
    }
    const full={cam:[-.32,.6],bounds:[[-4.6,0,-1.6],[4.0,3.1,2.4]]};
    S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · values, references, prototypes, closures',cam:full.cam,bounds:full.bounds,aspect:.7,dur:1400,hold:4800,draw,
      margin:w=>w<520?[14,8,14,8]:[16,16,16,150],
      view:k=>k===0?{cam:[-.2,.75],bounds:[[-4.6,0,1.0],[-.8,.6,2.5]]}:k===1?{cam:[-.3,.62],bounds:[[-1.4,0,-1.5],[4.0,.5,2.4]]}:k===5?{cam:[-.4,.55],bounds:[[1.8,0,-2.3],[4.2,1.3,2.4]]}:k>=2?{cam:[-.35,.42],bounds:[[-1.4,0,-1.5],[2.6,3.2,1.2]]}:full});
  }

  // ---------- Fig. 2: copies (c4_copy) ----------
  if($('stg-copy')){
    const LEN=ln('c4_copy',0).split(' ');           // alias, shallow, deep msgs.length after the push: 2 2 1
    const ZB=1.7,ZO=-.2,ZA=-1.9,XB={conv:-3.0,alias:-1.6,shallow:.7,deep:3.0},XO={o1:-2.3,o2:.7,o3:3.0},XA={a1:-.8,d1:-2.9,a2:2.5,d2:3.6};
    function arr(R,x,n,a,o){const P=R.P;for(let i=0;i<n;i++){const nw=o.grow&&i===n-1;R.box([x,i*.26+(nw?.35*(1-o.e):0),ZA],[.95,.22,.55],{fill:mix(P.paper,i?P.c2:P.c6,.35),a:a*(nw?o.e:1),shadow:i===0})}
      L(R,[x,n*.26,ZA+.28],o.name,{mono:true,fs:12,a,dy:-8,b:o.b})}
    function date(R,x,a){const P=R.P;R.box([x,0,ZA],[.55,.3,.45],{fill:mix(P.paper,P.c5,.3),a});L(R,[x,.3,ZA+.22],'Date',{mono:true,fs:12,a,dy:-8,wide:1})}
    function top(R,x,a,hot){const P=R.P;R.box([x,0,ZO],[1.3,.32,.6],{fill:mix(P.paper,P.c1,hot?.4:.18),a});L(R,[x,.32,ZO+.3],'{ id, msgs, when }',{mono:true,fs:12,a,dy:-8,wide:1})}
    function draw(R,k,e){const P=R.P;R.grid(-4.4,4.6,-2.8,2.6,.5);
      plate(R,-3.9,4.0,ZB-.5,ZB+.5,0,P.c1,.5,{nu:8,nv:2});
      const A=s=>k<s?0:k===s?e:1,F=s=>k===s?1:k===4?.9:.35;
      // conv: a fresh object, its msgs array (one message) and its date
      bind(R,XB.conv,ZB,'conv',1,{hot:k===0});top(R,XO.o1,1,k<=1);arr(R,XA.a1,k===4?2:1,1,{grow:k===4,e,name:'msgs',b:k===4});date(R,XA.d1,F(0)*.9);
      ptr(R,[XB.conv,.26,ZB-.25],[XO.o1-.2,.32,ZO+.3],.4,{a:1,flow:k===0?1:0});
      ptr(R,[XO.o1+.3,.32,ZO-.3],[XA.a1,.26,ZA+.28],.5,{a:k===0||k>=2?1:.5,flow:k===0||k===2||k===4?.9:0,c:P.c6});ptr(R,[XO.o1-.4,.32,ZO-.3],[XA.d1,.3,ZA+.2],.4,{a:F(0)});
      // alias: a second name for the same object
      bind(R,XB.alias,ZB,'alias',A(1),{hot:k===1});ptr(R,[XB.alias,.26,ZB-.25],[XO.o1+.2,.32,ZO+.3],.45,{a:A(1),flow:k===1||k===4?1:0});
      // shallow: a new top object whose msgs and when point at the same array and date
      bind(R,XB.shallow,ZB,'shallow',A(2),{hot:k===2});top(R,XO.o2,A(2),k===2);ptr(R,[XB.shallow,.26,ZB-.25],[XO.o2,.32,ZO+.3],.4,{a:A(2),flow:k===2?1:0});
      ptr(R,[XO.o2-.3,.32,ZO-.3],[XA.a1+.2,.26,ZA+.28],.55,{a:A(2),flow:k===2||k===4?1:0,c:P.c6});ptr(R,[XO.o2-.5,.32,ZO-.3],[XA.d1+.1,.3,ZA+.2],.7,{a:A(2)*F(2)});
      // deep: every level copied
      bind(R,XB.deep,ZB,'deep',A(3),{hot:k===3});top(R,XO.o3,A(3),k===3);arr(R,XA.a2,1,A(3),{name:'its own msgs'});date(R,XA.d2,A(3)*F(3));
      ptr(R,[XB.deep,.26,ZB-.25],[XO.o3,.32,ZO+.3],.4,{a:A(3),flow:k===3?1:0});ptr(R,[XO.o3-.3,.32,ZO-.3],[XA.a2,.26,ZA+.28],.4,{a:A(3),flow:k===3?1:0,c:P.c6});ptr(R,[XO.o3+.3,.32,ZO-.3],[XA.d2,.3,ZA+.2],.4,{a:A(3)*F(3)});
      // after the push: what each variable now sees
      if(k===4){[['alias',LEN[0]],['shallow',LEN[1]],['deep',LEN[2]]].forEach(([b,v])=>L(R,[XB[b],.26,ZB+.25],'.msgs.length '+v,{mono:true,fs:12.5,b:1,dy:12,c:b==='deep'?P.good:P.c2,a:e}))}
    }
    S3.stage({id:'stg-copy',list:'sx-copy',fig:'Fig. 2 · alias, shallow and deep copies, then one push',cam:[-.25,.62],bounds:[[-3.9,0,-2.3],[4.0,1.0,2.3]],aspect:.62,dur:1300,hold:4500,draw,
      view:()=>document.getElementById('stg-copy').clientWidth<520?{cam:[-.08,.9],bounds:[[-3.9,0,-2.3],[4.0,1.0,2.3]]}:null, // a phone: square on and steeper, so the row fills the tall card
      margin:w=>w<520?[12,8,22,8]:[16,16,28,16]});
  }

  // ---------- Fig. 3: closures (d2_closures) ----------
  if($('stg-clo')){
    const NN=ln('d2_closures',0).split(' '),ARR=ln('d2_closures',1).match(/\[[^\]]*\]/g);  // "2 1"; "[ 3, 3, 3 ]", "[ 0, 1, 2 ]"
    const ZB=1.7,ZF=.1,ZS=-1.3,YS=1.0,XS=-3.4,G=[{b:-1.7,f:[-2.15,-1.25]},{b:.6,f:[.15,1.05]}],XV=[3.0,3.8,4.6],XL=[5.9,6.8,7.7];
    function fn(R,x,z,t,a,c){const P=R.P;R.box([x,0,z],[.66,.3,.45],{fill:mix(P.paper,c||P.c3,.3),a,shadow:false});L(R,[x,.3,z+.22],t,{mono:true,fs:12,a,dy:-8})}
    function scope(R,x0,x1,txt,a,hot){const P=R.P;plate(R,x0,x1,ZS-.4,ZS+.4,YS,P.c3,a,{nu:3,nv:2});L(R,[(x0+x1)/2,YS,ZS-.4],txt,{mono:true,fs:12.5,b:1,c:hot?P.c3:P.ink,a,dy:-10})}
    function draw(R,k,e){const P=R.P;R.grid(-4.4,8.4,-2.6,2.6,.5);
      const left=k<=3?1:.22;
      plate(R,-4.2,1.6,ZB-.5,ZB+.5,0,P.c1,.5*left,{nu:6,nv:2});
      // the call stack: a frame for makeCounter() while it runs
      if(k<=2)L(R,[XS,0,ZB-1.2],'call stack',{fs:12,b:1,c:P.mute,a:left,dy:12});
      const fr=k===0?e:k===1?1-e:k===2?(e<.5?e*2:2-e*2):0;R.box([XS,0,ZF],[1.3,.32,.6],{fill:mix(P.paper,P.acc,.3),a:fr});L(R,[XS,.32,ZF+.3],'makeCounter()',{mono:true,fs:12,a:fr,dy:-8});
      // the two counters: a scope each, and the two functions that keep it
      G.forEach((g,i)=>{const born=i===0?0:2,a=(k<born?0:k===born?e:1)*left,n=k>=3?(k===3?(e>.5?NN[i]:'0'):NN[i]):'0';
        if(a<=.01)return;
        scope(R,g.f[0]-.45,g.f[1]+.45,'n = '+n,a,k===3);
        if(k===born)R.flowArc([XS+.6,.32,ZF],[(g.f[0]+g.f[1])/2,YS,ZS],.4,{c:P.acc,a:a*(i===0&&k===0?1:fr>0?1:.3),r:.06,n:6});
        const fa=i===0?(k===0?0:k===1?e:1)*left:a;
        fn(R,g.f[0],ZF,'inc',fa);fn(R,g.f[1],ZF,'get',fa);
        g.f.forEach(x=>{R.arc([x,.3,ZF-.2],[x,YS,ZS+.35],.3,{c:P.c3,w:1.3,a:fa*.7,head:6});if(k===1&&i===0||k===2&&i===1||k===3)R.flowArc([x,.3,ZF-.2],[x,YS,ZS+.35],.3,{c:P.c3,a:fa,r:.06,n:4})});
        bind(R,g.b,ZB,i?'c2':'c1',fa,{hot:k===born+1||k===3});ptr(R,[g.b,.26,ZB-.25],[(g.f[0]+g.f[1])/2,.3,ZF+.25],.35,{a:fa,flow:k===3?.8:0})});
      if(k===3)L(R,[-.55,0,ZB+.5],'prints '+NN.join(' '),{mono:true,fs:13,b:1,c:P.good,a:e,dy:16});
      // the loops: var gives three closures one i; let gives each iteration its own j
      const va=k>=4?(k===4?e:k===5?.45:1):0,la=k>=5?e:0;
      if(va>.01){scope(R,XV[0]-.45,XV[2]+.45,'one i = 3',va,k===4);XV.forEach((x,i)=>{fn(R,x,ZF,'f'+i,va,P.c2);R.arc([x,.3,ZF-.2],[(XV[0]+XV[2])/2+(x-XV[1])*.4,YS,ZS+.35],.3,{c:P.bad,w:1.3,a:va*.8,head:6});
          if(k===4)R.flowArc([x,.3,ZF-.2],[(XV[0]+XV[2])/2+(x-XV[1])*.4,YS,ZS+.35],.3,{c:P.bad,a:va,r:.06,n:4})});
        L(R,[XV[1],0,ZF+.6],'var: prints '+ARR[0],{mono:true,fs:12.5,b:1,c:P.bad,a:va,dy:14})}
      if(la>.01){XL.forEach((x,i)=>{scope(R,x-.38,x+.38,'j = '+i,la,1);fn(R,x,ZF,'f'+i,la,P.c2);R.arc([x,.3,ZF-.2],[x,YS,ZS+.35],.3,{c:P.good,w:1.3,a:la*.8,head:6});R.flowArc([x,.3,ZF-.2],[x,YS,ZS+.35],.3,{c:P.good,a:la,r:.06,n:4})});
        L(R,[XL[1],0,ZF+.6],'let: prints '+ARR[1],{mono:true,fs:12.5,b:1,c:P.good,a:la,dy:14})}
    }
    const A={cam:[-.3,.55],bounds:[[-4.3,0,-1.8],[1.7,1.2,2.3]]};
    S3.stage({id:'stg-clo',list:'sx-clo',fig:'Fig. 3 · a closure keeps the scope it was made in',cam:A.cam,bounds:A.bounds,aspect:.62,dur:1400,hold:4600,draw,
      margin:w=>w<520?[16,8,22,8]:[22,16,28,16],
      view:k=>k===4?{cam:[-.25,.55],bounds:[[2.2,0,-1.8],[5.4,1.2,1.4]]}:k===5?{cam:[-.2,.55],bounds:[[2.2,0,-1.8],[8.3,1.2,1.4]]}:A});
  }

  // ---------- Fig. 4: prototype lookups (e2_prototype) ----------
  if($('stg-proto')){
    const L0=ln('e2_prototype',0),L1=ln('e2_prototype',1).split(' '),L2=ln('e2_prototype',2),L3=ln('e2_prototype',3);  // "true true"; "true false true"; "hello from the prototype []"; "patched at run time"
    const GREET=L2.replace(/ \[\]$/,'');
    const ZH=-.4,XD=-1.2,XC=2.2,Y={own:.3,dog:1.0,ani:1.7,obj:2.4,nul:3.05},W=.75;
    function draw(R,k,e){const P=R.P;R.grid(-4.2,4.6,-2.6,2.6,.5);
      const py=k===5,dA=k===3?.3:1,pa=s=>k<s?0:k===s?e:1;
      // the binding plate: d and child
      plate(R,-3.4,3.6,1.1,2.1,0,P.c1,.5,{nu:6,nv:2});bind(R,XD,1.6,'d',1,{hot:k!==3});bind(R,XC,1.6,'child',pa(3),{hot:k===3});
      ptr(R,[XD,.26,1.35],[XD,Y.own,ZH+.5],.45,{a:dA,flow:k===1||k===2||k===4?.8:0});
      // d's chain: own properties, Dog.prototype, Animal.prototype, then Object.prototype (shared with child's chain) and null
      const ch=k===0?e:1,hot=k===4;
      obj(R,XD-W,XD+W,ZH-.5,ZH+.5,Y.own,py?'d.__dict__':'d (own)','name',P.c1,dA*ch,{hot:k===1?[0]:null});
      obj(R,XD-W,XD+W,ZH-.5,ZH+.5,Y.dog,py?'Dog':'Dog.prototype',hot?'speak (patched)':'speak',P.c4,dA*at(k,e,0)*ch,{hot:k===2||hot?[0]:null});
      obj(R,XD-W,XD+W,ZH-.5,ZH+.5,Y.ani,py?'Animal':'Animal.prototype','speak',P.c4,dA*ch,{dim:k===2});
      obj(R,XD-W,XC+W,ZH-.55,ZH+.55,Y.obj,py?'object':'Object.prototype','hasOwnProperty, …',P.mute,ch);
      [[Y.own,Y.dog],[Y.dog,Y.ani],[Y.ani,Y.obj]].forEach(([a,b])=>link(R,XD,a,b,ZH,dA*ch,0));
      L(R,[XD,Y.nul,ZH],py?'AttributeError':'null',{mono:true,fs:13,b:1,c:py?P.bad:P.mute,a:ch});R.line([[XD,Y.obj+.05,ZH],[XD,Y.nul-.12,ZH]],{c:P.mute,w:1.3,a:ch*.7,head:6,dash:[4,4]});
      // Object.create(base): child has no own properties; base is its prototype, with no class anywhere
      const ca=pa(3)*(k===3?1:.35);
      if(ca>.01){obj(R,XC-W,XC+W,ZH-.5,ZH+.5,Y.own,'child (own)','',P.c1,ca,{blocks:0});obj(R,XC-W,XC+W,ZH-.5,ZH+.5,1.35,'base','greet',P.c4,ca,{hot:k===3?[0]:null});
        link(R,XC,Y.own,1.35,ZH,ca,0);link(R,XC,1.35,Y.obj,ZH,ca,0);ptr(R,[XC,.26,1.35],[XC,Y.own,ZH+.5],.45,{a:ca,flow:k===3?.8:0})}
      // the lookups, each climbing until it finds the name
      const climb=(x,ys,c,txt)=>{const pts=ys.map(y=>[x,y+.12,ZH]),p=along(pts,e);R.flow(pts,{c,a:.9,r:.06,n:Math.max(3,ys.length*2),speed:1.1});
        R.glow(p,.3,{c,a:.9,top:1});R.ball(p,.09,{c,top:1});if(e>.97&&txt)L(R,p,txt,{al:'left',dx:14,mono:true,fs:12.5,b:1,c:P.good})};
      if(k===1)climb(XD,[Y.own-.05,Y.own],P.acc,'own: hasOwn '+L1[0]);
      if(k===2)climb(XD,[Y.own,Y.dog],P.acc,'hasOwn '+L1[1]+', in '+L1[2]);
      if(k===3)climb(XC,[Y.own,1.35],P.acc,'');
      if(k===4)climb(XD,[Y.own,Y.dog],P.acc,L3);
      if(k===5)climb(XD,[Y.own,Y.dog,Y.ani,Y.obj,Y.nul-.2],P.c2,'');
      if(k===0&&e>.9)L(R,[XD+W,Y.ani,ZH],'getPrototypeOf checks: '+L0,{al:'left',dx:10,mono:true,fs:12,c:P.good,wide:1});
      if(k===3&&e>.9)L(R,[XC+W,1.35,ZH+.5],GREET,{al:'right',dy:24,mono:true,fs:12.5,b:1,c:P.good});
    }
    const full={cam:[-.35,.4],bounds:[[-2.8,0,-1.0],[3.0,3.1,2.1]]};
    S3.stage({id:'stg-proto',list:'sx-proto',fig:'Fig. 4 · a lookup climbs the chain until it finds the name',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:4800,draw,
      margin:w=>w<520?[14,8,14,8]:[16,16,16,150],
      view:k=>k===0?{cam:[-.35,.38],bounds:[[-3.0,0,-1.0],[1.2,3.1,2.1]]}:k===1||k===2||k===4?{cam:[-.4,.4],bounds:[[-2.6,0,-1.0],[.4,2.0,2.0]]}:full});
  }
})();
