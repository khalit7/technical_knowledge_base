// ---- Reading 6: QK-norm ceilings against measured logits, Qwen3-0.6B, per layer (log scale) ----
(function(){
  const el=document.getElementById('qk-bars');if(!el)return;
  const lo=1,hi=20000,x=v=>100*Math.log10(Math.max(v,lo)/lo)/Math.log10(hi/lo);
  const n=v=>v>=1000?Math.round(v).toLocaleString('en-GB'):v.toFixed(1);
  el.innerHTML='<div class="row"><div class="nm mute">layer</div><div class="mute small">ceiling &radic;128 &middot; max|&gamma;<sub>q</sub>| &middot; max|&gamma;<sub>k</sub>| (light) and largest logit reached (dark); gridlines at 1, 10, 100, 1,000, 10,000</div><div class="val mute small">reached / ceiling</div></div>'+
    NID.qwenqk.map(r=>'<div class="row"><div class="nm">'+r.l+'</div><div class="track">'+[1,10,100,1000,10000].map(g=>'<i style="position:absolute;top:0;bottom:0;left:'+x(g)+'%;width:1px;background:var(--line)"></i>').join('')+
      '<div class="fill" style="width:'+x(r.c)+'%;background:color-mix(in srgb,var(--c4) 30%,var(--bg))"></div><div class="fill" style="width:'+x(r.m)+'%;background:var(--c4)"></div></div><div class="val">'+n(r.m)+' / '+n(r.c)+'</div></div>').join('');
})();
