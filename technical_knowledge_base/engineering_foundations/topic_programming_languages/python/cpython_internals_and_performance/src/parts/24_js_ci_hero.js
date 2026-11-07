// ---- Fig. 2: the speed-up ladder (the hero and the object layouts are 3D stages since 2026-11-07: 30_js_sc_hero.js, 32_js_sc_obj.js) ----
(function(){
  const $=id=>document.getElementById(id);
  const np=window.PA&&PA.np;if(!np)return;
  const big=np[np.length-1];                 // [n, loop us, map+fsum us, numpy us, np.array(list) us]
  const LOOP=big[1]/1000,NPY=big[3]/1000;
  function ladder(){
    const el=$('ci-ladder');if(!el||!window.PB||!window.PB.jit)return;
    const J=PB.jit.runs,jit=J['3.15|char_loop|0'].median_s/J['3.15|char_loop|1'].median_s,P=PA.prof;
    CIU.bars(el,[
      {name:'JIT on, 3.15 (character loop, section 5)',v:jit,label:jit.toFixed(2)+'x',col:'var(--c5)'},
      {name:'Profile, then regex and a dict (section 3)',v:P.slow_ms/P.fast_ms,label:(P.slow_ms/P.fast_ms).toFixed(1)+'x',col:'var(--c3)'},
      {name:'Loop moved into NumPy, 1,000,000 floats (section 4)',v:LOOP/NPY,label:(LOOP/NPY).toFixed(1)+'x',col:'var(--c1)'}]);
  }
  function all(){ladder()}
  all();RD.onRender(all);RD.onResize(all);
})();
