// ---- Scene: unique_ptr, shared_ptr and its control block, a cycle and its weak_ptr fix (section 4; renderer v2) ----
// Driven by the recorded logs of lifetime.cpp (CA_DATA.lifetime: unique, shared, cycle): the Tracer numbers and names, the printed use_count values,
// which Tracers are never destroyed and the order the others die; pointer sizes from sizes.cpp (CA_DATA.sizes). Positions are illustrative.
(function(){
  if(!document.getElementById('stg-ptr')||!window.CA_DATA)return;const {at,off,cl,mix}=S3;
  const L=CA_DATA.lifetime,sz=n=>+((CA_DATA.sizes.find(r=>r[0]===n)||[0,0])[1]);
  const UP=sz('std::unique_ptr<int>'),SP=sz('std::shared_ptr<int>');
  const ctors=log=>log.map(l=>l.match(/^ctor #(\d+) (\S+)/)).filter(Boolean).map(m=>({id:+m[1],name:m[2]}));
  const dtors=log=>log.map(l=>l.match(/^dtor #(\d+)/)).filter(Boolean).map(m=>+m[1]);
  const U=ctors(L.unique.log)[0],S=ctors(L.shared.log)[0],UC=L.shared.log.map(l=>l.match(/^use_count (\d+)/)).filter(Boolean).map(m=>+m[1]);
  const CY=ctors(L.cycle.log),CD=dtors(L.cycle.log),LEAK=CY.filter(o=>!CD.includes(o.id)),FREED=CD.map(id=>CY.find(o=>o.id===id));
  const YS=1.4,PL=[-3.4,-.5,-1.5,1.5],X0=-3.1,W8=.9;       // stack plate; objects start at X0; one 8-byte field is W8 wide
  const zA=-.5,zB=.6;
  function field(R,x0,z,n,o){const P=R.P;for(let i=0;i<n;i++)R.box([x0+(i+.5)*W8,YS,z],[W8-.05,.28,.44],{fill:o.null?mix(P.paper,P.line,.6):mix(P.paper,o.c||P.acc,.35),a:o.a,shadow:false,lw:.8});
    return i=>[x0+(i+.5)*W8,YS+.28,z]}
  function slab(R,p,t,o){R.label(p,t,Object.assign({mono:true,fs:12.5,al:'right',dx:-10,grp:'stk'},o))}
  function tracer(R,c,id,name,o){const P=R.P;R.box(c,[1.05,.42,.62],{fill:mix(P.paper,o.c||P.c2,.45),a:o.a,lw:.9});
    R.label([c[0],.42,c[2]],'#'+id+(name?' "'+name+'"':'')+(o.suf||''),{mono:true,fs:12.5,b:1,dy:-11,a:o.a,c:o.lc||P.ink})}
  function counter(R,c,n,o){const P=R.P;R.box(c,[.62,.08,.62],{fill:mix(P.paper,P.c5,.3),a:o.a,lw:.8});
    for(let i=0;i<n;i++)R.box([c[0],.08+i*.2,c[2]],[.4,.18,.4],{fill:mix(P.paper,P.c5,.75),a:o.a*(o.top&&i===n-1?o.top:1),shadow:false,lw:.8});
    R.label([c[0],0,c[2]+.31],o.text||'count '+n,{mono:true,fs:12.5,b:1,c:P.c5,dy:13,a:o.a})}
  function ghost(R,c,s,o){const P=R.P,x0=c[0]-s[0]/2,x1=c[0]+s[0]/2,z0=c[2]-s[2]/2,z1=c[2]+s[2]/2;R.quad([[x0,c[1]+.01,z0],[x1,c[1]+.01,z0],[x1,c[1]+.01,z1],[x0,c[1]+.01,z1]],{fill:false,ec:o.c||P.mute,dash:[5,4],lw:1.3,a:o.a})}
  function draw(R,k,e){const P=R.P;R.grid(-4,5,-2.5,2.5,.5);
    R.glass([PL[0],YS,PL[2]],[PL[1]-PL[0],0,0],[0,0,PL[3]-PL[2]],{c:P.c1,nu:5,nv:5,a:.75,dz:50});
    R.label([PL[0]+.1,YS,PL[2]],'stack',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12});
    R.quad([[.1,0,-1.75],[4.6,0,-1.75],[4.6,0,1.75],[.1,0,1.75]],{fill:mix(P.card,P.c2,P.dark?.12:.07),ec:mix(P.card,P.c2,.5),lw:1,a:.9,dz:100});
    R.label([4.6,0,1.75],'heap',{al:'right',fs:12.5,b:1,c:P.c2,dx:-4,dy:14});
    // ---- unique_ptr (steps 1 to 3)
    const uA=k<=2?1:k===3?cl(1-e*2.2,0,1):0;
    if(uA>.01){const TC=[2.2,0,.05];
      const pNull=k>=1,p=field(R,X0,zA,UP/8,{a:uA*(pNull?.55:1),null:pNull});slab(R,[X0,YS+.14,zA],pNull?'p · null':'p · unique_ptr '+UP+' B',{a:uA,c:pNull?P.mute:P.ink});
      const qA=uA*at(k,e,1),qNull=k>=2&&(k>2||e>.35),q=field(R,X0,zB,UP/8,{a:qA*(qNull?.55:1),null:qNull});slab(R,[X0,YS+.14,zB],qNull?'q · null after reset()':'q · owns #'+U.id,{a:qA,c:qNull?P.mute:P.acc,b:!qNull});
      const tA=uA*(k<2?1:cl(1-(e-.35)*2.5,0,1));
      tracer(R,TC,U.id,U.name,{a:tA});
      if(k===0)R.flowArc(p(0),[TC[0]-.5,.3,TC[2]],.6,{c:P.acc,r:.07,n:9,speed:1.2,a:Math.min(1,e*2)});
      if(k===1)R.flowArc(q(0),[TC[0]-.5,.3,TC[2]],.6,{c:P.acc,r:.07,n:9,speed:1.2,a:Math.min(1,e*1.6)});
      if(k===1)R.arc(p(0),[TC[0]-.5,.3,TC[2]],.6,{c:P.mute,w:1.2,dash:[4,4],a:1-e,top:1});
      if(k>=2){ghost(R,TC,[1.05,0,.62],{a:uA*cl((e-.35)*3,0,1)});R.label([TC[0]+.6,0,TC[2]],'~Tracer() at reset()',{al:'left',dx:8,fs:12.5,c:P.bad,b:1,a:uA*cl((e-.35)*3,0,1),wide:1})}}
    // ---- shared_ptr and its control block (steps 4 to 6)
    const sA=k<3?0:k===3?cl(e*2.2-1.1,0,1):k<=5?1:k===6?cl(1-e*2.2,0,1):0;
    if(sA>.01){const TC=[1.5,0,-.2],CB=[3.4,0,-.2];
      const cnt=k===3?UC[0]:k===4?UC[1]:0,dying=k===5;
      const s=field(R,X0,zA,SP/8,{a:sA});slab(R,[X0,YS+.14,zA],'s · shared_ptr '+SP+' B',{a:sA,b:1});
      const tA=sA*(k===3?1:k===4?cl(1-e*1.6,0,1):0);
      if(tA>.01){const t=field(R,X0,zB,SP/8,{a:tA,c:P.c6});slab(R,[X0,YS+.14,zB],'t = s · a second owner',{a:tA,c:P.c6,b:1});
        R.flowArc(t(0),[TC[0]-.4,.3,TC[2]+.25],.7,{c:P.c6,r:.06,n:8,speed:1.2,a:tA});R.flowArc(t(1),[CB[0]-.2,.3,CB[2]+.25],.85,{c:P.c6,r:.06,n:8,speed:1.2,a:tA*.8})}
      const oA=sA*(dying?cl(1-(e-.3)*2.5,0,1):1);
      if(oA>.01){R.flowArc(s(0),[TC[0]-.4,.3,TC[2]-.1],.55,{c:P.acc,r:.065,n:8,speed:1.2,a:oA});R.flowArc(s(1),[CB[0]-.2,.3,CB[2]-.1],.75,{c:P.acc,r:.065,n:8,speed:1.2,a:oA*.8})}
      tracer(R,TC,S.id,S.name,{a:oA});
      const shown=dying?(e<.3?UC[1]:0):cnt;
      counter(R,CB,shown,{a:sA*(dying&&e>.6?cl(1-(e-.6)*2.5,0,1):1),text:'control block · '+(dying&&e>=.3?'count 0':'use_count '+shown),top:k===3?Math.min(1,e*1.4):1});
      if(dying){ghost(R,TC,[1.05,0,.62],{a:sA*cl((e-.3)*3,0,1)});R.label([TC[0],.42,TC[2]],'~Tracer(): the last owner left',{fs:12.5,b:1,c:P.bad,dy:-30,a:sA*cl((e-.3)*3,0,1),wide:1})}}
    // ---- a cycle (step 7) and the weak_ptr fix (step 8)
    const cA=k<6?0:k===6?cl(e*2.2-1.1,0,1):1;
    if(cA>.01){const back=k===7?.35:1,ZC=-.95,ZD=.85,xa=1.0,xb=3.0;
      // the leaked pair: a -> b and b -> a, both counts stay at 1
      LEAK.slice(0,2).forEach((o,i)=>{const x=i?xb:xa;tracer(R,[x,0,ZC],o.id,o.name,{a:cA*back,c:P.bad,lc:P.bad,suf:' never freed'});counter(R,[x+.95,0,ZC],1,{a:cA*back,text:'count 1'})});
      R.flowArc([xa+.4,.45,ZC-.12],[xb-.4,.45,ZC-.12],.7,{c:P.bad,r:.08,n:10,speed:1,a:cA*back});R.flowArc([xb-.4,.45,ZC+.12],[xa+.4,.45,ZC+.12],.4,{c:P.bad,r:.08,n:10,speed:1,a:cA*back});
      ghost(R,[X0+W8,YS,ZC+.3],[W8*2,0,.44],{a:cA*.8});slab(R,[X0,YS+.14,ZC+.3],'a, b · locals gone',{a:cA*back,c:P.mute});
      if(k===7){const c=FREED.find(o=>o.name==='c')||FREED[1],d=FREED.find(o=>o.name==='d')||FREED[0];
        // c owns d (dots), d only observes c (dashed); c's count reaches 0, its members go in reverse order: prev, next (d dies first), then t
        const first=CD.indexOf(d.id)<CD.indexOf(c.id),dA=cl(1-(e-.35)*3.5,0,1),cTA=cl(1-(e-.65)*3.5,0,1);
        tracer(R,[xa,0,ZD],c.id,c.name,{a:Math.min(1,e*3)*cTA,c:P.c3});tracer(R,[xb,0,ZD],d.id,d.name,{a:Math.min(1,e*3)*dA,c:P.c3});
        counter(R,[xa+.95,0,ZD],0,{a:Math.min(1,e*3)*cTA,text:'count 0'});
        if(dA>.05)R.flowArc([xa+.4,.45,ZD],[xb-.4,.45,ZD],.55,{c:P.c3,r:.065,n:8,speed:1.1,a:Math.min(1,e*3)*dA});
        R.arc([xb-.4,.35,ZD+.18],[xa+.4,.35,ZD+.18],.3,{c:P.c3,w:1.6,dash:[5,4],a:Math.min(1,e*3)*dA,top:1});
        R.label([xb+.6,0,ZD],'weak back edge',{al:'left',dx:8,fs:12.5,c:P.c3,a:Math.min(1,e*3)*dA,wide:1});
        const msg=e<.35?'c’s count reaches 0':e<.65?(first?'dtor #'+d.id+' (d) first':'dtor #'+c.id):'then dtor #'+c.id+' (c’s own Tracer)';
        R.label([(xa+xb)/2,0,ZD+.6],msg,{fs:12.5,b:1,c:P.c3,dy:26});
        if(e>.35)ghost(R,[xb,0,ZD],[1.05,0,.62],{a:cl((e-.35)*3,0,1)});if(e>.65)ghost(R,[xa,0,ZD],[1.05,0,.62],{a:cl((e-.65)*3,0,1)})}}
  }
  const full={cam:[.25,.72],bounds:[[-3.4,0,-1.8],[4.6,1.7,1.8]]};
  S3.stage({id:'stg-ptr',list:'sx-ptr',fig:'lifetime.cpp: owners on the stack, counts on the heap',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:4800,draw,
    view:k=>k<=2?{cam:[.25,.66],bounds:[[-3.4,0,-.9],[3.4,1.7,1.0]]}:k>=6?{cam:[.3,.8],bounds:[[-1.6,0,-1.6],[4.6,1.5,1.7]]}:full,
    margin:w=>w<520?[22,10,26,10]:[22,30,26,170]});
})();
