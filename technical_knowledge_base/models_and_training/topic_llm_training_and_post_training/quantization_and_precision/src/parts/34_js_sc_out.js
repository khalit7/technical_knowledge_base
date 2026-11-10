// ---- Scene (outliers, Fig. 6): 16 real tokens x 64 input channels entering Qwen2.5-0.5B layer 8 q_proj, then SmoothQuant and a Hadamard rotation (renderer v2) ----
// Data: QV.mig('w8' | 'sq', 0.75) and QV.rot() (the shipped slice: 16 evaluation tokens, the 8 channels with the largest calibration activations plus 56 at random,
// 8 output rows; visuals_ref.py checks every number). X stands as a field of bars, height |x|, gold for the 8 outlier channels; behind it, each input channel's
// largest |W| over the 8 rows, green. SmoothQuant divides each X channel by s and multiplies its weight column by s (purple dots carry s across);
// the rotation multiplies both by the same 64 x 64 Hadamard matrix. Heights keep one scale for X and one for W across all steps.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-out')||!window.S3)return;const {at,lerp,mix}=S3;
  const AL=.75,P0=QV.mig('w8',AL),SQ=QV.mig('sq',AL),RT=QV.rot(),HD=QV.hadamard(64),T=16,C=64;
  const WR=P0.W.map(r=>HD[0].map((_,j)=>r.reduce((s,v,c)=>s+v*HD[c][j],0))),colmax=A=>A[0].map((_,c)=>Math.max(...A.map(r=>Math.abs(r[c]))));
  const wrot=colmax(WR),XM=P0.xmax,WM=Math.max(...SQ.wcol,...wrot,...P0.wcol);
  const DX=.14,DZ=.19,xc=c=>(c-(C-1)/2)*DX,zt=t=>(T-1)/2*DZ-t*DZ+.6,ZW=-1.75,HX=1.7,HW=1.25;
  const pct=(x,d)=>(100*x).toFixed(d==null?2:d)+'%',L=QD.lab;
  function texts(){const set=(k,v)=>document.querySelectorAll('[data-out="'+k+'"]').forEach(e=>e.textContent=v);
    set('xmax',XM.toFixed(1));set('med',RT.plain.med.toFixed(2));set('ratio',RT.plain.ratio.toFixed(1));set('dx',P0.dx.toFixed(3));set('coarse',pct(P0.coarse,0));
    set('wmax',Math.max(...P0.wcol).toFixed(2));set('sqx',SQ.xmax.toFixed(2));set('sqw',SQ.wmax.toFixed(2));set('smin',Math.min(...SQ.s).toFixed(1));set('smax',Math.max(...SQ.s).toFixed(1));
    set('sqdx',SQ.dx.toFixed(3));set('sqc',pct(SQ.coarse,0));set('e0',pct(P0.err));set('e1',pct(SQ.err));
    set('wl0',pct(L.w8a8.int8_tensor_static));const c=L.w8a8.smoothquant_curve.find(r=>Math.abs(r[0]-AL)<1e-9);set('wl1',pct(c[1]));
    set('rx',RT.hadamard.xmax.toFixed(1));set('rmed',RT.hadamard.med.toFixed(2));set('rratio',RT.hadamard.ratio.toFixed(1));set('ra4',pct(RT.plain.a4,1));set('rb4',pct(RT.hadamard.a4,1))}
  // what X and the weight strip show at step k: 0-2 the input as measured, 3-4 smoothed, 5 rotated
  const XA=k=>k<=2?P0.X:k<=4?SQ.Xs:RT.hadamard.X,WA=k=>k<=2?P0.wcol:k<=4?SQ.wcol:wrot;
  function draw(R,k,e,st){
    // labels wait for the camera: while it glides to another view they stay hidden, then fade in (so none points at a place it has left)
    const vk=k=>k===3?1:0,LA=st&&st.pk!==k&&vk(st.pk)!==vk(k)?Math.max(0,(e-.55)/.45):1,lab=(p,t,o)=>R.label(p,t,{...o,a:(o&&o.a!=null?o.a:1)*LA});const P=R.P;R.grid(-5.2,5.2,-2.8,2.6,.5);
    const pk=Math.max(0,k-1),t=k===0?1:e,X0=XA(pk),X1=XA(k),W0=WA(pk),W1=WA(k),top=P0.isTop;
    const blue=mix(P.paper,P.c1,.45),gold=mix(P.paper,P.c5,.8),coarse=mix(P.paper,P.bad,.7),dxs=k===4?SQ.dx:P0.dx,showC=k===1||k===4;
    // X: 16 tokens x 64 channels on a pale plate
    R.glass([xc(0)-.1,.01,zt(T-1)-.12],[C*DX+.06,0,0],[0,0,(T-1)*DZ+.24],{c:P.c1,a:.6,nu:1,nv:1,th:.02});
    const mx=(A0,A1,i,c)=>k===5?(e<.5?lerp(A0[i][c],P0.X[i][c],e*2):lerp(P0.X[i][c],A1[i][c],e*2-1)):lerp(A0[i][c],A1[i][c],t);
    for(let i=0;i<T;i++)for(let c=0;c<C;c++){const v=Math.abs(mx(X0,X1,i,c)),hh=Math.max(.006,v/XM*HX),isC=showC&&v<4*dxs;
      R.box([xc(c),.02,zt(i)],[DX*.72,hh,DZ*.7],{fill:isC?mix(blue,coarse,k===1||k===4?t:1):k<5&&top[c]?gold:blue,shadow:false,lw:.35,ea:.5})}
    // W: each input channel's largest |W| over the 8 output rows, a strip of green bars behind
    const wa=k<2?.25:1;
    R.glass([xc(0)-.1,.01,ZW-.16],[C*DX+.06,0,0],[0,0,.32],{c:P.c3,a:.7*wa,nu:1,nv:1,th:.02});
    for(let c=0;c<C;c++){const v=k===5?(e<.5?lerp(W0[c],P0.wcol[c],e*2):lerp(P0.wcol[c],W1[c],e*2-1)):lerp(W0[c],W1[c],t),hh=Math.max(.008,v/WM*HW);R.box([xc(c),.02,ZW],[DX*.72,hh,.22],{fill:mix(P.paper,P.c3,.6),a:wa,shadow:false,lw:.4})}
    // data moving: X meets W in the product (step 3); s crosses from each activation channel to its weight column (step 4); the rotation mixes every channel (step 6)
    if(k===2){const a=Math.min(1,e*1.6);[8,24,40,56].forEach(c=>R.flowArc([xc(c),.3,zt(T-1)],[xc(c),.3,ZW+.15],.5,{c:P.c1,a,r:.05,n:6}))}
    if(k===3){const a=Math.min(1,e*1.6),sm=Math.max(...SQ.s);for(let c=0;c<C;c++){const sh=Math.log(SQ.s[c])/Math.log(sm);if(!top[c]&&c%4)continue;
      R.flowArc([xc(c),.25+(top[c]?.9:.1),zt(T-1)],[xc(c),.25,ZW+.15],.45,{c:P.c4,a:a*(.3+.7*sh),r:.04+.03*sh,n:Math.max(2,Math.round(2+6*sh)),speed:1})}}
    if(k===5){const a=Math.min(1,e*1.6);[[5,40],[20,58],[33,9],[50,27]].forEach(([c0,c1])=>R.flowArc([xc(c0),.35,zt(7)],[xc(c1),.35,zt(7)],.6,{c:P.c5,a,r:.05,n:7}))}
    // labels
    const L1=k<=2?'X · largest '+XM.toFixed(1):k<=4?'X ÷ s · largest '+SQ.xmax.toFixed(2):'X · H · largest '+RT.hadamard.xmax.toFixed(1);
    lab([xc(C-1)+.15,.05,zt(0)],L1,{al:'left',dx:8,mono:true,fs:12,b:1,c:P.c1,grp:'r'});
    if(k>=2)lab([xc(C-1)+.15,.05,ZW],(k<=2?'W · max per channel '+Math.max(...P0.wcol).toFixed(2):k<=4?'W · s · largest '+SQ.wmax.toFixed(2):'W · H · largest '+Math.max(...wrot).toFixed(2)),{al:'left',dx:8,mono:true,fs:12,b:1,c:P.c3,grp:'r'});
    if(k<=2){let bi=0,bc=0;P0.X.forEach((r,i)=>r.forEach((v,c)=>{if(Math.abs(v)>Math.abs(P0.X[bi][bc])){bi=i;bc=c}}));lab([xc(bc),Math.abs(P0.X[bi][bc])/XM*HX,zt(bi)],'gold: 8 outlier channels',{mono:true,fs:12,b:1,c:mix(P.ink,P.c5,.55),dy:-12})}
    if(showC)lab([xc(C-1)+.15,.05,zt(T-1)],'orange: '+pct(k===4?SQ.coarse:P0.coarse,0)+' within 4 steps',{al:'left',dx:8,mono:true,fs:12,c:P.bad,grp:'r',a:t});
    if(k===4||k===5)lab([0,1.9,ZW],k===4?'output error, this slice: '+pct(P0.err)+' → '+pct(SQ.err):'largest over median channel peak: '+RT.plain.ratio.toFixed(1)+' → '+RT.hadamard.ratio.toFixed(1),{mono:true,fs:12.5,b:1,c:P.acc,a:t})}
  const full={cam:[.3,.72],bounds:[[-4.7,0,-2.0],[4.7,.85,2.3]]};
  const st=S3.stage({id:'stg-out',list:'sx-out',fig:'Fig. 6 · 16 real tokens × 64 channels entering one layer',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,10,12,10]:[16,205,8,10],
    view:k=>k===3?{cam:[.55,.45],bounds:[[-4.7,0,-2.0],[4.7,1.0,2.3]]}:full});
  (window.QSTG=window.QSTG||{})['stg-out']=st;texts();
})();
