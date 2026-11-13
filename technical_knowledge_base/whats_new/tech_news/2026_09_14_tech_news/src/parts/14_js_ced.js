// ---- DeepSeek V4.1-Flash: where the factor of four comes from (bytes of global cache per prompt token, built up one change at a time) ----
// The turn itself is the 3D stage in 31_js_sc_ced.js (2026-11-13; it replaced the 2D layer grid that lived here).
(function(){
  const el=$('cedFall');if(!el)return;
  // ---- where the factor of four comes from (bytes of global cache per token) ----
  const FALL=[
    ['V4-Flash','41 layers each keep a cache: 21 CSA x (584 + 68) / 4 + 20 HCA x 584 / 128',21*(584+68)/4+20*584/128],
    ['+ cross-layer reuse','only 4 layers keep one, still the V4 entry format and 1 entry per 4 tokens: 4 x 652 / 4',4*652/4],
    ['+ finer sequence compression','encoder copies 1 entry per 2 tokens, decoder copy 1 per token: 3 x 652 / 2 + 652',3*652/2+652],
    ['+ FP4 main cache (V4.1-Flash)','main entry 584 to 288 bytes: 3 x (288 + 68) / 2 + (288 + 68)',3*(288+68)/2+(288+68)]];
  function drawFall(){const max=FALL[0][2];
    el.innerHTML='<div class="bars ced-bars">'+FALL.map((f,i)=>'<div class="row'+(i===0||i===3?' hl':'')+'"><div class="nm" title="'+f[1]+'">'+f[0]+'</div><div class="track"><div class="fill" style="width:'+(100*f[2]/max).toFixed(1)+'%;background:'+(i===3?'var(--c2)':i===0?'var(--dim)':'var(--acc)')+'"></div></div><div class="val">'+fmt(Math.round(f[2]))+' B</div></div><div class="small mute" style="margin:-2px 0 6px">'+f[1]+'</div>').join('')+'</div>'+
      '<p class="small" style="margin:4px 0 0">3,514 / 890 = '+(max/FALL[3][2]).toFixed(2)+'x smaller. Relaxing the compression goes the other way (652 to 1,630 bytes): DeepSeek spent part of the saving from sharing caches on keeping more of the sequence. Against DeepSeek LLM 67B, the first generation (95 layers x 8 key-value heads x 128 dimensions x 2 for keys and values x 2 bytes = 389,120 bytes per token), 890 bytes is '+(389120/890).toFixed(0)+'x smaller: the report\'s 437x.</p>'}
  onTab(el.closest('.tab').id,drawFall);
  drawFall();
})();
