// ---- Reading sections 3 and 4 (autograd, modules and the loop) ----
(function(){
const D=window.TDA, A=D.ag, G=D.eng, M=D.mod, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
const fl=a=>'['+a.map(v=>+(+v).toFixed(4)).join(', ')+']';
// 3.1 graph summary
(function(){const p=G.cpu_plain, n=p.nodes, acc=n.filter(x=>x.name==='AccumulateGrad').length;
  const seen=new Map();n.forEach(x=>x.saved.forEach(s=>{if(!s.is_param||s.is_param==='x (input)')seen.set(s.sid,s.bytes)}));
  const act=[...seen.values()].reduce((a,b)=>a+b,0);
  $('tda-g5').innerHTML=[['nodes',n.length,(n.length-acc)+' operator nodes + '+acc+' AccumulateGrad (12 parameters and x)','var(--c1)'],['saved activations',U.mb(act),'unique storages, weights excluded <span class="der">derived from the record</span>','var(--c2)'],['live after forward',U.mb(p.live),'every storage forward made and still holds, incl. y and the loss','var(--c3)'],['backward calls',p.ops.length,'aten calls during loss.backward()','var(--c4)']].map(([k,v,d,c])=>'<div style="--sc:'+c+'"><div class="k">'+k+'</div><div class="v">'+v+'</div><p>'+d+'</p></div>').join('');
  const rows=n.filter(x=>x.saved.length).map(x=>{const own=x.saved.filter(s=>!s.is_param||s.is_param==='x (input)');return ['<code>'+x.name+'</code>',x.saved.map(s=>s.name+(s.is_param&&s.is_param!=='x (input)'?' <span class="mute">(weight)</span>':'')).join(', '),U.fmt(own.reduce((a,s)=>a+s.bytes,0))]});
  $('tda-gsaved').innerHTML=U.table(['node','saved','bytes (activations; shared storages counted per node)'],rows);})();
// 3.4 version summary
(function(){const L=A.version_lab;$('tda-versum').innerHTML=U.table(['case','outcome'],L.map(c=>[E(c.title),c.status==='error'?'<span class="tda-err">'+E(c.error.text.split('. Hint')[0].slice(0,140))+(c.error.text.length>140?'&hellip;':'')+'</span>':'<b style="color:var(--good)">runs</b>'+(c.grad_x?', x.grad = '+fl(c.grad_x):'')]))+'<p class="small mute">Each snippet run for real with torch 2.14.1 (src/exp/autograd_lab.py); step through any of them in the Version-counter lab.</p>';
})();
// 3.6
(function(){const c=A.custom_function;$('tda-cf-out').textContent='gradcheck: '+c.gradcheck_good+'   gradgradcheck: '+c.gradgradcheck_good+'   grad_fn: '+c.grad_fn+'\nmax |gradient - autograd through F.gelu(approximate="tanh")| = '+c.matches_builtin.toExponential(2);})();
// 3.8
$('tda-gm').innerHTML=U.table(['context','y.requires_grad','y.grad_fn','inference tensor','later (y * w).sum().backward()'],A.grad_modes.map(g=>['<code>'+E(g.code).replace(/\n/g,'<br>')+'</code>',g.requires_grad,g.grad_fn||'None',g.is_inference,g.later_backward==='ok'?'ok':'<span class="tda-err">'+E(g.later_backward.split('. Please')[0])+'</span>']));
// 3.9 saved-tensor hooks and checkpoint, one block
(function(){const p=G.cpu_plain,c=G.cpu_checkpoint,mp=G.mps_plain,mo=G.mps_offload;
  const cnt=o=>o.ops.length, add=o=>o.ops.filter(([n])=>n==='addmm').length;
  $('tda-sth').innerHTML=U.table(['same block, same input','device memory held after forward','backward calls','gradients vs plain'],[
    ['plain (CPU)',U.fmt(p.live)+' B (live storages)',cnt(p),'reference'],
    ['checkpointed, non-reentrant (CPU)',U.fmt(c.live)+' B',cnt(c)+' (of which '+add(c)+' addmm recomputed)','max diff '+c.diff],
    ['plain (MPS)',U.fmt(mp.dev)+' B (torch.mps.current_allocated_memory)','','reference'],
    ['save_on_cpu-style pack hook (MPS)',U.fmt(mo.dev)+' B; '+mo.packed+' tensors, '+U.fmt(mo.packed_bytes)+' B moved to host memory','','max diff '+mo.diff],
    ['checkpointed (MPS)',U.fmt(G.mps_checkpoint_dev)+' B','','']]);
  const ck=A.checkpoint_variants;
  $('tda-ck').innerHTML=U.table(['variant','live after forward','forward calls','backward calls','addmm in backward','gradients vs plain'],['plain','non-reentrant','reentrant','unspecified'].map(k=>{const r=ck[k];return ['<code>'+(k==='unspecified'?'checkpoint(b, h)':k==='plain'?'b(h)':'use_reentrant='+(k==='reentrant'?'True':'False'))+'</code>',U.mb(r.live_after_forward),r.forward_calls,r.backward_calls,r.addmm_in_backward,k==='plain'?'reference':'max diff '+r.max_grad_diff]}));
})();
// 4.1
(function(){const r=M.registered;$('tda-reg').innerHTML=U.table(['query','result'],[['<code>len(list(m.parameters()))</code>',r.parameters],['<code>len(list(m.named_parameters(remove_duplicate=False)))</code>',r.named_parameters_remove_duplicate_false],['<code>len(m.state_dict())</code>',r.state_dict_entries],['elements: parameters / state_dict',U.fmt(r.numel_parameters)+' / '+U.fmt(r.numel_state_dict)],['<code>m.head.weight is m.tok.weight</code>',r.tied_same_object],['modules in the tree',r.modules],['buffers of the attn="manual" variant',r.manual_buffers.length+' causal masks, persistent=False: in state_dict? '+r.manual_state_dict_has_mask]]);
  const s=M.saving,l=M.load;
  $('tda-tie').innerHTML=U.table(['operation','what happened'],[
   ['<code>torch.save(m.state_dict())</code>',U.fmt(s.torch_save_bytes)+' bytes on disk for '+U.fmt(s.param_bytes)+' bytes of parameters: the shared storage is written once; after <code>torch.load</code> the two names still share it ('+s.loaded_shares+')'],
   ['<code>safetensors.torch.save_file(m.state_dict(), ...)</code>','<span class="tda-err">'+E(s.safetensors_save_file.split(': [')[0])+'</span> (safetensors '+s.safetensors_version+')'],
   ['<code>safetensors.torch.save_model(m, ...)</code>',s.safetensors_save_model_keys+' tensors written, dropped: '+s.safetensors_dropped.join(', ')+'; <code>load_model</code> restores the tie ('+s.safetensors_load_model_tied+') and the values ('+s.safetensors_load_model_equal+')'],
   ['<code>load_state_dict</code> with different values under the two names','the later name wins: tok.weight[0, 0] = '+l.tied_load_value+'; still tied: '+l.tied_still_tied],
   ['<code>to_empty</code> after building on meta','tie broken (section 2.5)']]);
  $('tda-ld-err').textContent=l.strict_error.join('\n');
  $('tda-ld-ret').textContent='_IncompatibleKeys(missing_keys='+JSON.stringify(l.strict_false_returns.missing_keys)+', unexpected_keys='+JSON.stringify(l.strict_false_returns.unexpected_keys)+')';
})();
// 4.4 the loop
(function(){const z=M.zero_grad,a=M.accumulation,p=M.amp,sc=p.fp16_scaler_cpu;
  const it=[
   '<b><code>model.train()</code></b> flips <code>self.training</code> on every sub-module; dropout and batch norm read it. It does not touch gradients.',
   '<b>Gradient accumulation.</b> Four micro-batches of 2 with each loss divided by 4 gave the same gradient as one batch of 8 (max difference '+a.divided.max_abs_diff_vs_full.toExponential(1)+', norm '+a.divided.norm.toFixed(4)+' against '+a.full_norm.toFixed(4)+'). Without the division the gradient norm was '+a.not_divided.norm.toFixed(2)+': exactly '+a.not_divided.ratio.toFixed(2)+' times too large <span class="meas">measured</span>.',
   '<b>Clipping.</b> <code>clip_grad_norm_</code> returns the norm <i>before</i> clipping ('+a.clip.returned_total_norm.toFixed(4)+' at step 0) and scales every gradient so the total becomes the threshold ('+a.clip.norm_after.toFixed(6)+' after clipping to '+a.clip.max_norm+'). Log the returned value: it is the cheapest training-health signal you have. Under a GradScaler, unscale first or you clip the scaled gradient.',
   '<b>Autocast bfloat16.</b> On the CPU the step ran with '+p.bf16_cpu.logits_dtype+' logits, a '+p.bf16_cpu.param_dtype+' loss and '+p.bf16_cpu.grad_dtype+' gradients on '+p.bf16_cpu.param_dtype+' parameters: autocast changes the compute, not the weights or the optimizer.',
   '<b>float16 and the GradScaler.</b> float16 has 5 exponent bits: below 2<sup>&minus;14</sup> it loses precision and below 2<sup>&minus;24</sup> it cannot represent a value at all. The scaler multiplies the loss by a scale (default 2<sup>16</sup> = 65,536), so every gradient is 65,536 times larger while in float16, then divides it out before the optimizer step; if any gradient overflowed to inf or NaN it skips the step and halves the scale, and every 2,000 clean steps it doubles it. Four steps of the running example with float16 autocast on the CPU: losses '+sc.map(s=>s.loss).join(', ')+', scale '+sc[sc.length-1].scale_after+' throughout (no overflow, and far from 2,000 steps).',
   '<b><code>zero_grad(set_to_none=True)</code></b> (the default) sets every <code>.grad</code> to None ('+z.default_set_to_none+'), freeing '+U.fmt(z.grad_bytes)+' bytes here until the next backward allocates them again; <code>set_to_none=False</code> fills them with zeros (all zero: '+z.set_to_none_false_all_zero+'). Code that reads <code>p.grad</code> after zero_grad must handle None.'];
  const gs=D.src.scaler;it.splice(5,0,'<b>Scaler defaults</b> from the source: <code>'+E(gs.text.replace(/\s+/g,' ').trim())+'</code> (<a href="'+gs.url+'" target="_blank" rel="noopener noreferrer">grad_scaler.py L'+gs.start+'&ndash;'+gs.end+'</a>).');
  $('tda-loop').innerHTML=it.map(x=>'<li>'+x+'</li>').join('');
})();
// 4.5 determinism
(function(){const d=M.determinism;
  $('tda-det').innerHTML='<p>Three training steps of the running example, run several ways <span class="meas">measured on Apple M1 Pro</span>:</p>'+U.table(['comparison','result'],[
   ['CPU, 4 threads, run twice','bitwise identical: '+d.cpu_4threads_twice_bitwise_equal],
   ['CPU, 1 thread against 4 threads','max parameter difference '+d.cpu_1_vs_4_threads_max_param_diff.toExponential(2)+'; step-1 loss '+d.cpu_1_vs_4_threads_losses[1][1].toFixed(7)+' against '+d.cpu_1_vs_4_threads_losses[0][1].toFixed(7)],
   ['CPU with torch.use_deterministic_algorithms(True)','identical to without: '+d.cpu_deterministic_flag_equal],
   ['MPS, run twice','bitwise identical: '+d.mps_twice_bitwise_equal+' (max difference '+d.mps_twice_max_param_diff.toExponential(2)+'); 5 more runs equal to the first: '+d.mps_5_more_runs_equal_to_first],
   ['MPS with use_deterministic_algorithms(True), twice','bitwise identical: '+d.mps_deterministic_flag_twice_bitwise_equal+' (no error raised)'],
   ['MPS against CPU','max parameter difference '+d.mps_vs_cpu_max_param_diff.toExponential(2)]])+
   '<p>What this says: on the CPU with a fixed thread count the run is bit-for-bit repeatable, and the thread count changes the order of floating-point sums, hence the last bits. On MPS this run was not bit-repeatable even with the deterministic flag, which raised nothing. On CUDA, <code>torch.use_deterministic_algorithms(True)</code> swaps in deterministic kernels where they exist and raises a <code>RuntimeError</code> for operations without one (the 2.14 docs list, for example, <code>torch.histc</code> on CUDA), and <code>torch.backends.cudnn.benchmark = False</code> stops cuDNN from picking algorithms by timing (<a href="https://docs.pytorch.org/docs/2.14/notes/randomness.html" target="_blank" rel="noopener noreferrer">Reproducibility notes, 2.14</a>; <a href="https://docs.pytorch.org/docs/2.14/generated/torch.use_deterministic_algorithms.html" target="_blank" rel="noopener noreferrer">use_deterministic_algorithms</a>); not run here. Seed with <code>torch.manual_seed</code> and make the data order a function of the step, as the running example\'s <code>get_batch(cfg, step)</code> does: that is what made its first three losses identical across a plain loop and three frameworks on the root\'s <a href="https://app.notion.com/p/3c65c17b0d0d8150aa65ca44b6ed2fd5" target="_blank" rel="noopener noreferrer">Ecosystem map</a> tab.</p>';})();
// 4.6 dataloader
(function(){const d=D.dl, w=D.src.worker_seed;
  $('tda-dl').innerHTML='<p>Workers are separate processes; on macOS they start with <code>'+d.start_method+'</code> (a fresh interpreter that re-imports your script, so the training code must sit under <code>if __name__ == "__main__":</code>). Each worker seeds Python\'s <code>random</code>, torch and NumPy from a base seed drawn from the parent\'s torch generator plus its worker id:</p><div class="tda-q" data-q="worker_seed"></div>'+
  U.table(['item','worker','torch.rand','random.random','np.random.rand'],d.two_workers.map(r=>[r[0],r[1],r[2],r[3],r[4]]))+
  '<p>Two workers, after <code>torch.manual_seed(0)</code>: every RNG differs between workers, and the run repeats exactly when the parent is reseeded (same values on a second pass: '+d.same_seed_same_values+'). In the main process (<code>num_workers=0</code>) it is different: <code>torch.manual_seed</code> does not seed Python\'s <code>random</code> or NumPy. Two separate runs gave the same torch values ('+d.no_workers_two_processes[0].map(r=>r[2]).join(', ')+') but different <code>random.random()</code> values ('+d.no_workers_two_processes[0].map(r=>r[3]).join(', ')+' then '+d.no_workers_two_processes[1].map(r=>r[3]).join(', ')+') <span class="meas">measured</span>. Seed all three yourself, or pass a <code>generator</code> and a <code>worker_init_fn</code> as the reproducibility notes show.</p>'+
  '<p><code>pin_memory=True</code> makes the loader copy each batch into pinned host memory in a background thread, so the <code>.to("cuda", non_blocking=True)</code> that follows can overlap with compute. On this Mac it warned and did nothing (section 1, devices block). Defaults worth knowing at 2.14.1: <code>prefetch_factor</code> 2 batches per worker when <code>num_workers &gt; 0</code> (dataloader.py L293), workers restarted every epoch unless <code>persistent_workers=True</code>. Finding a data bottleneck is on the sibling <a href="https://app.notion.com/p/3c65c17b0d0d810d9e1fdf9ec942c20d" target="_blank" rel="noopener noreferrer">Making training fast</a>.</p>';
  // the quote div was inserted after the global quote pass: render it now
  const el=document.querySelector('#tda-dl .tda-q');el.innerHTML='<div class="cap">'+E(w.caption)+' <a href="'+w.url+'" target="_blank" rel="noopener noreferrer">worker.py L'+w.start+'&ndash;'+w.end+' @ v2.14.1</a></div><pre>'+E(w.text)+'</pre>';})();
})();
