// ---- Reading: header compression, animated field by field (HTTP/1.1 text against HPACK against QPACK) ----
(function(){
  const D=window.HD,esc=RD.esc,H=D.hpack.sets;let set='running',mode='h2';
  const KIND={indexed:'indexed: one table entry',literal_incremental:'literal, added to the table',literal_never_indexed:'literal, never indexed',literal_without_indexing:'literal, not indexed'};
  function h1rows(s){const f=H[s].fields;const host=f.find(x=>x[0]===':authority')[1];
    const lines=[['(start line)','POST /v1/messages HTTP/1.1'],['host',host]].concat(f.filter(x=>x[0][0]!==':'));
    return lines.map(x=>({name:x[0],rep:'text, sent in full',bytes:(x[0]==='(start line)'?x[1].length:x[0].length+2+x[1].length)+2,cls:'txt'})).concat([{name:'(empty line)',rep:'CR LF',bytes:2,cls:'txt'}])}
  function h2rows(s,r){return H[s].hpack[r].fields.map(x=>({name:x.name||'(table size)',rep:(KIND[x.kind]||x.kind)+(x.table?' ('+x.table+' #'+x.index+')':'')+(x.value_huffman?', Huffman':''),bytes:x.bytes,
    cls:x.kind==='indexed'?'idx':x.kind==='literal_never_indexed'?'nev':'lit'}))}
  function steps(){
    if(mode==='h3'){const q=H[set].qpack;return [0,1,2].map(r=>({r,rows:null,q:{s:q.static_only[r],d:q.dynamic_4096[r]}}))}
    const out=[];for(let r=0;r<2;r++){const rows=mode==='h1'?h1rows(set):h2rows(set,r);rows.forEach((x,k)=>out.push({r,k,rows}))}return out}
  let S=steps();
  const rowsEl=document.getElementById('rd-hp-rows');
  function sum(rows,k){let a=0;for(let j=0;j<=k;j++)a+=rows[j].bytes;return a}
  function draw(i){
    const st=S[i];
    if(mode==='h3'){
      const q=H[set].qpack,max=Math.max(...[0,1,2].map(r=>q.static_only[r].block+q.static_only[r].encoder_stream),...[0,1,2].map(r=>q.dynamic_4096[r].block+q.dynamic_4096[r].encoder_stream));
      const bar=(b,e)=>'<div class="bytebar"><i style="width:'+(100*b/max)+'%;background:var(--c1)"></i><i style="width:'+(100*e/max)+'%;background:var(--c5)"></i></div>';
      let h='';[0,1,2].forEach(r=>{if(r>st.r)return;const s=q.static_only[r],d=q.dynamic_4096[r];
        h+='<div class="hrow'+(r===st.r?' cur':'')+'"><span class="nm">req '+(r+1)+', static</span>'+bar(s.block,s.encoder_stream)+'<span class="b">'+(s.block+s.encoder_stream)+'</span></div>';
        h+='<div class="hrow'+(r===st.r?' cur':'')+'"><span class="nm">req '+(r+1)+', dynamic</span>'+bar(d.block,d.encoder_stream)+'<span class="b">'+(d.block+d.encoder_stream)+'</span></div>'});
      rowsEl.innerHTML=h+'<div class="leg"><span class="sw1">header block on the request stream</span><span class="sw5">table insertions on the encoder stream</span></div>';
      const d=q.dynamic_4096[st.r];
      document.getElementById('rd-hp-cap').innerHTML='<div class="t">QPACK, request '+(st.r+1)+'</div><p>'+(st.r===0?'The encoder sends the first request using the static table only ('+q.dynamic_4096[0].block+' bytes): nothing it could refer to has reached the decoder yet.':st.r===1?'Now it inserts the fields into the dynamic table on the encoder stream ('+d.encoder_stream+' bytes, once) and refers to them: the request\'s own block is '+d.block+' bytes. If the encoder stream\'s packet were lost, this request would wait: a blocked stream.':'Later requests reuse the entries: '+d.block+' bytes, nothing more on the encoder stream.')+'</p>';
      document.getElementById('rd-hp-cnt').innerHTML=RD.stat('HTTP/1.1 text, each request',H[set].h1_head_bytes+' B','')+RD.stat('QPACK, this request',(d.block+d.encoder_stream)+' B','block '+d.block+' + encoder '+d.encoder_stream)+RD.stat('HPACK, same request',H[set].hpack[Math.min(st.r,2)].block+' B','for comparison');
      return}
    const rows=st.rows,max=Math.max(...h1rows(set).map(x=>x.bytes));
    rowsEl.innerHTML='<div class="small mute">Request '+(st.r+1)+' of 2 on the same connection</div>'+rows.map((x,k)=>{const shown=k<=st.k;
      return '<div class="hrow '+x.cls+(k===st.k?' cur':'')+'" style="opacity:'+(shown?1:.35)+'"><span class="nm" title="'+esc(x.name)+'">'+esc(x.name)+'</span><span><span class="rep">'+esc(x.rep)+'</span><div class="bytebar"><i style="width:'+(shown?100*x.bytes/max:0)+'%;background:var(--'+(x.cls==='idx'?'good':x.cls==='nev'?'bad':x.cls==='txt'?'c4':'c2')+')"></i></div></span><span class="b">'+(shown?x.bytes:'')+'</span></div>'}).join('');
    const cur=rows[st.k],r1=mode==='h1'?H[set].h1_head_bytes:H[set].hpack[0].block,r2=mode==='h1'?H[set].h1_head_bytes:H[set].hpack[1].block;
    let c;
    if(mode==='h1')c='<b>'+esc(cur.name)+'</b>: '+cur.bytes+' bytes of text. HTTP/1.1 has no memory between requests, so request 2 repeats every byte.';
    else if(cur.cls==='idx')c='<b>'+esc(cur.name)+'</b>: '+cur.bytes+' byte. '+(cur.rep.indexOf('static')>=0?'Found in the static table every client and server knows.':'Sent before on this connection, so it is now a single index into the dynamic table.');
    else if(cur.cls==='nev')c='<b>'+esc(cur.name)+'</b>: '+cur.bytes+' bytes, every time. Marked never-indexed because it is a credential: it is kept out of every compression table on purpose.';
    else c='<b>'+esc(cur.name)+'</b>: '+cur.bytes+' bytes. New to this connection, so the value is spelled out ('+(cur.rep.indexOf('Huffman')>=0?'Huffman-coded, ':'')+'the name often by index) and added to the dynamic table for next time.';
    document.getElementById('rd-hp-cap').innerHTML='<div class="t">'+(mode==='h1'?'HTTP/1.1':'HPACK')+', request '+(st.r+1)+'</div><p>'+c+'</p>';
    document.getElementById('rd-hp-cnt').innerHTML=RD.stat('This request so far',sum(rows,st.k)+' B','')+RD.stat('Request 1 headers',r1+' B',mode==='h1'?'text':'HEADERS block')+RD.stat('Request 2 headers',st.r>0?r2+' B':'...',st.r>0?'saved '+Math.round(100*(1-r2/r1))+'%':'')+RD.stat('HTTP/1.1 for comparison',H[set].h1_head_bytes+' B','every request');
  }
  const A=RD.anim({card:'rd-hp',ctl:'rd-hp-ctl',n:S.length,draw,ms:900,label:'Field'});
  const re=()=>{S=steps();A.reset(S.length);A.play()};
  RD.seg(document.getElementById('rd-hp-set'),m=>{set=m;re()});
  RD.seg(document.getElementById('rd-hp-mode'),m=>{mode=m;re()});
})();
