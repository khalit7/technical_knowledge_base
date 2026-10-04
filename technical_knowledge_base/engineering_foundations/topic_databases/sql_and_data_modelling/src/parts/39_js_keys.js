// ---- Reading, section 8: measured inserts by key type (inputs/keys.json via gen_js.py) ----
(function(){
  const bars=document.getElementById('rd-keys-bars');if(!bars)return;
  const K=window.SM_DATA.keys;const NM={bigint:'bigint identity',uuid_v4:'UUID v4 (random)',uuid_v7:'UUID v7 (time-ordered)'};
  const COL={bigint:'var(--c3)',uuid_v4:'var(--c2)',uuid_v7:'var(--c1)'};
  let n=1000000,m='seconds';
  const fmt=(v,m)=>m==='seconds'?v.toFixed(1)+' s':(v/1048576).toFixed(0)+' MB';
  function get(kind,nn,mode){return K.runs.find(r=>r.kind===kind&&r.n===nn&&r.mode===(mode||'bulk'))}
  function draw(){
    const rs=['bigint','uuid_v4','uuid_v7'].map(k=>get(k,n)).filter(Boolean);
    if(!rs.length){bars.innerHTML='<p class="small mute">No run recorded for this size.</p>';return}
    const mx=Math.max(...rs.map(r=>r[m]));
    bars.innerHTML=rs.map(r=>'<div class="row"><div class="nm">'+NM[r.kind]+'</div><div class="track"><div class="fill" style="width:'+(100*r[m]/mx).toFixed(1)+'%;background:'+COL[r.kind]+'"></div></div><div class="val">'+fmt(r[m],m)+'</div></div>').join('');
    const b=get('bigint',n),v4=get('uuid_v4',n),v7=get('uuid_v7',n);
    let t='';
    if(m==='index_bytes')t='The index of random UUIDs is '+(v4.index_bytes/v7.index_bytes).toFixed(2)+' times the size of the time-ordered one holding the same number of 16-byte keys (half-empty pages after splits), and '+(v4.index_bytes/b.index_bytes).toFixed(2)+' times the bigint index.';
    else if(m==='wal_bytes')t='Random keys wrote '+(v4.wal_bytes/v7.wal_bytes).toFixed(2)+' times the WAL of time-ordered ones. WAL is also what replicas replay and backups archive, so this cost is paid several times.';
    else if(n===10000000)t='At 10M rows the random index ('+fmt(v4.index_bytes,'b')+') no longer fits in the 128 MB of shared buffers, and inserting random keys took '+(v4.seconds/v7.seconds).toFixed(1)+' times as long as time-ordered ones ('+v4.seconds.toFixed(0)+' s against '+v7.seconds.toFixed(0)+' s; bigint '+b.seconds.toFixed(0)+' s). Single runs on a shared laptop: treat the ratio as indicative.';
    else t='At 1M rows every index fits in memory and the times are within noise of each other (runs: '+['bigint','uuid_v4','uuid_v7'].map(k=>NM[k].split(' (')[0]+' '+get(k,n).all_seconds.map(x=>x.toFixed(1)).join(', ')).join('; ')+' s): the cost of random keys appears once the index outgrows memory. Switch to 10M rows.';
    const s1=['bigint','uuid_v4','uuid_v7'].map(k=>get(k,20000,'single')).filter(Boolean);
    if(s1.length===3)t+=' For comparison, 20,000 single-row inserts, each its own transaction as in an app: '+s1.map(r=>NM[r.kind].split(' (')[0]+' '+r.seconds.toFixed(1)+' s').join(', ')+'; at that rate the commit, not the index, dominates.';
    const g=['uuid_v4','uuid_v7'].map(k=>get(k,n)).filter(r=>r&&r.gen_seconds!=null);
    if(g.length)t+=' Generating the keys inside Postgres took '+g.map(r=>NM[r.kind].split(' (')[0]+' '+r.gen_seconds.toFixed(1)+' s').join(' and ')+' (not included above; on PostgreSQL 16 the v7 generator is a SQL function).';
    document.getElementById('rd-keys-note').textContent=t;
  }
  RD.seg(document.getElementById('rd-keys-n'),v=>{n=+v;draw()});
  RD.seg(document.getElementById('rd-keys-m'),v=>{m=v;draw()});
  draw();
})();
