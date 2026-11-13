// ---- Scene: a virtual call followed through memory (section 2; renderer v2: a few large objects per step, camera in close, glass vtables, flowing dots on every load and jump) ----
// Steps 1 to 4: Plain and Virtual from sizes.cpp, to scale, one cube per byte (sizeof printed 8 and 16, CT_DATA.sizes).
// Steps 5 to 8: dispatch.cpp's benchmark. The eight objects are the first eight of its "3 classes mixed" vector (CT_DATA.first, from
// first_shapes.cpp: the same mt19937 seed and draws); drawn smaller, heap positions illustrative. The ns labels are the medians of CT_DATA.dispatch.
(function(){
  if(!document.getElementById('stg-vt')||!window.CT_DATA)return;const {at,off,lerp,mix,cl}=S3;
  const D=CT_DATA,sz=n=>(D.sizes.find(r=>r[0].startsWith(n))||[0,0])[1],SP=sz('Plain'),SV=sz('Virtual');
  const ns=l=>{const r=D.dispatch.rows.find(x=>x.label===l);return r?r:{o:0,s:0}};
  const f2=v=>(+v).toFixed(2);
  // ---- world A: one object, to scale
  const B=.16,ZO=.3,ZT=-1.35,ZC=-2.75,ZS=1.95,XP=-3.1,XV=0,XV2=2.9,XT=1.0,XF=3.2;
  const cubes=(R,x0,n,y,z,fill,a)=>{for(let i=0;i<n;i++)R.box([x0+(i+.5)*B,y,z],[B*.9,.34,.56],{fill:fill(i),a,shadow:false,lw:.6})};
  function objPlain(R,a){const P=R.P;cubes(R,XP-SP*B/2,SP,0,ZO,()=>mix(P.paper,P.c1,.25),a)}
  function objVirt(R,x,a){const P=R.P;cubes(R,x-SV*B/2,SV,0,ZO,i=>i<SV-SP?mix(P.paper,P.acc,.55):mix(P.paper,P.c1,.25),a)}
  const vptrC=x=>[x-SV*B/2+(SV-SP)*B/2,.36,ZO],YS=[.1+1.05*(2.5/3),.1+1.05*(1.5/3),.1+1.05*(.5/3)]; // slot centres: type info, f, ~Virtual
  function worldA(R,k,e,A){const P=R.P;if(A<=.01)return;
    const fadeP=k===0?1:k===1?lerp(1,.22,e):.22;
    objPlain(R,A*fadeP);R.label([XP,.36,ZO],'Plain · '+SP+' B',{dy:-10,fs:12.5,b:1,a:A*Math.max(.45,fadeP)});
    R.box([XP,0,ZC],[1.4,.5,.6],{fill:mix(P.paper,P.c3,.3),a:A*fadeP});R.label([XP,.52,ZC],'Plain::f',{mono:true,fs:12.5,dy:-9,a:A*Math.max(.45,fadeP)});
    if(k===0){R.label([XP,0,ZS],'p.f()',{mono:true,fs:13.5,b:1,c:P.c3,a:A});R.flowArc([XP,.05,ZS],[XP,.55,ZC],1.15,{c:P.c3,a:A*.95,r:.075,speed:1.4})}
    const va=k===0?0:k===1?e:1;
    if(va>0){objVirt(R,XV,A*va);R.label([XV,.36,ZO],'Virtual · '+SV+' B',{dy:-10,fs:12.5,b:1,a:A*va});
      if(k<3)R.label(vptrC(XV),'vptr',{mono:true,fs:12,dy:24,c:P.acc,b:1,a:A*va})}
    // the vtable: one glass plate per class, three slots; a second object shares it
    const ta=k<2?0:k===2?e:1;
    if(ta>0){R.glass([XT-.7,.1,ZT],[1.4,0,0],[0,1.05,0],{c:P.acc,a:A*ta,nu:1,nv:3});
      ['type info','f','~Virtual'].forEach((t,i)=>R.label([XT,YS[i],ZT],t,{mono:true,fs:12,b:i===1&&k===3,c:i===1&&k===3?P.acc:P.ink,a:A*ta}));
      R.label([XT-.7,1.15,ZT],'vtable for Virtual',{al:'right',dx:-6,fs:12.5,b:1,c:P.acc,a:A*ta,wide:1});
      objVirt(R,XV2,A*ta);R.label([XV2,.36,ZO],'another Virtual',{dy:-10,fs:12,a:A*ta,wide:1});
      if(k===2)[XV,XV2].forEach(x=>R.flowArc(vptrC(x),[XT,1.0,ZT],.45,{c:P.acc,a:A*ta*.9,r:.06,n:6,speed:1.2}));
      R.box([XF,0,ZC],[1.4,.5,.6],{fill:mix(P.paper,P.acc,.3),a:A*ta});R.label([XF,.52,ZC],'Virtual::f',{mono:true,fs:12.5,dy:-9,a:A*ta})}
    // the call: load the vptr, load f's address, jump
    if(k===3){const c0=[XV,.05,ZS],v=vptrC(XV),sf=[XT+.7,YS[1],ZT+.02],fn=[XF,.52,ZC];
      R.label([XV,0,ZS],'p->f()',{mono:true,fs:13.5,b:1,c:P.acc,a:A});
      const a1=cl(e*3,0,1),a2=cl(e*3-1,0,1),a3=cl(e*3-2,0,1);
      R.flowArc(c0,v,.3,{c:P.acc,a:A*a1,r:.07,n:6,speed:1.2});R.flowArc(v,sf,.35,{c:P.acc,a:A*a2,r:.07,n:7,speed:1.2});R.flowArc(sf,fn,.25,{c:P.acc,a:A*a3,r:.07,n:6,speed:1.2});
      R.label(R.arcPt(c0,v,.3,.5),'1 load vptr',{al:'left',dx:8,fs:12,b:1,c:P.acc,a:A*a1});
      R.label([XT-.7,YS[1],ZT],'2 load f',{al:'right',dx:-8,fs:12,b:1,c:P.acc,a:A*a2});
      R.label(R.arcPt(sf,fn,.25,.45),'3 jump',{al:'left',dx:10,dy:16,fs:12,b:1,c:P.acc,a:A*a3})}
    // row names, on wide canvases
    [['call site',ZS],['objects',ZO],['vtable',ZT],['code',ZC]].forEach(([t,z])=>R.label([-4.1,.15,z],t,{al:'right',dx:-6,fs:12,c:P.mute,grp:'rowA',a:A}))}
  // ---- world B: the benchmark's vector of pointers, its objects, three vtables, three functions
  const CL=['Sq','Rect','Tri'],NF={Sq:2,Rect:3,Tri:3},CW=.3,GAP=.16,PW=.42,ZH=.3;
  const mixed=D.first.objs.map(o=>o[0]),one=mixed.map(()=>'Sq');
  const sorted=[0,1,2,3,4,5,6,7].sort((a,b)=>CL.indexOf(mixed[a])-CL.indexOf(mixed[b])||a-b); // stable, as std::stable_sort by class
  const XT3={Sq:-2.5,Rect:0,Tri:2.5};
  function packed(kinds){const w=kinds.map(c=>NF[c]*CW),tot=w.reduce((s,x)=>s+x,0)+GAP*(kinds.length-1);let x=-tot/2;return w.map(wi=>{const c=x+wi/2;x+=wi+GAP;return c})}
  // scattered: the mixed objects at shuffled, spread-out heap addresses (illustrative)
  const SCAT=[[3.6,-.5],[-4.1,.75],[1.1,.95],[-1.6,-.6],[4.4,.7],[-3.2,-.55],[.2,-.35],[-.9,.9]];
  const ptrX=i=>(i-3.5)*PW;
  function colOf(P,c){return c==='Sq'?P.c1:c==='Rect'?P.c3:P.c5}
  function obj(R,x,z,c,a){const P=R.P,n=NF[c],x0=x-n*CW/2;
    for(let i=0;i<n;i++)R.box([x0+(i+.5)*CW,0,z],[CW*.92,.42,.5],{fill:i===0?mix(P.paper,P.acc,.55):mix(P.paper,colOf(P,c),.45),a,shadow:false,lw:.6})}
  function worldB(R,k,e,A){const P=R.P;if(A<=.01)return;
    const vis=k===4?one:k===6?sorted.map(i=>mixed[i]):mixed;          // classes in visiting order
    let xs,zs=vis.map(()=>ZO);
    if(k===4)xs=packed(one);
    else if(k===5)xs=packed(mixed);
    else if(k===6){const fromX=packed(mixed),toX=packed(vis);xs=sorted.map((o,i)=>lerp(fromX[o],toX[i],e))}
    else{const fromX=packed(mixed);xs=fromX.map((x,i)=>lerp(x,SCAT[i][0],e));zs=SCAT.map(q=>lerp(ZO,ZO+q[1],e))}
    const used=new Set(vis);
    if(k===7)R.quad([[-5,0,ZO-.95],[5,0,ZO-.95],[5,0,ZO+1.2],[-5,0,ZO+1.2]],{fill:mix(P.paper,P.line,.35),a:A*.6,dz:300,ea:.4});
    // vtables, each with its function behind it; faded when no object of that class is in the vector
    CL.forEach(c=>{const u=used.has(c)?1:.18,x=XT3[c],col=colOf(P,c);
      R.glass([x-.55,.1,ZT],[1.1,0,0],[0,.7,0],{c:col,a:A*u,nu:1,nv:2});R.label([x,.1+.7*.75,ZT],'area',{mono:true,fs:12,a:A*u});
      R.box([x,0,ZC],[1.3,.4,.5],{fill:mix(P.paper,col,.35),a:A*u});R.label([x,.42,ZC],c+'::area',{mono:true,fs:12.5,b:1,dy:-9,c:col,a:A*u});
      if(used.has(c))R.flow([[x,.45,ZT],[x,.42,ZC]],{c:col,a:A*.8,r:.06,n:4,speed:1})});
    // pointers (the vector of unique_ptr) tinted by their target's class; red marks where the target changes from one call to the next
    vis.forEach((c,i)=>{R.box([ptrX(i),0,ZS],[PW*.86,.22,.44],{fill:mix(P.paper,colOf(P,c),.6),a:A,shadow:false,lw:.6});
      if(i>0&&c!==vis[i-1]&&k!==4){R.glow([ptrX(i)-PW/2,.4,ZS],.2,{c:P.bad,a:A*.8});R.ball([ptrX(i)-PW/2,.4,ZS],.07,{c:P.bad,a:A})}});
    // objects; flows: pointer -> object (the load), object's vptr -> its class's vtable
    vis.forEach((c,i)=>{const x=xs[i],z=zs[i];obj(R,x,z,c,A);const vx=x-NF[c]*CW/2+CW/2,far=Math.hypot(x-ptrX(i),z-ZO);
      R.flowArc([ptrX(i),.22,ZS],[x,.42,z+.1],.25+far*.06,{c:P.ink,a:A*(k===7?.75:.45),r:.05,n:k===7?5:3,speed:1.1});
      R.flowArc([vx,.42,z],[XT3[c],.7,ZT],.35,{c:colOf(P,c),a:A*.7,r:.05,n:4,speed:1.2})});
    const m=k===4?'one class, in order: '+f2(ns('virtual, one class').o)+' ns per object':k===5?'3 classes mixed: '+f2(ns('virtual, 3 classes mixed').o)+' ns':k===6?'sorted by class: '+f2(ns('virtual, 3 classes sorted').o)+' ns':'scattered, mixed: '+f2(ns('virtual, 3 classes mixed').s)+' ns';
    R.label([0,0,ZS+.5],m,{fs:15,b:1,dy:16,c:k===5||k===7?P.bad:P.acc,a:A});
    [['pointers',ZS],['objects',ZO],['vtables',ZT],['code',ZC]].forEach(([t,z])=>R.label([-5,.15,z],t,{al:'right',dx:-6,fs:12,c:P.mute,grp:'rowB',a:A}))}
  function draw(R,k,e){R.grid(-8,8,-3.4,2.6,.5);
    const A=k<4?1:k===4?cl(1-2*e,0,1):0,Bv=k<4?0:k===4?cl(2*e-1,0,1):1;
    worldA(R,k,e,A);worldB(R,k,e,Bv)}
  const full={cam:[.12,.66],bounds:[[-4.2,0,-3.1],[3.9,1.2,2.4]]};
  S3.stage({id:'stg-vt',list:'sx-vt',fig:'A virtual call, followed through memory',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:4600,draw,
    view:k=>k===0?{cam:[.12,.62],bounds:document.getElementById('stg-vt').clientWidth<520?[[-3.9,0,-3.1],[-2.3,1,2.4]]:[[-4.4,0,-3.1],[-1.8,1,2.4]]}:k===1?{cam:[.12,.62],bounds:[[-4.4,0,-3.1],[1.6,1,2.4]]}:k===2?{cam:[.12,.86],bounds:full.bounds}:k===3?{cam:[.18,.6],bounds:[[-1.6,0,-3.1],[4,1.2,2.4]]}:
      k===7?{cam:[.08,1.0],bounds:[[-5,0,-3.1],[5,1,2.6]]}:{cam:[.08,.98],bounds:[[-4.6,0,-3.1],[4.4,1,2.6]]},
    margin:w=>w<520?[30,10,14,10]:[34,14,16,150]});
})();
