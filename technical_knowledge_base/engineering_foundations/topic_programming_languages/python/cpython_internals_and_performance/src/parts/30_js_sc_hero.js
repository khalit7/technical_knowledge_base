// ---- Scene, Fig. 1 (the hero, section 0): a list of float objects against one NumPy buffer (renderer v2, 2026-11-07) ----
// 8 of the million elements, to scale (0.06 world units per byte): the list's 8-byte pointers, each leading to a separate 24-byte float
// object (refcount, type, double) at an illustrative place on the heap; the C evaluation loop as a glass plate visiting every element;
// NumPy's contiguous buffer with its four C passes; the measured times as two slabs. Numbers: PA.np (p2_numpy) and PA.sizes (i3_sizes).
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.PA||!PA.np||!PA.sizes)return;const {at,off,lerp,mix,cl}=S3;
  const big=PA.np[PA.np.length-1],LOOP=big[1]/1000,NPY=big[3]/1000;            // ms, n = 1,000,000
  const FB=PA.sizes.rows.find(r=>r[1]==='float')[2],PB8=8,U=.06;               // float object bytes (24), pointer bytes, units per byte
  const N=8,ZL=-1.8,YP=1.95,ZB=3.0,NB=16;
  const sx=i=>-4.3+i*(PB8*U+.04)+PB8*U/2;                                     // pointer slot centres
  const OB=[[-3.3,-.45],[-.2,1.45],[2.75,-.35],[-1.55,.55],[1.25,.5],[3.35,1.45],[-3.45,1.5],[.75,-.55]]; // illustrative heap places
  const ADDR=['0x1049a3f20','0x104b07c80','0x10498e1a0'];                        // illustrative addresses, labelled as such in the step text
  // one float object: three 8-byte fields side by side
  function obj(R,c,a,hot){const P=R.P,w=PB8*U,f=[mix(P.paper,P.ink,.1),mix(P.paper,P.ink,.05),mix(P.paper,P.c2,hot?.85:.6)];
    for(let j=0;j<3;j++)R.box([c[0]+(j-1)*w,0,c[1]],[w-.01,.3,.42],{fill:f[j],a,shadow:j===1});}
  function draw(R,k,e){const P=R.P;R.grid(-5.4,5.4,-2.6,4.9,.5);
    const left=k===1?1-.5*e:k===2?.5-.25*e:k===3?.25+.65*e:1;                               // the list side recedes while NumPy is shown
    const cur=k===1?Math.min(N-1,Math.floor(e*N)):-1;
    // the list: one 8-byte pointer per element
    for(let i=0;i<N;i++)R.box([sx(i),0,ZL],[PB8*U,.18,.5],{fill:mix(P.paper,P.c6,i===cur?.7:.3),a:left});
    R.label([sx(0)-PB8*U/2,.18,ZL-.25],'list · 8-byte pointers',{al:'left',dy:-12,mono:true,fs:12.5,b:1,c:P.c6,a:k===1||k===2?0:left});
    R.label([sx(N-1)+.3,.1,ZL],'… 1,000,000',{al:'left',mono:true,fs:12,c:P.mute,a:k===1?0:left,wide:1});
    // each pointer leads to its own object on the heap
    for(let i=0;i<N;i++){const o=OB[i],tgt=[o[0]-PB8*U,.3,o[1]];
      R.arc([sx(i),.18,ZL+.2],tgt,.35,{c:P.c6,w:1.2,a:left*(k===0?at(k,e,0):1)*(i===cur||cur<0?.75:.35),t:k===0?Math.min(1,e*1.3):1});
      obj(R,o,left*(cur<0||i===cur?1:.55),i===cur)}
    if(k===0){R.label([OB[3][0]-PB8*U,.3,OB[3][1]],'refcount',{fs:12,dy:-12,dx:-14,a:e,wide:1});R.label([OB[3][0],.3,OB[3][1]],'type',{fs:12,dy:-26,a:e,wide:1});
      R.label([OB[3][0]+PB8*U,.3,OB[3][1]],'double',{fs:12,dy:-12,dx:16,a:e,c:P.c2,b:1,wide:1});
      [0,4,2].forEach((j,n)=>R.label([OB[j][0],0,OB[j][1]+.21],ADDR[n],{mono:true,fs:12,dy:12,c:P.mute,a:e,wide:1}));
      R.label([0,0,2.1],FB+'-byte float objects · '+(PB8+FB)+' bytes per number',{mono:true,fs:12.5,b:1,a:e})}
    // the C evaluation loop: visits every element, three new floats per element
    const pl=k===1?e:k===2?1-e:k===3?.25*e:0;
    if(pl>.01){R.glass([-4.4,YP,-1.0],[8.8,0,0],[0,0,2.9],{c:P.c1,nu:18,nv:6,a:pl*.85,th:.04});
      R.label([-4.4,YP,-1.0],'C evaluation loop · the loop body per element',{al:'left',fs:12.5,b:1,c:P.c1,dy:-12,dx:2,a:pl});
      OB.forEach((o,i)=>R.flow([[o[0],.32,o[1]],[o[0],YP-.02,o[1]]],{c:P.c2,a:pl*(i===cur?1:.6),r:i===cur?.08:.06,n:5,speed:1.1}));
      if(k===1){['x - m','exp','s'].forEach((t,j)=>{const c=[2.2+j*.95,YP+.05,-.6],a=at(k,e,1)*cl(e*3-j*.6,0,1);
        R.box(c,[.8,.22,.32],{fill:mix(P.paper,P.c2,.55),a,shadow:false});R.label([c[0],c[1]+.22,c[2]],t,{mono:true,fs:12,dy:-10,a,c:P.c2})});
        R.label([3.15,YP+.3,-.6],'3 new floats per element',{fs:12,dy:-30,a:e,wide:1})}}
    // NumPy: one contiguous buffer of 8-byte doubles, four C loops along it
    const nb=k<2?0:k===2?e:1;
    if(nb>.01){const w=PB8*U,x0=-NB*w/2;
      for(let i=0;i<NB;i++)R.box([x0+(i+.5)*w,0,ZB],[w,.18,.5],{fill:mix(P.paper,P.c1,.45),a:nb,shadow:i%4===0,lw:.6});
      R.label([x0,0,ZB+.25],R.W<520?'ndarray · 8 bytes per double':'ndarray · one contiguous buffer of 8-byte doubles',{al:'left',dy:13,mono:true,fs:12.5,b:1,c:P.c1,a:k===2?nb:0});
      ['a.max()','a - m','exp','sum'].forEach((t,j)=>{const y=.32+j*.17,a=nb*(k===2?cl(e*4-j*.7,0,1):k===3?.5:1);
        R.flow([[x0,y,ZB],[x0+NB*w,y,ZB]],{c:P.c1,a,r:.05,n:9,speed:1.3+j*.23})});
      R.label([0,.95,ZB],R.W<520?'one call · four C loops':'one Python call · four C loops: a.max(), a - m, exp, sum',{fs:12.5,b:1,c:P.c1,a:k===2?nb:0,dy:-6})}
    // the measured times, to scale
    const tb=k===3?e:0;
    if(tb>.01){const L0=-4.4,L=8.8,y=0;
      R.box([L0+L*e/2,y,4.55],[L*e,.22,.36],{fill:mix(P.paper,P.c2,.75),a:tb});R.label([-4.0,0,ZB+.25],'ndarray',{al:'left',dy:13,mono:true,fs:12.5,b:1,c:P.c1,a:tb,wide:1});
      const wn=Math.max(.06,L*NPY/LOOP)*e;R.box([L0+wn/2,y,5.2],[wn,.22,.36],{fill:mix(P.paper,P.c1,.75),a:tb});
      R.label([L0,.22,4.55],'Python loop · '+LOOP.toFixed(1)+' ms',{al:'left',mono:true,fs:12.5,b:1,dy:-12,a:tb});
      R.label([L0+wn,.11,5.2],NPY.toFixed(1)+' ms · NumPy, '+(LOOP/NPY).toFixed(1)+'x faster',{al:'left',dx:8,mono:true,fs:12.5,b:1,c:P.c1,a:tb})}
  }
  const full={cam:[-.2,.66],bounds:[[-4.7,0,-2.3],[4.7,2.0,5.45]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · a million floats, two ways',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[22,14,18,14],
    view:k=>k===0?{cam:[-.18,.74],bounds:[[-4.5,0,-2.3],[4.2,.6,2.0]]}:k===1?{cam:[-.2,.5],bounds:[[-4.5,0,-2.3],[4.4,2.1,2.0]]}:k===2?{cam:[-.15,.62],bounds:[[-4.0,0,2.3],[4.0,1.0,3.7]]}:full});
})();
