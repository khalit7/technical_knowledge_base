// ---- Scene: the shape of every derivative on the tiny model (Fig. 2, renderer v2) ----
// x = (2, 1), W rows (1, 0), (0, 1), (1, -2), z = Wx = (2, 1, 0), p = softmax(z), target sat: MC.tiny and MC.tinyAll() (parts/22b_js_core.js,
// checked against src/recompute.py by src/check_js.mjs). The chain stands at the back; each Jacobian is a purple glass plate in it and, laid flat
// in front, a bar field (rows outputs, columns inputs). Then the 3 x 3 x 2 Jacobian of z with respect to W, mostly zeros, and the VJP that
// contracts it to W.grad without ever building it.
(function(){
  if(!document.getElementById('stg-jac')||!window.MCS||!window.MC)return;
  const {mix}=S3,U=MCS,T=MC.tinyAll(),W=MC.tiny.W,x=MC.tiny.x,ZC=-1.6,YP=.25,words=['cat','dog','sat'];
  const XX=-4.7,PJ1=-3.6,XZ=-2.5,PJ2=-1.4,XP=-.3,SL=[1.1,2.3,3.5],XG=4.9,ZS=.1;
  // dz/dW: slice i is the 3 x 2 array dz_i/dW_kl = delta_ik x_l
  const DZW=[0,1,2].map(i=>[0,1,2].map(k=>x.map(v=>k===i?v:0)));
  const FJ={cell:.36,m:2,hmax:.8},FS={cell:.36,m:.25,hmax:.8},FT={cell:.3,m:2,hmax:.75},FG={cell:.36,m:2,hmax:.8};
  const ZR=[[-5.3,-1.8],[-5.3,.4],[.3,4.2],[.3,5.6]];
  function draw(R,k,e){const P=R.P;R.grid(-5.6,6,-2.6,1.6,.5);
    const V=x=>x>=ZR[k][0]-.3&&x<=ZR[k][1]+.3,L=(p,t,o)=>{if(V(p[0]))R.label(p,t,o)};
    const A=s=>s?1:.28,ap=(s,v)=>k===s?e:k>s?1:0;
    // the chain at the back: x -> J1 = W -> z -> J2 = softmax's Jacobian -> p
    const a1=k<=1?1:.3,a2=k===1?1:.3;
    U.comb(R,[XX,YP,ZC],x,2.4,null,a1,.8,.7);L([XX,0,ZC+.45],'x · 2',{mono:true,fs:12.5,dy:6,a:Math.max(.5,a1)});
    R.glass([PJ1,.08,ZC-.55],[0,0,1.1],[0,.95,0],{c:P.c4,nu:2,nv:3,a:.4+.6*(k===0?1:.3)});
    U.comb(R,[XZ,YP,ZC],T.z,2.4,null,a1,.8,.95);L([XZ,0,ZC+.45],'z · 3',{mono:true,fs:12.5,dy:6,a:Math.max(.5,a1)});
    R.glass([PJ2,.08,ZC-.55],[0,0,1.1],[0,.95,0],{c:P.c4,nu:3,nv:3,a:(k>=1?.4+.6*a2:.25)});
    U.comb(R,[XP,YP,ZC],T.p,1,null,k>=1?a2:.3,.8,.95);L([XP,0,ZC+.45],'p · 3',{mono:true,fs:12.5,dy:6,a:k>=1?Math.max(.5,a2):.4});
    if(k===0)R.flow(U.path([XX,YP+.3,ZC],[XZ,YP+.3,ZC],14),{c:P.c3,r:.07,speed:1.2});
    if(k===1)R.flow(U.path([XZ,YP+.3,ZC],[XP,YP+.3,ZC],14),{c:P.c3,r:.07,speed:1.2});
    // laid flat in front of each plate: the Jacobian's entries (rows: outputs, columns: inputs)
    U.field(R,[PJ1,0,ZS],W,Object.assign({col:P.c4,a:k===0?1:.3},FJ));
    R.line([[PJ1,.5,ZC+.05],[PJ1,.08,ZS-.6]],{c:P.c4,w:1,dash:[3,3],a:k===0?.7:.25});
    L([PJ1,0,ZS+.75],'∂z/∂x = W · 3 × 2',{mono:true,fs:12.5,b:k===0,c:P.c4,dy:8,a:k===0?1:.5});
    if(k===0)W.forEach((r,i)=>L([PJ1-.5,0,ZS+(i-1)*.36],words[i],{mono:true,fs:12,al:'right',c:P.mute,wide:1}));
    if(k>=1){const a=k===1?e:.3;U.field(R,[PJ2,0,ZS],T.J,Object.assign({col:P.c4,a:k===1?1:.3,t:k===1?e:1},FS));
      R.line([[PJ2,.5,ZC+.05],[PJ2,.08,ZS-.6]],{c:P.c4,w:1,dash:[3,3],a:k===1?.7:.25});
      L([PJ2,0,ZS+.75],'∂p/∂z = diag(p) − ppᵀ',{mono:true,fs:12.5,b:k===1,c:P.c4,dy:8,a:Math.max(.5,a)});
      if(k===1)L([PJ2+.75,.3,ZS],'each row sums to 0',{mono:true,fs:12,al:'left',c:P.mute,wide:1,a:e})}
    // dz/dW: three 3 x 2 slices, one per score; only row i of slice i is non-zero (it is x)
    if(k>=2){const a=k===2?1:.45;SL.forEach((sx,i)=>{const g=k===2?Math.min(1,Math.max(0,e*1.6-i*.3)):1;
        U.field(R,[sx,0,ZS],DZW[i],Object.assign({col:P.c4,a:a*Math.max(g,.01),t:g},FT));
        R.label([sx,0,ZS+.68],'∂z_'+words[i]+'/∂W',{mono:true,fs:12,c:P.c4,b:k===2,dy:8,a:Math.max(.5,a)*g})});
      if(k===2)R.label([SL[1],0,ZS+1.05],'∂z/∂W · 3 × 3 × 2 = 18 numbers, 12 of them 0',{mono:true,fs:12.5,b:1,c:P.ink,wide:1,a:e,dy:12})}
    // the VJP: weight each slice by its score's gradient and add; the 18-number array is never built
    if(k>=3){U.comb(R,[SL[1],YP,ZC],T.gz,1,P.acc,e,.8,.95);R.label([SL[1]-.62,YP+.2,ZC],'z̄ = p − y',{mono:true,fs:12.5,b:1,c:P.acc,al:'right'});
      SL.forEach((sx,i)=>{const w=Math.abs(T.gz[i]);R.flowArc([sx,.5,ZS],[XG,.6,ZS],.4,{c:P.acc,a:Math.min(1,e*1.6)*(.3+.7*w),r:.04+.05*w,n:Math.round(4+8*w),speed:1.2})});
      U.field(R,[XG,0,ZS],T.gW,Object.assign({col:P.acc,t:e},FG));
      R.label([XG,0,ZS+.75],'W̄ = z̄ xᵀ · 3 × 2',{mono:true,fs:12.5,b:1,c:P.acc,dy:8});
      R.label([XG,1.05,ZS],'W.grad: '+U.f3(T.gW[2][0])+' at (sat, 1)',{mono:true,fs:12,c:P.acc,wide:1,a:e})}
  }
  const full={cam:[-.45,.66],bounds:[[-5.3,0,-2.2],[5.6,1.1,1.1]]};
  S3.stage({id:'stg-jac',list:'sx-jac',fig:'Fig. 2 · Jacobians of the tiny model',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,8,10,8]:[18,14,14,14],
    view:k=>k===0?{cam:[-.5,.55],bounds:[[-5.3,0,-2.2],[-1.8,1.1,1.1]]}:k===1?{cam:[-.45,.58],bounds:[[-5.3,0,-2.2],[.4,1.1,1.1]]}:k===2?{cam:[-.3,.6],bounds:[[.3,0,-2.2],[4.2,1.2,1.1]]}:{cam:[-.35,.6],bounds:[[.3,0,-2.2],[5.6,1.2,1.1]]}});
})();
