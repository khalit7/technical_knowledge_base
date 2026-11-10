// ---- V4.1-Flash: the two-stage indexer (the layer modes are drawn by Fig. 3, 42_js_sc_v41.js, from window.DS.v41) ----
(function(){
  const Ts=[16384,32768,65536,131072,262144,524288,1048576];
  function fn(){
    const L=Ts[+$('fnT').value];$('fnTv').textContent=fmt(L)+' positions';
    const blocks=Math.ceil(L/8),kb=Math.min(2048,blocks),cand=Math.min(L,kb*8),k=Math.min(512,cand);
    const rows=[['Positions in context',L,'var(--dim)'],['Stage 1: blocks of 8 ranked',blocks,'var(--acc)'],['Candidates kept (≤ 2,048 blocks)',cand,'var(--c6)'],['Stage 2: top-k kept',k,'var(--c2)']];
    const lg=v=>Math.log10(v),mx=lg(1048576);
    $('fnBars').innerHTML=rows.map(r=>'<div class="pbar" style="grid-template-columns:minmax(0,14em) minmax(0,1fr) 6em"><span>'+r[0]+'</span><span class="track"><span class="fill" style="width:'+(100*lg(r[1])/mx).toFixed(1)+'%;background:'+r[2]+'"></span></span><span>'+fmt(r[1])+'</span></div>').join('');
    $('fnCap').innerHTML='Log scale. Each later indexing layer ranks '+fmt(cand)+' candidates, '+(100*cand/L).toFixed(L>16384?1:0)+'% of the context, whatever the length beyond 16,384; without the pool each would rank all '+fmt(L)+'. Attention then reads the '+k+' kept entries.';
  }
  $('fnT').addEventListener('input',fn);$('v41Est').textContent=fmt(3*288/2+288);fn();
})();
