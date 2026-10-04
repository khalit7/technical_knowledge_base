// ---- Reading: 95% half-width by item count for the math sets (values checked against recompute.py) ----
(function(){
  const el=document.getElementById('eb-bars');if(!el)return;
  const SETS=[['AIME (one year)',30,100.0],['HMMT February 2026',33,98.48],['FrontierMath Tier 4 v2, private',41,100.0],['One GSM-Symbolic set',100,94.9],['miniF2F test',244,99.2],['FrontierMath Tiers 1-3 v2, private',285,93.68],['MATH-500',500,99.2],['GSM8K test',1319,94.5],['MATH Level 5',1324,98.13]];
  let mode='80';
  function draw(){let h='';const mx=15;
    SETS.forEach(([nm,n,top])=>{const p=(mode==='80'?80:top)/100,hw=196*Math.sqrt(p*(1-p)/n);
      h+='<div class="row"><span class="nm" title="'+nm+'">'+nm+' <span class="mute">('+n.toLocaleString('en-US')+')</span></span><span class="track"><span class="fill" style="width:'+Math.min(100,100*hw/mx)+'%;background:var(--c2)"></span></span><span class="val">±'+hw.toFixed(1)+'</span></div>'});
    el.innerHTML=h+'<p class="note">Bar length: ± points, axis 0 to 15. '+(mode==='80'?'At 80%, the same accuracy for every set, so only the item count differs.':'At each set\'s best reading in the table at the top.')+'</p>'}
  RD.seg(document.getElementById('eb-mode'),m=>{mode=m;draw()});
  draw();
})();
