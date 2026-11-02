// ---- The rounding engine: one fp32 master weight, its bf16 export after every step, three export rules ----
// Real arithmetic on float32 bit patterns, the same operations as the paper's code (faircast/cast.py):
//   round-to-nearest  = torch's .to(bfloat16): round half to even on the low 16 bits;
//   stochastic        = add 16 uniformly random bits to the fp32 pattern, then truncate (sr_cast_bf16);
//   error feedback    = q_t = round(theta_t + r_{t-1}), r_t = theta_t + r_{t-1} - q_t (ef_cast_bf16).
// The same file runs in the page and in node (src/check_sim.mjs), so the page and the checks share one engine.
(function(root){
  const f32=new Float32Array(1),u32=new Uint32Array(f32.buffer);
  const fr=Math.fround;
  function rtn(x){f32[0]=x;const b=u32[0];if((b&0x7f800000)===0x7f800000)return f32[0];u32[0]=((b+0x7fff+((b>>>16)&1))>>>0)&0xffff0000;return f32[0]}
  function sr(x,r16){f32[0]=x;u32[0]=((u32[0]+r16)>>>0)&0xffff0000;return f32[0]}
  // the bf16 grid spacing at w: 2^(floor(log2|w|) - 7)
  function gap(w){f32[0]=Math.abs(w);const e=((u32[0]>>>23)&0xff)-127;return Math.pow(2,e-7)}
  function rng(seed){let a=seed>>>0;return function(){a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  // o = {w0, eta, drift, noise, T, seed, reps}: the per-step update is eta * (drift + noise * z_t), z_t standard normal
  function run(o){
    const T=o.T,R=o.reps||256,g=rng(o.seed||1),gs=rng((o.seed||1)*7919+13);
    const w0=rtn(o.w0),u=gap(w0);
    const th=new Float64Array(T+1),qn=new Float64Array(T+1),qs=new Float64Array(T+1),qe=new Float64Array(T+1),qm=new Float64Array(T+1);
    let t32=w0,res=0;const reps=new Float32Array(R);
    th[0]=qn[0]=qs[0]=qe[0]=qm[0]=w0;
    const ch={n:0,s:0,e:0},first={n:-1,s:-1,e:-1};
    for(let t=1;t<=T;t++){
      let z=0;if(o.noise){const a=g()||1e-12,b=g();z=Math.sqrt(-2*Math.log(a))*Math.cos(2*Math.PI*b)}
      t32=fr(t32+fr(o.eta*(o.drift+o.noise*z)));th[t]=t32;
      qn[t]=rtn(t32);
      qs[t]=sr(t32,Math.floor(gs()*65536));
      const v=fr(t32+res);qe[t]=rtn(v);res=fr(v-qe[t]);
      let m=0;for(let i=0;i<R;i++)m+=sr(t32,Math.floor(gs()*65536));qm[t]=m/R;
      for(const [k,a] of [['n',qn],['s',qs],['e',qe]])if(a[t]!==a[t-1]){ch[k]++;if(first[k]<0)first[k]=t}
    }
    return {w0,u,th,qn,qs,qe,qm,ch,first,T,meanStep:o.eta*o.drift};
  }
  root.FCSIM={rtn,sr,gap,run,rng};
})(typeof window!=='undefined'?window:globalThis);
