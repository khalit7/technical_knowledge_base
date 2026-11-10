// ---- Reading: three endpoints, three ways (cosine re-run per length, WSD branches, schedule-free) on the noisy quadratic: the runs and the endpoint table ----
(function(G){
  const TS=[250,500,1000],TM=1000;
  const grid=[];for(let k=-24;k<=2;k++)grid.push(Math.pow(10,k/8));
  function best(f){let b=grid[0],bl=Infinity;for(const lr of grid){const v=f(lr);if(v<bl){bl=v;b=lr}}return b}
  // cosine: re-tuned for every length (its advantage: one run per length, each tuned for it)
  const cos=TS.map(T=>{const lr=best(lr=>NQM.sgd('cosine',T,lr)[T]);return{T,lr,L:NQM.sgd('cosine',T,lr)}});
  // WSD: one constant run; one learning rate (tuned for the 1,000-step branch); a cooldown branch per length
  const wlr=best(lr=>NQM.sgd('wsd',TM,lr)[TM]);const wsd=TS.map(T=>({T,lr:wlr,L:NQM.sgd('wsd',T,wlr)}));
  const constL=NQM.sgd('const',TM,wlr);
  // schedule-free SGD: one run, one learning rate (tuned for 1,000 steps), read at each endpoint
  const slr=best(lr=>NQM.sf(TM,lr)[TM]);const sfL=NQM.sf(TM,slr);
  // constant LR without decay, tuned for 1,000 steps
  const clr=best(lr=>NQM.sgd('const',TM,lr)[TM]);const conL=NQM.sgd('const',TM,clr);
  const R={cos,wsd,wlr,slr,sfL,clr,conL,constL};G.END_RES=R;
  if(typeof document==='undefined')return;
  const tab=document.getElementById('en-tab');if(!tab)return;const fmt=v=>v.toFixed(4);
  // the drawing is Fig. 6 (66_js_sc_en.js); this part computes the runs and writes the endpoint table
  // endpoint table (all methods, exact expected loss)
  tab.innerHTML='<table><thead><tr><th>Method</th><th class="num">loss at 250</th><th class="num">at 500</th><th class="num">at 1,000</th><th class="num">steps for all three</th></tr></thead><tbody>'+
    '<tr><td>Cosine to zero, re-run and re-tuned per length</td>'+cos.map(c=>'<td class="num">'+fmt(c.L[c.T])+'</td>').join('')+'<td class="num">1,750</td></tr>'+
    '<tr><td>WSD, 1−sqrt cooldown over the last 20%, branched</td>'+wsd.map(c=>'<td class="num">'+fmt(c.L[c.T])+'</td>').join('')+'<td class="num">1,150</td></tr>'+
    '<tr><td>Schedule-free SGD (momentum 0.9), one run</td>'+TS.map(T=>'<td class="num">'+fmt(sfL[T])+'</td>').join('')+'<td class="num">1,000</td></tr>'+
    '<tr><td class="mute">Constant rate, no decay (grey row in Fig. 6)</td>'+TS.map(T=>'<td class="num mute">'+fmt(conL[T])+'</td>').join('')+'<td class="num mute">1,000</td></tr></tbody></table>';
})(typeof window!=='undefined'?window:globalThis);
