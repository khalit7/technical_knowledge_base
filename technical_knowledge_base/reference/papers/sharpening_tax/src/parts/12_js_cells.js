// ---- The released per-task counts (window.CELLS from mk_data.py) and the paper's estimators, shared by every tab ----
(function(){
if(!window.CELLS)return;
const BN={bfcl:'BFCLv4 MT',webshop:'WebShop',acebench:'ACEBench'};
const dec=s=>{const a=new Int16Array(s.length/2);for(let i=0;i<a.length;i++)a[i]=parseInt(s.substr(2*i,2),36);return a};
const cache={};
function get(bk,pair){const k=bk+'|'+pair;if(cache[k])return cache[k];const r=CELLS.find(x=>x[0]===bk&&x[1]===pair);if(!r)return null;
  const o={bk,pair,bench:BN[bk],T:r[2],cb:dec(r[3]),cp:dec(r[4])};cache[k]=o;return o}
// unbiased pass@k (coverage) and pass^k (consistency), mean over tasks, k = 1..K (Chen et al. 2021; the paper's §2 and A.4)
function curves(c,n,K){const cov=new Float64Array(K),con=new Float64Array(K);for(let i=0;i<c.length;i++){const ci=c[i];let q=1,h=1;for(let j=0;j<K;j++){q*=Math.max(0,n-ci-j)/(n-j);h*=Math.max(0,ci-j)/(n-j);cov[j]+=1-q;con[j]+=h}}
  for(let j=0;j<K;j++){cov[j]/=c.length;con[j]/=c.length}return {cov,con}}
// per-task raw area a_i(K) = sum_{k<K} (pass@K_i - pass@k_i)
function taskArea(ci,n,K){let q=1;const pk=new Float64Array(K);for(let j=0;j<K;j++){q*=Math.max(0,n-ci-j)/(n-j);pk[j]=1-q}let a=0;for(let k=0;k<K-1;k++)a+=pk[K-1]-pk[k];return a}
// Eqs. 1 and 2: A(K) = sum_{k<K}(pass@K - pass@k); S(K) = A / ((K-1)(1 - pass@1))
const scal=(cov,K)=>{let A=0;for(let k=0;k<K-1;k++)A+=cov[K-1]-cov[k];return {A,S:A/((K-1)*(1-cov[0]))}};
function stats(cell,K){K=K||128;const b=curves(cell.cb,128,K),p=curves(cell.cp,128,K),sb=scal(b.cov,K),sp=scal(p.cov,K);let cross=null;
  if(b.cov[0]<p.cov[0])for(let k=0;k<K;k++)if(b.cov[k]>=p.cov[k]){cross=k+1;break}
  return {b,p,AB:sb.A,AP:sp.A,SB:sb.S,SP:sp.S,taxA:sb.A-sp.A,taxS:sb.S-sp.S,cross}}
const cats=c=>{let a=0,m=0,f=0;for(const v of c){if(v===128)a++;else if(v===0)f++;else m++}const n=c.length;return [a/n,m/n,f/n]};
const PAIRS=['gemma-4-E4B','gemma-4-12B','gemma-4-26B-A4B','gemma-4-31B','Ministral-3-3B','Ministral-3-8B','Ministral-3-14B','Qwen2.5-3B','Qwen2.5-7B','Qwen2.5-14B','Qwen2.5-32B','Qwen3.5-4B','Qwen3.5-9B','Qwen3.5-35B-A3B'];
window.CX={BN,PAIRS,get,curves,taskArea,scal,stats,cats};
})();
