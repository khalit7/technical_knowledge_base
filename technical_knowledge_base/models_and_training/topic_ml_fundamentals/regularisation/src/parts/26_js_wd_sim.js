// ---- Weight decay through Adam (L2 in the loss) against AdamW (decoupled), on the same noise. Pure maths, no DOM. ----
// Absorbed on 2026-10-24 from the parent root's Reading thread 4 (its RDE.wdSim, src/parts/22_js_rd_engine.js), which this page now owns.
// Six weights start at 1; each gets pure Gaussian noise of standard deviation SIG[i] as its gradient; Adam beta (0.9, 0.999), eps 1e-8,
// learning rate 1e-3, lambda 0.1, 3,000 steps; frames every 100 steps. Checked against torch.optim.Adam / AdamW by check_wd.py.
window.RGW=(function(){
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=Math.imul(a^(a>>>15),1|a);t=(t+Math.imul(t^(t>>>7),61|t))^t;return((t^(t>>>14))>>>0)/4294967296}}
  const gauss=r=>{const u1=1-r(),u2=r();return Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2)};
  const SIG=[1e-4,1e-3,1e-2,1e-1,1,10];let WD=null;
  function sim(keepNoise){if(WD&&!keepNoise)return WD;const N=3000,lr=1e-3,lam=0.1,b1=0.9,b2=0.999,eps=1e-8,r=rng(77),noise=[];
    const st=()=>({w:SIG.map(()=>1),m:SIG.map(()=>0),v:SIG.map(()=>0)}),A=st(),W=st(),fr={l2:[SIG.map(()=>1)],adamw:[SIG.map(()=>1)]};
    for(let t=1;t<=N;t++){const row=[];for(let i=0;i<SIG.length;i++){const xi=gauss(r)*SIG[i];row.push(xi);
        let g=xi+lam*A.w[i];A.m[i]=b1*A.m[i]+(1-b1)*g;A.v[i]=b2*A.v[i]+(1-b2)*g*g;A.w[i]-=lr*(A.m[i]/(1-b1**t))/(Math.sqrt(A.v[i]/(1-b2**t))+eps);
        g=xi;W.w[i]*=1-lr*lam;W.m[i]=b1*W.m[i]+(1-b1)*g;W.v[i]=b2*W.v[i]+(1-b2)*g*g;W.w[i]-=lr*(W.m[i]/(1-b1**t))/(Math.sqrt(W.v[i]/(1-b2**t))+eps)}
      if(keepNoise)noise.push(row);if(t%100===0){fr.l2.push(A.w.slice());fr.adamw.push(W.w.slice())}}
    const out={sig:SIG,frames:fr,N,lr,lam};if(keepNoise)out.noise=noise;else WD=out;return out}
  return {sim,SIG};
})();
