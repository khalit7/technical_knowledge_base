// ---- Reading section 12 (moved from the Many processes tab) ----
(function(){
  const U=SSU,esc=U.esc,$=id=>document.getElementById(id),MU=SS.multi,P=MU.normal.processes;
  $('mu-init').textContent=SS.code.multi_init.replace(/^    /gm,'');
  $('mu-loop').textContent=SS.code.multi.replace(/^    /gm,'');
  let mode=2;
  const N=6;
  function draw(i){
    const el=$('mu-svg'),W=U.width(el),H0=176,pad=8,nar=W<560&&mode===2,PH=H0-44,H=nar?H0+PH:H0,boxW=nar?W-2*pad:(W-3*pad)/2;
    let s='';
    const procs=mode===2?[[0,P[0]],[1,P[1]]]:[[0,null]];
    const ids=mode===2?[P[0].device_ids.slice(0,4),P[0].device_ids.slice(4)]:[P[0].device_ids.slice(0,4).concat([4,5,6,7])];
    const bw=mode===2?boxW:W-2*pad;
    procs.forEach((pp,pi)=>{const x0=nar?pad:pad+pi*(boxW+pad),oy=nar?pi*PH:0;
      s+='<rect x="'+x0+'" y="'+(4+oy)+'" width="'+bw+'" height="'+(H0-48)+'" rx="8" fill="var(--soft)" stroke="'+(i>=1?'var(--acc)':'var(--line)')+'"/>';
      s+=RD.t(x0+8,20+oy,(mode===2?'process '+pi+' (host '+pi+')':'one process')+(i>=1&&mode===2?': jax.distributed.initialize()':''),{fs:11.5,w:600});
      const dv=ids[pi],dw=(bw-16)/dv.length;
      dv.forEach((d,k)=>{const x=x0+8+k*dw,y=32+oy;const g=pi*4+k;
        s+='<rect x="'+(x+2)+'" y="'+y+'" width="'+(dw-4)+'" height="'+(H0-90)+'" rx="5" fill="var(--bg)" stroke="var(--line)"/>';
        s+=RD.t(x+dw/2,y+14,(dw<46?'':'cpu:')+(mode===2?d:g),{a:'middle',fs:dw<46?10:10.5});
        if(i>=2){const r0=g*4;s+='<rect x="'+(x+6)+'" y="'+(y+22)+'" width="'+(dw-12)+'" height="16" rx="3" fill="var(--c1)" fill-opacity=".7"/>'+RD.t(x+dw/2,y+34,(dw<60?'':'rows ')+r0+'-'+(r0+3),{a:'middle',fs:10,fill:'var(--bg)'})}
        if(i>=3)s+='<rect x="'+(x+6)+'" y="'+(y+44)+'" width="'+(dw-12)+'" height="14" rx="3" fill="var(--c3)" fill-opacity=".7"/>'+RD.t(x+dw/2,y+55,dw<46?'g':'grads',{a:'middle',fs:10.5,fill:'var(--bg)'});
        if(i>=5)s+='<rect x="'+(x+6)+'" y="'+(y+64)+'" width="'+(dw-12)+'" height="14" rx="3" fill="var(--c4)" fill-opacity=".7"/>'+RD.t(x+dw/2,y+75,dw<46?'W':'new W',{a:'middle',fs:10.5,fill:'var(--bg)'})})});
    if(i===4){const y=H-40;s+='<line x1="'+(pad+12)+'" y1="'+y+'" x2="'+(W-pad-12)+'" y2="'+y+'" stroke="var(--c2)" stroke-width="3"/>'+RD.t(W/2,y+16,mode===2?(W<560?'all-reduce over 8 devices, between processes over gloo':'all-reduce over all 8 devices: inside each process, and between them over gloo (TCP)'):'all-reduce over all 8 devices, inside one process',{a:'middle',fs:11,fill:'var(--c2)'})}
    el.innerHTML=RD.svg(W,H,s,'Processes, devices and the batch rows each holds');
    const c2=['<b>Start.</b> Two copies of the same script, one per "host". Each sees only its own 4 devices until they connect.',
      '<b>Connect.</b> <code>jax.distributed.initialize(coordinator_address=..., num_processes=2, process_id=i)</code>. Now <code>jax.devices()</code> lists all 8 in both processes ('+P[0].device_ids.join(', ')+'; process 1\'s devices got ids from 2048, as observed here), <code>jax.local_devices()</code> only its own 4. Both build the same mesh over all 8.',
      '<b>Load.</b> Process 0 loads rows 0 to 15 of the batch, process 1 rows 16 to 31, and each calls <code>make_array_from_process_local_data(P(\'data\', None) sharding, its_rows)</code>. Result: one global [32, 128] array; each process can touch only its 4 shards ('+P[0].addressable_shards.map(a=>a[0]+': rows '+a[2]+'-'+(a[3]-1)).join(', ')+' in process 0).',
      '<b>Compute.</b> The jitted step runs on every device: forward and backward on its 4 rows give partial gradients.',
      '<b>All-reduce.</b> The one all-reduce in the compiled step (the same single collective as on one host) sums the gradients over all 8 devices. Between the processes it travels over gloo here; on a slice it would ride ICI.',
      '<b>Update.</b> Every device applies the same AdamW update to its copy of the replicated weights. Both processes read the same loss: '+P[0].losses[0].toFixed(6)+' at step 0, '+P[0].losses[19].toFixed(6)+' at step 19.'];
    const c1=['<b>Start.</b> One process sees all 8 devices.','<b>Nothing to connect.</b> <code>jax.devices()</code> is local; every shard is addressable.','<b>Load.</b> The process loads all 32 rows and <code>device_put</code>s them with <code>P(\'data\', None)</code>: 4 rows per device.','<b>Compute.</b> The same jitted step, the same per-device work.','<b>All-reduce.</b> The same single all-reduce, now a memory copy inside one process.','<b>Update.</b> The same weights. The root lab\'s one-device run gives '+MU.one_device_losses[0].toFixed(6)+' at step 0 and '+MU.one_device_losses[19].toFixed(6)+' at step 19.'];
    $('mu-cap').innerHTML=(mode===2?c2:c1)[i];
  }
  const an=U.anim({tab:'t-read',card:'mu-card',ctl:'mu-ctl',n:N,draw,ms:1700,label:'Step'});
  U.seg($('mu-mode'),v=>{mode=+v;an.redraw()});
  addEventListener('resize',()=>{const t=$('t-read');if(t&&!t.hidden)an.redraw()});
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
