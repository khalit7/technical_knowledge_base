// ---- Recompile detective (tab t-xprec) ----
(function(){
  const D=XP.D, esc=XP.esc, $=id=>document.getElementById(id);
  const SC=D.rec.sc;
  // the right answer: "yes" when the last call compiled again, "error" when it raised
  const truth=s=>s.error?'error':(s.counts.compile>1?'yes':'no');
  const FIX={shape:'Pad to a fixed shape and mask, or drop the last partial batch.',dtype:'Cast inputs to one dtype at the boundary.',
    weak:'Pass scalars consistently: always Python floats, or always typed arrays.',value:'Nothing to fix: values of traced arguments are not part of the key.',
    static:'Only make an argument static if it really changes the program, and expect one compile per value.',lambda:'Define the function once, outside the loop.',
    named:'Nothing to fix: the cache is keyed on the function object, so re-wrapping is cheap.',tree:'Keep the pytree structure fixed (same keys, same list lengths).',
    config:'Set configuration once at start-up, before the first call.',closure:'Pass the value as an argument; a global is read once, at trace time.',
    unhashable:'Use a tuple, or make the argument a traced array.'};
  let score=0, answered=0;
  $('xr-list').innerHTML=SC.map((s,i)=>'<div class="xr-card" id="xr-c'+i+'"><h3>'+(i+1)+'. '+esc(s.title)+'</h3><pre>'+esc(s.code)+'</pre>'+
    '<div class="xr-q">Does the last call trace and compile again?</div><div class="xr-opts"><button data-i="'+i+'" data-v="yes">Yes, it recompiles</button><button data-i="'+i+'" data-v="no">No, cache hit</button><button data-i="'+i+'" data-v="error">It raises an error</button></div><div class="xr-ans" id="xr-a'+i+'" hidden></div></div>').join('');
  function reveal(i,v){
    const s=SC[i], t=truth(s), a=$('xr-a'+i);
    $('xr-c'+i).querySelectorAll('.xr-opts button').forEach(b=>{b.classList.remove('right','wrong');if(b.dataset.v===t)b.classList.add('right');else if(b.dataset.v===v)b.classList.add('wrong')});
    if(a.hidden){answered++;if(v===t)score++}
    a.hidden=false;
    a.innerHTML='<div class="xr-cnt">'+RD.stat('Traces',String(s.counts.trace))+RD.stat('Lowerings',String(s.counts.lower))+RD.stat('Compilations',String(s.counts.compile))+'</div>'+
      '<p>'+esc(s.why)+'</p>'+(s.error?'<pre class="log">'+esc(s.error)+'</pre>':'')+(s.printed&&s.printed.length?'<p>Printed:</p><pre class="log">'+esc(s.printed.join('\n'))+'</pre>':'')+
      (s.explain&&s.explain.length&&s.counts.compile>1?'<p>What <code>jax_explain_cache_misses</code> logged for the last miss:</p><pre class="log">'+esc(s.explain[0])+'</pre>':'')+(s.counts.compile===1?'<p class="xr-score">Only the first call missed the cache (every function compiles once), so there is no recompile to explain.</p>':'')+'<p><b>Fix:</b> '+esc(FIX[s.key]||'')+'</p>';
    $('xr-score').textContent=answered?('Your predictions: '+score+' of '+answered+' right.'):'';
  }
  $('xr-list').addEventListener('click',e=>{const b=e.target.closest('button[data-i]');if(b)reveal(+b.dataset.i,b.dataset.v)});
  $('xr-sum').innerHTML='<thead><tr><th>Case</th><th class="num">Traces</th><th class="num">Compiles</th><th>Outcome</th></tr></thead><tbody>'+SC.map(s=>'<tr><td>'+esc(s.title)+'</td><td class="num">'+s.counts.trace+'</td><td class="num">'+s.counts.compile+'</td><td>'+({yes:'recompiles',no:'cache hit',error:'error'}[truth(s)])+(s.key==='closure'?' (and a stale answer)':'')+'</td></tr>').join('')+'</tbody>';
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-xprec']=[()=>{}];
})();
