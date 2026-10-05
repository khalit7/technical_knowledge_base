// ---- Reading: AOTAutograd graphs, Inductor fusion, generated code, modes, compile cost ----
(function(){
  const D=window.CSD,T=D.tc,E=RD.esc;
  const short=l=>l.replace(/^\s{4}/,'');
  document.getElementById('cs-aotF').textContent=T.aot_fwd.map(short).join('\n');
  document.getElementById('cs-aotB').textContent=T.aot_bwd.map(short).join('\n');
  const ret=T.aot_fwd.find(l=>/return/.test(l));
  document.getElementById('cs-aotTxt').innerHTML='The forward graph returns <code>'+E(ret.trim())+'</code>: the output and three tensors saved for backward, <b>x</b> (64 x 256), <b>w</b> (256) and <b>rsqrt</b> (64 x 1). It does not save <code>x * rsqrt</code>, the normalised activation, although the backward needs it: the backward graph recomputes it as its first line (<code>mul = primals_1 * rsqrt</code>). Saving it would cost another 64 x 256 floats; recomputing costs one multiply. That is the min-cut partitioner’s trade, and the reason activation memory under torch.compile can be lower than in eager mode <span class="ev der">derived from the graphs</span>. Inductor then compiled each graph to one C++ kernel: <code>'+E(T.aot_kernels.find(k=>/rsqrt/.test(k)))+'</code> (forward) and <code>'+E(T.aot_kernels.find(k=>!/rsqrt/.test(k)))+'</code> (backward).';
  document.getElementById('cs-fus').textContent=T.fusion_log.join('\n');
  document.getElementById('cs-cppName').textContent=T.cpp_name;
  document.getElementById('cs-call').textContent=T.cpp_call.map(l=>l.replace(/^ {8}/,'')).join('\n');
  document.getElementById('cs-cppN').textContent=T.cpp_kernel.length;
  document.getElementById('cs-cpp').textContent=T.cpp_kernel.join('\n');
  document.getElementById('cs-trit').textContent=T.triton_deco.concat(T.triton_kernel).map(l=>l.length>150?l.slice(0,150)+' ... (cut here)':l).join('\n');
  document.getElementById('cs-tritTxt').innerHTML='<code>triton_per_</code> means a <b>persistent reduction</b>: each program keeps a whole row (here <code>r0_numel = 256</code>) in registers, reduces it, and writes the normalised row, all in one pass; the decorator’s <code>size_hints</code> and <code>reduction_hint</code> steer the launcher’s choice of block size on the real GPU. It stores two things: the normalised row and <code>rsqrt</code>, the very tensor AOTAutograd chose to save for backward. The input row is loaded with <code>evict_first</code> (read once) and <code>w</code> with <code>evict_last</code> (every row reuses it): cache hints that end up as load modifiers like those of section 3. Executing it was not possible here: <code>'+E(T.triton_err)+'</code>.';
  const M=T.modes.modes,doc={'default':'"a good balance between performance and overhead"','reduce-overhead':'"reduces the overhead of python with CUDA graphs, useful for small batches"','max-autotune':'"leverages Triton or template based matrix multiplications on supported devices and Triton based convolutions on GPU"','max-autotune-no-cudagraphs':'"similar to \'max-autotune\' but without CUDA graphs"'};
  document.getElementById('cs-modes').innerHTML='<tr><th>mode</th><th>Inductor options it sets (torch._inductor.list_mode_options, run here)</th><th>PyTorch 2.14 docs</th></tr>'+Object.keys(M).map(k=>'<tr><td><code>'+k+'</code></td><td>'+(Object.keys(M[k]).length?Object.entries(M[k]).map(x=>'<code>'+x[0]+'='+x[1]+'</code>').join(', '):'<span class="mute">none</span>')+'</td><td>'+E(doc[k])+'</td></tr>').join('');
  const c=T.cold,w=T.warm,mm=a=>[Math.min(...a),Math.max(...a)];
  const cf=mm(c.map(x=>x.first_s)),wf=mm(w.map(x=>x.first_s)),ws=mm(c.concat(w).map(x=>x.second_ms)),we=mm(c.concat(w).map(x=>x.eager_ms));
  document.getElementById('cs-cost').innerHTML=
    '<div style="--sc:var(--bad)"><div class="k">first call, empty cache</div><div class="v">'+cf[0].toFixed(1)+' to '+cf[1].toFixed(1)+' s</div><p>forward and backward compiled from scratch</p></div>'+
    '<div style="--sc:var(--c5)"><div class="k">first call, warm cache</div><div class="v">'+wf[0].toFixed(2)+' to '+wf[1].toFixed(2)+' s</div><p>a new process, the cache directory kept</p></div>'+
    '<div style="--sc:var(--good)"><div class="k">later calls</div><div class="v">'+ws[0]+' to '+ws[1]+' ms</div><p>guards checked, cached kernels run; eager: '+we[0]+' to '+we[1]+' ms</p></div>'+
    '<div style="--sc:var(--c6)"><div class="k">setting</div><div class="v" style="font-size:15px">3 runs each</div><p>Docker, 2 cores of the M1 Pro, load average '+T.load.join(' / ')+'</p></div>';
})();
