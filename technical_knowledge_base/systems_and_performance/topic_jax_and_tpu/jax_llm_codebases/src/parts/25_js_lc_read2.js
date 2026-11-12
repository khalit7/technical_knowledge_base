// ---- Reading tab, part 2: the every-parameter sharding table (closed details of section 3). The rule walk is the 3D stage in 42_js_sc_shard.js (2026-11-12). ----
(function(){
  const U=LCU, esc=U.esc, $=id=>document.getElementById(id);
  // sharding table
  const sel=$('lc-shtab-sel'),tb=document.querySelector('#lc-shtab tbody');
  sel.innerHTML=LC.shard.cases.map((c,i)=>'<option value="'+i+'">'+esc(c.label)+'</option>').join('');
  function showTab(){const c=LC.shard.cases[+sel.value];
    $('lc-shtab-stats').innerHTML=RD.stat('Parameters',U.num(c.params),c.n+' arrays')+RD.stat('Float32 bytes',U.MB(c.bytes),'')+RD.stat('Per device',U.MB(c.bytes_dev),'mesh '+Object.entries(c.mesh).map(([a,n])=>a+' '+n).join(' x '));
    tb.innerHTML=c.rows.map(r=>'<tr><td><code>'+esc(r.name)+'</code></td><td>['+r.shape.map(x=>U.num(x)).join(', ')+']</td><td><code>'+esc((r.logical||[]).join(', '))+'</code></td><td><code>'+esc(r.spec)+'</code></td><td>'+
      (r.error?'<span class="lc-bad">IndivisibleError</span>':'['+r.shard_shape.map(x=>U.num(x)).join(', ')+'] '+U.MB(r.bytes_per_device))+'</td></tr>').join('')+
      (c.label.includes('scan_layers=False')?'<tr><td colspan="5" class="mute small">Layers 1 to 31 omitted: the same nine arrays each.</td></tr>':'')}
  sel.addEventListener('change',showTab);showTab();
})();
