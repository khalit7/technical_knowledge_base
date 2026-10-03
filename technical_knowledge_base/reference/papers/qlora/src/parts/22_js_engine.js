// ---- Engine: 4-bit data types, blockwise quantisation, double quantisation, and the Elo tournament ----
// Pure functions on window.QD (20_data.js); also loaded by check_engine.mjs in node, which compares them with Python.
(function(G){
const QD=G.QD;
// Normal quantile function (Acklam's rational approximation refined by one Halley step; error below 1e-12)
function ncdf(x){const t=1/(1+0.2316419*Math.abs(x)),y=t*(0.319381530+t*(-0.356563782+t*(1.781477937+t*(-1.821255978+t*1.330274429))));let p=1-Math.exp(-x*x/2)/Math.sqrt(2*Math.PI)*y;return x>=0?p:1-p}
function erfc(x){// Numerical Recipes erfcc, fractional error under 1.2e-7, used only for the Halley refinement
  const z=Math.abs(x),t=1/(1+0.5*z),r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));return x>=0?r:2-r}
function qnorm(p){if(p<=0||p>=1)return p<=0?-Infinity:Infinity;
  const a=[-3.969683028665376e+01,2.209460984245205e+02,-2.759285104469687e+02,1.383577518672690e+02,-3.066479806614716e+01,2.506628277459239e+00],
  b=[-5.447609879822406e+01,1.615858368580409e+02,-1.556989798598866e+02,6.680131188771972e+01,-1.328068155288572e+01],
  c=[-7.784894002430293e-03,-3.223964580411365e-01,-2.400758277161838e+00,-2.549732539343734e+00,4.374664141464968e+00,2.938163982698783e+00],
  d=[7.784695709041462e-03,3.224671290700398e-01,2.445134137142996e+00,3.754408661907416e+00],pl=0.02425;let q,r,x;
  if(p<pl){q=Math.sqrt(-2*Math.log(p));x=(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  else if(p<=1-pl){q=p-0.5;r=q*q;x=(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)}
  else{q=Math.sqrt(-2*Math.log(1-p));x=-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  const e=0.5*erfc(-x/Math.SQRT2)-p,u=e*Math.sqrt(2*Math.PI)*Math.exp(x*x/2);return x-u/(1+x*u/2)}
const linspace=(a,b,n)=>Array.from({length:n},(_,i)=>a+(b-a)*i/(n-1));
// NF4 as bitsandbytes builds it (create_normal_map): quantiles at even steps from 0.5 to `offset`, 8 positive, 7 negative, one zero, scaled to [-1, 1]
function nf4(offset){offset=offset||0.9677083;const v1=linspace(offset,0.5,9).slice(0,-1).map(qnorm),v3=linspace(offset,0.5,8).slice(0,-1).map(p=>-qnorm(p));
  const v=v1.concat([0],v3).sort((x,y)=>x-y),m=Math.max(...v);return v.map(x=>x/m)}
// Eq. 4 read literally: q_i = (Q(i/(2^k+1)) + Q((i+1)/(2^k+1))) / 2 for i = 0..2^k-1; the end terms are infinite
function eq4(k){const n=2**k+1;return Array.from({length:2**k},(_,i)=>(qnorm(i/n)+qnorm((i+1)/n))/2)}
// Decoders for the packed weights
function b64bytes(s){const bin=atob(s),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return u}
function f16(h){const s=h>>15,e=(h>>10)&31,f=h&1023;const v=e===0?f*2**-24:e===31?(f?NaN:Infinity):(1+f/1024)*2**(e-15);return s?-v:v}
function decF16(s){const u=b64bytes(s),out=new Float64Array(u.length/2);for(let i=0;i<out.length;i++)out[i]=f16(u[2*i]|(u[2*i+1]<<8));return out}
function decF32(s){const u=b64bytes(s);return Array.from(new Float32Array(u.buffer))}
// Round to nearest code value (codes sorted ascending); returns index
function nearestIdx(code,x){let lo=0,hi=code.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(code[m]<=x)lo=m;else hi=m}return (x-code[lo])<=(code[hi]-x)?lo:hi}
// Blockwise absmax quantisation of x (array) with block size B and code; returns per-element index, value and per-block absmax
function quantise(x,code,B){const n=x.length,nb=Math.ceil(n/B),am=new Float64Array(nb),idx=new Int16Array(n),q=new Float64Array(n);
  for(let b=0;b<nb;b++){let m=0;for(let i=b*B;i<Math.min(n,(b+1)*B);i++)m=Math.max(m,Math.abs(x[i]));am[b]=m||1e-12}
  for(let i=0;i<n;i++){const b=Math.floor(i/B),k=nearestIdx(code,x[i]/am[b]);idx[i]=k;q[i]=code[k]*am[b]}return {idx,q,am}}
function stats(x,qr,code){let se=0,ss=0;const cnt=new Array(code.length).fill(0);for(let i=0;i<x.length;i++){const e=qr.q[i]-x[i];se+=e*e;ss+=x[i]*x[i];cnt[qr.idx[i]]++}
  const n=x.length;let H=0;cnt.forEach(c=>{if(c){const p=c/n;H-=p*Math.log2(p)}});return {relmse:se/ss,H,cnt,used:cnt.filter(c=>c).length}}
// Double quantisation of the absmax constants as the released code does it: subtract the mean, blocks of 256, 8-bit code (dynamic map), FP32 per block
function dq(am,code,B2){code=code||QD.dyn8;B2=B2||256;const n=am.length;let off=0;for(const a of am)off+=a;off/=n;
  const out=new Float64Array(n);for(let b=0;b<Math.ceil(n/B2);b++){let m=0;for(let i=b*B2;i<Math.min(n,(b+1)*B2);i++)m=Math.max(m,Math.abs(am[i]-off));m=m||1e-12;
    for(let i=b*B2;i<Math.min(n,(b+1)*B2);i++)out[i]=code[nearestIdx(code,(am[i]-off)/m)]*m+off}return {q:out,off}}
// bits per parameter spent on constants: c1 bits per block of B1, or with DQ c2 bits per constant plus 32 per block of B2
const constBits=(B1,c1,dqOn,c2,B2)=>dqOn?c2/B1+32/(B1*B2):c1/B1;

// ---- Tournament data ----
function unpack4(s,len){const out=[];for(const ch of s){const v=B64.indexOf(ch);out.push(v>>4,(v>>2)&3,v&3)}return out.slice(0,len)}
const B64='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
let _cache=null;
function tour(){if(_cache)return _cache;const sV=QD.sysV,sO=QD.sysO;const V={},O={};
  const pv=[];sV.forEach(a=>sV.forEach(b=>{if(a!==b)pv.push([a,b])}));const po=[];sO.forEach(a=>sO.forEach(b=>{if(a!==b)po.push([a,b])}));
  const lv=Math.ceil(80/3),lo=Math.ceil(QD.nO/3);
  pv.forEach(([a,b],i)=>{V[a+'|'+b]=unpack4(QD.vic.slice(i*lv,(i+1)*lv),80)});
  po.forEach(([a,b],i)=>{O[a+'|'+b]=unpack4(QD.oa.slice(i*lo,(i+1)*lo),QD.nO)});
  const H=[],A=QD.ALPH;for(let i=0;i<QD.hum.length;i+=3){const q=A.indexOf(QD.hum[i]),p=pv[A.indexOf(QD.hum[i+1])];let c=A.indexOf(QD.hum[i+2]);const v=[];for(let k=0;k<3;k++){v.push('abt'[c%3]);c=Math.floor(c/3)}H.push([q,p[0],p[1],v.join('')])}
  const R={};for(const s in QD.rel){R[s]={};for(const o in QD.rel[s]){const e=QD.rel[s][o],arr=[];for(let i=0;i<e.length;i+=2){const x=A.indexOf(e[i]),y=A.indexOf(e[i+1]);arr.push(x===21||y===21?null:[x/2,y/2])}R[s][o]=arr}}
  _cache={V,O,H,R,pv,po};return _cache}
// matches: [prompt, a, b, score of a]; judge 'gpt4' on bench 'vicuna' | 'oa', or 'human' (majority of three per HIT, or every vote)
function matches(judge,bench,opt){opt=opt||{};const T=tour(),out=[];
  if(judge==='human'){T.H.forEach(([q,a,b,v])=>{if(opt.sys&&(!opt.sys.includes(a)||!opt.sys.includes(b)))return;
      if(opt.perVote){for(const c of v)out.push([q,a,b,c==='a'?1:c==='b'?0:.5])}
      else{const n={a:0,b:0,t:0};for(const ch of v)n[ch]++;const c=n.a>=2?'a':n.b>=2?'b':'t';out.push([q,a,b,c==='a'?1:c==='b'?0:.5])}});return out}
  const D=bench==='oa'?T.O:T.V;for(const k in D){const [a,b]=k.split('|');if(opt.sys&&(!opt.sys.includes(a)||!opt.sys.includes(b)))continue;if(opt.oneOrder&&opt.oneOrder!=='both'){const ia=QD.sysV.indexOf(a),ib=QD.sysV.indexOf(b);if((opt.oneOrder==='strongFirst')!==(ia<ib))continue}
    D[k].forEach((c,i)=>{if(c===1)out.push([i,a,b,1]);else if(c===2)out.push([i,a,b,0]);else if(c===3&&!opt.noTies)out.push([i,a,b,.5])})}return out}
function shuffle(arr,rnd){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));const t=arr[i];arr[i]=arr[j];arr[j]=t}return arr}
// one Elo pass in the given order of match indices
function eloPass(ms,order,K){const R={};for(const j of order){const [,a,b,s]=ms[j];const ra=R[a]==null?1000:R[a],rb=R[b]==null?1000:R[b];const ea=1/(1+10**((rb-ra)/400));R[a]=ra+K*(s-ea);R[b]=rb-K*(s-ea)}return R}
// typed-array form of the matches for speed: system indices and scores
function pack(ms){const names=[],ix={};const A=new Int32Array(ms.length),B=new Int32Array(ms.length),S=new Float64Array(ms.length);
  ms.forEach((m,i)=>{for(const k of [1,2])if(ix[m[k]]==null){ix[m[k]]=names.length;names.push(m[k])}A[i]=ix[m[1]];B[i]=ix[m[2]];S[i]=m[3]});return {names,A,B,S,n:ms.length}}
// mean (and spread) of final ratings over n random orderings
function elo(ms,n,K,seed){const rnd=mulberry32(seed||7),P=pack(ms),m=P.n,ns=P.names.length,idx=new Int32Array(m),R=new Float64Array(ns),acc=new Float64Array(ns),acc2=new Float64Array(ns),L=Math.LN10/400;
  for(let i=0;i<m;i++)idx[i]=i;
  for(let r=0;r<n;r++){for(let i=m-1;i>0;i--){const j=Math.floor(rnd()*(i+1)),t=idx[i];idx[i]=idx[j];idx[j]=t}R.fill(1000);
    for(let q=0;q<m;q++){const j=idx[q],a=P.A[j],b=P.B[j],ea=1/(1+Math.exp((R[b]-R[a])*L)),d=K*(P.S[j]-ea);R[a]+=d;R[b]-=d}
    for(let k=0;k<ns;k++){acc[k]+=R[k];acc2[k]+=R[k]*R[k]}}
  const out={};P.names.forEach((s,k)=>{const mu=acc[k]/n,sd=Math.sqrt(Math.max(0,acc2[k]/n-mu*mu));out[s]={mean:mu,sd,ci:1.96*sd/Math.sqrt(n)}});return out}
// prompt bootstrap: resample prompts with replacement, mean Elo over nOrd orderings each time; returns 2.5 and 97.5 percentiles per system
function bootElo(ms,nPrompts,B,nOrd,K,seed){const rnd=mulberry32(seed||11),by={};ms.forEach(m=>{(by[m[0]]=by[m[0]]||[]).push(m)});const keys=Object.keys(by),res={};
  for(let b=0;b<B;b++){const sub=[];for(let i=0;i<nPrompts;i++){const k=keys[Math.floor(rnd()*keys.length)];for(const m of by[k])sub.push(m)}
    const e=elo(sub,nOrd,K,Math.floor(rnd()*1e9));for(const s in e)(res[s]=res[s]||[]).push(e[s].mean)}
  const out={};for(const s in res){const xs=res[s].sort((x,y)=>x-y);out[s]={lo:xs[Math.floor(.025*xs.length)],hi:xs[Math.max(0,Math.ceil(.975*xs.length)-1)],all:xs}}return out}
// Table 6: system total / ChatGPT total over prompts, per order and pooled
function relScore(s,keep){const R=tour().R[s];if(!R)return null;const out={};let ps=0,pc=0;
  for(const o of ['chatgpt_first','system_first']){if(!R[o])continue;let a=0,c=0,n=0;R[o].forEach((p,i)=>{if(!p||(keep&&!keep[i]))return;c+=p[0];a+=p[1];n++});out[o]=100*a/c;out[o+'_n']=n;ps+=a;pc+=c}
  out.pooled=100*ps/pc;return out}
G.QE={qnorm,nf4,eq4,decF16,decF32,quantise,stats,dq,constBits,tour,matches,elo,eloPass,bootElo,relScore,unpack4,nearestIdx};
})(typeof window!=='undefined'?window:globalThis);
