// ---- FP: exact emulation of the floating-point formats on this page (shared by Reading, Float explorer, Summation lab) ----
// Every format is (exponent bits e, mantissa bits m, bias, kind). kind "ieee": top exponent field holds inf and NaN (fp64, fp32, tf32, bf16, fp16, E5M2).
// kind "fn" (OFP8 E4M3): no infinities, the top exponent is used for numbers except S.1111.111, the single NaN pattern.
// Rounding is round-to-nearest, ties to even, with subnormals (gradual underflow), as IEEE 754 and the OFP8 spec require.
// A double holds every value of these formats exactly, and x / 2^k is exact, so the arithmetic below is exact (checked against ml_dtypes by recompute.py).
window.FP=(function(){
  const mk=(id,name,e,m,bias,kind)=>{
    const emin=1-bias, emax=kind==='fn'?(2**e-1-bias):(2**e-2-bias);
    const max=kind==='fn'?(2-2**-(m-1))*2**emax:(2-2**-m)*2**emax;
    return {id,name,e,m,bias,kind,emin,emax,max,minNormal:2**emin,minSub:2**(emin-m),eps:2**-m,u:2**-(m+1),bits:1+e+m,sat:false};
  };
  const F={
    fp64:mk('fp64','float64',11,52,1023,'ieee'),
    fp32:mk('fp32','float32',8,23,127,'ieee'),
    tf32:mk('tf32','TF32',8,10,127,'ieee'),
    bf16:mk('bf16','bfloat16',8,7,127,'ieee'),
    fp16:mk('fp16','float16',5,10,15,'ieee'),
    e5m2:mk('e5m2','FP8 E5M2',5,2,15,'ieee'),
    e4m3:mk('e4m3','FP8 E4M3',4,3,7,'fn')
  };
  // exponent of the binade holding a > 0: 2^E <= a < 2^(E+1)
  function ilog2(a){let E=Math.floor(Math.log2(a));if(2**E>a)E--;else if(2**(E+1)<=a)E++;return E}
  // round a double to format f (opt.sat: saturate instead of inf/NaN on overflow)
  function rnd(x,f,opt){
    if(typeof f==='string')f=F[f];
    if(Number.isNaN(x))return NaN;
    if(f.id==='fp64')return x;
    const neg=x<0||Object.is(x,-0);let a=Math.abs(x);
    const sat=opt&&opt.sat!==undefined?opt.sat:f.sat;
    if(a===Infinity)return f.kind==='ieee'?(neg?-Infinity:Infinity):(sat?(neg?-f.max:f.max):NaN);
    if(a===0)return neg?-0:0;
    if(f.id==='fp32'){const r=Math.fround(a);return neg?-r:r}
    let E=ilog2(a);if(E<f.emin)E=f.emin;
    const q=2**(E-f.m);const n=a/q;let k=Math.floor(n);const r=n-k;
    if(r>0.5||(r===0.5&&k%2===1))k+=1;
    let v=k*q;
    if(v>f.max){if(f.kind==='ieee'&&!sat)v=Infinity;else if(sat)v=f.max;else return NaN}
    return neg?-v:v;
  }
  // classify a representable value
  function cls(v,f){if(typeof f==='string')f=F[f];if(Number.isNaN(v))return 'NaN';if(Math.abs(v)===Infinity)return 'infinity';if(v===0)return 'zero';
    return Math.abs(v)<f.minNormal?'subnormal':'normal'}
  // fields of a representable value: {s, ef (stored exponent field), mf (stored mantissa field), E (true exponent), bits (string)}
  function enc(v,f){
    if(typeof f==='string')f=F[f];
    if(f.id==='fp64'){const dv=new DataView(new ArrayBuffer(8));dv.setFloat64(0,v);const b=dv.getBigUint64(0).toString(2).padStart(64,'0');
      const ef=parseInt(b.slice(1,12),2);return {s:+b[0],ef,mf:BigInt('0b'+b.slice(12)),E:ef===0?f.emin:ef-f.bias,bits:b,c:cls(v,f)}}
    const s=(v<0||Object.is(v,-0))?1:0;let ef,mf;const top=2**f.e-1;
    if(Number.isNaN(v)){ef=top;mf=f.kind==='fn'?2**f.m-1:2**(f.m-1)}
    else if(Math.abs(v)===Infinity){ef=top;mf=0}
    else{const a=Math.abs(v);
      if(a===0){ef=0;mf=0}
      else if(a<f.minNormal){ef=0;mf=Math.round(a/f.minSub)}
      else{const E=ilog2(a);ef=E+f.bias;mf=Math.round(a/2**(E-f.m))-2**f.m}}
    const bits=String(s)+ef.toString(2).padStart(f.e,'0')+mf.toString(2).padStart(f.m,'0');
    return {s,ef,mf,E:ef===0?f.emin:ef-f.bias,bits,c:cls(v,f)};
  }
  // value of a bit string in format f
  function dec(bits,f){
    if(typeof f==='string')f=F[f];
    if(f.id==='fp64'){const dv=new DataView(new ArrayBuffer(8));dv.setBigUint64(0,BigInt('0b'+bits));return dv.getFloat64(0)}
    const s=bits[0]==='1'?-1:1,ef=parseInt(bits.slice(1,1+f.e),2),mf=parseInt(bits.slice(1+f.e),2),top=2**f.e-1;
    if(ef===top&&f.kind==='ieee')return mf===0?s*Infinity:NaN;
    if(ef===top&&f.kind==='fn'&&mf===2**f.m-1)return NaN;
    if(ef===0)return s*mf*f.minSub;
    return s*(1+mf/2**f.m)*2**(ef-f.bias);
  }
  // spacing of representable numbers around a finite x (one unit in the last place)
  function ulp(x,f){if(typeof f==='string')f=F[f];const a=Math.abs(x);if(!isFinite(a))return NaN;if(a<f.minNormal)return f.minSub;return 2**(Math.max(ilog2(a),f.emin)-f.m)}
  // neighbours of a representable value: next toward +inf and toward -inf (NaN stays NaN)
  function step(v,f,dir){
    if(typeof f==='string')f=F[f];if(Number.isNaN(v))return NaN;
    if(v===0)return dir>0?f.minSub:-f.minSub;
    if(Math.abs(v)===Infinity)return (v>0)===(dir>0)?v:(v>0?f.max:-f.max);
    const a=Math.abs(v),up=(v>0)===(dir>0);
    if(up){if(a===f.max)return f.kind==='ieee'?(v>0?Infinity:-Infinity):NaN;return Math.sign(v)*(a+ulp(a,f))}
    // going down in magnitude: at an exact power of two the spacing below is half
    let d=ulp(a,f);if(a>=f.minNormal&&a===2**ilog2(a)&&ilog2(a)>f.emin)d=d/2;
    const r=a-d;return r===0?(v>0?0:-0):Math.sign(v)*r;
  }
  // one rounded operation in format f
  const add=(a,b,f)=>rnd(a+b,f),sub=(a,b,f)=>rnd(a-b,f),mul=(a,b,f)=>rnd(a*b,f),div=(a,b,f)=>rnd(a/b,f);
  const exp=(a,f)=>rnd(Math.exp(a),f),log=(a,f)=>rnd(Math.log(a),f);
  // short display of a number
  function show(v,sig){sig=sig||8;if(Number.isNaN(v))return 'NaN';if(v===Infinity)return 'inf';if(v===-Infinity)return '−inf';
    if(Object.is(v,-0))return '−0';if(v===0)return '0';const a=Math.abs(v);let s;
    if(a>=1e-4&&a<1e7){s=String(+v.toPrecision(sig))}else{s=v.toExponential(Math.max(0,sig-1)).replace(/\.?0+e/,'e').replace('e+','e')}
    return s.replace(/^-/,'−')}
  // exact sum of doubles (Shewchuk's partials, as Python's math.fsum)
  function fsum(xs){const p=[];for(let x of xs){let i=0;for(let y of p){if(Math.abs(x)<Math.abs(y)){const t=x;x=y;y=t}const hi=x+y,lo=y-(hi-x);if(lo!==0)p[i++]=lo;x=hi}p.length=i;p.push(x)}
    let hi=0,lo=0;if(p.length){hi=p.pop();while(p.length){const x=hi,y=p.pop();hi=x+y;const yr=hi-x;lo=y-yr;if(lo!==0)break}
      if(p.length&&((lo<0&&p[p.length-1]<0)||(lo>0&&p[p.length-1]>0))){const y=lo*2,x=hi+y,yr=x-hi;if(y===yr)hi=x}}
    return hi}
  // seeded generator (mulberry32), same in recompute.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  return {F,rnd,enc,dec,cls,ulp,step,add,sub,mul,div,exp,log,show,ilog2,fsum,rng};
})();

// bits as coloured cells: sign, exponent, mantissa (o.flip: clickable, o.sm: small, o.hl: index to outline)
FP.bitsHTML=function(bits,f,o){f=typeof f==='string'?FP.F[f]:f;o=o||{};let h='<div class="bits'+(o.flip?' flip':'')+(o.sm?' sm':'')+'" aria-label="bits '+bits+'">';
  for(let i=0;i<bits.length;i++){const c=i===0?'s':(i<=f.e?'e':'m');h+='<span class="b '+c+' '+(bits[i]==='1'?'one':'zero')+'" data-i="'+i+'"'+(o.flip?' role="button" tabindex="0" title="flip bit '+i+'"':'')+'>'+bits[i]+'</span>';
    if(i===0||i===f.e)h+='<span class="gap"></span>'}
  return h+'</div>'};
