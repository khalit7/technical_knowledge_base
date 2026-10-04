// ---- Measured numbers into the Reading text, the shard-key table, resharding bars, rebalance and CockroachDB figures ----
(function(){
  const S=window.SC;if(!S)return;const C=S.citus;
  const f=(x,d)=>x.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const pct=x=>f(100*x,1);
  const ring=S.reshard.balance.ring4,rt=ring.reduce((a,b)=>a+b,0);
  const K={emailCitus:f(C.point.login_email.citus.p50,2),emailBig:f(C.point.login_email.big.p50,3),emailX:f(C.point.login_email.citus.p50/C.point.login_email.big.p50,0),
    repart:f(C.repart,0),joinBig:f(C.joinBig,0),tx1:f(C.tx.one_shard.p50,2),tx2:f(C.tx.two_nodes_2pc.p50,2),tx2p99:f(C.tx.two_nodes_2pc.p99,1),
    rsMod:pct(S.reshard.mod.msgs_pct),rsRing:pct(S.reshard.ring64.msgs_pct),rsRingMin:pct(Math.min(...ring)/rt),rsRingMax:pct(Math.max(...ring)/rt),
    rsLog:pct(S.reshard.logical48.msgs_pct),kc:pct(S.keyChange.pct)};
  if(S.crdb){K.crStale=f(S.crdb.stale,1);K.crP50=f(S.crdb.lat.crdb.p50,1);K.pgP50=f(S.crdb.lat.postgres.p50,2);if(S.crdb.lat.postgres_flush)K.pgFlush=f(S.crdb.lat.postgres_flush.p50,1)}
  document.querySelectorAll('.m[data-k]').forEach(e=>{const v=K[e.dataset.k];e.textContent=v===undefined?'(not measured)':v});
  // shard-key table (8 shards)
  const b8=S.lab.byN['8'];const mx=(k,j)=>{const a=b8[k][j],t=a.reduce((x,y)=>x+y,0);return t?Math.max(...a)/t:0};
  const rows=[['By user (hash)','user_hash','chat list, open a chat, send, delete account','login by email, admin search, global dashboard'],
    ['By chat (hash)','chat_hash','open a chat, send','chat list, delete account, login, search, dashboard'],
    ['By country (a coarse, tenant-like key)','country','country residency, per-country reports','everything per user is single-shard too, but one shard holds the US'],
    ['By user id range','user_range','same as by user','same as by user'],
    ['By month (time range)','month_range','"last week" reports','almost everything per user or chat']];
  const tb=document.getElementById('skTable');
  if(tb)tb.innerHTML=rows.map(r=>{const s=mx(r[1],0),w=mx(r[1],1);const bad=x=>x>0.2?' style="color:var(--bad);font-weight:600"':'';
    return '<tr><td><b>'+r[0]+'</b></td><td>'+r[2]+'</td><td>'+r[3]+'</td><td class="num"'+bad(s)+'>'+pct(s)+'%</td><td class="num"'+bad(w)+'>'+pct(w)+'%</td></tr>'}).join('');
  // resharding bars
  const rb=document.getElementById('rsBars');
  if(rb){const it=[['hash mod N',S.reshard.mod],['consistent hashing (64 points)',S.reshard.ring64],['48 logical shards, 12 moved',S.reshard.logical48]];
    rb.innerHTML=it.map(([n,v])=>'<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*v.msgs_pct)+'%;background:var(--c2)"></span></span><span class="val">'+pct(v.msgs_pct)+'%</span></div>').join('')+
      '<p class="small mute">Share of the 10,000,000 messages whose shard changes going from 3 to 4 shards (users: '+it.map(([n,v])=>f(v.users,0)).join(', ')+' of 100,000). Counted by <code>src/measure/labdata.py</code>.</p>'}
  // rebalance
  const R=C.rebalance,D=C.drain;const rn=document.getElementById('rbNums');
  if(rn&&R){rn.innerHTML=RD.stat('Rebalance time',f(R.seconds,1)+' s','3 to 4 workers')+RD.stat('Shard groups moved',String(R.moved_shards_messages),'of 32; now 8 per worker')+
      RD.stat('Data moved (messages)',f(R.moved_mb_messages,0)+' MB','of '+f(R.total_mb_messages,0)+' MB, '+pct(R.moved_mb_messages/R.total_mb_messages)+'%')+
      RD.stat('Inserts during the move',f(R.writes_ok,0),R.writes_err+' errors')+RD.stat('Insert latency',f(R.write_p50,2)+' ms','median; p99 '+f(R.write_p99,2)+' ms, worst '+f(R.write_max,0)+' ms');
    document.getElementById('rbNote').textContent='Shard sizes include indexes. To time a clean run, the fourth worker was first drained back to three ('+(D?f(D.seconds,1)+' s, '+f(D.writes_ok,0)+' inserts during it':'')+'), then the rebalance above was run; the one error during the drain was a duplicate id left over from an earlier aborted test run, not the move. All five servers on one laptop: on real machines the copy is limited by network and disk instead.'}
  // CockroachDB timeline
  const tl=document.getElementById('crTl');
  if(tl&&S.crdb){const T=S.crdb.tl,m=Math.max(...T.map(t=>t[0]));
    tl.innerHTML=T.map((t,s)=>t[0]===0&&s<T.length-1?'<i class="e" title="second '+s+': no successful insert" style="height:8%"></i>':'<i title="second '+s+': '+t[0]+' ok" style="height:'+Math.max(1,100*t[0]/m)+'%"></i>').join('');
    document.getElementById('crEv').innerHTML=S.crdb.events.filter(e=>e.event!=='end').map(e=>'<b>'+f(e.t,0)+' s</b> '+RD.esc(e.event)).join(' &middot; ');
    const seg=(a,b)=>{const x=T.slice(a,b);return x.reduce((s,t)=>s+t[0],0)/Math.max(1,x.length)};
    const ev=S.crdb.events.map(e=>Math.round(e.t));
    const gap=(a,b)=>{let st=-1,best=0,cur=0;for(let s=a;s<b&&s<T.length;s++){if(T[s][0]===0){cur++;best=Math.max(best,cur)}else cur=0}return best};
    const L=S.crdb.lat;
    document.getElementById('crNums').innerHTML=RD.stat('Inserts/s, 3 nodes',f(seg(1,ev[0]),0),'average before any kill')+RD.stat('Inserts/s, 2 of 3 alive',f(seg(ev[0]+1,ev[1]),0),'average after node 3 died')+
      RD.stat('Longest zero-write gap, 1 node killed',gap(ev[0],ev[1])+' s','')+RD.stat('Inserts/s, 1 of 3 alive',f(seg(ev[1]+1,ev[2]),1),'no majority')+
      RD.stat('Insert latency, CockroachDB',f(L.crdb.p50,1)+' ms','median; p99 '+f(L.crdb.p99,1)+' ms')+RD.stat('Same insert, one Postgres',f(L.postgres.p50,2)+' ms',L.postgres_flush?'with a real SSD flush: '+f(L.postgres_flush.p50,1)+' ms':'');
    const rg=document.getElementById('crRanges');if(rg)rg.textContent=S.crdb.ranges;
    document.getElementById('crNote').textContent=S.crdb.version+'. Each bar is one second; height = successful inserts that second. Errors seen: '+S.crdb.errors.map(e=>e.split(':')[0]).filter((v,i,a)=>a.indexOf(v)===i).join(', ')+'. CockroachDB, written in Go, forces every flush to the SSD on macOS; Postgres here by default does not (macOS fsync), so the fair comparison is the "real SSD flush" figure.'}
})();
