// ---- Transforms lab, section 3: "will this recompile?" drills with real counts ----
(function(){
  const {D,esc,$}=XF;
  const host=$('xf-drills'),score=$('xf-dr-score');
  let right=0,done=0;
  const upd=()=>{score.textContent=done?('Your score: '+right+' of '+done+' answered ('+D.drills.length+' drills).'):(D.drills.length+' drills. Pick how many XLA compiles the last lines trigger.')};
  host.innerHTML=D.drills.map((d,i)=>'<div class="xf-drill xf-pr" data-i="'+i+'"><div class="t">'+(i+1)+'. '+esc(d.title)+'</div>'+
    '<pre class="xf-code">'+esc(d.code)+'</pre>'+
    '<div class="xf-q" style="font-weight:400;font-size:13.5px">How many new compiles do the counted calls cause?</div>'+
    '<div class="xf-opts">'+[0,1,2,3].map(n=>'<button data-n="'+n+'">'+n+'</button>').join('')+'<button data-n="show" class="small">just show me</button></div>'+
    '<div class="xf-ans" hidden></div></div>').join('');
  host.addEventListener('click',e=>{
    const b=e.target.closest('button[data-n]');if(!b)return;
    const card=b.closest('.xf-drill'),d=D.drills[+card.dataset.i],ans=card.querySelector('.xf-ans');
    if(!ans.hidden)return;
    const n=b.dataset.n;
    if(n!=='show'){done++;const ok=+n===d.compiles;if(ok)right++;b.classList.add(ok?'xf-right':'xf-wrong')}
    card.querySelectorAll('button[data-n]').forEach(x=>{if(x.dataset.n!=='show'&&+x.dataset.n===d.compiles)x.classList.add('xf-right')});
    let v='';
    if(d.value&&d.value.first!=null)v='<div>Returned <b>'+d.value.first+'</b> on the first call and <b>'+d.value.second+'</b> on the second.</div>';
    ans.innerHTML='<div class="res"><span>Python traces: <b>'+d.traces+'</b></span><span>XLA compiles: <b>'+d.compiles+'</b></span><span class="xf-lbl m">measured</span></div>'+v+
      '<div>'+esc(d.why)+'</div>'+
      (d.explain?'<div class="small mute" style="margin-top:4px">JAX\'s cache-miss log (jax_explain_cache_misses):</div><pre class="xf-code xf-wrap">'+esc(d.explain)+'</pre>':'<div class="small mute" style="margin-top:4px">JAX logged no cache miss: every call hit the cache.</div>');
    ans.hidden=false;upd();
  });
  upd();
})();
