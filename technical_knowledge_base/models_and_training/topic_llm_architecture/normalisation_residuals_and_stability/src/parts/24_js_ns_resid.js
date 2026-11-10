// ---- Reading section 7: the largest single stream entry in every trained model of this page (the four-placement stepper became Fig. 3, 43_js_sc_rs.js, on 2026-11-09) ----
(function(){
  const D=window.NSD,C=window.NSC,$=id=>document.getElementById(id);
  if(!D||!C||!$('rs-tab'))return;
  const R=D.resid;
  function tab(){
    const rows=R.table;
    $('rs-tab').innerHTML='<table><thead><tr><th>Model (trained)</th><th class="num">largest entry</th><th>where</th><th class="num">median |entry|</th><th class="num">ratio</th></tr></thead><tbody>'+
      rows.map(r=>'<tr><td>'+C.esc(r.label)+'</td><td class="num">'+C.fmt(r.max)+'</td><td>'+C.esc(r.where)+'</td><td class="num">'+C.fmt(r.med)+'</td><td class="num">'+C.fmt(r.ratio)+'</td></tr>').join('')+'</tbody></table>';
  }
  tab();
})();
