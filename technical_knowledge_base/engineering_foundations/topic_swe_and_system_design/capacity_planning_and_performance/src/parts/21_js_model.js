// ---- The page's model: every formula and simulation, line for line like src/model.py ----
// check_model.mjs runs these functions on the inputs in src/recompute_out.json and compares.
window.CP=(function(){
  function mulberry32(a){return function(){a=(a+0x6D2B79F5)|0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
  const expo=(rnd,mean)=>-mean*Math.log(1-rnd());
  function service(rnd,dist,mean,cv){
    if(dist==='const')return mean;
    if(dist==='exp')return expo(rnd,mean);
    const s2=Math.log(1+cv*cv);const u1=1-rnd();const u2=rnd();
    const z=Math.sqrt(-2*Math.log(u1))*Math.cos(2*Math.PI*u2);
    return Math.exp(Math.log(mean)-s2/2+Math.sqrt(s2)*z);
  }
  const fanout=(p,n)=>1-Math.pow(1-p,n);
  function mean(xs){let s=0;for(let i=0;i<xs.length;i++)s+=xs[i];return s/xs.length}
  function pct(xs,q){const k=Math.max(0,Math.min(xs.length-1,Math.ceil(q*xs.length)-1));return xs[k]}
  function erlangC(A,c){
    if(c<=0)return 1;if(A<=0)return 0;if(A>=c)return 1;
    let B=1;for(let k=1;k<=c;k++)B=A*B/(k+A*B);
    const rho=A/c;return B/(1-rho*(1-B));
  }
  function mmc(rho,c,S){const lam=rho*c/S;if(rho>=1)return{C:1,Wq:Infinity,W:Infinity};
    const C=erlangC(lam*S,c);const Wq=C/(c/S-lam);return{C,Wq,W:Wq+S}}
  function tailSojourn(t,C,theta,nu){const a=Math.exp(-nu*t);let h;
    if(Math.abs(theta-nu)<1e-12*Math.max(theta,nu))h=Math.exp(-nu*t)*(1+nu*t);
    else h=(nu*Math.exp(-theta*t)-theta*Math.exp(-nu*t))/(nu-theta);
    return(1-C)*a+C*h}
  function mmcQuantile(q,rho,c,S){
    if(rho>=1)return Infinity;
    const lam=rho*c/S;const C=erlangC(lam*S,c);const theta=c/S-lam,nu=1/S;
    let lo=0,hi=1/nu+1/theta;
    while(tailSojourn(hi,C,theta,nu)>1-q)hi*=2;
    for(let i=0;i<100;i++){const mid=(lo+hi)/2;if(tailSojourn(mid,C,theta,nu)>1-q)lo=mid;else hi=mid}
    return(lo+hi)/2;
  }
  const kingmanWait=(rho,ca2,cs2,S)=>rho>=1?Infinity:rho/(1-rho)*(ca2+cs2)/2*S;
  function supermarket(lam,d){
    if(d===1)return 1/(1-lam);
    let s=0,i=1;
    while(true){const e=(Math.pow(d,i)-d)/(d-1);const term=Math.pow(lam,e);s+=term;
      if(term<1e-15||i>60)return s;i++}
  }
  function lbSim(o){
    const n=o.n,rho=o.rho,pol=o.policy,N=o.N,warm=o.warm,slow=o.slow||1;
    const cap=(n-1)+1/slow;const lam=rho*cap;
    const rnd=mulberry32(o.seed),pick=mulberry32(o.seed+7919);
    const deps=[],free=[],head=[];for(let k=0;k<n;k++){deps.push([]);free.push(0);head.push(0)}
    let rr=-1;const out=[];const frames=o.frames||null;const fr=[];let fi=0;let t=0;
    const cv=o.cv===undefined?2:o.cv;
    for(let j=0;j<N;j++){
      t+=expo(rnd,1/lam);
      let s=service(rnd,o.dist,1,cv);
      while(frames&&fi<frames.length&&frames[fi]<=t){
        const row=[];for(let k=0;k<n;k++){let c=0;const dk=deps[k];for(let i=head[k];i<dk.length;i++)if(dk[i]>frames[fi])c++;row.push(c)}
        fr.push(row);fi++}
      for(let k=0;k<n;k++){const dk=deps[k];while(head[k]<dk.length&&dk[head[k]]<=t)head[k]++}
      let k;
      if(pol==='random')k=Math.floor(pick()*n);
      else if(pol==='rr'){rr=(rr+1)%n;k=rr}
      else if(pol==='p2c'){const a=Math.floor(pick()*n);let b=Math.floor(pick()*(n-1));if(b>=a)b++;
        k=(deps[a].length-head[a]<=deps[b].length-head[b])?a:b}
      else if(pol==='lor'){k=0;let best=deps[0].length-head[0];for(let i=1;i<n;i++){const q=deps[i].length-head[i];if(q<best){k=i;best=q}}}
      else{k=0;for(let i=1;i<n;i++)if(free[i]<free[k])k=i}
      if(slow>1&&k===0)s*=slow;
      const start=free[k]<t?t:free[k];free[k]=start+s;deps[k].push(free[k]);
      if(j>=warm)out.push(free[k]-t);
    }
    return{soj:out,frames:fr};
  }
  function lbSummary(o){const r=lbSim(o);const xs=r.soj.slice().sort((a,b)=>a-b);
    return{p50:pct(xs,.5),p99:pct(xs,.99),p999:pct(xs,.999),mean:mean(xs)}}
  const cacheBackend=(lam,h)=>(1-h)*lam;
  const cacheLatency=(h,hit,miss)=>h*hit+(1-h)*(hit+miss);
  const xfetchEarly=(delta,beta,u)=>-delta*beta*Math.log(u);
  function stampede(mode,rate,rec,horizon,seed,beta){
    if(beta===undefined)beta=1;
    const rnd=mulberry32(seed);let expAt=1;let db=0;const waits=[],starts=[];
    let t=0;const step=1/rate;let pending=null;
    while(t<horizon){
      if(pending!==null&&pending<=t){expAt=pending+10;pending=null}
      if(mode==='xfetch'&&t<expAt){
        const u=1-rnd();const early=xfetchEarly(rec,beta,u);
        if(pending===null&&t+early>=expAt){db++;starts.push(t);pending=t+rec;waits.push(rec)}
        else waits.push(0);
      }else if(t<expAt)waits.push(0);
      else if(mode==='coalesce'){if(pending===null){db++;starts.push(t);pending=t+rec}waits.push(pending-t)}
      else{db++;starts.push(t);waits.push(rec);if(pending===null||t+rec<pending)pending=t+rec}
      t=Math.round((t+step)*1e9)/1e9;
    }
    return{db,waits,starts};
  }
  function plan(o){
    const avg=o.avg_now*Math.pow(1+o.growth,o.months);const peak=avg*o.peak_factor;
    const per=o.per_server*o.target_util;const need=Math.ceil(peak/per-1e-9);const total=need+o.spares;
    const cost=total*o.price_h*730;
    return{avg,peak,per,need,total,cost,util_peak:peak/(total*o.per_server),util_avg:avg/(total*o.per_server),
      util_peak_one_down:total>1?peak/((total-1)*o.per_server):Infinity};
  }
  const poolSize=(qps,hold)=>qps*hold;
  return{mulberry32,service,fanout,mean,pct,erlangC,mmc,mmcQuantile,kingmanWait,supermarket,lbSim,lbSummary,
    cacheBackend,cacheLatency,xfetchEarly,stampede,plan,poolSize};
})();
