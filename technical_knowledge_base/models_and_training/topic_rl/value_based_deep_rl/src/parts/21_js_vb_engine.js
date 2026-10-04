// ---- Engine: every number the page's visuals compute. Mirrored line by line in src/checks/recompute.py ----
// and checked by src/checks/check_engine.mjs (runs this file in Node and compares with expected.json).
(function(root){
  // 1. Sutton and Barto section 11.2: the w -> 2w example. Off-policy: only the w -> 2w transition is updated.
  // On-policy: each visit is followed by the 2w state's own update, a transition to the end with reward 0.
  function triad(g,a,mode,steps){let w=10;const ws=[w];for(let k=0;k<steps;k++){
    w=w+a*(g*2*w-w)*1;if(mode==='on')w=w+a*(0-2*w)*2;ws.push(w)}return ws}

  // 2. Baird's counterexample (S&B Figure 11.1): expected semi-gradient DP updates, uniform or on-policy distribution.
  function bairdX(s){const x=[0,0,0,0,0,0,0,0];if(s<6){x[s]=2;x[7]=1}else{x[6]=1;x[7]=2}return x}
  function baird(alpha,sweeps,dist,g){g=g==null?0.99:g;let w=[1,1,1,1,1,1,10,1];const hist=[w.slice()];const X=[0,1,2,3,4,5,6].map(bairdX);
    for(let k=0;k<sweeps;k++){const v=X.map(x=>x.reduce((s,xi,i)=>s+xi*w[i],0));const dw=[0,0,0,0,0,0,0,0];
      const states=dist==='uniform'?[0,1,2,3,4,5,6]:[6],wt=dist==='uniform'?1/7:1;
      for(const s of states){const d=g*v[6]-v[s];for(let i=0;i<8;i++)dw[i]+=wt*d*X[s][i]}
      w=w.map((wi,i)=>wi+alpha*dw[i]);hist.push(w.slice())}
    return hist}

  // 3. Moving target against frozen target: expected semi-gradient Q-learning updates on two states.
  // s1 features (1, 0), s2 features (2, 2); s1 -> s2 reward 0; s2 -> s2 reward 1. C = 0 means fitted Q iteration.
  const PHI=[[1,0],[2,2]],NXT=[1,1],RW=[0,1];
  function solve2(A,b){const det=A[0][0]*A[1][1]-A[0][1]*A[1][0];return [(b[0]*A[1][1]-A[0][1]*b[1])/det,(A[0][0]*b[1]-b[0]*A[1][0])/det]}
  function tnet(g,d1,a,C,steps){const d=[d1,1-d1];let w=[0,0],wm=w.slice();const out=[];
    for(let k=0;k<steps;k++){
      if(C===0||k%C===0)wm=w.slice();
      const vm=[0,1].map(s=>PHI[s][0]*wm[0]+PHI[s][1]*wm[1]);const y=[0,1].map(s=>RW[s]+g*vm[NXT[s]]);
      if(C===0){const G=[0,1].map(i=>[0,1].map(j=>d[0]*PHI[0][i]*PHI[0][j]+d[1]*PHI[1][i]*PHI[1][j]));
        const b=[0,1].map(i=>d[0]*PHI[0][i]*y[0]+d[1]*PHI[1][i]*y[1]);w=solve2(G,b)}
      else{const v=[0,1].map(s=>PHI[s][0]*w[0]+PHI[s][1]*w[1]);w=[0,1].map(i=>w[i]+a*(d[0]*(y[0]-v[0])*PHI[0][i]+d[1]*(y[1]-v[1])*PHI[1][i]))}
      const v=[0,1].map(s=>PHI[s][0]*w[0]+PHI[s][1]*w[1]);out.push([v[0],v[1],y[0],y[1]])}
    return out}
  function tnetTrue(g){const v2=1/(1-g);return [g*v2,v2]}

  // 4. van Hasselt et al. (2015) Figure 2: polynomial fits to exact samples; max over 10 fits against the double estimator.
  function lstsqPoly(xs,ys,deg){const m=xs.length,n=deg+1;const A=xs.map(x=>{const r=[];for(let j=0;j<n;j++)r.push(Math.pow(x/6,j));return r});const b=ys.slice();
    for(let k=0;k<n;k++){let norm=0;for(let i=k;i<m;i++)norm+=A[i][k]*A[i][k];norm=Math.sqrt(norm);if(A[k][k]>0)norm=-norm;
      const v=new Array(m).fill(0);v[k]=A[k][k]-norm;for(let i=k+1;i<m;i++)v[i]=A[i][k];let vv=0;for(const t of v)vv+=t*t;if(vv===0)continue;
      for(let j=k;j<n;j++){let s=0;for(let i=k;i<m;i++)s+=v[i]*A[i][j];s=s*2/vv;for(let i=k;i<m;i++)A[i][j]-=s*v[i]}
      let s=0;for(let i=k;i<m;i++)s+=v[i]*b[i];s=s*2/vv;for(let i=k;i<m;i++)b[i]-=s*v[i]}
    const c=new Array(n).fill(0);for(let i=n-1;i>=0;i--){let s=b[i];for(let j=i+1;j<n;j++)s-=A[i][j]*c[j];c[i]=s/A[i][i]}return c}
  function peval(c,x){const t=x/6;let r=0;for(let j=c.length-1;j>=0;j--)r=r*t+c[j];return r}
  const FUNS={sin:Math.sin,bump:s=>2*Math.exp(-s*s)};
  function fig2Fits(fun,deg){const f=FUNS[fun];const fits=[],samples=[];for(let i=0;i<10;i++){const xs=[];for(let x=-6;x<=6;x++)if(x!==-5+i&&x!==-4+i)xs.push(x);
      samples.push(xs);fits.push(lstsqPoly(xs,xs.map(f),deg))}return {fits,samples}}
  function fig2(fun,deg,ngrid){ngrid=ngrid||1201;const f=FUNS[fun];const {fits,samples}=fig2Fits(fun,deg);const grid=[],emax=[],edbl=[],qmax=[],best=[];
    for(let k=0;k<ngrid;k++){const x=-6+12*k/(ngrid-1);grid.push(x);const q=fits.map(c=>peval(c,x));let b=0;for(let i=1;i<10;i++)if(q[i]>q[b])b=i;
      best.push(b);qmax.push(q[b]);emax.push(q[b]-f(x));edbl.push(peval(fits[(b+5)%10],x)-f(x))}
    const avg=a=>a.reduce((s,v)=>s+v,0)/a.length;return {fits,samples,grid,emax,edbl,qmax,best,avgMax:avg(emax),avgDbl:avg(edbl),f}}

  // 5. C51 projection (Bellemare, Dabney and Munos 2017): equation 7, or Algorithm 1 exactly as printed.
  function atoms(N,vmin,vmax){const dz=(vmax-vmin)/(N-1);const z=[];for(let i=0;i<N;i++)z.push(vmin+i*dz);return {z,dz}}
  function c51Next(N,vmin,vmax){const {z}=atoms(N,vmin,vmax);const raw=z.map(x=>Math.exp(-((x-5)**2)/6)+0.55*Math.exp(-((x+5)**2)/3));const s=raw.reduce((a,b)=>a+b,0);return raw.map(r=>r/s)}
  function c51Project(p,N,vmin,vmax,r,g,mode){const {z,dz}=atoms(N,vmin,vmax);const m=new Array(N).fill(0);
    for(let j=0;j<N;j++){const tz=Math.min(vmax,Math.max(vmin,r+g*z[j]));
      if(mode==='eq7'){for(let i=0;i<N;i++)m[i]+=Math.max(0,1-Math.abs(tz-z[i])/dz)*p[j]}
      else{const bj=(tz-vmin)/dz,l=Math.floor(bj),u=Math.ceil(bj);m[l]+=p[j]*(u-bj);m[u]+=p[j]*(bj-l)}}
    return m}

  // 6. Prioritised replay (Schaul et al. 2016): P(i) = p_i^alpha / sum p^alpha; w_i = (N P(i))^-beta / max w.
  function per(deltas,alpha,beta,variant,eps){eps=eps==null?0.01:eps;const n=deltas.length;let pr;
    if(variant==='prop')pr=deltas.map(d=>Math.abs(d)+eps);
    else{const order=deltas.map((d,i)=>i).sort((a,b)=>Math.abs(deltas[b])-Math.abs(deltas[a]));const rank=new Array(n);order.forEach((i,r)=>rank[i]=r+1);pr=rank.map(r=>1/r)}
    const pa=pr.map(q=>Math.pow(q,alpha));const s=pa.reduce((a,b)=>a+b,0);const P=pa.map(q=>q/s);let w=P.map(q=>Math.pow(n*q,-beta));const mw=Math.max(...w);w=w.map(x=>x/mw);return [P,w]}

  // 7. Summary of a decoded Rainbow Figure 4 row.
  function median(a){const s=a.slice().sort((x,y)=>x-y),n=s.length;return n%2?s[(n-1)/2]:(s[n/2-1]+s[n/2])/2}
  function fig4Stats(vals,hi){return {median:median(vals),mean:vals.reduce((a,b)=>a+b,0)/vals.length,hurt:vals.filter(v=>v>0.005).length,helped:vals.filter(v=>v<-0.005).length,strongest:hi.filter(Boolean).length}}

  // 8. R2D2's value rescaling h(x) = sign(x)(sqrt(|x| + 1) - 1) + eps x, eps = 0.001.
  function hRescale(x){return Math.sign(x)*(Math.sqrt(Math.abs(x)+1)-1)+1e-3*x}

  root.VBE={triad,bairdX,baird,tnet,tnetTrue,PHI,lstsqPoly,peval,FUNS,fig2Fits,fig2,atoms,c51Next,c51Project,per,median,fig4Stats,hRescale};
})(typeof window!=='undefined'?window:globalThis);
