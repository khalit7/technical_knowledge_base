// ---- Training lab (t-train): helpers, numbers in prose, snippets, the five-framework table and code, the optax chain builder ----
window.TR=(function(){
  const D=window.TRD,RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-train']=window.TAB_RENDER['t-train']||[]).push(f)};
  const tabVisible=()=>{const t=$('t-train');return t&&!t.hidden&&t.offsetParent!==null};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // number formats used by data-f: ',' integer with separators, '0'..'6' fixed decimals, 'e1'/'e2' scientific, 's' string, 'l6' list
  function sci(v,d){if(v===0)return '0';const e=Math.floor(Math.log10(Math.abs(v)));let m=v/Math.pow(10,e);
    if(Math.abs(+m.toFixed(d))>=10){m/=10;return (+m.toFixed(d)).toFixed(d)+'e'+(e+1)}return m.toFixed(d)+'e'+e}
  function fmt(v,f){if(v===null||v===undefined)return 'never';
    if(f===',')return Math.round(v).toLocaleString('en-US');if(f==='s')return String(v);
    if(f&&f[0]==='e')return sci(v,+f.slice(1));if(f&&f[0]==='l')return v.map(x=>x.toFixed(+f.slice(1))).join(', ');
    return (+v).toFixed(+(f||0))}
  function get(path){let o=D;for(const p of path.split('.')){if(o==null)return undefined;
    if(Array.isArray(o)&&/^-?\d+$/.test(p)){const i=+p;o=o[i<0?o.length+i:i]}else o=o[p]}return o}
  function fillNumbers(){document.querySelectorAll('#t-train .tr-v[data-k]').forEach(s=>{s.textContent=fmt(get(s.dataset.k),s.dataset.f)})}
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const t=(x,y,s,o)=>{o=o||{};return '<text x="'+x.toFixed(1)+'" y="'+y.toFixed(1)+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const seg=(el,f)=>el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)});
  // a line chart: series [{pts:[[x,y]...], color, dash, w, dots}], log y optional; returns svg string
  function chart(W,H,o){const L=o.left||46,R=10,T=10,B=28,pw=W-L-R,ph=H-T-B;
    const lg=!!o.logy,ty=v=>lg?Math.log10(Math.max(v,o.ymin)):v;
    const y0=ty(o.ymin),y1=ty(o.ymax),X=v=>L+(v-o.xmin)/(o.xmax-o.xmin)*pw,Y=v=>T+ph-(ty(v)-y0)/(y1-y0)*ph;
    let s='<rect x="'+L+'" y="'+T+'" width="'+pw+'" height="'+ph+'" fill="none" stroke="var(--line)"/>';
    (o.yticks||[]).forEach(v=>{const y=Y(v);s+='<line x1="'+L+'" x2="'+(L+pw)+'" y1="'+y.toFixed(1)+'" y2="'+y.toFixed(1)+'" stroke="var(--line)"/>'+t(L-4,y+3.5,o.yfmt?o.yfmt(v):v,{a:'end',fs:10,fill:'var(--mute)'})});
    (o.xticks||[]).filter(v=>v>=o.xmin&&v<=o.xmax).forEach(v=>{const x=X(v);s+=t(x,T+ph+14,o.xfmt?o.xfmt(v):v,{a:v===o.xmax&&String(o.xfmt?o.xfmt(v):v).length>3?'end':'middle',fs:10,fill:'var(--mute)'})});
    if(o.xlabel)s+=t(L+pw/2,H-2,o.xlabel,{a:'middle',fs:10,fill:'var(--mute)'});
    if(o.ylabel)s+=t(4,T+8,o.ylabel,{fs:10,fill:'var(--mute)'});
    (o.series||[]).forEach(se=>{const p=se.pts.filter(q=>q[1]!=null&&isFinite(q[1]));if(!p.length)return;
      if(se.dots){p.forEach(q=>{s+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="'+(se.r||3)+'" fill="'+se.color+'"/>'});return}
      s+='<path d="'+p.map((q,i)=>(i?'L':'M')+X(q[0]).toFixed(1)+' '+Y(q[1]).toFixed(1)).join('')+'" fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.6)+'"'+(se.dash?' stroke-dasharray="'+se.dash+'"':'')+(se.op?' opacity="'+se.op+'"':'')+'/>'});
    (o.extra||[]).forEach(f=>{s+=f(X,Y,{L,T,pw,ph})});
    return svg(W,H,s,o.label)}
  // step-animation controller (play, pause, step, scrub, speed), animates only when on screen in the visible tab
  function anim(o){const card=$(o.card),ctl=$(o.ctl),st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1},pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option><option value="4">4x</option></select></label>';
    const q=s=>$(pid+s);
    function show(){q('s').max=st.n-1;q('s').value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&tabVisible();
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1200)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1200)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;q('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';q('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    q('p').addEventListener('click',()=>setPlay(!st.play));
    q('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    q('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    q('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    q('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&tabVisible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {redraw(){o.draw(st.i)},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},get i(){return st.i}}}
  let rz=[];addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(rz.t);rz.t=setTimeout(()=>rz.forEach(f=>{try{f()}catch(e){}}),80)});
  const onResize=f=>rz.push(f);
  return {D,RM,$,esc,fmt,get,fillNumbers,svg,t,stat,seg,chart,anim,onRender,onResize,width,tabVisible};
})();

// ---- numbers in prose, code snippets with their real output ----
(function(){const {D,$,esc}=TR;
  TR.fillNumbers();
  const v=D.snipv;
  document.querySelectorAll('#t-train [id^="tr-snip-"]').forEach(el=>{const k=el.id.slice(8),s=D.snip[k];if(!s)return;
    el.innerHTML='<pre class="tr-code">'+esc(s.code)+'</pre>'+(s.output?'<pre class="tr-code tr-out">'+esc(s.output)+'</pre>':'')+
      '<p class="tr-cap">Ran with jax '+v.jax+', flax '+v.flax+' and optax '+v.optax+' on Apple M1 Pro (CPU); output as printed (<code>src/train/nnx_tour.py</code>).</p>'});
  const g=$('tr-grain-code');if(g)g.textContent=D.grain_code;
})();

// ---- five frameworks: table and side-by-side code ----
(function(){const {D,$,esc,fmt,seg}=TR;const R=D.fw.res,V=D.fw.versions;
  const rows=[
    ['PyTorch '+V.torch,'attributes of the nn.Module object','<code>model(x)</code>; autograd records on the fly','[out, in]',null],
    ['Flax NNX '+V.flax,'<code>nnx.Param</code> attributes of the module object; <code>nnx.split</code> separates them as a pytree','<code>model(x)</code>, under <code>nnx.jit</code> / <code>nnx.grad</code>','[in, out] (<code>kernel</code>)',R.nnx],
    ['Flax Linen '+V.flax,'a separate nested dict returned by <code>init</code>','<code>model.apply(params, x)</code>','[in, out]',R.linen],
    ['Equinox '+V.equinox,'the module is the pytree (dataclass fields)','<code>jax.vmap(model)(x)</code>: layers take one example','[out, in]',R.equinox],
    ['Haiku '+V.haiku+' (legacy)','a separate dict from <code>hk.transform(f).init</code>','<code>f.apply(params, x)</code>','[in, out] (<code>w</code>)',R.haiku]];
  $('tr-fwtab').innerHTML=rows.map(r=>'<tr><td><b>'+r[0]+'</b></td><td>'+r[1]+'</td><td>'+r[2]+'</td><td>'+r[3]+'</td><td class="num">'+(r[4]==null?'reference':fmt(r[4],'e1'))+'</td></tr>').join('');
  const name={nnx:'Flax NNX (model_nnx.py, the running example)',linen:'Flax Linen (frameworks.py)',equinox:'Equinox (frameworks.py)',haiku:'Haiku (frameworks.py)'};
  const cap={nnx:'The same three classes as PyTorch, with <code>rngs</code> passed explicitly and <code>__call__</code> instead of <code>forward</code>.',
    linen:'One <code>@nn.compact</code> method creates the submodules inline; the weights are not here at all, they come back from <code>init</code> as a dict.',
    equinox:'Fields are declared like a dataclass; the module acts on one sequence [T, D], so each layer is <code>jax.vmap</code>-ed over positions and the whole block over the batch.',
    haiku:'A plain function; <code>hk.Linear</code> and <code>hk.LayerNorm</code> create parameters the first time they run under <code>hk.transform</code>.'};
  $('tr-fw-l').textContent=D.fw.code.torch;
  function show(m){$('tr-fw-rh').textContent=name[m];$('tr-fw-r').textContent=D.fw.code[m];$('tr-fw-cap').innerHTML=cap[m]+' Max difference from PyTorch on the same input: '+fmt(R[m],'e1')+'.'}
  seg($('tr-fwseg'),show);show('nnx');
})();

// ---- optax chain builder: a JavaScript re-implementation of optax 0.2.8's transformations ----
(function(){const {D,$,esc,seg,chart,width,onRender,onResize}=TR;const C=D.chain;
  const st={opt:'adamw',sched:'constant',lr:0.001};
  const short=s=>s.replace('blocks.0.mlp.fc1.weight','fc1.w').replace('blocks.0.ln1.weight','ln1.scale');
  function code(c){const L=[];if(c.clip)L.push('    optax.clip_by_global_norm(0.05),');
    const lr=c.sched==='constant'?String(c.lr):c.sched==='warmup'?'lambda c: '+c.lr+' * jnp.minimum(1.0, (c + 1) / 3)':'optax.warmup_cosine_decay_schedule(0.0, '+c.lr+', 2, 6, end_value=0.0)';
    const mk=c.mask?', mask=decay_mask':'';
    L.push('    optax.'+(c.opt==='momentum'?'sgd':c.opt)+'('+lr+(c.opt==='momentum'?', momentum=0.9':'')+((c.opt==='adamw'||c.opt==='lion')?', weight_decay='+c.wd+mk:'')+'),');
    return 'tx = optax.chain(\n'+L.join('\n')+'\n)\nstate = tx.init(params)                       # 8 scalars\nfor g in grads:                                # steps 0..5\n    updates, state = tx.update(g, state, params)\n    params = optax.apply_updates(params, updates)'}
  function draw(){const wdOK=st.opt==='adamw'||st.opt==='lion';
    $('tr-ch-wd').disabled=!wdOK;$('tr-ch-mask').disabled=!wdOK||!$('tr-ch-wd').checked;
    const c={opt:st.opt,sched:st.sched,lr:st.lr,clip:$('tr-ch-clip').checked?0.05:0,wd:wdOK&&$('tr-ch-wd').checked?0.1:0,mask:$('tr-ch-mask').checked};
    $('tr-ch-code').textContent=code(c);
    const r=window.TROPT(c,C.grads,C.params0,C.mask);
    // small multiples: one panel per coordinate, parameter minus its start, over steps 0..6
    const W=width($('tr-ch-plot')),cols=W<520?2:4,pw=Math.floor(W/cols),ph=110;let html='<div style="display:grid;grid-template-columns:repeat('+cols+',1fr)">';
    C.coords.forEach((nm,i)=>{const ys=[0].concat(r.params.map(p=>p[i]-C.params0[i]));let mx=Math.max(1e-9,...ys.map(Math.abs));
      const pts=ys.map((y,k)=>[k,y]);
      html+='<div>'+chart(pw,ph,{left:40,xmin:0,xmax:6,ymin:-mx*1.1,ymax:mx*1.1,yticks:[-mx,0,mx],yfmt:v=>v===0?'0':v.toExponential(0),xticks:[0,6],
        series:[{pts,color:C.mask[i]?'var(--c1)':'var(--c2)',w:1.8},{pts,color:C.mask[i]?'var(--c1)':'var(--c2)',dots:1,r:2}],
        extra:[()=>'<text x="44" y="22" font-size="10" fill="var(--mute)">'+esc(short(nm))+'</text>'],label:'Parameter '+nm+' over 6 steps'})+'</div>'});
    $('tr-ch-plot').innerHTML=html+'</div>';
    const last=r.updates[5];
    $('tr-ch-cap').innerHTML='Each panel: one parameter minus its starting value after each of the 6 updates (blue: a weight, decayed when weight decay is on; orange: a LayerNorm scale, decayed only without the mask). Last update, all 8: <span class="tr-u">'+last.map(x=>x.toExponential(2)).join(', ')+'</span>. '+
      (st.opt==='sgd'?'SGD: the update is the gradient times the learning rate, so it shrinks as the gradients shrink.':st.opt==='momentum'?'Momentum accumulates the gradients, so updates grow while they keep their sign.':st.opt==='lion'?'Lion takes only the sign of a momentum mix: every update has the same size, the learning rate (plus decay).':'Adam divides by the running root-mean-square of each coordinate\'s gradient, so all eight move by about the learning rate whatever their gradient size; at step 1 the move is almost exactly the learning rate.');
  }
  seg($('tr-ch-opt'),m=>{st.opt=m;draw()});seg($('tr-ch-sch'),m=>{st.sched=m;draw()});seg($('tr-ch-lr'),m=>{st.lr=+m;draw()});
  ['tr-ch-clip','tr-ch-wd','tr-ch-mask'].forEach(id=>$(id).addEventListener('change',draw));
  $('tr-ch-check').textContent=D.chainCheck||'run check_train.mjs';
  onRender(draw);onResize(draw);
})();
