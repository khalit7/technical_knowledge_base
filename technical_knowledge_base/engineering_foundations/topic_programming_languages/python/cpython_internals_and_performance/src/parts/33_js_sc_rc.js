// ---- Scene, Fig. 5 (section 2): reference counting and the cycle collector, replaying i2_refcount.py (renderer v2, 2026-11-07) ----
// Names on a glass plate (the module's globals), objects on the floor, each reference a stream of dots from the name (or the other object)
// to the object, the count as stacked discs on the object. The printed lines are the recorded run (PA.rc, i2_refcount.txt, Python 3.14.8).
(function(){
  if(!document.getElementById('stg-rc')||!window.S3||!window.PA||!PA.rc)return;const {at,off,lerp,mix,cl}=S3;
  const L=PA.rc,line=pre=>L.find(l=>l.trim().startsWith(pre)).trim();
  const NX=-3.0,TAG={a:[NX,.18,-1.3],b:[NX,.18,-.45],x:[NX,.18,.7],y:[NX,.18,1.55]};
  const OA=[.6,0,-.85],OX=[.1,0,1.15],OY=[2.7,0,1.15],H=.5;
  // the count of each object at the end of step k (steps 1 to 7), and the names alive at the end of step k
  const CA=[1,2,1,0,0,0,0],CX=[0,0,0,0,2,1,0],NAMES=[['a'],['a','b'],['b'],[],['x','y'],[],[]];
  const printed=['getrefcount(a) printed '+line('refcount: 2').split(': ')[1],'getrefcount(a) printed '+line('refcount: 3').split(': ')[1],line('del a:'),line('a freed')+' · '+line('del b done'),
    'x.other = y · y.other = x',line('after del'),line('gc.collect()')];
  function discs(R,o,n0,n1,e,a){const P=R.P,n=Math.max(n0,n1);if(a>.05)R.label([o[0]+.7,H,o[2]],'count '+(e<.5?n0:n1),{al:'left',dx:6,mono:true,fs:12.5,b:1,c:mix(P.ink,P.c5,.5),a,wide:1});for(let i=0;i<n;i++){const appear=i>=n0?e:1,leave=i>=n1?1-e:1,da=Math.min(appear,leave)*a;
      R.box([o[0],H+.02+i*.11+(i>=n0?.25*(1-e):0),o[2]],[.62,.08,.46],{fill:mix(P.paper,P.c5,.75),a:da,shadow:false,lw:.6})}}
  function obj(R,o,name,a,freeT){const P=R.P,s=freeT||0;if(s>0)R.quad([[o[0]-.7,.005,o[2]-.45],[o[0]+.7,.005,o[2]-.45],[o[0]+.7,.005,o[2]+.45],[o[0]-.7,.005,o[2]+.45]],{a:s,ec:P.bad,dash:[5,4],lw:1.2,ea:.7});R.box([o[0],-.35*s,o[2]],[1.4,H,.9],{fill:mix(P.paper,P.c2,.45),a:a*(1-s)});
    R.label([o[0],0,o[2]+.45],name,{mono:true,fs:12.5,b:1,dy:12,a:a*(1-s)})}
  function draw(R,k,e){const P=R.P;R.grid(-4.4,4.4,-2.4,2.6,.5);
    const pk=k>0?k-1:-1,was=n=>pk>=0&&NAMES[pk].includes(n),is=n=>NAMES[k].includes(n);
    // the names: the module's globals
    const zz=k<4?.15:k===4?lerp(.15,2.0,e):2.0;R.glass([NX-.7,.005,-1.8],[1.4,0,0],[0,0,zz+1.8],{c:P.c1,nu:2,nv:k<4?3:6,a:.8,th:.02});
    R.label([NX,0,zz],'names',{fs:12.5,b:1,c:P.c1,dy:12});
    Object.entries(TAG).forEach(([n,p])=>{const a=is(n)&&was(n)?1:is(n)?e:was(n)?1-e:0;
      R.box([p[0],0,p[2]],[.9,.18,.5],{fill:mix(P.paper,P.c1,.4),a:Math.max(a,.0),shadow:false});if(a>.02)R.label([p[0],.18,p[2]],n,{mono:true,fs:13,b:1,dy:-10,a})});
    // object a: steps 1 to 4
    if(k<=3||(k===4&&e<.3)){const fa=k===4?1-e*3.3:1,free=k===3?cl((e-.35)/.65,0,1):k===4?1:0;
      obj(R,OA,'Node("a")',fa*(k===0?Math.max(.2,e):1),free);
      discs(R,[OA[0],-.35*free,OA[2]],k>0?CA[k-1]:0,CA[k],e,fa*(1-free));
      ['a','b'].forEach(n=>{const a=is(n)&&was(n)?1:is(n)?e:was(n)?1-e:0;if(a>.02)R.flowArc([TAG[n][0]+.45,.18,TAG[n][2]],[OA[0]-.7,.3,OA[2]],.4,{c:P.c1,a:a*.9,r:.06,n:7,speed:1.2})});
      if(k===3&&e>.4)R.label([OA[0],.4,OA[2]],'count 0: freed at once',{fs:12.5,b:1,c:P.bad,dy:-16,a:cl((e-.4)*3,0,1)})}
    // the cycle: steps 5 to 7
    if(k>=4){const free=k===6?cl((e-.45)/.55,0,1):0,ap=k===4?e:1;
      [[OX,'Node("x")'],[OY,'Node("y")']].forEach(([o,n])=>{obj(R,o,n,ap,free);discs(R,[o[0],-.35*free,o[2]],k===4?0:CX[k-1],k===6?1:CX[k],k===6?0:e,ap*(1-free))});
      const ca=ap*(1-free);R.flowArc([OX[0]+.5,H,OX[2]-.2],[OY[0]-.5,H,OY[2]-.2],.55,{c:P.c4,a:ca*.9,r:.06,n:8,speed:1.1});R.flowArc([OY[0]-.5,H,OY[2]+.2],[OX[0]+.5,H,OX[2]+.2],.35,{c:P.c4,a:ca*.9,r:.06,n:8,speed:1.1});
      if(ca>.3){R.label([(OX[0]+OY[0])/2,H+.6,OX[2]-.2],'.other',{mono:true,fs:12,c:P.c4,a:ca,wide:1})}
      [['x',OX],['y',OY]].forEach(([n,o])=>{const a=is(n)&&was(n)?1:is(n)?e:was(n)?1-e:0;if(a>.02)R.flowArc([TAG[n][0]+.45,.18,TAG[n][2]],[o[0]-.7,.3,o[2]],.45,{c:P.c1,a:a*.9,r:.06,n:7,speed:1.2})});
      // the collector sweeps the heap and finds the pair reachable only from each other
      if(k===6){const sx=lerp(-1.6,4.2,e);R.glass([sx,0,-.2],[0,1.4,0],[0,0,2.7],{c:P.c3,nu:1,nv:4,a:Math.sin(Math.PI*e)*.9,th:.02});
        R.label([OX[0],.4,OX[2]],'unreachable: freed',{fs:12.5,b:1,c:P.bad,dy:-26,a:cl((e-.5)*3,0,1)})}}
    // what the run printed at this step
    R.label(k<=3?[-.4,0,.75]:[.9,0,2.4],printed[k],{mono:true,fs:12.5,b:1,dy:16,c:P.ink,a:Math.max(.25,e)});
  }
  const full={cam:[-.18,.66],bounds:[[-3.8,0,-2.0],[3.6,1.3,2.7]]};
  S3.stage({id:'stg-rc',list:'sx-rc',fig:'Fig. 5 · counting references',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1600,hold:4600,draw,
    margin:w=>w<520?[14,10,26,10]:[18,14,28,14],
    view:k=>k<=3?{cam:[-.2,.62],bounds:[[-3.8,0,-2.0],[2.2,1.3,.6]]}:{cam:[-.15,.62],bounds:[[-3.8,0,-.4],[3.6,1.3,2.7]]}});
})();
