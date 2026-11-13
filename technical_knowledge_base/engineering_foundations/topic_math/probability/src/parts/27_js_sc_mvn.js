// ---- Scene, Fig. 2 (section 2): the two-dimensional Gaussian as a surface, its covariance ellipses on the floor, and the
// Cholesky sampler x = L eps moving the same seeded noise draws as the slider below (renderer v2) ----
// Unit variances, correlation rho: rho = 0 (the noise), 0.8 (the section's default) and 0.95 (near singular).
// Density, eigenvalues, determinant and the Mahalanobis distances are computed here; src/recompute.py writes the same numbers (mvn3d).
(function(){
  if(!document.getElementById('stg-mvn')||!window.PMS||!window.PM)return;const {mix,lerp}=S3;
  const f=(x,y,r)=>{const d=1-r*r;return Math.exp(-.5*(x*x-2*r*x*y+y*y)/d)/(2*Math.PI*Math.sqrt(d))};
  // the first 200 of the slider's 400 seeded draws (PM.rng(7), Box-Muller)
  const rg=PM.rng(7),E=[];for(let i=0;i<200;i++)E.push([PM.gauss(rg),PM.gauss(rg)]);
  const SY=4,RA=Math.sqrt(1.8),fa=f(RA/Math.SQRT2,RA/Math.SQRT2,.8),fb=f(-RA/Math.SQRT2,RA/Math.SQRT2,.8);
  window.PM_MVN={eig8:[1.8,.2],det8:.36,det95:1-.95*.95,peak95:f(0,0,.95),fa,fb,maha_short:RA/Math.sqrt(.2)};
  const w=(x,y,h)=>[x,h||0,-y]; // the x2 axis runs into the page
  function rhoAt(k,e){return k===0?0:k===1?.8*e:k<4?.8:lerp(.8,.95,e)}
  function ellipse(R,r,m,o){const l1=1+r,l2=1-r,pts=[];for(let i=0;i<=64;i++){const t=i/64*2*Math.PI,a=m*Math.sqrt(l1)*Math.cos(t),b=m*Math.sqrt(l2)*Math.sin(t);pts.push(w((a-b)/Math.SQRT2,(a+b)/Math.SQRT2,.015))}R.line(pts,o)}
  function draw(R,k,e){const P=R.P,r=rhoAt(k,e);R.grid(-3.4,3.4,-3.4,3.4,.5);
    // the density surface, recomputed for the current correlation
    const sa=k===2?.35:k===3?.55:.9;PMS.grid2(R,(x,y)=>f(x,y,r),-3,3,k===4?40:28,SY,{c:P.c1,a:sa,hi:f(0,0,.95)*.8});
    // the noise draws: eps at step 1, then L eps (x1 = e1, x2 = r e1 + sqrt(1 - r^2) e2)
    const pa=k<=1?1:k===4?.7:.45,s2=Math.sqrt(1-r*r);
    E.forEach(([a,b])=>{const x=a,y=r*a+s2*b;if(Math.abs(x)>3.3||Math.abs(y)>3.3)return;R.ball(w(x,y,.03),.035,{c:P.c2,a:pa})});
    // ellipses at Mahalanobis distance 1 and 2
    ellipse(R,r,1,{c:P.c2,w:2.2});ellipse(R,r,2,{c:P.c2,w:1.2,dash:[5,4],a:.8});
    if(k<=1)R.label(w(-2.15,2.15,0),k===0?'ε ~ N(0, I) · round':'x = L ε',{fs:13,b:1,c:P.c2,a:k===0?1:e});
    R.label(w(3.25,0),'x₁',{fs:12.5,c:P.mute,dy:14});R.label(w(0,3.25),'x₂',{fs:12.5,c:P.mute,dy:-6});
    // 3. the axes of the ellipse are the eigenvectors; half-lengths sqrt(1.8) and sqrt(0.2)
    if(k===2||k===3){const a=k===2?e:.6,u=Math.sqrt(1+r)/Math.SQRT2,v=Math.sqrt(1-r)/Math.SQRT2;
      R.line([w(0,0,.04),w(u,u,.04)],{c:P.acc,w:3,head:9,a});R.line([w(0,0,.04),w(-v,v,.04)],{c:P.c4,w:3,head:9,a});
      R.label(w(u,u,.05),'√1.8 = 1.342',{mono:true,fs:12.5,b:1,c:P.acc,al:'left',dx:8,a});R.label(w(-v,v,.05),'√0.2 = 0.447',{mono:true,fs:12.5,b:1,c:P.c4,al:'right',dx:-8,dy:-4,a})}
    // 4. same distance from the mean, very different density: Mahalanobis 1 along the long axis, 3 along the short one
    if(k===3){const A=[RA/Math.SQRT2,RA/Math.SQRT2],B=[-RA/Math.SQRT2,RA/Math.SQRT2];
      [[A,fa,'Mahalanobis 1 · p = 0.161',P.acc],[B,fb,'Mahalanobis 3 · p = 0.003',P.c4]].forEach(([q,v,t,c],i)=>{
        R.line([w(0,0,.06),w(q[0],q[1],.06)],{c,w:1.6,dash:[4,3],a:e});
        R.box(w(q[0],q[1],0),[.12,Math.max(.02,v*SY*e),.12],{fill:mix(c,P.paper,.2),a:e});R.ball(w(q[0],q[1],v*SY*e+.04),.07,{c,a:e});
        R.label(w(q[0],q[1],v*SY),t,{mono:true,fs:12.5,b:1,c,dy:i&&R.W<520?-32:-12,al:i?'right':'left',dx:i?-6:6,a:e})});
      R.label(w(0,-.4,0),'both 1.342 from the mean',{fs:12.5,c:P.mute,dy:16,a:e})}
    if(k===4)R.label(w(0,0,f(0,0,r)*SY),'ρ = '+r.toFixed(2)+' · det Σ = '+(1-r*r).toFixed(4),{mono:true,fs:13,b:1,c:P.ink,dy:-14})
  }
  const full={cam:[.35,.62],bounds:[[-3,0,-3],[3,1.6,3]]};
  S3.stage({id:'stg-mvn',list:'sx-mvn',fig:'Fig. 2 · a covariance is a shape',cam:full.cam,bounds:full.bounds,aspect:.78,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,14,16],
    view:k=>k===2?{cam:[.35,1.25],bounds:[[-2.4,0,-2.4],[2.4,.4,2.4]]}:k===3?{cam:[.5,.55],bounds:[[-2,0,-2],[2,1.2,1.4]]}:k===4?{cam:[.35,.5],bounds:[[-3,0,-3],[3,2.1,3]]}:full});
})();
