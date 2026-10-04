// ---- Raft lab: the simulation model (no DOM). Follows Ongaro and Ousterhout, "In Search of an Understandable Consensus
// Algorithm (Extended Version)", Figure 2: terms, RequestVote with the up-to-date check, AppendEntries with the consistency
// check, commit only by counting replicas of current-term entries, and a no-op entry at the start of each term (section 8).
// Times are simulated milliseconds. Deterministic for a given seed. Checked for safety by src/check_raft.mjs.
window.RAFT=(function(){
  const P={n:5,etoMin:150,etoMax:300,hb:50,latMin:12,latMax:24};
  function rng(seed){let a=seed>>>0;return ()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296}}
  function create(seed){
    const R=rng(seed||7),S=[],msgs=[],log=[];let now=0,cmdN=0,group=null;const leadersByTerm={};
    const rint=(a,b)=>a+Math.floor(R()*(b-a+1));
    for(let i=0;i<P.n;i++)S.push({id:i,role:'follower',term:0,voted:null,log:[],commit:0,alive:true,deadline:rint(P.etoMin,P.etoMax),eto:0,votes:new Set(),next:[],match:[],hbAt:0,leader:null,since:0});
    S.forEach(s=>s.eto=s.deadline);
    const lastIdx=s=>s.log.length,lastTerm=s=>s.log.length?s.log[s.log.length-1].term:0;
    const note=(t)=>{log.push({t:now,m:t});if(log.length>60)log.shift()};
    const conn=(a,b)=>!group||group[a]===group[b];
    function send(from,to,m){if(!S[from].alive)return;m.from=from;m.to=to;m.sent=now;m.at=now+rint(P.latMin,P.latMax);msgs.push(m)}
    function resetTimer(s){s.eto=rint(P.etoMin,P.etoMax);s.deadline=now+s.eto}
    function stepDown(s,term){if(term>s.term){s.term=term;s.voted=null}if(s.role!=='follower'){s.role='follower';s.votes=new Set()}}
    function startElection(s){s.term++;s.role='candidate';s.voted=s.id;s.votes=new Set([s.id]);s.leader=null;resetTimer(s);
      note('S'+(s.id+1)+' heard no leader for '+s.eto+' ms: becomes candidate for term '+s.term+' and asks for votes');
      S.forEach(o=>{if(o.id!==s.id)send(s.id,o.id,{k:'RV',term:s.term,li:lastIdx(s),lt:lastTerm(s)})})}
    function becomeLeader(s){s.role='leader';s.leader=s.id;s.next=S.map(()=>lastIdx(s)+1);s.match=S.map(()=>0);
      (leadersByTerm[s.term]=leadersByTerm[s.term]||[]).push(s.id);
      s.log.push({term:s.term,cmd:'no-op'});s.match[s.id]=lastIdx(s);
      note('S'+(s.id+1)+' has votes from a majority: leader for term '+s.term+'; appends a no-op entry');
      heartbeat(s)}
    function heartbeat(s){s.hbAt=now+P.hb;S.forEach(o=>{if(o.id===s.id)return;const ni=s.next[o.id],pi=ni-1;
      send(s.id,o.id,{k:'AE',term:s.term,pi:pi,pt:pi>0?s.log[pi-1].term:0,ent:s.log.slice(pi).map(e=>({term:e.term,cmd:e.cmd})),lc:s.commit})})}
    function advanceCommit(s){for(let N=lastIdx(s);N>s.commit;N--){if(s.log[N-1].term!==s.term)continue;
        let c=0;S.forEach(o=>{if((o.id===s.id?lastIdx(s):s.match[o.id])>=N)c++});
        if(c>P.n/2){const old=s.commit;s.commit=N;note('Entry '+N+' is on '+c+' of '+P.n+' servers: S'+(s.id+1)+' commits '+(N-old>1?'entries '+(old+1)+' to '+N:'it'));break}}}
    function deliver(m){const s=S[m.to];if(!s.alive||!conn(m.from,m.to))return;
      if(m.term>s.term){const was=s.role;stepDown(s,m.term);if(was==='leader')note('S'+(s.id+1)+' sees term '+m.term+' and steps down');}
      if(m.k==='RV'){let g=false;
        if(m.term>=s.term&&(s.voted===null||s.voted===m.from)){const ok=m.lt>lastTerm(s)||(m.lt===lastTerm(s)&&m.li>=lastIdx(s));
          if(ok){g=true;s.voted=m.from;resetTimer(s)}else note('S'+(s.id+1)+' refuses S'+(m.from+1)+': its own log is more up to date')}
        send(s.id,m.from,{k:'RVR',term:s.term,g:g})}
      else if(m.k==='RVR'){if(s.role==='candidate'&&m.term===s.term&&m.g){s.votes.add(m.from);if(s.votes.size>P.n/2)becomeLeader(s)}}
      else if(m.k==='AE'){if(m.term<s.term){send(s.id,m.from,{k:'AER',term:s.term,ok:false,mi:0});return}
        if(s.role!=='follower')stepDown(s,m.term);s.leader=m.from;resetTimer(s);
        if(m.pi>lastIdx(s)||(m.pi>0&&s.log[m.pi-1].term!==m.pt)){send(s.id,m.from,{k:'AER',term:s.term,ok:false,mi:0});return}
        let idx=m.pi;for(const e of m.ent){idx++;if(s.log.length>=idx&&s.log[idx-1].term!==e.term){
            if(idx<=s.commit)throw new Error('raft: overwriting committed entry');
            note('S'+(s.id+1)+' drops its uncommitted entries from '+idx+' on: they conflict with the leader');s.log.length=idx-1}
          if(s.log.length<idx)s.log.push({term:e.term,cmd:e.cmd})}
        if(m.lc>s.commit)s.commit=Math.min(m.lc,m.pi+m.ent.length);
        send(s.id,m.from,{k:'AER',term:s.term,ok:true,mi:m.pi+m.ent.length})}
      else if(m.k==='AER'){if(s.role!=='leader'||m.term!==s.term)return;
        if(m.ok){s.match[m.from]=Math.max(s.match[m.from],m.mi);s.next[m.from]=s.match[m.from]+1;advanceCommit(s)}
        else s.next[m.from]=Math.max(1,s.next[m.from]-1)}}
    // the time of the next thing that will happen
    function nextAt(){let t=Infinity;msgs.forEach(m=>{if(m.at<t)t=m.at});
      S.forEach(s=>{if(!s.alive)return;const d=s.role==='leader'?s.hbAt:s.deadline;if(d<t)t=d});return t}
    function runTo(t){let guard=0;while(true){const nx=nextAt();if(nx>t)break;now=nx;fire();if(++guard>100000)throw new Error('raft: runaway')}now=Math.max(now,t)}
    function fire(){const due=msgs.filter(m=>m.at<=now).sort((a,b)=>a.at-b.at||a.sent-b.sent);
      due.forEach(m=>{msgs.splice(msgs.indexOf(m),1);deliver(m)});
      S.forEach(s=>{if(!s.alive)return;if(s.role==='leader'){if(s.hbAt<=now)heartbeat(s)}else if(s.deadline<=now)startElection(s)})}
    function step(){const nx=nextAt();if(!isFinite(nx))return false;now=nx;fire();return true}
    function write(target){let s=target!=null?S[target]:null;
      if(!s){const L=S.filter(x=>x.alive&&x.role==='leader').sort((a,b)=>b.term-a.term);s=L[0]}
      if(!s||!s.alive||s.role!=='leader'){note('Client write: no reachable leader, so the write is refused (retry later)');return null}
      cmdN++;const c='x='+cmdN;s.log.push({term:s.term,cmd:c});s.match[s.id]=lastIdx(s);note('Client sends '+c+' to S'+(s.id+1)+' (leader, term '+s.term+'): appended at index '+lastIdx(s));heartbeat(s);return c}
    function crash(i){const s=S[i];if(!s.alive)return;s.alive=false;note('S'+(i+1)+' crashes'+(s.role==='leader'?' (it was the leader)':''));s.role='follower';s.votes=new Set();
      for(let k=msgs.length-1;k>=0;k--)if(msgs[k].to===i||msgs[k].from===i)msgs.splice(k,1)}
    function restart(i){const s=S[i];if(s.alive)return;s.alive=true;s.role='follower';s.commit=0;s.leader=null;resetTimer(s);
      note('S'+(i+1)+' restarts as a follower; it kept its term ('+s.term+'), vote and log on disk')}
    function partition(g){group=g;note(g?'Network split: {'+S.filter(s=>g[s.id]===0).map(s=>'S'+(s.id+1)).join(', ')+'} | {'+S.filter(s=>g[s.id]===1).map(s=>'S'+(s.id+1)).join(', ')+'}':'Network healed: everyone can talk again')}
    function leader(){const L=S.filter(x=>x.alive&&x.role==='leader').sort((a,b)=>b.term-a.term);return L.length?L[0]:null}
    return {S,msgs,log,P,get now(){return now},get group(){return group},nextAt,runTo,step,write,crash,restart,partition,leader,leadersByTerm,conn};
  }
  return {create,P};
})();
