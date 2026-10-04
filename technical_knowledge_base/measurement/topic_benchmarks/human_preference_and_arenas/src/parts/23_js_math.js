// ---- Shared maths for the page: decoding the vote sample, Bradley-Terry (with style control), online Elo, intervals, rank spreads ----
// Mirrors src/recompute.py; node checks compare the two.
window.HP=(function(){
  const LN10=Math.log(10);
  // decode the 7-character-per-vote sample into arrays
  function decode(S){
    const al=S.alphabet,n=S.n,v=S.votes,A=new Int8Array(n),B=new Int8Array(n),O=new Int8Array(n),F=[0,1,2,3].map(()=>new Float64Array(n));
    for(let i=0;i<n;i++){A[i]=al.indexOf(v[i*7]);B[i]=al.indexOf(v[i*7+1]);O[i]=al.indexOf(v[i*7+2]);
      for(let k=0;k<4;k++)F[k][i]=(al.indexOf(v[i*7+3+k])-31)/31;}
    return {A,B,O,F,n,m:S.models.length,models:S.models};
  }
  // outcome as model A's score: a wins 1, b wins 0, tie or both bad 0.5
  const score=o=>o===0?1:o===1?0:0.5;
  // Solve a small symmetric linear system (Gaussian elimination with partial pivoting)
  function solve(H,g){const n=g.length,M=H.map((r,i)=>r.concat([g[i]]));
    for(let c=0;c<n;c++){let p=c;for(let r=c+1;r<n;r++)if(Math.abs(M[r][c])>Math.abs(M[p][c]))p=r;[M[c],M[p]]=[M[p],M[c]];
      const d=M[c][c]||1e-12;for(let r=c+1;r<n;r++){const f=M[r][c]/d;if(f)for(let k=c;k<=n;k++)M[r][k]-=f*M[c][k];}}
    const x=new Array(n).fill(0);for(let r=n-1;r>=0;r--){let s=M[r][n];for(let k=r+1;k<n;k++)s-=M[r][k]*x[k];x[r]=s/(M[r][r]||1e-12);}return x;}
  function inv(H){const n=H.length;return H.map((_,j)=>solve(H,H.map((__,i)=>i===j?1:0))).reduce((acc,col,j)=>{col.forEach((v,i)=>{acc[i][j]=v});return acc},H.map(()=>new Array(n).fill(0)));}
  // Bradley-Terry by Newton's method on rows (i, j, y, w, z[]):
  // logit P = ln10*(r_i - r_j) + z.gamma ; ridge 'reg' on all parameters (FastChat uses 0.5 with style control, none without);
  // a tiny ridge (1e-6) fixes the free shift when reg = 0. Returns ratings (log10 units), gamma, and the sandwich covariance.
  function fit(rows,m,k,reg){
    reg=reg||0;const P=m+k,lam=reg>0?reg:1e-6;let x=new Array(P).fill(0);
    let H,g;
    for(let it=0;it<30;it++){
      H=Array.from({length:P},()=>new Array(P).fill(0));g=new Array(P).fill(0);
      for(let t=0;t<P;t++){g[t]=lam*x[t];H[t][t]+=lam}
      for(const r of rows){
        let s=LN10*(x[r.i]-x[r.j]);for(let q=0;q<k;q++)s+=r.z[q]*x[m+q];
        const p=1/(1+Math.exp(-s)),e=(p-r.y)*r.w,h=p*(1-p)*r.w;
        const idx=[r.i,r.j],val=[LN10,-LN10];for(let q=0;q<k;q++){idx.push(m+q);val.push(r.z[q])}
        for(let a=0;a<idx.length;a++){g[idx[a]]+=e*val[a];for(let b=0;b<idx.length;b++)H[idx[a]][idx[b]]+=h*val[a]*val[b];}
      }
      const d=solve(H,g);let mx=0;for(let t=0;t<P;t++){x[t]-=d[t];mx=Math.max(mx,Math.abs(d[t]))}
      if(mx<1e-10)break;
    }
    // sandwich: H^-1 B H^-1 with B the summed outer products of per-vote gradients
    const B=Array.from({length:P},()=>new Array(P).fill(0));
    for(const r of rows){let s=LN10*(x[r.i]-x[r.j]);for(let q=0;q<k;q++)s+=r.z[q]*x[m+q];
      const p=1/(1+Math.exp(-s)),e=(p-r.y);const idx=[r.i,r.j],val=[LN10,-LN10];for(let q=0;q<k;q++){idx.push(m+q);val.push(r.z[q])}
      for(let a=0;a<idx.length;a++)for(let b=0;b<idx.length;b++)B[idx[a]][idx[b]]+=r.w*e*e*val[a]*val[b];}
    // with no ridge the shift is unidentified: add 11' on the rating block (fixes the sum, leaves the centred covariance unchanged)
    if(!(reg>0))for(let a=0;a<m;a++)for(let b=0;b<m;b++)H[a][b]+=1;
    const Hi=inv(H);const V=Hi.map(row=>Hi[0].map((_,j)=>{let s=0;for(let a=0;a<P;a++){let t=0;for(let b=0;b<P;b++)t+=B[a][b]*Hi[b][j];s+=row[a]*t}return s}));
    // ratings are only identified up to a shift: report the covariance of the centred ratings (C V C, C = I - 11'/m)
    const rm=[...Array(m).keys()].map(i=>{let t=0;for(let j=0;j<m;j++)t+=V[i][j];return t/m});const gm=rm.reduce((a,b)=>a+b,0)/m;
    for(let i=0;i<m;i++)for(let j=0;j<m;j++)V[i][j]=V[i][j]-rm[i]-rm[j]+gm;
    return {r:x.slice(0,m),gamma:x.slice(m),V};
  }
  // rows for a set of vote indices. style: array of feature ids to include (0 tokens, 1 headers, 2 lists, 3 bold), standardised over the votes used.
  // ties: 'half' (FastChat) or 'drop'
  function rowsFor(D,idx,style,ties){
    style=style||[];const Z=style.map(f=>{let s=0,s2=0;for(const i of idx){s+=D.F[f][i];s2+=D.F[f][i]*D.F[f][i]}const mu=s/idx.length,sd=Math.sqrt(Math.max(1e-12,s2/idx.length-mu*mu));return {f,mu,sd}});
    const rows=[];
    if(!style.length){ // aggregate identical (pair, outcome) rows, as FastChat does
      const agg=new Map();for(const i of idx){const y=score(D.O[i]);if(ties==='drop'&&y===0.5)continue;const key=D.A[i]+','+D.B[i]+','+y;agg.set(key,(agg.get(key)||0)+1)}
      agg.forEach((w,key)=>{const [i,j,y]=key.split(',').map(Number);rows.push({i,j,y,w,z:[]})});
    } else for(const i of idx){const y=score(D.O[i]);if(ties==='drop'&&y===0.5)continue;rows.push({i:D.A[i],j:D.B[i],y,w:1,z:Z.map(o=>(D.F[o.f][i]-o.mu)/o.sd)})}
    return rows;
  }
  // online Elo over votes in the given order (FastChat compute_elo: K=4, base 10, scale 400, init 1000)
  function elo(D,order,K,upto){K=K||4;const R=new Array(D.m).fill(1000);const n=upto==null?order.length:upto;
    for(let t=0;t<n;t++){const i=order[t],a=D.A[i],b=D.B[i];const ea=1/(1+Math.pow(10,(R[b]-R[a])/400));const sa=score(D.O[i]);R[a]+=K*(sa-ea);R[b]-=K*(sa-ea)}return R;}
  // seeded shuffle (mulberry32)
  function rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function shuffled(n,seed){const r=rng(seed),o=[...Array(n).keys()];for(let i=n-1;i>0;i--){const j=Math.floor(r()*(i+1));[o[i],o[j]]=[o[j],o[i]]}return o}
  // ratings in Elo-like points: 400*r, centred to a given mean
  function points(r,mean){const p=r.map(v=>400*v);const mu=p.reduce((s,v)=>s+v,0)/p.length;return p.map(v=>v-mu+(mean==null?1000:mean))}
  // rank spread with Arena's rule over a list of [lo,hi]
  function spread(L){return L.map(([lo,hi],i)=>{let b=1,w=1;L.forEach(([l2,h2],j)=>{if(j===i)return;if(l2>hi)b++;if(h2>lo)w++});return [b,w]})}
  // Spearman correlation with average ranks for ties
  function ranks(v){const o=v.map((x,i)=>[x,i]).sort((a,b)=>a[0]-b[0]);const r=new Array(v.length);let i=0;while(i<o.length){let j=i;while(j+1<o.length&&o[j+1][0]===o[i][0])j++;for(let k=i;k<=j;k++)r[o[k][1]]=(i+j)/2+1;i=j+1}return r}
  function spearman(x,y){const a=ranks(x),b=ranks(y),n=a.length,ma=a.reduce((s,v)=>s+v,0)/n,mb=b.reduce((s,v)=>s+v,0)/n;let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){sxy+=(a[i]-ma)*(b[i]-mb);sxx+=(a[i]-ma)**2;syy+=(b[i]-mb)**2}return sxy/Math.sqrt(sxx*syy)}
  // E[max of N standard normals] by numerical integration of N*x*phi(x)*Phi(x)^(N-1)
  function Phi(x){const t=1/(1+0.2316419*Math.abs(x)),d=0.3989422804014327*Math.exp(-x*x/2);const p=d*t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));return x>0?1-p:p}
  function emax(N){if(N<=1)return 0;let s=0;const h=0.002;for(let x=-8;x<=8;x+=h){const ph=0.3989422804014327*Math.exp(-x*x/2);s+=x*N*ph*Math.pow(Phi(x),N-1)*h}return s}
  return {decode,score,fit,rowsFor,elo,shuffled,points,spread,spearman,emax,Phi,LN10};
})();
