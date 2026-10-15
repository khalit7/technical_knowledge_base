// ---- Training lab: optax 0.2.8's transformations re-implemented for the chain builder (checked against optax by src/train/check_chain.mjs) ----
window.TROPT=function(c,G,P0,M){// c: {opt, clip, wd, mask, sched, lr}; returns {updates[step][i], params[step][i]}
  const n=P0.length,b1=0.9,b2=0.999,eps=1e-8,lb1=0.9,lb2=0.99;
  const lr=k=>c.sched==='constant'?c.lr:c.sched==='warmup'?c.lr*Math.min(1,(k+1)/3):(k<2?c.lr*k/2:c.lr*0.5*(1+Math.cos(Math.PI*Math.min(k-2,4)/4)));
  let p=P0.slice(),mu=new Array(n).fill(0),nu=new Array(n).fill(0),tr=new Array(n).fill(0);const U=[],Pp=[];
  G.forEach((g0,k)=>{let g=g0.slice();
    if(c.clip){const nr=Math.sqrt(g.reduce((a,x)=>a+x*x,0));if(!(nr<c.clip))g=g.map(x=>x/nr*c.clip)}
    let u;
    if(c.opt==='sgd')u=g.slice();
    else if(c.opt==='momentum'){tr=tr.map((t,i)=>g[i]+0.9*t);u=tr.slice()}
    else if(c.opt==='lion'){u=g.map((x,i)=>Math.sign((1-lb1)*x+lb1*mu[i]));mu=mu.map((m,i)=>lb2*m+(1-lb2)*g[i])}
    else{mu=mu.map((m,i)=>b1*m+(1-b1)*g[i]);nu=nu.map((v,i)=>b2*v+(1-b2)*g[i]*g[i]);const t=k+1;
      u=mu.map((m,i)=>(m/(1-Math.pow(b1,t)))/(Math.sqrt(nu[i]/(1-Math.pow(b2,t)))+eps))}
    if((c.opt==='adamw'||c.opt==='lion')&&c.wd)u=u.map((x,i)=>(!c.mask||M[i])?x+c.wd*p[i]:x);
    const s=lr(k);u=u.map(x=>-s*x);p=p.map((x,i)=>x+u[i]);U.push(u);Pp.push(p.slice())});
  return {updates:U,params:Pp}};
