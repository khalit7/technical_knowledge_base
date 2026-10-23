// ---- Reading sections 4, 6 and 7: absorbed on 2026-10-23 from the sibling Tensors, the dispatcher and autograd
// (its recorded module.json, dataloader.json and source quotes, copied to exp/inputs/loop_*.json). The float16 range
// before/after (section 6), the tied-weight diagram and the loop stepper (section 7), and the closed-block tables.
(function(){
  const D=window.FST,U=window.FU,$=U.$,E=RD.esc;
  const M=D.loop_module,DL=D.loop_dataloader,SRC=D.loop_sources;if(!M)return;
  const fmt=n=>U.comma(n);
  const table=(h,rows)=>'<table class="rd-tbl tbl-sm"><thead><tr>'+h.map(x=>'<th>'+x+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  const p=M.amp,a=M.accumulation,z=M.zero_grad,sc=p.fp16_scaler_cpu;

  // ---- section 6: float16's range, the gradients unscaled and scaled (toggle, same input, same axis) ----
  const fel=$('fst-fp16-svg');
  if(fel){let mode='raw';const LO=-46,HI=18,FMAX=Math.log2(65504);
    const g0=Math.log2(p.min_nonzero_abs_grad),g1=Math.log2(p.max_abs_grad),S=16;
    function draw(){const w=RD.width(fel),L=6,R=6,h=118,X=v=>L+(w-L-R)*(v-LO)/(HI-LO);const sh=mode==='raw'?0:S;let s='';
      const band=(a,b,c,lab,y)=>{s+='<rect x="'+X(a).toFixed(1)+'" y="18" width="'+(X(b)-X(a)).toFixed(1)+'" height="44" fill="'+c+'" opacity="0.16"/>';
        if(X(b)-X(a)>lab.length*6)s+=RD.t(((X(a)+X(b))/2).toFixed(1),y,lab,{a:'middle',fs:11,fill:'var(--mute)'})};
      band(LO,-24,'var(--bad)',w<520?'flushed':'flushed to zero',13);band(-24,-14,'var(--c5)',w<520?'':'subnormal',13);band(-14,FMAX,'var(--good)','float16 normal range',13);band(FMAX,HI,'var(--bad)','',13);
      [-24,-14,FMAX].forEach(v=>{s+='<line x1="'+X(v).toFixed(1)+'" x2="'+X(v).toFixed(1)+'" y1="18" y2="66" stroke="var(--mute)" stroke-dasharray="3 3"/>'});
      s+='<rect x="'+X(g0+sh).toFixed(1)+'" y="32" width="'+(X(g1+sh)-X(g0+sh)).toFixed(1)+'" height="16" rx="3" fill="var(--acc)" opacity="0.85"/>';
      const lab=mode==='raw'?'gradient magnitudes, unscaled':'the same gradients &times; 65,536';
      s+=RD.t(Math.min(w-R,Math.max(L+2,X(g0+sh)+4)).toFixed(1),44,lab,{fs:11,fill:'var(--bg)',w:600});
      const ticks=w<520?[-40,-24,-14,0,16]:[-40,-32,-24,-14,-8,0,8,16];
      ticks.forEach(t=>{s+='<line x1="'+X(t).toFixed(1)+'" x2="'+X(t).toFixed(1)+'" y1="66" y2="71" stroke="var(--mute)"/>'+RD.t(X(t).toFixed(1),84,'2<tspan dy="-4" font-size="9">'+t+'</tspan>',{a:'middle',fs:11,fill:'var(--mute)'})});
      s+=RD.t(X(FMAX).toFixed(1),104,'max 65,504',{a:'end',fs:11,fill:'var(--mute)'});
      fel.innerHTML=RD.svg(w,h,s,'float16 range against the gradients, unscaled or scaled');
      const raw=mode==='raw';
      $('fst-fp16-cnt').innerHTML=RD.stat('Flushed (below 2<sup>&minus;24</sup>)',fmt(raw?p.below_fp16_subnormal_unscaled:p.below_fp16_subnormal_scaled_65536),'of '+fmt(p.grad_elems))+
        RD.stat('Imprecise (below 2<sup>&minus;14</sup>)',fmt(raw?p.below_fp16_normal_unscaled:p.below_fp16_normal_scaled_65536))+
        RD.stat('Largest gradient',raw?p.max_abs_grad.toFixed(3):fmt(p.scaled_max_vs_fp16_max),'float16 max 65,504')}
    U.seg($('fst-fp16-seg'),[['raw','Unscaled'],['scaled','Scaled by 65,536']],m=>{mode=m;draw()},'raw');
    RD.onRender(draw);RD.onResize(draw);
    U.predict('fst-pr-fp16',1,'1,636 of them (measured on the fp32 gradients of step 0) are below 2<sup>&minus;24</sup>, and 436,592 below 2<sup>&minus;14</sup> lose precision. Toggle the figure below to see the scaler move them.');}

  // ---- section 7: the tied weight, one Parameter under two names ----
  const tel=$('fst-tie-svg'),r=M.registered;
  if(tel){const draw=()=>{const w=RD.width(tel);let s='';const box=(x,y,bw,bh,t1,t2,col)=>{s+='<rect x="'+x+'" y="'+y+'" width="'+bw+'" height="'+bh+'" rx="6" fill="var(--soft)" stroke="'+(col||'var(--line)')+'" stroke-width="'+(col?2:1)+'"/>'+RD.t(x+bw/2,y+(t2?17:bh/2+4),t1,{a:'middle',fs:12,w:600,fill:'var(--ink)'})+(t2?RD.t(x+bw/2,y+33,t2,{a:'middle',fs:11,fill:'var(--mute)'}):'')};
      const arrow=(x1,y1,x2,y2)=>{s+='<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.4" marker-end="url(#fst-ar)"/>'};
      s+='<defs><marker id="fst-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="var(--mute)"/></marker></defs>';
      const narrow=w<560,c=w/2;
      if(narrow){const bw=Math.min(150,(w-24)/2);box(c-bw-6,4,bw,30,'tok.weight');box(c+6,4,bw,30,'head.weight');
        arrow(c-bw/2-6,34,c-30,64);arrow(c+bw/2+6,34,c+30,64);box(c-110,66,220,42,'one nn.Parameter','43 &times; 256 = 11,008 elements','var(--acc)');
        const cw=Math.min(170,(w-16)/2);box(c-cw-4,132,cw,42,'parameters(): '+r.parameters,fmt(r.numel_parameters)+' elements');box(c+4,132,cw,42,'state_dict(): '+r.state_dict_entries,fmt(r.numel_state_dict)+' elements');
        arrow(c-40,108,c-cw/2-4,131);arrow(c+40,108,c+cw/2+4,131);tel.innerHTML=RD.svg(w,178,s,'A tied weight');}
      else{box(8,8,150,30,'tok.weight');box(8,62,150,30,'head.weight');arrow(158,23,c-122,44);arrow(158,77,c-122,56);
        box(c-120,28,240,44,'one nn.Parameter, one storage','43 &times; 256 = 11,008 elements','var(--acc)');
        const cw=Math.min(210,w-(c+120)-40);box(w-cw-6,4,cw,42,'parameters(): '+r.parameters+' tensors',fmt(r.numel_parameters)+' elements, once');box(w-cw-6,54,cw,42,'state_dict(): '+r.state_dict_entries+' entries',fmt(r.numel_state_dict)+' elements, twice');
        arrow(c+120,44,w-cw-8,25);arrow(c+120,56,w-cw-8,75);tel.innerHTML=RD.svg(w,100,s,'A tied weight');}};
    draw();RD.onRender(draw);RD.onResize(draw);}

  // ---- section 7: the loop, line by line (a stepper: no tweening, one caption per step) ----
  const code=['model.train()',
    'opt = torch.optim.AdamW(groups, lr=6e-4, fused=True)',
    'scaler = torch.amp.GradScaler("cuda", enabled=(amp_dtype == torch.float16))',
    'for step in range(steps):',
    '    for micro in range(accum):                       # gradient accumulation',
    '        x, y = get_batch(cfg, step * accum + micro, device)',
    '        with torch.autocast(device_type, dtype=amp_dtype):',
    '            _, loss = model(x, y)',
    '        scaler.scale(loss / accum).backward()        # .grad adds up',
    '    scaler.unscale_(opt)                             # clip the true gradient',
    '    total_norm = torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)',
    '    scaler.step(opt)                                 # skipped on inf or NaN',
    '    scaler.update()',
    '    opt.zero_grad(set_to_none=True)                  # free the gradients'];
  const steps=[
    [[0],'model.train()','Flips <code>self.training</code> on every sub-module; dropout and batch norm read it. It does not touch gradients.'],
    [[1],'A fused optimizer','One kernel for the whole update (section 5). Weight decay and betas sit in the parameter groups.'],
    [[2],'A scaler only for float16','bfloat16 has float32\'s exponent range and needs none (section 6); with <code>enabled=False</code> every scaler call passes through.'],
    [[4,5],'Micro-batches, in a fixed order','Batch k is a function of the step and the micro-batch index, so a rerun sees the same data: the basis of determinism. Activations scale with the micro-batch, the gradient with the whole batch.'],
    [[6,7],'Forward under autocast','On the CPU under bfloat16: '+p.bf16_cpu.logits_dtype+' logits, a '+p.bf16_cpu.param_dtype+' loss, '+p.bf16_cpu.grad_dtype+' gradients on '+p.bf16_cpu.param_dtype+' parameters <span class="meas">measured</span>.'],
    [[8],'Backward adds into .grad','Four micro-batches of 2, each loss divided by 4: the same gradient as one batch of 8 (norm '+a.divided.norm.toFixed(4)+' against '+a.full_norm.toFixed(4)+', max difference '+a.divided.max_abs_diff_vs_full.toExponential(1)+'). Without the division: norm '+a.not_divided.norm.toFixed(2)+', exactly '+a.not_divided.ratio.toFixed(2)+' times too large <span class="meas">measured</span>.'],
    [[9],'Unscale before clipping','Divides every gradient by the scale (65,536 by default) in place. Clip first and the threshold applies to a gradient 65,536 times too large.'],
    [[10],'Clip, and log what it returns','Returns the norm <i>before</i> clipping ('+a.clip.returned_total_norm.toFixed(4)+' at step 0) and scales every gradient so the total is the threshold ('+a.clip.norm_after.toFixed(6)+' after clipping to '+a.clip.max_norm+') <span class="meas">measured</span>.'],
    [[11,12],'Step, then update the scale','The step is skipped if any gradient is inf or NaN, and the scale halves; every 2,000 clean steps it doubles. Four float16 steps on the CPU: losses '+sc.map(s=>s.loss).join(', ')+', scale '+fmt(sc[sc.length-1].scale_after)+' throughout.'],
    [[13],'zero_grad(set_to_none=True)','The default: every <code>.grad</code> becomes None, freeing '+fmt(z.grad_bytes)+' bytes here until the next backward; <code>set_to_none=False</code> fills them with zeros. Code that reads <code>p.grad</code> afterwards must handle None.']];
  const lc=$('fst-loop-code');
  if(lc){lc.innerHTML=code.map((l,i)=>'<div data-l="'+i+'">'+E(l)+'</div>').join('');
    const rows=[...lc.children];
    RD.anim({card:'fst-loopcard',ctl:'fst-loop-ctl',n:steps.length,ms:2200,label:'Line',draw:i=>{const st=steps[i];
      rows.forEach((d,k)=>{d.classList.toggle('on',st[0].includes(k));d.classList.toggle('dim',!st[0].includes(k))});
      $('fst-loop-cap').innerHTML='<div class="t">'+(i+1)+' of '+steps.length+': '+st[1]+'</div><p>'+st[2]+'</p>'}});}

  // ---- closed blocks: registration, tied weights, loading, determinism, DataLoader seeding ----
  if($('fst-reg'))$('fst-reg').innerHTML=table(['query','result'],[['<code>len(list(m.parameters()))</code>',r.parameters],['<code>len(list(m.named_parameters(remove_duplicate=False)))</code>',r.named_parameters_remove_duplicate_false],['<code>len(m.state_dict())</code>',r.state_dict_entries],['elements: parameters / state_dict',fmt(r.numel_parameters)+' / '+fmt(r.numel_state_dict)],['<code>m.head.weight is m.tok.weight</code>',r.tied_same_object],['modules in the tree',r.modules],['buffers of the attn="manual" variant',r.manual_buffers.length+' causal masks, persistent=False: in state_dict? '+r.manual_state_dict_has_mask]]);
  const sv=M.saving,ld=M.load;
  if($('fst-tie'))$('fst-tie').innerHTML=table(['operation','what happened'],[
    ['<code>torch.save(m.state_dict())</code>',fmt(sv.torch_save_bytes)+' bytes on disk for '+fmt(sv.param_bytes)+' bytes of parameters: the shared storage is written once; after <code>torch.load</code> the two names still share it ('+sv.loaded_shares+')'],
    ['<code>safetensors.torch.save_file(m.state_dict(), ...)</code>','<span class="ann">'+E(sv.safetensors_save_file.split(': [')[0])+'</span> (safetensors '+sv.safetensors_version+')'],
    ['<code>safetensors.torch.save_model(m, ...)</code>',sv.safetensors_save_model_keys+' tensors written, dropped: '+sv.safetensors_dropped.join(', ')+'; <code>load_model</code> restores the tie ('+sv.safetensors_load_model_tied+') and the values ('+sv.safetensors_load_model_equal+')'],
    ['<code>load_state_dict</code> with different values under the two names','the later name wins: tok.weight[0, 0] = '+ld.tied_load_value+'; still tied: '+ld.tied_still_tied],
    ['<code>to_empty</code> after building on the meta device','tie broken (see Tensors, the dispatcher and autograd, section 2.5)']]);
  if($('fst-ld-err'))$('fst-ld-err').textContent=ld.strict_error.join('\n');
  if($('fst-ld-ret'))$('fst-ld-ret').textContent='_IncompatibleKeys(missing_keys='+JSON.stringify(ld.strict_false_returns.missing_keys)+', unexpected_keys='+JSON.stringify(ld.strict_false_returns.unexpected_keys)+')';
  U.predict('fst-pr-sd',1,'12,791,808 <span class="der">derived</span>: the state_dict has '+r.state_dict_entries+' entries totalling '+fmt(r.numel_state_dict)+' elements, because the tied <code>tok.weight</code> and <code>head.weight</code> (43 &times; 256 = 11,008 elements) appear under both names. They are one storage, so the real memory is '+fmt(sv.param_bytes)+' bytes; code that sums a state_dict overcounts.');
  U.predict('fst-pr-tie',1,'2.0 (measured). Both names copy into the same storage, in state_dict order, and <code>head.weight</code> comes after <code>tok.weight</code>, so the last one wins and no warning is given. This happens when you load an untied checkpoint into a tied architecture.');
  const d=M.determinism;
  if($('fst-det'))$('fst-det').innerHTML='<p class="small">Three training steps of the running example, run several ways <span class="meas">measured on Apple M1 Pro</span>:</p>'+table(['comparison','result'],[
    ['CPU, 4 threads, run twice','bitwise identical: '+d.cpu_4threads_twice_bitwise_equal],
    ['CPU, 1 thread against 4 threads','max parameter difference '+d.cpu_1_vs_4_threads_max_param_diff.toExponential(2)+'; step-1 loss '+d.cpu_1_vs_4_threads_losses[1][1].toFixed(7)+' against '+d.cpu_1_vs_4_threads_losses[0][1].toFixed(7)],
    ['CPU with torch.use_deterministic_algorithms(True)','identical to without: '+d.cpu_deterministic_flag_equal],
    ['MPS, run twice','bitwise identical: '+d.mps_twice_bitwise_equal+' (max difference '+d.mps_twice_max_param_diff.toExponential(2)+'); 5 more runs equal to the first: '+d.mps_5_more_runs_equal_to_first],
    ['MPS with use_deterministic_algorithms(True), twice','bitwise identical: '+d.mps_deterministic_flag_twice_bitwise_equal+' (no error raised)'],
    ['MPS against CPU','max parameter difference '+d.mps_vs_cpu_max_param_diff.toExponential(2)]]);
  if($('fst-dl')&&DL){const w=SRC.worker_seed;
    $('fst-dl').innerHTML='<p>Workers are separate processes; on macOS they start with <code>'+DL.start_method+'</code> (a fresh interpreter that re-imports your script, so the training code must sit under <code>if __name__ == "__main__":</code>). Each worker seeds Python\'s <code>random</code>, torch and NumPy from a base seed drawn from the parent\'s torch generator plus its worker id (<a href="'+w.url+'" target="_blank" rel="noopener noreferrer">worker.py L'+w.start+'&ndash;'+w.end+' @ v2.14.1</a>):</p><div class="code">'+E(w.text.replace(/^ {8}/gm,''))+'</div>'+
      '<div class="tw nomin">'+table(['item','worker','torch.rand','random.random','np.random.rand'],DL.two_workers.map(x=>x.map(String)))+'</div>'+
      '<p>Two workers, after <code>torch.manual_seed(0)</code>: every RNG differs between workers, and the run repeats exactly when the parent is reseeded (same values on a second pass: '+DL.same_seed_same_values+'). In the main process (<code>num_workers=0</code>) two separate runs gave the same torch values ('+DL.no_workers_two_processes[0].map(x=>x[2]).join(', ')+') but different <code>random.random()</code> values ('+DL.no_workers_two_processes[0].map(x=>x[3]).join(', ')+' then '+DL.no_workers_two_processes[1].map(x=>x[3]).join(', ')+') <span class="meas">measured</span>. Seed all three yourself, or pass a <code>generator</code> and a <code>worker_init_fn</code> as the reproducibility notes show. <code>pin_memory=True</code> makes the loader copy each batch into pinned host memory in a background thread, so the <code>.to("cuda", non_blocking=True)</code> that follows can overlap with compute.</p>';}
})();
