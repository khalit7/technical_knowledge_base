// ---- IT: the page's maths, pure functions (checked against src/recompute.py by src/check_js.mjs) ----
window.IT=(function(){
  const LN2=Math.log(2);
  const lg=(x,b)=>b===2?Math.log2(x):Math.log(x);
  // entropy, cross-entropy, KL in base b (2 or e); terms with p = 0 contribute 0
  const H=(p,b)=>{let s=0;for(const x of p)if(x>0)s-=x*lg(x,b);return s};
  const CE=(p,q,b)=>{let s=0;for(let i=0;i<p.length;i++)if(p[i]>0)s-=p[i]*(q[i]>0?lg(q[i],b):-Infinity);return s};
  const KL=(p,q,b)=>{let s=0;for(let i=0;i<p.length;i++)if(p[i]>0)s+=p[i]*(q[i]>0?lg(p[i]/q[i],b):Infinity);return s};
  const JS=(p,q,b)=>{const m=p.map((x,i)=>(x+q[i])/2);return KL(p,m,b)/2+KL(q,m,b)/2};
  const TV=(p,q)=>p.reduce((s,x,i)=>s+Math.abs(x-q[i]),0)/2;
  const chi2=(p,q)=>p.reduce((s,x,i)=>s+(q[i]>0?(x-q[i])**2/q[i]:(x>0?Infinity:0)),0);
  const hell2=(p,q)=>p.reduce((s,x,i)=>s+(Math.sqrt(x)-Math.sqrt(q[i]))**2,0);
  const softmax=z=>{const m=Math.max(...z),e=z.map(v=>Math.exp(v-m)),s=e.reduce((a,b)=>a+b,0);return e.map(v=>v/s)};
  // Huffman code lengths (ties broken by creation order, as heapq does in recompute.py)
  function huffman(p){
    const n=p.length;if(n===1)return {len:[1],code:['0']};
    let heap=p.map((w,i)=>({w,id:i,sym:[[i,'']]}));let c=n;
    const pop=()=>{let k=0;for(let i=1;i<heap.length;i++){if(heap[i].w<heap[k].w||(heap[i].w===heap[k].w&&heap[i].id<heap[k].id))k=i}return heap.splice(k,1)[0]};
    while(heap.length>1){const a=pop(),b=pop();
      heap.push({w:a.w+b.w,id:c++,sym:a.sym.map(([s,v])=>[s,'0'+v]).concat(b.sym.map(([s,v])=>[s,'1'+v]))})}
    const code=new Array(n);heap[0].sym.forEach(([s,v])=>code[s]=v);
    return {len:code.map(v=>v.length),code};
  }
  // mulberry32, identical to the Python port in recompute.py
  function mulberry32(a){a=a>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return ((t^(t>>>14))>>>0)/4294967296}}
  const gauss=r=>{const u1=r(),u2=r();return Math.sqrt(-2*Math.log(1-u1))*Math.cos(2*Math.PI*u2)};
  // InfoNCE estimate ln N - L with the optimal critic log p(y|x) - log p(y), correlated Gaussians
  function infonce(rho,N,pairs,seed){
    const r=mulberry32(seed===undefined?7:seed),c=Math.sqrt(1-rho*rho);let tot=0,cnt=0;
    const B=Math.max(1,Math.floor((pairs||2048)/N));
    for(let b=0;b<B;b++){const xs=new Float64Array(N),ys=new Float64Array(N);
      for(let i=0;i<N;i++){const x=gauss(r);const y=rho*x+c*gauss(r);xs[i]=x;ys[i]=y}
      const f=new Float64Array(N);
      for(let i=0;i<N;i++){let m=-Infinity;for(let j=0;j<N;j++){const d=ys[j]-rho*xs[i];f[j]=-d*d/(2*c*c)+ys[j]*ys[j]/2;if(f[j]>m)m=f[j]}
        let s=0;for(let j=0;j<N;j++)s+=Math.exp(f[j]-m);tot+=f[i]-(m+Math.log(s))+Math.log(N);cnt++}}
    return tot/cnt;
  }
  // plug-in entropy (nats) of a uniform m-outcome source from N samples, averaged over reps; with Miller-Madow
  function pluginSim(m,N,reps,seed){
    const r=mulberry32(seed===undefined?11:seed);let tot=0,tmm=0;
    for(let k=0;k<(reps||200);k++){const c=new Array(m).fill(0);for(let i=0;i<N;i++)c[Math.floor(r()*m)]++;
      let h=0,seen=0;for(const v of c)if(v){h-=v/N*Math.log(v/N);seen++}tot+=h;tmm+=h+(seen-1)/(2*N)}
    return [tot/(reps||200),tmm/(reps||200)];
  }
  // plug-in mutual information (nats) of two independent uniform m-valued variables
  function miSim(m,N,reps,seed){
    const r=mulberry32(seed===undefined?13:seed);let tot=0;
    for(let k=0;k<(reps||200);k++){const c=new Map(),cx=new Array(m).fill(0),cy=new Array(m).fill(0);
      for(let i=0;i<N;i++){const x=Math.floor(r()*m),y=Math.floor(r()*m),key=x*m+y;c.set(key,(c.get(key)||0)+1);cx[x]++;cy[y]++}
      let s=0;for(const [key,v] of c){const x=Math.floor(key/m),y=key%m;s+=v/N*Math.log(v*N/(cx[x]*cy[y]))}tot+=s}
    return tot/(reps||200);
  }
  // one Gaussian fitted to 0.5 N(-2,0.6^2) + 0.5 N(2,0.6^2) by gradient descent on forward or reverse KL (grid)
  const GX=[];for(let i=0;i<=800;i++)GX.push(-8+0.02*i);const DX=0.02;
  const npdf=(x,m,s)=>Math.exp(-(x-m)*(x-m)/(2*s*s))/(s*Math.sqrt(2*Math.PI));
  const MIX=GX.map(x=>0.5*npdf(x,-2,0.6)+0.5*npdf(x,2,0.6));
  const qg=(m,ls)=>{const s=Math.exp(ls);return GX.map(x=>Math.max(npdf(x,m,s),1e-300))};
  function klGrid(a,b){let s=0;for(let i=0;i<a.length;i++)if(a[i]>1e-300&&b[i]>0)s+=a[i]*Math.log(a[i]/b[i])*DX;return s}
  function fit(dir,steps){
    let m=1.0,ls=0.0;const traj=[[m,Math.exp(ls)]],lr=0.1,e=1e-4;
    const obj=(m,ls)=>{const q=qg(m,ls);return dir==='fwd'?klGrid(MIX,q):klGrid(q,MIX)};
    for(let k=0;k<(steps||200);k++){const gm=(obj(m+e,ls)-obj(m-e,ls))/(2*e),gs=(obj(m,ls+e)-obj(m,ls-e))/(2*e);m-=lr*gm;ls-=lr*gs;traj.push([m,Math.exp(ls)])}
    return traj;
  }
  const kls=(m,s)=>{const q=qg(m,Math.log(s));return [klGrid(MIX,q),klGrid(q,MIX)]};
  const valley=(m,s)=>{let t=0;for(const x of GX)if(Math.abs(x)<0.5)t+=npdf(x,m,s)*DX;return t};
  // KL-regularised optimum pi* = ref * exp(r / beta) / Z
  function rlopt(ref,rew,beta){const w=ref.map((a,i)=>a*Math.exp(rew[i]/beta));const Z=w.reduce((a,b)=>a+b,0);const pi=w.map(v=>v/Z);
    const ER=pi.reduce((s,v,i)=>s+v*rew[i],0),K=KL(pi,ref,Math.E);return {pi,Z,ER,KL:K,obj:ER-beta*K}}
  return {LN2,H,CE,KL,JS,TV,chi2,hell2,softmax,huffman,mulberry32,gauss,infonce,pluginSim,miSim,GX,MIX,npdf,fit,kls,valley,rlopt};
})();
