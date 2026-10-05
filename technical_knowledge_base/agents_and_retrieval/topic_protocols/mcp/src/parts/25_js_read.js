// ---- Reading tab: tables and drills filled from the recordings (window.MCPD) ----
(function(){
  const D=window.MCPD,E=RD.esc,$=id=>document.getElementById(id);
  const fmt=n=>n==null?'':(+n).toLocaleString('en-US');
  // section 2: the stdio call
  const st=D.tr.find(r=>r.name.indexOf('stdio, 2026-07-28')===0);
  const m=st.coldmsgs;
  $('rd-msg-req').textContent=m[0].s;
  $('rd-msg-res').textContent=m[1].s;
  // section 4: progress stream
  $('rd-prog').textContent=D.prog.up.replace(/\r/g,'')+'\n\n'+D.prog.down.replace(/\r/g,'');
  // section 4: hostile requests
  (function(){
    let h='<thead><tr><th>Request</th><th>Status</th><th>Reply (start)</th></tr></thead><tbody>';
    D.wc.forEach(c=>{let r=c.resp;const mm=r.match(/"code":(-?\d+),"message":"([^"]*)"/);
      let short=mm?('<code>'+mm[1]+'</code> '+E(mm[2])):(r.indexOf('"isError":true')>=0?'result, <code>isError: true</code>: '+E((r.match(/"text":"([^"]{0,70})/)||['',''])[1]):(r?E(r.slice(0,70)):'(empty body)'));
      if(c.st===200&&r.indexOf('"isError":true')<0)short='result, three checkpoints';
      h+='<tr><td>'+E(c.case)+'</td><td><span class="pill '+(c.st<300?'ok':'bad')+'">'+c.st+'</span></td><td class="small">'+short+'</td></tr>'});
    $('rd-wc').innerHTML=h+'</tbody>';
  })();
  // section 4: transports table
  (function(){
    let h='<thead><tr><th>Transport and mode</th><th>Cold, ms</th><th>Warm median, ms</th><th>Warm p90, ms</th><th>Bytes up / down per call</th></tr></thead><tbody>';
    D.tr.forEach(r=>{h+='<tr><td>'+E(r.name)+'</td><td>'+r.cold.toFixed(1)+'</td><td>'+r.med.toFixed(2)+'</td><td>'+r.p90.toFixed(2)+'</td><td>'+fmt(r.up)+' / '+fmt(r.down)+'</td></tr>'});
    $('rd-tr').innerHTML=h+'</tbody>';
  })();
  // section 5: replicas table
  (function(){
    const lab=r=>(r.era==='legacy'?'<span class="era l">2025-11-25</span> session':'<span class="era m">2026-07-28</span> MRTR')+
      ', '+(r.lb==='rr'?'round robin':'session affinity')+(r.era==='modern'?(r.key?', shared key':', per-process keys'):'');
    let h='<thead><tr><th>Setup</th><th>Succeeded</th><th>Error</th><th>Median ms</th></tr></thead><tbody>';
    D.rep.forEach(r=>{h+='<tr><td>'+lab(r)+'</td><td><span class="pill '+(r.ok===r.n?'ok':'bad')+'">'+r.ok+' of '+r.n+'</span></td><td class="small">'+(r.err.length?E(r.err.join('; ')):'none')+'</td><td>'+r.ms+'</td></tr>'});
    $('rd-rep').innerHTML=h+'</tbody>';
  })();
  // section 6: compatibility matrix
  (function(){
    const cs=[...new Set(D.comp.map(o=>o.c))],ss=[...new Set(D.comp.map(o=>o.s))];
    let h='<thead><tr><th>Client \\ server</th>'+ss.map(s=>'<th>'+E(s)+'</th>').join('')+'</tr></thead><tbody>';
    cs.forEach((c,i)=>{h+='<tr><th>'+E(c)+'</th>'+ss.map((s,j)=>'<td class="cell hid" data-i="'+D.comp.findIndex(o=>o.c===c&&o.s===s)+'" tabindex="0" role="button">?</td>').join('')+'</tr>'});
    $('rd-cm').innerHTML=h+'</tbody>';
    const out=$('rd-cm-out');
    function reveal(td,show){const o=D.comp[+td.dataset.i];td.classList.remove('hid');td.classList.add(o.ok?'okc':'badc');td.textContent=o.ok?'works ('+o.v+')':'fails';
      if(show){out.innerHTML='<p><b>'+E(o.c)+'</b> against <b>'+E(o.s)+'</b>: '+(o.ok?'worked, negotiated '+E(o.v):'failed')+' in '+o.ms+' ms. '+E(o.d)+'</p><pre class="cd out">'+o.wire.map(w=>(w.d==='client->server'?'> ':'< ')+E(w.s)).join('\n')+'</pre>'}}
    $('rd-cm').addEventListener('click',e=>{const td=e.target.closest('td.cell');if(td)reveal(td,true)});
    $('rd-cm').addEventListener('keydown',e=>{const td=e.target.closest('td.cell');if(td&&(e.key==='Enter'||e.key===' ')){e.preventDefault();reveal(td,true)}});
    $('rd-cm-all').addEventListener('click',()=>document.querySelectorAll('#rd-cm td.cell').forEach(td=>reveal(td,false)));
  })();
  // section 7: auth failures
  (function(){
    const names={no_token:'No Authorization header',wrong_audience:'Valid signature, audience is another API',expired:'Expired a minute ago',missing_scope:'Token has ckpt:read; this server needs ckpt:write',good_token:'Correct token'};
    let h='<thead><tr><th>Request</th><th>Status</th><th>WWW-Authenticate</th></tr></thead><tbody>';
    Object.keys(D.auth.fails).forEach(k=>{const f=D.auth.fails[k];h+='<tr><td>'+E(names[k]||k)+'</td><td><span class="pill '+(f.st<300?'ok':'bad')+'">'+f.st+'</span></td><td class="small"><code>'+E(f.wa||'(none)')+'</code></td></tr>'});
    $('rd-auth-f').innerHTML=h+'</tbody>';
    $('rd-mixup').textContent=D.auth.mixup||'';
  })();
  // predict, then reveal
  document.querySelectorAll('#t-read .pr').forEach(p=>{
    p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      p.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(b.dataset.k===p.dataset.a?'right':'wrong');
      p.querySelector('.opts button[data-k="'+p.dataset.a+'"]').classList.add('right');
      p.querySelector('.ans').hidden=false;}));
  });
})();
