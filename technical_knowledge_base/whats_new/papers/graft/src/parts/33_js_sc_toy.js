// ---- Scene: Fig. 3, inside the toy's two adapters (renderer v2: each adapter a glass plate with its five numbers as signed bars on white plinths, the two policies' answer mixes in front) ----
// Driven by the page's toy: the default GRAFT run, seed 1 (src/toy_sweep.mjs writes TOYREF.stage.traj, every 5 steps). The 300 steps play in
// four explained stretches (long-replay rule), then the forget adapter is deleted.
(function(){
  if(!document.getElementById('stg-toy')||!window.TOYREF||!TOYREF.stage)return;const {at,off,lerp,mix}=S3;
  const T=TOYREF.stage.traj,ix=t=>T.findIndex(r=>r.t===t),B=[[0,0],[0,15],[15,40],[40,300],[300,300]].map(([a,b])=>[ix(a),ix(b)]);
  window.GF_TOY={T,B};
  function snap(u){const i=Math.floor(u),f=u-i,a=T[i],b=T[Math.min(T.length-1,i+1)],L=(p,q)=>p.map((v,j)=>lerp(v,q[j],f));return {uR:L(a.uR,b.uR),uF:L(a.uF,b.uF),pre:L(a.pre,b.pre),dep:L(a.dep,b.dep),t:lerp(a.t,b.t,f)}}
  const M=Math.max(...T.flatMap(r=>r.uR.concat(r.uF).map(Math.abs))),HS=1.25/M,YA=1.4,XS=.56,XR=-2.3,XF=2.3,ZA=0,ZM=2.3,MS=1.7;
  const NM=['solve','h1','h2','h3','skill'];
  const cols=P=>[P.c3,P.c5,P.c2,mix(P.paper,P.c2,.5),mix(P.paper,P.c3,.5)];
  function adapter(R,cx,u,c,a,name,hl){const P=R.P,C=cols(P);if(a<=.01)return;
    R.glass([cx-1.5,0,ZA-.45],[3,0,0],[0,2.5,0],{c,a:a*.8,nu:10,nv:8});R.label([cx,2.5,ZA-.45],name,{fs:13.5,b:1,c,dy:-10,a});
    u.forEach((v,j)=>{const x=cx+(j-2)*XS,h=Math.max(.012,Math.abs(v)*HS);R.box([x,YA-.05,ZA],[.46,.05,.36],{a,shadow:false});R.box([x,0,ZA],[.03,YA-.05,.03],{a:a*.6});
      R.box([x,v>=0?YA:YA-.05-h,ZA],[.34,h,.24],{fill:C[j],a,shadow:false,lw:.7});
      R.label([x,0,ZA+.2],NM[j],{mono:true,fs:12,c:P.mute,dy:12,a,wide:1});
      if(hl&&hl.includes(j)){const z=Math.abs(v)<.005;R.label([x,z?YA-.05:v>=0?YA+h:YA-.05-h,ZA],z?'0.00':(v>=0?'+':'')+v.toFixed(2),{mono:true,fs:12.5,b:1,c:P.ink,dy:v>=0&&!z?-11:13,a})}})}
  function mixRow(R,cx,pi,a,name,hl){const P=R.P,C=cols(P);if(a<=.01)return;
    R.box([cx,0,ZM],[2.4,.06,.6],{fill:P.paper,a});
    pi.forEach((p,j)=>{const x=cx+(j-1.5)*.55,h=Math.max(.012,p*MS);R.box([x,.06,ZM],[.38,h,.38],{fill:C[j],a,shadow:false});
      if(hl&&(p>.05||hl===2)&&!(hl===1&&R.W<520))R.label([x,.06+h,ZM],(100*p).toFixed(1)+'%',{mono:true,fs:12,b:1,dy:-11,a})});
    R.label([cx,0,ZM+.35],name,{fs:12.5,b:1,c:P.ink,dy:14,a})}
  function draw(R,k,e){const P=R.P;R.grid(-4.6,4.6,-1.4,3.4,.5);
    const [i0,i1]=B[k],S=snap(k===4?i1:lerp(i0,i1,e)),fA=k===4?lerp(1,0,e):1;
    adapter(R,XR,S.uR,P.c1,1,'θR retain (kept)',k===0?null:k===4?[0,2,4]:[1,2]);
    adapter(R,XF,S.uF,P.c4,fA,k===4?'θF forget (deleted)':'θF forget',k===0||k===4?null:[0,1]);
    mixRow(R,XF,S.pre,k===4?lerp(1,0,e):1,'both on: π_R+F (training)',k>=1&&k<=3?1:k===0?1:0);
    mixRow(R,XR,S.dep,k===4?1:k===0?1:.55,'retain only: π_R (deployed)',k===4?2:k===0?1:0);
    // routing at work: during training, flagged hack 1 feeds the forget adapter only; unflagged hack 2 feeds both
    if(k>=1&&k<=3){const p=S.pre,src=[XF-.28,.1+p[1]*MS,ZM],s2=[XF+.28,.1+p[2]*MS,ZM],r1=.05+.06*p[1],r2=.05+.06*Math.min(1,p[2]*3);
      R.flowArc(src,[XF-.5,YA+.3,ZA],.4,{c:P.c5,r:r1,n:Math.max(3,Math.round(10*p[1])),speed:1.1});
      R.flowArc(s2,[XF,YA+.3,ZA],.4,{c:P.c2,r:r2,n:Math.max(2,Math.round(24*p[2])),speed:1.1});
      R.flowArc(s2,[XR,YA+.3,ZA],.9,{c:P.c2,r:r2,n:Math.max(2,Math.round(24*p[2])),speed:1.1})}
    R.label([0,2.75,ZA-.45],'step '+Math.round(S.t),{mono:true,fs:13,b:1,c:P.mute,dy:-10,wide:1})
  }
  const full={cam:[.3,.62],bounds:[[-4,0,-.6],[4,2.8,2.9]]};
  S3.stage({id:'stg-toy',list:'sx-toy',fig:'Fig. 3 · the toy\'s adapters, default GRAFT run, seed 1',cam:full.cam,bounds:full.bounds,aspect:.62,dur:3200,hold:5200,draw,
    view:k=>k===4?{cam:[.4,.58],bounds:[[-4.1,0,-.6],[.9,2.8,2.9]]}:full});
})();
