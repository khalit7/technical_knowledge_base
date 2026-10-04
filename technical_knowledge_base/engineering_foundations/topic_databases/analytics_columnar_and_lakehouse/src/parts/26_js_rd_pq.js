// ---- Reading sections 5 and 9: Parquet layout drawing, row group 0 metadata table, Iceberg mini tree ----
(function(){
  const $=id=>document.getElementById(id);
  function layout(){
    const el=$('pqLayout');if(!el)return;const W=Math.min(860,RD.width(el.parentNode)-30),narrow=W<520;
    const cols=['id','chat_id','role','model','tokens','content','created_at'];
    let y=8,b='';const box=(x,yy,w,h,fill,label,o)=>{o=o||{};return '<rect x="'+x+'" y="'+yy+'" width="'+w+'" height="'+h+'" rx="3" fill="'+fill+'" stroke="var(--line)"/>'+(label?RD.t(x+6,yy+h/2+4,label,{fs:o.fs||11,fill:o.fill}):'')};
    b+=box(0,y,W,22,'var(--c2)','PAR1 (4 bytes)',{fill:'var(--bg)'});y+=28;
    [0,1].forEach(g=>{
      b+=RD.t(0,y+12,'Row group '+g+(g?' ... (82 in the 10M file)':': 122,880 rows'),{fs:11.5,w:600});y+=18;
      const cw=(W-(narrow?0:0))/ (narrow?2:cols.length);
      cols.forEach((c,i)=>{const col=narrow?i%2:i,row=narrow?Math.floor(i/2):0,x=col*cw,yy=y+row*40;
        b+='<rect x="'+(x+1)+'" y="'+yy+'" width="'+(cw-3)+'" height="34" rx="3" fill="var(--acc2)" stroke="var(--line)"/>'+RD.t(x+5,yy+13,c,{fs:10.5,w:600})+RD.t(x+5,yy+27,'header | pages',{fs:9.5,fill:'var(--mute)'})});
      y+=(narrow?Math.ceil(cols.length/2):1)*40+6});
    b+=box(0,y,W,34,'var(--soft)',narrow?'Footer: schema, chunk offsets, statistics':'Footer: schema; per row group and column: offset, sizes, encodings, codec, min, max, nulls',{fs:narrow?10:11});y+=40;
    b+=box(0,y,W*0.45,22,'var(--soft)','footer length (4 bytes)',{fs:10.5})+box(W*0.47,y,W*0.53,22,'var(--c2)','PAR1',{fill:'var(--bg)'});y+=28;
    el.outerHTML='<svg id="pqLayout" viewBox="0 0 '+W+' '+y+'" width="'+W+'" height="'+y+'" role="img" aria-label="Parquet file layout">'+b+'</svg>';
  }
  layout();RD.onResize(layout);RD.onRender(layout);
  // row group 0 of the 10M file
  const c0=D.full.rg0_columns;
  $('pqRg0').innerHTML='<table class="small"><thead><tr><th>Column</th><th>Type</th><th>Encodings</th><th class="num">Compressed</th><th class="num">Uncompressed</th><th>Min</th><th>Max</th></tr></thead><tbody>'+
    c0.map(c=>'<tr><td><code>'+c.col+'</code></td><td>'+c.physical+'</td><td>'+c.encodings.join(', ')+'</td><td class="num">'+FMT.mb(c.compressed)+'</td><td class="num">'+FMT.mb(c.uncompressed)+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.min).slice(0,22))+'</td><td style="overflow-wrap:anywhere">'+RD.esc(String(c.max).slice(0,22))+'</td></tr>').join('')+'</tbody></table>'+
    '<div class="small mute">'+D.full.created_by+'; codec SNAPPY for every chunk; 122,880 values each. "PLAIN_DICTIONARY" is how pyarrow names DuckDB\'s dictionary encoding (the spec now calls it RLE_DICTIONARY).</div>';
  // Iceberg tree after the second append
  function tree(){
    const el=$('iceTree');if(!el)return;const W=Math.min(860,RD.width(el.parentNode)-30);
    const s=D.ice.steps[2],fs=s.files,ml=fs.find(f=>f.kind==='manifest list'),mj=fs.find(f=>f.kind==='metadata.json');
    const short=p=>p.split('/').pop();const tr=(p,n)=>{p=short(p);return p.length>n?p.slice(0,n-1)+'…':p};
    const n=W<520?22:40;
    const ms=ml.entries.map(e=>e.manifest_path),dfs=[D.ice.steps[1].files.find(f=>f.kind.startsWith('data')).path,fs.find(f=>f.kind.startsWith('data')).path];
    const rows=[{y:6,items:[{t:'catalog: chat.messages',s:'pointer to current metadata'}]},
      {y:56,items:[{t:tr(mj.path,n),s:'snapshots 1 and 2, schema, partition spec'}]},
      {y:106,items:[{t:tr(ml.path,n),s:'manifest list of snapshot 2'}]},
      {y:156,items:ms.map((p,i)=>({t:tr(p,n/2+4),s:'manifest: 1 file, 28,800 rows'}))},
      {y:206,items:dfs.slice().reverse().map(p=>({t:tr(p,n/2+4),s:'Parquet, '+p.split('/')[3].replace('created_at_day=','day ')}))}];
    let b='';const bh=40;
    rows.forEach((r,ri)=>{const k=r.items.length,w=(W-(k-1)*8)/k;
      r.items.forEach((it,i)=>{const x=i*(w+8);
        b+='<rect x="'+x+'" y="'+r.y+'" width="'+w+'" height="'+bh+'" rx="4" fill="'+(ri===0?'var(--acc2)':ri===4?'var(--soft)':'var(--bg)')+'" stroke="var(--acc)"/>'+RD.t(x+6,r.y+16,RD.esc(it.t),{fs:10.5,w:600})+RD.t(x+6,r.y+31,RD.esc(it.s),{fs:9.5,fill:'var(--mute)'});
        if(ri>0){const prev=rows[ri-1],pk=prev.items.length,pw=(W-(pk-1)*8)/pk,pi=Math.min(pk-1,i),px=pi*(pw+8)+pw/2;
          b+='<line x1="'+px+'" y1="'+(prev.y+bh)+'" x2="'+(x+w/2)+'" y2="'+r.y+'" stroke="var(--mute)"/>'}})});
    el.outerHTML='<svg id="iceTree" viewBox="0 0 '+W+' 250" width="'+W+'" height="250" role="img" aria-label="Iceberg metadata tree">'+b+'</svg>';
  }
  tree();RD.onResize(tree);RD.onRender(tree);
})();
