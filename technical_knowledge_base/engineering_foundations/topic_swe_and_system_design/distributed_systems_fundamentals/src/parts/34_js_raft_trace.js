// ---- The Raft trace that drives Fig. 3 (no DOM): the page's own Raft model (31_js_raft_model.js, seed 11) run through eight stretches
// (an election, writes, a leader crash, a restart, a split with the leader on the small side, healing, losing the majority). Every event is
// recorded: each server's role, term, log and commit index after it, and every message with the times it was sent and delivered or dropped.
// The step list's numbers (who won which term, how many ms after the crash, which entries commit or are overwritten) come from DSF_RTRACE.facts;
// check_stages.mjs compares them with the step list, and check_raft.mjs asserts Raft's safety properties after every event of this trace.
window.DSF_RTRACE=(function(){
  if(!window.RAFT)return null;
  const SEED=11,sim=window.RAFT.create(SEED),N=sim.P.n,notes=[];
  const snaps=[],msgs=[],live=new Map(),stretches=[],F={};
  const lead=()=>sim.leader();
  const snap=()=>{snaps.push({t:sim.now,g:sim.group?sim.group.slice():null,S:sim.S.map(s=>({role:s.role,term:s.term,alive:s.alive,commit:s.commit,dl:s.deadline,eto:s.eto,log:s.log.map(e=>[e.term,e.cmd])}))})};
  // messages: picked up when they appear in sim.msgs; their end is the delivery time, or the moment a crash removed them
  const track=()=>{const now=new Set(sim.msgs);sim.msgs.forEach(m=>{if(!live.has(m)){const r={a:m.from,b:m.to,k:m.k,t0:m.sent,t1:m.at};live.set(m,r);msgs.push(r)}});
    live.forEach((r,m)=>{if(!now.has(m)){if(sim.now<r.t1)r.t1=sim.now;live.delete(m)}})};
  const ev=()=>{const k=sim.log.length?sim.log[sim.log.length-1]:null;sim.step();track();snap();for(let i=sim.log.length-1;i>=0&&sim.log[i]!==k;i--)notes.unshift(sim.log[i]);notes.sort((a,b)=>a.t-b.t)};
  function run(cond,max){const t1=sim.now+max;while(true){const nx=sim.nextAt();if(!isFinite(nx)||nx>t1){sim.runTo(t1);track();snap();return}ev();if(cond&&cond())return}}
  const allCommitted=()=>{const L=lead();return L&&L.commit===L.log.length&&sim.S.filter(s=>s.alive&&sim.conn(s.id,L.id)).every(s=>s.commit===L.commit&&s.log.length===L.log.length)};
  function stretch(fn){const t0=sim.now,i0=Math.max(0,snaps.length-1);fn();stretches.push({t0,t1:sim.now,i0,i1:snaps.length-1})}
  snap();
  // 1. five followers, timers draining: up to just before the first timeout
  stretch(()=>{const t=Math.min(...sim.S.map(s=>s.deadline))-1;sim.runTo(t);snap();F.firstTimeout=t+1;F.firstServer=sim.S.reduce((a,s)=>s.deadline<a.deadline?s:a).id});
  // 2. an election: the first candidate, its votes, the leader's no-op committed
  stretch(()=>{run(()=>{const L=lead();return L&&L.commit>=1},3000);const L=lead();F.l1=L.id;F.l1term=L.term;F.l1at=Math.round(sim.now);
    const c=sim.log.find(x=>/becomes candidate/.test(x.m));F.cand1=c?+c.m.match(/^S(\d)/)[1]-1:null;
    const c1=notes.filter(x=>/candidate for term 1 /.test(x.m));F.cands1=c1.map(x=>+x.m.match(/^S(\d)/)[1]-1);F.cands1span=Math.round(c1[c1.length-1].t-c1[0].t);
    F.l1won=Math.round(notes.find(x=>/leader for term 2;/.test(x.m)).t)});
  // 3. three client writes commit
  stretch(()=>{F.c1=sim.write();run(allCommitted,2000);sim.write();sim.write();run(allCommitted,2000);F.len3=lead().log.length});
  // 4. crash the leader; a new election for a higher term
  stretch(()=>{const L=lead();F.old=L.id;F.oldTerm=L.term;const t0=sim.now;sim.crash(L.id);snap();
    run(()=>{const L=lead();return L&&L.term>F.oldTerm&&L.commit===L.log.length},4000);const N2=lead();F.l2=N2.id;F.l2term=N2.term;F.l2ms=Math.round(sim.now-t0);F.len4=N2.log.length});
  // 5. a write with four servers, then the old leader restarts and catches up
  stretch(()=>{F.c5=sim.write();run(allCommitted,2000);sim.restart(F.old);snap();
    run(()=>{const L=lead(),s=sim.S[F.old];return L&&s.log.length===L.log.length&&s.commit===L.commit},3000);F.len5=lead().log.length});
  // 6. a split: the leader and one follower on the small side; two writes there never commit; the majority elects a new leader
  stretch(()=>{const L=lead();F.ml=L.id;F.mterm=L.term;F.mf=sim.S.find(s=>s.id!==L.id&&s.alive).id;const g=[0,0,0,0,0];g[L.id]=1;g[F.mf]=1;sim.partition(g);snap();
    F.c6a=sim.write(L.id);F.c6b=sim.write(L.id);snap();F.minLen=sim.S[L.id].log.length;
    run(()=>sim.S.some(s=>s.alive&&s.role==='leader'&&s.term>F.mterm&&s.commit===s.log.length),4000);
    const M=sim.S.filter(s=>s.alive&&s.role==='leader').sort((a,b)=>b.term-a.term)[0];F.nl=M.id;F.nlterm=M.term;F.mlCommit=sim.S[F.ml].commit});
  // 7. a write on the majority side, then the network heals: the old leader steps down and its two entries are overwritten
  stretch(()=>{F.c7=sim.write(F.nl);const healAt=sim.now+300;
    run(()=>{if(sim.group&&sim.now>=healAt){sim.partition(null);snap()}return !sim.group&&allCommitted()&&sim.S.every(s=>!s.alive||s.log.length===sim.S[F.nl].log.length)},5000);
    F.len7=sim.S[F.nl].log.length;F.final=sim.S[F.nl].log.map(e=>e.cmd);
    F.lostKept=sim.S.some(s=>s.log.some(e=>e.cmd===F.c6a||e.cmd===F.c6b))});
  // 8. lose the majority: three of five down; the two survivors time out again and again, terms climb, no leader
  stretch(()=>{const alive=sim.S.filter(s=>s.alive).map(s=>s.id),L=lead(),order=alive.filter(i=>!L||i!==L.id);sim.crash(order[0]);sim.crash(order[1]);if(L)sim.crash(L.id);snap();
    F.down=sim.S.filter(s=>!s.alive).map(s=>s.id);F.termBefore=Math.max(...sim.S.filter(s=>s.alive).map(s=>s.term));run(()=>false,1500);
    F.termAfter=Math.max(...sim.S.filter(s=>s.alive).map(s=>s.term));F.leaderAtEnd=!!lead();F.refused=sim.write()===null});
  // the state at simulated time t within stretch k (a stretch that starts with a crash or a split must not show it at the end of the one before)
  function at(t,k){const S=k==null?{i0:0,i1:snaps.length-1}:stretches[k];let lo=S.i0,hi=S.i1;while(lo<hi){const m=(lo+hi+1)>>1;if(snaps[m].t<=t)lo=m;else hi=m-1}return snaps[lo]}
  return {snaps,msgs,stretches,facts:F,at,N,SEED,notes};
})();
