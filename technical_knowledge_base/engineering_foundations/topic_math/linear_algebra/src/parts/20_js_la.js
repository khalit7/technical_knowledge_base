// ---- Small dense linear algebra for the page (2x2 closed forms, 3x3 by Jacobi), no libraries ----
window.LA=(function(){
  const mul=(A,B)=>A.map((r,i)=>B[0].map((_,j)=>r.reduce((s,_,k)=>s+A[i][k]*B[k][j],0)));
  const mv=(A,x)=>A.map(r=>r.reduce((s,a,k)=>s+a*x[k],0));
  const T=A=>A[0].map((_,j)=>A.map(r=>r[j]));
  const I=n=>Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>i===j?1:0));
  const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
  const norm=a=>Math.sqrt(dot(a,a));
  const rot=t=>[[Math.cos(t),-Math.sin(t)],[Math.sin(t),Math.cos(t)]];
  const det2=M=>M[0][0]*M[1][1]-M[0][1]*M[1][0];
  function det3(M){return M[0][0]*(M[1][1]*M[2][2]-M[1][2]*M[2][1])-M[0][1]*(M[1][0]*M[2][2]-M[1][2]*M[2][0])+M[0][2]*(M[1][0]*M[2][1]-M[1][1]*M[2][0])}
  const det=M=>M.length===2?det2(M):det3(M);
  // eigenvalues of a 2x2 (real or complex pair) and real eigenvectors when they exist
  function eig2(M){const a=M[0][0],b=M[0][1],c=M[1][0],d=M[1][1],tr=a+d,dt=a*d-b*c,disc=tr*tr/4-dt;
    if(disc<-1e-12){const re=tr/2,im=Math.sqrt(-disc);return {complex:true,vals:[[re,im],[re,-im]],vecs:[]}}
    const s=Math.sqrt(Math.max(0,disc)),l1=tr/2+s,l2=tr/2-s;
    const vec=l=>{let v;if(Math.abs(b)>1e-12)v=[b,l-a];else if(Math.abs(c)>1e-12)v=[l-d,c];else v=Math.abs(l-a)<1e-12?[1,0]:[0,1];const n=norm(v);return v.map(x=>x/n)};
    let v1=vec(l1),v2=vec(l2);const defective=Math.abs(l1-l2)<1e-9&&Math.abs(Math.abs(dot(v1,v2))-1)<1e-9&&!(Math.abs(b)<1e-12&&Math.abs(c)<1e-12);
    if(Math.abs(l1-l2)<1e-12&&Math.abs(b)<1e-12&&Math.abs(c)<1e-12){v1=[1,0];v2=[0,1]}
    return {complex:false,vals:[l1,l2],vecs:defective?[v1]:[v1,v2],defective}}
  // symmetric eigen by cyclic Jacobi (n <= 4): returns values descending and vectors as columns list
  function symEig(S){const n=S.length;let A=S.map(r=>r.slice()),V=I(n);
    for(let sweep=0;sweep<60;sweep++){let off=0;for(let p=0;p<n;p++)for(let q=p+1;q<n;q++)off+=A[p][q]*A[p][q];if(off<1e-26)break;
      for(let p=0;p<n;p++)for(let q=p+1;q<n;q++){if(Math.abs(A[p][q])<1e-300)continue;
        const th=(A[q][q]-A[p][p])/(2*A[p][q]),t=Math.sign(th||1)/(Math.abs(th)+Math.sqrt(th*th+1)),c=1/Math.sqrt(t*t+1),s=t*c;
        for(let k=0;k<n;k++){const akp=A[k][p],akq=A[k][q];A[k][p]=c*akp-s*akq;A[k][q]=s*akp+c*akq}
        for(let k=0;k<n;k++){const apk=A[p][k],aqk=A[q][k];A[p][k]=c*apk-s*aqk;A[q][k]=s*apk+c*aqk}
        for(let k=0;k<n;k++){const vkp=V[k][p],vkq=V[k][q];V[k][p]=c*vkp-s*vkq;V[k][q]=s*vkp+c*vkq}}}
    const idx=[...Array(n).keys()].sort((i,j)=>A[j][j]-A[i][i]);
    return {vals:idx.map(i=>A[i][i]),vecs:idx.map(i=>V.map(r=>r[i]))}}
  // SVD of a square n x n (n = 2 or 3) via eigen of M^T M; U columns from M v / sigma, completed by Gram-Schmidt
  function svd(M){const n=M.length,e=symEig(mul(T(M),M));const s=e.vals.map(v=>Math.sqrt(Math.max(0,v)));let V=e.vecs.map(v=>v.slice());
    if(n===2&&det2(V.length?T(V):I(2))<0){} // orientation handled below
    // eigenvalues of M^T M carry about 1e-16 relative error, so singular values below about 1e-7 of the largest are rounding: set to 0
    const tol=Math.max(1e-12,(s[0]||0)*1e-7);for(let i=0;i<n;i++)if(s[i]<=tol)s[i]=0;let U=[];
    for(let i=0;i<n;i++){if(s[i]>tol){const u=mv(M,V[i]).map(x=>x/s[i]);U.push(u)}else{
      // complete with a vector orthogonal to the previous ones
      let best=null;for(let k=0;k<n;k++){let c=I(n)[k];for(const u of U){const d=dot(c,u);c=c.map((x,j)=>x-d*u[j])}const nn=norm(c);if(!best||nn>best.n)best={c,n:nn}}
      U.push(best.c.map(x=>x/best.n))}}
    // for 2x2 make V a rotation (det +1) by flipping v2 and u2 together
    if(n===2){const dv=V[0][0]*V[1][1]-V[0][1]*V[1][0];if(dv<0){V[1]=V[1].map(x=>-x);U[1]=U[1].map(x=>-x)}
      if(V[0][0]<-1e-12||(Math.abs(V[0][0])<1e-12&&V[0][1]<0)){V=V.map(v=>v.map(x=>-x));U=U.map(u=>u.map(x=>-x))}}
    const rank=s.filter(x=>x>tol).length;
    return {U,s,V,rank,kappa:s[n-1]>0?s[0]/s[n-1]:Infinity}}
  // real roots of a monic cubic l^3 + p2 l^2 + p1 l + p0 and complex pair if any
  function eig3(M){const tr=M[0][0]+M[1][1]+M[2][2];
    const c2=M[0][0]*M[1][1]-M[0][1]*M[1][0]+M[0][0]*M[2][2]-M[0][2]*M[2][0]+M[1][1]*M[2][2]-M[1][2]*M[2][1];const dt=det3(M);
    const f=l=>((l-tr)*l+c2)*l-dt,df=l=>(3*l-2*tr)*l+c2;
    // bracket a real root
    const B=1+Math.max(Math.abs(tr),Math.abs(c2),Math.abs(dt));let lo=-B,hi=B;for(let i=0;i<200;i++){const m=(lo+hi)/2;if(f(lo)*f(m)<=0)hi=m;else lo=m}
    let r=(lo+hi)/2;for(let i=0;i<5;i++){const d=df(r);if(Math.abs(d)>1e-14)r-=f(r)/d}
    // deflate: l^2 + b l + c
    const b=r-tr,c=c2+b*r;const disc=b*b/4-c;
    if(disc<-1e-12)return {vals:[[r,0],[-b/2,Math.sqrt(-disc)],[-b/2,-Math.sqrt(-disc)]],complex:true};
    const q=Math.sqrt(Math.max(0,disc));return {vals:[r,-b/2+q,-b/2-q].sort((x,y)=>y-x),complex:false}}
  const fmt=(v,d)=>{if(!isFinite(v))return '∞';if(d===undefined)d=3;const r=Math.abs(v)<0.5*Math.pow(10,-d)?0:v;return r.toFixed(d).replace(/\.?0+$/,m=>m.includes('.')?'':m).replace(/^-0$/,'0')};
  const fixed=(v,d)=>{if(!isFinite(v))return '∞';const r=Math.abs(v)<0.5*Math.pow(10,-d)?0:v;return r.toFixed(d).replace(/^-(0\.?0*)$/,'$1')};
  return {mul,mv,T,I,dot,norm,rot,det,det2,det3,eig2,symEig,svd,eig3,fmt,fixed};
})();
