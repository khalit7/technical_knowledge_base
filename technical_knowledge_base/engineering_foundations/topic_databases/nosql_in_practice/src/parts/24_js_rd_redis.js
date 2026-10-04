// ---- Section 3 (Redis): measured numbers, the rate-limit race, streams, persistence, replication ----
(function(){
  const R=NQ.redis; if(!R)return;
  const el=id=>document.getElementById(id), f0=n=>Math.round(n).toLocaleString('en-US'), S=RD.stat;
  const b=R.benchmark;
  el('rd-redis-nums').innerHTML=S('GET round trip','<span>'+R.get_us.p50+' µs</span>','median of '+f0(R.get_us.n)+'; p99 '+R.get_us.p99+' µs')+
    S('SET, 1 client',f0(b.set_c1_P1)+'/s','one command per round trip')+S('SET, 50 clients',f0(b.set_c50_P1)+'/s','redis-benchmark')+
    S('SET, 50 clients, pipeline 16',f0(b.set_c50_P16)+'/s','16 commands per round trip')+S('ZADD, 50 clients',f0(b.zadd_c50_P1)+'/s','')+S('XADD, 50 clients',f0(b.xadd_c50_P1)+'/s','');
  const rl=R.ratelimit;
  el('rd-rl-nums').innerHTML=S('Limit',rl.capacity,'requests allowed')+S('Attempts',f0(rl.attempts),rl.clients+' processes x 50')+
    S('Read, decide, write (app)','<span style="color:var(--bad)">'+rl.naive_allowed+' allowed</span>',(rl.naive_allowed/rl.capacity).toFixed(1)+'x the limit')+
    S('Lua token bucket','<span style="color:var(--good)">'+rl.lua_allowed+' allowed</span>','exactly the limit');
  function bars(){
    const svg=el('rd-rl-svg'), w=RD.width(svg), max=Math.max(rl.naive_allowed,rl.capacity), x0=Math.min(170,w*.38), bw=w-x0-60;
    const row=(y,lab,v,c)=>RD.t(8,y+13,lab,{fs:11.5})+'<rect x="'+x0+'" y="'+y+'" width="'+Math.max(2,bw*v/max).toFixed(1)+'" height="18" rx="3" fill="'+c+'"/>'+RD.t(x0+bw*v/max+6,y+13,v,{fs:11.5,w:600});
    let s=row(4,'Limit',rl.capacity,'var(--dim)')+row(28,'Read, decide, write',rl.naive_allowed,'var(--bad)')+row(52,'Lua token bucket',rl.lua_allowed,'var(--good)');
    s+='<line x1="'+(x0+bw*rl.capacity/max)+'" y1="0" x2="'+(x0+bw*rl.capacity/max)+'" y2="74" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    svg.innerHTML=RD.svg(w,78,s,'Requests allowed through a limit of 20');
  }
  bars(); RD.onResize(bars); RD.onRender(bars);
  el('rd-rl-script').textContent=rl.script;
  const st=R.streams, ids=st.ids;
  el('rd-stream-steps').innerHTML=[
    'Three jobs are added with <code>XADD jobs * chat 101 task summarise</code> (and chats 102, 103); Redis gives them ids <code>'+ids.join('</code>, <code>')+'</code> (milliseconds since 1970, then a sequence number).',
    'Consumer <code>worker-a</code> in group <code>workers</code> reads two: <code>'+st.worker_a_read.join('</code> and <code>')+'</code>. It acknowledges the first with <code>XACK</code>, then crashes.',
    '<code>XPENDING</code> shows the second still owned by worker-a: '+st.pending_after_crash.map(p=>'<code>'+p.id+'</code>, delivered '+p.deliveries+' time').join('; ')+'.',
    'After it has been idle for 100 ms, <code>worker-b</code> runs <code>XAUTOCLAIM jobs workers worker-b 100 0-0</code> and takes over <code>'+st.worker_b_claimed.join(', ')+'</code>; its next <code>XREADGROUP</code> gets the never-delivered <code>'+st.worker_b_new.join(', ')+'</code>.'
  ].map(x=>'<li>'+x+'</li>').join('');
  const cr={};R.crash.forEach(c=>cr[c.label]=c);
  el('rd-persist').innerHTML='<table><tr><th>Setting</th><th class="num">SET/s, 1 client</th><th class="num">SET/s, 50 clients</th><th>After kill -9</th></tr>'+R.persistence.map(p=>{
    const c=p.label.startsWith('RDB')?cr['RDB snapshots only']:p.label.indexOf('everysec')>=0?cr['AOF everysec']:null;
    return '<tr><td>'+p.label+'</td><td class="num">'+f0(p.set_c1)+'</td><td class="num">'+f0(p.set_c50)+'</td><td>'+(c?f0(c.acked)+' acknowledged, '+f0(c.recovered)+' recovered: <b style="color:var('+(c.lost?'--bad':'--good')+')">'+f0(c.lost)+' lost</b>'+(c.lost?' (no snapshot had been taken yet)':''):'not tested')+'</td></tr>'}).join('')+'</table>';
  const rp=R.replication;
  el('rd-repl-nums').innerHTML=S('Before the pause',f0(rp.before_acked)+' writes','all '+f0(rp.before_on_replica)+' on the replica (WAIT returned '+rp.wait_before+')')+
    S('During the pause',f0(rp.during_acked)+' acknowledged','each got OK from the primary')+S('WAIT 1 500',rp.wait_during,'replicas that confirmed')+
    S('After failover','<span style="color:var(--bad)">'+f0(rp.lost)+' lost</span>','only '+rp.during_survived+' of '+f0(rp.during_acked)+' reached the replica');
  const one=el('one-repl'); if(one)one.textContent=f0(rp.lost)+' of '+f0(rp.during_acked);
})();
