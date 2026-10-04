// ---- Statistics library and data decoders shared by every tab. Mirrored in ../recompute.py, compared by ../check_page.mjs ----
window.EST=(function(){
const S={};
// inverse standard normal (Acklam), normal cdf (erf by Abramowitz-Stegun 7.1.26 refined with a series near 0)
S.zq=function(p){const a=[-39.69683028665376,220.9460984245205,-275.9285104469687,138.357751867269,-30.66479806614716,2.506628277459239],
  b=[-54.47609879822406,161.5858368580409,-155.6989798598866,66.80131188771972,-13.28068155288572],
  c=[-.007784894002430293,-.3223964580411365,-2.400758277161838,-2.549732539343734,4.374664141464968,2.938163982698783],
  d=[.007784695709041462,.3224671290700398,2.445134137142996,3.754408661907416];let q,r;
  if(p<.02425){q=Math.sqrt(-2*Math.log(p));return(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  if(p>1-.02425){q=Math.sqrt(-2*Math.log(1-p));return-(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5])/((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)}
  q=p-.5;r=q*q;return(((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q/(((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)};
S.Phi=function(x){// W. J. Cody style via complementary error function (max error about 1e-7)
  const t=1/(1+0.5*Math.abs(x)/Math.SQRT2*1),z=Math.abs(x)/Math.SQRT2;
  const r=t*Math.exp(-z*z-1.26551223+t*(1.00002368+t*(.37409196+t*(.09678418+t*(-.18628806+t*(.27886807+t*(-1.13520398+t*(1.48851587+t*(-.82215223+t*.17087277)))))))));
  return x>=0?1-r/2:r/2};
S.Z95=1.959964;S.Z80=0.841621;
// log-gamma (Lanczos) and binomial pmf / cdf
S.lgam=function(x){const g=7,c=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  if(x<0.5)return Math.log(Math.PI/Math.sin(Math.PI*x))-S.lgam(1-x);x-=1;let a=c[0];const t=x+g+0.5;for(let i=1;i<9;i++)a+=c[i]/(x+i);
  return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a)};
S.lchoose=(n,k)=>S.lgam(n+1)-S.lgam(k+1)-S.lgam(n-k+1);
S.bpmf=(k,n,p)=>{if(k<0||k>n)return 0;if(p<=0)return k===0?1:0;if(p>=1)return k===n?1:0;return Math.exp(S.lchoose(n,k)+k*Math.log(p)+(n-k)*Math.log(1-p))};
S.bcdf=(k,n,p)=>{let s=0;for(let i=0;i<=k;i++)s+=S.bpmf(i,n,p);return Math.min(1,s)};
// regularized incomplete beta (continued fraction, Numerical Recipes) and its inverse by bisection
function bcf(a,b,x){const FP=1e-30;let qab=a+b,qap=a+1,qam=a-1,c=1,d=1-qab*x/qap;if(Math.abs(d)<FP)d=FP;d=1/d;let h=d;
  for(let m=1;m<=300;m++){const m2=2*m;let aa=m*(b-m)*x/((qam+m2)*(a+m2));d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;h*=d*c;
    aa=-(a+m)*(qab+m)*x/((a+m2)*(qap+m2));d=1+aa*d;if(Math.abs(d)<FP)d=FP;c=1+aa/c;if(Math.abs(c)<FP)c=FP;d=1/d;const del=d*c;h*=del;if(Math.abs(del-1)<3e-14)break}return h}
S.ibeta=function(x,a,b){if(x<=0)return 0;if(x>=1)return 1;const bt=Math.exp(S.lgam(a+b)-S.lgam(a)-S.lgam(b)+a*Math.log(x)+b*Math.log(1-x));
  return x<(a+1)/(a+b+2)?bt*bcf(a,b,x)/a:1-bt*bcf(b,a,1-x)/b};
S.betaq=function(p,a,b){let lo=0,hi=1;for(let i=0;i<60;i++){const m=(lo+hi)/2;if(S.ibeta(m,a,b)<p)lo=m;else hi=m}return (lo+hi)/2};
// intervals for k successes of n (95% unless z/conf given)
S.ci={
  wald:(k,n,c)=>{const z=S.zq(1-(1-(c||.95))/2),p=k/n,h=z*Math.sqrt(p*(1-p)/n);return[p-h,p+h]},
  wilson:(k,n,c)=>{const z=S.zq(1-(1-(c||.95))/2),p=k/n,den=1+z*z/n,ce=(p+z*z/(2*n))/den,h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n))/den;return[ce-h,ce+h]},
  cp:(k,n,c)=>{const a=1-(c||.95);return[k===0?0:S.betaq(a/2,k,n-k+1),k===n?1:S.betaq(1-a/2,k+1,n-k)]},
  bayes:(k,n,c)=>{const a=1-(c||.95);return[S.betaq(a/2,1+k,1+n-k),S.betaq(1-a/2,1+k,1+n-k)]}
};
// exact coverage of an interval method at true rate t with n items; intervals per k cached by caller
S.coverage=function(ints,n,t){let s=0;for(let k=0;k<=n;k++){const I=ints[k];if(I[0]<=t&&t<=I[1])s+=S.bpmf(k,n,t)}return s};
// descriptive
S.mean=a=>{let s=0;for(const x of a)s+=x;return s/a.length};
S.varS=a=>{const m=S.mean(a);let s=0;for(const x of a)s+=(x-m)*(x-m);return s/(a.length-1)};
S.seClt=a=>Math.sqrt(S.varS(a)/a.length);
// Miller (2024) Eq. 4 / Appendix A: clustered standard error; cl[i] is item i's cluster id. corr=true multiplies by C/(C-1) (Inspect's version)
S.seClu=function(a,cl,corr){const m=S.mean(a),sums={};let C=0;for(let i=0;i<a.length;i++){if(!(cl[i] in sums)){sums[cl[i]]=0;C++}sums[cl[i]]+=a[i]-m}
  let v=0;for(const k in sums)v+=sums[k]*sums[k];if(corr)v*=C/(C-1);return Math.sqrt(v)/a.length};
S.corr=function(x,y){const mx=S.mean(x),my=S.mean(y);let sxy=0,sx=0,sy=0;for(let i=0;i<x.length;i++){sxy+=(x[i]-mx)*(y[i]-my);sx+=(x[i]-mx)**2;sy+=(y[i]-my)**2}return sxy/Math.sqrt(sx*sy)};
// seeded generator (mulberry32)
S.rng=function(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
// paired bootstrap percentile interval of the mean difference; cl given = resample whole clusters
S.boot=function(d,B,seed,cl){const r=S.rng(seed||1),n=d.length,out=new Float64Array(B);
  if(cl){const g={};d.forEach((x,i)=>{(g[cl[i]]=g[cl[i]]||[]).push(x)});const G=Object.values(g).map(v=>[v.reduce((s,x)=>s+x,0),v.length]),C=G.length;
    for(let b=0;b<B;b++){let s=0,m=0;for(let j=0;j<C;j++){const q=G[(r()*C)|0];s+=q[0];m+=q[1]}out[b]=s/m}}
  else for(let b=0;b<B;b++){let s=0;for(let j=0;j<n;j++)s+=d[(r()*n)|0];out[b]=s/n}
  out.sort();return[out[Math.floor(.025*B)],out[Math.ceil(.975*B)-1]]};
// paired permutation (sign-flip) test, two-sided; cl given = flip whole clusters
S.perm=function(d,B,seed,cl){const r=S.rng(seed||2);let units=d;if(cl){const g={};d.forEach((x,i)=>{g[cl[i]]=(g[cl[i]]||0)+x});units=Object.values(g)}
  const obs=Math.abs(units.reduce((s,x)=>s+x,0));let hit=0;for(let b=0;b<B;b++){let s=0;for(const x of units)s+=r()<.5?x:-x;if(Math.abs(s)>=obs-1e-12)hit++}return(hit+1)/(B+1)};
// McNemar: b = A right & B wrong, c = A wrong & B right
S.mcnemarExact=(b,c)=>{const m=b+c;if(m===0)return 1;return Math.min(1,2*S.bcdf(Math.min(b,c),m,.5))};
S.mcnemarChi=(b,c)=>{const m=b+c;if(m===0)return 1;const x=(Math.abs(b-c)-1)**2/m,z=Math.sqrt(Math.max(0,x));return 2*(1-S.Phi(z))};
// paired t (normal for large n) two-sided p from mean and se
S.pz=(m,se)=>se>0?2*(1-S.Phi(Math.abs(m/se))):1;
// exact power and Type-M (exaggeration) factor of McNemar's exact test: n items, p10 and p01 the discordant cell probabilities
S.mcPower=function(n,p10,p01,alpha){alpha=alpha||.05;const pd=p10+p01,q=p10/pd;let pw=0,tm=0;
  const mu=n*pd,sd=Math.sqrt(n*pd*(1-pd)),lo=Math.max(1,Math.floor(mu-9*sd)),hi=Math.min(n,Math.ceil(mu+9*sd));
  for(let m=lo;m<=hi;m++){const pm=S.bpmf(m,n,pd);if(pm<1e-13)continue;
    // largest k with two-sided exact p <= alpha
    let k=-1,cdf=0;for(let j=0;j<=m/2;j++){cdf+=S.bpmf(j,m,.5);if(2*cdf<=alpha)k=j;else break}
    if(k<0)continue;
    for(let b=0;b<=m;b++){if(Math.min(b,m-b)>k)continue;const pb=S.bpmf(b,m,q);pw+=pm*pb;tm+=pm*pb*Math.abs(2*b-m)/n}}
  return{power:pw,typeM:pw>0?tm/pw/Math.abs(p10-p01):NaN}};
S.fmt=(x,d)=>(x<0?'−':'')+Math.abs(x).toFixed(d==null?1:d);
S.pfmt=p=>p<0.0001?'< 0.0001':p<0.001?p.toFixed(4):p.toFixed(3);

// ---- data decoders ----
const D=window.ES;S.D=D;
if(D){
  // RACE-H: passages (clusters) as run lengths, P(correct) x1000 in 2 base-36 chars, greedy correct as 0/1
  const B36='0123456789abcdefghijklmnopqrstuvwxyz';
  const cl=[];[...D.race.csize].forEach((ch,c)=>{const k=B36.indexOf(ch);for(let j=0;j<k;j++)cl.push(c)});
  const dec=s=>{const o=[];for(let i=0;i<s.length;i+=2)o.push((B36.indexOf(s[i])*36+B36.indexOf(s[i+1]))/1000);return o};
  S.race={cl,models:D.race.models,p:D.race.p.map(dec),g:D.race.g.map(s=>[...s].map(Number)),nc:D.race.csize.length};
  // MT-Bench: one char per turn, 'a' = 1 ... 's' = 10, '.' = failed judgment; cluster = question id
  S.mtb={cl:D.mtb.order.map(o=>o[0]),cat:D.mtb.cat,models:D.mtb.models.map(m=>({name:m[0],s:[...m[1]].map(ch=>ch==='.'?null:(ch.charCodeAt(0)-95)/2)}))};
}
// sampled 0/1 scores from probabilities: K draws per item, seeded; returns per-item means
S.sampleK=function(p,K,seed){const r=S.rng(seed);return p.map(x=>{let s=0;for(let k=0;k<K;k++)s+=r()<x?1:0;return s/K})};
// item-level paired view of two RACE models under a scoring rule: 'greedy' | 'p' | 'k1' | 'k5'
S.raceScores=function(rule,seed){const R=S.race;if(rule==='greedy')return R.g.map(a=>a.slice());if(rule==='p')return R.p.map(a=>a.slice());
  const K=rule==='k1'?1:rule==='k5'?5:+rule.slice(1);return R.p.map((a,j)=>S.sampleK(a,K,(seed||11)+j*7919))};
// MT-Bench two models: items where both have a grade
S.mtbPair=function(i,j){const A=S.mtb.models[i].s,B=S.mtb.models[j].s,a=[],b=[],cl=[];for(let t=0;t<A.length;t++){if(A[t]===null||B[t]===null)continue;a.push(A[t]);b.push(B[t]);cl.push(S.mtb.cl[t])}return{a,b,cl}};
// the four standard errors of a difference, on the same items
S.fourSE=function(a,b,cl){const d=a.map((x,i)=>b[i]-x);const n=a.length;
  return{n,diff:S.mean(d),unpaired:Math.sqrt(S.varS(a)/n+S.varS(b)/n),paired:S.seClt(d),clustered:S.seClu(d,cl),
    unpairedClu:Math.sqrt(S.seClu(a,cl)**2+S.seClu(b,cl)**2),r:S.corr(a,b),C:new Set(cl).size,d}};
return S;
})();
// tab render hook used by every tab: TAB_RENDER[id] functions run when the tab is shown
window.onTab=function(id,f){(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[id]=window.TAB_RENDER[id]||[]).push(f)};
