// ---- Scheduling lab: the batch-scheduler simulator (a line-by-line port of src/sched/scripts/sim.py; src/sched/scripts/check_sim.mjs compares them) ----
window.SC_SIM=(function(){
  function Profile(now,cap){this.T=[now];this.F=[cap]}
  Profile.prototype._cut=function(x){const T=this.T,F=this.F;let i=0;while(i<T.length&&T[i]<x)i++;
    if(i<T.length&&T[i]===x)return i;T.splice(i,0,x);F.splice(i,0,F[i-1]);return i};
  Profile.prototype.reserve=function(s,e,size){const i=this._cut(s),j=this._cut(e);for(let k=i;k<j;k++)this.F[k]-=size};
  Profile.prototype.earliest=function(size,dur){const T=this.T,F=this.F,n=T.length;let i=0;
    while(i<n){if(F[i]<size){i++;continue}const s=T[i];let j=i,ok=true;
      while(j<n&&T[j]<s+dur){if(F[j]<size){ok=false;break}j++}
      if(ok)return s;i=j+1}return null};
  // jobs: [{name,size,run,limit,submit,prio?}]; policy: fifo | easy | conservative
  function simulate(jobs0,cap,policy){
    const jobs=jobs0.map((j,i)=>Object.assign({prio:0},j,{idx:i,run:Math.min(j.run,j.limit)}));
    let t=0;const pending=[],running=[],sched={};
    const arrivals=jobs.slice().sort((a,b)=>a.submit-b.submit||a.idx-b.idx);
    const cmp=(a,b)=>(b.prio-a.prio)||(a.submit-b.submit)||(a.idx-b.idx);
    const start=(j,t)=>{running.push({name:j.name,size:j.size,end:t+j.run,lend:t+j.limit});sched[j.name]=[t,t+j.run]};
    for(let guard=0;arrivals.length||pending.length||running.length;guard++){
      if(guard>200000)throw new Error('no progress');
      while(arrivals.length&&arrivals[0].submit<=t)pending.push(arrivals.shift());
      pending.sort(cmp);
      let free=cap-running.reduce((a,r)=>a+r.size,0);
      if(policy==='fifo'){
        while(pending.length&&pending[0].size<=free){const j=pending.shift();start(j,t);free-=j.size}
      }else{
        const prof=new Profile(t,cap);running.forEach(r=>prof.reserve(t,r.lend,r.size));
        let reserved=0;
        for(const j of pending.slice()){
          const s=prof.earliest(j.size,j.limit);
          if(s===t){pending.splice(pending.indexOf(j),1);start(j,t);prof.reserve(t,t+j.limit,j.size)}
          else if(policy==='conservative'||reserved===0){prof.reserve(s,s+j.limit,j.size);reserved++}
        }
      }
      const nxt=running.map(r=>r.end).concat(arrivals.length?[arrivals[0].submit]:[]);
      if(!nxt.length){if(pending.length)throw new Error('job larger than the cluster: '+pending[0].name);break}
      t=Math.min(...nxt);
      for(const r of running.filter(r=>r.end===t))running.splice(running.indexOf(r),1);
    }
    return {sched,m:metrics(jobs,sched,cap)};
  }
  // Slurm-like conservative backfill: GPUs live on nodes and a future reservation blocks its whole nodes for its window
  // (backfill.c lines 3527, 3557). Placement: the first node that holds the whole job, else nodes in order.
  function simulateNodes(jobs0,nodes,per){
    const jobs=jobs0.map((j,i)=>Object.assign({prio:0},j,{idx:i,run:Math.min(j.run,j.limit)}));
    let t=0,running=[];const pending=[],sched={};
    const arrivals=jobs.slice().sort((a,b)=>a.submit-b.submit||a.idx-b.idx);
    const cmp=(a,b)=>(b.prio-a.prio)||(a.submit-b.submit)||(a.idx-b.idx);
    while(arrivals.length||pending.length||running.length){
      while(arrivals.length&&arrivals[0].submit<=t)pending.push(arrivals.shift());
      pending.sort(cmp);const resv=[];
      const freeOn=(n,a)=>per-running.reduce((s,r)=>s+(r.lend>a?(r.on[n]||0):0),0);
      const place=(size,a,b)=>{const ok=[];for(let n=0;n<nodes;n++)if(!resv.some(([s0,e0,ns])=>s0<b&&a<e0&&ns.includes(n)))ok.push(n);
        for(const n of ok)if(freeOn(n,a)>=size)return {[n]:size};
        const got={};let need=size;for(const n of ok){const f=freeOn(n,a);if(f>0&&need>0){got[n]=Math.min(f,need);need-=got[n]}}
        return need===0?got:null};
      for(const j of pending.slice()){
        const c=new Set([t]);running.forEach(r=>{if(r.lend>t)c.add(r.lend)});resv.forEach(r=>{if(r[1]>t)c.add(r[1])});
        const cands=[...c].sort((a,b)=>a-b);let s=null,on=null;
        for(const x of cands){on=place(j.size,x,x+j.limit);s=x;if(on)break}
        const ns=Object.keys(on).map(Number);
        if(s===t){pending.splice(pending.indexOf(j),1);running.push({name:j.name,end:t+j.run,lend:t+j.limit,on});
          const lab={};ns.forEach(n=>lab['c'+(n+1)]=on[n]);sched[j.name]=[t,t+j.run,lab]}
        else resv.push([s,s+j.limit,ns]);
      }
      const nxt=running.map(r=>r.end).concat(arrivals.length?[arrivals[0].submit]:[]);
      if(!nxt.length)break;t=Math.min(...nxt);running=running.filter(r=>r.end!==t);
    }
    return sched;
  }
  function metrics(jobs,sched,cap){
    const t0=Math.min(...jobs.map(j=>j.submit));const mk=Math.max(...Object.values(sched).map(v=>v[1]));
    const busy=jobs.reduce((a,j)=>a+j.size*j.run,0);const waits=jobs.map(j=>sched[j.name][0]-j.submit);
    const r4=x=>Math.round(x*1e4)/1e4;
    return {makespan:mk-t0,util:r4(busy/(cap*(mk-t0))),mean_wait:r4(waits.reduce((a,b)=>a+b,0)/waits.length),max_wait:Math.max(...waits)};
  }
  // a deterministic PRNG (mulberry32), the same in sim.py
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1)>>>0;
    t=(t^(t+(Math.imul(t^(t>>>7),t|61)>>>0)))>>>0;return((t^(t>>>14))>>>0)/4294967296}}
  // An illustrative synthetic workload: n jobs on a cap-GPU cluster, sizes 1..cap/4 GPUs in powers of two
  // (small ones more common), runtimes log-uniform from 10 minutes to 24 hours, Poisson arrivals at offered load `load`,
  // time limit = runtime x a factor drawn uniformly from [1, pad].
  function genWorkload(cap,n,load,pad,seed){
    const r=rng(seed);const sizes=[];for(let s=1;s<=cap/4;s*=2)sizes.push(s);
    const w=sizes.map((s,i)=>1/(i+1));const ws=w.reduce((a,b)=>a+b,0);
    const jobs=[];let t=0;
    const raw=[];for(let i=0;i<n;i++){
      let u=r()*ws,k=0;while(u>w[k]&&k<w.length-1){u-=w[k];k++}
      const run=Math.round(Math.exp(Math.log(10)+r()*(Math.log(1440)-Math.log(10))));
      const f=1+r()*(pad-1);const gap=-Math.log(1-r());raw.push([sizes[k],run,f,gap])}
    const work=raw.reduce((a,x)=>a+x[0]*x[1],0);const meanGap=work/(cap*load)/n;
    raw.forEach((x,i)=>{t+=x[3]*meanGap;jobs.push({name:'j'+i,size:x[0],run:x[1],limit:Math.ceil(x[1]*x[2]),submit:Math.round(t)})});
    return jobs;
  }
  return {simulate,simulateNodes,genWorkload,rng};
})();
