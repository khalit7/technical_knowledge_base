// ---- Section 6 (wide-column): table definition, refused query, quorum calculator, tombstone runs ----
(function(){
  const W=NQ.wide; if(!W)return;
  const el=id=>document.getElementById(id), f0=n=>Math.round(n).toLocaleString('en-US');
  el('rd-cass-ddl').textContent=(W.cass_ddl||'')+';';
  const C=W.cass||{};
  el('rd-cass-err').textContent=(C.by_message_id||'').replace(/^Error from server: /,'');
  // tombstones
  const T=C.tombstones||[];
  el('rd-tomb').innerHTML='<table><tr><th class="num">Newest rows deleted</th><th>Trace</th><th class="num">Latest 50, median</th></tr>'+T.map(t=>{
    if(t.error)return '<tr><td class="num">'+f0(t.deleted)+'</td><td style="color:var(--bad)"><b>Read failed</b>: <code>'+((/READ_TOO_MANY_TOMBSTONES/.exec(t.error)||['error'])[0])+'</code>, the query aborts once it has stepped over more tombstones than the failure threshold</td><td class="num">failed</td></tr>';
    const r=t.trace.find(x=>/live rows/.test(x))||'';return '<tr><td class="num">'+f0(t.deleted)+'</td><td><code>'+r+'</code>'+(/warn/.test(r)?' and a warning in the server log':'')+'</td><td class="num">'+t.ms_p50+' ms</td></tr>'}).join('')+'</table>';
  // quorum calculator
  const lv=(name,rf)=>name==='ONE'?1:name==='ALL'?rf:Math.floor(rf/2)+1;
  function q(){
    const rf=+el('rd-q-rf').value, dEl=el('rd-q-d'); dEl.max=rf; const d=Math.min(+dEl.value,rf);
    el('rd-q-rf-v').textContent=rf; el('rd-q-d-v').textContent=d;
    const w=lv(el('rd-q-w').value,rf), r=lv(el('rd-q-r').value,rf), up=rf-d;
    const wOk=up>=w, rOk=up>=r, overlap=w+r>rf;
    // ring: RF replicas among 8 nodes; the first d replicas are down
    const svgEl=el('rd-q-svg'), wd=RD.width(svgEl), n=Math.max(8,rf+2), cx=Math.min(wd/2,150), cy=78, R=58;
    let s='<circle cx="'+cx+'" cy="'+cy+'" r="'+R+'" fill="none" stroke="var(--line)" stroke-width="2"/>';
    for(let k=0;k<n;k++){const a=-Math.PI/2+k*2*Math.PI/n, rep=k<rf, down=rep&&k<d;
      const fill=!rep?'var(--soft)':down?'var(--bad)':'var(--c4)';
      s+='<circle cx="'+(cx+R*Math.cos(a)).toFixed(1)+'" cy="'+(cy+R*Math.sin(a)).toFixed(1)+'" r="10" fill="'+fill+'" stroke="var(--mute)"/>'+(down?RD.t((cx+R*Math.cos(a)).toFixed(1),(cy+R*Math.sin(a)+4).toFixed(1),'x',{a:'middle',fs:12,fill:'var(--bg)',w:700}):'')}
    const tx=Math.min(wd-10,cx+R+30);
    if(wd>380){s+=RD.t(tx,40,'Replicas of the partition: '+rf+' (purple)',{fs:11.5})+RD.t(tx,58,'Down: '+d+' (red)',{fs:11.5})+RD.t(tx,76,'Other nodes in the ring: grey',{fs:11.5,fill:'var(--mute)'})+RD.t(tx,100,'W = '+w+', R = '+r+', W + R = '+(w+r)+(overlap?' > ':' ≤ ')+'RF = '+rf,{fs:11.5,w:600})}
    svgEl.innerHTML=RD.svg(wd,160,s,'Replicas of one partition on the token ring');
    el('rd-q-out').innerHTML=RD.stat('A write at this level',wOk?'<span style="color:var(--good)">succeeds</span>':'<span style="color:var(--bad)">fails</span>','needs '+w+' of '+rf+' replicas; '+up+' are up')+
      RD.stat('A read at this level',rOk?'<span style="color:var(--good)">succeeds</span>':'<span style="color:var(--bad)">fails</span>','needs '+r+' of '+rf)+
      RD.stat('Read sees the latest acknowledged write?',overlap?'<span style="color:var(--good)">yes</span>':'<span style="color:var(--bad)">not guaranteed</span>','W + R = '+(w+r)+(overlap?' > ':' is not > ')+'RF = '+rf)+
      RD.stat('Replicas that may fail','writes '+Math.max(0,rf-w)+', reads '+Math.max(0,rf-r),'RF minus the level');
  }
  ['rd-q-rf','rd-q-d','rd-q-w','rd-q-r'].forEach(id=>el(id).addEventListener('input',q));
  ['rd-q-w','rd-q-r'].forEach(id=>el(id).addEventListener('change',q));
  q(); RD.onResize(q); RD.onRender(q);
})();
