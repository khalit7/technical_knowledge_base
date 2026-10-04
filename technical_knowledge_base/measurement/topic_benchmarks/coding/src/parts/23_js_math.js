// ---- Shared maths (checked against src/recompute.py by check_page.mjs) ----
window.CM=(function(){
  // pass@k: the Codex paper's numerically stable unbiased estimator (arXiv 2107.03374, Figure 3)
  function passk(n,c,k){if(n-c<k)return 1;let p=1;for(let i=n-c+1;i<=n;i++)p*=1-k/i;return 1-p}
  // the plug-in estimate the paper warns against: 1 - (1 - c/n)^k
  const plug=(n,c,k)=>1-Math.pow(1-c/n,k);
  function lchoose(n,r){let s=0;for(let i=1;i<=r;i++)s+=Math.log(n-r+i)-Math.log(i);return s}
  const binom=(n,c,p)=>p<=0?(c===0?1:0):p>=1?(c===n?1:0):Math.exp(lchoose(n,c)+c*Math.log(p)+(n-c)*Math.log(1-p));
  // exact expectation of an estimator over c ~ Binomial(n, p)
  function expect(n,p,k,f){let s=0;for(let c=0;c<=n;c++)s+=binom(n,c,p)*f(n,c,k);return s}
  const dig=ch=>parseInt(ch,20);
  const pct=(x,d)=>(x*100).toFixed(d==null?1:d)+'%';
  return {passk,plug,binom,expect,dig,pct};
})();
