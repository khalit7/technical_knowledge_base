// ---- Transforms lab (t-xf): shared helpers, step animation, render registry, inline numbers ----
window.XF=(function(){
  const D=window.XFD;
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const $=id=>document.getElementById(id);
  const tab=()=>$('t-xf');
  const visible=()=>{const t=tab();return t&&!t.hidden&&!document.hidden};
  const renders=[];
  function onRender(f){renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-xf']=window.TAB_RENDER['t-xf']||[]).push(()=>{try{f()}catch(e){console.error(e);throw e}})}
  let rz=0;addEventListener('resize',()=>{if(!visible())return;clearTimeout(rz);rz=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){console.error(e)}}),120)});
  const width=el=>{const w=el&&el.getBoundingClientRect().width;return w&&w>40?Math.floor(w):Math.max(280,Math.min(880,(document.documentElement.clientWidth||900)-40))};
  const sci=x=>{if(x==null)return 'n/a';if(x===0)return '0';if(isNaN(x))return 'nan';const e=Math.floor(Math.log10(Math.abs(x)));if(e>=-2&&e<4)return (+x.toPrecision(3)).toString();const m=x/Math.pow(10,e);return (+m.toFixed(1))+'e'+e};
  const n0=x=>Math.round(x).toLocaleString('en-US');
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  function seg(el,f){el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!el.contains(b))return;el.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});f(b.dataset.v)})}
  // step animation: o {card, ctl, n, draw(i), ms, label}; plays once when first on screen in the visible tab (never under reduced motion)
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);
    const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};
    const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button>'+
      '<button id="'+pid+'p" aria-label="Play">&#9654; Play</button>'+
      '<button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button>'+
      '<input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+esc(o.label||'Step')+'">'+
      '<label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5×</option><option value="1" selected>1×</option><option value="2">2×</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&visible()&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;
      if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}
      st.timer=setTimeout(tick,(o.ms||1400)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1400)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');
      if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
      if(st.vis&&!st.started&&card.offsetParent&&visible()){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});
    show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},go(i){setPlay(false);st.i=Math.max(0,Math.min(st.n-1,i));show()},get i(){return st.i}};
  }
  // inline numbers and texts from the data: <span data-xf="key"> and <pre data-xf-text="key">
  const B=D.basics,G=D.grad,V=D.vmap,T=D.trace;
  const fl=a=>'['+a.map(v=>(+v).toFixed(Math.abs(v)<10?4:2).replace(/\.?0+$/,'')).join(', ')+']';
  const vals={
    'ver.jax':D.versions.jax,
    'tr.att_n':T.attention.eqns.length,
    'tr.weak':T.typeof.py_float,
    'tr.cond_val':fl(T.cf_values.cond_jit),
    'side.nprand':B.np_random_in_jit.join(', '),
    'side.time':B.time_in_jit_same?'identical':'different',
    'side.global':(()=>{const d=D.drills.find(x=>x.id==='global');return d?d.value.first+' and '+d.value.second:'n/a'})(),
    'oob.get':B.oob.jax_get,'oob.neg':B.oob.jax_get_neg,'oob.torch':B.oob.torch_get,'immut.fill':fl(B.immut.get_fill),
    'prng.reuse':(100*B.prng.reuse_same_mask_frac).toFixed(1)+'%','prng.split':(100*B.prng.split_same_mask_frac).toFixed(1)+'%',
    'prng.foldsame':(JSON.stringify(B.prng.fold_in[0])===JSON.stringify(B.prng.split_normals[0])&&JSON.stringify(B.prng.fold_in[1])===JSON.stringify(B.prng.split_normals[1]))?'identical first three values':'different values',
    'prng.p8':sci(Math.max(D.prng8['partitionable=True'].max_diff_rows_vs_one,D.prng8['partitionable=True'].max_diff_grid_vs_one)),
    'prng.part':String(B.prng.partitionable_default),
    'prng.modes':sci(D.prng8.max_diff_between_modes),
    'pt.nnx':D.pytree.nnx_n_leaves+' leaves and '+n0(D.pytree.nnx_n_params)+' parameters, the same as the plain-JAX dict ('+D.pytree.n_leaves+' leaves) and PyTorch\'s state_dict ('+D.pytree.n_torch_tensors+' tensors)',
    'gr.aux':'loss '+G.has_aux.loss+', accuracy '+G.has_aux.aux.accuracy+' (untrained model), max logit '+G.has_aux.aux.max_logit,
    'gr.auxdiff':sci(G.has_aux.grad_equal_to_plain),
    'gr.d2':(+G.higher.d2).toFixed(6),'gr.d2f':(+G.higher.d2_formula).toFixed(6),
    'vm.bytes':(V.grad_bytes/1e6).toFixed(1)+' MB','vm.eq1':V.eqns.grad,'vm.eq2':V.eqns.vmap_grad,
    'toy.n':D.toy.code_lines
  };
  const texts={
    'tr.err_if':T.cf_errors.if_under_jit,'tr.err_int':T.cf_errors.int_under_jit,'side.leak':B.side.leak,
    'immut.setitem':B.immut.setitem,'pt.mismatch':B.tree_map_mismatch,'gr.auxmiss':G.has_aux_missing
  };
  document.querySelectorAll('#t-xf [data-xf]').forEach(el=>{const k=el.dataset.xf;el.textContent=k in vals?vals[k]:'n/a'});
  document.querySelectorAll('#t-xf [data-xf-text]').forEach(el=>{const k=el.dataset.xfText;el.textContent=texts[k]||'n/a'});
  // links written by scripts to other tabs
  function tabLinks(el){el.addEventListener('click',e=>{const a=e.target.closest('a[data-tab]');if(!a)return;e.preventDefault();
    const b=document.querySelector('#tabs button[data-t="'+a.dataset.tab+'"]');if(b){b.click();$('tabs').scrollIntoView({block:'start'})}})}
  // in-tab nav: scroll within the page
  const nav=$('xf-nav');if(nav)nav.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;e.preventDefault();const s=document.querySelector(a.getAttribute('href'));if(s)s.scrollIntoView({block:'start',behavior:RM?'auto':'smooth'})});
  return {D,RM,esc,$,onRender,width,sci,n0,stat,seg,anim,tabLinks,visible};
})();
