// ---- Shared simulation engine (used by the Reading animation and the Resilience lab) ----
// One millisecond per step, deterministic (seeded LCG, no Math.random, no logarithms), so that
// src/recompute.py (a line-by-line Python port) reproduces every number exactly.
// Model: users -> our service (W worker slots, FIFO queue, optional bound = load shedding)
//        -> for type-A requests, a call to a dependency (Kd slots, FIFO queue, latency that
//        rises during the slowdown window), with a client timeout, retries (none, immediate,
//        exponential backoff with full jitter), gRPC-style retry throttling, a count-based
//        circuit breaker and an optional fallback (degraded answer).
// The dependency never notices that a caller gave up, unless deadline propagation is on.
window.RE=(function(){
  function lcg(seed){let s=seed>>>0;return function(){s=(Math.imul(s,1103515245)+12345)&0x7fffffff;return s/2147483648}}
  const DEF={T:40000,slowFrom:10000,slowTo:15000,rate:100,pA:1,W:0,own:0,maxQ:0,Tu:0,
    Kd:4,dmaxQ:0,Ld:25,Ls:100,Td:100,att:3,back:'none',base:100,cap:2000,budget:0,tokMax:10,tokRatio:0.1,
    brk:0,brkN:20,brkF:50,brkOpen:5000,brkHalf:5,fb:0,drop:0,seed:1};
  function sim(cfg){
    const c=Object.assign({},DEF,cfg);
    const rnd=lcg(c.seed*7919+17),jit=lcg(c.seed*104729+3);
    const NS=Math.ceil(c.T/1000)+6,END=c.T+6000;
    const z=()=>new Array(NS).fill(0);
    const S={arr:z(),good:z(),deg:z(),fail:z(),att:z(),q:z(),dq:z(),open:z(),waste:z(),depdone:z(),shed:z(),failB:z(),wdep:z()};
    const sec=t=>Math.min(NS-1,Math.floor(t/1000));
    const ev=new Map();const at=(t,e)=>{let a=ev.get(t);if(!a){a=[];ev.set(t,a)}a.push(e)};
    const Q=[];let qh=0;const DQ=[];let dqh=0;
    let busyW=0,busyD=0,tokens=c.tokMax,inDep=0;
    const unlimitedW=c.W<=0;
    // breaker
    let bst=0,bwin=[],bopenUntil=0,bhalfLeft=0,bhalfRes=[];// 0 closed, 1 open, 2 half-open
    let nReq=0,nA=0,nGood=0,nDeg=0,nFail=0,nAtt=0,nDepDone=0,nWaste=0,nShed=0,nBrkRej=0,nLate=0;
    const lat=[];
    function brkAllow(t){if(!c.brk)return true;
      if(bst===1){if(t>=bopenUntil){bst=2;bhalfLeft=c.brkHalf;bhalfRes=[]}else return false}
      if(bst===2){if(bhalfLeft>0){bhalfLeft--;return true}return false}
      return true}
    function brkRecord(t,okk){if(!c.brk)return;
      if(bst===0){bwin.push(okk?0:1);if(bwin.length>c.brkN)bwin.shift();
        if(bwin.length>=c.brkN){let f=0;for(const x of bwin)f+=x;if(f*100>=c.brkF*bwin.length){bst=1;bopenUntil=t+c.brkOpen;bwin=[]}}}
      else if(bst===2){bhalfRes.push(okk?0:1);if(bhalfRes.length>=c.brkHalf){let f=0;for(const x of bhalfRes)f+=x;
        if(f*100>=c.brkF*bhalfRes.length){bst=1;bopenUntil=t+c.brkOpen}else{bst=0;bwin=[]}bhalfRes=[]}}}
    function finish(t,r,kind){// kind: 'good' | 'deg' | 'fail'
      if(r.done)return;r.done=1;
      if(!unlimitedW){busyW--}
      if(r.inDep){inDep--;r.inDep=0}
      if(kind!=='fail'&&c.Tu>0&&t-r.t0>c.Tu){nLate++;kind='late'}
      if(kind==='good'){nGood++;S.good[sec(t)]++;lat.push(t-r.t0)}
      else if(kind==='deg'){nDeg++;S.deg[sec(t)]++;lat.push(t-r.t0)}
      else if(kind==='late'){nFail++;S.fail[sec(r.t0+c.Tu)]++;if(!r.A)S.failB[sec(r.t0+c.Tu)]++}
      else{nFail++;S.fail[sec(t)]++;if(!r.A)S.failB[sec(t)]++}
    }
    function attempt(t,r){
      if(!brkAllow(t)){nBrkRej++;
        if(c.fb)finish(t,r,'deg');else finish(t,r,'fail');return}
      const a={r:r,k:r.k,dl:c.Td>0?t+c.Td:Infinity,over:0};
      nAtt++;S.att[sec(t)]++;
      if(c.dmaxQ>0&&DQ.length-dqh>=c.dmaxQ){nShed++;S.shed[sec(t)]++;attemptEnd(t,a,false);return}
      DQ.push(a);
      if(c.Td>0)at(t+c.Td,{y:3,a:a});
    }
    function attemptEnd(t,a,okk){// first outcome of an attempt (reply or timeout)
      if(a.over)return;a.over=1;const r=a.r;
      brkRecord(t,okk);
      if(c.budget){if(okk)tokens=Math.min(c.tokMax,tokens+c.tokRatio);else tokens=Math.max(0,tokens-1)}
      if(okk){finish(t,r,'good');return}
      if(r.k+1>=c.att||(c.budget&&tokens<=c.tokMax/2)){if(c.fb)finish(t,r,'deg');else finish(t,r,'fail');return}
      r.k++;
      if(c.back==='none'){attempt(t,r);return}
      const range=Math.min(c.cap,c.base*Math.pow(2,r.k));
      const d=Math.max(1,Math.floor(jit()*range));
      at(t+d,{y:4,r:r});
    }
    function startReq(t,r){
      if(c.drop&&c.Tu>0&&t-r.t0>c.Tu){finish(t,r,'fail');return}
      if(c.own>0)at(t+c.own,{y:1,r:r});else afterOwn(t,r);
    }
    function afterOwn(t,r){if(r.A){r.inDep=1;inDep++;attempt(t,r);return}finish(t,r,'good')}
    const thr=c.rate/1000;
    for(let t=0;t<END;t++){
      // 1. arrivals (at most one per millisecond: Bernoulli with p = rate/1000)
      if(t<c.T&&rnd()<thr){const r={t0:t,A:rnd()<c.pA,k:0,done:0};nReq++;if(r.A)nA++;S.arr[sec(t)]++;
        if(unlimitedW){startReq(t,r)}
        else if(c.maxQ>0&&Q.length-qh>=c.maxQ){nShed++;S.shed[sec(t)]++;r.done=1;nFail++;S.fail[sec(t)]++;if(!r.A)S.failB[sec(t)]++}
        else Q.push(r)}
      // 2. events due now, in the order they were scheduled
      const es=ev.get(t);
      if(es){ev.delete(t);for(let i=0;i<es.length;i++){const e=es[i];
        if(e.y===1)afterOwn(t,e.r);
        else if(e.y===2){busyD--;nDepDone++;S.depdone[sec(t)]++;const a=e.a;if(a.over){nWaste++;S.waste[sec(t)]++}else attemptEnd(t,a,true)}
        else if(e.y===3){if(!a_over(e.a))attemptEnd(t,e.a,false)}
        else if(e.y===4){attempt(t,e.r)}}}
      // 3. the dependency starts calls while it has free slots
      while(busyD<c.Kd&&dqh<DQ.length){const a=DQ[dqh++];
        if(c.drop&&a.dl<=t){continue}
        busyD++;const L=(t>=c.slowFrom&&t<c.slowTo)?c.Ls:c.Ld;at(t+L,{y:2,a:a})}
      if(dqh>4096&&dqh*2>DQ.length){DQ.splice(0,dqh);dqh=0}
      // 4. our service starts requests while it has free workers
      if(!unlimitedW){while(busyW<c.W&&qh<Q.length){const r=Q[qh++];busyW++;startReq(t,r)}
        if(qh>4096&&qh*2>Q.length){Q.splice(0,qh);qh=0}}
      // 5. samples
      const s=sec(t);const ql=Q.length-qh,dql=DQ.length-dqh;
      if(ql>S.q[s])S.q[s]=ql;if(inDep>S.wdep[s])S.wdep[s]=inDep;if(dql>S.dq[s])S.dq[s]=dql;
      if(c.brk&&bst===1&&t<bopenUntil)S.open[s]++;
    }
    function a_over(a){return a.over}
    // requests that never finished: the user saw a failure at t0+Tu (or at the end of the run)
    const tot=nGood+nDeg+nFail;const unfinished=nReq-tot;
    // recovery: first second >= slowTo/1000 from which every later second (to T) has good+deg >= 90% of arrivals
    const s0=Math.floor(c.slowTo/1000),sN=Math.floor(c.T/1000);let rec=null;
    for(let s=s0;s<sN;s++){let okk=true;for(let x=s;x<sN;x++){if(S.arr[x]>0&&S.good[x]+S.deg[x]<0.9*S.arr[x]){okk=false;break}}if(okk){rec=s-s0;break}}
    lat.sort((a,b)=>a-b);
    return {S:S,NS:NS,c:c,tot:{req:nReq,A:nA,good:nGood,deg:nDeg,fail:nFail+unfinished,late:nLate,att:nAtt,depDone:nDepDone,waste:nWaste,shed:nShed,brkRej:nBrkRej,
      success:nReq?(nGood+nDeg)/nReq:0,full:nReq?nGood/nReq:0,attPerA:nA?nAtt/nA:0,useful:nDepDone?(nDepDone-nWaste)/nDepDone:0,recovery:rec,
      p50:lat.length?lat[Math.floor(lat.length*0.5)]:null,p99:lat.length?lat[Math.floor(lat.length*0.99)]:null}};
  }
  // presets: the measured setup (validation) and the before/after of the Reading animation
  const P={
    // the measured setup; 28 and 103 ms = the configured 25 and 100 ms plus the ~3 ms per-request overhead measured at low load (p50 27.5 ms)
    m_none:{att:1,Ld:28,Ls:103},
    m_naive:{back:'none',Ld:28,Ls:103},
    m_backoff:{back:'full',Ld:28,Ls:103},
    m_budget:{back:'full',budget:1,Ld:28,Ls:103},
    m_deadline:{back:'none',drop:1,Ld:28,Ls:103},
    m_shed:{back:'none',dmaxQ:8,Ld:28,Ls:103},
    // Reading animation: our chat API (20 workers) calls a model provider that hangs for 5 s
    before:{rate:100,pA:0.5,W:20,own:5,Tu:2000,Kd:1000,Ld:25,Ls:3000,Td:0,att:1,back:'none',brk:0,fb:0,maxQ:0},
    after:{rate:100,pA:0.5,W:20,own:5,Tu:2000,Kd:1000,Ld:25,Ls:3000,Td:100,att:1,back:'none',brk:1,brkN:20,brkF:50,brkOpen:2000,brkHalf:5,fb:1,maxQ:40}
  };
  return {sim:sim,lcg:lcg,DEF:DEF,P:P};
})();
