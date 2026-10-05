// ---- Frame by frame tab: step through the recorded HTTP/1.1, HTTP/2 and HTTP/3 exchanges ----
(function(){
  const D=window.HD,esc=RD.esc;let ver='h2';
  const EXPL={
    PREFACE:'The fixed 24-byte string every HTTP/2 client sends first ("PRI * HTTP/2.0\\r\\n\\r\\nSM\\r\\n\\r\\n"). An HTTP/1.1 server that receives it by mistake fails at once instead of misreading binary frames.',
    SETTINGS:'Each side states its limits. A SETTINGS frame with the ACK flag and no payload confirms the peer\'s.',
    HEADERS:'A request or response head, compressed. Its END_HEADERS flag says the block is complete; END_STREAM would say no body follows.',
    DATA:'Body bytes on one stream. The last DATA frame of a response carries END_STREAM (here an empty one).',
    WINDOW_UPDATE:'Flow-control credit returned to the sender.',GOAWAY:'Graceful close: no new streams; the last stream id says which requests may have been processed.',
    RST_STREAM:'Cancels one stream.',PING:'Liveness check.',
    'STREAM TYPE':'The first byte of a unidirectional QUIC stream says what it is for: control (0x00), QPACK encoder (0x02) or decoder (0x03).',
    'QPACK instructions':'On the encoder stream: insertions into the dynamic table (and its capacity). On the decoder stream: acknowledgements that a header block was decoded, which let the encoder use those entries safely.',
    MAX_PUSH_ID:'Lets the server push up to this id; aioquic sends it, the server never pushes.',
    REQUEST:'The whole request in text: start line, header lines, empty line, body. HTTP/1.1 has no frames; the receiver finds the end of the body from content-length.',
    RESPONSE:'Bytes returned by one recv() call: the response head and the first chunk, or one chunk per token. Chunk sizes (hex) frame each SSE event.'
  };
  function h1entries(){
    const a=D.h1.arrivals,res=D.h1.response,out=[{t:a.connect_ms,dir:'out',type:'REQUEST',len:D.h1.request.length,text:D.h1.request}];let p=0;
    a.recv.forEach(r=>{out.push({t:r.t_ms,dir:'in',type:'RESPONSE',len:r.bytes,text:res.slice(p,p+r.bytes)});p+=r.bytes});return out}
  function entries(){return ver==='h1'?h1entries():D[ver].frames}
  function marks(){return ver==='h1'?[['request',0],['response',1]]:D[ver].marks}
  let E=entries();
  const list=document.getElementById('fr-list'),det=document.getElementById('fr-det');
  function lab(f){return f.type+(f.flags&&f.flags.length?' ['+f.flags.join(', ')+']':'')+(f.stream!==undefined&&f.type!=='PREFACE'?' s'+f.stream:'')}
  function renderList(){const mk={};marks().forEach(m=>mk[m[1]]=m[0]);
    list.innerHTML=E.map((f,i)=>(mk[i]!==undefined?'<div class="fr-it"><span class="mk">'+esc(mk[i])+'</span></div>':'')+'<div class="fr-it" data-i="'+i+'"><span class="tm">'+f.t.toFixed(1)+'</span><span class="dir '+f.dir+'">'+(f.dir==='out'?'&#9654;':'&#9664;')+'</span><span class="ty" title="'+esc(lab(f))+'">'+esc(lab(f))+'</span><span class="ln">'+f.len+' B</span></div>').join('');
    document.getElementById('fr-jump').innerHTML='<span class="small mute">Jump to:</span>'+marks().map(m=>'<button data-j="'+m[1]+'">'+esc(m[0])+'</button>').join('')}
  function fieldsTable(fs){return '<div class="tw"><table><thead><tr><th>Field</th><th>Value</th><th>Encoded as</th><th class="num">Bytes</th></tr></thead><tbody>'+fs.map(x=>'<tr><td><code>'+esc(x.name||'')+'</code></td><td style="overflow-wrap:anywhere">'+esc((x.value||'').slice(0,60))+'</td><td>'+esc(x.kind.replace(/_/g,' ')+(x.table?' ('+x.table+' #'+x.index+')':'')+(x.name_from?', name: '+x.name_from:'')+(x.value_huffman?', value Huffman':''))+'</td><td class="num">'+x.bytes+'</td></tr>').join('')+'</tbody></table></div>'}
  function draw(i){
    const f=E[i];let h='<h4>'+(f.dir==='out'?'Client &#9654; server':'Server &#9654; client')+': '+esc(f.type)+'</h4>';
    if(ver==='h2'&&f.type!=='PREFACE')h+='<div class="fhd"><span><b>Length</b>'+f.len+'</span><span><b>Type</b>'+esc(f.type)+'</span><span><b>Flags</b>'+esc((f.flags||[]).join(' ')||'none')+'</span><span><b>Stream</b>'+f.stream+'</span><span><b>+ header</b>9 B</span></div>';
    if(ver==='h3'&&f.head!==undefined)h+='<div class="fhd"><span><b>Stream</b>'+f.stream+'</span><span><b>Type + length</b>'+f.head+' B</span><span><b>Payload</b>'+f.len+' B</span></div>';
    if(ver==='h3'&&f.head===undefined)h+='<div class="fhd"><span><b>Stream</b>'+f.stream+'</span><span><b>Bytes</b>'+f.len+'</span></div>';
    h+='<p>'+(EXPL[f.type]||'')+'</p>';
    if(f.settings)h+='<div class="tw"><table><tbody>'+f.settings.map(s=>'<tr><td><code>'+esc(s[0])+'</code></td><td class="num">'+s[1].toLocaleString('en-US')+'</td></tr>').join('')+'</tbody></table></div>';
    if(f.fields)h+=fieldsTable(f.fields);
    if(f.lines)h+='<div class="tw"><table><thead><tr><th>QPACK line</th><th class="num">Bytes</th></tr></thead><tbody>'+f.lines.map(l=>'<tr><td>'+esc(l.kind+(l.note?': '+l.note:''))+'</td><td class="num">'+l.bytes+'</td></tr>').join('')+'</tbody></table></div>'+(D.h3.response_headers&&f.dir==='in'&&D.h3.response_headers[f.stream]?'<p class="small mute">Decoded: '+D.h3.response_headers[f.stream].map(x=>esc(x[0]+': '+x[1])).join('; ')+'</p>':'');
    if(f.increment!==undefined)h+='<p>Increment: <b>'+f.increment.toLocaleString('en-US')+'</b> bytes.</p>';
    if(f.last_stream!==undefined)h+='<p>Last stream id: <b>'+f.last_stream+'</b>; error code '+f.error_code+' (0 = NO_ERROR).</p>';
    if(f.type==='GOAWAY'&&f.id!==undefined)h+='<p>Id: '+f.id+'</p>';
    if(f.text!==undefined&&f.text!=='')h+='<pre>'+esc(f.text.replace(/\r\n/g,'↵\n'))+'</pre>';
    if(f.hex&&f.type!=='HEADERS')h+='<pre>'+esc(f.hex.replace(/(..)/g,'$1 ').trim())+'</pre>';
    det.innerHTML=h;
    list.querySelectorAll('.fr-it[data-i]').forEach(el=>{const k=+el.dataset.i;el.classList.toggle('cur',k===i);el.classList.toggle('fut',k>i)});
    const cur=list.querySelector('.fr-it.cur');if(cur&&list.offsetParent){const top=cur.offsetTop-list.offsetTop;if(top<list.scrollTop||top>list.scrollTop+list.clientHeight-30)list.scrollTop=Math.max(0,top-60)}
    let o=0,n=0,hb=0,db=0;for(let k=0;k<=i;k++){const g=E[k];const tot=g.len+(ver==='h2'&&g.type!=='PREFACE'?9:(g.head||0));if(g.dir==='out')o+=tot;else n+=tot;
      if(g.type==='HEADERS')hb+=g.len;if(g.type==='DATA')db+=g.len;if(g.type==='REQUEST'||g.type==='RESPONSE')db+=g.len}
    document.getElementById('fr-cnt').innerHTML=RD.stat('Step',(i+1)+' / '+E.length,'')+RD.stat('Client sent',o.toLocaleString('en-US')+' B',ver==='h1'?'':'incl. frame headers')+RD.stat('Server sent',n.toLocaleString('en-US')+' B','')+
      (ver==='h1'?RD.stat('Time',f.t.toFixed(1)+' ms',''):RD.stat('Header blocks / DATA',hb+' / '+db.toLocaleString('en-US')+' B','payload bytes so far'));
  }
  const A=RD.anim({card:'fr-card',ctl:'fr-ctl',n:E.length,draw,ms:900,label:'Frame',tab:'t-frames'});
  list.addEventListener('click',e=>{const it=e.target.closest('[data-i]');if(it)A.go(+it.dataset.i)});
  document.getElementById('fr-jump').addEventListener('click',e=>{const b=e.target.closest('[data-j]');if(b)A.go(+b.dataset.j)});
  function src(){document.getElementById('fr-src').innerHTML='<span class="meas">measured</span> '+(ver==='h1'?'Root page recording (<code>topic_protocols/src/wire/raw/h1_request.bin</code>, <code>h1_response.bin</code>, <code>h1_arrivals.json</code>), plain HTTP/1.1 to its stand-in server.':esc(D[ver].server)+'; client '+esc(D[ver].client)+'; recorded '+esc(D[ver].recorded)+' (<code>raw/'+ver+'_frames.json</code>).')}
  RD.seg(document.getElementById('fr-ver'),m=>{ver=m;E=entries();renderList();A.reset(E.length);src()});
  renderList();A.go(0);src();
})();
