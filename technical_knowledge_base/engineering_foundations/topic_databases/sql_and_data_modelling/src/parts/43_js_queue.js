// ---- Reading, section 11: the lock queue, replayed from three measured runs (inputs/queue.json) ----
(function(){
  const svgEl=document.getElementById('rd-q-svg');if(!svgEl)return;
  const Q=window.SM_DATA.queue,esc=RD.esc;
  const T1=4.5,DT=0.1,NST=Math.round(T1/DT)+1;
  let mode='long';
  const lanes=()=>{const ev=Q.scenarios[mode].events;const names=[];ev.forEach(e=>{if(!names.includes(e.who))names.push(e.who)});
    const order=['Long transaction','Migration'];return order.filter(n=>names.includes(n)).concat(names.filter(n=>!order.includes(n)).sort())};
  function draw(i){
    const t=Math.min(T1,i*DT),sc=Q.scenarios[mode],ev=sc.events,L=lanes();
    const W=RD.width(svgEl),lab=W<420?92:122,pw=W-lab-6,lh=20,top=18,x=s=>lab+pw*Math.min(s,T1)/T1;
    let s='';
    for(let k=0;k<=T1;k+=0.5){const xx=x(k);s+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(top-4)+'" y2="'+(top+L.length*lh)+'" stroke="var(--line)"/>'+RD.t(xx,11,k.toFixed(1)+' s',{fs:9.5,a:k===0?'start':k>=T1?'end':'middle',fill:'var(--mute)'})}
    L.forEach((nm,li)=>{const y=top+li*lh;s+=RD.t(0,y+13,nm,{fs:11,w:nm==='Migration'?600:400});
      ev.filter(e=>e.who===nm).forEach(e=>{if(e.start>t)return;const end=Math.min(e.end,t),x0=x(e.start),x1=Math.max(x0+2,x(end));
        let col='var(--dim)';
        if(e.kind==='read')col=(end-e.start)>0.1?'var(--bad)':'var(--good)';
        if(e.kind==='alter')col=e.outcome==='lock_timeout'?'var(--c5)':'var(--c4)';
        s+='<rect x="'+x0+'" y="'+(y+3)+'" width="'+(x1-x0)+'" height="'+(lh-6)+'" rx="3" fill="'+col+'" opacity="'+(e.kind==='txn'?0.7:0.9)+'"/>';
        if(e.end<=t&&e.kind==='alter'&&e.outcome==='lock_timeout')s+=RD.t(x1+3,y+13,'gave up',{fs:9.5,fill:'var(--c5)'});
        if(e.end<=t&&e.kind==='read'&&e.wait>0.1&&W>=420)s+=RD.t(x1+3,y+13,e.wait.toFixed(2)+' s',{fs:9.5,fill:'var(--bad)'});});});
    s+='<line x1="'+x(t)+'" x2="'+x(t)+'" y1="'+(top-6)+'" y2="'+(top+L.length*lh+2)+'" stroke="var(--ink)" stroke-width="1.5"/>';
    svgEl.innerHTML=RD.svg(W,top+L.length*lh+6,s,'Sessions on messages_big over time');
    const reads=ev.filter(e=>e.kind==='read');
    const waiting=reads.filter(e=>e.start<=t&&e.end>t&&t-e.start>0.05).length,done=reads.filter(e=>e.end<=t).length;
    const worst=Math.max(0,...reads.filter(e=>e.start<=t).map(e=>Math.min(e.end,t)-e.start));
    const al=ev.filter(e=>e.kind==='alter'),aldone=al.find(e=>e.outcome==='done'&&e.end<=t);
    document.getElementById('rd-q-cnt').innerHTML=RD.stat('Time',t.toFixed(1)+' s')+RD.stat('Reads finished',done+' of '+reads.length)+RD.stat('Reads waiting now',waiting)+RD.stat('Longest read wait so far',worst.toFixed(2)+' s')+RD.stat('ALTER',aldone?'done at '+aldone.end.toFixed(2)+' s':(al.some(e=>e.start<=t)?'waiting (attempt '+Math.max(...al.filter(e=>e.start<=t).map(e=>e.attempt))+')':'not started'));
    let c;
    if(mode==='quick'){c=t<0.5?'No other transaction is using the table. At 0.5 s the migration asks for ACCESS EXCLUSIVE.':t<0.75?'The lock is granted at once and the ALTER finishes in about 1 ms: the default is stored in the catalog, not written to 2,000,000 rows.':'Every read runs in about a millisecond. This is the run people test in development, and why the outage in the first scenario surprises them.'}
    else if(mode==='long'){c=t<0.5?'A transaction (a slow report, or a request waiting on a model call) has read the table and stays open for 4 s, holding a weak ACCESS SHARE lock.':t<0.75?'The migration asks for ACCESS EXCLUSIVE, which conflicts with every lock, so it waits for the long transaction.':t<4.0?'Each new read needs only ACCESS SHARE, compatible with the long transaction, but it is queued behind the waiting ALTER. Reads that normally take 1 ms now wait. A snapshot at 2.2 s shows them waiting on Lock: relation.':'The long transaction commits; the ALTER gets its lock and finishes in a millisecond; every queued read then runs at once. Total: '+sc.summary.reads_over_100ms+' reads delayed, up to '+sc.summary.max_read_wait.toFixed(2)+' s each, for a 1 ms change.'}
    else{c=t<0.5?'The same long transaction. This time the migration session first runs SET lock_timeout = ’500ms’.':t<1.05?'The ALTER waits, and reads queue behind it, but only until the timeout: at about 1.0 s it gives up, and the waiting read proceeds.':t<2.0?'Between attempts, reads run normally in about 1 ms. The migration sleeps 1 s and retries.':t<3.5?'The second attempt also times out. A read that arrived during the attempt waited at most the timeout.':'The third attempt is waiting when the long transaction commits, so it gets the lock and finishes. Worst read wait: '+sc.summary.max_read_wait.toFixed(2)+' s instead of '+Q.scenarios.long.summary.max_read_wait.toFixed(2)+' s.'}
    document.getElementById('rd-q-cap').innerHTML='<div class="t">'+({long:'No lock_timeout',timeout:'lock_timeout 500 ms and retry',quick:'No long transaction'})[mode]+', t = '+t.toFixed(1)+' s</div><p>'+c+'</p>';
    const sn=sc.snapshot&&sc.snapshot.waiting_locks||[];
    document.getElementById('rd-q-note').innerHTML=sn.length?'Snapshot of <code>pg_locks</code> taken at 2.2 s in this run: '+sn.map(r=>esc(r[0])+(r[1]?' granted':' <b>waiting</b>')+' ('+esc(r[2].split(' FROM')[0].slice(0,24))+')').join('; ')+'. Recorded '+esc(Q.date)+' on PostgreSQL '+esc(Q.postgres)+'; median of 3 runs per scenario.':'Recorded '+esc(Q.date)+' on PostgreSQL '+esc(Q.postgres)+'; median of 3 runs per scenario.';
  }
  const A=RD.anim({card:'rd-q-card',ctl:'rd-q-ctl',n:NST,ms:260,label:'Time',draw});
  RD.seg(document.getElementById('rd-q-mode'),m=>{mode=m;A.reset(NST);A.play()});
  RD.onResize(()=>A.redraw());
})();
