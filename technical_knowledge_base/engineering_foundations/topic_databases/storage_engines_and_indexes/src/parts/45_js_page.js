// ---- Inside real pages tab: heap page 0, an update, the B-tree path (all data from SE.m1, printed by pageinspect) ----
(function(){
  const $=id=>document.getElementById(id);if(!$('t-page'))return;const M=SE.m1,esc=RD.esc;
  // t_infomask and t_infomask2 bits (src/include/access/htup_details.h)
  const IM=[[0x0001,'has nulls'],[0x0002,'has variable-width columns'],[0x0004,'has TOASTed values'],[0x0100,'xmin committed'],[0x0200,'xmin invalid (aborted)'],[0x0400,'xmax committed'],[0x0800,'xmax invalid (no deleter)'],[0x2000,'this is an updated version']];
  const im=v=>IM.filter(([b])=>v&b).map(x=>x[1]).join(', ')||'none';
  const im2=v=>(v&0x7ff)+' columns'+(v&0x4000?', HOT updated (a newer version follows on this page)':'')+(v&0x8000?', heap-only tuple (no index entry points here)':'');
  const key=d=>{const b=(d||'').trim().split(/\s+/).filter(Boolean).slice(0,8);if(!b.length)return null;let v=0;for(let i=b.length-1;i>=0;i--)v=v*256+parseInt(b[i],16);return v};
  const items=M.page0_items,rows={};(M.page0_rows||[]).forEach(r=>{rows[(r.tid||r.ctid)]=r});
  let sel=1;
  function strip(){const P=8192,h=M.page0_header[0]||M.page0_header;let s='';
    const seg=(w,c,t,id)=>'<span style="width:'+(100*w/P).toFixed(3)+'%;background:'+c+'"'+(id?' data-lp="'+id+'"':'')+' title="'+t+'"'+(id===sel?' class="sel"':'')+'></span>';
    s+=seg(24,'var(--c4)','page header, 24 bytes')+seg(h.lower-24,'var(--c1)','line pointers, '+(h.lower-24)+' bytes')+seg(h.upper-h.lower,'var(--dim)','free, '+(h.upper-h.lower)+' bytes');
    [...items].sort((a,b)=>a.lp_off-b.lp_off).forEach((t,i)=>{s+=seg(t.lp_len+((i<items.length-1)?0:0),i%2?'var(--c3)':'var(--c6)','slot '+t.lp+': '+t.lp_len+' bytes at offset '+t.lp_off,t.lp)});
    $('pg-strip').innerHTML=s}
  function det(){const t=items.find(x=>x.lp===sel),r=rows['(0,'+sel+')'];
    $('pg-det').innerHTML='<h3>Slot '+sel+' of page 0, ctid (0,'+sel+')</h3><dl class="kv">'+
      '<dt>Line pointer</dt><dd>offset '+t.lp_off+', length '+t.lp_len+' bytes, flags '+t.lp_flags+(t.lp_flags===1?' (normal)':'')+'</dd>'+
      '<dt>xmin / xmax</dt><dd>'+esc(t.t_xmin)+' / '+esc(t.t_xmax)+(t.t_xmax==='0'?' (no transaction has deleted or replaced it)':'')+'</dd>'+
      '<dt>t_ctid</dt><dd>'+esc(t.t_ctid)+' (points to itself: this is the current version)</dd>'+
      '<dt>t_infomask</dt><dd>'+t.t_infomask+': '+im(t.t_infomask)+'</dd><dt>t_infomask2</dt><dd>'+t.t_infomask2+': '+im2(t.t_infomask2)+'</dd>'+
      '<dt>t_hoff</dt><dd>'+t.t_hoff+' bytes of header before the data (23, padded to 24)</dd>'+
      (r?'<dt>The row</dt><dd>id '+r.id+', chat '+r.chat_id+', '+esc(r.role)+', '+esc(r.model)+', '+r.tokens+' tokens, content '+r.content_len+' characters ("'+esc(r.content_start||'')+'..."), '+esc(r.created_at)+'</dd>':'')+'</dl>'}
  function table(){$('pg-slots').innerHTML='<thead><tr><th class="num">Slot</th><th class="num">Offset</th><th class="num">Length</th><th>xmin</th><th>xmax</th><th>t_ctid</th><th class="num">id</th><th class="num">chat_id</th><th>role</th><th class="num">tokens</th></tr></thead><tbody>'+
    items.map(t=>{const r=rows['(0,'+t.lp+')']||{};return '<tr data-lp="'+t.lp+'"'+(t.lp===sel?' class="sel"':'')+'><td class="num">'+t.lp+'</td><td class="num">'+t.lp_off+'</td><td class="num">'+t.lp_len+'</td><td>'+esc(t.t_xmin)+'</td><td>'+esc(t.t_xmax)+'</td><td>'+esc(t.t_ctid)+'</td><td class="num">'+(r.id||'')+'</td><td class="num">'+(r.chat_id||'')+'</td><td>'+esc(r.role||'')+'</td><td class="num">'+(r.tokens||'')+'</td></tr>'}).join('')+'</tbody>'}
  function pick(lp){sel=lp;strip();det();table()}
  $('pg-strip').addEventListener('click',e=>{const s=e.target.closest('[data-lp]');if(s)pick(+s.dataset.lp)});
  $('pg-slots').addEventListener('click',e=>{const s=e.target.closest('tr[data-lp]');if(s)pick(+s.dataset.lp)});
  // update
  function upd(m){let h;
    if(m==='full'){const o=M.after_update_page.find(x=>x.t_xmax!=='0');
      h='<p>Message 60 sits in slot '+o.lp+' of page 1, which is full. <code>UPDATE messages SET tokens = tokens + 1 WHERE id = 60</code>:</p><dl class="kv"><dt>Old version</dt><dd>ctid (1,'+o.lp+'), xmax set to '+esc(o.t_xmax)+' (the updating transaction), t_ctid now points to '+esc(o.t_ctid)+'</dd><dt>New version</dt><dd>'+esc(M.update_new_ctid)+': the last page of the table, because page 1 had no room</dd><dt>Indexes</dt><dd>Every index (primary key and chat_id) gets a new entry pointing to '+esc(M.update_new_ctid)+'. Statistics: n_tup_hot_upd = '+M.hot_stats.find(x=>x.relname==='messages').n_tup_hot_upd+'</dd></dl>'}
    else{const o=M.hot_page.find(x=>x.hot_updated),n=M.hot_page.find(x=>x.heap_only);
      h='<p>A copy of the first 2,000 messages, created <code>WITH (fillfactor = 90)</code>, so every page keeps about 800 bytes free. The same kind of update on message 10:</p><dl class="kv"><dt>Old version</dt><dd>ctid (0,'+o.lp+'), xmax '+esc(o.t_xmax)+', t_ctid '+esc(o.t_ctid)+', infomask2 '+o.t_infomask2+': '+im2(o.t_infomask2)+'</dd><dt>New version</dt><dd>ctid (0,'+n.lp+') on the same page, infomask2 '+n.t_infomask2+': '+im2(n.t_infomask2)+'</dd><dt>Indexes</dt><dd>Untouched: an index lookup still finds (0,'+o.lp+') and follows the chain inside the page. Statistics: n_tup_hot_upd = '+M.hot_stats.find(x=>x.relname==='m_ff').n_tup_hot_upd+'</dd></dl>'}
    $('pg-upd-out').innerHTML=h}
  RD.seg($('pg-upd'),upd);
  // B-tree path
  const meta=M.bt_meta[0],path=M.bt_path_42000;
  const pages=[{id:'meta',t:'Metapage',s:'page 0',n:'root '+meta.root+', level '+meta.level}].concat(path.map(p=>({id:p.blkno,t:p.type==='r'?'Root':p.type==='i'?'Internal page':'Leaf page',s:'page '+p.blkno,n:p.live_items+' entries, '+p.free_size+' bytes free',st:p})),[{id:'heap',t:'Table pages',s:'6 pages',n:M.chat_42000_ctids}]);
  let cur=pages[1].id;
  function chain(){$('pg-chain').innerHTML=pages.map(p=>'<button data-p="'+p.id+'"'+(String(p.id)===String(cur)?' class="on"':'')+'><b>'+p.t+'</b><span>'+esc(p.s)+' &middot; '+esc(p.n)+'</span></button>').join('')}
  function itemsOf(id){if(id===meta.root)return M.bt_root_items;if(id===path[1].blkno)return M.bt_internal_all||[];if(id===path[path.length-1].blkno)return M.bt_leaf_all||M.bt_leaf_items_42000;return []}
  function pathOut(){let h='';const p=pages.find(x=>String(x.id)===String(cur));
    if(cur==='meta')h='<p>The metapage (page 0) records where the root is (page '+meta.root+'), the tree level of the root ('+meta.level+', so '+(meta.level+1)+' levels), and a "fast root" used after many deletions. <code>allequalimage = '+meta.allequalimage+'</code> means deduplication is safe for this index.</p>';
    else if(cur==='heap')h='<p>The leaf entry for chat 42000 holds 6 ctids, and each points into a different table page: '+esc(M.chat_42000_ctids)+'. Six more page reads; a covering index (Reading section 10) or a table clustered by chat (section 8) would avoid most of them.</p>';
    else{const its=itemsOf(cur),st=p.st;let hlIdx=-1;
      const hk=it=>st.btpo_next!==0&&it.itemoffset===1;
      its.forEach((it,i)=>{if(hk(it))return;const k=key(it.data);if(k===null||k<42000||(st.type==='l'&&k===42000)){if(st.type==='l'){if(k===42000)hlIdx=i}else hlIdx=i}});
      const show=its.length>40?its.filter((it,i)=>i<5||Math.abs(i-hlIdx)<=4||i>=its.length-3):its;
      h='<p>'+p.t+' '+cur+': '+st.live_items+' entries, average entry '+st.avg_item_size+' bytes, '+st.free_size+' bytes free, left neighbour '+st.btpo_prev+', right neighbour '+st.btpo_next+'. '+(st.type==='l'?'Each entry is a key and the ctid of its row, or (after deduplication) a key and a list of ctids.':'Each entry is a separator key and the page number of a child; the first downlink has no key ("minus infinity").')+(st.btpo_next!==0?' Entry 1 is the page\'s high key.':'')+(its.length>40?' Showing the first 5, the ones around the path, and the last 3 of '+its.length+'.':'')+'</p>';
      h+='<div class="items"><table><thead><tr><th class="num">#</th><th class="num">Key</th><th>'+(st.type==='l'?'Points to':'Child page')+'</th><th class="num">Bytes</th></tr></thead><tbody>'+
        show.map(it=>{const k=key(it.data),i=its.indexOf(it),child=(it.tid||it.ctid||'').replace(/[()]/g,'').split(',')[0];
          if(hk(it))return '<tr><td class="num">1</td><td class="num">'+(k===null?'':k.toLocaleString('en-US'))+'</td><td>high key: every key on this page is at most this; larger keys are to the right</td><td class="num">'+it.itemlen+'</td></tr>';
          return '<tr'+(i===hlIdx?' class="hl"':'')+'><td class="num">'+it.itemoffset+'</td><td class="num">'+(k===null?'(minus infinity)':k.toLocaleString('en-US'))+'</td><td>'+(st.type==='l'?(it.ntids>1?it.ntids+' rows (posting list)':esc(it.tid||it.ctid||'')):'page '+child)+'</td><td class="num">'+it.itemlen+'</td></tr>'}).join('')+'</tbody></table></div>'}
    $('pg-path-out').innerHTML=h}
  $('pg-chain').addEventListener('click',e=>{const b=e.target.closest('button[data-p]');if(!b)return;cur=isNaN(+b.dataset.p)?b.dataset.p:+b.dataset.p;chain();pathOut()});
  pick(1);upd('full');chain();pathOut();
})();
