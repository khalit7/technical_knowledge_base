// ---- Same model, many numbers: exact binomial maths (checked against SciPy and statsmodels by src/same/check_calc.mjs) ----
(function(root){
  // log-gamma, Lanczos approximation (g = 7, 9 terms)
  const LG=[0.99999999999980993,676.5203681218851,-1259.1392167224028,771.32342877765313,-176.61502916214059,12.507343278686905,-0.13857109526572012,9.9843695780195716e-6,1.5056327351493116e-7];
  function lgam(x){
    if(x<0.5)return Math.log(Math.PI/Math.abs(Math.sin(Math.PI*x)))-lgam(1-x);
    x-=1;let a=LG[0];const t=x+7.5;for(let i=1;i<9;i++)a+=LG[i]/(x+i);
    return 0.5*Math.log(2*Math.PI)+(x+0.5)*Math.log(t)-t+Math.log(a);
  }
  const lchoose=(n,k)=>lgam(n+1)-lgam(k+1)-lgam(n-k+1);
  function lpmf(k,n,p){
    if(p<=0)return k===0?0:-Infinity;if(p>=1)return k===n?0:-Infinity;
    return lchoose(n,k)+k*Math.log(p)+(n-k)*Math.log1p(-p);
  }
  // P(X <= k) and P(X >= k), summed term by term from the mode outwards for accuracy
  function cdf(k,n,p){if(k<0)return 0;if(k>=n)return 1;let s=0;for(let i=0;i<=k;i++)s+=Math.exp(lpmf(i,n,p));return Math.min(1,s)}
  function sf(k,n,p){if(k<=0)return 1;if(k>n)return 0;let s=0;for(let i=k;i<=n;i++)s+=Math.exp(lpmf(i,n,p));return Math.min(1,s)}
  // Clopper-Pearson exact interval at level 1 - alpha, by bisection
  function cp(k,n,alpha){
    const a=alpha/2;let lo=0,hi=1;
    let L=0;if(k>0){lo=0;hi=1;for(let it=0;it<100;it++){const m=(lo+hi)/2;if(sf(k,n,m)<a)lo=m;else hi=m}L=(lo+hi)/2}
    let U=1;if(k<n){lo=0;hi=1;for(let it=0;it<100;it++){const m=(lo+hi)/2;if(cdf(k,n,m)>a)lo=m;else hi=m}U=(lo+hi)/2}
    return [L,U];
  }
  function wilson(k,n,z){const p=k/n,z2=z*z,den=1+z2/n,c=(p+z2/(2*n))/den,h=z*Math.sqrt(p*(1-p)/n+z2/(4*n*n))/den;return [c-h,c+h]}
  // normal quantile for the three levels offered
  const Z={0.9:1.6448536269514722,0.95:1.959963984540054,0.99:2.5758293035489004};
  // Fisher's exact test, two-sided (same rule as SciPy: sum tables no more probable than the observed one, relative tolerance 1e-7)
  function fisher(ka,na,kb,nb){
    const c1=ka+kb,N=na+nb,lo=Math.max(0,c1-nb),hi=Math.min(na,c1);
    const lh=x=>lchoose(na,x)+lchoose(nb,c1-x)-lchoose(N,c1);
    const lo0=lh(ka);let p=0;for(let x=lo;x<=hi;x++){const l=lh(x);if(l<=lo0+Math.log1p(1e-7))p+=Math.exp(l)}
    return Math.min(1,p);
  }
  // exact McNemar: b discordant pairs one way, c the other; two-sided binomial test at 1/2
  function mcnemar(b,c){const d=b+c;if(d===0)return 1;const m=Math.min(b,c);if(b===c)return 1;return Math.min(1,2*cdf(m,d,0.5))}
  // Newcombe hybrid score interval for pA - pB (independent samples)
  function newcombe(ka,na,kb,nb,z){const pa=ka/na,pb=kb/nb,[la,ua]=wilson(ka,na,z),[lb,ub]=wilson(kb,nb,z),d=pa-pb;
    return [d-Math.sqrt((pa-la)**2+(ub-pb)**2),d+Math.sqrt((ua-pa)**2+(pb-lb)**2)]}
  // Wald interval for a paired difference (b - c)/n
  function pairedWald(b,c,n,z){const d=(b-c)/n,se=Math.sqrt(Math.max(0,(b+c)-(b-c)*(b-c)/n))/n;return [d-z*se,d+z*se,se]}
  // the range of discordant pairs two scores on the same n items allow (b - c fixed at ka - kb)
  function discRange(ka,kb,n){const lo=Math.abs(ka-kb),hi=Math.min(ka+kb,2*n-ka-kb);return [lo,hi]}
  root.SMC={lgam,lchoose,cdf,sf,cp,wilson,Z,fisher,mcnemar,newcombe,pairedWald,discRange};
})(typeof window!=='undefined'?window:globalThis);
