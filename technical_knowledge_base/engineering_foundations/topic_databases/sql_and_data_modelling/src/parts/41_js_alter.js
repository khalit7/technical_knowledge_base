// ---- ALTER TABLE, measured (inputs/alter.json via gen_js.py) ----
(function(){
  const tb=document.getElementById('al-table');if(!tb)return;
  const A=window.SM_DATA.alter,esc=RD.esc;
  const SAFE={add_null:'Safe as is, with lock_timeout.',add_const:'Safe since PostgreSQL 11, with lock_timeout.',
    add_volatile:'Add the column nullable with no default, backfill in batches, then SET DEFAULT for new rows.',
    add_generated:'Rewrites. On a big table add a plain column kept by a trigger and backfilled in batches; PostgreSQL 18’s virtual generated columns (the default there) compute on read and need no rewrite.',
    drop_col:'Instant (space is reclaimed later); deploy code that no longer reads the column first.',
    rename_col:'Instant, but breaks the running code: expand and contract instead (Reading, section 11).',
    set_default:'Safe: affects only rows inserted later.',
    type_bigint:'Rewrite plus index rebuild. Add a bigint column, write both, backfill in batches, switch, drop the old one.',
    type_widen:'Safe: widening a varchar needs no rewrite.',
    type_text:'Rewrote here. Prefer text with CHECK (length(col) <= 200), added NOT VALID and validated.',
    set_nn:'Scans under ACCESS EXCLUSIVE. Add CHECK (col IS NOT NULL) NOT VALID, VALIDATE it, then SET NOT NULL (next row).',
    set_nn_check:'The safe recipe’s last step: instant because a validated CHECK proves there are no NULLs (PostgreSQL 12 and later).',
    check:'Scans under ACCESS EXCLUSIVE: add it NOT VALID, then VALIDATE.',check_nv:'Instant; only new and updated rows are checked until validated.',
    check_validate:'Scans, but reads and writes continue.',fk:'Scans while blocking writes to both tables: add it NOT VALID, then VALIDATE.',
    fk_nv:'Instant, still a brief write-blocking lock on both tables.',fk_validate:'Scans without blocking reads or writes.',
    index:'Blocks writes for the whole build: use CONCURRENTLY.',
    index_conc:'The safe form: slower, cannot run inside a transaction, and if it fails it leaves an INVALID index to drop and retry.',
    unique_conc:'The safe way to add UNIQUE or PRIMARY KEY: build the unique index CONCURRENTLY, then attach it (instant).'};
  const CLS={AccessExclusiveLock:'ae',ShareRowExclusiveLock:'sre',ShareLock:'sh',ShareUpdateExclusiveLock:'sue'};
  const fmt=s=>s<0.01?(s*1000).toFixed(1)+' ms':s<100?s.toFixed(2)+' s':s<7200?(s/60).toFixed(0)+' min':(s/3600).toFixed(1)+' h';
  const grps=[...new Set(A.ops.map(o=>o.grp))];let grp='All',only=false;
  const segEl=document.getElementById('al-grp');segEl.innerHTML=['All'].concat(grps).map((g,i)=>'<button data-m="'+esc(g)+'"'+(i?'':' class="on"')+'>'+esc(g)+'</button>').join('');
  const rowsIn=document.getElementById('al-rows');
  const cards=document.createElement('div');cards.id='al-cards';tb.parentNode.after(cards);
  function draw(){
    const rows=Math.round(Math.pow(10,+rowsIn.value)),k=rows/A.table.rows;
    document.getElementById('al-rows-v').textContent=rows.toLocaleString('en-US');
    document.getElementById('al-est-note').textContent='The last column scales the measured time of rewrites and scans by '+rows.toLocaleString('en-US')+' / '+A.table.rows.toLocaleString('en-US')+' = '+k.toFixed(k<1?3:1)+'x (linear extrapolation, an estimate); metadata-only changes stay at their measured time.';
    const ops=A.ops.filter(o=>(grp==='All'||o.grp===grp)&&(!only||o.blocks_read));
    let h='<tr><th>Change</th><th>Locks held</th><th>Rewrites?</th><th>Blocks SELECT?</th><th>Blocks INSERT?</th><th class="num">Measured</th><th class="num">Your table</th><th>Safe way</th></tr>';
    ops.forEach(o=>{const scales=o.rewrite||o.median_s>0.05;
      h+='<tr><td><b>'+esc(o.label)+'</b><br><code>'+esc(o.sql)+'</code></td><td>'+(o.locks||[]).map(l=>'<span class="lk '+(CLS[l]||'')+'">'+esc(l.replace('Lock',''))+'</span>').join(' ')+'</td>'+
        '<td class="'+(o.rewrite?'y':'n')+'">'+(o.rewrite?'yes':'no')+'</td><td class="'+(o.blocks_read?'y':'n')+'">'+(o.blocks_read?'yes':'no')+'</td><td class="'+(o.blocks_write?'y':'n')+'">'+(o.blocks_write?'yes':'no')+'</td>'+
        '<td class="num">'+fmt(o.median_s)+'</td><td class="num">'+(scales?'~'+fmt(o.median_s*k):fmt(o.median_s))+'</td><td>'+esc(SAFE[o.id]||'')+'</td></tr>'});
    const narrow=(document.documentElement.clientWidth||900)<640;
    if(!narrow){tb.innerHTML=h;cards.innerHTML='';tb.hidden=false;return}
    tb.hidden=true;tb.innerHTML='';
    cards.innerHTML=ops.map(o=>{const scales=o.rewrite||o.median_s>0.05;
      return '<div class="card" style="padding:8px 10px;margin:8px 0"><b>'+esc(o.label)+'</b><pre class="code" style="white-space:pre-wrap;overflow-wrap:anywhere;margin:4px 0">'+esc(o.sql)+'</pre>'+
        '<div class="small">'+(o.locks||[]).map(l=>'<span class="lk '+(CLS[l]||'')+'">'+esc(l.replace('Lock',''))+'</span>').join(' ')+'</div>'+
        '<div class="small">Rewrites: <span class="'+(o.rewrite?'y':'n')+'">'+(o.rewrite?'yes':'no')+'</span>; blocks SELECT: <span class="'+(o.blocks_read?'y':'n')+'">'+(o.blocks_read?'yes':'no')+'</span>; blocks INSERT: <span class="'+(o.blocks_write?'y':'n')+'">'+(o.blocks_write?'yes':'no')+'</span></div>'+
        '<div class="small">Measured '+fmt(o.median_s)+'; your table '+(scales?'~'+fmt(o.median_s*k):fmt(o.median_s))+'</div><div class="small mute">'+esc(SAFE[o.id]||'')+'</div></div>'}).join('');
  }
  RD.seg(segEl,g=>{grp=g;draw()});
  rowsIn.addEventListener('input',draw);
  document.getElementById('al-only').addEventListener('change',e=>{only=e.target.checked;draw()});
  draw();
  let rt=0;addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(draw,80)});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-alter']=[draw];
})();
