// ---- Section 5 (documents): the aggregation pipeline and the Postgres comparison table ----
(function(){
  const D=NQ.doc; if(!D)return;
  const el=id=>document.getElementById(id), mb=b=>(b/1048576).toFixed(0)+' MB', ms=v=>(+v).toFixed(v<1?3:v<10?2:0)+' ms';
  const m=D.mongo, g=D.pg;
  if(m&&m.agg){el('rd-doc-agg').textContent='db.messages.aggregate('+JSON.stringify(m.agg.pipeline,null,1).replace(/\n\s*/g,' ')+')\n\n// first rows\n'+m.agg.first.map(r=>JSON.stringify(r)).join('\n')}
  if(g){
    const row=(a,b,c,d,e)=>'<tr><td>'+a+'</td><td class="num">'+b+'</td><td class="num">'+c+'</td><td class="num">'+d+'</td><td class="num">'+e+'</td></tr>';
    el('rd-doc-pg').innerHTML='<table><tr><th>Shape</th><th class="num">Table size</th><th class="num">Latest 50 of chat 7</th><th class="num">Tokens per model per day, 1M rows</th><th class="num">Append one message</th></tr>'+
      row('Plain columns, index (chat_id, created_at)',mb(g.sizes.columns),ms(g.latest50.columns),ms(g.agg_all_ms.columns),'insert a row: '+ms(g.append_ms.insert_row))+
      row('jsonb per message, expression index',mb(g.sizes.jsonb_per_message),ms(g.latest50.jsonb_per_message),ms(g.agg_all_ms.jsonb_per_message),'insert a row')+
      row('jsonb per chat (messages array)',mb(g.sizes.jsonb_per_chat),ms(g.latest50.jsonb_per_chat),'n/a','rewrite the document: '+ms(g.append_ms.jsonb_1000_msgs)+' and '+g.wal_per_append.jsonb_1000_msgs.toLocaleString('en-US')+' bytes of log (chat 7); '+ms(g.append_ms.jsonb_10_msgs)+' and '+g.wal_per_append.jsonb_10_msgs.toLocaleString('en-US')+' bytes (10 messages)')+'</table>'+
      '<p class="small mute">Server execution times, medians. The per-chat documents are smaller on disk because Postgres compresses large values (TOAST); reading the newest 50 then means decompressing and unpacking all '+(m?m.long_chat_messages:'')+' messages of chat 7.</p>';
  }
})();
