// ---- Custom-op lab tab: ten registrations of the same C++ GELU, compared side by side ----
(function(){
  const E=window.EXT,esc=RD.esc,$=id=>document.getElementById(id),L=window.EXTL,U=window.EXTU;
  const ORDER=['native','pybind','kernel_only','kernel_fake','full','undeclared_mutation','wrong_fake','cpp_bare','cpp_late','cpp_full'];
  const SHORT={native:'F.gelu',pybind:'direct call',kernel_only:'kernel only',kernel_fake:'+ fake',full:'+ fake + autograd',undeclared_mutation:'undeclared mutation',wrong_fake:'wrong fake',cpp_bare:'C++ bare',cpp_late:'C++ late',cpp_full:'C++ at import'};
  // what each variant registers: kernel, fake, autograd, schema honest
  const REG={native:[1,1,1,1],pybind:[0,0,0,1],kernel_only:[1,0,0,1],kernel_fake:[1,1,0,1],full:[1,1,1,1],undeclared_mutation:[1,1,1,0],wrong_fake:[1,2,1,1],cpp_bare:[1,0,0,1],cpp_late:[1,1,1,1],cpp_full:[1,1,1,1]};
  const CODE={
    native:'self.proj(F.gelu(self.fc(x)))      # ATen\'s own GELU',
    pybind:'mod = load_inline(..., functions=["raw_gelu", ...])\nself.proj(mod.raw_gelu(self.fc(x)))  # no dispatcher',
    kernel_only:'@torch.library.custom_op("ext::gelu_k", mutates_args=())\ndef gelu_k(x: Tensor) -> Tensor:\n    return mod.raw_gelu(x)',
    kernel_fake:'@torch.library.custom_op("ext::gelu_kf", mutates_args=())\ndef gelu_kf(x: Tensor) -> Tensor:\n    return mod.raw_gelu(x)\n\n@gelu_kf.register_fake\ndef _(x): return torch.empty_like(x)',
    full:'@torch.library.custom_op("ext::gelu", mutates_args=())\ndef gelu(x: Tensor) -> Tensor:\n    return mod.raw_gelu(x)\n\n@gelu.register_fake\ndef _(x): return torch.empty_like(x)\n\ngelu.register_autograd(backward, setup_context=setup_context)\n# backward calls ext::gelu_bwd, itself a custom op with a fake',
    undeclared_mutation:'@torch.library.custom_op("ext::gelu_mut", mutates_args=())   # says: mutates nothing\ndef gelu_mut(x: Tensor) -> Tensor:\n    x.clamp_(-3.0, 3.0)        # ...but writes into x\n    return mod.raw_gelu(x)\n# + fake + autograd as in "full"',
    wrong_fake:'@gelu_badfake.register_fake\ndef _(x):\n    return x.new_empty(x.shape[:-1])   # drops the last dimension\n# kernel and autograd as in "full"',
    cpp_bare:'TORCH_LIBRARY(extc, m) { m.def("gelu(Tensor x) -> Tensor"); ... }\nTORCH_LIBRARY_IMPL(extc, CPU, m) { m.impl("gelu", &gelu_fwd); ... }\n# nothing registered from Python\nself.proj(torch.ops.extc.gelu(self.fc(x)))',
    cpp_late:'# same process: extc::gelu traced bare first (cpp_bare), then:\ntorch.library.register_fake("extc::gelu")(lambda x: torch.empty_like(x))\ntorch.library.register_autograd("extc::gelu", backward, setup_context=...)',
    cpp_full:'# fresh process, right after load_inline:\ntorch.library.register_fake("extc::gelu")(lambda x: torch.empty_like(x))\ntorch.library.register_fake("extc::gelu_backward")(...)\ntorch.library.register_autograd("extc::gelu", backward, setup_context=...)'};
  const VERD={native:['var(--good)','The reference: one graph, every parameter trains, Inductor fuses the GELU.'],
    pybind:['var(--bad)','Silent damage: eager training runs with the right loss, but each block\'s fc layer and the norm before it (16 parameters) never get a gradient; compile breaks the graph; export fails.'],
    kernel_only:['var(--bad)','Loud: backward raises, compile cannot trace the op. Nothing silent.'],
    kernel_fake:['var(--c5)','Inference works and compiles into one graph; training still raises at backward.'],
    full:['var(--good)','Complete: one graph, gradients match eager, all four tests pass.'],
    undeclared_mutation:['var(--bad)','Everything looks fine in the model; only opcheck\'s schema test sees the lie. A compiler that trusts the schema may reorder or reuse the input.'],
    wrong_fake:['var(--bad)','Eager is fine; compile fails one layer later with an error about the next op; test_faketensor names the real culprit.'],
    cpp_bare:['var(--bad)','Like the direct call: the autograd fallback only warns, gradients upstream are lost; compile graph-breaks.'],
    cpp_late:['var(--bad)','Silent under compile: the compiled backward drops 16 of 52 parameter gradients. Register at import.'],
    cpp_full:['var(--good)','Complete, the C++ route: same results as the Python custom op.']};
  let A='pybind',B='full';
  function chips(el,cur,f){el.innerHTML=ORDER.map(k=>'<button data-k="'+k+'"'+(k===cur?' class="on"':'')+'>'+esc(SHORT[k])+'</button>').join('');
    el.onclick=e=>{const b=e.target.closest('button');if(!b)return;f(b.dataset.k)}}
  function graphsStrip(k,v){
    const g=E.graphs[k==='full'?'custom_op':k];
    if(g)return '<div class="eo-g">'+g.graphs.map((ops,i)=>'<span title="'+esc(ops.join(', '))+'">graph '+(i+1)+': '+ops.length+' ops</span>').join('')+(g.bc?'<span class="br">'+g.bc+' breaks</span>':'')+'</div>';
    if(v.graphs==null)return '';
    return '<div class="eo-g">'+Array.from({length:v.graphs},(x,i)=>'<span>graph '+(i+1)+'</span>').join('')+(v.breaks?'<span class="br">'+v.breaks+' breaks</span>':'')+'</div>'}
  function col(k){const v=E.variants[k],r=REG[k];
    const reg=['kernel','fake','autograd','schema honest'].map((n,i)=>'<span class="'+(r[i]===1?'y':'n')+'">'+(r[i]===2?'fake (wrong)':n)+'</span>').join('');
    const row=(a,b)=>'<div class="eo-row"><div class="k">'+a+'</div><div>'+b+'</div></div>';
    const eag=row('Loss',v.loss==null?'?':v.loss.toFixed(6)+(Math.abs(v.loss-E.ref_loss)<1e-5?' <span class="ok">(= F.gelu)</span>':''))+
      row('Parameters with gradients',v.with_grad==null?'<span class="bad">none: backward raised</span>':(v.with_grad===52?'<span class="ok">52 of 52</span>':'<span class="bad">'+v.with_grad+' of 52</span>'))+
      (v.grad_diff!=null?row('Max gradient difference',U.fmt(v.grad_diff,'e')):'')+
      (v.eager_err?'<div class="eo-err">'+esc(v.eager_err)+'</div>':'')+(v.warn&&v.warn.length?'<div class="eo-err">warning: '+esc(v.warn[0])+'</div>':'');
    const dyn=v.graphs==null?'<div class="eo-err">'+esc(v.explain_err||'')+'</div>':row('Graphs, breaks',v.graphs+', '+v.breaks)+graphsStrip(k,v)+(v.reason?'<div class="eo-err">'+esc(v.reason)+'</div>':'')+(v.custom_nodes&&v.custom_nodes.length?row('Op in the graph','<code>'+esc(v.custom_nodes[0])+'</code>'):'');
    const cmp=v.comp_ok?(v.comp_grad_diff>1e-3?'<span class="bad">trains, wrong gradients</span> (max difference '+v.comp_grad_diff.toFixed(3)+')':'<span class="ok">trains; gradients match eager</span> ('+U.fmt(v.comp_grad_diff,'e')+')'):'<span class="bad">fails</span><div class="eo-err">'+esc(v.comp_err||'')+'</div>';
    const T=['test_schema','test_autograd_registration','test_faketensor','test_aot_dispatch_dynamic'];
    const tests=Object.keys(v.opcheck).length?'<div class="eo-tests">'+T.map(t=>{const o=v.opcheck[t];return '<div class="'+(o.ok?'':'f')+'" title="'+esc(o.msg||'passed')+'"><b>'+t.replace('test_','')+'</b><br>'+(o.ok?'<span class="ok">pass</span>':'<span class="bad">fail</span>')+'</div>'}).join('')+'</div>'+T.filter(t=>!v.opcheck[t].ok).map(t=>'<div class="eo-err">'+t+': '+esc(v.opcheck[t].msg)+'</div>').join(''):'<div class="small mute">Not an operator: opcheck does not apply.</div>';
    return '<h3 style="margin:0 0 4px">'+esc(L[k])+'</h3><div class="eo-reg">'+reg+'</div>'+
      '<div class="eo-lab">Code</div><div class="eo-code">'+esc(CODE[k])+'</div>'+
      '<div class="eo-lab">Eager: one forward and backward</div>'+eag+
      '<div class="eo-lab">Dynamo (torch._dynamo.explain) on the forward</div>'+dyn+
      '<div class="eo-lab">torch.compile(fullgraph=True), forward and backward</div><div style="font-size:13px">'+cmp+'</div>'+
      '<div class="eo-lab">opcheck</div>'+tests+
      '<div class="eo-verdict" style="--sc:'+VERD[k][0]+'">'+VERD[k][1]+'</div>'}
  function draw(){chips($('eo-pick-a'),A,k=>{A=k;draw()});chips($('eo-pick-b'),B,k=>{B=k;draw()});$('eo-cols').innerHTML='<div>'+col(A)+'</div><div>'+col(B)+'</div>'}
  draw();
})();
