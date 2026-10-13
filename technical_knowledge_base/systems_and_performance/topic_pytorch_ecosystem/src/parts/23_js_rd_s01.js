// ---- Reading tab, sections 0 and 1: the stack animation (eager against compiled) and the strides explorer ----
(function(){
  const D=window.RDD,E=RD.esc,fmt=n=>Number(n).toLocaleString('en-US');
  // ---------- section 0: one forward down the stack ----------
  const LAY=[['Your code','model(x, y) in your training script','var(--c1)'],
    ['PyTorch Python API','nn.Module.__call__, GPT.forward, torch.* functions','var(--c2)'],
    ['TorchDynamo and compiled code','captures Python into a graph; runs the generated code','var(--c4)'],
    ['Dispatcher','picks a kernel per call from the dispatch keys','var(--c3)'],
    ['Kernels','ATen CPU and MPS kernels, BLAS, generated C++ or Triton','var(--c5)']];
  const ST={
    eager:[
      {on:[0],t:'Your code calls the model',p:'<code>logits, loss = model(x, y)</code> with x a batch of 8 windows of 64 character ids. Nothing is compiled: PyTorch runs the Python as written.',c:[0,0,0,'0']},
      {on:[1],t:'Python runs the forward, line by line',p:'Embeddings, 4 blocks (LayerNorm, attention, MLP), the final norm, the tied output layer and the loss. Every line calls a torch function.',c:[0,0,0,'0']},
      {on:[3],t:'Each call goes through the dispatcher',p:'The inputs carry the keys CPU, ADInplaceOrView, AutogradCPU and AutocastCPU; each call walks them (section 2). One forward makes 142 such calls.',c:[142,0,0,'0']},
      {on:[3],t:'The autograd key records the graph',p:'For every call that needs a gradient, the autograd kernel adds a node and keeps tensors for backward: 135 nodes and 34.76 MB of saved activations after one forward (section 3).',c:[142,135,0,'0']},
      {on:[4],t:'A kernel does the arithmetic, one call at a time',p:'Matrix multiplies go to the BLAS library, attention to a CPU flash kernel, and each small element-wise operation reads its input from memory and writes its output back.',c:[142,135,142,'0']},
      {on:[0,1,3,4],t:'Eager: 142 calls, each paying its own overhead',p:'Simple, debuggable, and every call costs Python and dispatch time plus a memory round trip. Forward 6.52 ms on the CPU.',c:[142,135,142,'0']}],
    comp:[
      {on:[0],t:'Your code calls the compiled model',p:'The same <code>model(x, y)</code>, after <code>model = torch.compile(model)</code>. The model code did not change.',c:[0,0,0,'0']},
      {on:[2],t:'Dynamo intercepts the call and checks its guards',p:'Before any Python runs, Dynamo checks the 549 conditions the compiled code assumed (dtypes, shapes, which module, grad mode): 45 to 81 microseconds.',c:[0,0,0,'549']},
      {on:[1,2,3],t:'First call only: trace, then compile',p:'Dynamo reads the bytecode into 1 graph of 59 operations; AOTAutograd derives the forward and backward graphs; Inductor fuses and writes C++. 9.0 to 10.0 s with an empty cache, about 1 s with a warm one.',c:[0,0,0,'549']},
      {on:[2,4],t:'Every later call: the generated code runs',p:'35 launches instead of 142 calls: 14 generated C++ kernels (fused element-wise work and reductions), 17 BLAS matrix multiplies, 4 attention calls. The fused kernels read each activation once.',c:[35,1,35,'549']},
      {on:[2,3],t:'Autograd sees one node for the whole graph',p:'The compiled forward appears to autograd as a single <code>CompiledFunctionBackward</code> node; backward runs the precompiled backward graph, 60 launches instead of 295 calls.',c:[35,1,35,'549']},
      {on:[0,2,4],t:'Compiled: fewer, bigger steps',p:'142 calls became 35 launches. On this CPU the step is no faster (23.20 against 22.75 ms) because matrix multiplies dominate and stay BLAS calls; on the Apple GPU the step is 1.18 times faster (section 5).',c:[35,1,35,'549']}]};
  const stk=document.getElementById('rd-stk');if(!stk)return;
  let mode='eager';
  stk.innerHTML=LAY.map((l,i)=>'<div style="--sc:'+l[2]+'" data-i="'+i+'"><b>'+l[0]+'</b><span>'+l[1]+'</span></div>').join('');
  const rows=[...stk.children],cap=document.getElementById('rd-stk-cap'),cnt=document.getElementById('rd-stk-cnt');
  function draw(i){const s=ST[mode][i];
    rows.forEach((r,k)=>{r.classList.toggle('on',s.on.includes(k));r.classList.toggle('off',mode==='eager'&&k===2)});
    cap.innerHTML='<div class="t">'+(i+1)+' / '+ST[mode].length+'. '+s.t+'</div><p>'+s.p+'</p>';
    const c=s.c;cnt.innerHTML=RD.stat(mode==='eager'?'Calls through the dispatcher':'Launches per forward',fmt(c[0]),mode==='eager'?'ATen operator calls':'after compiling')+
      RD.stat('Autograd nodes added',fmt(c[1]),mode==='eager'?'one per differentiable call':'one for the whole graph')+
      RD.stat('Kernel runs',fmt(c[2]),'')+RD.stat('Guards checked per call',c[3],mode==='eager'?'nothing to check':'45 to 81 &micro;s')}
  const an=RD.anim({card:'rd-stk-card',ctl:'rd-stk-ctl',n:ST.eager.length,draw,ms:2600,label:'Stack step'});
  RD.seg(document.getElementById('rd-stk-mode'),m=>{mode=m;an.reset(ST[m].length);an.play()});

  // ---------- section 1: views of one storage ----------
  const V=D.strides,seg=document.getElementById('rd-str-seg');if(!seg)return;
  const OPT=[['base','x'],['t','x.t()'],['row1','x[1]'],['col2','x[:, 2]'],['every2','x[:, ::2]'],['view2x6','x.view(2, 6)'],['expand','arange(4.).expand(3, 4)'],['t_contig','x.t().contiguous()']];
  const CAP={base:'The original: shape (3, 4), strides (4, 1). One step down a column jumps 4 cells, one step along a row jumps 1. Contiguous.',
    t:'Transpose: the same 12 cells, read with the strides swapped to (1, 4). No data moved; it is not contiguous, which is why <code>x.t().view(12)</code> fails.',
    row1:'Row 1: offset 4, stride 1. A slice is just a new offset and shape.',
    col2:'Column 2: offset 2, stride 4. It reads every fourth cell, so it is not contiguous.',
    every2:'Every second column: strides (4, 2). Steps can skip cells.',
    view2x6:'<code>view</code> reinterprets the same order of cells as 2 rows of 6: strides (6, 1), still contiguous, still the same storage.',
    expand:'<code>expand</code> repeats a 4-cell storage over 3 rows with stride 0: 12 elements read from 4 cells, no copy. Writing into it would change 3 elements at once, so PyTorch forbids most in-place writes on it.',
    t_contig:'<code>.contiguous()</code> on the transpose copies into a <b>new</b> storage in the order the transpose reads, with strides (3, 1). This is the copy a kernel would otherwise make for you.'};
  seg.innerHTML=OPT.map((o,i)=>'<button'+(i?'':' class="on"')+' data-m="'+o[0]+'"><code>'+E(o[1])+'</code></button>').join('');
  function addrs(v){const s=v.shape.length===1?[v.shape[0],1]:v.shape,st=v.shape.length===1?[v.stride[0],0]:v.stride,out=[];
    for(let i=0;i<s[0];i++)for(let j=0;j<s[1];j++)out.push(v.offset+i*st[0]+j*st[1]);return out}
  function show(k){const v=V[k],a=addrs(v),stor=k==='t_contig'?v.values:k==='expand'?[0,1,2,3]:[...Array(12).keys()];
    // check: the address formula reproduces the values PyTorch returned
    const ok=a.every((ad,i)=>stor[ad]===v.values[i]);
    const cols=v.shape.length===1?1:v.shape[1],rowsN=v.shape.length===1?v.shape[0]:v.shape[0];
    let g='<div class="grid4" style="grid-template-columns:repeat('+cols+',minmax(0,'+(cols>4?'40px':'56px')+'))">';
    v.values.forEach((x,i)=>{g+='<div class="cell on">'+x+'<sub>@'+a[i]+'</sub></div>'});g+='</div>';
    document.getElementById('rd-str-grid').innerHTML=g;
    const ord={};a.forEach((ad,i)=>{(ord[ad]=ord[ad]||[]).push(i+1)});
    document.getElementById('rd-str-strip').style.gridTemplateColumns='repeat('+stor.length+',minmax(0,1fr))';
    document.getElementById('rd-str-strip').innerHTML=stor.map((x,ad)=>'<div class="cell'+(ord[ad]?' on':'')+'" title="storage cell '+ad+'">'+x+(ord[ad]?'<sub>'+ord[ad].join(',')+'</sub>':'')+'</div>').join('');
    document.getElementById('rd-str-meta').innerHTML='<dl class="kv"><dt>shape</dt><dd>('+v.shape.join(', ')+')</dd><dt>strides</dt><dd>('+v.stride.join(', ')+')</dd><dt>offset</dt><dd>'+v.offset+'</dd><dt>contiguous</dt><dd>'+(v.contig?'yes':'no')+'</dd><dt>storage</dt><dd>'+(v.shares?'shared with x (a view)':k==='expand'?'its own 4 cells, read 3 times':'new, '+v.storage_elems+' cells (a copy)')+'</dd><dt>formula check</dt><dd>'+(ok?'every element = storage[offset + i &times; stride<sub>0</sub> + j &times; stride<sub>1</sub>]':'MISMATCH')+'</dd></dl>';
    document.getElementById('rd-str-cap').innerHTML=CAP[k]}
  RD.seg(seg,show);show('base');
})();
