// ---- Transforms lab, sections 10 and 11: the interpreters in the pinned source, the toy JAX, footguns ----
(function(){
  const {D,esc,$,sci}=XF,SO=D.source,B=D.basics,T=D.trace;
  const ex=id=>SO.excerpts.find(e=>e.id===id);
  const at=id=>{const e=ex(id);return e?'<a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer"><code>'+esc(e.file.replace('jax/_src/',''))+':'+e.start+'</code></a>':''};
  $('xf-flow').innerHTML=
    '<div class="n"><b>your code</b><code>jnp.tanh(x)</code> calls <code>lax.tanh</code></div><span class="ar">&rarr;</span>'+
    '<div class="n"><b>Primitive.bind</b>takes the current trace and calls <code>bind_with_trace</code> '+at('bind')+'</div><span class="ar">&rarr;</span>'+
    '<div class="n"><b>trace.process_primitive</b>one method per interpreter '+at('bind_with_trace')+'</div>'+
    '<div style="flex-basis:100%;height:0"></div>'+
    [['EvalTrace','no transformation','runs the primitive\'s implementation on real arrays',at('eval')],
     ['DynamicJaxprTrace','jit, make_jaxpr','asks for the output abstract value and appends an equation',at('jit_trace')],
     ['JVPTrace','jax.jvp','primal and tangent; calls the rule in primitive_jvps',at('jvp')],
     ['LinearizeTrace','jax.grad (via vjp)','primal now; records the linear part, later transposed',at('linearize')],
     ['BatchTrace','jax.vmap','value and batch dimension; calls the batching rule',at('batch')]]
    .map(r=>'<div class="n"><b>'+r[0]+'</b><span class="small mute">'+r[1]+'</span><br>'+r[2]+' '+r[3]+'</div>').join('');
  $('xf-src').innerHTML=SO.excerpts.map(e=>{const ls=e.text.split('\n');
    return '<details class="xf-src mist"><summary><code>'+esc(e.file)+':'+e.start+'</code> '+esc(e.why.split(':')[0].split('. ')[0])+'</summary><div class="b"><p class="small">'+esc(e.why)+' <a href="'+esc(e.url)+'" target="_blank" rel="noopener noreferrer">GitHub, lines '+e.start+'&ndash;'+e.end+'</a></p><pre class="xf-code">'+ls.map((l,i)=>'<span class="mute">'+String(e.start+i).padStart(5,' ')+'</span>  '+esc(l)).join('\n')+'</pre></div></details>'}).join('');
  // toy
  $('xf-toy-code').textContent=D.toy.toy_code;
  $('xf-toy-f').textContent=D.toy.f_code.trim()+'\n\njp = make_jaxpr(f, 2)\ninterpret(jp, EVAL, 0.5, 2.0)                 # evaluate\ninterpret(jp, JVP, (0.5, 1.0), (2.0, 0.0))    # d/dx: tangent 1 on x, 0 on w\ninterpret(jp, VMAP, [0.5, 1.0, 2.0], 2.0)     # x batched, w shared';
  $('xf-toy-out').textContent=D.toy.toy_out.trim();
  $('xf-toy-jax').textContent=D.toy.jax_out.trim();
  // footguns
  const F=B.footguns,L=T.loops;
  const wl=Object.values(L).find(r=>typeof r.grad==='string');
  const items=[
    ['Python <code>if</code> on a traced value',T.cf_errors.if_under_jit,'Use <code>jnp.where</code> or <code>jax.lax.cond</code>, or make the deciding argument static (section 2).'],
    ['A shape that depends on data',T.cf_errors.int_under_jit,'Shapes must be known at trace time: pad to a fixed size and mask, or bucket lengths (section 3).'],
    ['A tracer saved outside the function (tracer leak)',B.side.leak,'Return everything you need; never store traced values in globals, lists or self attributes inside a transformed function (section 4).'],
    ['Assigning into an array',B.immut.setitem,'<code>x = x.at[i].set(v)</code> (section 5).'],
    ['grad of a function that returns a vector',F.nonscalar_grad,'Reduce to a scalar, or use <code>jax.jacobian</code>, <code>jax.vjp</code> or <code>jax.vmap(jax.grad(...))</code>.'],
    ['grad with respect to an integer',F.int_grad,'Differentiate float inputs only (token ids are not differentiable; their embeddings are).'],
    ['A loss that returns (loss, metrics) without has_aux',D.grad.has_aux_missing,'<code>jax.value_and_grad(f, has_aux=True)</code> (section 8).'],
    ['An unhashable static argument',F.unhashable_static,'Pass a tuple, or a frozen dataclass; static values must be hashable because they are part of the cache key.'],
    ['tree_map over two different structures',B.tree_map_mismatch,'Check <code>jax.tree.structure(a) == jax.tree.structure(b)</code>; optimiser states and params must line up (section 7).'],
    ['Reverse-mode grad through while_loop',wl?wl.grad:'n/a','Use <code>lax.scan</code>, or <code>fori_loop</code> with bounds known at trace time (it becomes a scan).'],
    ['Silent: nan gradients through jnp.where','<code>jax.grad(lambda x: jnp.where(x &gt; 0, jnp.sqrt(x), 0.0))(0.0)</code> returned <b>'+F.where_nan_jax+'</b>; PyTorch\'s <code>torch.where</code> gave <b>'+F.where_nan_torch+'</b> too. Both sides of a where are differentiated, and 0 &times; infinity is not a number (nan).','The double-where trick: feed the unsafe branch a safe input first, <code>jnp.sqrt(jnp.where(x &gt; 0, x, 1.0))</code>; it returned '+F.where_safe_jax+'.',true],
    ['Silent: float64 becomes float32','<code>jnp.array(1.0, dtype=jnp.float64)</code> has dtype <b>'+esc(F.f64_dtype)+'</b>, with the warning: '+esc(F.f64_warning),'Enable <code>jax_enable_x64</code> at start-up if you need 64-bit (rare in ML training).',true],
    ['Silent: out-of-bounds indexing','<code>x[10]</code> on a 5-element array returned <b>'+B.oob.jax_get+'</b>, clamped (section 5).','Validate indices on the host, or read with <code>.at[i].get(mode="fill", fill_value=...)</code>.',true],
    ['Silent: reusing a random key','Two dropout masks from one key matched on '+(100*B.prng.reuse_same_mask_frac).toFixed(0)+'% of positions (section 6).','Split before every use; turn on <code>jax_debug_key_reuse</code> while debugging.',true],
    ['Silent: NumPy randomness, the clock, globals','Frozen at trace time: <code>np.random.rand()</code> inside jit gave '+B.np_random_in_jit.join(', ')+' (section 4).','Pass anything that changes as an argument; use <code>jax.random</code>.',true],
    ['Silent: timing without block_until_ready','A jitted 1024 &times; 1024 matmul "took" '+B.async.no_block_ms+' ms without <code>.block_until_ready()</code> and '+B.async.block_ms+' ms with it ('+esc(B.async.label)+'). JAX dispatches asynchronously: the call returns before the work is done.','Always <code>jax.block_until_ready(out)</code> before stopping a timer; any host read (<code>float(x)</code>, printing, <code>np.asarray</code>) also waits, which is how a stray <code>.item()</code>-style read in a loop serialises a training step.',true],
    ['Silent: a recompile every step','A new lambda per step: 3 compiles in 3 steps; ragged lengths: one compile per new length (section 3 drills).','Jit once; bucket shapes; log misses with <code>jax_explain_cache_misses</code>.',true]
  ];
  $('xf-foot').innerHTML=items.map(it=>'<details class="mist"><summary>'+it[0]+(it[3]?' <span class="xf-lbl c">no error</span>':'')+'</summary><div class="b">'+(it[3]?'<p>'+it[1]+'</p>':'<pre class="xf-code xf-err">'+esc(it[1])+'</pre>')+'<p><b>Fix.</b> '+it[2]+'</p></div></details>').join('');
})();
