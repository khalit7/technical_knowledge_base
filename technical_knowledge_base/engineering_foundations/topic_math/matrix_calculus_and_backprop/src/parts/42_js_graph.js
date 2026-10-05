// ---- Real autograd graph tab (t-graph): the grad_fn graph PyTorch built for one tiny transformer block (data: MCD.graph, from src/inputs/measure/graph.json) ----
(function(){
  const G=window.MCD&&window.MCD.graph,root=document.getElementById('t-graph');if(!G||!root)return;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const SHAPE=new Set(['ViewBackward0','UnsafeViewBackward0','ReshapeAliasBackward0','ExpandBackward0','TransposeBackward0','SplitBackward0','CloneBackward0','TBackward0']);
  const CAT=op=>op==='AccumulateGrad'?['acc','var(--c5)','accumulate into .grad']:/Mm|Bmm/.test(op)?['mm','var(--c1)','matrix product']:/LayerNorm/.test(op)?['norm','var(--c4)','layer norm']:
    /Softmax|Nll/.test(op)?['sm','var(--c2)','softmax and loss']:SHAPE.has(op)?['shape','var(--dim)','shape only']:['ew','var(--c3)','elementwise, add, index'];
  const INFO={
    NllLossBackward0:'Negative log-likelihood, averaged over the 4 positions: picks −log p of each target. Backward writes −1/4 at each target position and 0 elsewhere. It saved the log-probabilities it read from (self) and the targets.',
    LogSoftmaxBackward0:'Log-softmax of each row of logits. Backward: ḡ − exp(result) × sum(ḡ), using only its saved output (result = log p, so exp(result) = p). Together with the node above it gives (p − onehot)/4: Reading section 5d.',
    MmBackward0:'A matrix product C = A B (the 3-D activations are flattened to (4, width) by the view nodes around it). Backward: Ā = C̄ Bᵀ and B̄ = Aᵀ C̄, Reading section 5a; derivatives.yaml lines 1235-1238. It saves both inputs: the activation A costs memory, the weight B is a reference to the parameter.',
    BmmBackward0:'A batched matrix product, one per head (batch dimension 2 = 1 sequence × 2 heads): either q kᵀ or A v. Backward is 5a per head: grad.bmm(mat2ᵀ) and selfᵀ.bmm(grad) (derivatives.yaml lines 378-380). Both inputs are activations here, so both cost memory.',
    TBackward0:'The transpose Wᵀ used by x @ W.t(). Backward transposes the gradient back so it has W’s shape. Saves nothing.',
    AccumulateGrad:'A leaf: a parameter with requires_grad. It adds the arriving gradient into .grad (it does not overwrite, which is why zero_grad exists). A parameter used twice, like the tied embedding, receives two contributions and its accumulator runs only after both have arrived.',
    NativeLayerNormBackward0:'Layer norm. Backward is Reading section 5e: r(ĝ − mean(ĝ) − x̂ ⊙ mean(ĝ ⊙ x̂)), plus γ̄ and β̄. It saved its input, the per-token mean (result1) and reciprocal standard deviation (result2, rstd), and references to γ and β.',
    AddBackward0:'An addition (a residual connection or a bias). Backward passes the same gradient to both inputs unchanged (alpha = 1). This is the untouched identity path of Reading section 4.',
    GeluBackward0:'GELU. Backward: ḡ ⊙ (Φ(u) + u φ(u)), Reading section 5b; it saved its input u because the derivative cannot be written from the output.',
    SoftmaxBackward0:'Softmax over each row of attention scores. Backward: p ⊙ (ḡ − Σ ḡ p) per row, Reading section 5c; it saved only its output p, the (heads × T × T) attention weights, the term that grows with the square of the sequence length.',
    MaskedFillBackward0:'The causal mask: future positions set to −∞. Backward sets the gradient to 0 at the masked positions; it saved the mask.',
    DivBackward0:'Division of the scores by √(head width) = 2. Backward divides the gradient by the same number; it saved only that scalar (self is None: not needed).',
    IndexBackward0:'The embedding lookup emb[tokens]. Backward adds each position’s gradient into the row of the embedding table for that token: token 1 appears twice, so its row receives two contributions. Saved: the indices.',
    SplitBackward0:'Splitting qkv into q, k and v. Backward concatenates the three gradients back.',
    ExpandBackward0:'A broadcast (a view that repeats data). Backward sums the gradient over the repeated dimensions.',
  };
  const shapeInfo='A shape-only operation (view, reshape, transpose, clone). Backward applies the inverse reshaping to the gradient; no arithmetic, nothing saved but sizes.';
  const N=G.nodes, byI={};N.forEach(n=>byI[n.i]=n);
  const order=G.exec.map(i=>byI[i]);
  const pos={};order.forEach((n,k)=>pos[n.i]=k+1);
  const fmtShape=s=>'['+s.join(', ')+']';
  let sel=null,hide=false,timer=0,runK=-1;
  function chips(n){return n.sv.filter(s=>s[1]).map(s=>s[3]?'<span class="chip par">'+esc(s[0])+' = '+esc(s[3])+' (weight)</span>':'<span class="chip act">'+esc(s[0])+' '+fmtShape(s[1])+' '+s[2]+' B</span>').join('')}
  function list(){
    $('gr-list').innerHTML=order.map((n,k)=>{const c=CAT(n.op);if(hide&&c[0]==='shape')return '';
      const nx=n.nx.filter(x=>x!==null).map(x=>'#'+pos[x]).join(', ');
      return '<li data-i="'+n.i+'" style="--gc:'+c[1]+'" class="'+(sel===n.i?'sel ':'')+(k===runK?'run':(runK>=0&&k<runK?'done':''))+'"><span class="mute">#'+(k+1)+'</span> <span class="op">'+esc(n.op)+'</span>'+(n.lb?'<span class="lb">'+esc(n.lb)+'</span>':'')+(n.pm?'<span class="lb">.grad of '+esc(n.pm)+' '+fmtShape(n.sh||[])+'</span>':'')+
        '<div>'+chips(n)+'</div>'+(nx?'<div class="nx">sends gradients to '+nx+'</div>':'')+'</li>'}).join('');
  }
  function detail(n){const c=CAT(n.op),k=pos[n.i];
    const vals=n.sv.filter(s=>!s[1]).map(s=>esc(s[0])+' = '+esc(JSON.stringify(s[2]))).join('; ');
    $('gr-det').innerHTML='<b>#'+k+' '+esc(n.op)+'</b>'+(n.lb?' <span class="mute">(computed '+esc(n.lb)+')</span>':'')+' <span class="mute">'+c[2]+'</span><p style="margin:4px 0">'+esc(INFO[n.op]||(SHAPE.has(n.op)?shapeInfo:''))+'</p>'+
      (n.sv.some(s=>s[1])?'<div class="small">Saved tensors: '+chips(n)+'</div>':'')+(vals?'<div class="small mute">Saved values: '+vals+'</div>':'')+
      '<div class="small mute">Forward sequence number '+(n.seq>1e15?'none (leaf)':n.seq)+'; run '+k+(k===1?'st':k===2?'nd':k===3?'rd':'th')+' of '+order.length+' in the backward pass.</div>'}
  $('gr-list').addEventListener('click',e=>{const li=e.target.closest('li');if(!li)return;sel=+li.dataset.i;detail(byI[sel]);list()});
  $('gr-hide').addEventListener('change',e=>{hide=e.target.checked;list()});
  function stop(){if(timer){clearInterval(timer);timer=0}}
  $('gr-stop').addEventListener('click',()=>{stop();runK=-1;list()});
  $('gr-play').addEventListener('click',()=>{stop();runK=0;sel=order[0].i;detail(order[0]);list();
    timer=setInterval(()=>{if(root.hidden||document.hidden){stop();return}runK++;if(runK>=order.length){stop();runK=-1;list();return}
      if(hide&&CAT(order[runK].op)[0]==='shape')return;sel=order[runK].i;detail(order[runK]);list()},RD.RM?1400:650)});
  const nAct=N.reduce((a,n)=>a+n.sv.filter(s=>s[1]&&!s[3]).length,0);
  $('gr-stats').innerHTML=RD.stat('Nodes',String(N.length),N.filter(n=>n.op==='AccumulateGrad').length+' of them AccumulateGrad (one per parameter)')+
    RD.stat('Shape-only nodes',String(N.filter(n=>SHAPE.has(n.op)).length),'views, transposes, expands: no arithmetic')+
    RD.stat('Activation bytes saved',G.saved.toLocaleString('en-US'),'each storage counted once; weights excluded')+RD.stat('Loss',G.loss.toFixed(4),'PyTorch '+esc(G.torch)+', float32');
  $('gr-leg').innerHTML=[['matrix product','var(--c1)'],['layer norm','var(--c4)'],['softmax and loss','var(--c2)'],['elementwise, add, index','var(--c3)'],['shape only','var(--dim)'],['accumulate into .grad','var(--c5)']].map(x=>'<span style="--sw:'+x[1]+'">'+x[0]+'</span>').join('');
  list();
})();
