// ---- XLA and compilation: shared helpers (prefix xp). Data: window.XPD (22_js_xp_0data.js, generated) ----
window.XP=(function(){
  const D=window.XPD, esc=RD.esc;
  const nf=new Intl.NumberFormat('en-US');
  const f=v=>{if(v===null||v===undefined)return '?';if(typeof v==='number'){return Number.isInteger(v)?nf.format(v):String(v)}return String(v)};
  const mb=b=>(b/1e6).toFixed(1)+' MB', gb=b=>(b/1e9).toFixed(2)+' GB', kb=b=>(b/1e3).toFixed(1)+' KB';
  const ms=us=>(us/1000).toFixed(us<10000?2:1)+' ms';
  // every <span data-xp="key"> takes its value from XPD.n (prose numbers cannot drift from the data)
  function fill(root){(root||document).querySelectorAll('[data-xp]').forEach(el=>{const k=el.dataset.xp;
    if(!(k in D.n)){el.textContent='[missing '+k+']';if(window.__jsErr)window.__jsErr('missing number '+k);return}el.textContent=f(D.n[k])})}
  // predict-then-reveal blocks: .pr with buttons data-a="1" for the right answer, and a hidden .ans
  function predicts(root){(root||document).querySelectorAll('.pr').forEach(pr=>{if(pr.dataset.wired)return;pr.dataset.wired=1;
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.a==='1')x.classList.add('right')});
      if(b.dataset.a!=='1')b.classList.add('wrong');const a=pr.querySelector('.ans');if(a)a.hidden=false}))})}
  const bars=(rows,max,col)=>rows.map(r=>'<div'+(r.hl?' class="hl"':'')+'><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><span class="tr"><span style="width:'+Math.max(0.5,100*r.v/max).toFixed(2)+'%;background:'+(r.c||col||'var(--acc)')+'"></span></span><span class="v">'+esc(r.t||f(r.v))+'</span></div>').join('');
  const code=s=>'<code>'+esc(s)+'</code>';
  const src=s=>s&&s.url?'<a href="'+s.url+'" target="_blank" rel="noopener noreferrer"><code>'+esc(s.file)+':'+s.line+'</code></a>':'';
  // what each XLA pass did (one line each; from the pass headers at XLA 91888df6 and what the dumps show)
  const PASS={
    'flatten-call-graph':'Gives every call site its own copy of the called computation ("Flatten the call graph for an HLO module into a tree"), so later analyses see one caller per computation.',
    'batched_gather_scatter_normalizer':'Rewrites batched gathers and scatters (the embedding lookup and its gradient) into non-batched ones.',
    'dot_decomposer':'Puts every dot into canonical form: "non-contracting and contracting dimensions are reshaped together and batch dimensions are the most major dimensions". Adds reshapes and transposes around each matmul.',
    'call-inliner':'Inlines called computations (the nested jits JAX lowered as private functions) into their callers.',
    'dynamic-dimension-simplifier':'Simplifies operations on dynamic dimension sizes; here it only renames.',
    'algsimp':'Algebraic simplification: x*1 to x, removes no-op reshapes and transposes, folds divisions by constants into multiplications, moves broadcasts. Runs to a fixed point with the next passes.',
    'dce':'Dead-code elimination: removes instructions nobody uses, including the parameters of inlined computations.',
    'gather_expander':'Strength-reduces "simple" gathers into cheaper operations (here one gather became a broadcast and a reshape).',
    'gather_simplifier':'Rewrites gathers into a canonical gather plus transposes and reshapes.',
    'tree_reduction_rewriter':'Splits large reductions into a reduce-window over chunks then a smaller reduce, to "increase precision for the reduction operation" (pairwise-style summation).',
    'reshape-mover':'Sinks reshapes and transposes through elementwise operations so they can cancel or fold: op(rearrange(x), rearrange(y)) becomes rearrange(op(x, y)).',
    'constant_folding':'Evaluates instructions whose inputs are all constants at compile time.',
    'scatter_simplifier':'Rewrites scatters (the embedding gradient) into a simpler scatter plus transposes and reshapes.',
    'transpose-folding':'Folds transposes into the dots that read them, since a GEMM kernel "can transpose its inputs".',
    'cse':'Common-subexpression elimination: "Identical constants and identical instructions with the same operands are commoned".',
    'layout-assignment':'Chooses every array\'s memory order ({1,0} and so on) for the backend, inserting copies where a producer and a consumer disagree.',
    'shape-canonicalizer':'Shares identical shape objects to save compiler memory; no visible change.',
    'reshape-decomposer':'Turns every reshape into a bitcast (free) or a bitcast plus a physical copy ("Postcondition: All reshapes are turned into bitcasts").',
    'dot-library-rewriter':'CPU only: hands matmuls and reductions to the YNNPACK library as kCustom "ynn_fusion" instructions.',
    'fusion':'CpuInstructionFusion: producer-into-consumer fusion with the rules of section 4. The cliff in the chart.',
    'fusion-wrapper':'Wraps every remaining single operation in a one-operation kLoop fusion "so that the fusion emitter can kick in".',
    'cpu-parallel-task-assigner':'Assigns parallel task counts for the CPU thread pool.',
    'copy-insertion':'Adds copies where an in-place update or an aliased output would be unsafe, then removes those it can prove unnecessary.',
    'pipeline-start':'Start of a pipeline: after scheduling, the module is printed in execution order, so lines move without changing.'
  };
  const pdesc=n=>PASS[n]||'';
  return {D,f,mb,gb,kb,ms,fill,predicts,bars,code,src,pdesc,esc};
})();
XP.fill();XP.predicts();
