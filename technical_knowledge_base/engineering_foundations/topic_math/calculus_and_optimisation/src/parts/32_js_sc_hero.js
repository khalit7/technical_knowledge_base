// ---- Scene, the hero (Fig. 1): the real two-weight logistic loss, its first- and second-order models at w = 0, and where each trust rule sends you (renderer v2) ----
// Everything is computed from CSU (the lab's real logistic loss): the surface, the tangent plane (gradient), the touching bowl (Hessian),
// the gradient-descent step at eta = 1/beta, the Newton step, and both full paths (gradient descent until the gap is under 1e-6, six Newton steps).
(function(){
  if(!document.getElementById('stg-hero')||!window.CSU)return;const {at,off,mix}=S3,C=CSU,F=C.lg;
  const CX=3.3,CY=.85,AX=4.4,AY=3.4;
  const M=C.mesh((x,y)=>F.f([x,y]),C.ell(CX,CY,AX,AY),18,48),LO=M.lo,HI=M.hi,SH=2.2/(HI-LO);
  const ISO=C.iso(M,[.3,.35,.4,.5,.6,.7,.85,1,1.2,1.4]),FF=(x,y)=>F.f([x,y]);
  const map=(x,y,v)=>[(x-CX)*.8,(v-LO)*SH,-(y-CY)*.8];
  const w0=[0,0],f0=F.f(w0),g0=F.g(w0),H0=F.H(w0),E0=C.eig2(H0),gn=Math.hypot(g0[0],g0[1]);
  const gd1=[w0[0]-g0[0]/C.beta,w0[1]-g0[1]/C.beta],dN=C.solve2(H0,g0),nt1=[w0[0]-dN[0],w0[1]-dN[1]],mmin=f0-.5*(g0[0]*dN[0]+g0[1]*dN[1]);
  const model=(x,y)=>{const d=[x-w0[0],y-w0[1]];return f0+g0[0]*d[0]+g0[1]*d[1]+.5*(H0[0]*d[0]*d[0]+2*H0[1]*d[0]*d[1]+H0[2]*d[1]*d[1])};
  const ntN=C.ntPath.findIndex(p=>F.f(p)-C.fstar<1e-6);
  const fx=v=>CO.minus(v.toFixed(2)),pt=p=>'('+fx(p[0])+', '+fx(p[1])+')';
  window.CO_HERO={w0,f0,g:g0,eig:E0.l,beta:C.beta,gd1,nt1,wstar:C.wstar,gdSteps:C.gdPath.length-1,ntSteps:ntN,ntPath:C.ntPath};
  function draw(R,k,e){const P=R.P;R.grid(-4.5,4.5,-3.5,3.5,.5);
    const sa=k===0?1:k===4?.55+.45*e:k===3?.55:.42;
    C.surf(R,M,map,{c:P.c1,a:sa,fa:.9,ea:.1});C.isoDraw(R,ISO,FF,map,{c:P.c1,a:sa});
    if(k===0)R.label(map(CX+AX,CY,LO),'w₁ · mean radius',{al:'left',dx:6,dy:10,fs:12,c:P.mute,wide:1});
    if(k===0)R.label(map(CX,CY+AY,LO),'w₂ · mean texture',{al:'left',dx:6,fs:12,c:P.mute,wide:1});
    const W0=map(w0[0],w0[1],f0);
    // you are here
    R.ball([W0[0],W0[1]+.04,W0[2]],.09,{c:P.ink,top:1});R.glow(W0,.35,{c:P.ink,a:k===0?.5:.2,top:1});
    if(k<3)R.label(W0,'w = (0, 0) · loss '+f0.toFixed(3),{al:'right',dx:-12,dy:-12,fs:12.5,b:1});
    // 2. the first-order model: the tangent plane (glass), and the steepest way down with dots flowing along it
    const pa=k===1?e:k===2?1-.6*e:k===3?.4:k===4?off(k,e,4)*.4:0;
    if(pa>.01){const a=1.25,o0=map(w0[0]-a,w0[1]-a,f0-a*g0[0]-a*g0[1]),u=[2*a,2*a*g0[0]*SH,0],v=[0,2*a*g0[1]*SH,-2*a];
      R.glass(o0,u,v,{c:P.c2,a:pa,nu:6,nv:6,th:.02});
      const dir=[-g0[0]/gn,-g0[1]/gn],L=1.2,tip=[w0[0]+dir[0]*L,w0[1]+dir[1]*L],A=[W0[0],W0[1]+.03,W0[2]],B=map(tip[0],tip[1],f0-gn*L);B[1]+=.03;
      R.line([A,B],{c:P.c2,w:2.6,head:10,top:1,a:pa});R.flow([A,B],{c:P.c2,a:pa,r:.06,speed:.9,n:5,top:1});
      if(k===1)R.label(B,'−g · steepest way down, slope '+gn.toFixed(3),{al:'left',dx:8,fs:12.5,b:1,c:P.c2,a:e})}
    // 3. the second-order model: the bowl that touches the loss at w0 (wire mesh, blue), eigenvalues of H
    const ba=k===2?e:k===3?1:k===4?1-e:0;
    if(ba>.01){const top=f0+.12,ln=(pts)=>{let run=[];const out=[];pts.forEach(p=>{const v=model(p[0],p[1]);if(v<top)run.push(map(p[0],p[1],v));else{if(run.length>1)out.push(run);run=[]}});if(run.length>1)out.push(run);return out};
      for(let s=-1.2;s<=2.81;s+=.4){const a=[],b=[];for(let t=-1.2;t<=2.81;t+=.08){a.push([w0[0]+s,w0[1]+t]);b.push([w0[0]+t,w0[1]+s])}
        ln(a).concat(ln(b)).forEach(r=>R.line(r,{c:P.c1,w:1,a:ba*.75}))}
      if(k===2)R.label(map(nt1[0],nt1[1],mmin),'Hessian eigenvalues '+E0.l[0].toFixed(3)+' and '+E0.l[1].toFixed(3),{al:'left',dx:12,dy:16,fs:12.5,b:1,c:P.c1,a:e})}
    // 4. one step each: gradient descent trusts the plane only as far as eta = 1/beta; Newton goes to the bowl's bottom
    const sa4=k===3?e:k===4?1:0;
    if(sa4>.01){const G=map(gd1[0],gd1[1],F.f(gd1)),N=map(nt1[0],nt1[1],F.f(nt1)),Nm=map(nt1[0],nt1[1],mmin);
      R.flow(C.lift(C.seg(w0,gd1,12),(x,y)=>F.f([x,y]),map,.05),{c:P.c2,a:sa4*(k===3?1:.4),r:.06,n:5,top:1});
      R.flow(C.lift(C.seg(w0,nt1,12),(x,y)=>F.f([x,y]),map,.05),{c:P.c1,a:sa4*(k===3?1:.4),r:.06,n:5,top:1});
      R.ball(G,.07,{c:P.c2,a:sa4,top:1});R.ball(N,.07,{c:P.c1,a:sa4,top:1});
      if(k===3){R.line([Nm,N],{c:P.c1,w:1.2,dash:[3,3],a:e,top:1});R.ball(Nm,.05,{c:P.c1,a:e,top:1});
        R.label(G,'gradient descent '+pt(gd1),{al:'right',dx:-10,dy:8,fs:12.5,b:1,c:P.c2,a:e});R.label(N,'Newton '+pt(nt1),{al:'left',dx:10,dy:-6,fs:12.5,b:1,c:P.c1,a:e})}}
    // 5. repeat: both paths to the optimum
    const WS=map(C.wstar[0],C.wstar[1],C.fstar);
    R.glow(WS,.35,{c:P.good,a:k===4?.9:.35,top:1});R.ball(WS,.06,{c:P.good,a:k===4?1:.5,top:1});
    if(k!==1&&k!==2)R.label(WS,'optimum '+pt(C.wstar),{al:'left',dx:10,dy:12,fs:12.5,b:k===4,c:P.good,a:k===4?1:.7});
    if(k===4){const ng=Math.max(2,Math.round(e*C.gdPath.length)),nn=Math.max(2,Math.round(e*C.ntPath.length));
      const gp=C.gdPath.slice(0,ng).map(p=>{const w=map(p[0],p[1],F.f(p));return [w[0],w[1]+.04,w[2]]}),np=C.ntPath.slice(0,nn).map(p=>{const w=map(p[0],p[1],F.f(p));return [w[0],w[1]+.04,w[2]]});
      R.line(gp,{c:P.c2,w:2,top:1});R.line(np,{c:P.c1,w:2,top:1});C.gdPath.slice(0,ng).forEach((p,i)=>{if(i%4===0)R.ball(gp[i],.03,{c:P.c2,top:1})});np.forEach(q=>R.ball(q,.05,{c:P.c1,top:1}));
      R.flow(np,{c:P.c1,r:.055,n:6,speed:1.2,top:1});R.flow(gp,{c:P.c2,r:.05,n:10,speed:.8,top:1});
      R.label(np[Math.min(2,np.length-1)],'Newton: '+ntN+' steps',{al:'left',dx:10,dy:-14,fs:12.5,b:1,c:P.c1,a:e});
      R.label(gp[Math.min(10,gp.length-1)],'gradient descent: '+(C.gdPath.length-1)+' steps',{al:'right',dx:-10,dy:16,fs:12.5,b:1,c:P.c2,a:e})}
  }
  const full={cam:[.35,.72],bounds:[[-3.7,0,-2.9],[3.7,2.2,2.9]]},near0=(()=>{const a=map(-2.2,-2,LO),b=map(7.7,2.4,LO);return {cam:[.4,.66],bounds:[[a[0],0,b[2]],[b[0],1.5,a[2]]]}})();
  const fin=(()=>{const a=map(-.9,-1.4,LO),b=map(7.7,2.4,LO);return {cam:[.3,.9],bounds:[[a[0],0,b[2]],[b[0],1.2,a[2]]]}})();
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · a real loss and its two local models',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[18,16,16,16],
    view:k=>k===1||k===2||k===3?near0:k===4?fin:full});
})();
