// ---- Reading, part A: recorded numbers into the prose, the request path, protobuf widgets, the recorded gRPC call ----
(function(){
  const S=window.SA,esc=RD.esc;
  const get=p=>p.split('.').reduce((o,k)=>o==null?o:o[k],S);
  const fmt=v=>typeof v==='number'?(Math.abs(v)>=10000?v.toLocaleString('en-GB'):String(v)):String(v);
  // every [data-sa] element shows one recorded value, so prose and recordings cannot drift apart
  document.querySelectorAll('[data-sa]').forEach(e=>{const v=get(e.dataset.sa);e.textContent=v==null?'(missing)':fmt(v)});

  // ---- the request path behind the front door ----
  const P=[['Your app','REST + SSE over HTTPS','c1'],['API front door','auth, rate limits; translates','c2'],['Router','gRPC, picks a replica (L7)','c4'],['Inference server','gRPC server streaming','c3'],['Telemetry collector','OTLP over gRPC, port 4317','c6']];
  const pb=document.getElementById('rd-pathbox');
  if(pb){pb.innerHTML='<style>#rd-pathbox{display:flex;flex-wrap:wrap;gap:6px;align-items:stretch;margin:6px 0}#rd-pathbox .nd{flex:1 1 130px;min-width:0;border:1px solid var(--line);border-top:4px solid var(--k);border-radius:8px;padding:6px 8px;background:var(--bg)}#rd-pathbox .nd b{display:block;font-size:13px}#rd-pathbox .nd span{font-size:12px;color:var(--mute)}</style>'+
    P.map(p=>'<div class="nd" style="--k:var(--'+p[2]+')"><b>'+p[0]+'</b><span>'+p[1]+'</span></div>').join('')}

  // ---- varint encoder, checked against the library's bytes ----
  function varint(n){const out=[];n=BigInt(n);do{let b=Number(n&127n);n>>=7n;if(n>0n)b|=128;out.push(b)}while(n>0n);return out}
  const hx=b=>b.toString(16).padStart(2,'0');
  const chk=S.pb.varints.map(r=>varint(r.v).map(hx).join(' ')===r.hex);
  const vc=document.getElementById('rd-vcheck');
  if(vc)vc.innerHTML=chk.every(x=>x)?'<span class="pill ok">all '+chk.length+' match</span>':'<span class="pill bad">mismatch</span>';
  function drawV(){
    let v=Math.floor(+document.getElementById('rd-vval').value||0),fn=Math.floor(+document.getElementById('rd-vfn').value||1);
    v=Math.max(0,Math.min(4294967295,v));fn=Math.max(1,Math.min(536870911,fn));
    const vb=varint(v),tag=varint(fn*8+0);
    const bits=v.toString(2),groups=[];for(let i=bits.length;i>0;i-=7)groups.unshift(bits.slice(Math.max(0,i-7),i));
    document.getElementById('rd-vbits').innerHTML='binary '+groups.map(g=>'<b>'+g+'</b>').join(' ')+' &rarr; 7-bit groups, low group first, top bit set on all but the last &rarr; '+vb.map(hx).join(' ');
    document.getElementById('rd-vout').innerHTML=RD.stat('Value bytes',vb.map(hx).join(' '),vb.length+' byte'+(vb.length>1?'s':''))+
      RD.stat('Tag bytes (field '+fn+', VARINT)',tag.map(hx).join(' '),'('+fn+' &lt;&lt; 3) | 0 = '+(fn*8))+
      RD.stat('Same field in JSON','"f":'+v,(String(v).length+5)+' bytes with a 1-letter name');
  }
  ['rd-vval','rd-vfn'].forEach(id=>{const e=document.getElementById(id);if(e)e.addEventListener('input',drawV)});
  if(document.getElementById('rd-vval'))drawV();

  // ---- the 49-byte request, clickable ----
  const req=S.pb.request,strip=document.getElementById('rd-pbstrip'),info=document.getElementById('rd-pbinfo');
  if(strip){
    // colour by top-level field: find the field each row belongs to
    let cur=0;const rows=req.rows.map(r=>{if(r.d===0&&r.k==='tag')cur=+r.what.match(/field (\d+)/)[1];return Object.assign({f:cur},r)});
    let html='';rows.forEach((r,i)=>{r.hex.split(' ').forEach(b=>{html+='<span class="f'+(r.f%5)+(r.k==='tag'?' tg':'')+'" data-i="'+i+'">'+b+'</span>'})});
    strip.innerHTML=html;
    strip.addEventListener('click',e=>{const s=e.target.closest('span[data-i]');if(!s)return;const i=+s.dataset.i,r=rows[i];
      strip.querySelectorAll('span').forEach(x=>x.classList.toggle('on',x.dataset.i===s.dataset.i));
      info.innerHTML='<b>Bytes '+r.off+(r.hex.split(' ').length>1?' to '+(r.off+r.hex.split(' ').length-1):'')+'</b> ('+(r.d?'inside the nested Message':'top level')+'): '+esc(r.what)+'.';});
    document.getElementById('rd-pbout').innerHTML=RD.stat('Protobuf',req.pb_bytes+' bytes','as gRPC message: '+req.grpc_frame_bytes+' with the 5-byte prefix')+RD.stat('JSON',req.json_bytes+' bytes','request.json, the root page\'s body')+RD.stat('Ratio',(req.json_bytes/req.pb_bytes).toFixed(1)+'&times;','JSON bytes / protobuf bytes');
  }
  const z=S.pb.zigzag;const z1=document.getElementById('rd-zz1'),z2=document.getElementById('rd-zz2');
  if(z1){z1.textContent=z.int32_minus1+' ('+z.int32_minus1_bytes+' bytes with the tag)';z2.textContent=z.sint32_minus1+' ('+z.sint32_minus1_bytes+')'}
  // ---- schema evolution table ----
  const ev=document.querySelector('#rd-evo tbody');
  if(ev){const a=S.pb.evolve_add,r=S.pb.evolve_reuse,s=S.pb.evolve_silent;const js=o=>'<code>'+esc(JSON.stringify(o))+'</code>';
    ev.innerHTML='<tr><td>v2 adds <code>float temperature = 5</code> and <code>repeated uint32 stop_token_ids = 6</code> ('+a.v2_bytes+' bytes)</td><td>'+js(a.v1_sees)+'; the extra bytes <code>'+a.unknown_tail_hex+'</code> kept as unknown fields and written back unchanged: '+(a.v1_reserialised_equal?'byte-identical':'changed')+'</td><td><span class="pill ok">safe</span></td></tr>'+
      '<tr><td>Field 3 reused as <code>string max_tokens_note = 3</code> ("sixteen"), a different wire type</td><td>'+js(r.old_reader_sees)+': no error, no <code>maxTokens</code>, so it reads as 0</td><td><span class="pill bad">silent</span></td></tr>'+
      '<tr><td>Field 3 reused as <code>uint32 priority = 3</code>, value 9, same wire type</td><td>'+js(s.old_reader_sees)+'</td><td><span class="pill bad">silent and wrong</span></td></tr>'}
  // ---- tensor table ----
  const tt=document.querySelector('#rd-tensor tbody');
  if(tt)tt.innerHTML=S.pb.tensor.rows.map(r=>'<tr><td>'+esc(r.fmt)+'</td><td class="num">'+r.bytes.toLocaleString('en-GB')+'</td><td class="num">'+r.enc_ms+'</td><td class="num">'+r.dec_ms+'</td></tr>').join('');

  // ---- the recorded server-streaming call, compact ----
  const W=document.getElementById('rd-grpcwire');
  if(W){const c=S.frames.conns[0];let i0=0;
    const line=f=>{let d='';
      if(f.type==='HEADERS')d=f.headers.map(h=>'<code>'+esc(h[0])+(h[1]!==''?': '+esc(h[1]):': (empty)')+'</code>').join('<br>');
      else if(f.type==='DATA'){const b=f.hex.split(' ');d='<code>'+b.slice(0,5).join(' ')+'</code> + '+(b.length-5)+' bytes of protobuf'+(f.dir==='s>c'?' (token)':' (the request)');}
      return '<tr><td class="num">'+f.ms.toFixed(1)+'</td><td>'+(f.dir==='c>s'?'C&rarr;S':'S&rarr;C')+'</td><td><b>'+f.type+'</b>'+(f.flags&&f.flags.length?' <span class="small mute">'+f.flags.join(', ')+'</span>':'')+'</td><td style="overflow-wrap:anywhere">'+d+'</td></tr>'};
    const keep=c.filter(f=>f.type==='HEADERS'||f.type==='DATA');
    W.innerHTML='<div class="tw"><table class="small"><thead><tr><th class="num">ms</th><th>Dir.</th><th>Frame</th><th>Content</th></tr></thead><tbody>'+keep.map(line).join('')+'</tbody></table></div><p class="small mute">'+'C&rarr;S is client to server. '+keep.length+' of the connection\'s '+c.filter(f=>f.stream!==undefined).length+' frames (HEADERS and DATA only; SETTINGS, WINDOW_UPDATE and PING are in the TABLINK tab). <span class="meas">measured</span> grpcio '+S.meta.grpcio+', '+S.meta.recorded+'.</p>';
    W.innerHTML=W.innerHTML.replace('TABLINK','<a href="#" data-tab="t-call">One gRPC call</a>');RD.tabLinks(W)}
  // ---- REST + SSE against gRPC ----
  const vr=document.querySelector('#rd-vsrest tbody');
  if(vr){const c=S.frames.conns[0];const fh=c.filter(f=>f.type==='HEADERS');const dt=c.filter(f=>f.type==='DATA');
    const reqH=fh[0].len,reqD=dt[0].len,resH=fh[1].len,trl=fh[2].len,toks=dt.slice(1).reduce((a,f)=>a+f.len,0);
    vr.innerHTML='<tr><td>Request head</td><td class="num">160</td><td class="num">'+reqH+'</td><td>HPACK starts empty on a new connection, so most fields go literally</td></tr>'+
      '<tr><td>Request body</td><td class="num">117</td><td class="num">'+reqD+'</td><td>49 bytes of protobuf + 5-byte prefix</td></tr>'+
      '<tr><td>Five tokens</td><td class="num">771</td><td class="num">'+toks+'</td><td>SSE repeats event names and JSON keys per token; gRPC sends 2 small fields</td></tr>'+
      '<tr><td>Response head (gRPC: head + trailers)</td><td class="num">244</td><td class="num">'+(resH+trl)+'</td><td>gRPC adds a trailers frame with <code>grpc-status</code></td></tr>'}
})();
