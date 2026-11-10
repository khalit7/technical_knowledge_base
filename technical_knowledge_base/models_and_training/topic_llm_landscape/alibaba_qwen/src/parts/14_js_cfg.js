// ---- Configs tab: eight config.json files, recomputed (cache sizing moved to Long context's KV-cache calculator, 2026-10-23) ----
(function(){
  if(!$('cfTab2'))return;
  // Fields from each model's config.json, decoded by src/mk_data.py into window.QW (22_js_qw_0data.js); lf/ll = full/linear layers from layer_types or full_attention_interval.
  const C=QW.rows.map(r=>Object.assign({},r,{lf:QW.nf(r),ll:r.L-QW.nf(r),note:r.note||undefined}));
  const big=v=>v>=1e12?(v/1e12).toFixed(3)+'T':v>=1e9?(v/1e9).toFixed(1)+'B':(v/1e6).toFixed(1)+'M';
  function draw(){
    // table 2: parameters
    let g='<tr><th>Model</th><th class="num">Layers (full / linear)</th><th class="num">d<sub>model</sub></th><th class="num">Experts (k active)</th><th class="num">Expert width</th><th class="num">P<sub>expert</sub></th><th class="num">Experts stored</th><th class="num">Experts active</th><th class="num">Headline</th></tr>';
    C.forEach(m=>{if(!m.E){g+='<tr><td>'+m.n+'</td><td class="num">'+m.L+' ('+m.lf+' / '+m.ll+')</td><td class="num">'+fmt(m.d)+'</td><td class="num" colspan="5" style="text-align:left">'+m.note+'</td><td class="num">'+m.tot+'B</td></tr>';return}
      const pe=3*m.d*m.dff,s1=m.L*(m.E+m.sh)*pe,a1=m.L*(m.k+m.sh)*pe;
      g+='<tr><td>'+m.n+'</td><td class="num">'+m.L+' ('+m.lf+' / '+m.ll+')</td><td class="num">'+fmt(m.d)+'</td><td class="num">'+m.E+(m.sh?' + 1 shared':'')+' ('+m.k+(m.sh?' + 1':'')+')</td><td class="num">'+fmt(m.dff)+'</td><td class="num">'+fmt(pe)+'</td><td class="num">'+big(s1)+' <span class="mute">('+Math.round(s1/(m.tot*1e9)*100)+'%)</span></td><td class="num">'+big(a1)+'</td><td class="num">'+(m.tot>=1000?(m.tot/1000).toFixed(1)+'T':m.tot+'B')+' / '+m.act+'B'+(m.note?'<br><span class="mute small">'+m.note+'</span>':'')+'</td></tr>'});
    $('cfTab2').innerHTML=g;
  }
  onTab('t-cfg',draw);
})();
