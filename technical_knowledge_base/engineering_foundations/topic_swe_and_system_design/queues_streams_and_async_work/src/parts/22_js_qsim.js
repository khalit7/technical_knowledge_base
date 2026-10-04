// ---- Queue simulator: a seeded discrete-event model of a lease-style queue (the SQS model) ----
// Mirrored line by line in src/recompute.py (qsim); src/check_sim.mjs runs this file in node and compares.
// Messages arrive (steady Poisson rate, optional 3x burst, or a backlog at t=0), wait among the visible messages (oldest first,
// as `ORDER BY id ... FOR UPDATE SKIP LOCKED` in the measured Postgres lab, so a redelivered message goes to the front),
// are claimed by C workers. A claim hides the message for V seconds (visibility timeout); if it is not deleted (acked)
// by then it becomes visible again and is redelivered. Each delivery: service time, then the side effect, then the ack.
// A crash (probability pc per delivery) happens after the side effect and before the ack; the worker is down for R s.
// Poison messages always fail (no effect, no ack). With maxReceives M > 0 a message received M times goes to the DLQ
// on its next claim. With a bound B > 0, arrivals beyond B messages in the queue are rejected (backpressure: 429).
(function(root){
  function rng(seed){let a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
  function Heap(){this.a=[]}
  Heap.prototype.less=function(x,y){return x.t<y.t||(x.t===y.t&&x.s<y.s)};
  Heap.prototype.push=function(e){const a=this.a;a.push(e);let i=a.length-1;while(i>0){const p=(i-1)>>1;if(this.less(a[i],a[p])){const t=a[i];a[i]=a[p];a[p]=t;i=p}else break}};
  Heap.prototype.pop=function(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&this.less(a[l],a[m]))m=l;if(r<a.length&&this.less(a[r],a[m]))m=r;if(m===i)break;const t=a[i];a[i]=a[m];a[m]=t;i=m}}return top};
  function IHeap(){this.a=[]}
  IHeap.prototype.push=function(v){const a=this.a;a.push(v);let i=a.length-1;while(i>0){const q=(i-1)>>1;if(a[i]<a[q]){const t=a[i];a[i]=a[q];a[q]=t;i=q}else break}};
  IHeap.prototype.pop=function(){const a=this.a,top=a[0],last=a.pop();if(a.length){a[0]=last;let i=0;for(;;){const l=2*i+1,r=l+1;let m=i;if(l<a.length&&a[l]<a[m])m=l;if(r<a.length&&a[r]<a[m])m=r;if(m===i)break;const t=a[i];a[i]=a[m];a[m]=t;i=m}}return top};
  function run(p){
    const R=rng(p.seed||1),H=p.mode==='backlog'?p.T:p.T*1.5;
    const ev=new Heap();let seq=0;const push=(t,k,x)=>ev.push({t:t,s:seq++,k:k,x:x});
    const msgs=[],ready=new IHeap();
    const W=[];for(let i=0;i<p.C;i++)W.push(0); // 0 idle, 1 busy, 2 down
    const st={admitted:0,rejected:0,completed:0,redeliveries:0,duplicates:0,dedup:0,dlq:0,crashes:0,poisonFails:0,lateAcks:0,effects:0};
    const lat=[];let depth=0,inflight=0,area=0,tl=0,oldest=0;
    const samples=[];let nextS=0;
    const rate=t=>p.lam*(p.burst&&t>=p.T/4&&t<p.T/2?3:1);
    const expo=m=>-m*Math.log(1-R());
    function sample(t){while(oldest<msgs.length&&msgs[oldest].done)oldest++;
      samples.push({t:t,depth:depth,inflight:inflight,age:oldest<msgs.length?t-msgs[oldest].t0:0,completed:st.completed,redeliveries:st.redeliveries,duplicates:st.duplicates,dlq:st.dlq,rejected:st.rejected})}
    function admit(t){
      if(p.B>0&&depth>=p.B){st.rejected++;return}
      const m={id:msgs.length,t0:t,rec:0,claim:0,eff:0,done:false,poison:R()<p.pp};msgs.push(m);ready.push(m.id);depth++;st.admitted++}
    function dispatch(t){
      for(let i=0;i<W.length;i++){if(W[i]!==0)continue;
        let m=null;while(ready.a.length){const c=msgs[ready.pop()];if(!c.done&&c.vis!==false){m=c;break}}
        if(!m)return;
        if(p.M>0&&m.rec>=p.M){m.done=true;st.dlq++;depth--;i--;continue}
        m.rec++;if(m.rec>1)st.redeliveries++;m.claim++;m.vis=false;inflight++;
        push(t+p.V,'vis',{m:m.id,c:m.claim});
        const w=p.dist==='exp'?expo(p.S):p.S;const crash=R()<p.pc;
        W[i]=1;push(t+w,'done',{w:i,m:m.id,c:m.claim,crash:crash})}}
    // arrivals
    if(p.mode==='backlog'){for(let i=0;i<p.N;i++)admit(0)}
    else if(p.lam>0)push(expo(1/rate(0)),'arr',null);
    dispatch(0);
    while(ev.a.length){const e=ev.pop();if(e.t>H)break;
      while(nextS<=e.t&&nextS<=H){area+=depth*(nextS-tl);tl=nextS;sample(nextS);nextS+=1}
      area+=depth*(e.t-tl);tl=e.t;const t=e.t,x=e.x;
      if(e.k==='arr'){admit(t);if(t<p.T)push(t+expo(1/rate(t)),'arr',null);dispatch(t)}
      else if(e.k==='vis'){const m=msgs[x.m];if(!m.done&&m.claim===x.c&&m.vis===false){m.vis=true;inflight--;ready.push(m.id);dispatch(t)}}
      else if(e.k==='done'){const m=msgs[x.m];
        if(m.poison){st.poisonFails++;W[x.w]=0;dispatch(t);continue}
        if(p.idem&&m.eff>=1)st.dedup++;else{m.eff++;st.effects++;if(m.eff>1)st.duplicates++}
        if(x.crash){st.crashes++;W[x.w]=2;push(t+p.Rs,'up',{w:x.w})}
        else{if(!m.done){m.done=true;depth--;st.completed++;lat.push(t-m.t0);if(m.vis===false)inflight--}else st.lateAcks++;W[x.w]=0}
        dispatch(t)}
      else if(e.k==='up'){W[x.w]=0;dispatch(t)}}
    while(nextS<=H){area+=depth*(nextS-tl);tl=nextS;sample(nextS);nextS+=1}
    lat.sort((a,b)=>a-b);const q=f=>lat.length?lat[Math.min(lat.length-1,Math.floor(f*lat.length))]:0;
    const meanW=lat.length?lat.reduce((a,b)=>a+b,0)/lat.length:0;
    st.left=depth;st.L=area/H;st.X=st.completed/H;st.Wmean=meanW;st.p50=q(.5);st.p99=q(.99);st.H=H;
    st.maxAge=samples.reduce((a,s)=>Math.max(a,s.age),0);
    return {st:st,samples:samples}}
  root.QSIM={run:run,rng:rng};
})(typeof window!=='undefined'?window:globalThis);
