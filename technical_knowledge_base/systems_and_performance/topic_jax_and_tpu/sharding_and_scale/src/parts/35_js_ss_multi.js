// ---- Reading section 12 (moved from the Many processes tab): code, per-process table, losses, the two errors ----
(function(){
  const U=SSU,esc=U.esc,$=id=>document.getElementById(id),MU=SS.multi,P=MU.normal.processes;
  $('mu-init').textContent=SS.code.multi_init.replace(/^    /gm,'');
  $('mu-loop').textContent=SS.code.multi.replace(/^    /gm,'');
  // the two-process step itself is the 3D stage Fig. 12 (44_js_sc_multi.js); this part fills the tables and the error cards
  const row=(k,f)=>'<tr><td>'+k+'</td><td>'+f(P[0])+'</td><td>'+f(P[1])+'</td></tr>';
  $('mu-t').querySelector('tbody').innerHTML=[
    row('<code>jax.process_index()</code> / <code>process_count()</code>',p=>p.process_index+' / '+p.process_count),
    row('<code>jax.devices()</code> ids',p=>p.device_ids.join(', ')),
    row('<code>jax.local_devices()</code>',p=>p.local_devices.join(', ')),
    row('initialize took',p=>p.init_s+' s'),
    row('global batch shape',p=>'['+p.global_batch_shape.join(', ')+']'),
    row('addressable shards (device: rows)',p=>p.addressable_shards.map(a=>a[0]+': '+a[2]+'-'+(a[3]-1)).join('<br>')),
    row('<code>x.is_fully_addressable</code>',p=>String(p.is_fully_addressable)),
    row('<code>process_allgather(x)</code>',p=>'['+p.process_allgather_shape.join(', ')+'], equal to the full batch: '+p.process_allgather_equal),
    row('all-reduces in the compiled step',p=>p.hlo_all_reduce)].join('');
  const d=MU.normal.max_abs_loss_diff_vs_one_device;
  $('mu-loss').innerHTML='<p class="small">Losses over 20 steps: identical in the two processes ('+MU.normal.processes_agree+'), and within '+U.sci(d)+' of the one-device run of the root\'s Sharding lab on the same batches (float32 summation order). Both processes together took '+MU.normal.wall_s+' s of wall time including start-up, measured on Apple M1 Pro (CPU), shared machine; not a speed measurement.</p>';
  $('mu-err').innerHTML='<div class="ss-card"><h4>Reading a global array in one process</h4><p class="small"><code>np.asarray(x)</code> on the global batch, in either process:</p><pre class="err">'+esc(P[0].np_asarray_global)+'</pre><p class="small">By design: half the data is in the other process. Use <code>multihost_utils.process_allgather(x)</code> (<span id="mu-ref-pag"></span>) or iterate <code>x.addressable_shards</code>.</p></div>'+
    '<div class="ss-card"><h4>Hosts passing different values for a replicated array</h4><p class="small">Second run: process 1 added 0.001 to every weight before <code>jax.device_put(params, NamedSharding(mesh, P()))</code>. Both processes stopped at once with:</p><pre class="err">'+esc(MU.mismatch.processes[0].device_put_error)+'</pre><p class="small"><code>device_put</code> to a sharding that spans processes compares the values across processes first (<code>multihost_utils.assert_equal</code>, called at <span id="mu-ref-dp"></span>). Without that check the run would have trained two different models while reporting one. Values computed inside a jitted function from the same seed cannot diverge this way.</p></div>';
  $('mu-ref-pag').innerHTML=U.ref('process_allgather');$('mu-ref-dp').innerHTML=U.ref('device_put_check');
})();
