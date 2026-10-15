// ---- Custom derivatives tab (t-jccv): swept values and gradients of each variant, NaN/inf marked; the fixed point and clip cases.
(function(){
const J=window.JC, U=window.JCU, esc=RD.esc, $=id=>document.getElementById(id), C=J.cv;
const CASES={
 softplus:{t:'softplus, log(1 + exp(x))',sw:C.softplus.sweep,code:C.softplus.code,xs:'x from -120 to 120, step 1',
   txt:'The naive formula overflows: exp(x) is inf above x = '+C.softplus.exp_overflow_f32.toFixed(2)+', so the value is inf and the gradient (inf / inf) NaN from x = '+C.softplus.first_nan_grad_x+'. The custom_jvp rule repairs the gradient only; the rewrite repairs both but returns gradient 0 at the kink x = 0; jax.nn.softplus is right everywhere.'},
 norm:{t:'norm of (x, 0, 0) through the origin',sw:C.norm.sweep,code:C.norm.code,xs:'x from -1 to 1, step 0.1',
   txt:'sqrt(sum x^2) is |x| here. Its gradient is NaN exactly at 0 for the naive form and for jnp.linalg.norm (jax 0.11.2); the custom_jvp rule and the double where return 0, a valid subgradient. The true derivative jumps from -1 to 1.'},
 where:{t:'jnp.where(x > 0, sqrt(x), 0)',sw:C.where.sweep,code:C.where.code,xs:'x from -1 to 1, step 0.1',
   txt:'The value is right everywhere; the gradient is NaN for every x <= 0, because the untaken sqrt branch has an infinite or NaN derivative and the where multiplies it by zero. PyTorch '+C.where.torch.version+' gave the same: '+JSON.stringify(C.where.torch.grad)+' at x = -1, 0, 0.25.'},
 fp:{t:'fixed point z = tanh(W z + x), custom_vjp'},
 clip:{t:'clip_gradient, a backward-only rule'}};
const COL=['var(--c2)','var(--c1)','var(--c3)','var(--c4)','var(--mute)'];
let cur='softplus',hide={},xi=null;
const num=v=>typeof v==='number'?v:NaN;
function chart(el,sw,key,vars){const w=RD.width(el),h=Math.max(170,Math.min(240,w*0.45)),m={l:46,r:10,t:16,b:28};const X=sw.x;
  let ys=[];vars.forEach(v=>sw[v][key].forEach(y=>{const n=num(y);if(isFinite(n))ys.push(n)}));
  let y0=ys.length?Math.min(...ys):-1,y1=ys.length?Math.max(...ys):1;if(y0===y1){y0-=1;y1+=1}const pad=(y1-y0)*0.06;y0-=pad;y1+=pad;
  const sx=x=>m.l+(x-X[0])/(X[X.length-1]-X[0])*(w-m.l-m.r),sy=y=>m.t+(1-(y-y0)/(y1-y0))*(h-m.t-m.b);
  let b='';for(let k=0;k<=4;k++){const yv=y0+(y1-y0)*k/4;b+='<line x1="'+m.l+'" x2="'+(w-m.r)+'" y1="'+sy(yv)+'" y2="'+sy(yv)+'" stroke="var(--line)"/>'+RD.t(m.l-4,sy(yv)+3,U.sig(yv,3),{a:'end',fs:10,fill:'var(--mute)'})}
  [X[0],X[Math.floor(X.length/2)],X[X.length-1]].forEach(x=>{b+=RD.t(sx(x),h-10,U.sig(x,3),{a:'middle',fs:10,fill:'var(--mute)'})});
  vars.forEach((v,vi)=>{const c=v==='float64 reference'?'var(--mute)':COL[vi%COL.length];let d='',pen=false;
    sw[v][key].forEach((y,i)=>{const n=num(y);if(isFinite(n)){d+=(pen?'L':'M')+sx(X[i]).toFixed(1)+','+sy(n).toFixed(1);pen=true}else{pen=false;b+='<line x1="'+sx(X[i])+'" x2="'+sx(X[i])+'" y1="'+(m.t-12+vi*2)+'" y2="'+(m.t-4+vi*2)+'" stroke="var(--bad)" stroke-width="2"/>'}});
    b+='<path d="'+d+'" fill="none" stroke="'+c+'" stroke-width="'+(v==='float64 reference'?1:1.8)+'"'+(v==='float64 reference'?' stroke-dasharray="4 3"':'')+'/>'});
  if(xi!==null)b+='<line x1="'+sx(X[xi])+'" x2="'+sx(X[xi])+'" y1="'+m.t+'" y2="'+(h-m.b)+'" stroke="var(--acc)" stroke-dasharray="2 2"/>';
  b+=RD.t(m.l,10,key==='value'?'value f(x)':'gradient df/dx',{fs:11,w:600});
  el.innerHTML=RD.svg(w,h,b,key+' against x')}
function draw(){const c=CASES[cur],B=$('jccv-body');
  if(c.sw){const vars=Object.keys(c.sw).filter(k=>k!=='x');if(xi===null||xi>=c.sw.x.length)xi=Math.floor(c.sw.x.length/2);
    B.innerHTML='<p>'+esc(c.txt)+'</p><div class="jc-sel" id="jccv-vars">'+vars.map((v,i)=>'<label class="chk"><input type="checkbox" data-v="'+esc(v)+'"'+(hide[v]?'':' checked')+'> <span style="color:'+(v==='float64 reference'?'var(--mute)':COL[i%COL.length])+'">&#9632;</span> '+esc(v)+'</label>').join('')+'</div>'+
      '<div id="jccv-c1" class="plot"></div><div id="jccv-c2" class="plot"></div><label class="small">Read at x: <input type="range" id="jccv-x" min="0" max="'+(c.sw.x.length-1)+'" value="'+xi+'" aria-label="x position"></label><div class="tw"><table class="jc-t" id="jccv-tab"></table></div><div class="jc-cap">Sweep: '+esc(c.xs)+'; float32, jitted and vmapped. Red ticks: NaN or inf at that x (one row of ticks per variant, in legend order).</div><pre class="jc-code">'+esc(c.code)+'</pre>';
    const shown=vars.filter(v=>!hide[v]);chart($('jccv-c1'),c.sw,'value',shown);chart($('jccv-c2'),c.sw,'grad',shown);
    const tab=$('jccv-tab');tab.innerHTML='<thead><tr><th>variant at x = '+c.sw.x[xi]+'</th><th class="num">value</th><th class="num">gradient</th></tr></thead><tbody>'+vars.map(v=>{const a=c.sw[v].value[xi],g=c.sw[v].grad[xi];const f=y=>typeof y==='number'?U.sig(y,6):y;
      return '<tr><td>'+esc(v)+'</td><td class="num'+(typeof a!=='number'?' no':'')+'">'+esc(f(a))+'</td><td class="num'+(typeof g!=='number'?' no':'')+'">'+esc(f(g))+'</td></tr>'}).join('')+'</tbody>';
    B.querySelectorAll('#jccv-vars input').forEach(i=>i.addEventListener('change',()=>{hide[i.dataset.v]=!i.checked;draw()}));
    $('jccv-x').addEventListener('input',e=>{xi=+e.target.value;draw();const r=$('jccv-x');if(r)r.focus()});
  } else if(cur==='fp'){const F=C.fixed_point,R=F.residual_bytes_unrolled_by_n;
    B.innerHTML='<p>The layer z = tanh(W z + x) with W of 128 x 128 scaled to a contraction, solved by iteration until the change is below 1e-6 ('+F.iters_to_converge+' iterations here). Reverse mode through the <code>while_loop</code> solver fails:</p><pre class="jc-code jc-err wrap">'+esc(F.while_grad_error)+'</pre><p>The implicit rule saves only the solution and solves an adjoint fixed point in the backward pass. Its gradients match differentiating a fixed-length unrolled loop of the same '+F.iters_to_converge+' steps to '+U.sig(F.grad_diff_W,2)+' (W) and '+U.sig(F.grad_diff_x,2)+' (x; largest gradient '+U.sig(F.max_grad_x,3)+'). What each keeps for the backward pass (bytes of residuals, from <code>saved_residuals</code>):</p><div id="jccv-fpb"></div><p class="small">The implicit rule\'s residuals ('+F.residuals_implicit.join(', ')+') do not depend on the iteration count; the unrolled loop stores a carry per step. Forward mode is the price: <code>'+esc(F.jvp_of_custom_vjp_error)+'</code></p><pre class="jc-code">'+esc(F.code)+'</pre>';
    U.bars($('jccv-fpb'),[{nm:'custom_vjp, any iteration count',v:F.residual_bytes_implicit,txt:F.residual_bytes_implicit.toLocaleString('en-US'),c:'var(--c3)',hl:1}].concat(Object.keys(R).map(k=>({nm:'unrolled scan, '+k+' steps',v:R[k],txt:R[k].toLocaleString('en-US'),c:'var(--c2)'}))))}
  else {const K=C.clip;B.innerHTML='<p>A <code>custom_vjp</code> can leave the forward pass alone and change only what flows back: here an identity whose backward clips the cotangent to [-1, 1]. The unclipped gradient '+esc(JSON.stringify(K.unclipped))+' became <b>'+esc(JSON.stringify(K.grad))+'</b>. The same pattern gives straight-through estimators (round in the forward pass, identity in the backward) and gradient reversal layers.</p><pre class="jc-code">'+esc(K.code)+'</pre><p class="small">In the jaxpr the function becomes a <code>custom_vjp_call</code> carrying <code>fwd</code> and <code>bwd</code>:</p><pre class="jc-code">'+esc(J.cv.custom_vjp_jaxpr)+'</pre><p class="small">and a <code>custom_jvp</code> function a <code>custom_jvp_call</code> carrying its rule (still differentiable in reverse mode: grad of the softplus with a custom JVP at x = 100 is '+esc(String(J.cv.custom_jvp_reverse_ok))+'):</p><pre class="jc-code">'+esc(J.cv.custom_jvp_jaxpr)+'</pre>'}}
$('jccv-pick').innerHTML='<span class="seg" id="jccv-seg">'+Object.keys(CASES).map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+esc(CASES[k].t)+'</button>').join('')+'</span>';
RD.seg($('jccv-seg'),m=>{cur=m;xi=null;draw()});
U.onTab('t-jccv',draw);U.onResize('t-jccv',draw);draw();
})();
