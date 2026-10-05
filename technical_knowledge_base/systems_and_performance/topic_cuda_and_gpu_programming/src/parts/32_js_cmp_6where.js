// ---- Compiler explorer: 6. what compiled where; 8. Triton table ----
(function(){
  const X=window.CMPX,D=window.CMP;if(!D||!X.$('cmp-where'))return;
  let h='<table class="cmp-t"><thead><tr><th>Kernel</th>'+D.archs.map(a=>'<th>'+a+'<br><span class="small mute">'+X.esc(D.archinfo[a].gpus)+'</span></th>').join('')+'</tr></thead><tbody>';
  D.kernels.forEach(k=>{h+='<tr><td>'+X.esc(k.title)+'</td>'+D.archs.map(a=>{const r=k.arch[a];
    return r.ok?'<td class="cmp-ok cmp-click" data-k="'+k.id+'" data-a="'+a+'" title="Open in the explorer">compiled<br><span class="small">'+r.res.regs+' regs'+(r.tc?', '+r.tc:'')+'</span></td>'
      :'<td class="cmp-bad cmp-click" data-k="'+k.id+'" data-a="'+a+'" title="Show the error">error<br><span class="small">'+X.esc(r.errShort||'')+'</span></td>'}).join('')+'</tr>'});
  X.$('cmp-where-tab').innerHTML=h+'</tbody></table>';
  X.$('cmp-where-tab').addEventListener('click',e=>{const c=e.target.closest('td.cmp-click');if(!c)return;const k=D.kernels.find(x=>x.id===c.dataset.k),r=k.arch[c.dataset.a];
    const box=X.$('cmp-where-err');
    if(r.ok){box.hidden=true;if(!k.hidden)X.xpShow(k.id,c.dataset.a);return}
    box.hidden=false;box.textContent=k.title+' for '+c.dataset.a+':\n'+r.err});
  X.$('cmp-where-note').innerHTML=D.whereNote||'';
  // Triton
  const T=D.triton;if(!T||!X.$('cmp-tri-tab'))return;
  let t='<table class="cmp-t"><thead><tr><th>Triton kernel</th>'+D.archs.map(a=>'<th>'+a+'</th>').join('')+'</tr></thead><tbody>';
  T.rows.forEach(r=>{t+='<tr><td>'+r.title+'</td>'+D.archs.map(a=>{const c=r.arch[a];if(!c)return '<td>n/a</td>';
    return c.ok?'<td class="cmp-ok">'+c.regs+' regs, '+c.smem.toLocaleString('en-US')+' B smem'+(c.spill?', <b>'+c.spill+' B stack</b>':'')+'<br><span class="small">'+X.esc(c.ins)+'</span></td>':'<td class="cmp-bad"><span class="small">'+X.esc(c.errShort)+'</span></td>'}).join('')+'</tr>'});
  X.$('cmp-tri-tab').innerHTML=t+'</tbody></table>';
  X.$('cmp-tri-note').innerHTML=T.note;
})();
