// ---- Autoscaling lab: the simulator, a line-for-line port of src/sim/autoscale.py (checked by src/sim/check_sim.mjs) ----
window.PRSIM=(function(){
  const DT=0.05;
  function Rng(seed){let s=seed>>>0;return function(){s=(s+0x6D2B79F5)>>>0;let t=s;
    t=Math.imul(t^(t>>>15),t|1)>>>0;t=(t^((t+(Math.imul(t^(t>>>7),t|61)>>>0))>>>0))>>>0;return ((t^(t>>>14))>>>0)/4294967296}}
  function arrivals(p){const r=Rng(p.seed);let t=0;const out=[];
    for(;;){const lam=p.base*((p.t_spike<=t&&t<p.t_spike+p.dur)?p.spike:1);t+=-Math.log(1-r())/lam;if(t>=p.T)return out;out.push(t)}}
  function pct(xs,q){if(!xs.length)return 0;const s=xs.slice().sort((a,b)=>a-b);return s[Math.min(s.length-1,Math.floor(q*s.length))]}
  function run(p){
    const arr=arrivals(p),svc=p.prefill+p.out*p.tpot,nSteps=Math.round(p.T/DT),per=Math.round(p.period/DT);
    let ready=p.init,pending=[],running=[],queue=[],qi=0,ai=0;const ttft=[];
    let acc={busy:0,q:0,kv:0,n:0},win=[],recs=[[0,p.init]],series=[],repSec=0;
    for(let k=0;k<nSteps;k++){
      const t=(k+1)*DT;
      while(pending.length&&pending[0]<=t){pending.shift();ready++}
      while(ai<arr.length&&arr[ai]<=t){queue.push(arr[ai]);ai++}
      running=running.filter(e=>e>t);
      const cap=ready*p.slots;
      while(qi<queue.length&&running.length<cap){const a=queue[qi];qi++;running.push(t+svc);const w=t-a+p.prefill;ttft.push(w);win.push(w)}
      const waiting=queue.length-qi;
      acc.busy+=Math.min(ready,running.length)/Math.max(1,ready);acc.q+=waiting/Math.max(1,ready);acc.kv+=Math.min(1,running.length/Math.max(1,cap));acc.n++;
      repSec+=(ready+pending.length)*DT;
      if((k+1)%per===0){
        const n=acc.n;let m={util:acc.busy/n,queue:acc.q/n,kv:acc.kv/n,ttft:win.length?pct(win,0.9)/p.slo:0}[p.metric];
        if(p.metric==='queue'&&m===0)m=acc.kv/n*p.target;
        const total=ready+pending.length;let want;
        if(Math.abs(m/p.target-1)<=p.tol)want=total;else want=Math.ceil(ready*m/p.target-1e-9);
        want=Math.max(p.min_r,Math.min(p.max_r,want,total+Math.max(4,total)));
        recs.push([t,want]);recs=recs.filter(x=>x[0]>t-p.down_window);
        if(want>total){for(let j=0;j<want-total;j++)pending.push(t+p.cold)}
        else{const lo=Math.max(...recs.map(x=>x[1]));if(lo<total){let drop=total-lo;while(drop>0&&pending.length){pending.pop();drop--}ready=Math.max(p.min_r,ready-drop)}}
        let rc=0;for(const x of arr){if(t-p.period<x&&x<=t)rc++}
        series.push({t:Math.round(t*100)/100,ready,starting:pending.length,waiting,running:running.length,metric:Math.round(m*1e4)/1e4,want,
          ttft_p90:Math.round(pct(win,0.9)*1000)/1000,rate:Math.round(rc/p.period*1000)/1000});
        acc={busy:0,q:0,kv:0,n:0};win=[];
      }
    }
    let ok=0;for(const x of ttft)if(x<=p.slo)ok++;
    return {n:ttft.length,unserved:arr.length-ttft.length,ttft_p50:Math.round(pct(ttft,0.5)*1000)/1000,ttft_p99:Math.round(pct(ttft,0.99)*1000)/1000,
      slo_ok:Math.round(ok/Math.max(1,arr.length)*1e4)/1e4,replica_hours:Math.round(repSec/3600*1000)/1000,
      peak:Math.max(...series.map(s=>s.ready+s.starting)),series};
  }
  return {run,arrivals,Rng};
})();
