// ---- FP8 simulator core: a line-by-line port of fp8_sim.py (no DOM). check_fp8.mjs runs it in node against inputs/fp8_sim.json ----
(function(root){
  function rng(a){a|=0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function gauss(r){let s=0;for(let i=0;i<12;i++)s+=r();return s-6}
  function expo(a){let e=Math.floor(Math.log2(a));if(2**e>a)e--;if(2**(e+1)<=a)e++;return e}
  function rhe(x){const f=Math.floor(x),d=x-f;if(d>0.5)return f+1;if(d<0.5)return f;return f%2===0?f:f+1}
  const FMT={e4m3:{man:3,emin:-6,max:448},e5m2:{man:2,emin:-14,max:57344}};
  function q8(x,fmt){if(x===0)return 0;const F=FMT[fmt],s=x<0?-1:1,a=Math.abs(x);if(a>=F.max)return s*F.max;
    const e=Math.max(expo(a),F.emin),ulp=2**(e-F.man);return s*Math.min(rhe(a/ulp)*ulp,F.max)}
  function makeX(seed,T,K,kind,mag){const r=rng(seed),X=[];for(let t=0;t<T;t++){const row=[];for(let c=0;c<K;c++)row.push(gauss(r));X.push(row)}
    if(kind==='channels'){for(let t=0;t<T;t++)for(const c of [37,300])X[t][c]*=mag}
    else if(kind==='tokens'){for(const t of [5,21])for(let c=0;c<K;c++)X[t][c]*=mag}
    return X}
  // quantise with one scale per gr x gc group; also returns each value's code (FP8 value before rescaling) and the group scales
  function quant(M,fmt,gr,gc){const R=M.length,C=M[0].length;gr=gr||R;gc=gc||C;const F=FMT[fmt],FM=F.max,tiny=2**F.emin;
    const out=[],code=[];for(let i=0;i<R;i++){out.push(new Array(C).fill(0));code.push(new Array(C).fill(0))}
    let zeros=0,sub=0;const scales=[];
    for(let i0=0;i0<R;i0+=gr)for(let j0=0;j0<C;j0+=gc){let amax=0;
      for(let i=i0;i<Math.min(R,i0+gr);i++)for(let j=j0;j<Math.min(C,j0+gc);j++)amax=Math.max(amax,Math.abs(M[i][j]));
      const sc=amax>0?amax/FM:1;scales.push({i0,j0,sc,amax});
      for(let i=i0;i<Math.min(R,i0+gr);i++)for(let j=j0;j<Math.min(C,j0+gc);j++){const v=M[i][j]/sc,q=q8(v,fmt);out[i][j]=q*sc;code[i][j]=q;
        if(q===0&&M[i][j]!==0)zeros++;else if(q!==0&&Math.abs(q)<tiny)sub++}}
    return {out,code,zeros,sub,scales}}
  const GROUP={tensor:[0,0],tile:[1,128],block:[128,128]};
  function scalingRun(seed,kind,mag,fmt,mode,T,K){T=T||32;K=K||512;const X=makeX(seed,T,K,kind,mag),g=GROUP[mode],Q=quant(X,fmt,g[0],g[1]);
    const rel=[];for(let t=0;t<T;t++)for(let c=0;c<K;c++)if(X[t][c]!==0)rel.push(Math.abs(Q.out[t][c]-X[t][c])/Math.abs(X[t][c]));
    rel.sort((a,b)=>a-b);return {zeros:Q.zeros,sub:Q.sub,median_rel:rel[Math.floor(rel.length/2)],p90_rel:rel[Math.floor(rel.length*0.9)],n:rel.length,X,Q}}
  const trunc=(x,g)=>Math.trunc(x/g)*g;
  // accumulate products p in groups of 32 (one MMA each); reading 'A' or 'B' as in fp8_sim.py; nc>0 promotes every nc elements.
  // trace(i, acc, hi, lost) is called after each group, for the animation.
  function accumulate(p,reading,nc,bits,trace){bits=bits||14;let acc=0,hi=0,n=0;
    for(let i=0;i<p.length;i+=32){const ch=p.slice(i,i+32);let lost=0,exact=acc;for(const v of ch)exact+=v;
      if(reading==='A'){const es=[];for(const v of ch)if(v!==0)es.push(expo(Math.abs(v)));if(acc!==0)es.push(expo(Math.abs(acc)));
        const g=2**(Math.max(...es)-bits+1);let s=trunc(acc,g);for(const v of ch)s+=trunc(v,g);acc=s}
      else{const es=[];for(const v of ch)if(v!==0)es.push(expo(Math.abs(v)));const g=2**(Math.max(...es)-bits+1);let s=0;for(const v of ch)s+=trunc(v,g);
        const t=acc+s;acc=t!==0?trunc(t,2**(expo(Math.abs(t))-bits+1)):0}
      lost=exact-acc;n+=ch.length;
      if(nc&&n%nc===0){hi+=acc;acc=0}
      if(trace)trace(i+ch.length,acc,hi,lost)}
    return hi+acc}
  function dotInputs(seed,K,dist,fmt){fmt=fmt||'e4m3';const r=rng(seed),p=[];
    for(let k=0;k<K;k++){let a,b;if(dist==='uniform'){a=q8(r(),fmt);b=q8(r(),fmt)}else{a=q8(gauss(r),fmt);b=q8(gauss(r),fmt)}p.push(a*b)}return p}
  function exactSum(p){let s=0;for(const v of p)s+=v;return s} // exact here: products are multiples of 2^-18 and the sums stay below 2^35
  function accRun(seed,K,dist,reading,nc,cols){cols=cols||16;let worst=0,num=0,den=0;
    for(let c=0;c<cols;c++){const p=dotInputs(seed*1000+c,K,dist),ex=exactSum(p),got=accumulate(p,reading,nc);num+=(got-ex)**2;den+=ex*ex;if(ex!==0)worst=Math.max(worst,Math.abs(got-ex)/Math.abs(ex))}
    return dist==='uniform'?worst:Math.sqrt(num/den)}
  root.FP8={rng,gauss,expo,q8,FMT,makeX,quant,GROUP,scalingRun,accumulate,dotInputs,exactSum,accRun};
})(typeof window!=='undefined'?window:globalThis);
