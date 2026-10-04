// ---- Inside a Parquet file tab: byte map of the real 23,047-byte file (D.tiny) ----
(function(){
  const T=D.tiny,$=id=>document.getElementById(id),N=T.bytes;
  const CC={id:'var(--c1)',chat_id:'var(--c2)',role:'var(--c3)',model:'var(--c4)',tokens:'var(--c5)',created_at:'var(--c6)'};
  // flatten regions into drawable segments: page header and page body separately
  const segs=[];
  T.regions.forEach((r,i)=>{
    if(r.kind==='page'){segs.push({a:r.start,b:r.hdr_end,k:'hdr',r,i});segs.push({a:r.hdr_end,b:r.end,k:'body',r,i})}
    else segs.push({a:r.start,b:r.end,k:r.kind,r,i})});
  let sel=T.regions.length-2;
  const chunkOf=r=>T.chunks.find(c=>c.col===r.col&&c.rg===r.rg);
  const pageOf=r=>{const c=chunkOf(r);return c&&c.pages.find(p=>p.hdr_start===r.start)};
  function map(){
    const el=$('byMap'),W=RD.width(el),lines=W<520?9:6,BPL=Math.ceil(N/lines),LH=26,H=lines*(LH+8)+4,X=v=>v/BPL*W;
    let b='';
    for(let l=0;l<lines;l++)b+='<rect x="0" y="'+(l*(LH+8))+'" width="'+W+'" height="'+LH+'" fill="var(--soft)"/>';
    segs.forEach(s=>{
      const col=s.k==='magic'||s.k==='footer_len'?'var(--bad)':s.k==='footer'?'var(--mute)':CC[s.r.col];
      const op=s.k==='hdr'?1:s.k==='body'?0.45:0.85;
      let a=s.a;while(a<s.b){const l=Math.floor(a/BPL),e=Math.min(s.b,(l+1)*BPL),x=X(a-l*BPL),w=Math.max(s.b-s.a<16?3:0.5,X(e-a));
        b+='<rect data-i="'+s.i+'" x="'+x.toFixed(1)+'" y="'+(l*(LH+8))+'" width="'+w.toFixed(1)+'" height="'+LH+'" fill="'+col+'" fill-opacity="'+op+'" stroke="'+(s.i===sel?'var(--ink)':'none')+'" stroke-width="2" style="cursor:pointer"><title>'+label(s.r)+'</title></rect>';
        a=e}});
    el.innerHTML=RD.svg(W,H,b,'Byte map of a Parquet file');
    el.querySelectorAll('rect[data-i]').forEach(r=>r.addEventListener('click',()=>{sel=+r.dataset.i;map();detail()}));
  }
  function label(r){return r.kind==='page'?'row group '+r.rg+', '+r.col+', '+r.page.toLowerCase().replace('_',' '):r.kind==='magic'?'magic PAR1':r.kind==='footer'?'footer (file metadata)':'footer length'}
  const hex=h=>'<code style="overflow-wrap:anywhere;display:block;font-size:12px">'+h+'</code>';
  function detail(){
    const r=T.regions[sel];let h='<h3>'+label(r)+'</h3><div class="small mute">bytes '+r.start.toLocaleString()+' to '+(r.end-1).toLocaleString()+' ('+(r.end-r.start).toLocaleString()+' bytes)</div>';
    if(r.kind==='magic')h+='<p>The four ASCII bytes <code>P A R 1</code>:</p>'+hex(r.start===0?T.head_hex.slice(0,11):T.tail_hex.slice(-11))+'<p class="small">'+(r.start===0?'Every Parquet file starts with them. The bytes right after are the first page header of the first column chunk.':'The file also ends with them, so a reader can check it holds a complete Parquet file before trusting the footer length.')+'</p>';
    else if(r.kind==='footer_len')h+='<p>Four bytes, little-endian: <code>'+T.tail_hex.slice(24,35)+'</code> = '+T.footer_len.toLocaleString()+'. So the footer starts at byte '+N.toLocaleString()+' - 8 - '+T.footer_len.toLocaleString()+' = '+T.footer_start.toLocaleString()+'. A reader always starts here.</p>';
    else if(r.kind==='footer'){h+='<p>The file metadata, '+T.footer_len.toLocaleString()+' bytes of Thrift. Decoded: format version 2, <b>'+T.num_rows.toLocaleString()+' rows</b>, written by <code>'+RD.esc(T.created_by)+'</code>; schema: '+T.schema.slice(1).map(s=>s.name+' '+s.type).join(', ')+'; two row groups, each with six column chunks and their offsets, sizes, encodings and min/max (the table below). Its first bytes:</p>'+hex(T.footer_head_hex)+'<p class="small"><code>15 04</code> is field 1 (version, an i32): the byte 04 is 2 in zigzag encoding; <code>19 7c</code> starts field 2 (schema), a list of 7 structs.</p>'}
    else{const c=chunkOf(r),p=pageOf(r);
      h+='<dl class="kv"><dt>Page type</dt><dd>'+p.type+'</dd><dt>Encoding</dt><dd>'+(p.encoding||'')+'</dd><dt>Values</dt><dd>'+(p.num_values||'')+'</dd><dt>Header</dt><dd>'+(p.hdr_end-p.hdr_start)+' bytes</dd><dt>Body</dt><dd>'+p.compressed.toLocaleString()+' bytes (uncompressed '+p.uncompressed.toLocaleString()+')</dd>'+
        '<dt>Column chunk</dt><dd>'+c.type+', '+c.encodings.join(' + ')+', '+c.codec+', '+c.compressed.toLocaleString()+' bytes in total, min '+RD.esc(String(c.min))+', max '+RD.esc(String(c.max))+'</dd></dl>'+
        '<div class="small mute">Page header bytes (Thrift):</div>'+hex(p.hdr_hex)+'<div class="small mute">First bytes of the body:</div>'+hex(p.body_head_hex);
      if(c.col==='created_at')h+='<p class="small">Timestamps are 8-byte integers counting microseconds since 1970: '+Number(c.min).toLocaleString()+' is 2025-09-01 00:00:03 UTC.</p>';
      if(c.col==='id'&&p.type==='DATA_PAGE')h+='<p class="small">Delta encoding: block size, miniblock count, value count, first value, then each block\'s minimum delta (1) and bit widths of 0. 500 ids in '+p.compressed+' bytes.</p>';}
    $('byDetail').innerHTML=h;
  }
  $('byLeg').innerHTML=Object.keys(CC).map(k=>'<span><svg width="12" height="12"><rect width="12" height="12" fill="'+CC[k]+'"/></svg>'+k+'</span>').join('')+'<span><svg width="12" height="12"><rect width="12" height="12" fill="var(--mute)"/></svg>footer</span><span><svg width="12" height="12"><rect width="12" height="12" fill="var(--bad)"/></svg>magic and length</span><span>solid: page header; pale: page body. Regions under 16 bytes are widened to stay clickable.</span>';
  // role decoded
  const rc=T.chunks.find(c=>c.col==='role'&&c.rg===0),dp=rc.pages[0],dt=rc.pages[1];
  $('byRole').innerHTML='<p><b>1. The dictionary page</b> (PLAIN encoding: a 4-byte length, then the bytes):</p>'+hex(dp.body_head_hex)+
    '<p class="small"><code>04 00 00 00</code> = 4, then <code>75 73 65 72</code> = "user"; <code>09 00 00 00</code> = 9, then "assistant". Entry 0 is "'+T.role_dictionary[0]+'", entry 1 is "'+T.role_dictionary[1]+'".</p>'+
    '<p><b>2. The data page</b> (RLE_DICTIONARY): the first byte is the bit width, <code>0'+T.role_bit_width+'</code>: one bit per value is enough for two entries. Then the hybrid stream:</p>'+hex(dt.body_head_hex)+
    '<p class="small">A run header <code>'+dt.body_head_hex.split(' ')[1]+'</code> is a variable-length integer; its lowest bit 1 means a bit-packed run of '+T.role_runs[0].groups_of_8+' groups of 8 values. Each <code>aa</code> byte is binary 10101010; read from the lowest bit, that is 0 1 0 1 0 1 0 1.</p>'+
    '<p><b>3. Decoded:</b> indices '+T.role_first_indices.join(' ')+' map to '+T.role_first_values.slice(0,6).join(', ')+', and so on: the alternating roles of the generator, identical to what pyarrow reads. 500 roles fit in '+dt.compressed+' bytes; as plain strings (4-byte length plus the text) they would be '+(250*(4+4)+250*(4+9)).toLocaleString()+' bytes.</p>';
  // chunk table
  $('byChunks').innerHTML='<table class="small"><thead><tr><th>Row group</th><th>Column</th><th>Type</th><th>Encodings</th><th class="num">Bytes</th><th class="num">Offset</th><th>Min</th><th>Max</th></tr></thead><tbody>'+
    T.chunks.map(c=>'<tr><td>'+c.rg+'</td><td><code>'+c.col+'</code></td><td>'+c.type+'</td><td>'+c.encodings.join(', ')+'</td><td class="num">'+c.compressed.toLocaleString()+'</td><td class="num">'+(c.dictionary_page_offset!=null?c.dictionary_page_offset:c.data_page_offset).toLocaleString()+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.min))+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.max))+'</td></tr>').join('')+'</tbody></table>';
  function all(){map();detail()}
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-bytes']=window.TAB_RENDER['t-bytes']||[]).push(all);
  addEventListener('resize',()=>{const t=$('t-bytes');if(t&&!t.hidden)map()});
  all();
})();
