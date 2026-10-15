// ---- Transforms lab, sections 8 and 9: gradients against PyTorch, vmap animation, per-example gradients ----
(function(){
  const {D,esc,$,onRender,width,sci,n0,stat,seg,anim}=XF,G=D.grad,V=D.vmap;
  // ---- section 8: stats and per-parameter chart
  const S=G.summary;
  $('xf-gr-cnt').innerHTML=stat('loss, JAX against PyTorch',(+G.loss.jax).toFixed(6)+' vs '+(+G.loss.torch).toFixed(6),'difference '+sci(G.loss.diff))+
    stat('largest gradient difference',sci(S.max_abs_diff),'any element of '+S.n_params+' parameters')+
    stat('worst relative difference',sci(S.worst_rel_excl_key_bias),'<code>'+esc(S.worst_rel_name)+'</code>, key biases excluded')+
    stat('largest gradient',(+S.largest_grad).toFixed(3),'for scale');
  function grChart(){
    const el=$('xf-gr-chart'),R=G.rows,W=Math.min(width(el),860),H=250,ml=44,mr=8,mt=10,mb=40;
    const lo=-12,hi=0,y=v=>{const l=Math.log10(Math.max(v,1e-12));return mt+(hi-l)/(hi-lo)*(H-mt-mb)};
    const x=i=>ml+(i+.5)/R.length*(W-ml-mr);
    let s='';for(let e=lo;e<=hi;e+=2){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(Math.pow(10,e))+'" y2="'+y(Math.pow(10,e))+'" stroke="var(--line)"/><text x="'+(ml-5)+'" y="'+(y(Math.pow(10,e))+4)+'" text-anchor="end" font-size="10.5" fill="var(--mute)">1e'+e+'</text>'}
    // group bands
    const grp=n=>n.startsWith('blocks.')?'block '+n.split('.')[1]:(n.startsWith('tok')||n.startsWith('pos'))?'emb':'out';
    let start=0;for(let i=1;i<=R.length;i++){if(i===R.length||grp(R[i][0])!==grp(R[start][0])){const g=grp(R[start][0]);
      if(g.startsWith('block')&&(+g.split(' ')[1])%2===0)s+='<rect x="'+(x(start)-(W-ml-mr)/R.length/2)+'" y="'+mt+'" width="'+((i-start)*(W-ml-mr)/R.length)+'" height="'+(H-mt-mb)+'" fill="var(--soft)"/>';
      s+='<text x="'+((x(start)+x(i-1))/2)+'" y="'+(H-mb+14)+'" text-anchor="middle" font-size="10.5" fill="var(--mute)">'+(W<480&&g.startsWith('block')?g.replace('block ','b'):g)+'</text>';start=i}}
    R.forEach((r,i)=>{const kb=/attn\.wk\.bias$/.test(r[0]);
      s+='<line x1="'+x(i)+'" x2="'+x(i)+'" y1="'+y(r[2])+'" y2="'+y(r[1])+'" stroke="var(--line)"/>';
      s+='<circle cx="'+x(i)+'" cy="'+y(r[2])+'" r="3" fill="var(--dim)"><title>'+esc(r[0])+': largest |gradient| '+sci(r[2])+'</title></circle>';
      s+='<circle cx="'+x(i)+'" cy="'+y(r[1])+'" r="3.2" fill="'+(kb?'var(--bad)':'var(--c1)')+'"><title>'+esc(r[0])+': largest |JAX - PyTorch| '+sci(r[1])+(kb?' (key bias: true gradient 0)':'')+'</title></circle>'});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Gradient differences per parameter, log scale">'+s+'</svg>';
  }
  onRender(grChart);grChart();
  $('xf-gr-note').innerHTML='Each column is one of the '+G.rows.length+' parameters, in PyTorch order; red dots are the key biases (true gradient exactly 0). Under <code>jax.jit(jax.value_and_grad(...))</code> against eager PyTorch <code>loss.backward()</code>, from the shared initial weights (PyTorch seed 0) on training batch 0, float32, CPU. Log scale. Most differences sit near 1e-7 to 1e-8: float32 rounding from adding the same numbers in a different order. Script <code>src/xf/run_grad.py</code>.';
  const A=G.accumulate,SG=G.stop_gradient;
  $('xf-gr-sem').innerHTML='<tr><th>behaviour</th><th>PyTorch</th><th>JAX</th></tr>'+
    '<tr><td>a second backward pass without <code>zero_grad()</code></td><td>gradient norm &times;'+(+A.torch_ratio_after_second_backward).toFixed(2)+': it accumulates into <code>.grad</code></td><td>&times;'+(+A.jax_ratio_second_call).toFixed(2)+': each call returns a fresh value (accumulate explicitly with tree_map when you want micro-batching)</td></tr>'+
    '<tr><td>stop a gradient: d/dx of x &middot; stop(x) at x = 3</td><td><code>x * x.detach()</code>: '+SG.torch+'</td><td><code>x * jax.lax.stop_gradient(x)</code>: '+SG.jax+'</td></tr>'+
    '<tr><td>gradient of several inputs</td><td><code>requires_grad=True</code> on each, then read <code>.grad</code></td><td><code>jax.grad(f, argnums=(0, 1))(w, b)</code> returned dw = '+esc(JSON.stringify(G.argnums.dw))+', db = '+G.argnums.db+'</td></tr>'+
    '<tr><td>shape of the result</td><td>one <code>.grad</code> tensor per parameter</td><td>a pytree with the parameters\' exact structure ('+(S.same_structure?'checked: identical':'differs')+')</td></tr>';
  // ---- section 9: vmap animation, one token against the batch
  const M=V.mlp_anim,one=M.one,bat=M.batch;
  // align batched equations to the one-token program by primitive order, skipping the extra broadcasts
  const map=[];let j=0;bat.prims.forEach((p,k)=>{if(j<one.prims.length&&one.prims[j]===p){map[k]=j;j++}else map[k]=null});
  const oneEl=$('xf-vm-one'),batEl=$('xf-vm-bat'),vcap=$('xf-vm-cap');
  const hl=t=>esc(t).replace(/4096,/g,'<span class="xf-bdim">4096</span>,');
  oneEl.innerHTML='<div>'+esc(one.head)+'</div>'+one.eqns.map((e,k)=>'<div data-k="'+k+'">'+esc(e)+'</div>').join('')+'<div>'+esc(one.foot)+'</div>';
  batEl.innerHTML='<div>'+hl(bat.head)+'</div>'+bat.eqns.map((e,k)=>'<div data-k="'+k+'">'+hl(e)+'</div>').join('')+'<div>'+hl(bat.foot)+'</div>';
  const shp=t=>{const m=/^\s*\S+?:(\S+)\s=/.exec(t.split('\n')[0]);return m?m[1]:''};
  const scrollTo=(p,el)=>{if(el)p.scrollTop=Math.max(0,el.offsetTop-p.clientHeight/2)};
  function vdraw(i){
    const k=i-1,N=bat.eqns.length,jj=k>=0&&k<N?map[k]:null;
    batEl.querySelectorAll('div[data-k]').forEach(d=>{const q=+d.dataset.k;d.className=k<0||k>=N?'':q<k?'done':q===k?'cur':'todo'});
    oneEl.querySelectorAll('div[data-k]').forEach(d=>{const q=+d.dataset.k;d.className=k<0||k>=N?'':jj!=null&&q===jj?'cur':''});
    scrollTo(batEl,batEl.querySelector('.cur'));scrollTo(oneEl,oneEl.querySelector('.cur'));
    if(i===0){vcap.innerHTML='<b>The same function, two programs.</b> Left: <code>mlp</code> traced on one token. Right: <code>vmap(mlp)</code> traced on all 4,096 tokens of a batch. Step through the batched program and watch where each equation came from.';return}
    if(i===N+1){vcap.innerHTML='<b>Done.</b> '+one.eqns.length+' equations for one token, '+N+' for the batch: the same operations with a leading 4,096 dimension, plus '+(N-one.eqns.length)+' broadcasts so the shared biases can be added along the new dimension. The weights were not batched (<code>in_axes=None</code>), so the matrix products became real matrix-matrix products. No loop anywhere.';return}
    const p=bat.prims[k];
    if(jj==null){vcap.innerHTML='<b>Equation '+(k+1)+': <code>'+esc(p)+'</code></b>, new in the batched program: the bias <code>f32['+(shp(bat.eqns[k]).match(/\d+\]$/)||[''])[0]+'</code> is lifted to <code>'+esc(shp(bat.eqns[k]))+'</code> so it can be added to every one of the 4,096 rows. On one token the shapes already matched, so no broadcast was needed.';return}
    const a=shp(one.eqns[jj]),b=shp(bat.eqns[k]);
    let why=p==='dot_general'?' The batching rule of <code>dot_general</code> kept the contraction and let the batch dimension pass through: a vector-matrix product became a matrix-matrix product (dimension numbers: see the two panes).':' An elementwise primitive is batched by applying it to the larger array: its rule just moves the batch dimension along.';
    vcap.innerHTML='<b>Equation '+(k+1)+': <code>'+esc(p)+'</code></b>: <code>'+esc(a)+'</code> on one token became <code>'+esc(b)+'</code>.'+why;
  }
  anim({card:'xf-vm-card',ctl:'xf-vm-ctl',n:bat.eqns.length+2,draw:vdraw,ms:1300,label:'vmap step'});
  $('xf-vm-note').innerHTML='Real jaxprs from <code>jax.make_jaxpr</code> on block 0\'s MLP; the 4,096 batch dimension is highlighted. Script <code>src/xf/run_vmap.py</code>.';
  // batching rule of dot_general on one function
  const BC={one:'Two vectors of 32 (one query, one key): <code>dot_general</code> contracts dimension 0 of both and returns a scalar <code>f32[]</code>.',
    keys:'vmap over keys only: the rule turns the vector dot product into a matrix-vector product (contract q\'s dimension 0 with K\'s dimension 1): one score per key, <code>f32[128]</code>.',
    both:'vmap over both: 128 independent dot products. The rule adds a batch dimension to <code>dot_general</code> (the second pair of dimension numbers, <code>([0], [0])</code>).',
    grid:'vmap inside vmap, one over queries and one over keys: every query against every key, a single matrix product <code>Q K^T</code> of shape <code>f32[128,128]</code>, the attention score matrix, from a function written for one pair.'};
  const btShow=v=>{$('xf-bt-jx').textContent=V.batching[v];$('xf-bt-cap').innerHTML=BC[v]};
  seg($('xf-bt-mode'),btShow);btShow('one');
  // timings
  const TT=V.time_s,meth=[['jax_loop','JAX: Python loop of jit(grad)','var(--c2)'],['jax_vmap','JAX: jit(vmap(grad))','var(--c1)'],['torch_loop','PyTorch: loop of backward()','var(--c5)'],['torch_func_vmap','PyTorch: torch.func.vmap(grad)','var(--c4)']];
  function bars(){
    const el=$('xf-vm-bars'),mx=Math.max(...meth.map(m=>TT[m[0]]));
    el.innerHTML='<div class="bars">'+meth.map(m=>'<div class="row"><span class="nm" title="'+esc(m[1])+'">'+esc(m[1])+'</span><span class="track"><span class="fill" style="width:'+(100*TT[m[0]]/mx).toFixed(1)+'%;background:'+m[2]+'"></span></span><span class="val">'+(+TT[m[0]]).toFixed(2)+' s</span></div>').join('')+'</div>';
  }
  bars();
  $('xf-vm-tnote').innerHTML='<span class="xf-lbl c">rough</span> '+esc(TT.label)+'; 1-minute load average '+V.load+' at the end of the run. jit(vmap(grad)) was '+(TT.jax_loop/TT.jax_vmap).toFixed(1)+'&times; faster than the JAX loop here. Do not read the JAX against PyTorch gap as a framework comparison: on CPU each calls a different matrix library, and the machine was shared.';
  const AG=V.agree;
  $('xf-vm-agree').innerHTML='<tr><th>check (all 32 &times; 826,368 values)</th><th class="num">largest |difference|</th></tr>'+
    [['jit(vmap(grad)) against the JAX loop',AG.vmap_vs_loop],['JAX vmap against the PyTorch loop',AG.jax_vs_torch_loop],['JAX vmap against torch.func.vmap',AG.jax_vs_torch_func],['PyTorch loop against torch.func.vmap',AG.torch_loop_vs_torch_func],['mean of the 32 per-example gradients against the batch gradient',AG.mean_vs_batch_grad]]
    .map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+sci(r[1])+'</td></tr>').join('');
  function norms(){
    const el=$('xf-vm-norms'),N=V.norms,W=Math.min(width(el),720),H=64,ml=10,mr=10;
    const lo=Math.min(...N),hi=Math.max(...N),x=v=>ml+(v-lo)/(hi-lo||1)*(W-ml-mr);
    let s='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="30" y2="30" stroke="var(--line)"/>';
    N.forEach((v,i)=>{s+='<circle cx="'+x(v)+'" cy="'+(30+((i%3)-1)*7)+'" r="4" fill="var(--c1)" fill-opacity=".7"><title>sequence '+i+': gradient norm '+v.toFixed(3)+'</title></circle>'});
    s+='<text x="'+ml+'" y="58" font-size="11" fill="var(--mute)">'+lo.toFixed(2)+'</text><text x="'+(W-mr)+'" y="58" text-anchor="end" font-size="11" fill="var(--mute)">'+hi.toFixed(2)+'</text><text x="'+(W/2)+'" y="58" text-anchor="middle" font-size="11" fill="var(--mute)">per-example gradient norm</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Per-example gradient norms">'+s+'</svg>';
  }
  onRender(norms);norms();
})();
