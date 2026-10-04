// ---- Section 2: "latest 50 messages of chat 7" under four layouts (real EXPLAIN runs and a real Cassandra trace) ----
(function(){
  const W=NQ.wide; if(!W)return;
  const el=id=>document.getElementById(id), f0=n=>Math.round(n).toLocaleString('en-US');
  const HEAP=W.pg.heap_pages, COLS=96, ROWS=4, CELLS=COLS*ROWS, PER=Math.ceil(HEAP/CELLS);
  const R=W.runs, C=W.cass||{};
  const lat=C.latest50||{}, tr=lat.trace||[];
  const sst=(()=>{for(const e of tr){const m=/Merged data from memtables and (\d+) sstables/i.exec(e);if(m)return +m[1]}return null})();
  const live=(()=>{for(const e of tr){const m=/Read (\d+) live rows and (\d+) tombstone/i.exec(e);if(m)return [+m[1],+m[2]]}return null})();
  const idxCells=new Set(R[1].blocks.map(b=>Math.floor(b/PER))), cluCells=new Set(R[2].blocks.map(b=>Math.floor(b/PER)));
  const idxPages=R[1].buffers-R[1].heap_pages_holding_rows, cluIdx=R[2].buffers-R[2].heap_pages_holding_rows;
  // steps per mode: {lit: function(cell)->state, cnt:[pages, rows read, rows returned, time], cap:[title, text], tree: 0..2}
  const M={
    seq:[
      {n:0,cap:['A request for chat 7\'s newest 50','The table has no index on <code>chat_id</code>, so Postgres has no way to find chat 7\'s rows except to look at every row.'],c:[0,0,0,null]},
      {n:.25,cap:['Sequential scan: a quarter of the table','Postgres reads pages front to back (here with parallel workers), checking each row\'s <code>chat_id</code>.'],c:[HEAP*.25,R[0].nodes[3]?Math.round(W.pg.rows*.25):0,0,null]},
      {n:.6,cap:['Still scanning','Chat 7\'s rows turn up all over the table, because messages are stored in the order they were written and chat 7 was active for '+W.pg.long_chat_span_days+' days.'],c:[HEAP*.6,Math.round(W.pg.rows*.6),0,null]},
      {n:1,cap:['Every page read','All '+f0(HEAP)+' pages ('+f0(HEAP*8/1024)+' MB) read to find '+f0(W.pg.long_chat_rows)+' rows of chat 7.'],c:[R[0].buffers,W.pg.rows,0,null]},
      {n:1,sort:1,cap:['Sort and keep 50','A top-N sort keeps the newest 50. Measured: '+f0(R[0].buffers)+' page reads, '+R[0].ms_p50+' ms on the server (median of 20 runs).'],c:[R[0].buffers,W.pg.rows,50,R[0].ms_p50]}],
    idx:[
      {cap:['A request for chat 7\'s newest 50','Now there is a B-tree index on <code>(chat_id, created_at)</code>: its entries are sorted by chat, then by time.'],c:[0,0,0,null],tree:0},
      {cap:['Descend the index','From the root page to the leaf where chat 7\'s newest entry sits: a few pages.'],c:[idxPages,0,0,null],tree:1},
      {cap:['Walk the leaf backwards','The 50 newest entries of chat 7 are next to each other in the index, each pointing at a row\'s page and slot.'],c:[idxPages,50,0,null],tree:2},
      {fetch:1,cap:['Fetch each row from the table','The rows themselves are scattered: the 50 entries point into '+R[1].heap_pages_holding_rows+' different pages (lit), each a separate page read.'],c:[R[1].buffers,50,50,null],tree:2},
      {fetch:1,cap:['Done','Measured: '+R[1].buffers+' page reads ('+R[1].heap_pages_holding_rows+' of them table pages), '+R[1].ms_p50+' ms on the server. Fast, because the pages were in memory; from a cold disk each one is a random read.'],c:[R[1].buffers,50,50,R[1].ms_p50],tree:2}],
    clu:[
      {cap:['Same index, rows stored together','<code>CLUSTER messages USING messages_chat_created</code> rewrote the table in index order, so a chat\'s rows are now neighbours on disk.'],c:[0,0,0,null],tree:0},
      {cap:['Descend the index','The same few index pages as before.'],c:[cluIdx,0,0,null],tree:1},
      {cap:['Walk the leaf backwards','The same 50 entries...'],c:[cluIdx,50,0,null],tree:2},
      {fetch:1,cap:['...now point into one page','All 50 rows sit on '+R[2].heap_pages_holding_rows+' page'+(R[2].heap_pages_holding_rows>1?'s':'')+' (lit): one read instead of '+R[1].heap_pages_holding_rows+'.'],c:[R[2].buffers,50,50,null],tree:2},
      {fetch:1,cap:['Done','Measured: '+R[2].buffers+' page reads, '+R[2].ms_p50+' ms. This is the layout a partitioned store keeps all the time.'],c:[R[2].buffers,50,50,R[2].ms_p50],tree:2}],
    cas:[
      {cap:['A request for partition (7, '+(C.latest_bucket!=null?C.latest_bucket:'b')+')','The Cassandra table\'s partition key is <code>(chat_id, bucket)</code>, where a bucket is a 10-day window: chat 7\'s newest messages live in partition (7, '+(C.latest_bucket!=null?C.latest_bucket:'b')+'). Its clustering key sorts rows newest first.'],c:[0,0,0,null],ring:0},
      {cap:['Hash the partition key','The key is hashed to a token; the token says which node holds the partition. This laptop runs one node; in a cluster the same hash picks 3 replicas out of many (<span class="ill">illustrative ring</span>).'],c:[0,0,0,null],ring:1},
      {part:1,cap:['Find the partition in each file','Cassandra stores data in immutable sorted files (SSTables) plus an in-memory memtable. The partition index points straight at partition (7, '+(C.latest_bucket!=null?C.latest_bucket:'b')+')'+(sst!=null?'; the trace says it merged data from the memtable and '+sst+' SSTable'+(sst===1?'':'s')+'.':'.')],c:[1,0,0,null],ring:1},
      {part:1,cap:['Read the first 50 rows','The rows are stored in clustering order, newest first, so the first 50 are the answer: no sort, no filter. '+(live?'Trace: read '+live[0]+' live rows and '+live[1]+' tombstone cells.':'')],c:[1,live?live[0]:50,50,null],ring:1},
      {part:1,cap:['Done','One partition, '+(live?live[0]:50)+' rows read, nothing sorted or filtered. '+(C.same_rows_as_postgres?'The same 50 message ids as Postgres returned. ':'')+'Median '+C.latest50_ms_p50+' ms measured from the Python driver, which includes the client library and the loopback hop, so it is not comparable with the Postgres server times: compare the counts.'],c:[1,live?live[0]:50,50,C.latest50_ms_p50],ring:1}]
  };
  const wrap=(txt,maxw,fs)=>{const per=Math.max(20,Math.floor(maxw/(fs*0.56)));const out=[];let line='';
    txt.split(' ').forEach(wd=>{if((line+' '+wd).trim().length>per){out.push(line.trim());line=wd}else line+=' '+wd});if(line.trim())out.push(line.trim());return out};
  let mode='seq';
  const cntEl=el('rd-lat-cnt'), svgEl=el('rd-lat-svg'), capEl=el('rd-lat-cap');
  function draw(i){
    const st=M[mode][i]; const w=RD.width(svgEl); const cw=(w-20)/COLS, ch=Math.max(6,Math.min(12,cw*1.6));
    const top=mode==='cas'?96:70, H=top+ROWS*(ch+2)+34;
    let s='';
    // top area: index tree or ring
    if(mode==='idx'||mode==='clu'){
      const lv=st.tree||0, cx=w/2, sp=Math.min(64,(w-30)/6), bw=Math.min(56,sp-4), isp=Math.min(90,sp*1.6);
      const box=(x,y,on,t)=>'<rect x="'+(x-bw/2)+'" y="'+y+'" width="'+bw+'" height="16" rx="3" fill="'+(on?'var(--acc2)':'var(--soft)')+'" stroke="'+(on?'var(--acc)':'var(--line)')+'"/>'+RD.t(x,y+12,t,{a:'middle',fs:bw<46?9:10});
      s+=box(cx,4,lv>=1,'root');
      [-1,0,1].forEach(k=>{s+='<line x1="'+cx+'" y1="20" x2="'+(cx+k*isp)+'" y2="30" stroke="var(--line)"/>'+box(cx+k*isp,30,lv>=1&&k===1,'inner')});
      for(let k=0;k<6;k++){const x=cx+(k-2.5)*sp;s+=box(x,54,lv>=2&&k===4,k===4?'chat 7':'leaf')}
      s+=RD.t(10,14,'B-tree index',{fs:10.5,fill:'var(--mute)'});
    } else if(mode==='cas'){
      const cx=w/2, cy=44, r=34, n=6, on=st.ring>=1;
      s+='<circle cx="'+cx+'" cy="'+cy+'" r="'+r+'" fill="none" stroke="var(--line)" stroke-width="2"/>';
      for(let k=0;k<n;k++){const a=-Math.PI/2+k*2*Math.PI/n, hit=on&&(k===1||k===2||k===3);
        s+='<circle cx="'+(cx+r*Math.cos(a))+'" cy="'+(cy+r*Math.sin(a))+'" r="8" fill="'+(hit?'var(--c4)':'var(--soft)')+'" stroke="var(--mute)"/>'}
      const tx=cx+r+16;wrap(on?'token(7, '+C.latest_bucket+'): 3 replicas':'token ring',w-tx-6,10.5).forEach((l,j)=>{s+=RD.t(tx,cy-6+j*13,l,{fs:10.5})});
      wrap('(one node on this laptop; ring illustrative)',w-tx-6,9.5).forEach((l,j)=>{s+=RD.t(tx,cy+22+j*12,l,{fs:9.5,fill:'var(--mute)'})});
      s+=RD.t(10,14,'Cassandra',{fs:10.5,fill:'var(--mute)'});
    } else s+=RD.t(10,14,'No index: the only path is the table itself',{fs:10.5,fill:'var(--mute)'});
    // the strip
    for(let k=0;k<CELLS;k++){
      const x=10+(k%COLS)*cw, y=top+Math.floor(k/COLS)*(ch+2);
      let fill='var(--soft)', stroke='none';
      if(mode==='seq'){if(k<st.n*CELLS)fill='var(--c2)'}
      else if(mode==='idx'){if(st.fetch&&idxCells.has(k))fill='var(--c2)'}
      else if(mode==='clu'){if(st.fetch&&cluCells.has(k))fill='var(--c2)'}
      else if(mode==='cas'){const p0=Math.floor(CELLS*0.43);if(st.part&&k===p0)fill='var(--c4)'}
      s+='<rect x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'" width="'+Math.max(1,cw-1).toFixed(1)+'" height="'+ch.toFixed(1)+'" fill="'+fill+'"'+(stroke!=='none'?' stroke="'+stroke+'" stroke-width="0.8"':'')+'/>';
    }
    const ly=top+ROWS*(ch+2)+14;
    const lab=mode==='cas'?'The table\'s data files: partition (7, '+C.latest_bucket+') is one contiguous run of rows (position illustrative)':'The messages table: '+f0(HEAP)+' pages of 8 KB, '+PER+' pages per cell; orange cells were read'+(mode==='idx'?' (the newest 50 rows were written in the last days, so they sit near the end)':'');
    const ls=wrap(lab,w-20,10.5); ls.forEach((l,j)=>{s+=RD.t(10,ly+j*13,l,{fs:10.5,fill:'var(--mute)'})});
    const extra=(ls.length-1)*13;
    if(mode==='seq'&&st.sort)s+=RD.t(10,ly+extra+15,'Top-N sort over '+f0(W.pg.long_chat_rows)+' matching rows keeps 50',{fs:10.5});
    svgEl.innerHTML=RD.svg(w,H+extra+(mode==='seq'&&st.sort?14:0),s,'Pages read for the latest 50 messages of chat 7');
    const c=st.c;
    cntEl.innerHTML=RD.stat(mode==='cas'?'Partitions read':'Page reads',f0(c[0]),mode==='cas'?'one partition':'8 KB each, cached or from disk')+RD.stat('Rows looked at',f0(c[1]),'')+RD.stat('Rows returned',f0(c[2]),'')+RD.stat(mode==='cas'?'Round trip':'Server time',c[3]==null?'...':c[3]+' ms',mode==='cas'?'median, from the client':'median, measured');
    capEl.innerHTML='<div class="t">'+(i+1)+'/'+M[mode].length+'. '+st.cap[0]+'</div><p>'+st.cap[1]+'</p>';
  }
  const A=RD.anim({card:'rd-lat-card',ctl:'rd-lat-ctl',n:M.seq.length,draw,ms:1700,label:'Step'});
  RD.seg(el('rd-lat-mode'),m=>{mode=m;A.reset(M[m].length);A.play();raw()});
  function raw(){
    const t=mode==='cas'?('-- CQL\n'+(W.cass_ddl||'')+'\n\nSELECT message_id, role, tokens, content, created_at FROM messages_by_chat\n WHERE chat_id = 7 AND bucket = '+C.latest_bucket+' LIMIT 50;\n\n-- trace (Cassandra '+(W.cass_version||'')+')\n'+tr.join('\n')):
      ('-- PostgreSQL '+W.pg_version+'\nSELECT id, role, tokens, content, created_at FROM messages\n WHERE chat_id = 7 ORDER BY created_at DESC LIMIT 50;\n\n'+R[{seq:0,idx:1,clu:2}[mode]].explain);
    el('rd-lat-raw').textContent=t;
  }
  raw();
  // numbers quoted in the section's prose
  const put=(id,t)=>{const e=el(id);if(e)e.textContent=t};
  put('s2-rows',f0(W.pg.long_chat_rows));put('s2-days',W.pg.long_chat_span_days);put('s2-pages',f0(W.chat_blocks.length));put('s2-heap',f0(HEAP));
  put('s2-cell',PER);put('s2-idx',R[1].heap_pages_holding_rows+' table pages for 50 rows');put('s2-cluster',W.pg.cluster_seconds);put('s2-idxms',R[1].ms_p50);
  RD.onResize(()=>A.redraw());
})();
