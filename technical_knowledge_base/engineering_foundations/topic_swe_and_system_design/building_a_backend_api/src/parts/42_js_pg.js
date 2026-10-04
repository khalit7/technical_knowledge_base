// ---- Reading, section 8: measured offset against keyset, and the page-drift animation ----
(function(){
  const D=window.API_DATA,P=D.pg,esc=RD.esc;
  // log-scale bars: 0.01 ms to 1000 ms
  const lo=Math.log10(0.01),hi=Math.log10(1000),pct=v=>Math.max(1.5,(Math.log10(v)-lo)/(hi-lo)*100);
  const fmt=v=>v>=10?Math.round(v).toLocaleString('en-US'):v>=1?v.toFixed(1):v.toFixed(3);
  const deep=P.res[P.res.length-1];
  document.getElementById('rd-pg-bars').innerHTML='<div class="leg"><span style="--sw:var(--c2)">offset</span><span style="--sw:var(--c3)">cursor (keyset)</span><span>log scale, 0.01 ms to 1 s</span></div>'+
    '<div class="bars">'+P.res.map(r=>'<div class="small" style="margin-top:6px"><b>'+(r.d===0?'Page 1':r.d.toLocaleString('en-US')+' rows in')+'</b></div>'+
    [['off','var(--c2)','offset'],['ks','var(--c3)','cursor']].map(k=>'<div class="row"><span class="nm">'+k[2]+'</span><div class="track"><div class="fill" style="width:'+pct(r[k[0]])+'%;background:'+k[1]+'"></div></div><span class="val">'+fmt(r[k[0]])+' ms</span></div>').join('')).join('')+'</div>';
  document.getElementById('rd-pg-note').innerHTML='Postgres '+esc(P.version)+', '+P.rows.toLocaleString('en-US')+' rows (one row per message, 200-byte body), index on (created_at, id), page of '+P.page+'. '+esc(P.method)+'; '+esc(P.machine)+', '+P.date+'. Script: <code>src/service/measure_pagination.py</code>. At the deepest page offset takes '+fmt(deep.off)+' ms and the cursor '+fmt(deep.ks)+' ms, a ratio of about '+Math.round(deep.off/deep.ks).toLocaleString('en-US')+' (= '+fmt(deep.off)+' / '+fmt(deep.ks)+'). Both plans use the same index; offset walks it from the start.';

  // drift animation. Chats newest first, page size 3.
  const base=['H','G','F','E','D','C','B','A'];  // H is newest
  const steps={
    off:[
      {rows:base,page:[0,3],cap:['Page 1: offset 0, limit 3','The user opens the list. The database returns the 3 newest chats: H, G, F.'],seen:['H','G','F'],read:3},
      {rows:['X',...base],ins:'X',page:null,cap:['Meanwhile: a new chat X is created','Another device of the same user creates chat X. It is now the newest row, so every older row moves down one position.'],seen:['H','G','F'],read:3},
      {rows:['X',...base],page:[3,6],cap:['Page 2: offset 3, limit 3','"Skip 3 rows" now skips X, H, G and starts at F, which the user has already seen. F appears twice.'],seen:['H','G','F','F','E','D'],dup:['F'],read:9},
      {rows:['X','H','F','E','D','C','B','A'],del:'G',page:null,cap:['Meanwhile: chat G is deleted','G was on page 1, already seen. Every row after it moves up one position.'],seen:['H','G','F','F','E','D'],dup:['F'],read:9},
      {rows:['X','H','F','E','D','C','B','A'],page:[6,9],cap:['Page 3: offset 6, limit 3','"Skip 6" now lands on B and A. C moved up into position 5, a page the user has already read: C is never shown. And X, created after page 1, never appears at all. The database walked past 6 rows to return 2.'],seen:['H','G','F','F','E','D','B','A'],dup:['F'],miss:['C'],read:17}
    ],
    ks:[
      {rows:base,page:[0,3],cap:['Page 1: no cursor, limit 3','The same first page: H, G, F. The response carries a cursor meaning "after F".'],seen:['H','G','F'],read:3},
      {rows:['X',...base],ins:'X',page:null,cap:['Meanwhile: a new chat X is created','X is added at the top, as before.'],seen:['H','G','F'],read:3},
      {rows:['X',...base],page:'after:F',cap:['Page 2: rows after F, limit 3','The query asks for rows older than F, wherever they now sit. It returns E, D, C. No duplicate: positions moved, F did not.'],seen:['H','G','F','E','D','C'],read:6},
      {rows:['X','H','F','E','D','C','B','A'],del:'G',page:null,cap:['Meanwhile: chat G is deleted','G disappears; no other row changes meaning.'],seen:['H','G','F','E','D','C'],read:6},
      {rows:['X','H','F','E','D','C','B','A'],page:'after:C',cap:['Page 3: rows after C','Returns B and A, then an empty cursor: the end. Every chat that existed when the user started was shown exactly once, and each page read only its own rows. X was created after the user started; a refresh from the top shows it.'],seen:['H','G','F','E','D','C','B','A'],read:8}
    ]};
  let mode='off';const view=document.getElementById('rd-dr-view');
  function draw(i){const s=steps[mode][i];let idx=[];
    if(Array.isArray(s.page))idx=[...Array(s.page[1]-s.page[0]).keys()].map(k=>k+s.page[0]).filter(k=>k<s.rows.length);
    else if(typeof s.page==='string'){const a=s.rows.indexOf(s.page.split(':')[1]);idx=[a+1,a+2,a+3].filter(k=>k<s.rows.length)}
    const seenBefore=steps[mode][Math.max(0,i-1)].seen;
    let h='<div style="display:flex;flex-wrap:wrap;gap:4px;margin:8px 0;align-items:flex-end">';
    s.rows.forEach((r,k)=>{const on=idx.includes(k),dup=on&&(s.dup||[]).includes(r)&&seenBefore.includes(r);
      h+='<div style="text-align:center;min-width:34px"><div class="small mute">'+(mode==='off'?k:'')+'</div><div style="border:2px solid '+(dup?'var(--bad)':on?'var(--acc)':'var(--line)')+';background:'+(r===s.ins?'var(--hl)':on?'var(--acc2)':'var(--soft)')+';border-radius:6px;padding:6px 0;font-weight:600">'+r+'</div></div>'});
    if(s.del)h+='<div style="text-align:center;min-width:34px;opacity:.5"><div class="small mute">gone</div><div style="border:2px dashed var(--line);border-radius:6px;padding:6px 0;text-decoration:line-through">'+s.del+'</div></div>';
    h+='</div><div class="small">Shown to the user so far: '+s.seen.map((r,k)=>(s.dup||[]).includes(r)&&s.seen.indexOf(r)!==k?'<b style="color:var(--bad)">'+r+' (again)</b>':r).join(', ')+'</div>';
    view.innerHTML=h+(mode==='off'?'<div class="small mute">Numbers above the rows are positions, which is all an offset knows.</div>':'<div class="small mute">The cursor remembers a row, not a position.</div>');
    document.getElementById('rd-dr-cap').innerHTML='<div class="t">'+s.cap[0]+'</div><p>'+s.cap[1]+'</p>';
    const dups=s.seen.length-new Set(s.seen).size;
    document.getElementById('rd-dr-cnt').innerHTML=RD.stat('Rows shown',s.seen.length)+RD.stat('Duplicates',dups,dups?'shown twice':'none')+RD.stat('Never shown',(s.miss||[]).length,(s.miss||[]).length?s.miss.join(', ')+' skipped':'none')+RD.stat('Rows the database read',s.read,'to build the pages')}
  const A=RD.anim({card:'rd-dr-card',ctl:'rd-dr-ctl',n:5,draw,ms:2200,label:'Pagination step'});
  RD.seg(document.getElementById('rd-dr-seg'),m=>{mode=m;A.reset(5);A.play()});
})();
