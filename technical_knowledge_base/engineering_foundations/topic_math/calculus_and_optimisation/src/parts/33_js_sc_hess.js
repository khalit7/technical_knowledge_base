// ---- Scene, Fig. 3 (section 3): five flat points, five shapes; the Hessian's eigen-directions on each (renderer v2) ----
// The functions are the section's table examples (illustrative). Each step morphs the surface from the last one; at the flat point (the origin)
// the arrows are the Hessian's eigenvectors, length proportional to the eigenvalue (blue curves up, orange down, grey zero), and the thick curves
// are the surface along each eigen-direction.
(function(){
  if(!document.getElementById('stg-hess')||!window.CSU)return;const C=CSU,{mix}=S3;
  const FS=[['x² + y²',(x,y)=>x*x+y*y,[2,2],'minimum'],['−x² − y²',(x,y)=>-x*x-y*y,[-2,-2],'maximum'],['x² − y²',(x,y)=>x*x-y*y,[2,-2],'saddle'],
    ['x² + y⁴',(x,y)=>x*x+y**4,[2,0],'minimum'],['x² − y⁴',(x,y)=>x*x-y**4,[2,0],'saddle']];
  const A=1.1,MS=FS.map(F=>C.mesh(F[1],C.rect(-A,A,-A,A),22,22)),LO=-2.42,HI=2.67,BASE=1.4,SH=.52,XS=1.5;
  const map=(x,y,v)=>[x*XS,BASE+v*SH,-y*XS];
  window.CO_HESS=FS.map(F=>({f:F[0],eig:F[2],kind:F[3]}));
  function draw(R,k,e){const P=R.P,F=FS[k],col=l=>l>0?P.c1:l<0?P.c2:P.mute;R.grid(-3,3,-2.4,2.4,.5);
    const M0=MS[Math.max(0,k-1)],t2=k===0?1:e;C.surf(R,M0,map,{c:P.c1,M2:MS[k],t2,lo:LO,hi:HI,fa:.9,ea:.25});
    const fk=(x,y)=>(1-t2)*FS[Math.max(0,k-1)][1](x,y)+t2*F[1](x,y);
    // the flat point, its eigen-directions on the floor-level plane through it, and the surface along each
    const O=map(0,0,0);R.ball(O,.07,{c:P.ink,top:1});
    [[1,0],[0,1]].forEach((d,i)=>{const l=F[2][i],c=col(l),len=l===0?.3:.42*Math.abs(l),a=e;
      const sl=[];for(let t=-A;t<=A+1e-9;t+=.05)sl.push(map(d[0]*t,d[1]*t,fk(d[0]*t,d[1]*t)));R.line(sl.map(p=>[p[0],p[1]+.02,p[2]]),{c,w:3,top:1,a:.35+.65*a});
      [1,-1].forEach(sg=>R.line([O,[O[0]+sg*d[0]*len,O[1],O[2]-sg*d[1]*len]],{c,w:2.4,head:sg>0?9:0,top:1,a}));
      R.label([O[0]+d[0]*(len+.15),O[1],O[2]-d[1]*(len+.15)],'λ = '+CO.minus(String(l)),{al:i?'center':'left',dx:i?0:4,dy:i?-12:0,fs:12.5,b:1,c,a})});
    // a saddle sends gradient descent away along the direction that curves down
    if(F[3]==='saddle'){const dn=F[2][1]<0||F[1](0,.8)<0?[0,1]:[1,0];[1,-1].forEach(sg=>{const pts=[];for(let t=.06;t<=A;t+=.05)pts.push(map(dn[0]*t*sg,dn[1]*t*sg,F[1](dn[0]*t*sg,dn[1]*t*sg)));
      R.flow(pts.map(p=>[p[0],p[1]+.05,p[2]]),{c:P.c2,a:e,r:.06,n:5,speed:.9,top:1})})}
    R.label([0,BASE+1.75*SH*2,0],F[0]+' · '+F[3],{fs:14,b:1,serif:true,a:Math.max(.3,e),c:F[3]==='saddle'?P.c2:F[3]==='maximum'?P.c2:P.c1});
  }
  S3.stage({id:'stg-hess',list:'sx-hess',fig:'Fig. 3 · the Hessian at a flat point',cam:[.55,.55],bounds:[[-1.8,0,-1.8],[1.8,3.2,1.8]],aspect:.72,dur:1500,hold:4600,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,16]});
})();
