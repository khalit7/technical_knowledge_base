// ---- Reading section 2 (the dispatcher): key ladder, the walk stepper, slot statistics (SVG), plus the depth blocks ----
(function(){
const D=window.TDA, S=D.dsp, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
const yurl=(f,b)=>'https://github.com/pytorch/pytorch/blob/v2.14.1/'+f+'#L'+b.line+'-L'+b.end;
const yq=(f,k,b)=>'<div class="tda-q"><div class="cap">'+E(k)+' <a href="'+yurl(f,b)+'" target="_blank" rel="noopener noreferrer">'+f.split('/').pop()+' L'+b.line+'&ndash;'+b.end+' @ v2.14.1</a></div><pre>'+E(b.text)+'</pre></div>';
$('tda-nf').innerHTML=['add_.Tensor','view','linear','mm'].map(k=>yq('aten/src/ATen/native/native_functions.yaml',k,S.native_functions[k])).join('');
$('tda-dv').innerHTML='<div class="rd-two"><div>'+yq('tools/autograd/derivatives.yaml','mm',S.derivatives.mm)+'</div><div>'+yq('tools/autograd/derivatives.yaml','gelu',S.derivatives.gelu)+'</div></div><p class="small">Each line says how to turn the gradient of the output (<code>grad</code>) into the gradient of one input, and which inputs it needs: that list is exactly what ends up as a node\'s saved tensors in section 3.</p>';
const tx=(x,y,s,c,a)=>'<text x="'+x+'" y="'+y+'"'+(a?' text-anchor="'+a+'"':'')+(c?' class="'+c+'"':'')+'>'+s+'</text>';

// 2.1 ladder (static SVG)
(function(){const el=$('tda-ladder'), kv=S.key_values;
  const show=[['PythonDispatcher','debug the dispatcher from Python',0],['PreDispatch','pre-dispatch tracing (torch.export)',0],['FuncTorchDynamicLayerFrontMode','functorch transforms (vmap, grad) enter here',0],['PythonTLSSnapshot','snapshot the Python mode stack first',0],['AutocastCUDA','autocast for CUDA tensors',0],['AutocastMPS','autocast for MPS tensors',0],['AutocastCPU','autocast for CPU tensors',1],['AutogradFunctionality','AutogradCPU, MPS, CUDA: record graph nodes',1],['ADInplaceOrView','view bookkeeping and version counters',1],['ZeroTensor','efficient zero tensors (forward AD)',0],['Negative','lazy negation views',0],['Conjugate','lazy conjugation views (x.conj())',0],['Functionalize','rewrite mutations as pure ops (compilers)',2],['Python','tensor subclasses, TorchDispatchMode, FakeTensor',2],['BackendSelect','pick a backend for factory functions',0],['Dense','the arithmetic: CPU, MPS, CUDA, Meta kernels',1]];
  function draw(){const W=RD.width(el), two=W<620, rh=two?36:22, nx=30, dx=two?nx:Math.min(nx+250,W*0.42);let s='';
    show.forEach(([k,d,h],i)=>{const y=i*rh+2;
      s+='<rect x="0" y="'+y+'" width="'+W+'" height="'+(rh-3)+'" rx="5" fill="'+(h===1?'var(--acc2)':h===2?'var(--soft)':'var(--bg)')+'" stroke="'+(h===1?'var(--acc)':'var(--line)')+'"/>';
      s+=tx(8,y+15,kv[k],'mono b')+tx(nx,y+15,k,'mono'+(h?' b':''));
      s+=tx(dx,two?y+30:y+15,E(d),'m')});
    el.innerHTML=RD.svg(W,show.length*rh+4,s,'Dispatch keys in priority order with their enum numbers')}
  RD.onRender(draw);RD.onResize(draw);draw();})();

// 2.2 tensor keys and the thread sets (tables, closed block)
$('tda-tkeys').innerHTML=U.table(['tensor','dispatch keys (torch._C._dispatch_keys)'],Object.entries(S.tensor_keys).map(([k,v])=>[E(k),'<code>'+v.join(', ')+'</code>']));
(function(){const order=[['default','default'],['no_grad','with torch.no_grad()'],['inference_mode','with torch.inference_mode()'],['autocast_cpu_bf16','with torch.autocast("cpu", dtype=torch.bfloat16)'],['inside a TorchDispatchMode (read in user code)','inside a TorchDispatchMode']];
  const short=l=>l.filter(k=>!/Autocast(MTIA|MAIA|XPU|IPU|HPU|XLA|PrivateUse1|CUDA)|TESTING/.test(k)).join(', ');
  $('tda-ctx').innerHTML=U.table(['context','included set','excluded set (other devices\' Autocast keys omitted)','effective keys for a plain CPU tensor'],order.map(([k,l])=>{const c=S.tls[k];return ['<code>'+E(l)+'</code>','<span class="small">'+short(c.include)+'</span>','<span class="small">'+short(c.exclude)+'</span>','<b class="small">'+c.effective_cpu.join(', ')+'</b>']}))+
   '<p class="small mute">Measured with torch._C._dispatch_tls_local_include_set / exclude_set, and the effective set computed from the raw bit sets the way DispatchKeyExtractor.h L46 does. Printing collapses "every autograd key" to the names AutogradOther and AutogradNestedTensor; the effective column shows that AutogradCPU is gone under inference_mode.</p>';})();

// 2.2 the walk: two recorded situations side by side (SVG stepper)
(function(){const W=S.walk, el=$('tda-w-svg');
  const job={AutocastCPU:'casts the input to bfloat16, then calls the op again with AutocastCPU excluded',AutogradCPU:'records a node if grad mode is on and an input requires grad, then redispatches with the autograd keys masked off',ADInplaceOrView:'view and in-place bookkeeping (nothing to do for this op), then redispatches below','Python (TorchDispatchMode)':'hands the call to the active mode\'s __torch_dispatch__, which logs it and calls the op again',CPU:'does the arithmetic, x * 2',Meta:'computes the output shape only'};
  function why(w,k){const nm=w.name;
    if(k==='AutocastCPU')return nm.includes('autocast')?'':'excluded: autocast off';
    if(k==='AutogradCPU'){if(nm.includes('inference_mode'))return 'excluded: inference_mode';if(nm.includes('inference tensor'))return 'not in the key set';if(nm.includes('meta'))return 'AutogradMeta ran instead';return ''}
    if(k.startsWith('Python'))return 'not in the key set';
    if(k==='CPU')return nm.includes('meta')?'not in the key set':'';
    if(k==='Meta')return nm.includes('meta')?'':'not in the key set';return ''}
  const why2={'excluded: autocast off':'every Autocast key is in the excluded set unless autocast is on','excluded: inference_mode':'inference_mode adds every autograd key to the excluded set','not in the key set':'neither the tensors nor the thread put it in the key set','AutogradMeta ran instead':'a meta tensor carries AutogradMeta; the boxed autograd fallback ran there, invisible to this log'};
  const rowsFor=w=>['AutocastCPU','AutogradCPU','ADInplaceOrView','Python (TorchDispatchMode)',w.name.includes('meta')?'Meta':'CPU'];
  const sa=$('tda-w-a'), sb=$('tda-w-b');
  [sa,sb].forEach((s,j)=>{s.innerHTML=W.map((w,i)=>'<option value="'+i+'">'+E(w.name)+'</option>').join('');s.value=j?3:1});
  function col(w,k,x,y,cw){let s=tx(x,y+12,E(w.code.length*6.6<cw?w.code:w.name),'mono b');const rows=rowsFor(w);
    rows.forEach((key,i)=>{const vi=w.visits.findIndex(v=>v.key===key), yy=y+22+i*30, r=why(w,key);
      const cur=vi>=0&&vi===k-1, done=vi>=0&&vi<k-1, skip=vi<0;
      s+='<rect x="'+x+'" y="'+yy+'" width="'+cw+'" height="25" rx="5" fill="'+(cur?'var(--acc)':done?'var(--acc2)':'var(--bg)')+'" stroke="'+(cur||done?'var(--acc)':'var(--line)')+'"'+(skip?' stroke-dasharray="4 3"':'')+'/>';
      const nm=key.replace(' (TorchDispatchMode)','');
      s+='<text x="'+(x+8)+'" y="'+(yy+17)+'" class="mono'+(cur?' on b':'')+'"'+(skip?' style="text-decoration:line-through;opacity:.55"':'')+'>'+nm+'</text>';
      const st=skip?r||'not reached':cur||done?'ran #'+(vi+1)+', '+(w.visits[vi].dtype==='bfloat16'?'bf16':w.visits[vi].dtype==='float32'?'f32':w.visits[vi].dtype):'step '+(vi+1);
      s+=tx(x+cw-8,yy+17,E(st),cur?'on':'m','end')});
    const done=k>=w.visits.length;
    s+=tx(x,y+22+rows.length*30+14,done?'result '+w.result.dtype+' on '+w.result.device+', '+w.visits.length+' kernels ran':' ','m');
    return s}
  function draw(k){const a=W[+sa.value], b=W[+sb.value], Wd=RD.width(el), side=Wd>=600, gap=16;let s='',H;
    if(side){const cw=(Wd-gap)/2;s=col(a,k,0,0,cw)+col(b,k,cw+gap,0,cw);H=22+5*30+24}
    else{s=col(a,k,0,0,Wd)+col(b,k,0,22+5*30+30,Wd);H=2*(22+5*30+30)}
    el.innerHTML=RD.svg(Wd,H,s,'Kernels run for the same op in two situations');
    const line=(w,side)=>{if(k===0){const v=w.visits;return '<p><b>'+side+'</b> ('+E(w.name)+'): '+v.length+' kernels will run, in this order: '+v.map(z=>z.key.replace(' (TorchDispatchMode)','')).join(', ')+'. '+rowsFor(w).filter(key=>w.visits.findIndex(v=>v.key===key)<0).map(key=>key.replace(' (TorchDispatchMode)','')+' is skipped: '+(why2[why(w,key)]||why(w,key))).join('; ')+'.</p>'}
      const x=w.visits[k-1];if(!x)return '<p><b>'+side+'</b>: done.</p>';
      return '<p><b>'+side+': '+E(x.key.replace(' (TorchDispatchMode)',''))+'</b> '+(job[x.key]||'')+'. Handed key set ['+(x.keyset?x.keyset.join(', '):'called by the Python fallback')+'], input '+x.dtype+', grad mode '+(x.grad_mode?'on':'off')+'.</p>'};
    $('tda-w-cap').innerHTML='<div class="t">'+(k===0?'Step 0: the key sets':'Kernel '+k)+'</div>'+line(a,'Left')+line(b,'Right')}
  const steps=()=>Math.max(W[+sa.value].visits.length,W[+sb.value].visits.length)+1;
  const an=RD.anim({card:'tda-w-card',ctl:'tda-w-ctl',n:steps(),draw,ms:1300,label:'Kernel'});
  [sa,sb].forEach(s=>s.addEventListener('change',()=>an.reset(steps())));
  RD.onResize(()=>an.redraw());})();

// 2.3 per-op tables (closed block)
(function(){const ops=['aten::mm','aten::linear','aten::view','aten::add_.Tensor','aten::gelu','aten::scaled_dot_product_attention','aten::_scaled_dot_product_flash_attention_for_cpu'];
  const keys=['AutocastCPU','AutogradCPU','ADInplaceOrView','Functionalize','Python','CPU','MPS','Meta'];
  const seg=$('tda-tblseg');seg.innerHTML=ops.map((o,i)=>'<button data-m="'+o+'"'+(i===0?' class="on"':'')+'>'+o.replace('aten::','')+'</button>').join('');
  function draw(o){const t=S.tables[o];$('tda-tbl').innerHTML=U.table(['key (priority order)','slot','registered in'],keys.map(k=>{const r=t[k];return [ '<code>'+k+'</code>',r?'<b>'+r.kind+'</b>':'<span class="mute">empty: not supported</span>',r?'<span class="small mute">'+E(r.file)+'</span>':'']}))+'<p class="small mute">torch._C._dispatch_dump_table("'+o+'"), file names only. "empty" means calling it with that key errors out.</p>'}
  RD.seg(seg,draw);draw(ops[0]);})();

// 2.3 slot statistics over every aten operator (SVG stacked bars)
(function(){const el=$('tda-opstat'), st=S.op_stats.by_key, n=S.op_stats.aten_ops;
  const kinds=[['kernel','var(--c1)','own kernel'],['default backend kernel','var(--c6)','CompositeExplicitAutograd'],['math kernel','var(--c4)','math kernel (decomposes)'],['autograd kernel','var(--c3)','autograd kernel'],['backend fallback','var(--c5)','boxed fallback'],['fallthrough','var(--dim)','fallthrough'],['none','var(--bad)','empty']];
  const keys=['AutocastCPU','AutogradCPU','ADInplaceOrView','Functionalize','Python','CPU','MPS','Meta'];
  $('tda-opstat-leg').innerHTML=kinds.map(([k,c,l])=>'<span style="--sw:'+c+'">'+l+'</span>').join('');
  function draw(){const W=RD.width(el), lw=W<460?118:132, bw=W-lw-4, rh=26;let s='';
    keys.forEach((k,i)=>{const y=i*rh;let x=lw;s+=tx(lw-8,y+16,k,'mono','end');
      kinds.forEach(([kk,c,l])=>{const v=st[k][kk];if(!v)return;const w=bw*v/n;
        s+='<rect x="'+x+'" y="'+(y+2)+'" width="'+Math.max(0,w-1)+'" height="'+(rh-6)+'" fill="'+c+'"><title>'+k+', '+l+': '+v+'</title></rect>';
        if(w>U.fmt(v).length*6.6+6)s+=tx(x+w/2,y+17,U.fmt(v),'b','middle');x+=w})});
    el.innerHTML=RD.svg(W,keys.length*rh+2,s,'Slot kinds per dispatch key over all aten operators')}
  RD.onRender(draw);RD.onResize(draw);draw();})();

// 2.4 autocast (closed block)
(function(){const a=S.autocast_model['cpu bfloat16'], f32=S.autocast_model['cpu float32 (no autocast)'];
  const rows=Object.entries(a.per_op).map(([op,d])=>[ '<code>'+op+'</code>',Object.entries(d).map(([t,n])=>'<b>'+n+'</b> &times; '+t).join(', ')]);
  $('tda-ac').innerHTML=U.table(['aten op (output dtype)','calls'],rows);
  const m=S.autocast_model['mps bfloat16'], m16=S.autocast_model['mps float16'];
  $('tda-ac-sum').innerHTML='Calls: '+a.calls+' with autocast against '+f32.calls+' without, of which '+a.casts+' are <code>_to_copy</code> casts (every weight and bias is cast again on every forward). Logits come out '+a.logits_dtype+', the loss '+a.loss_dtype+'. On MPS: bfloat16 loss '+m.loss.toFixed(6)+', float16 '+m16.loss.toFixed(6)+', with '+m.casts+' casts in '+m.calls+' calls; on MPS <code>_log_softmax</code> ran in the autocast dtype, on the CPU in float32 (each device has its own autocast list).';})();
// 2.5 functionalisation graphs (closed block)
(function(){const f=S.functionalize;$('tda-fn-src').textContent=f.source;$('tda-fn-a').textContent=f.plain;$('tda-fn-b').textContent=f.functionalized;$('tda-fn-c').textContent=f.functionalized_remove;})();
// 2.6 overhead bars, how-to output (closed block)
(function(){const t=D.tim&&D.tim.call_overhead;if(!t)return;
  const ent=Object.entries(t), mx=Math.max(...ent.map(([,v])=>v.median_us));
  $('tda-ovh').innerHTML=ent.map(([k,v])=>'<div class="row"><span class="nm">'+E(k)+'</span><div class="track"><div class="fill" style="width:'+(100*v.median_us/mx)+'%;background:var(--c1)"></div></div><span class="val">'+v.median_us.toFixed(2)+' &micro;s</span></div>').join('')+'<p class="small mute">Measured on Apple M1 Pro, CPU, load average '+D.tim.load_before[0].toFixed(1)+' at start. Spread (3 trials, &micro;s): '+ent.map(([k,v])=>E(k.split(' (')[0])+' '+v.us.join(' / ')).join('; ')+'.</p>';})();
$('tda-howto-code').textContent=D.how.code;$('tda-howto-out').textContent=D.how.out;

// 2.6 real aten calls in four contexts (moved from the old Dispatcher walker tab)
(function(){const A=S.aten_calls, calls=[...new Set(A.map(a=>a.call))], ctxs=[...new Set(A.map(a=>a.ctx))];
  const ctxTls={'training':'default','no_grad':'no_grad','inference_mode':'inference_mode','autocast bf16':'autocast_cpu_bf16'};
  const opOf={'torch.mm(x, w)':'aten::mm','F.linear(x, lin.weight, lin.bias)':'aten::linear','x.view(2048)':'aten::view','w2 = w.clone(); w2.add_(1)':'aten::add_.Tensor'};
  const ca=$('tda-da-call'), cx=$('tda-da-ctx');ca.innerHTML=calls.map(c=>'<option>'+E(c)+'</option>').join('');cx.innerHTML=ctxs.map(c=>'<option>'+E(c)+'</option>').join('');
  const prio=['AutocastCPU','AutogradCPU','ADInplaceOrView','Python','BackendSelect','CPU'];
  function drawB(){const r=A.find(a=>a.call===ca.value&&a.ctx===cx.value);if(!r)return;const op=opOf[r.call], tb=S.tables[op], tl=S.tls[ctxTls[r.ctx]];
    const srcKeys=r.ctx==='inference_mode'&&r.call.startsWith('w2')?['CPU','AutocastCPU']:['CPU','ADInplaceOrView','AutogradCPU','AutocastCPU'];
    const eff=prio.filter(k=>(srcKeys.includes(k)||tl.include.includes(k))&&!(tl.exclude.includes(k)||(k==='AutogradCPU'&&!tl.effective_cpu.includes('AutogradCPU'))));
    const route=eff.map(k=>{const slot=tb[k];const kind=slot?slot.kind:'empty';return '<div class="tda-hop'+(kind==='fallthrough'?' off skip':'')+'" style="--sc:var(--c'+(1+prio.indexOf(k))+')"><b>'+k+'</b><span>'+kind+(slot?' ('+E(slot.file)+')':'')+'</span></div>'}).join('');
    $('tda-da-out').innerHTML='<div class="rd-two"><div><div class="tda-lbl">Route, reconstructed: effective keys in priority order and the slot each has in '+op+'\'s table</div><div class="tda-hops">'+route+'</div><p class="small mute">The first non-fallthrough slot runs; a math kernel or an autograd kernel calls further ops, which start their own walk below it.</p></div>'+
     '<div><div class="tda-lbl">Seen at the top (TorchFunctionMode, before the dispatcher)</div><div class="tda-ops">'+r.top.map(t=>'<span>'+E(t)+'</span>').join('')+'</div>'+
     '<div class="tda-lbl">Seen at the Python key (TorchDispatchMode, below autograd)</div><div class="tda-ops">'+r.bottom.map(b=>'<span'+(b.out_dtype==='bfloat16'?' class="bf"':'')+'>'+E(b.op)+' &rarr; '+(b.out_dtype||'')+'</span>').join('')+'</div>'+
     U.table(['result',''],[['dtype',r.out_dtype],['grad_fn',r.grad_fn||'None'],['keys',r.out_keys.join(', ')],['inference tensor',r.is_inference]])+'</div></div>';}
  [ca,cx].forEach(s=>s.addEventListener('change',drawB));drawB();})();
})();
