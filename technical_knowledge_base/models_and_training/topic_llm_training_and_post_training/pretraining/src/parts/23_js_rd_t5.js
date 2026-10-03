// ---- Reading, Objective: T5's objective ablations as one picture (families against variants) ----
(function(){
  const el=document.getElementById('t5-bars');if(!el)return;
  const G=[
    {h:'Objective families (Table 4)',r:[['BERT-style denoising',82.96],['Prefix language model',80.69],['Deshuffling',73.17]]},
    {h:'Denoising variants (Table 5)',r:[['BERT-style',82.96],['MASS-style',82.32],['Replace spans (baseline)',83.28],['Drop corrupted tokens',84.44]]},
    {h:'Corruption rate (Table 6)',r:[['10%',82.82],['15% (baseline)',83.28],['25%',83.00],['50%',81.27]]},
    {h:'Mean span length (Table 7)',r:[['i.i.d. (baseline)',83.28],['2',83.54],['3',83.49],['5',83.40],['10',82.85]]}
  ];
  const lo=72,hi=86,base=83.28,sd=0.235,x=v=>((v-lo)/(hi-lo)*100).toFixed(2)+'%';
  el.innerHTML=G.map(g=>'<div class="t5g">'+g.h+'</div>'+g.r.map(r=>
    '<div class="t5r"><div>'+RD.esc(r[0])+'</div><div class="bars"><div class="track" style="height:14px">'+
    '<div class="fill" style="width:'+x(r[1])+';background:'+(r[0].indexOf('baseline')>=0?'var(--c2)':'var(--c1)')+';opacity:.85"></div>'+
    '<span style="position:absolute;top:-2px;bottom:-2px;left:'+x(base-sd)+';width:'+((2*sd)/(hi-lo)*100).toFixed(2)+'%;background:var(--ink);opacity:.25"></span></div></div>'+
    '<div class="val">'+r[1].toFixed(2)+'</div></div>').join('')).join('')+
    '<div class="t5r"><div></div><div class="small mute" style="display:flex;justify-content:space-between"><span>72</span><span>GLUE average</span><span>86</span></div><div></div></div>';
})();
