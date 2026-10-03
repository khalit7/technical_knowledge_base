// ---- Number formats and quantisers: an exact port of src/qformats.py (check_js.mjs compares the two) ----
window.QF=(function(){
  // name: [exponent bits, mantissa bits, bias, max finite, has infinities]
  const FL={fp32:[8,23,127,3.4028234663852886e38,1],tf32:[8,10,127,3.4011621342146535e38,1],bf16:[8,7,127,3.3895313892515355e38,1],
    fp16:[5,10,15,65504,1],e4m3:[4,3,7,448,0],e5m2:[5,2,15,57344,1],e2m1:[2,1,1,6,0]};
  const NF4=[-1.0,-0.6961928009986877,-0.5250730514526367,-0.39491748809814453,-0.28444138169288635,-0.18477343022823334,-0.09105003625154495,0.0,
    0.07958029955625534,0.16093020141124725,0.24611230194568634,0.33791524171829224,0.44070982933044434,0.5626170039176941,0.7229568362236023,1.0];
  // round half to even, as NumPy's np.round
  function rne(x){const f=Math.floor(x),d=x-f;if(d>0.5)return f+1;if(d<0.5)return f;return (f%2===0)?f:f+1}
  // round to nearest representable value of a minifloat, subnormals included, saturating at max finite
  function rf(x,fmt){const p=FL[fmt],m=p[1],emin=1-p[2];const a=Math.abs(x);if(a===0)return 0;
    let e=Math.floor(Math.log2(a));if(e<emin)e=emin;const st=Math.pow(2,e-m);let q=rne(a/st)*st;if(q>p[3])q=p[3];return x<0?-q:q}
  // same, but report what the hardware conversion does past max: overflow to infinity where the format has one
  function rfInf(x,fmt){const p=FL[fmt];const r=rf(x,fmt);if(p[4]){const a=Math.abs(x),e=Math.floor(Math.log2(p[3]));
      const half=Math.pow(2,e-p[1]-1);if(a>=p[3]+half)return x<0?-Infinity:Infinity}return r}
  function qint(v,bits,sym){ // v: array (one group); returns dequantised copy
    const out=new Array(v.length);
    if(sym){const qm=Math.pow(2,bits-1)-1;let am=0;for(const x of v)am=Math.max(am,Math.abs(x));let s=am/qm;if(s===0)s=1;
      for(let i=0;i<v.length;i++)out[i]=Math.max(-qm,Math.min(qm,rne(v[i]/s)))*s;return out}
    const qm=Math.pow(2,bits)-1;let lo=0,hi=0;for(const x of v){lo=Math.min(lo,x);hi=Math.max(hi,x)}let s=(hi-lo)/qm;if(s===0)s=1;const z=rne(-lo/s);
    for(let i=0;i<v.length;i++)out[i]=(Math.max(0,Math.min(qm,rne(v[i]/s)+z))-z)*s;return out}
  // quantise one group v under a block format; ctx.tensorAmax for per-tensor or NVFP4 tensor scale
  function qgroup(v,kind,ctx){
    let am=0;for(const x of v)am=Math.max(am,Math.abs(x));
    const info={amax:am};
    if(kind==='int8'||kind==='int4'){const b=kind==='int8'?8:4,qm=Math.pow(2,b-1)-1;const A=ctx&&ctx.amax!=null?ctx.amax:am;let s=A/qm;if(s===0)s=1;
      info.scale=s;info.grid=[];for(let k=-qm;k<=qm;k++)info.grid.push(k*s);
      return {q:v.map(x=>Math.max(-qm,Math.min(qm,rne(x/s)))*s),info}}
    if(kind==='int4a'){const q=qint(v,4,false);return {q,info}}
    if(kind==='e4m3'){const A=ctx&&ctx.amax!=null?ctx.amax:am;let s=A/448;if(s===0)s=1;info.scale=s;return {q:v.map(x=>rf(x/s,'e4m3')*s),info}}
    if(kind==='nf4'){let s=am;if(s===0)s=1;info.scale=s;info.grid=NF4.map(c=>c*s);
      return {q:v.map(x=>{const t=x/s;let b=0,bd=9;for(let k=0;k<16;k++){const d=Math.abs(t-NF4[k]);if(d<bd){bd=d;b=k}}return NF4[b]*s}),info}}
    if(kind==='mxfp4'||kind==='mxfp8'){const el=kind==='mxfp4'?'e2m1':'e4m3',emax=kind==='mxfp4'?2:8;const a=am===0?Math.pow(2,-127):am;
      const X=Math.pow(2,Math.floor(Math.log2(a))-emax);info.scale=X;info.grid=e2m1Grid().map(c=>c*X);
      info.clipped=v.filter(x=>Math.abs(x/X)>FL[el][3]*1.0000001).length;return {q:v.map(x=>rf(x/X,el)*X),info}}
    if(kind==='nvfp4'){const st=ctx.tensorAmax/(448*6);let sb=rf(am/6/st,'e4m3');if(sb===0)sb=1;const s=sb*st;info.scale=s;info.sb=sb;info.st=st;
      info.grid=e2m1Grid().map(c=>c*s);return {q:v.map(x=>rf(x/s,'e2m1')*s),info}}
    throw new Error('kind '+kind)}
  function e2m1Grid(){const p=[0,0.5,1,1.5,2,3,4,6];return p.slice(1).reverse().map(x=>-x).concat(p)}
  // decode helpers for the shipped data
  function b64(s){const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}
  function bf16(s){const u=new Uint16Array(b64(s)),f=new Float32Array(1),i32=new Uint32Array(f.buffer),o=new Array(u.length);
    for(let i=0;i<u.length;i++){i32[0]=u[i]<<16;o[i]=f[0]}return o}
  function f32(s){return Array.from(new Float32Array(b64(s)))}
  const relerr=(q,v)=>{let n=0,d=0;for(let i=0;i<v.length;i++){n+=(q[i]-v[i])**2;d+=v[i]**2}return Math.sqrt(n/d)};
  return {FL,NF4,rne,rf,rfInf,qint,qgroup,e2m1Grid,bf16,f32,relerr};
})();
