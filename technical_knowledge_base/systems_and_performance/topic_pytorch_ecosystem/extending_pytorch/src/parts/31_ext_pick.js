// ---- Which extension point? A short decision tree ending in a recipe with this page's evidence ----
(function(){
  const E=window.EXT,esc=RD.esc,$=id=>document.getElementById(id),U=window.EXTU;
  const v=E.variants,tm=E.timing;
  const Q={
    start:{t:'What do you need to change?',o:[
      ['grad','The gradient of some code','a more stable or cheaper backward'],
      ['opaque','Run code PyTorch cannot see','C++, CUDA, Metal, Triton, Helion, another library'],
      ['repr','How a tensor is stored','int8, NF4, float8 weights; a tensor across devices'],
      ['watch','Observe or rewrite every operation in a region','count, log, trace without data'],
      ['device','Support a new kind of hardware','a chip PyTorch does not know']]},
    grad:{t:'Is the forward ordinary PyTorch code that torch.compile can trace?',o:[
      ['r_fn','Yes','plain tensor operations'],
      ['opaque','No','it calls a kernel or library: you need an operator first']]},
    opaque:{t:'What is the kernel written in?',o:[
      ['r_cpp','C++ or CUDA','compiled code, or a C++ library'],
      ['triton','Triton','@triton.jit kernels'],
      ['r_helion','Helion','hl.tile loops'],
      ['r_metal','Metal (Apple GPU)','torch.mps.compile_shader'],
      ['r_py','Python or NumPy','or any Python library']]},
    triton:{t:'Does it need to behave like an operator (subclasses, dispatch modes, export as one node)?',o:[
      ['r_rawtriton','No: I only want it inside torch.compile','call the @triton.jit kernel directly'],
      ['r_tritonop','Yes','register it with triton_op']]},
    repr:{t:'Is it a format that already exists?',o:[
      ['r_dtensor','Sharded or replicated across devices','DTensor'],
      ['r_torchao','int8, int4, NF4, float8, MX','torchao'],
      ['r_subclass','Something new','write a wrapper subclass']]},
    watch:{t:'At which level?',o:[
      ['r_mode','Every ATen operation, forward and backward','TorchDispatchMode, FakeTensorMode, FlopCounterMode'],
      ['r_fmode','The Python calls your code makes','TorchFunctionMode']]},
    device:{t:'',o:[]}
  };
  const R={
    r_fn:{h:'torch.autograd.Function',why:'Your forward is traceable, so you only need a different backward. No schema, fake or registration to maintain; torch.compile traces both functions.',
      code:'class StableOp(torch.autograd.Function):\n    @staticmethod\n    def forward(x):\n        return ...\n    @staticmethod\n    def setup_context(ctx, inputs, output):\n        ctx.save_for_backward(inputs[0])\n    @staticmethod\n    def backward(ctx, g):\n        (x,) = ctx.saved_tensors\n        return ...\ny = StableOp.apply(x)',
      reg:['forward, setup_context, backward (static methods)'],
      test:['torch.autograd.gradcheck in float64 (the sibling page shows it)','compiled gradients against eager on one batch'],
      ev:'Owned by the sibling page, Reading 3.4: {{Tensors, the dispatcher and autograd|n:3f85c17b0d0d81138595c1c6cd52f795}}.'},
    r_cpp:{h:'A C++ (or CUDA) operator: TORCH_LIBRARY, plus a fake and autograd from Python',why:'The dispatcher needs an operator to route to your kernel; the compiler needs a fake; training needs a formula. Register them at import.',
      code:'// C++\nTORCH_LIBRARY(mylib, m) { m.def("op(Tensor x) -> Tensor"); }\nTORCH_LIBRARY_IMPL(mylib, CPU, m) { m.impl("op", &op_cpu); }   // or CUDA\n\n# Python, right after loading the extension\ntorch.library.register_fake("mylib::op")(lambda x: torch.empty_like(x))\ntorch.library.register_autograd("mylib::op", backward, setup_context=setup_context)',
      reg:['schema in C++ (declare mutation as Tensor(a!))','kernel per device key','register_fake','register_autograd (backward made of operators)'],
      test:['torch.library.opcheck: all four tests','compiled gradients against eager on one batch','benchmark against the ATen op you replace'],
      ev:()=>'Measured here: the bare C++ op gave '+v.cpp_bare.graphs+' graphs and '+v.cpp_bare.breaks+' breaks, and '+v.cpp_bare.with_grad+' of 52 parameters trained; with its fake and formula registered at import, 1 graph and all four tests pass. Calling it costs '+tm.calls_cpu['small (64)']['TORCH_LIBRARY C++'].median_us.toFixed(2)+' &micro;s with a Python autograd kernel; the naive kernel was about 11 times slower than F.gelu. Reading sections 1 to 3.'},
    r_tritonop:{h:'torch.library.triton_op with wrap_triton',why:'It is a custom op whose implementation Inductor can see: the kernels are decomposed into the graph under AOTAutograd, so the compiler can optimise around them. Under export it stays one node.',
      code:'@torch.library.triton_op("mylib::add", mutates_args={})\ndef add(x: Tensor, y: Tensor) -> Tensor:\n    out = torch.empty_like(x)\n    wrap_triton(add_kernel)[grid](x, y, out, out.numel(), 16)\n    return out\nadd.register_autograd(backward, setup_context=setup_context)',
      reg:['the function (it doubles as the fake)','register_autograd if you train through it'],
      test:['opcheck','compiled against eager'],
      ev:'Not run here: Triton ships Linux wheels only. Source read at v2.14.1, Reading section 4.2.'},
    r_rawtriton:{h:'Call the @triton.jit kernel directly',why:'The triton_op docstring itself recommends this when you need no operator behaviour: Dynamo traces a raw Triton launch. Wrap it later if you need autograd through it, subclasses or export.',
      code:'@torch.compile\ndef f(x, y):\n    out = torch.empty_like(x)\n    add_kernel[grid](x, y, out, out.numel(), BLOCK=1024)\n    return out',
      reg:['nothing; for a gradient, an autograd.Function or triton_op'],test:['compiled against eager'],ev:'Not run here (no Triton on macOS). Reading section 4.2.'},
    r_helion:{h:'A Helion kernel (wrap it in a custom op for operator behaviour)',why:'Helion compiles tiled PyTorch to Triton (or Pallas, CuTe, Metal) and can autotune the tiling. Called inside torch.compile it does not break the graph; registering it as a device kernel of a custom op gives it a schema, a fake and autograd.',
      code:'@helion.kernel()\ndef gelu(x: torch.Tensor) -> torch.Tensor:\n    out = torch.empty_like(x)\n    for tile in hl.tile(x.size()):\n        v = x[tile]\n        out[tile] = 0.5 * v * (1.0 + torch.tanh(0.79788456 * (v + 0.044715 * v * v * v)))\n    return out\n\n@my_op.register_kernel("cuda")   # or "mps" with HELION_BACKEND=metal\ndef _(x): return gelu(x)',
      reg:['the kernel','for an operator: custom_op with register_fake and register_autograd'],test:['HELION_INTERPRET=1 (ref mode) to check the logic on a CPU','opcheck on the wrapping op'],
      ev:()=>'Measured here (metal backend, experimental): the tanh GELU ran and matched to '+U.fmt(E.helion.kernels.gelu.max_abs_err,'e')+'; exact erf and a row softmax did not lower; '+E.helion.op.direct_explain.graphs+' graph, '+E.helion.op.direct_explain.breaks+' breaks inside torch.compile; '+tm.calls_mps['Helion kernel (metal backend)'].median_us.toFixed(0)+' &micro;s untuned against '+tm.calls_mps['F.gelu (tanh)'].median_us.toFixed(0)+' &micro;s for F.gelu. Reading section 4.3.'},
    r_metal:{h:'A Metal kernel as the MPS kernel of a custom op',why:'torch.mps.compile_shader compiles Metal at run time; register_kernel("mps") puts it at the MPS key of an operator that keeps its CPU kernel.',
      code:'lib = torch.mps.compile_shader(SOURCE)\n\n@my_op.register_kernel("mps")\ndef _(x):\n    y = torch.empty_like(x)\n    lib.my_kernel(y, x.contiguous())\n    return y',
      reg:['custom_op with a CPU kernel','register_kernel("mps")','register_fake, register_autograd'],test:['opcheck on MPS inputs','compare the MPS kernel with the CPU one: opcheck does not'],
      ev:()=>'Measured here: same speed as F.gelu ('+tm.calls_mps['Metal shader via compile_shader'].median_us.toFixed(0)+' against '+tm.calls_mps['F.gelu (tanh)'].median_us.toFixed(0)+' &micro;s); Metal has no erf, so the MPS kernel differed from the CPU one by '+U.fmt(E.mps.max_diff_mps_vs_cpu,'e')+'. Reading sections 1.6 and 4.1.'},
    r_py:{h:'torch.library.custom_op around the Python function',why:'It makes the call one opaque node: no graph break, exportable, with the gradient you register. But first ask whether the code could be written in PyTorch: then it needs no hook at all and Inductor can fuse it.',
      code:'@torch.library.custom_op("mylib::op", mutates_args=())\ndef op(x: Tensor) -> Tensor:\n    return torch.from_numpy(f(x.numpy(force=True)))\n\n@op.register_fake\ndef _(x): return torch.empty_like(x)\n\nop.register_autograd(backward, setup_context=setup_context)',
      reg:['mutates_args (honestly)','register_fake (new_dynamic_size for data-dependent sizes)','register_autograd'],test:['opcheck: all four tests'],
      ev:()=>'Measured here: the direct call gave '+v.pybind.graphs+' graphs and '+v.pybind.breaks+' breaks and trained '+v.pybind.with_grad+' of 52 parameters; the full custom op, 1 graph, 52 of 52, all tests pass; '+tm.calls_cpu['small (64)']['custom_op (Python) around C++'].median_us.toFixed(2)+' &micro;s per call. Reading sections 1 and 2.'},
    r_dtensor:{h:'DTensor (do not write your own)',why:'It already implements sharding propagation for ATen operators, in C++ on the fast path, and FSDP2, tensor and sequence parallel are built on it.',
      code:'mesh = init_device_mesh("cuda", (8,))\ndt = distribute_tensor(w, mesh, [Shard(0)])\nout = dt @ distribute_tensor(x, mesh, [Replicate()])',
      reg:['nothing'],test:['CommDebugMode to count collectives'],ev:()=>'Taken apart here: inner tensors _local_tensor and device_mesh; mixing with a plain tensor raises. The {{Distributed PyTorch|n:3c65c17b0d0d815e85aff8decd8f35ab}} sibling owns it. Reading section 5.5.'},
    r_torchao:{h:'torchao\'s tensor subclasses',why:'quantize_(model, config) swaps weights for subclasses (Int8Tensor, NF4Tensor, Float8 training tensors) with the operators and compile support already written.',
      code:'from torchao.quantization import quantize_, Int8WeightOnlyConfig\nquantize_(model, Int8WeightOnlyConfig())',
      reg:['nothing'],test:['quality against float on your evaluation','time on your hardware'],ev:'Taken apart here (Reading 5.5); on this CPU the int8 path converts the weight to float before the multiply. {{Quantization and Precision|n:3c65c17b0d0d817b8f41ff66fba4cd0e}} owns the formats.'},
    r_subclass:{h:'A wrapper subclass with __torch_dispatch__ and __tensor_flatten__',why:'The model code stays unchanged; every ATen operator on the tensor reaches your Python; the flatten protocol lets torch.compile desugar it into plain operations.',
      code:'class MyTensor(torch.Tensor):\n    @staticmethod\n    def __new__(cls, a, b):\n        return torch.Tensor._make_wrapper_subclass(cls, shape, dtype=..., device=...)\n    def __tensor_flatten__(self): return ["a", "b"], meta\n    @staticmethod\n    def __tensor_unflatten__(inner, meta, size, stride): ...\n    __torch_function__ = torch._C._disabled_torch_function_impl\n    @classmethod\n    def __torch_dispatch__(cls, func, types, args=(), kwargs=None): ...',
      reg:['aten.detach returning the subclass (nn.Parameter needs it)','the operators your model calls (find them with a logging mode)','a fallback that dequantizes, or an error'],
      test:['loss and logits against float','torch.compile(fullgraph=True) on the model','count fallback calls'],
      ev:()=>'Measured here: an int8 weight subclass on the 16 block weights, '+(E.int8.bytes_float/1e6).toFixed(2)+' MB to '+(E.int8.bytes_int8/1e6).toFixed(2)+' MB, 4 ATen operators implemented, 1 graph under compile. Reading 5.1 (the call-by-call tracer), 5.3 and 5.4.'},
    r_mode:{h:'A TorchDispatchMode (or one PyTorch ships)',why:'It sees every ATen call inside the with block, forward and backward, whatever the tensors. FakeTensorMode runs without data; FlopCounterMode counts arithmetic.',
      code:'class Recorder(TorchDispatchMode):\n    def __torch_dispatch__(self, func, types, args=(), kwargs=None):\n        self.calls.append(str(func))\n        return func(*args, **(kwargs or {}))',
      reg:['nothing'],test:['compare with a known count (e.g. FLOPs = 6 x matmul weights x tokens)'],
      ev:()=>'Measured here: FlopCounterMode gave '+E.modes.flops_total.toLocaleString('en-US')+' FLOPs for one step, exactly 6 x 3,156,736 x 512; CPU attention counted zero. Reading section 6.'},
    r_fmode:{h:'A TorchFunctionMode',why:'It sees Python-level calls (linear, not t + addmm) above autograd; it does not see backward.',
      code:'class Calls(torch.overrides.TorchFunctionMode):\n    def __torch_function__(self, func, types, args=(), kwargs=None):\n        print(func)\n        return func(*args, **(kwargs or {}))',
      reg:['nothing'],test:['check it sees what you expect: backward is invisible'],ev:()=>'Measured here with a subclass at the same level: '+E.levels.function.nf+' forward calls, '+E.levels.function.nb+' in backward. Reading section 5.1.'},
    r_device:{h:'An out-of-tree backend on PrivateUse1',why:'The supported route for hardware PyTorch does not know: kernels at the PrivateUse1 key from a C++ extension, a renamed device, an allocator, streams and a compiler backend. torch_openreg in PyTorch\'s tests is the reference.',
      code:'torch.utils.rename_privateuse1_backend("mydev")\ntorch.utils.generate_methods_for_privateuse1_backend()\n# C++: TORCH_LIBRARY_IMPL(aten, PrivateUse1, m) { m.impl("add.Tensor", &my_add); ... }',
      reg:['ATen kernels at PrivateUse1','allocator, device guard, streams'],test:['PyTorch\'s own test suite against the device'],ev:'Not run here. Reading, Depth (closed block on PrivateUse1).'}
  };
  Q.device={t:'',o:[]};
  let trail=[];
  function render(){
    const cur=trail.length?trail[trail.length-1][0]:'start';
    $('ep-trail').innerHTML=trail.length?trail.map(t=>'<span>'+esc(t[1])+'</span>').join(''):'';
    const node=cur==='device'?null:Q[cur];
    if(cur==='device'||(R[cur])){const r=R[cur==='device'?'r_device':cur];const evx=typeof r.ev==='function'?r.ev():r.ev;
      const html='<div class="ep-res"><h3>'+esc(r.h)+'</h3><p>'+esc(r.why)+'</p><div class="ep-lab">Skeleton</div><div class="ep-code">'+esc(r.code)+'</div>'+
        '<div class="ep-lab">Register</div><ul>'+r.reg.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><div class="ep-lab">Test</div><ul>'+r.test.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>'+
        '<div class="ep-lab">Evidence</div><p class="small">'+links(evx)+'</p></div>';
      $('ep-body').innerHTML=html;return}
    $('ep-body').innerHTML='<div class="ep-q"><div class="t">'+esc(node.t)+'</div><div class="ep-opts">'+node.o.map(o=>'<button data-n="'+o[0]+'">'+esc(o[1])+'<span>'+esc(o[2])+'</span></button>').join('')+'</div></div>';
  }
  // {{text|n:id}} and {{text|#t-tab}} inside evidence strings
  function links(s){return s.replace(/\{\{([^|{}]+)\|([^{}]+)\}\}/g,(m,t,u)=>u.startsWith('#')?'<a href="#" data-tab="'+u.slice(1)+'">'+t+'</a>':'<a href="https://app.notion.com/p/'+u.replace('n:','')+'" target="_blank" rel="noopener noreferrer">'+t+'</a>')}
  $('ep-body').addEventListener('click',e=>{const b=e.target.closest('button[data-n]');if(!b)return;trail.push([b.dataset.n,b.firstChild.textContent]);render()});
  RD.tabLinks($('ep-body'));
  $('ep-back').addEventListener('click',()=>{trail.pop();render()});
  $('ep-reset').addEventListener('click',()=>{trail=[];render()});
  render();
})();
