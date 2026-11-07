// ---- Sections 1, 3 and 4: the prediction prompts, the profile and NumPy bars (the bytecode stepper became the Fig. 3 stage, 31_js_sc_eval.js, on 2026-11-07) ----
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  if(!window.PA)return;
  const find=(blk,pre)=>(blk.ins.find(r=>r[2].startsWith(pre))||[])[2];
  CIU.drill($('ci-pr-dis'),'Predict: after 1,000 int additions the <code>+</code> is <code>BINARY_OP_ADD_INT</code>. Then the same function is called with lists of floats. What happens to that instruction?',
    [{t:'It stays ADD_INT and each float addition takes a slow path forever',right:false},{t:'It falls back and re-specialises for floats',right:true},{t:'It returns to the generic BINARY_OP for good',right:false}],
    ()=>'Listing 3 shows <code>'+esc(find(PA.dis[2],'BINARY_OP'))+'</code>: the guard failed, the instruction fell back and was specialised again for the new type. The last two steps of Fig. 3 and the listings below show each rewrite.');
  // 3. what the profiler did to the program
  const P=PA.prof;
  CIU.drill($('ci-pr-prof'),'Predict: the slow version takes '+P.slow_ms+' ms. How long does the same call take under cProfile?',
    [{t:'About the same (under 10% more)',right:false},{t:'About twice as long',right:false},{t:'About seven times as long',right:true}],
    'Measured: '+P.profiled_s.toFixed(2)+' s under cProfile against '+P.slow_ms+' ms without it, because the profiler adds work to each of 8 million calls (the first line of its report).');
  CIU.bars($('ci-prof-bars'),[
    {name:'p1_slow under cProfile',v:P.profiled_s*1000,label:Math.round(P.profiled_s*1000)+' ms',col:'var(--c6)'},
    {name:'p1_slow, no profiler',v:P.slow_ms,label:P.slow_ms+' ms',col:'var(--c2)'},
    {name:'p1_fast (regex, Counter)',v:P.fast_ms,label:P.fast_ms+' ms',col:'var(--c3)'}],0,'Wall-clock time of one per_user() call over 20,000 lines, from p1_profile.py (mean of 3 runs without the profiler). Python 3.14.8, Apple M1 Pro.');
  // 4. NumPy against the loop at four sizes
  const small=PA.np[0];
  CIU.drill($('ci-pr-np'),'Predict: at <b>10</b> elements, which is faster, the Python loop or NumPy?',
    [{t:'NumPy, by about 10x',right:false},{t:'About the same',right:false},{t:'The Python loop',right:true}],
    'The loop: '+small[1].toFixed(1)+' µs against '+small[3].toFixed(1)+' µs for NumPy, whose fixed cost per call (about a microsecond) is more than ten elements of work. The bars below show where it turns round.');
  function drawNp(){
    const el=$('ci-np-bars');if(!el)return;
    let h='';
    PA.np.forEach(r=>{const [n,loop,mapf,npv,conv]=r,max=Math.max(loop,mapf,npv,conv);
      h+='<div class="ci-src" style="margin-top:6px">n = '+n.toLocaleString('en-US')+' (bars relative to the slowest at this size; NumPy '+(loop/npv).toFixed(1)+'x the loop)</div><div class="bars">'+
      [['Python loop',loop,'var(--c2)'],['map + fsum',mapf,'var(--c5)'],['NumPy',npv,'var(--c1)'],['np.array(list)',conv,'var(--dim)']].map(([nm,v,c])=>'<div class="row"><span class="nm">'+nm+'</span><span class="track"><span class="fill" style="width:'+(100*v/max).toFixed(1)+'%;background:'+c+'"></span></span><span class="val">'+(v>=1000?(v/1000).toFixed(1)+' ms':v.toFixed(1)+' µs')+'</span></div>').join('')+'</div>'});
    el.innerHTML=h+'<div class="ci-src">Median of timeit repeats per call, from p2_numpy.py (Python 3.14.8, NumPy 2.5.3, Apple M1 Pro, load 6.3). np.array(list) is the conversion alone.</div>';
  }
  drawNp();
})();
