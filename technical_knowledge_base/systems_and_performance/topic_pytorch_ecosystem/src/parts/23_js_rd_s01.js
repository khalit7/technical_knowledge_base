// ---- Reading tab, section 5: the stack animation (eager against compiled; its steps are explained in the lists on the left), and the strides explorer (retired: returns early) ----
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
      {on:[0],c:[0,0,0,'0']},
      {on:[1],c:[0,0,0,'0']},
      {on:[3],c:[142,0,0,'0']},
      {on:[3],c:[142,135,0,'0']},
      {on:[4],c:[142,135,142,'0']},
      {on:[0,1,3,4],c:[142,135,142,'0']}],
    comp:[
      {on:[0],c:[0,0,0,'0']},
      {on:[2],c:[0,0,0,'549']},
      {on:[1,2,3],c:[0,0,0,'549']},
      {on:[2,4],c:[35,1,35,'549']},
      {on:[2,3],c:[35,1,35,'549']},
      {on:[0,2,4],c:[35,1,35,'549']}]};
  const stk=document.getElementById('rd-stk');if(!stk)return;
  let mode='eager';
  stk.innerHTML=LAY.map((l,i)=>'<div style="--sc:'+l[2]+'" data-i="'+i+'"><b>'+l[0]+'</b><span>'+l[1]+'</span></div>').join('');
  const rows=[...stk.children],cnt=document.getElementById('rd-stk-cnt');
  function draw(i){const s=ST[mode][i];
    rows.forEach((r,k)=>{r.classList.toggle('on',s.on.includes(k));r.classList.toggle('off',mode==='eager'&&k===2)});
    const c=s.c;cnt.innerHTML=RD.stat(mode==='eager'?'Calls through the dispatcher':'Launches per forward',fmt(c[0]),mode==='eager'?'ATen operator calls':'after compiling')+
      RD.stat('Autograd nodes added',fmt(c[1]),mode==='eager'?'one per differentiable call':'one for the whole graph')+
      RD.stat('Kernel runs',fmt(c[2]),'')+RD.stat('Guards checked per call',c[3],mode==='eager'?'nothing to check':'45 to 81 &micro;s')}
  // each step is explained in the step list on the left (sx-stk-eager, sx-stk-comp); the mode switch swaps the list and replays
  const an=RD.anim({card:'rd-stk-card',ctl:'rd-stk-ctl',n:ST.eager.length,draw,ms:4200,label:'Stack step',list:'sx-stk-eager'});
  RD.seg(document.getElementById('rd-stk-mode'),m=>{mode=m;['eager','comp'].forEach(k=>{document.getElementById('sx-stk-'+k).hidden=k!==m});an.reset(ST[m].length,'sx-stk-'+m)});

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
