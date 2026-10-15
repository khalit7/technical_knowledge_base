// ---- JAX core page, Reading tab: tables built from the recorded runs, the map, the promotion table,
// the dispatch animation, the annotated jaxpr, the Jacobian heatmap, the residual bars and the primitive stepper.
(function(){
const J=window.JC, U=window.JCU, esc=RD.esc, $=id=>document.getElementById(id);
const fmtv=v=>Array.isArray(v)?'['+v.map(fmtv).join(', ')+']':(typeof v==='number'?U.sig(v,4):String(v));
// arrays and booleans in data-k spans: re-fill with readable formatting
document.querySelectorAll('[data-k]').forEach(el=>{const v=U.get(el.dataset.k);if(Array.isArray(v)||typeof v==='boolean')el.textContent=fmtv(v)});

// ---------------------------------------------------------------- map
function drawMap(){const el=$('jc-map');if(!el)return;const w=RD.width(el.parentNode);const narrow=w<600;
  const B=[ // id, label, sub, section
    ['arr','Arrays and pytrees','jax.Array, dtypes, pytrees','s-arr'],
    ['trace','Tracing','tracers, abstract values, traces','s-trace'],
    ['jaxpr','Jaxpr','typed program of primitives','s-jaxpr'],
    ['cf','Control flow','cond, scan, while: sub-jaxprs','s-cf'],
    ['jit','jit','DynamicJaxprTrace, then XLA','s-trace'],
    ['ad','grad, jvp, vjp','linearize, transpose; custom rules','s-ad'],
    ['vm','vmap','batching rules, axis names','s-vmap'],
    ['prim','Primitives','impl, abstract eval, lowering, JVP, transpose, batching','s-prim'],
    ['key','Random keys','counter-based, splittable','s-prng']];
  let body='',pos={};const bh=46;
  if(!narrow){const cw=(w-40)/4;
    pos.arr=[10,10,cw,bh];pos.key=[10,70,cw,bh];pos.trace=[20+cw,40,cw,bh];pos.jaxpr=[30+2*cw,40,cw,bh];pos.cf=[30+2*cw,100,cw,bh];
    pos.jit=[40+3*cw-10,0,cw,bh];pos.ad=[40+3*cw-10,52,cw,bh];pos.vm=[40+3*cw-10,104,cw,bh];pos.prim=[20+cw,160,3*cw+10,bh];
  } else {const cw=w-20;let y=0;['arr','key','trace','jaxpr','cf','jit','ad','vm','prim'].forEach(k=>{pos[k]=[10,y,cw,bh];y+=bh+8})}
  const H=Math.max(...Object.values(pos).map(p=>p[1]+p[3]))+4;
  const arrow=(a,b)=>{const p=pos[a],q=pos[b];let x1,y1,x2,y2;
    if(!narrow){x1=p[0]+p[2];y1=p[1]+p[3]/2;x2=q[0];y2=q[1]+q[3]/2}else{x1=p[0]+p[2]/2;y1=p[1]+p[3];x2=q[0]+q[2]/2;y2=q[1]}
    return '<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="var(--mute)" stroke-width="1.2" marker-end="url(#jcah)"/>'};
  body+='<defs><marker id="jcah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0,0L10,5L0,10z" fill="var(--mute)"/></marker></defs>';
  if(!narrow){body+=arrow('arr','trace')+arrow('trace','jaxpr')+arrow('jaxpr','jit')+arrow('jaxpr','ad')+arrow('jaxpr','vm')}
  B.forEach(([k,l,s,sec])=>{const p=pos[k];body+='<g class="jcmapb" data-sec="'+sec+'" style="cursor:pointer"><rect x="'+p[0]+'" y="'+p[1]+'" width="'+p[2]+'" height="'+p[3]+'" rx="7" fill="var(--soft)" stroke="var(--acc)"/>'+
    RD.t(p[0]+8,p[1]+19,esc(l),{fs:12.5,w:600})+RD.t(p[0]+8,p[1]+36,esc(s),{fs:10.5,fill:'var(--mute)'})+'</g>'});
  el.setAttribute('viewBox','0 0 '+w+' '+H);el.setAttribute('width',w);el.setAttribute('height',H);el.innerHTML=body;
  el.querySelectorAll('.jcmapb').forEach(g=>g.addEventListener('click',()=>{const s=$(g.dataset.sec);if(s)s.scrollIntoView({block:'start'})}));
}
drawMap();RD.onRender(drawMap);RD.onResize(drawMap);

// ---------------------------------------------------------------- section 1
$('jc-ready').textContent=J.arr.async.is_ready_right_after_dispatch.every(v=>!v)?'False':'mixed';
(function(){const P=J.prom,names=P.names;
  const abbr=v=>v==='float'?'py float':v==='int'?'py int':v.replace('bfloat16','bf16').replace('float','f').replace('uint','u').replace('int','i').replace('bool','b');let x64='off',show='jax',only=false;
  function draw(){const T=P['x64_'+x64];let nd=0,h='<table class="jc-pm"><thead><tr><th>x + y</th>'+names.map(n=>'<th>'+esc(n)+'</th>').join('')+'</tr></thead><tbody>';
    names.forEach(a=>{h+='<tr><th>'+esc(a)+'</th>';names.forEach(b=>{const c=T[a+'|'+b];const d=c.jax!==c.numpy&&c.numpy!=='n/a';if(d)nd++;
      const v=show==='jax'?c.jax:c.numpy;const cls=d?'diff':(a===b?'self':'same');
      h+='<td class="'+cls+'" title="JAX '+esc(c.jax)+' | NumPy '+esc(c.numpy)+'">'+((only&&!d)?'':esc(abbr(v)))+'</td>'});h+='</tr>'});
    $('jc-prom').innerHTML=h+'</tbody></table>';
    $('jc-prom-cap').innerHTML='Showing '+(show==='jax'?'JAX':'NumPy')+' results with x64 '+x64+'. <b>'+nd+'</b> of '+(names.length*names.length)+' cells differ (highlighted; NumPy has no bfloat16, shown n/a). * marks a weakly typed JAX result. Abbreviations: f32 = float32, i8 = int8, u8 = uint8, bf16 = bfloat16, b = bool; "py int" and "py float" are Python scalars. With x64 off, JAX truncates int64 and float64 operands to 32 bits on creation, which is most of the differences; with x64 on, the remaining ones are JAX\'s own lattice (for example int32 + float16 = float16 in JAX, float64 in NumPy). Hover a cell for both results. Source: <code>run_array.py</code>.'}
  RD.seg($('jc-prom-x64'),m=>{x64=m;draw()});RD.seg($('jc-prom-show'),m=>{show=m;draw()});$('jc-prom-only').addEventListener('change',e=>{only=e.target.checked;draw()});draw()})();

// ---------------------------------------------------------------- section 2
$('jc-avals').innerHTML='<thead><tr><th>value</th><th>jax.typeof</th><th>weak type</th></tr></thead><tbody>'+J.tr.avals.map(a=>'<tr><td><code>'+esc(a.expr)+'</code></td><td class="mono">'+esc(a.typeof)+'</td><td>'+(a.weak_type?'yes':'no')+'</td></tr>').join('')+'</tbody>';
$('jc-ntr').textContent=J.src.trace_classes.length;
$('jc-trlist').innerHTML=J.src.trace_classes.map(t=>'<code>'+esc(t.name)+'</code> ('+esc(t.file.replace('jax/_src/',''))+':'+t.line+')').join(', ');
(function(){const C=J.tr.chains;let h='<thead><tr><th>transformation</th><th>what f sees, innermost first</th><th>bottom</th></tr></thead><tbody>';
  Object.keys(C).forEach(k=>{const ch=C[k];const parts=ch.filter(e=>e.tracer).map(e=>esc(e.tracer)+' <span class="mute">'+esc(e.aval)+(e.extra?' '+esc(e.extra):'')+'</span>');
    const last=ch[ch.length-1];const bot=last.value?(last.value==='Var'?'a jaxpr variable (jit is recording)':'a concrete array'):(last.parent?'parent '+last.parent:'');
    h+='<tr><td><code>'+esc(k)+'</code></td><td>'+(parts.length?parts.join(' &rarr; '):'<span class="mute">a plain jax.Array (current trace: EvalTrace)</span>')+'</td><td>'+esc(bot)+'</td></tr>'});
  $('jc-chains').innerHTML=h+'</tbody>'})();

// dispatch animation
(function(){const L=J.tr.dispatch_log.log;let mode='t';
  const say={JVPTrace:'jvp\'s trace (outermost of the three to receive it, because it is the innermost transformation)',BatchTrace:'vmap\'s trace',DynamicJaxprTrace:'jit\'s trace'};
  const rule={JVPTrace:{sin:'runs the JVP rule of sin: the primal needs sin(x), the tangent needs cos(x) times t. It binds sin, cos and mul on its parent, with the parent set as the current trace.'},
    BatchTrace:{sin:'runs the batching rule of sin (elementwise: the same op on the whole batch, batch dim unchanged) and binds it on its parent.',cos:'batches cos the same way.',mul:'batches mul: both operands carry batch dim 0, so one mul on the batched arrays.'},
    DynamicJaxprTrace:{sin:'records an equation: sin of the batched float32[2,3]. Nothing is computed.',cos:'records cos on float32[2,3].',mul:'records mul on two float32[2,3]. This is the tangent: t * cos(x).'}};
  function stepsT(){const s=[{cap:'<b>Start.</b> <code>jit</code> made a jaxpr trace (bottom), <code>vmap</code> a batch trace on top of it, <code>jvp</code> a JVP trace on top of that. Python now runs <code>f</code>; its first array operation is <code>lax.sin(x)</code>, which calls <code>sin_p.bind(x)</code>.',cur:null,rec:0}];
    let rec=0;L.forEach((e,i)=>{if(e.trace==='DynamicJaxprTrace')rec++;s.push({cap:'<b>'+esc(say[e.trace])+'</b> receives <code>'+esc(e.prim)+'</code> on '+e.in.map(esc).join(', ')+' and '+esc((rule[e.trace]||{})[e.prim]||'processes it.'),cur:e.trace,rec:rec,i:i})});
    s.push({cap:'<b>Done.</b> One <code>sin</code> in your Python became three recorded equations on batched shapes; no number was computed. The jaxpr on the right is the real output of <code>jax.make_jaxpr(jax.vmap(f))</code> (the unused primal shows as <code>_</code>). jit now hands it to XLA.',cur:null,rec:rec,final:true});return s}
  function stepsE(){return [{cap:'<b>Same call, no transformation.</b> The current trace is the <code>EvalTrace</code> (chain table, last row). <code>sin_p.bind(x)</code> finds it.',cur:null,rec:0},
    {cap:'<b>EvalTrace</b> calls the primitive\'s <code>impl</code> on the real float32[2,3]: a small compiled program for <code>sin</code> runs on the device and returns a concrete array. No tangent, no batching, no record: one primitive, one dispatch.',cur:'EvalTrace',rec:0},
    {cap:'<b>Done.</b> Without transformations JAX behaves like PyTorch eager: each operation dispatched as Python reaches it. That is why un-jitted JAX is slow for many small ops.',cur:null,rec:0,final:true,eval:true}]}
  let S=stepsT();
  function draw(i){const st=S[i];const names=mode==='t'?['JVPTrace','BatchTrace','DynamicJaxprTrace']:['EvalTrace'];
    const lbl={JVPTrace:'JVPTrace <small>jax.jvp: tracers carry (primal, tangent)</small>',BatchTrace:'BatchTrace <small>jax.vmap: tracers carry (value, batch_dim = 0)</small>',DynamicJaxprTrace:'DynamicJaxprTrace <small>jax.jit: tracers are jaxpr variables</small>',EvalTrace:'EvalTrace <small>no transformation: real arrays</small>'};
    $('jc-disp-stack').innerHTML=names.map(n=>'<div class="jc-nest'+(st.cur===n?' cur':'')+'"><div class="nm">'+lbl[n]+'</div></div>').join('');
    let lines=[];if(mode==='t'){const all=J.tr.dispatch_log.jaxpr.split('\n');
      if(st.final)lines=all.map(l=>'<div>'+esc(l)+'</div>');else{const recs=L.filter(e=>e.trace==='DynamicJaxprTrace').slice(0,st.rec).map(e=>'<div class="on">'+esc(e.prim+' '+e.in.join(' '))+'</div>');lines=recs.length?recs:['<div class="dim">(nothing recorded yet)</div>']}}
    else lines=[st.eval||st.cur?'<div class="on">sin(x) computed: a concrete float32[2,3]</div>':'<div class="dim">(nothing yet)</div>'];
    $('jc-disp-jaxpr').innerHTML=lines.join('');$('jc-disp-cap').innerHTML=st.cap;
    const calls=mode==='t'?L.slice(0,st.i===undefined?(st.final?L.length:0):st.i+1).length:(i>0?1:0);
    $('jc-disp-cnt').innerHTML=RD.stat('process_primitive calls',calls,'logged in the run')+RD.stat('equations recorded',mode==='t'?st.rec:0,'by DynamicJaxprTrace')+RD.stat('Python sin calls',1,'in your code')}
  const an=RD.anim({card:'jc-disp-card',ctl:'jc-disp-ctl',n:S.length,draw,ms:2200,label:'Dispatch step'});
  RD.seg($('jc-disp-mode'),m=>{mode=m;S=m==='t'?stepsT():stepsE();an.reset(S.length);an.play()})})();

// annotated jaxpr
(function(){const txt=J.ex.items.cf.text;const leg=[['jc-k-const','constvars (closed-over arrays)'],['jc-k-in','invars'],['jc-k-prim','primitive'],['jc-k-par','params'],['jc-k-lit','literals'],['jc-k-out','outvars'],['jc-k-sub','sub-jaxpr (a param)']];
  const lines=txt.split('\n');let depth=0;
  const html=lines.map((ln,i)=>{let s=esc(ln);
    if(i===0){s=s.replace(/^\{ lambda ([^;]*);([^.]*)\./,(m,a,b)=>'{ lambda <span class="jc-k-const">'+a+'</span>;<span class="jc-k-in">'+b+'</span>.')}
    s=s.replace(/(-?\d+(?:\.\d+)?(?:e-?\d+)?):([a-z0-9]+\[\])/g,'<span class="jc-k-lit">$1:$2</span>');
    s=s.replace(/= ([a-z_0-9]+)(\[| )/,(m,p,b)=>'= <span class="jc-k-prim">'+p+'</span>'+b);
    s=s.replace(/^(\s+)([a-z_]+=)/,(m,sp,k)=>sp+'<span class="jc-k-par">'+k+'</span>');
    s=s.replace(/^(\s+in )(\([^)]*\))/,(m,a,b)=>a+'<span class="jc-k-out">'+b+'</span>');
    const inSub=/^\s{6,}/.test(ln)&&!/^\s{4}[a-z_]+:/.test(ln);
    return '<div'+(inSub?' class="jc-k-sub"':'')+'>'+s+'</div>'}).join('');
  $('jc-ann').innerHTML=html;
  $('jc-ann-leg').innerHTML=leg.map(([c,l])=>'<span data-c="'+c+'" style="cursor:default"><i class="'+c+'" style="border:1px solid var(--line)"></i>'+esc(l)+'</span>').join('');
  $('jc-ann-leg').querySelectorAll('span').forEach(s=>{const on=v=>$('jc-ann').querySelectorAll('.'+s.dataset.c).forEach(e=>e.style.outline=v?'2px solid var(--acc)':'');
    s.addEventListener('mouseenter',()=>on(1));s.addEventListener('mouseleave',()=>on(0));s.addEventListener('click',()=>{on(1);setTimeout(()=>on(0),1500)})})})();

// ---------------------------------------------------------------- section 4
(function(){const S=J.cf.support;const cols=['jit','grad','jvp','vmap'];
  const note={'cond':'one branch runs; under vmap with a batched predicate both run (select)','switch':'n-way cond on an int index','select / jnp.where':'both sides always computed','while_loop':'trip count decided at run time','fori_loop (static bounds)':'becomes scan','fori_loop (traced bound)':'becomes while','scan':'loop with a carry and stacked outputs; compiled once','map':'scan with no carry','associative_scan':'tree-shaped scan for associative combines'};
  let h='<thead><tr><th>primitive</th>'+cols.map(c=>'<th>'+c+'</th>').join('')+'<th>note</th></tr></thead><tbody>';
  Object.keys(S).forEach(k=>{h+='<tr><td><code>'+esc(k)+'</code></td>'+cols.map(c=>{const v=S[k][c];return v==='ok'?'<td class="ok">ok</td>':'<td class="no" title="'+esc(v)+'">error</td>'}).join('')+'<td class="small">'+esc(note[k]||'')+'</td></tr>'});
  $('jc-cfsup').innerHTML=h+'</tbody>';
  const bp=J.cf.cond_vmap.jaxpr_batched_prims;$('jc-condprims').innerHTML=Object.keys(bp).map(k=>'<code>'+esc(k)+'</code> x '+bp[k]).join(', ');
  let a='<thead><tr><th class="num">n</th><th class="num">scan ms</th><th class="num">associative_scan ms</th><th class="num">tree FLOPs (XLA)</th><th class="num">sequential FLOPs (2 x 256 x n)</th><th class="num">work ratio</th></tr></thead><tbody>';
  J.cf.assoc.rows.forEach(r=>{const seq=2*256*r.n;a+='<tr><td class="num">'+r.n.toLocaleString('en-US')+'</td><td class="num">'+r.scan_ms.toFixed(3)+'</td><td class="num">'+r.assoc_ms.toFixed(3)+'</td><td class="num">'+r.assoc_flops.toLocaleString('en-US')+'</td><td class="num">'+seq.toLocaleString('en-US')+'</td><td class="num">'+(r.assoc_flops/seq).toFixed(1)+'x</td></tr>'});
  $('jc-assoc').innerHTML=a+'</tbody><caption class="jc-cap" style="caption-side:bottom;text-align:left">Times: measured on Apple M1 Pro (CPU), shared machine, low priority, median of 7. FLOPs: XLA cost analysis of the tree version; the sequential count is derived (one multiply and one add per element per step), because cost analysis counts a loop body once.</caption>'})();

// ---------------------------------------------------------------- section 5
(function(){const R=J.ad.jac.rows;const ks=[...new Set(R.map(r=>r.k))],ms=[...new Set(R.map(r=>r.m))];let mode='ratio';
  function draw(){let h='<div class="hmwrap"><table class="hm" style="min-width:0"><thead><tr><th class="mh">k inputs \\ m outputs</th>'+ms.map(m=>'<th>'+m+'</th>').join('')+'</tr></thead><tbody>';
    ks.forEach(k=>{h+='<tr><th class="mh">'+k+'</th>';ms.forEach(m=>{const r=R.find(x=>x.k===k&&x.m===m);let txt,bg;
      if(mode==='ratio'){const q=r.fwd_flops/r.rev_flops;txt=q>1.05?'jacrev '+q.toFixed(1)+'x cheaper':q<0.95?'jacfwd '+(1/q).toFixed(1)+'x cheaper':'tie';
        const t=Math.max(-1,Math.min(1,Math.log10(q)/2));bg=t>0?'color-mix(in srgb,var(--c2) '+(15+60*t).toFixed(0)+'%,transparent)':'color-mix(in srgb,var(--c1) '+(15+60*-t).toFixed(0)+'%,transparent)'}
      else{const v=mode==='fwd'?r.fwd_flops:r.rev_flops;txt=(v/1e6).toFixed(2)+' MFLOP';const t=Math.log10(v/2.5e5)/Math.log10(160);bg='color-mix(in srgb,var(--c3) '+(10+60*Math.max(0,Math.min(1,t))).toFixed(0)+'%,transparent)'}
      h+='<td style="background:'+bg+'">'+txt+'</td>'});h+='</tr>'});
    $('jc-jac').innerHTML=h+'</tbody></table></div>';
    $('jc-jac-cap').innerHTML='Cells: XLA cost analysis of <code>jax.jit(jax.jacfwd(g))</code> and <code>jax.jit(jax.jacrev(g))</code>, deterministic. One forward pass of g is about '+(R[0].forward_flops/1e6).toFixed(2)+' MFLOP. Both Jacobians agree to '+U.sig(Math.max(...R.map(r=>r.max_diff)),2)+'. Wall times were measured too (in <code>out/ad.json</code>) but on a loaded CPU they are noise at this size.'}
  RD.seg($('jc-jac-mode'),m=>{mode=m;draw()});draw()})();
$('jc-vg-ratio').textContent=(J.ad.model.flops.value_and_grad/J.ad.model.flops['forward (loss)']).toFixed(2);
(function(){const M=J.ad,mb=v=>(v/1e6).toFixed(1)+' MB',kb=v=>(v/1e3).toFixed(1)+' KB';
  const jm=M.mlp.residuals.reduce((a,r)=>a+r.bytes,0),tm=M.mlp.torch_saved.reduce((a,r)=>a+r.bytes,0);
  $('jc-mlp-res').textContent='JAX '+M.mlp.residuals.length+' residuals, '+kb(jm)+'; PyTorch '+M.mlp.torch_saved.length+' saved tensors, '+kb(tm)+'; most of both is the 128 x 512 weight';
  const el=$('jc-resbars');el.innerHTML='<div id="jc-rb1"></div><div id="jc-rb2" style="margin-top:8px"></div>';
  U.bars($('jc-rb1'),[{nm:'MLP: JAX residuals ('+M.mlp.residuals.length+')',v:jm,txt:kb(jm),c:'var(--c1)'},{nm:'MLP: PyTorch saved ('+M.mlp.torch_saved.length+')',v:tm,txt:kb(tm),c:'var(--c2)'}]);
  const t=M.mem;U.bars($('jc-rb2'),[
    {nm:'Model: JAX residuals before XLA ('+M.model.n_residuals+')',v:M.model.residual_bytes,txt:mb(M.model.residual_bytes),c:'var(--c1)'},
    {nm:'Model: PyTorch saved tensors ('+M.model.torch_saved_count+')',v:M.model.torch_saved_bytes_nonparam+M.model.torch_saved_bytes_param,txt:mb(M.model.torch_saved_bytes_nonparam+M.model.torch_saved_bytes_param),c:'var(--c2)'},
    {nm:'XLA scratch: forward only',v:t['forward (loss)'].temp_size_in_bytes,txt:mb(t['forward (loss)'].temp_size_in_bytes),c:'var(--c3)'},
    {nm:'XLA scratch: value_and_grad',v:t.value_and_grad.temp_size_in_bytes,txt:mb(t.value_and_grad.temp_size_in_bytes),c:'var(--c3)',hl:1},
    {nm:'XLA scratch: value_and_grad, blocks checkpointed',v:t['value_and_grad, every block under jax.checkpoint'].temp_size_in_bytes,txt:mb(t['value_and_grad, every block under jax.checkpoint'].temp_size_in_bytes),c:'var(--c4)'}])})();
(function(){const H=J.ad.hess.flops;const rows=Object.keys(H).map(k=>({nm:k,v:H[k],txt:(H[k]/1e6).toFixed(2)+' MFLOP',c:k.startsWith('jacfwd(jacfwd')?'var(--c2)':k.startsWith('one')?'var(--c3)':'var(--c1)'}));
  U.bars($('jc-hess'),rows);$('jc-hvp-x').textContent=(H['one Hessian-vector product: jvp(grad)']/H.grad).toFixed(1)})();

// ---------------------------------------------------------------- sections 7 to 9
(function(){const R=J.pt.register;$('jc-treereg').innerHTML='<thead><tr><th>class</th><th>treedef</th><th>leaf paths</th></tr></thead><tbody>'+Object.keys(R).map(k=>'<tr><td>'+esc(k)+'</td><td class="mono">'+esc(R[k].treedef)+'</td><td class="mono">'+esc(R[k].paths.join('  '))+'</td></tr>').join('')+'</tbody>'})();
(function(){const S=J.arr8.spmd_axis_name;$('jc-spmd').innerHTML='<thead><tr><th></th><th>constraint in the batched jaxpr</th><th class="num">all-gathers</th><th class="num">all-reduces</th><th>output</th></tr></thead><tbody>'+Object.keys(S).map(k=>{const r=S[k];const c=(r.constraint_in_jaxpr.find(l=>l.startsWith('sharding='))||'').replace(/memory_kind=device\)/,'').replace('sharding=NamedSharding(','').replace(/, $/,'');
  return '<tr><td><code>'+esc(k)+'</code></td><td class="mono">'+esc(c)+'</td><td class="num">'+r.all_gather+'</td><td class="num">'+r.all_reduce+'</td><td class="mono">'+esc(r.out_sharding)+', matches unsharded to '+U.sig(r.max_diff_vs_unsharded,2)+'</td></tr>'}).join('')+'</tbody>'})();
(function(){const I=J.pr.impls;const order=['threefry2x32','threefry4x32','philox2x32','philox4x32','rbg','unsafe_rbg'];
  $('jc-prng').innerHTML='<thead><tr><th>impl</th><th>key dtype</th><th>key data</th><th>first 3 normals of key(0)</th><th class="num">ms, 4M normals</th><th>vmap over keys exact</th></tr></thead><tbody>'+order.filter(k=>I[k]).map(k=>{const r=I[k];return '<tr><td><code>'+k+'</code>'+(k===J.pr.default_impl?' (default)':'')+'</td><td class="mono">'+esc(r.dtype)+'</td><td class="mono">uint32'+esc(JSON.stringify(r.key_shape).replace(/,/g,', '))+'</td><td class="mono">'+r.first3.join(', ')+'</td><td class="num">'+r.ms_4M_normals.toFixed(1)+'</td><td class="'+(r.vmap_equals_loop?'ok':'no')+'">'+(r.vmap_equals_loop?'yes':'no: first key only')+'</td></tr>'}).join('')+'</tbody>'})();

// ---------------------------------------------------------------- section 10: the primitive stepper
(function(){const P=J.pm.steps,cols=['eager','make_jaxpr','jit','jvp','grad','vmap'];
  function draw(i){let h='<div class="jc-steps"><div class="h rl">after this rule</div>'+cols.map(c=>'<div class="h">'+c+'</div>').join('');
    P.forEach((s,j)=>{const short=['bind only','+ impl','+ abstract eval','+ lowering','+ JVP','+ transpose','+ batching'][j];
      h+='<div class="rl'+(j===i?' cur':'')+'" style="'+(j>i?'opacity:.3':'')+'">'+short+'</div>'+cols.map(c=>{const v=s.result[c];const ok=v==='ok';return '<div class="'+(j>i?'':(ok?'ok':'no'))+(j===i?' cur':'')+'" style="'+(j>i?'opacity:.3':'')+'" title="'+esc(v)+'">'+(j>i?'':(ok?'ok':'error'))+'</div>'}).join('')});
    $('jc-prim-grid').innerHTML=h+'</div>';$('jc-prim-code').textContent=P[i].code;
    const errs=cols.map(c=>P[i].result[c]).filter(v=>v!=='ok');const first=errs.length?errs[0]:null;
    $('jc-prim-cap').innerHTML='<b>Step '+(i+1)+' of '+P.length+': '+esc(P[i].title)+'.</b> '+(first?'Next failure, as JAX reported it: <code>'+esc(first)+'</code>':'Every transformation works. Final check: eager, jit and grad give '+esc(JSON.stringify(J.pm.final.eager))+', '+esc(JSON.stringify(J.pm.final.jit))+' and '+esc(JSON.stringify(J.pm.final.grad))+' (expected gradient 3 = d(2x + x)/dx); vmap output shape '+esc(JSON.stringify(J.pm.final.vmap_shape))+'.')}
  RD.anim({card:'jc-prim-card',ctl:'jc-prim-ctl',n:P.length,draw,ms:2600,label:'Rule step'})})();
})();
