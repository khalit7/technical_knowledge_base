// ---- Tab "One gRPC call": step through every recorded HTTP/2 frame, decode gRPC messages ----
(function(){
  const S=window.SA,esc=RD.esc;if(!document.getElementById('t-call'))return;
  const CONNS=S.frames.conns.map(c=>c.filter(f=>f.type!=='TCP_OPEN'));
  const SCHEMA={req:{1:['model','s'],2:['messages','m',{1:['role','s'],2:['content','s']}],3:['max_tokens','v'],4:['stream','v']},
    tok:{1:['text','s'],2:['index','v']},hreq:{1:['service','s']},hres:{1:['status','v']}};
  const WT={0:'VARINT',1:'I64',2:'LEN',5:'I32'};
  function vint(b,i){let n=0,s=0,c;do{c=b[i++];n+=(c&127)*Math.pow(2,s);s+=7}while(c>=128);return [n,i]}
  function walk(b,sch,depth){let i=0,out=[];const pad='&nbsp;'.repeat(depth*3);
    while(i<b.length){const t0=i;let [tag,j]=vint(b,i);const fn=Math.floor(tag/8),wt=tag%8,d=sch[fn]||['field '+fn,'?'];
      i=j;let val='';
      if(wt===0){const [v,k]=vint(b,i);val=d[0]==='status'?v+(v===1?' (SERVING)':''):v;i=k}
      else if(wt===2){const [ln,k]=vint(b,i);i=k;const body=b.slice(i,i+ln);i+=ln;
        if(d[1]==='m'){out.push(pad+'<span class="tg">'+hex(b.slice(t0,k))+'</span> '+d[0]+' (field '+fn+', '+WT[wt]+', '+ln+' bytes) {');out=out.concat(walk(body,d[2],depth+1));out.push(pad+'}');continue}
        val='"'+esc(new TextDecoder().decode(new Uint8Array(body)))+'"'}
      out.push(pad+'<span class="tg">'+hex(b.slice(t0,j))+'</span> '+d[0]+' (field '+fn+', '+WT[wt]+') = '+val)}
    return out}
  const hex=a=>a.map(x=>x.toString(16).padStart(2,'0')).join(' ');
  const EXPL={PREFACE:'The fixed 24 bytes every HTTP/2 client sends first ("PRI * HTTP/2.0 ... SM"): proof both sides speak HTTP/2. Cleartext gRPC (h2c) starts here with no TLS and no upgrade.',
    SETTINGS:'Each side announces its limits. gRPC raises the flow-control window and maximum frame size to 4 MB and advertises 0xfe03, a gRPC-specific setting that allows raw binary metadata. A SETTINGS with the ACK flag confirms the peer\'s.',
    WINDOWUPDATE:'Flow control: "you may send this many more bytes" for one stream or (stream 0) the whole connection.',
    PING:'gRPC sends PINGs to measure round-trip time and the bandwidth-delay product (BDP probing), then grows its windows; the peer echoes the 8 bytes with ACK.',
    HEADERS:'A header block, HPACK-compressed on the wire (the length shown) and decoded here.',DATA:'Body bytes: length-prefixed gRPC messages.',
    GOAWAY:'No new streams on this connection.',RSTSTREAM:'Ends one stream abruptly.',TCP_CLOSE:'The proxy saw the TCP connection close.'};
  let conn=0,list=document.getElementById('cl-list');
  function detail(f){
    let h='<h3>'+f.type+(f.flags&&f.flags.length?' <span class="small mute">['+f.flags.join(', ')+']</span>':'')+'</h3><div class="small mute">'+(f.dir==='c>s'?'client &rarr; server':f.dir==='s>c'?'server &rarr; client':'connection')+(f.stream!==undefined?', stream '+f.stream:'')+(f.len!==undefined?', '+f.len+' bytes of payload':'')+', at '+f.ms.toFixed(2)+' ms</div><p>'+(EXPL[f.type]||'')+'</p>';
    if(f.type==='HEADERS'){const tr=f.headers.some(x=>x[0]==='grpc-status');
      h+='<div class="tw"><table class="small"><tbody>'+f.headers.map(x=>'<tr><td><code>'+esc(x[0])+'</code></td><td style="overflow-wrap:anywhere"><code>'+esc(x[1])+'</code></td></tr>').join('')+'</tbody></table></div>';
      if(tr)h+='<p class="small">'+(f.headers.some(x=>x[0]===':status')?'<b>Trailers-only:</b> status, content type and the gRPC result in one frame, because the call failed before any message.':'<b>Trailers:</b> sent after the last DATA frame, with END_STREAM. <code>grpc-status 0</code> is OK.')+'</p>';
      else if(f.dir==='c>s')h+='<p class="small">The call: <code>:path</code> names the method; <code>te: trailers</code> and <code>content-type: application/grpc</code> mark it as gRPC; <code>grpc-timeout</code> carries the deadline.</p>'}
    if(f.type==='DATA'){const b=f.hex.split(' ').map(x=>parseInt(x,16));
      if(b.length>=5){const ln=((b[1]*256+b[2])*256+b[3])*256+b[4],msg=b.slice(5,5+ln);
        const sch=conn===2?(f.dir==='c>s'?SCHEMA.hreq:SCHEMA.hres):(f.dir==='c>s'?SCHEMA.req:SCHEMA.tok);
        h+='<div class="hx"><span class="pf">'+hex(b.slice(0,5))+'</span> '+hex(msg)+'</div><p class="small"><span class="pf" style="background:#c2703a33">'+hex(b.slice(0,5))+'</span>: compressed flag '+b[0]+', message length '+ln+' bytes.</p>'+
          (ln?'<div class="hx">'+walk(msg,sch,0).join('<br>')+'</div>':'<p class="small">An empty message (0 bytes): the request type has no fields set.</p>')}}
    if(f.type==='SETTINGS'&&f.settings)h+='<div class="hx">'+Object.entries(f.settings).map(([k,v])=>esc(k)+' = '+v).join('<br>')+'</div>';
    if(f.type==='WINDOWUPDATE')h+='<div class="hx">increment '+f.increment.toLocaleString('en-GB')+'</div>';
    if(f.type==='PING')h+='<div class="hx">opaque data '+f.opaque+'</div>';
    if(f.type==='PREFACE')h+='<div class="hx">'+f.hex+'</div>';
    return h}
  let A;
  function draw(i){const c=CONNS[conn],f=c[i];
    document.getElementById('cl-det').innerHTML=detail(f);
    [...list.children].forEach((r,k)=>{r.classList.toggle('cur',k===i);r.classList.toggle('fut',k>i)});
    const cur=list.children[i];if(cur&&list.offsetParent){const top=cur.offsetTop-list.offsetTop;if(top<list.scrollTop||top>list.scrollTop+list.clientHeight-30)list.scrollTop=Math.max(0,top-60)}}
  function build(){const c=CONNS[conn];
    list.innerHTML=c.map((f,k)=>'<div class="fr '+(f.dir==='c>s'?'c':f.dir==='s>c'?'s':'x')+'" data-k="'+k+'"><span class="ms">'+f.ms.toFixed(1)+'</span><span>'+(f.dir==='c>s'?'&rarr;':f.dir==='s>c'?'&larr;':'&middot;')+'</span><span class="ty"><b>'+f.type+'</b>'+(f.stream?' s'+f.stream:'')+(f.flags&&f.flags.length?' '+f.flags.join(','):'')+(f.type==='HEADERS'?' '+esc((f.headers.find(x=>x[0]===':path'||x[0]===':status'||x[0]==='grpc-status')||[''])[0]+' '+(f.headers.find(x=>x[0]===':path'||x[0]===':status'||x[0]==='grpc-status')||['',''])[1]):'')+(f.type==='DATA'?' '+f.len+' B':'')+'</span></div>').join('');
    const a=S.frames.app[conn];
    document.getElementById('cl-app').innerHTML='<div><b>What the client code saw</b><br>'+esc(a.call)+': '+(a.tokens?a.tokens.map(t=>esc(JSON.stringify(t[1]))+' at '+t[0]+' ms').join(', ')+'; '+esc(a.code):a.status?'status '+esc(a.status)+' (bytes '+a.bytes+')':esc(a.code)+', "'+esc(a.details||'')+'"')+'</div>'+
      '<div><b>On the wire</b><br>'+c.filter(f=>f.stream!==undefined).length+' frames, '+c.filter(f=>f.dir==='c>s').reduce((x,f)=>x+(f.len||0),0)+' payload bytes sent, '+c.filter(f=>f.dir==='s>c').reduce((x,f)=>x+(f.len||0),0)+' received (plus 9 bytes of frame header each)</div>'}
  list.addEventListener('click',e=>{const r=e.target.closest('.fr');if(r&&A)A.go(+r.dataset.k)});
  build();
  A=RD.anim({card:'cl-det',ctl:'cl-ctl',n:CONNS[0].length,ms:900,draw,label:'Frame',tab:'t-call'});
  RD.seg(document.getElementById('cl-seg'),m=>{conn=+m;build();A.reset(CONNS[conn].length)});
})();
