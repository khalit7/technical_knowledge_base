// ---- Sharding lab (t-shard): helpers, step-animation controller, static fills from window.SHD ----
window.SH=(function(){
  const D=window.SHD,TAB='t-shard';
  const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
  const $=id=>document.getElementById(id);
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const onRender=f=>{(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER[TAB]=window.TAB_RENDER[TAB]||[]).push(f)};
  const tabVisible=()=>{const t=$(TAB);return t&&!t.hidden&&t.offsetParent!==null};
  const onResize=f=>{let t=0;addEventListener('resize',()=>{if(!tabVisible())return;clearTimeout(t);t=setTimeout(f,60)})};
  const width=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
  // bytes, decimal units (kB = 1,000 B, MB = 10^6 B)
  const fmtB=b=>{if(b==null)return '';if(b<1000)return Math.round(b)+' B';if(b<1e6)return (b/1e3).toFixed(b<1e4?2:1)+' kB';if(b<1e9)return (b/1e6).toFixed(b<1e7?2:1)+' MB';return (b/1e9).toFixed(2)+' GB'};
  const fmtN=n=>Number(n).toLocaleString('en-US');
  const KC={'all-reduce':'k-ar','all-gather':'k-ag','reduce-scatter':'k-rs','all-to-all':'k-a2a','collective-permute':'k-cp'};
  const KV={'all-reduce':'var(--c2)','all-gather':'var(--c1)','reduce-scatter':'var(--c3)','all-to-all':'var(--c4)','collective-permute':'var(--c6)'};
  const chip=(k,t)=>'<span class="sh-coll '+KC[k]+'">'+esc(t||k)+'</span>';
  // bytes each device sends on a ring of g devices (same rule as src/shard/sh_common.py ring_bytes)
  const ring=(k,N,g)=>{if(k==='collective-permute')return N;if(!g||g===1)return 0;if(k==='all-reduce')return 2*(g-1)*N/g;return (g-1)*N/g};
  const stat=(k,v,d)=>'<div class="stat"><div class="k">'+k+'</div><div class="v">'+v+'</div><div class="d">'+(d||'')+'</div></div>';
  const seg=(el,items,cur,f)=>{el.insertAdjacentHTML('beforeend',items.map(it=>'<button data-m="'+esc(it[0])+'"'+(it[0]===cur?' class="on"':'')+'>'+it[1]+'</button>').join(''));
    el.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));f(b.dataset.m)})};
  const svg=(w,h,body,label)=>'<svg viewBox="0 0 '+w+' '+h+'" width="'+w+'" height="'+h+'" role="img" aria-label="'+esc(label||'')+'">'+body+'</svg>';
  const tx=(x,y,s,o)=>{o=o||{};return '<text x="'+x+'" y="'+y+'"'+(o.a?' text-anchor="'+o.a+'"':'')+' font-size="'+(o.fs||11)+'"'+(o.fill?' fill="'+o.fill+'"':'')+(o.w?' font-weight="'+o.w+'"':'')+'>'+s+'</text>'};
  // step animation: plays only while its card is on screen in the visible tab; paused under reduced motion
  function anim(o){
    const card=$(o.card),ctl=$(o.ctl);const st={i:0,n:o.n,play:false,timer:0,vis:false,started:false,spd:1};const pid=o.ctl+'-';
    ctl.innerHTML='<button id="'+pid+'b" aria-label="Previous step" title="Previous step">&#9664;&#9664;</button><button id="'+pid+'p" aria-label="Play">&#9654; Play</button><button id="'+pid+'f" aria-label="Next step" title="Next step">&#9654;&#9654;</button><input type="range" id="'+pid+'s" min="0" max="'+(st.n-1)+'" value="0" step="1" aria-label="'+(o.label||'Step')+'"><label class="small">Speed <select id="'+pid+'v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
    const g=s=>$(pid+s);
    function show(){const sc=g('s');sc.max=st.n-1;sc.value=st.i;o.draw(st.i)}
    const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
    function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=st.n-1){setPlay(false);return}st.i++;show();if(st.i>=st.n-1){setPlay(false);return}st.timer=setTimeout(tick,(o.ms||1300)/st.spd)}
    function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,(o.ms||1300)/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
    function setPlay(p){st.play=p;g('p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';g('p').setAttribute('aria-label',p?'Pause':'Play');if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=st.n-1){st.i=0;show()}kick()}
    g('p').addEventListener('click',()=>setPlay(!st.play));
    g('f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(st.n-1,st.i+1);show()});
    g('b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
    g('s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
    g('v').addEventListener('change',e=>{st.spd=+e.target.value});
    if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.25}).observe(card)}else st.vis=true;
    document.addEventListener('visibilitychange',kick);
    onRender(()=>{show();kick()});show();
    return {reset(n){setPlay(false);st.n=n;st.i=0;show()},redraw(){o.draw(st.i)},play(){if(!RM)setPlay(true)},get i(){return st.i},get n(){return st.n}};
  }
  return {D,RM,$,esc,onRender,onResize,width,fmtB,fmtN,KC,KV,chip,ring,stat,seg,svg,tx,anim,tabVisible};
})();

// ---- static fills ----
(function(){
  const S=window.SH,D=S.D,$=S.$,esc=S.esc;if(!D||!$('t-shard'))return;
  $('sh-viz').textContent=(D.viz||'');
  $('sh-defaults').innerHTML='<code>jax.make_mesh</code> axis types '+esc(D.ex.make_mesh_default.join(', '))+'; <code>Mesh(...)</code> axis types '+esc(D.ex.Mesh_default.join(', '));
  // jax.typeof on an Explicit mesh
  const m0=D.ex.matmul[0];
  $('sh-typeof').innerHTML='<span class="c"># Explicit mesh (2, 4); x put on P(\'data\', None), w on P(None, \'model\')</span>\n'+
    'jax.typeof(x)        <span class="c"># '+esc(m0.x_type)+'</span>\njax.typeof(w)        <span class="c"># '+esc(m0.w_type)+'</span>\njax.typeof(x @ w)    <span class="c"># '+esc(m0.y_type)+'</span>';
  // explicit-mode matmul table
  $('sh-ex-t').querySelector('tbody').innerHTML=D.ex.matmul.map(r=>'<tr><td><code>'+esc(r.x)+'</code></td><td><code>'+esc(r.w)+'</code></td><td>'+
    (r.error?'<b>error</b>: <code>'+esc(r.error)+'</code>':'<code>'+esc(r.y_type)+'</code>'+(r.coll&&r.coll.length?' (compiled with '+r.coll.map(c=>S.chip(c[0])).join(' ')+')':' (no collective)'))+'</td></tr>').join('');
  $('sh-reshard').innerHTML='<code>'+esc(D.ex.reshard.before)+'</code> becomes <code>'+esc(D.ex.reshard.after)+'</code>';
  // collectives table
  const C=D.co.cases,fmtRow=a=>'['+a.map(v=>String(Math.round(v))).join(', ')+']';
  const desc={
    psum:['<code>jax.lax.psum(b, "i")</code>','the sum of all 8 rows: ','2(n&minus;1)/n &times; N','<code>all_reduce(SUM)</code>'],
    all_gather:['<code>all_gather(b, "i", tiled=True)</code>','all 8 rows, [8, 8]: first ','(n&minus;1)/n &times; N (N = gathered size)','<code>all_gather_into_tensor</code>'],
    psum_scatter:['<code>psum_scatter(b, "i", scatter_dimension=1, tiled=True)</code>','column 0 of the sum only: ','(n&minus;1)/n &times; N (N = input size)','<code>reduce_scatter_tensor</code>'],
    all_to_all:['<code>all_to_all(b, "i", split_axis=1, concat_axis=0, tiled=True)</code>','element 0 of every device\'s row: ','(n&minus;1)/n &times; N','<code>all_to_all_single</code>'],
    ppermute:['<code>ppermute(b, "i", perm=[(j, j+1 mod 8)])</code>','device 7\'s row: ','N (one neighbour)','<code>send</code>/<code>recv</code> (<code>batch_isend_irecv</code>)']};
  $('sh-co-t').querySelector('tbody').innerHTML=Object.keys(desc).map(k=>{const c=C[k],d=desc[k];const o=c.out_dev0;
    const flat=[].concat(...o);const shown=k==='all_gather'?fmtRow(o[0])+', ..., '+fmtRow(o[o.length-1]):fmtRow(flat);
    return '<tr><td>'+d[0]+'</td><td>'+c.hlo_ops.map(h=>S.chip(h[0])).join(' ')+'</td><td>'+d[1]+'<code>'+shown+'</code></td><td>'+d[2]+'</td><td>'+d[3]+'</td></tr>'}).join('');
  const R=D.co.ring;
  $('sh-ring-chk').innerHTML=R.n_permutes+' <code>collective-permute</code> ops of '+R.bytes_per_permute+' bytes (2(n&minus;1) = '+R.steps+' steps for n = '+R.n+'), so each device sent '+R.sent_per_device_bytes+' bytes for a '+R.array_bytes+'-byte array: exactly 2 &times; 7/8 &times; '+R.array_bytes+' = '+(2*7/8*R.array_bytes)+'. Its result matched <code>psum</code> to '+R.max_abs_diff_vs_psum.toExponential(1)+' (float32 additions in a different order).';
  $('sh-ring-res').innerHTML='Run on 8 devices with a [8, '+(R.n*R.chunk_floats)+'] float32 array (one row of '+R.array_bytes+' bytes per device): '+R.n_permutes+' collective-permutes in the HLO and nothing else, largest difference from <code>psum</code> '+R.max_abs_diff_vs_psum.toExponential(1)+' and from numpy '+R.max_abs_diff_vs_numpy.toExponential(1)+'. XLA\'s own all-reduce on a real interconnect uses tuned algorithms (rings, trees, the torus\'s dimensions); this is the textbook version, written to show that the collectives are ordinary programs over <code>ppermute</code>.';
  $('sh-mm').innerHTML='On an Explicit mesh (the <code>make_mesh</code> default), a replicated input with <code>in_specs=P(\'i\', None)</code> raised: <code>'+esc(D.co.mismatch_explicit.error)+'</code> On an Auto mesh the same call '+(D.co.mismatch_auto.ok?'ran and gave the right answer (shard_map slices the input itself).':'failed too.')+' The check exists since JAX 0.9.1 ("it will act like an assert instead of an implicit reshard", changelog). Fix: <code>jax.device_put</code> onto the right <code>NamedSharding</code>, or <code>jax.reshard</code>, before the call.';
  $('sh-agrep').innerHTML='<code>'+esc(D.co.ag_rep.error.split('\n').slice(0,2).join(' ').slice(0,330))+'...</code>';
  $('sh-pmap').innerHTML='<code>jax.pmap(lambda b: jax.lax.psum(b, "i"), axis_name="i")</code> gave the right sum '+(D.co.pmap.warnings.length?'with a warning':'with no warning');
})();
