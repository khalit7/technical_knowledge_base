// ---- Section 6: before/after animation. One query on one big Postgres against the same data sharded by user (Citus, 3 workers, 32 shards).
// Timings are the measured medians in SC.citus; the drawing is to scale in shard counts and rows.
(function(){
  const S=window.SC;const box=document.getElementById('fanSvg');if(!S||!box)return;
  const C=S.citus;let q='user',mode='big';
  const ports=[...new Set(C.shardPort)].sort();
  const per=ports.map(p=>({p,shards:C.shardPort.map((x,i)=>x===p?i:-1).filter(i=>i>=0)}));
  per.forEach(w=>w.rows=w.shards.reduce((a,i)=>a+C.shards[i],0));
  const tgtW=ports.indexOf(+C.user4242);
  const tgtShard=per[tgtW].shards[Math.floor(per[tgtW].shards.length/2)];
  const fmt=n=>n.toLocaleString('en-US');
  const SQL={user:'SELECT id, title FROM chats WHERE user_id = 4242 ORDER BY created_at DESC LIMIT 20',
             mention:"SELECT id, chat_id, created_at FROM messages WHERE content LIKE '%c0ffee%' ORDER BY created_at DESC LIMIT 50"};
  const T={user:{big:C.point.chat_list.big.p50,shard:C.point.chat_list.citus.p50},mention:{big:C.heavy.mention.big.ms,shard:C.heavy.mention.citus.ms}};
  const CAP={
   big:{user:[['The query arrives','The application sends the chat-list query to its one Postgres server.'],['No routing needed','One server holds every row, so there is nothing to decide.'],['Sent','One round trip to one server.'],['Index lookup','Postgres finds user 4242\'s chats through the index on chats(user_id): a few pages read.'],['Rows back','Up to 20 chats come back.'],['Done','Median over 250 random users, measured: '+T.user.big.toFixed(2)+' ms.']],
        mention:[['The query arrives','The admin search for "c0ffee" goes to the one server.'],['No routing needed','One server, one plan: no index can help a LIKE with a leading %, so it scans.'],['Sent','One round trip.'],['Full scan','Postgres scans all 10,000,000 messages with 2 parallel workers plus the leader process.'],['Rows back',C.hits+' matching messages are found and sorted.'],['Done','Median of 5 warm runs, measured: '+fmt(Math.round(T.mention.big))+' ms.']]},
   shard:{user:[['The query arrives','The application sends the same SQL to the Citus coordinator (the router).'],['Route by the shard key','WHERE user_id = 4242 names the distribution column: hash(4242) falls in one shard\'s range, on worker '+(tgtW+1)+'. Citus plan: Task Count: 1.'],['Sent to one shard','One extra hop: application to coordinator, coordinator to the worker.'],['Index lookup on one shard','That shard runs the same index lookup on its 1/32 of the chats.'],['Rows back','20 rows return through the coordinator.'],['Done','Median over the same 250 users, measured: '+T.user.shard.toFixed(2)+' ms, slower than one node because of the extra hop.']],
        mention:[['The query arrives','The same search goes to the coordinator.'],['No shard key in the query','content LIKE says nothing about user_id, so every one of the 32 shards might hold a match. Citus plan: Task Count: 32.'],['Fan-out','32 tasks go out to all 3 workers at once.'],['Every shard scans','Each worker scans its shards in parallel: about '+per.map(w=>fmt(Math.round(w.rows/1e5)/10)+'M').join(', ')+' rows. Total work is still all 10M rows.'],['Gather and merge','Each shard returns its top 50; the coordinator merges them into the final '+C.hits+'.'],['Done','Median of 5, measured: '+fmt(Math.round(T.mention.shard))+' ms: faster here only because 32 scans used more of the laptop\'s cores at once.']]}};
  const cnt=document.getElementById('fanCnt');
  function draw(i){
    const W=RD.width(box),H=230,dk=W<520;const cx=W/2;
    const g=[];const A='var(--acc)',M='var(--mute)';
    // application
    g.push('<rect x="'+(cx-55)+'" y="6" width="110" height="28" rx="6" fill="var(--soft)" stroke="var(--line)"/>'+RD.t(cx,24,'application',{a:'middle',fs:12}));
    let touched=0,shardsT=0,rows=0;
    if(mode==='big'){
      const on=i>=2;
      g.push('<line x1="'+cx+'" y1="34" x2="'+cx+'" y2="120" stroke="'+(on?A:'var(--line)')+'" stroke-width="'+(on?3:1.5)+'"/>');
      const fillTo=i>=3?(q==='mention'?1:0.04):0;
      g.push('<rect x="'+(cx-120)+'" y="120" width="240" height="70" rx="8" fill="var(--bg)" stroke="'+(i>=3?A:'var(--line)')+'" stroke-width="2"/>');
      g.push('<rect x="'+(cx-114)+'" y="160" width="'+(228*fillTo)+'" height="22" rx="3" fill="var(--acc2)"/>');
      g.push(RD.t(cx,140,'one Postgres: all 10M messages',{a:'middle',fs:12,w:600}));
      g.push(RD.t(cx,176,i>=3?(q==='mention'?'scanning every row':'index lookup: a few pages'):'',{a:'middle',fs:11}));
      if(i>=4)g.push('<line x1="'+(cx+16)+'" y1="120" x2="'+(cx+16)+'" y2="34" stroke="var(--good)" stroke-width="3"/>');
      touched=i>=2?1:0;shardsT=touched;rows=i>=3?(q==='mention'?1e7:20):0;
    } else {
      g.push('<rect x="'+(cx-70)+'" y="62" width="140" height="28" rx="6" fill="var(--soft)" stroke="'+(i>=1?A:'var(--line)')+'"/>'+RD.t(cx,80,'coordinator (router)',{a:'middle',fs:12}));
      g.push('<line x1="'+cx+'" y1="34" x2="'+cx+'" y2="62" stroke="'+(i>=0?A:'var(--line)')+'" stroke-width="2"/>');
      const ww=(W-24)/3;
      per.forEach((w,k)=>{
        const x0=12+k*ww,wx=x0+ww/2,hit=q==='mention'||k===tgtW;
        const on=i>=2&&hit;
        g.push('<line x1="'+cx+'" y1="90" x2="'+wx+'" y2="128" stroke="'+(on?A:'var(--line)')+'" stroke-width="'+(on?3:1.2)+'"/>');
        if(i>=4&&hit)g.push('<line x1="'+(wx+8)+'" y1="128" x2="'+(cx+8)+'" y2="90" stroke="var(--good)" stroke-width="2.5"/>');
        g.push('<rect x="'+(x0+4)+'" y="128" width="'+(ww-8)+'" height="94" rx="8" fill="var(--bg)" stroke="'+(i>=3&&hit?A:'var(--line)')+'" stroke-width="'+(i>=3&&hit?2:1)+'"/>');
        g.push(RD.t(wx,144,(dk?'w':'worker ')+(k+1)+(dk?'':' ('+w.shards.length+' shards)'),{a:'middle',fs:11,w:600}));
        const cols=dk?4:6,sz=Math.min(14,(ww-20)/cols-3);
        w.shards.forEach((si,j)=>{const r=Math.floor(j/cols),c=j%cols;const gx=x0+10+c*(sz+3),gy=152+r*(sz+3);
          const sh=q==='mention'?i>=3:(si===tgtShard&&i>=1);
          g.push('<rect x="'+gx.toFixed(1)+'" y="'+gy.toFixed(1)+'" width="'+sz.toFixed(1)+'" height="'+sz.toFixed(1)+'" rx="2" fill="'+(sh?'var(--acc)':'var(--soft)')+'" stroke="var(--line)"/>')});
      });
      touched=i>=2?(q==='mention'?3:1):0;shardsT=i>=2?(q==='mention'?32:1):0;rows=i>=3?(q==='mention'?1e7:20):0;
    }
    box.innerHTML=RD.svg(W,H,g.join(''),'Query routing');
    const c=CAP[mode][q][i];
    document.getElementById('fanCap').innerHTML='<div class="t">Step '+(i+1)+' of 6: '+c[0]+'</div><p>'+c[1]+'</p><p class="small mute"><code>'+RD.esc(SQL[q])+'</code></p>';
    cnt.innerHTML=RD.stat('Servers touched',String(touched),mode==='big'?'of 1':'of 3 workers')+RD.stat('Shards touched',mode==='big'?'n/a':String(shardsT),mode==='big'?'one table':'of 32')+
      RD.stat('Rows examined',rows?(rows>=1e6?fmt(rows/1e6)+'M':'index, few'):'0','')+RD.stat('Measured time',i>=5?(T[q][mode]>=10?fmt(Math.round(T[q][mode])):T[q][mode].toFixed(2))+' ms':'...',q==='user'?'median of 250':'median of 5');
  }
  const an=RD.anim({card:'fanCard',ctl:'fanCtl',n:6,draw,ms:1700,label:'Fan-out step'});
  RD.seg(document.getElementById('fanQ'),v=>{q=v;an.reset(6)});
  RD.seg(document.getElementById('fanM'),v=>{mode=v;an.reset(6)});
  RD.onResize(()=>an.redraw());
})();
