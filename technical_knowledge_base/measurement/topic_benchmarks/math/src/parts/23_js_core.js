// ---- Shared maths for the AIME animation and the Sample lab (window.MC). Checked against src/recompute.py by src/check_core.mjs ----
window.MC=(function(){
  const B36='0123456789abcdefghijklmnopqrstuvwxyz';
  // samples of one model: array over problems of arrays over runs; each entry an index into that problem's answer list (0 = gold) or null
  function decode(m,n){const r=m.r,s=m.s,out=[];for(let p=0;p<n;p++){const row=[];for(let k=0;k<r;k++){const j=(p*r+k)*2,c=s.substr(j,2);row.push(c==='--'?null:B36.indexOf(c[0])*36+B36.indexOf(c[1]))}out.push(row)}return out}
  function comb(n,k){if(k<0||k>n)return 0;let r=1;for(let i=1;i<=k;i++)r=r*(n-k+i)/i;return r}
  function subsets(n,k){const out=[];(function rec(st,a){if(a.length===k){out.push(a.slice());return}for(let i=st;i<n;i++){a.push(i);rec(i+1,a);a.pop()}})(0,[]);return out}
  // exact expected maj@k over all k-subsets of the present samples; a tie is split evenly among the tied answers
  function majk(row,k){const xs=row.filter(x=>x!==null),n=xs.length;if(!n)return 0;if(n<k)k=n;let tot=0,cnt=0;
    for(const S of subsets(n,k)){const c={};S.forEach(i=>{c[xs[i]]=(c[xs[i]]||0)+1});let m=0;for(const a in c)m=Math.max(m,c[a]);
      const top=Object.keys(c).filter(a=>c[a]===m);tot+=top.indexOf('0')>=0?1/top.length:0;cnt++}
    return tot/cnt}
  // vote winners for a full row (for drawing)
  function winners(row){const c={};row.forEach(x=>{if(x!==null)c[x]=(c[x]||0)+1});let m=0;for(const a in c)m=Math.max(m,c[a]);return Object.keys(c).filter(a=>c[a]===m).map(Number)}
  // unbiased pass@k (Chen et al., 2021): 1 - C(n-c,k)/C(n,k)
  function passk(n,c,k){if(n-c<k)return 1;return 1-comb(n-c,k)/comb(n,k)}
  function stats(m,n){
    const D=decode(m,n),DD=D.filter(r=>r.some(x=>x!==null));let na=0,corr=0;
    D.forEach(r=>r.forEach(x=>{if(x!==null){na++;if(x===0)corr++}}));
    const p=na?corr/na:0;
    const per=DD.map(r=>{const v=r.filter(x=>x!==null);return v.filter(x=>x===0).length/v.length});
    const np=per.length,mp=per.reduce((a,b)=>a+b,0)/np;
    const se=np>1?Math.sqrt(per.reduce((a,x)=>a+(x-mp)*(x-mp),0)/(np-1)/np):0;
    const maj=[],pk=[];for(let k=1;k<=m.r;k++){maj.push(100*DD.reduce((a,r)=>a+majk(r,k),0)/np);
      pk.push(100*DD.reduce((a,r)=>{const v=r.filter(x=>x!==null);return a+passk(v.length,v.filter(x=>x===0).length,k)},0)/np)}
    return {D,na,corr,p1:100*p,ciAns:196*Math.sqrt(p*(1-p)/Math.max(1,na)),ciProb:196*Math.sqrt(p*(1-p)/n),ciClu:196*se,maj,pk,per,np,
      all:D.filter(r=>r.length&&r.every(x=>x===0)).length,none:DD.filter(r=>r.every(x=>x!==0)).length};
  }
  // seeded RNG for the Monte Carlo fallback
  function rng(seed){let s=seed>>>0;return ()=>{s=(s+0x6D2B79F5)>>>0;let t=s;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  // paired permutation test on per-problem differences (two-sided): exact when at most 20 problems differ, else 200,000 seeded sign flips
  function permTest(a,b){const d=[];for(let i=0;i<a.length;i++){if(a[i]==null||b[i]==null)continue;const x=a[i]-b[i];if(Math.abs(x)>1e-12)d.push(x)}
    const obs=Math.abs(d.reduce((s,x)=>s+x,0));if(!d.length)return {p:1,nd:0,exact:true,diff:0};let ge=0,tot=0;
    if(d.length<=20){const N=1<<d.length;for(let mask=0;mask<N;mask++){let s=0;for(let i=0;i<d.length;i++)s+=(mask>>i)&1?-d[i]:d[i];if(Math.abs(s)>=obs-1e-9)ge++;tot++}return {p:ge/tot,nd:d.length,exact:true}}
    const R=rng(12345);tot=200000;for(let t=0;t<tot;t++){let s=0;for(let i=0;i<d.length;i++)s+=R()<.5?-d[i]:d[i];if(Math.abs(s)>=obs-1e-9)ge++}
    return {p:ge/tot,nd:d.length,exact:false}}
  const fmt=(x,d)=>(x==null||!isFinite(x))?'n/a':x.toFixed(d==null?1:d);
  return {decode,majk,passk,winners,stats,permTest,fmt,comb};
})();
