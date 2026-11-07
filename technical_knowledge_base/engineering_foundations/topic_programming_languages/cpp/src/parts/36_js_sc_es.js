// ---- Fig. 1, the hero (renderer v2): one small program from source to the machine, each piece pinned where it acts and linked to its owner.
// Driven by CA_DATA.build (the recorded build: line counts, object sizes, the otool list, the hero's vector run) and CA_DATA.ub.double_free.
// Box heights in the build are log10 of the line count (stated in the step list); the vector's fields and floats are drawn to scale in bytes.
// Steps (ol#sx-es): 0 sources, 1 preprocess, 2 compile, 3 link, 4 run, 5 closing brace, 6 double free, 7 the cache ladder, 8 the whole map. ----
(function(){
  if(!document.getElementById('stg-es')||!window.CA_DATA)return;const {at,off,cl,mix,lerp}=S3;
  const B=CA_DATA.build,O=B.out,U=CA_DATA.ub.double_free;
  const num=(s,rx)=>{const m=String(s).match(rx);return m?+m[1]:NaN},fmt=n=>n.toLocaleString('en-US');
  const LN={main:num(O.b_pp_count,/(\d+) main\.cpp/),h:num(O.b_pp_count,/(\d+) tokens\.h/),tok:B.files['build1/tokens.cpp'].split('\n').length,
    sv:num(O.b_pp_count,/<string_view> alone: (\d+)/),tuMain:num(O.b_pp_count,/total\n\s*(\d+)/),tuTok:num(O.b_pp_tokens,/\n\s*(\d+)/)};
  const SZ={main:num(O.b_sizes,/(\d+) main\.o/),tok:num(O.b_sizes,/(\d+) tokens\.o/),app:num(O.b_sizes,/(\d+) app/)};
  const LIBS=(O.b_otool.match(/\/usr\/lib\/(\S+)/g)||[]).map(s=>s.replace('/usr/lib/',''));
  const V={obj:num(O.h_vector,/v itself: (\d+) bytes/),heap:num(O.h_vector,/operator new: (\d+) bytes/),n:num(O.h_vector,/v\.data\(\): (\d+) floats/),fl:num(O.h_vector,/floats of (\d+) bytes/)};
  const DF={region:num(U.san,/(\d+)-byte region/)};
  const H=n=>.3*Math.log10(n);                         // a source or translation unit: height log10(lines)
  const BW=.04;                                       // world units per byte, for the vector and the double free
  // where things stand
  const XS=-7.0,XT=-5.2,XO=-3.5,XA=-1.8;              // build columns: sources, translation units, objects, app
  const ZM=-.6,ZK=.8;                                 // rows: main.cpp's translation unit (back), tokens.cpp's (front)
  const YS=1.45,YH=.04,XST=1.25,XHP=3.35;             // the stack plate's height, the heap plate's, their centres
  const XC=6.4,LAD=[{n:'DRAM',y:0,w:2.6},{n:'L2',y:1.05,w:1.9},{n:'L1',y:1.85,w:1.25},{n:'registers',y:2.5,w:.6}];
  function file(R,x,z,h,nm,o){R.box([x,0,z],[.9,h,.5],{fill:o.fill,a:o.a});if(o.lab)R.label([x+(o.al==='left'?.45:-.45),h*.5,z],nm,{mono:true,fs:12,al:o.al||'right',dx:o.al==='left'?10:-10,a:Math.max(.5,o.a),c:o.c,b:o.b,grp:o.grp})}
  function draw(R,k,e){const P=R.P;R.grid(-8,8.2,-2.4,2.4,.5);
    const last=k===8;
    // ---- the build ----
    const aSrc=last?.55:k===0?1:k===1?.75:k<=3?.3:.14,blue=mix(P.paper,P.c1,.35);
    const SRC=[['main.cpp',ZM,LN.main],['tokens.h',.1,LN.h],['tokens.cpp',ZK+.15,LN.tok]];
    SRC.forEach(([nm,z,l])=>file(R,XS,z,H(l),nm+' · '+l+' lines',{a:aSrc,fill:blue,grp:'src',lab:k<=1}));
    // the standard headers, behind: they hold nearly all the lines
    const aStd=k===1?Math.max(.14,e):k===0?.14:last?.4:k<=3?.25:.1;
    file(R,XS,-1.7,H(LN.sv),'<string_view> alone · '+fmt(LN.sv),{a:aStd,fill:mix(P.paper,P.c5,.4),lab:k===1,c:P.c5,b:1,grp:'src'});
    // translation units: they rise as the headers are pasted in
    const aTU=k===0?.14:k===1?Math.max(.14,e):k===2?.7:k===3?.3:last?.55:.12,gr=k===1?Math.max(.04,e):1;
    file(R,XT,ZM,H(LN.tuMain)*gr,'TU · '+fmt(LN.tuMain)+' lines',{a:aTU,fill:mix(P.paper,P.c5,.3),lab:k===1||k===2,al:'left',b:1,c:P.c5,grp:'tu'});
    file(R,XT,ZK,H(LN.tuTok)*gr,'TU · '+fmt(LN.tuTok)+' lines',{a:aTU,fill:mix(P.paper,P.c5,.3),lab:k===1||k===2,al:'left',b:1,c:P.c5,grp:'tu'});
    if(k===1){[[-1.7,P.c5,10,LN.sv,ZM],[ZM,P.c1,4,LN.main,ZM],[.1,P.c1,3,LN.h,ZM],[.1,P.c1,3,LN.h,ZK],[ZK+.15,P.c1,4,LN.tok,ZK]].forEach(([z,c,n,l,zt])=>
        R.flowArc([XS+.3,H(l)+.02,z],[XT-.1,H(zt===ZM?LN.tuMain:LN.tuTok)*gr+.05,zt],.4,{c,a:.85,r:.06,n}))}
    // object files
    const aO=k<=1?.14:k===2?1:k===3?.8:last?.55:.12,green=mix(P.paper,P.c3,.35);
    [['main.o',ZM,SZ.main,'U count_tokens'],['tokens.o',ZK,SZ.tok,'T count_tokens']].forEach(([nm,z,sz,sym])=>{
      R.box([XO,0,z],[.9,.42,.5],{fill:green,a:aO});
      if(k===2||k===3)R.label([XO,.42,z],nm+' · '+fmt(sz)+' B',{mono:true,fs:12,dy:-10,grp:'obj',a:Math.max(.6,aO),b:1});
      if(k===2)R.label([XO+.45,.2,z],sym,{mono:true,fs:12,al:'left',dx:8,c:sym[0]==='U'?P.bad:P.good,b:1,grp:'sym',a:Math.max(.6,aO)})});
    if(k===2)[ZM,ZK].forEach(z=>R.flow([[XT+.45,.9,z],[XO-.45,.3,z]],{c:P.c5,a:.9,r:.06,n:5}));
    // the executable and the two dynamic libraries it names (loaded at start, so drawn apart, dashed)
    const aA=k<=2?.14:k===3?Math.max(.14,e*1.5):last?.6:.14;
    R.box([XA,0,.1],[1.0,.62,.8],{fill:mix(P.paper,P.acc,.3),a:Math.min(1,aA)});
    if(k===3){[ZM,ZK].forEach(z=>R.flow([[XO+.45,.25,z],[XA-.5,.3,.1+z*.3]],{c:P.c3,a:.9,r:.06,n:5}));
      R.label([XA,.62,.1],'app · '+fmt(SZ.app)+' B',{mono:true,fs:12.5,dy:-16,b:1,c:P.acc,a:Math.min(1,aA)})}
    LIBS.forEach((nm,i)=>{const z=i?1.6:-1.4,a=k===3?Math.max(.14,cl(e*1.5-.4,0,1)):k<=2?.1:last?.4:.1;R.box([XA,0,z],[.9,.28,.42],{a,fa:.55});
      R.line([[XA,.3,i?.5:-.3],[XA,.3,z+(i?-.2:.2)]],{c:P.mute,w:1.4,dash:[4,3],a});if(k===3)R.label([XA+.45,.14,z],nm,{mono:true,fs:12,al:'left',dx:8,c:P.mute,a:Math.max(.5,a),grp:'lib'})});
    // ---- the running process: the stack and the heap ----
    const pA=k<4?.14:k<=6?1:k===7?.3:.55;
    R.glass([XST-1.0,YS,-.9],[2.0,0,0],[0,0,1.8],{c:P.c1,a:pA,nu:6,nv:4});
    R.glass([XHP-1.25,YH,-.9],[2.5,0,0],[0,0,1.8],{c:P.c4,a:pA,nu:8,nv:4});
    [-1,1].forEach(sx=>[-1,1].forEach(sz=>R.line([[XST+sx*.97,0,sz*.85],[XST+sx*.97,YS,sz*.85]],{c:P.line,w:1,a:pA*.5})));
    if(k>=4&&!last){R.label([XST-1.0,YS,.9],'stack',{al:'right',dx:-6,fs:12.5,b:1,c:P.c1,a:pA,grp:'pl'});R.label([XHP+1.25,YH,.9],'heap',{al:'left',dx:6,fs:12.5,b:1,c:P.c4,a:pA,grp:'pl'})}
    // the vector: three 8-byte fields on the stack, its floats on the heap (to scale in bytes)
    const fw=V.obj/3*BW,flw=V.fl*BW,vA=k===4?Math.min(1,e*1.6):k===5?1-cl(e*2-1,0,1):last?.55:k<4?.14:0;
    const bA=k===4?cl(e*1.6-.3,0,1):k===5?1-cl(e*2,0,1):last?.55:k<4?.14:0;
    const vx0=XST-fw*1.5,bx0=XHP-flw*V.n/2;
    ['data','size','cap'].forEach((nm,i)=>R.box([vx0+fw*(i+.5),YS+.05,0],[fw*.94,.34,.6],{fill:mix(P.paper,P.c2,i?.25:.5),a:vA,shadow:false}));
    for(let i=0;i<V.n;i++)R.box([bx0+flw*(i+.5),YH+.05,0],[flw*.92,.34,.6],{fill:mix(P.paper,P.c2,.55),a:bA,shadow:false});
    if(k===4||k===5&&e<.5){const a=k===4?cl(e*2-.4,0,1):1-e*2;R.flowArc([vx0+fw*.5,YS+.4,0],[bx0+flw*.5,YH+.4,0],.5,{c:P.c2,a,r:.06,n:7,speed:1.2})}
    if(k===4){R.label([XST,YS+.4,0],'v · '+V.obj+' B',{mono:true,fs:12.5,dy:-18,b:1,c:P.c2});R.label([XHP,YH+.4,0],V.n+' floats · '+V.heap+' B',{mono:true,fs:12.5,dy:-10,b:1,c:P.c2})}
    if(k===5){R.label([XST,YS+.4,0],'} ~vector()',{mono:true,fs:13,dy:-10,b:1,c:P.c2,a:1-cl(e*2-1,0,1)*.6});R.label([XHP,YH+.4,0],'freed',{fs:12.5,dy:-10,b:1,c:P.mute,a:cl(e*2,0,1)})}
    // the double free: two 8-byte owners, one array, freed twice
    const dA=k===6?Math.min(1,e*1.5):last?.0:0;
    if(dA>0){const pw=8*BW,ax=[XST-.45,XST+.45],aw=DF.region*BW;
      ax.forEach((x,i)=>{R.box([x,YS+.05,0],[pw,.34,.6],{fill:mix(P.paper,P.bad,.35),a:dA,shadow:false});R.label([x,YS+.4,0],i?'b':'a',{mono:true,fs:13,dy:-10,b:1,c:P.bad,a:dA});
        R.flowArc([x,YS+.4,0],[XHP,YH+.4,0],.45,{c:P.bad,a:dA,r:.06,n:6,speed:1.2})});
      R.box([XHP,YH+.05,0],[aw,.34,.6],{fill:mix(P.paper,P.bad,.5),a:dA,shadow:false});
      R.label([XHP,YH+.4,0],DF.region+' B · freed twice',{mono:true,fs:12.5,dy:-10,b:1,c:P.bad,a:dA,wide:1})}
    // ---- the CPU: the cache ladder ----
    const cA=k<7?.14:k===7?1:.55;
    LAD.forEach((l,i)=>{const c=[P.c4,P.c1,P.c3,P.c2][i];
      if(i===0)R.box([XC,0,0],[l.w,.26,1.6],{fill:mix(P.paper,c,.2),a:cA});
      else if(i===3)R.box([XC,l.y,0],[l.w,.3,.6],{fill:mix(P.paper,c,.35),a:cA,shadow:false});
      else R.glass([XC-l.w/2,l.y,-.8],[l.w,0,0],[0,0,1.6],{c,a:cA,nu:Math.max(2,Math.round(l.w*2)),nv:3});
      if(k>=7)R.label([XC+l.w/2,l.y+(i===0?.26:.05),0],l.n,{al:'left',dx:8,fs:12.5,b:1,c,a:Math.max(.5,cA),grp:'lad'})});
    if(k===7){const y1=LAD[2].y+.08;
      R.flowArc([XHP+.6,YH+.3,0],[XC-.9,.3,0],.5,{c:P.c2,a:.8,r:.055,n:8,speed:1.2});
      const u=cl(e*1.2,0,1),yy=u<.5?lerp(.3,LAD[1].y+.08,u*2):lerp(LAD[1].y+.08,y1,(u-.5)*2);
      R.flow([[XC,.3,0],[XC,LAD[1].y+.08,0],[XC,y1,0],[XC,LAD[3].y+.02,0]],{c:P.c2,a:1,r:.06,n:9,speed:1.4});
      R.box([XC+.15,yy,0],[.42,.1,.3],{fill:mix(P.paper,P.c2,.55),shadow:false});
      R.label([XC+.15,yy,0],'one cache line',{al:'right',dx:-14,fs:12,c:P.c2,b:1,wide:1})}
    // ---- the whole map: who owns which piece ----
    if(last){const la={fs:12.5,b:1,dy:-14,grp:'map'};
      R.label([(XS+XA)/2,1.6,0],'build · UB · libraries: this page',Object.assign({c:P.acc},la));
      R.label([XST+.6,YS+.55,0],'stack · heap · RAII: Ownership',Object.assign({c:P.c1},la));
      R.label([XHP+.3,YH+.5,1.0],'std::vector: Classes',Object.assign({c:P.c4},la));
      R.label([XC,LAD[3].y+.4,0],'caches · SIMD: Machine',Object.assign({c:P.c3},la));
      R.label([0,2.4,-1.5],'llama.cpp: every piece in one engine',{fs:13,b:1,c:P.ink});
      R.flow([[XA+.55,.3,0],[XST-1.0,YS*.6,0],[XST,YS+.2,0]],{c:P.acc,a:.45,r:.05,n:6,speed:1});
      R.flowArc([XHP+.6,YH+.3,0],[XC-.9,.3,0],.5,{c:P.c2,a:.45,r:.05,n:6,speed:1})}
  }
  const views={src:{cam:[.22,.5],bounds:[[-7.6,0,-2.0],[-4.6,1.5,1.4]]},obj:{cam:[.22,.5],bounds:[[-5.8,0,-1.1],[-2.9,1.5,1.3]]},link:{cam:[.22,.55],bounds:[[-4.1,0,-1.8],[-1.1,.9,2.0]]},run:{cam:[.4,.5],bounds:[[-.1,0,-1.1],[4.9,1.9,1.1]]},
    cpu:{cam:[.35,.42],bounds:[[3.0,0,-1.0],[8.2,2.9,1.0]]},full:{cam:[.62,.6],bounds:[[-7.6,0,-2.3],[8.2,2.9,2.3]]}};
  S3.stage({id:'stg-es',list:'sx-es',fig:'Fig. 1 · one program, from source to the machine',cam:views.full.cam,bounds:views.full.bounds,aspect:.58,dur:1400,hold:5200,draw,
    view:k=>k<=1?views.src:k===2?views.obj:k===3?views.link:k<=6?views.run:k===7?views.cpu:views.full,
    margin:w=>w<520?[16,10,12,10]:[22,60,14,60]});
})();
