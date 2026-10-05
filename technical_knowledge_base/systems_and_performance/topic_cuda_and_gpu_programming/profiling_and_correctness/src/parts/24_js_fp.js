// ---- Floating-point model shared by the Reading tab and the Numerics lab (window.FP) ----
// round(x, fmt): round a double to a format with round-to-nearest-even, subnormals, and the overflow rule
// of each format. Checked against PyTorch's own casts by check/check_js.mjs (code/reference.py).
window.FP=(function(){
  const F={
    fp32:{name:'float32',m:23,emin:-126,max:3.4028234663852886e38,ovf:'inf'},
    tf32:{name:'TF32',m:10,emin:-126,max:3.4011621342146535e38,ovf:'inf'},
    bf16:{name:'bfloat16',m:7,emin:-126,max:3.3895313892515355e38,ovf:'inf'},
    fp16:{name:'float16',m:10,emin:-14,max:65504,ovf:'inf'},
    e4m3:{name:'float8 e4m3fn',m:3,emin:-6,max:448,ovf:'sat'},
    e5m2:{name:'float8 e5m2',m:2,emin:-14,max:57344,ovf:'inf'}
  };
  function rne(v){const f=Math.floor(v),d=v-f;if(d>0.5)return f+1;if(d<0.5)return f;return (f%2===0)?f:f+1}
  function round(x,k){
    if(k==='fp32')return Math.fround(x);
    if(k==='fp64'||x===0||!isFinite(x))return x;
    const f=F[k],a=Math.abs(x);
    let e=Math.floor(Math.log2(a));if(Math.pow(2,e)>a)e--;else if(Math.pow(2,e+1)<=a)e++;
    if(e<f.emin)e=f.emin;
    const q=Math.pow(2,e-f.m);let r=rne(a/q)*q;
    if(r>f.max){
      // IEEE formats: overflow to infinity once the value rounds past max; e4m3fn has no infinity and PyTorch's cast saturates it to 448 (measured, out/numerics.json)
      if(f.ovf==='sat')r=f.max;else{const lim=f.max+Math.pow(2,Math.floor(Math.log2(f.max))-f.m-1);r=a>=lim?Infinity:f.max}
    }
    return x<0?-r:r;
  }
  const eps=k=>k==='fp64'?Math.pow(2,-52):Math.pow(2,-F[k].m);
  // deterministic PRNG (mulberry32) and Box-Muller normals, mirrored exactly in code/reference.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  function gauss(r){let u=r();if(u<1e-300)u=1e-300;const v=r();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)}
  // exact sum of doubles (Shewchuk / Python math.fsum algorithm)
  function fsum(xs){const p=[];for(let x of xs){let i=0;for(let y of p){if(Math.abs(x)<Math.abs(y)){const t=x;x=y;y=t}const hi=x+y,lo=y-(hi-x);if(lo!==0)p[i++]=lo;x=hi}p.length=i;p.push(x)}
    let n=p.length,hi=0;if(n>0){hi=p[--n];while(n>0){const x=hi,y=p[--n];hi=x+y;const lo=y-(hi-x);if(lo!==0){
      if(n>0&&((lo<0&&p[n-1]<0)||(lo>0&&p[n-1]>0))){const y2=lo*2,x2=hi+y2,yr=x2-hi;if(y2===yr)hi=x2}break}}}return hi}
  // one dot product of length K. inputs rounded to fin; products exact in double then rounded to the accumulator;
  // acc: 'seq' (one running sum, rounded to fa after each add), 'pair' (pairwise tree in fa), 'split' (S chunks summed
  // sequentially in fa, then the S partials summed sequentially); output rounded to fout.
  function dot(a,b,fin,fa,acc,S,fout){
    const K=a.length,p=new Array(K);for(let i=0;i<K;i++){p[i]=round(round(a[i],fin)*round(b[i],fin),fa)}
    let s;
    if(acc==='pair'){let v=p.slice();while(v.length>1){const w=[];for(let i=0;i+1<v.length;i+=2)w.push(round(v[i]+v[i+1],fa));if(v.length%2)w.push(v[v.length-1]);v=w}s=v[0]}
    else if(acc==='split'){const c=Math.ceil(K/S),parts=[];for(let j=0;j<K;j+=c){let t=0;for(let i=j;i<Math.min(K,j+c);i++)t=round(t+p[i],fa);parts.push(t)}s=0;for(const t of parts)s=round(s+t,fa)}
    else{s=0;for(let i=0;i<K;i++)s=round(s+p[i],fa)}
    return round(s,fout);
  }
  // T trials at length K: errors against the exact dot product of the rounded inputs, divided by sqrt(sum p_i^2);
  // pass = |out - ref| <= atol + rtol*|ref| where ref is the exact result rounded once to fout (assert_close defaults)
  const TOL={fp16:[1e-3,1e-5],bf16:[1.6e-2,1e-5],fp32:[1.3e-6,1e-5]};
  function experiment(o){
    const r=rng(o.seed||1),T=o.trials||64,errs=[];let pass=0;
    for(let t=0;t<T;t++){
      const a=new Array(o.K),b=new Array(o.K);for(let i=0;i<o.K;i++){a[i]=gauss(r);b[i]=gauss(r)}
      const ex=[],sq=[];for(let i=0;i<o.K;i++){const v=round(a[i],o.fin)*round(b[i],o.fin);ex.push(v);sq.push(v*v)}
      const exact=fsum(ex),scale=Math.sqrt(fsum(sq))||1;
      const out=dot(a,b,o.fin,o.fa,o.acc,o.S||1,o.fout);
      errs.push(Math.abs(out-exact)/scale);
      const ref=round(exact,o.fout),tl=TOL[o.fout]||TOL.fp32;
      if(Math.abs(out-ref)<=tl[1]+tl[0]*Math.abs(ref))pass++;
    }
    errs.sort((x,y)=>x-y);
    const q=p=>errs[Math.min(errs.length-1,Math.floor(p*(errs.length-1)+0.5))];
    return {median:q(.5),p90:q(.9),max:errs[errs.length-1],pass,T};
  }
  return {F,round,eps,rng,gauss,fsum,dot,experiment,TOL};
})();
