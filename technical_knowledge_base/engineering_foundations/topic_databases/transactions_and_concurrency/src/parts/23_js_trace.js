// ---- Recorded traces: shared renderer (Reading cards, the measured matrix, the Isolation lab) ----
window.TX=(function(){
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ENG={pg:'Postgres',my:'MySQL'};
  const LEV=['read uncommitted','read committed','repeatable read','serializable'];
  const LAB={'read uncommitted':'read uncommitted','read committed':'read committed','repeatable read':'repeatable read','serializable':'serializable'};
  const ORDER=['dirty','nonrepeatable','phantom','lost','readskew','writeskew','quota','readonly'];
  const SHORT={dirty:'Dirty read',nonrepeatable:'Non-repeatable read',phantom:'Phantom',lost:'Lost update',readskew:'Read skew',writeskew:'Write skew (rota)',quota:'Write skew (quota)',readonly:'Read-only anomaly'};
  function run(eng,k,lev,fix){return TXD.engines[eng].runs[k+'|'+lev+(fix?'|'+fix:'')]}
  // how a prevented run was prevented, in words
  function how(r,eng){
    if(r.occ)return 'happened';
    if(r.how.length){const c=r.how[0];return c==='1213'?'deadlock, one killed':c==='40P01'?'deadlock':c==='40001'?'error 40001, retry':'error '+c}
    if(r.nb)return 'waited for a lock';
    return 'not seen';
  }
  // the names of the sessions present in a trace
  const names=tr=>['A','B','C'].filter(n=>tr.some(s=>s.s===n));
  // render steps 0..upto of a trace into el; cur marks the step just issued
  function render(el,tr,upto,opts){
    opts=opts||{};if(upto===undefined)upto=tr.length-1;
    const ns=names(tr),col={};ns.forEach((n,j)=>col[n]=j);
    const doneAt={},res={};
    for(let k=0;k<tr.length&&k<=upto;k++)(tr[k].f||[]).forEach(z=>{if(z.i<tr.length){doneAt[z.i]=k;res[z.i]=z}});
    let h='<div class="trc" style="grid-template-columns:2.2em repeat('+ns.length+',minmax(0,1fr))"><div class="hd"></div>'+ns.map(n=>'<div class="hd">Session '+n+'</div>').join('');
    for(let k=0;k<=upto&&k<tr.length;k++){const s=tr[k];if(!s.s)continue;
      let cells=ns.map(()=>'<div></div>');
      const z=res[k];let r='';
      if(z){
        if(z.err)r='<span class="r e">'+esc(z.t)+'</span>'+(z.d&&z.d.join('')?'<span class="r">'+z.d.map(esc).join('<br>')+'</span>':'');
        else r='<span class="r'+(z.tf?' e':'')+'">'+esc(z.t)+(z.tf?' (the transaction had failed: nothing was committed)':'')+'</span>';
        if(doneAt[k]>k)r='<span class="late">finished at step '+(doneAt[k]+1)+(z.ms?', after waiting '+(z.ms/1000).toFixed(1)+' s':'')+'</span>'+r;
      }else if(s.b||s.qb!==undefined)r='<span class="wt">'+(s.qb!==undefined?'queued behind its own waiting statement':'waiting'+(s.w?' ('+esc(s.w)+')':''))+'</span>';
      const blk=(s.b&&!(doneAt[k]<=upto&&z));
      cells[col[s.s]]='<div class="c on'+(k===upto&&opts.cur?' cur':'')+(blk?' blk':'')+'"><code>'+esc(s.q)+'</code>'+(s.n?' <span class="mute small">'+esc(s.n)+'</span>':'')+r+'</div>';
      h+='<div class="hd" style="align-self:center">'+(k+1)+'</div>'+cells.join('');
    }
    el.innerHTML=h+'</div>';
  }
  // all runs of a scenario on one engine: [{lev, fix, r}]
  function variants(eng,k){
    const out=[];LEV.forEach(l=>{const r=run(eng,k,l);if(r)out.push({lev:l,fix:null,r})});
    const fx=TXD.scenarios[k].fixes||{};Object.keys(fx).forEach(f=>LEV.forEach(l=>{const r=run(eng,k,l,f);if(r)out.push({lev:l,fix:f,r})}));
    return out;
  }
  function chipLabel(v){return LAB[v.lev]+(v.fix?' + fix':'')}
  return {esc,ENG,LEV,LAB,ORDER,SHORT,run,how,render,variants,chipLabel,names};
})();
// ---- Reading tab: one recording per anomaly card, with every level as a chip ----
(function(){
  document.querySelectorAll('#t-read .anx').forEach(box=>{
    const k=box.dataset.k;let [eng,lev]=box.dataset.def.split('|');let fix=null;
    const tr=document.createElement('div'),chips=document.createElement('div'),cap=document.createElement('p');cap.className='small';
    box.appendChild(chips);box.appendChild(tr);box.appendChild(cap);
    function draw(){
      const r=TX.run(eng,k,lev,fix);
      chips.innerHTML=['pg','my'].map(e=>'<div class="chipsl"><b style="min-width:4.6em">'+TX.ENG[e]+'</b>'+TX.variants(e,k).map(v=>
        '<button class="ch '+(v.r.occ?'occ':'pre')+(e===eng&&v.lev===lev&&v.fix===fix?' on':'')+'" data-e="'+e+'" data-l="'+v.lev+'" data-f="'+(v.fix||'')+'" title="'+TX.esc(TX.how(v.r,e))+'">'+
        TX.chipLabel(v)+': '+(v.r.occ?'happened':'prevented')+'</button>').join('')+'</div>').join('');
      TX.render(tr,r.tr);
      const fx=fix?(TXD.scenarios[k].fixes||{})[fix]:'';
      cap.innerHTML='<b>'+TX.ENG[eng]+' '+TXD.engines[eng].version+', '+TX.LAB[lev]+(fix?', with the fix: '+TX.esc(fx):'')+':</b> '+
        (r.occ?'<span style="color:var(--bad);font-weight:600">the anomaly happened</span>':'<span style="color:var(--good);font-weight:600">prevented ('+TX.esc(TX.how(r,eng))+')</span>')+'. '+TX.esc(r.why)+'.';
    }
    chips.addEventListener('click',e=>{const b=e.target.closest('button.ch');if(!b)return;eng=b.dataset.e;lev=b.dataset.l;fix=b.dataset.f||null;draw()});
    draw();
  });
})();
// ---- Reading tab, section 4: the measured matrix ----
(function(){
  const box=document.getElementById('rd-mx');if(!box)return;
  let h='<table class="mx"><tr><th>Database and level</th>'+TX.ORDER.map(k=>'<th>'+TX.SHORT[k]+'</th>').join('')+'</tr>';
  ['pg','my'].forEach(e=>TX.LEV.forEach(l=>{
    h+='<tr><td class="lv">'+TX.ENG[e]+', '+TX.LAB[l]+(e==='pg'&&l==='read committed'||e==='my'&&l==='repeatable read'?' (default)':'')+'</td>'+
      TX.ORDER.map(k=>{const r=TX.run(e,k,l);if(!r)return '<td>?</td>';
        return '<td class="'+(r.occ?'o':'p')+'"><a href="#" data-open="'+e+'|'+k+'|'+l+'" style="color:inherit">'+(r.occ?'happened':TX.how(r,e))+'</a></td>'}).join('')+'</tr>'}));
  box.innerHTML=h+'</table>';
  box.addEventListener('click',ev=>{const a=ev.target.closest('a[data-open]');if(!a)return;ev.preventDefault();
    const [e,k,l]=a.dataset.open.split('|');if(window.TXLAB)window.TXLAB.open(e,k,l,null)});
  const P=TXD.engines.pg,Y=TXD.engines.my;
  document.getElementById('rd-mx-note').innerHTML='Recorded '+P.date+' on PostgreSQL '+TX.esc(P.version)+' (pgserver wheel, deadlock_timeout '+TX.esc(P.deadlock_timeout||'')+') and MySQL '+TX.esc(Y.version)+' (InnoDB, conda-forge build; innodb_lock_wait_timeout '+TX.esc((Y.defaults||[])[1])+' s), each run from freshly created tables. "Not seen" means the transaction read a snapshot that hid the other change; "waited for a lock" means a lock made the second transaction wait until the first finished. Scripts: src/measure/run_matrix.py and scenarios.py.';
})();
