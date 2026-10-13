// ---- Reading section 2 (the dispatcher) ----
(function(){
const D=window.TDA, S=D.dsp, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
const code=(s)=>'<div class="code">'+E(s)+'</div>';
$('tda-nfcount').textContent=U.fmt(S.native_functions_count);
$('tda-opcount').textContent=U.fmt(S.op_stats.aten_ops);
document.querySelectorAll('.tda-opn').forEach(e=>e.textContent=U.fmt(S.op_stats.aten_ops));
$('tda-dvcount').textContent=U.fmt(S.derivatives_count);
const yurl=(f,b)=>'https://github.com/pytorch/pytorch/blob/v2.14.1/'+f+'#L'+b.line+'-L'+b.end;
const yq=(f,k,b)=>'<div class="tda-q"><div class="cap">'+E(k)+' <a href="'+yurl(f,b)+'" target="_blank" rel="noopener noreferrer">'+f.split('/').pop()+' L'+b.line+'&ndash;'+b.end+' @ v2.14.1</a></div><pre>'+E(b.text)+'</pre></div>';
$('tda-nf').innerHTML=['add_.Tensor','view','linear','mm'].map(k=>yq('aten/src/ATen/native/native_functions.yaml',k,S.native_functions[k])).join('');
$('tda-dv').innerHTML='<div class="rd-two"><div>'+yq('tools/autograd/derivatives.yaml','mm',S.derivatives.mm)+'</div><div>'+yq('tools/autograd/derivatives.yaml','gelu',S.derivatives.gelu)+'</div></div><p class="small">Each line says how to turn the gradient of the output (<code>grad</code>) into the gradient of one input, and which inputs it needs: <code>mm</code> needs both <code>self</code> and <code>mat2</code>, so its node saves both; <code>gelu</code> needs its input. That list is exactly what ends up as a node\'s saved tensors in section 3.</p>';
// ladder
(function(){const kv=S.key_values;const show=[['PythonDispatcher','torch._C._EnablePythonDispatcher (debugging the dispatcher from Python)'],['PreDispatch','pre-dispatch tracing (torch.export)'],['FuncTorchDynamicLayerFrontMode','functorch transforms (vmap, grad) enter here'],['PythonTLSSnapshot','snapshots the Python mode stack before anything runs'],['AutocastCUDA','autocast for CUDA tensors'],['AutocastMPS','autocast for MPS tensors'],['AutocastCPU','autocast for CPU tensors'],['AutogradFunctionality','AutogradCPU, AutogradMPS, AutogradCUDA: record graph nodes'],['ADInplaceOrView','view bookkeeping and version counters'],['ZeroTensor','efficient zero tensors (forward AD)'],['Negative','lazy negation views'],['Conjugate','lazy conjugation views (x.conj())'],['Functionalize','rewrite mutations as pure ops (compilers)'],['Python','tensor subclasses and TorchDispatchMode, FakeTensor'],['BackendSelect','pick a backend for factory functions (torch.empty)'],['Dense','the arithmetic: CPU, MPS, CUDA, Meta kernels']];
  $('tda-ladder').innerHTML='<div class="keys">'+show.map(([k,d])=>'<div><b>'+kv[k]+' &middot; '+k+'</b><span>'+d+'</span></div>').join('')+'</div>';})();
// tensor keys
$('tda-tkeys').innerHTML=U.table(['tensor','dispatch keys (torch._C._dispatch_keys)'],Object.entries(S.tensor_keys).map(([k,v])=>[E(k),'<code>'+v.join(', ')+'</code>']));
// contexts
(function(){const order=[['default','default'],['no_grad','with torch.no_grad()'],['inference_mode','with torch.inference_mode()'],['autocast_cpu_bf16','with torch.autocast("cpu", dtype=torch.bfloat16)'],['inside a TorchDispatchMode (read in user code)','inside a TorchDispatchMode']];
  const short=l=>l.filter(k=>!/Autocast(MTIA|MAIA|XPU|IPU|HPU|XLA|PrivateUse1|CUDA)|TESTING/.test(k)).join(', ');
  $('tda-ctx').innerHTML=U.table(['context','included set','excluded set (other devices\' Autocast keys omitted)','effective keys for a plain CPU tensor'],order.map(([k,l])=>{const c=S.tls[k];return ['<code>'+E(l)+'</code>','<span class="small">'+short(c.include)+'</span>','<span class="small">'+short(c.exclude)+'</span>','<b class="small">'+c.effective_cpu.join(', ')+'</b>']}))+
   '<p class="small mute">Measured with torch._C._dispatch_tls_local_include_set / exclude_set, and the effective set computed from the raw bit sets the way DispatchKeyExtractor.h L46 does. Printing collapses "every autograd key" to the names AutogradOther and AutogradNestedTensor; the effective column shows that AutogradCPU is gone under inference_mode.</p>';})();
// op tables
(function(){const ops=['aten::mm','aten::linear','aten::view','aten::add_.Tensor','aten::gelu','aten::scaled_dot_product_attention','aten::_scaled_dot_product_flash_attention_for_cpu'];
  const keys=['AutocastCPU','AutogradCPU','ADInplaceOrView','Functionalize','Python','CPU','MPS','Meta'];
  const seg=$('tda-tblseg');seg.innerHTML=ops.map((o,i)=>'<button data-m="'+o+'"'+(i===0?' class="on"':'')+'>'+o.replace('aten::','')+'</button>').join('');
  const cls={kernel:'kern','math kernel':'math','autograd kernel':'agk','backend fallback':'fb','default backend kernel':'kern',fallthrough:'ft'};
  function draw(o){const t=S.tables[o];$('tda-tbl').innerHTML=U.table(['key (priority order)','slot','registered in'],keys.map(k=>{const r=t[k];return [ '<code>'+k+'</code>',r?'<b>'+r.kind+'</b>':'<span class="mute">empty: not supported</span>',r?'<span class="small mute">'+E(r.file)+'</span>':'']}))+'<p class="small mute">torch._C._dispatch_dump_table("'+o+'"), file names only. "empty" means calling it with that key errors out.</p>'}
  RD.seg(seg,draw);draw(ops[0]);})();
// op stats
(function(){const st=S.op_stats.by_key, n=S.op_stats.aten_ops;const kinds=[['kernel','var(--c1)','own kernel'],['default backend kernel','var(--c6)','CompositeExplicitAutograd'],['math kernel','var(--c4)','math (decomposes)'],['autograd kernel','var(--c3)','autograd kernel'],['backend fallback','var(--c5)','boxed fallback'],['fallthrough','var(--dim)','fallthrough'],['none','var(--bad)','empty']];
  let h='<div class="split">';
  ['CPU','MPS','Meta','AutogradCPU','ADInplaceOrView','AutocastCPU','Functionalize','Python'].forEach(k=>{const s=st[k];h+='<b class="small">'+k+'</b><div class="sb">'+kinds.filter(([kk])=>s[kk]).map(([kk,c])=>'<span style="width:'+(100*s[kk]/n)+'%;background:'+c+'" title="'+kk+': '+s[kk]+'">'+(s[kk]/n>0.12?U.fmt(s[kk]):'')+'</span>').join('')+'</div>'});
  $('tda-opstat').innerHTML=h+'</div><div class="leg">'+kinds.map(([k,c,l])=>'<span style="--sw:'+c+'">'+l+'</span>').join('')+'</div>';})();
// fallback
$('tda-fb-gf').textContent=S.autograd_fallback.grad_fn;$('tda-fb-m').textContent=S.autograd_fallback.mode;
$('tda-fb-w').textContent='"'+S.autograd_fallback.warnings[0].split('. This behavior')[0]+'"';
// walk animation (reading version: four situations)
(function(){const W=S.walk;const ladder=[['AutocastCPU','var(--c5)'],['AutogradCPU','var(--c4)'],['ADInplaceOrView','var(--c6)'],['Python (TorchDispatchMode)','var(--c2)'],['CPU','var(--c1)']];
  const job={AutocastCPU:'casts the input to the autocast dtype (bfloat16), then calls the op again with AutocastCPU excluded',AutogradCPU:'would record a node if grad mode is on and an input requires grad; then redispatches with the autograd keys masked off',ADInplaceOrView:'view and in-place bookkeeping (nothing to do for this op), redispatch below','Python (TorchDispatchMode)':'hands the call to the active mode\'s __torch_dispatch__',CPU:'does the arithmetic: x * 2',Meta:'computes the output shape only'};
  let cur=0;
  function why(sit,k){const nm=W[sit].name;if(k==='AutocastCPU')return nm.includes('autocast')?'':'excluded: autocast is off';if(k==='AutogradCPU')return nm.includes('inference_mode')?'excluded: inference_mode excludes every autograd key':nm.includes('inference tensor')?'not in the key set: inference tensors carry no autograd key':nm.includes('meta')?'not this key: a meta tensor carries AutogradMeta (the boxed fallback ran there)':'';if(k.startsWith('Python'))return nm.includes('Dispatch')?'':'not in the key set: no mode, no subclass';return ''}
  function draw(i){const w=W[cur], v=w.visits, k=Math.min(i,v.length);
    $('tda-w-code').textContent=w.code;
    $('tda-w-hops').innerHTML=ladder.map(([key,c])=>{const vi=v.findIndex(x=>x.key===key||(key==='CPU'&&x.key==='Meta'));const on=vi>=0&&vi===k-1, done=vi>=0&&vi<k-1, r=why(cur,key);
      return '<div class="tda-hop'+(on?' on':'')+(vi<0?' off skip':'')+'" style="--sc:'+c+'"><b>'+key+'</b><span>'+(vi<0?r||'not reached':(done||on?'ran'+(v[vi].keyset?' with key set ['+v[vi].keyset.join(', ')+']':'')+', input '+v[vi].dtype:'waiting'))+'</span></div>'}).join('');
    const x=v[k-1];
    $('tda-w-cap').innerHTML=k===0?'<div class="t">'+E(w.name)+'</div><p>'+v.length+' kernels will run, in this order: '+v.map(z=>z.key.replace(' (TorchDispatchMode)','')).join(', ')+'. Result dtype '+w.result.dtype+'.</p>':
      '<div class="t">'+(k)+'. '+E(x.key)+'</div><p>'+(job[x.key]||'')+'. Grad mode '+(x.grad_mode?'on':'off')+'.</p>';}
  const an=RD.anim({card:'tda-w-card',ctl:'tda-w-ctl',n:W[0].visits.length+1,draw,ms:1300,label:'Kernel'});
  RD.seg($('tda-w-seg'),m=>{cur=+m;an.reset(W[cur].visits.length+1);an.play()});})();
// autocast
(function(){const a=S.autocast_model['cpu bfloat16'], f32=S.autocast_model['cpu float32 (no autocast)'];
  const rows=Object.entries(a.per_op).map(([op,d])=>[ '<code>'+op+'</code>',Object.entries(d).map(([t,n])=>'<b>'+n+'</b> &times; '+t).join(', ')]);
  $('tda-ac').innerHTML=U.table(['aten op (output dtype)','calls'],rows);
  const m=S.autocast_model['mps bfloat16'], m16=S.autocast_model['mps float16'];
  $('tda-ac-sum').innerHTML='Calls: '+a.calls+' with autocast against '+f32.calls+' without, of which '+a.casts+' are <code>_to_copy</code> casts (every weight and bias is cast again on every forward). Logits come out '+a.logits_dtype+', the loss '+a.loss_dtype+': '+a.loss.toFixed(6)+' against '+a.loss_fp32.toFixed(6)+' in float32 <span class="meas">measured on Apple M1 Pro, CPU</span>. On MPS: bfloat16 loss '+m.loss.toFixed(6)+', float16 '+m16.loss.toFixed(6)+', with '+m.casts+' casts in '+m.calls+' calls; on MPS <code>_log_softmax</code> ran in the autocast dtype, on the CPU in float32 (each device has its own autocast list).';})();
// functionalization
(function(){const f=S.functionalize;$('tda-fn-src').textContent=f.source;$('tda-fn-a').textContent=f.plain;$('tda-fn-b').textContent=f.functionalized;$('tda-fn-c').textContent=f.functionalized_remove;
  $('tda-fn-n').textContent=U.fmt(S.op_stats.by_key.Functionalize.kernel);})();
// meta and fake
(function(){const m=S.meta_fake;$('tda-mt-p').textContent=U.fmt(m.params);$('tda-mt-l').textContent=U.sh(m.logits);$('tda-mt-i').textContent='"'+m['loss.item()'].replace('RuntimeError: ','')+'".';
  $('tda-mt-t0').textContent=m.tied_on_meta;$('tda-mt-t1').textContent=m.tied_after_to_empty;$('tda-mt-t2').textContent=m.same_storage_after_to_empty;
  $('tda-fk-l').textContent=U.sh(m.fake_logits);$('tda-fk-g').textContent=U.sh(m.fake_grad_shape);$('tda-fk-e').textContent='"'+m.make_model_under_fake.replace('RuntimeError: ','')+'"';})();
// overhead
(function(){const t=D.tim&&D.tim.call_overhead;if(!t){$('tda-ovh-p').textContent='';return}
  const ent=Object.entries(t), mx=Math.max(...ent.map(([,v])=>v.median_us));
  $('tda-ovh-p').innerHTML='<b>The cost.</b> Each call pays for the key computation, each kernel it walks through, and the Python binding before any arithmetic. For a one-element add, where the arithmetic is nothing, that overhead is the whole time. Medians of 3 runs of torch.utils.benchmark <span class="meas">measured on Apple M1 Pro, CPU, load average '+D.tim.load_before[0].toFixed(1)+' at start</span>:';
  $('tda-ovh').innerHTML=ent.map(([k,v])=>'<div class="row"><span class="nm">'+E(k)+'</span><div class="track"><div class="fill" style="width:'+(100*v.median_us/mx)+'%;background:var(--c1)"></div></div><span class="val">'+v.median_us.toFixed(2)+' &micro;s</span></div>').join('')+'<p class="small mute">Spread (3 trials, &micro;s): '+ent.map(([k,v])=>E(k.split(' (')[0])+' '+v.us.join(' / ')).join('; ')+'. The four context rows include entering and leaving the context manager on every call (that is most of their extra time, so do not read them as "no_grad makes ops slower"); the mode row includes the Python __torch_dispatch__ call, the price of every tracing tool built on modes. A real matmul in the running example takes tens to hundreds of microseconds, so this matters only for many tiny ops: the reason torch.compile and CUDA graphs exist (sibling page <a href="https://app.notion.com/p/3c65c17b0d0d8123a232d75bd7339ecb" target="_blank" rel="noopener noreferrer">torch.compile from the user\'s side</a>).</p>';})();
$('tda-howto-code').textContent=D.how.code;$('tda-howto-out').textContent=D.how.out;
})();
