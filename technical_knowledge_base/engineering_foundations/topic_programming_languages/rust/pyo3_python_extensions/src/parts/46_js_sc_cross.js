// ---- Scene, Fig. 2 (sections 4 and 5): one call crossing the boundary, copied against borrowed, unboxed against a NumPy buffer (renderer v2, 2026-11-07) ----
// Python's heap on the left plate, Rust's side of the call on the right, PyO3's glue as the glass wall between. The three strings and three floats are
// illustrative (the page says so); their byte counts are computed from the strings (UTF-8), token counts from rule 3, the sum of squares from the floats.
// The towers on the wall are the measured ns per item of code/c3_convert.py (window.RB.convert): an empty call, a copy, a view, an unboxed float, a NumPy float.
(function(){
  if(!document.getElementById('stg-cross')||!window.S3||!window.RB||!RB.convert)return;const {at,off,lerp,mix,cl}=S3;const C=RB.convert;
  const enc=new TextEncoder();
  const STR=[['café',1],['x86_64',2],['v2.1 C++',3]].map(([t,tok])=>({t,tok,u8:enc.encode(t).length,ascii:/^[\x00-\x7f]*$/.test(t)}));
  const FL=[.5,1.5,2.5],SUM=FL.reduce((s,v)=>s+v*v,0);
  const TW=[['empty call',C.call_noop.med,1],['copy',C.len_owned.med,1],['view',C.len_borrowed.med,2],['unbox',C.floats_vec.med,2],['NumPy',C.floats_numpy.med,2]];
  const TMAX=Math.max(...TW.map(t=>t[1])),TH=1.9;
  const XL=-5.4,XS=-3.0,XR=3.0,ZI=i=>-1.15+i*1.15,ZT=-3.3;
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.6,-3.4,3.2,.5);
    const PY=P.c1,RS=P.c3,WL=P.c5;
    // the two heaps and the boundary
    R.glass([-6.2,.02,-1.9],[5.6,0,0],[0,0,4.2],{c:PY,nu:7,nv:5,th:.04,a:.55});
    R.glass([.6,.02,-1.9],[5.6,0,0],[0,0,4.2],{c:RS,nu:7,nv:5,th:.04,a:.55});
    R.glass([0,0,-1.95],[0,0,4.3],[0,1.25,0],{c:WL,nu:6,nv:3,a:.85});
    R.label([-3.4,0,2.3],'Python heap',{fs:13,b:1,dy:14,c:PY});R.label([3.4,0,2.3],'Rust, inside this call',{fs:13,b:1,dy:14,c:RS});
    R.label([0,1.25,2.2],'PyO3 glue',{mono:true,fs:12,dy:-10,c:WL,b:1,wide:1});
    // strings: shown for steps 1 to 3; faint again at the end (untouched)
    const sa=k<=2?1:k===3?off(3,e,3)*0:0,sfa=k<=2?1:k===3?1-e:0;
    if(sfa>.01){R.box([XL,.04,0],[.55,.5,3.2],{fill:mix(P.paper,PY,.2),a:sfa});R.label([XL,.54,-1.6],'list',{mono:true,fs:12,dy:-10,a:sfa,b:1});
      STR.forEach((s,i)=>{const z=ZI(i),w=.9+s.t.length*.12;
        R.line([[XL+.28,.3,z],[XS-w/2,.3,z]],{c:P.mute,w:1.2,a:sfa});
        R.box([XS,.04,z],[w,.4,.55],{fill:P.paper,a:sfa,ec:k===1||k===2?PY:null});
        R.label([XS,.44,z],'str "'+s.t+'"',{mono:true,fs:12,dy:R.W<520?-14:1,a:sfa,b:1});   // wide screens: on the box's top face, clear of its edges
        // café gets its UTF-8 copy cached inside the object when Rust first asks for it
        if(!s.ascii&&k>=1){const ca=k===1?cl(e*2,0,1):1;R.box([XS+w/2+.2,.04,z],[.35,.3,.45],{fill:mix(P.paper,P.c2,.55),a:sfa*ca});
          R.label([XS+w/2+.4,.34,z],'+ UTF-8 cache',{mono:true,fs:12,al:'left',dx:6,dy:-8,c:P.c2,a:sfa*ca,wide:1})}
        // copied: a String per item, the bytes streaming across the wall
        if(k===1){const ca=cl(e*1.6-i*.25,0,1),cw=.3+s.u8*.16;
          R.box([XR+cw/2-.6,.04,z],[cw,.34,.45],{fill:mix(P.paper,RS,.45),a:ca});
          R.label([XR+cw-.6,.2,z],'String · '+s.u8+' B',{mono:true,fs:12,al:'left',dx:8,a:ca,grp:'cp'});
          R.flowArc([XS+w/2+(s.ascii?0:.35),.4,z],[XR-.6,.3,z],.45,{c:RS,a:ca,r:.06,n:Math.max(4,s.u8),speed:1.3})}
        if(k===2){R.box([XR-1.2,.04,z],[.62,.22,.36],{fill:P.paper,a:e*.4+.2,ec:RS});
          R.box([1.8,.04,z],[.6,.3,.4],{fill:mix(P.paper,RS,.2),a:e,ec:RS});R.label([2.15,.2,z],'&str (ptr, len '+s.u8+')',{mono:true,fs:12,al:'left',dx:8,a:e,grp:'vw'});
          R.line([[1.5,.3,z],[.3,.55,z],[XS+w/2+(s.ascii?0:.4),.35,z]],{c:RS,w:1.6,a:e,dash:[5,4],head:7})}})}
    // floats: a list of boxed float objects (refcount, type pointer, double: 8 bytes each), unboxed into one Vec<f64>
    const fa=k===3?e:k===4?.2:k>=5?.2:0;
    if(fa>.01){R.box([XL,.04,0],[.55,.5,3.2],{fill:mix(P.paper,PY,.2),a:fa});R.label([XL,.54,-1.6],'list',{mono:true,fs:12,dy:-10,a:fa*(k===3?1:0),b:1});
      FL.forEach((v,i)=>{const z=ZI(i),x0=XS-.75;
        R.line([[XL+.28,.3,z],[x0,.3,z]],{c:P.mute,w:1.2,a:fa});
        [['refcount',mix(P.paper,P.ink,.12)],['type',mix(P.paper,P.ink,.06)],['double',mix(P.paper,P.c2,.55)]].forEach(([nm,c],j)=>R.box([x0+.25+j*.5,.04,z],[.48,.4,.5],{fill:c,a:fa,shadow:j===0}));
        R.label([XS,.44,z],'float '+v,{mono:true,fs:12,dy:-10,a:k===3?fa:0,b:1});
        if(k===3){const ca=cl(e*1.6-i*.25,0,1);R.flowArc([x0+1.25,.4,z],[XR-.4+i*.5,.42,0],.5,{c:P.c2,a:ca,r:.06,n:6,speed:1.3})}})}
    const va=k===3?e:k===4?.25:k===5?.25:k===6?.25*(1-e):0;
    if(va>.01){FL.forEach((v,i)=>R.box([XR-.4+i*.5,.04,0],[.48,.38,.5],{fill:mix(P.paper,P.c2,.45),a:va,shadow:i===0}));
      R.label([XR+.1,.42,0],'Vec<f64> · 3 × 8 B',{mono:true,fs:12,dy:-11,a:k===3?va:0,b:1})}
    // a NumPy array: a header and one contiguous buffer; Rust gets one pointer and a length
    const na=k===4?e:k>=5?.55:0;
    if(na>.01){const z=.1;R.box([XL+.2,.04,z-1.1],[1.1,.34,.6],{fill:mix(P.paper,PY,.25),a:na});R.label([XL+.2,.38,z-1.1],'ndarray header',{mono:true,fs:12,dy:-10,a:k===4?na:0,wide:1});
      R.line([[XL+.2,.2,z-.8],[XL+.2,.2,z],[XS-.9,.2,z]],{c:P.mute,w:1.2,a:na});
      FL.forEach((v,i)=>R.box([XS-.5+i*.5,.04,z],[.5,.38,.5],{fill:mix(P.paper,P.c2,.55),a:na,shadow:i===0,lw:.7}));
      R.label([XS,.42,z],'one buffer · '+(FL.length*8)+' B',{mono:true,fs:12,dy:-10,a:k===4?na:0,b:1});
      const pa=k===4?e:k===5?.5:k===6?.5*(1-e):0;
      R.box([2.0,.04,z],[.6,.3,.4],{fill:mix(P.paper,RS,.2),a:pa,ec:RS});R.label([2.35,.2,z],'&[f64] (ptr, len 3)',{mono:true,fs:12,al:'left',dx:8,a:k===4?pa:0,b:1});
      R.line([[1.7,.3,z],[.3,.6,z],[XS-.75,.42,z]],{c:RS,w:1.8,a:pa,dash:[5,4],head:7})}
    // the result crosses back as new Python objects
    if(k>=5){const ra=k===5?e:1,z=1.55,ru=k===5?1:1-e;
      R.box([XR,.04,z],[1.2,.3,.4],{fill:mix(P.paper,RS,.4),a:ru*ra});R.label([XR,.34,z],'Vec<u64> [1, 2, 3] · f64 '+SUM,{mono:true,fs:12,dy:-10,a:ru*ra,wide:1});
      R.box([XS-.4,.04,z],[1.0,.32,.42],{fill:mix(P.paper,PY,.3),a:ra});R.box([XS+.8,.04,z],[.55,.32,.42],{fill:mix(P.paper,PY,.3),a:ra});
      R.label([XS+.1,.36,z],'new list [1, 2, 3] · float '+SUM,{mono:true,fs:12,dy:-10,a:ra,b:1,c:PY});
      if(k===5)R.flowArc([XR-.6,.34,z],[XS+1.1,.36,z],.5,{c:PY,a:e,r:.065,n:8,speed:1.2});
      if(k===6)R.label([XR,0,.6],'dropped at return',{fs:12.5,b:1,c:P.bad,a:e,dy:16})}
    // the toll at the boundary: measured ns per item (empty call: per call), on one scale
    TW.forEach(([nm,v,d],i)=>{const x=-3.0+i*1.5,cur=i===k,seen=i<k||k>=5,a=cur?1:seen?.45:.12,h=Math.max(.02,v/TMAX*TH)*(cur?e:1);
      R.box([x,0,ZT],[.6,h,.5],{fill:cur?mix(P.paper,WL,.75):mix(P.paper,WL,.4),a});
      R.label([x,h,ZT],v.toFixed(d)+' ns',{mono:true,fs:12,dy:-11,b:cur,a:Math.max(a,.35)*(seen||cur?1:0)});
      R.label([x,0,ZT+.25],nm,{mono:true,fs:12,dy:13,c:P.mute,a:(seen||cur?1:0)*Math.max(a,.5),wide:1})});
    R.label([-3.6,.5,ZT],'ns per item',{mono:true,fs:12,al:'right',dx:-8,c:WL,b:1,wide:1});
  }
  const full={cam:[.1,.74],bounds:[[-6.2,0,-3.7],[6.2,1.6,2.4]]};
  S3.stage({id:'stg-cross',list:'sx-cross',fig:'Fig. 2 · one call across the boundary',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1600,hold:4800,draw,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,16],
    view:k=>k===1||k===2?{cam:[.16,.7],bounds:[[-6.2,0,-3.7],[6.2,1.4,1.9]]}:k===3||k===4?{cam:[.04,.72],bounds:[[-6,0,-3.7],[5.4,1.4,1.4]]}:full});
})();
