// Section 7: the two halves each writer produced, with the field names highlighted where they meet.
(function(){
  const W=FM.write;if(!W||!W.length)return;
  const U=FMU,esc=RD.esc;
  const order=[['pinned','parallel'],['open','parallel'],['open','contract'],['open','single'],['pinned','contract'],['pinned','single']];
  const DN={parallel:'Two parallel writers',contract:'Contract first',single:'One agent'};
  // summary table
  document.querySelector('#fm-wrtab tbody').innerHTML=order.map(([sp,d])=>{const rs=W.filter(r=>r.spec===sp&&r.design===d);if(!rs.length)return '';
    const ok=rs.filter(r=>r.ok).length;
    return '<tr><td>'+(sp==='open'?'Open':'Pinned')+'</td><td>'+DN[d]+'</td><td class="num '+(ok===rs.length?'ok':'bad')+'">'+ok+'</td><td class="num">'+U.usd(U.mean(rs.map(r=>r.cost)))+'</td><td class="num">'+U.secs(U.mean(rs.map(r=>r.wall)))+'</td></tr>'}).join('');
  const op=W.filter(r=>r.spec==='open'&&r.design==='parallel'),oc=W.filter(r=>r.spec==='open'&&r.design==='contract');
  const V=window.FMV||{};
  const setv=(k,v)=>document.querySelectorAll('.fm-v[data-v="'+k+'"]').forEach(e=>{e.textContent=v;e.classList.remove('fm-miss')});
  setv('wr.open.par',op.filter(r=>r.ok).length);
  setv('wr.contract_wall',U.secs(U.mean(oc.map(r=>r.wall))-U.mean(op.map(r=>r.wall))));
  // run chips
  const list=[];['open','pinned'].forEach(sp=>['parallel','contract','single'].forEach(d=>W.filter(r=>r.spec===sp&&r.design===d).sort((a,b)=>a.rep-b.rep).forEach(r=>list.push(r))));
  const chips=document.getElementById('fm-wrchips');
  chips.innerHTML='<label class="small">Run <select id="fm-wrsel">'+['open','pinned'].map(sp=>'<optgroup label="'+(sp==='open'?'Open spec':'Pinned spec')+'">'+list.map((r,i)=>r.spec===sp?'<option value="'+i+'">'+DN[r.design]+', run '+r.rep+(r.ok?'':' (do not fit)')+'</option>':'').join('')+'</optgroup>').join('')+'</select></label>';
  const keysProduced=src=>{const m=new Set();(src||'').replace(/["']([a-z_]+)["']\s*:/g,(a,k)=>{m.add(k);return a});return m};
  const keysUsed=src=>{const m=new Set();(src||'').replace(/\[\s*["']([a-z_]+)["']\s*\]|["']([a-z_]+)["']\s+in\s+\w+|\.get\(\s*["']([a-z_]+)["']/g,(a,k1,k2,k3)=>{m.add(k1||k2||k3);return a});return m};
  function hl(src,set,good){return esc(src||'(no file)').replace(/(&quot;|')([a-z_]+)(&quot;|')/g,(a,q1,k,q2)=>set.has(k)?'<span class="hl" style="'+(good.has(k)?'':'outline:1px solid var(--bad)')+'">'+a+'</span>':a)}
  function show(i){
    const r=list[i];const P=keysProduced(r.report_py),Q=keysUsed(r.render_py);const both=new Set([...P].filter(k=>Q.has(k)));
    const f1=r.spec==='open'?'textstats/profile.py':'textstats/report.py',f2=r.spec==='open'?'textstats/card.py':'textstats/render.py';
    document.getElementById('fm-wrview').innerHTML='<div class="fm-box"><h4>'+f1+(r.design==='single'?'':' (writer A)')+'</h4><div class="small mute">Names it produces: '+([...P].map(esc).join(', ')||'none found')+'</div><pre class="fm-code">'+hl(r.report_py,P,both)+'</pre></div>'+
      '<div class="fm-box"><h4>'+f2+(r.design==='single'?'':' (writer B)')+'</h4><div class="small mute">Names it reads: '+([...Q].map(esc).join(', ')||'none found')+'</div><pre class="fm-code">'+hl(r.render_py,Q,both)+'</pre></div>';
    const c=r.check||{};
    document.getElementById('fm-wrout').innerHTML=(r.contract?'<details class="qa"><summary>The contract the lead wrote first</summary><div><pre class="fm-pre">'+esc(r.contract)+'</pre></div></details>':'')+
      '<div class="fm-box"><h4>Hidden check on the merged tree: <span class="pill '+(r.ok?'ok':'bad')+'">'+(r.ok?'halves fit':'halves do not fit')+'</span></h4>'+
      (c.ran?'<div class="small mute">'+(r.spec==='open'?'card(profile("b a b a c a"))':'render(build_report("b a b a c a"))')+' printed:</div><pre class="fm-pre">'+esc(r.md||'')+'</pre>':'<pre class="fm-pre">'+esc(c.error||'did not run')+'</pre>')+
      '<div class="small mute">Names in both files are highlighted; a red outline marks a name only one side uses. Cost '+U.usd(r.cost)+', wall time '+U.secs(r.wall)+'.</div></div>';
  }
  document.getElementById('fm-wrsel').addEventListener('change',e=>show(+e.target.value));
  show(0);
})();
