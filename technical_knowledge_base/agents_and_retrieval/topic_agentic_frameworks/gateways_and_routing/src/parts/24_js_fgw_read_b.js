// ---- Reading tab, part 2: cache table (E6), translation (E7). The budget waves (E5) are the 3D stage in 44_js_sc_bud.js. ----
(function(){
  const F=window.FGW,E=RD.esc;

  // E6: cache table
  (function(){const el=document.getElementById('fgw-e6');if(!el)return;
    el.innerHTML='<thead><tr><th>Call</th><th class="num">Seconds</th><th>Result</th><th>Cache key</th><th>Answer (first words)</th></tr></thead><tbody>'+F.e6.steps.map(s=>
      '<tr><td>'+E(s.label)+'</td><td class="num">'+s.s.toFixed(3)+'</td><td>'+(s.key?'<b style="color:var(--good)">hit</b>':'miss')+'</td><td class="mono">'+(s.key||'')+'</td><td class="small">'+E(s.text.split(' ').slice(0,9).join(' '))+' ...</td></tr>').join('')+'</tbody>'})();

  // E7: what reached the model server
  (function(){const el=document.getElementById('fgw-e7');if(!el)return;
    el.innerHTML='<div class="grid">'+F.e7.map(r=>'<div class="sp"><div class="n">model "'+E(r.model)+'"</div><p>Gateway sent <code>POST '+E(r.up_path)+'</code>, server answered '+r.up_status+'; caller got <b style="color:'+(r.status===200?'var(--good)':'var(--bad)')+'">'+r.status+'</b>.</p><p class="small mute">Body fields sent: '+r.up_keys.map(k=>'<code>'+E(k)+'</code>').join(', ')+'</p><pre class="small" style="white-space:pre-wrap;max-height:11em;overflow:auto">'+E(JSON.stringify(r.up_body,null,1)).slice(0,600)+'</pre></div>').join('')+'</div>'})();

})();