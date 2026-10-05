// ---- Reading: PTX headers; CUDA Tile IR results ----
(function(){
  const D=window.CSD,T=D.tile;
  document.getElementById('cs-hdA').textContent=D.ptx_softmax.slice(0,8).filter(l=>l.trim()&&l.trim()!=='//').join('\n');
  document.getElementById('cs-hdB').textContent=D.triton_ptx_head.filter(l=>l.trim()&&l.trim()!=='//').slice(0,5).join('\n');
  document.getElementById('cs-tileV').textContent=T.version;
  document.getElementById('cs-tileBC').textContent=T.bc_bytes;
  document.getElementById('cs-tileIR').textContent=T.ir.join('\n');
  document.getElementById('cs-tileT').innerHTML='<tr><th>tileiras target</th><th class="num">cubin bytes</th><th class="num">SASS instructions</th><th>global loads and stores</th></tr>'+
    Object.entries(T.targets).map(([k,v])=>'<tr><td><code>'+k+'</code></td><td class="num">'+v.cubin.toLocaleString('en-US')+'</td><td class="num">'+v.n+'</td><td>'+Object.entries(v.mem).map(x=>'<code>'+x[0]+'</code> '+x[1]).join(', ')+'</td></tr>').join('');
})();
